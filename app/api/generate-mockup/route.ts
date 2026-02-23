import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      brief,
      vehicleType,
      coverageLabel,
      styles = [],
      colors = [],
      internalNotes,
      scrapedBrand,
      designId,
      clientName,
    } = body

    const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY

    if (!REPLICATE_API_KEY) {
      return NextResponse.json(
        { error: 'REPLICATE_API_KEY not configured. Add it to .env.local to enable AI generation.' },
        { status: 503 }
      )
    }

    // Build comprehensive prompt
    const colorDesc = colors.filter(Boolean).length > 0
      ? `Primary colors: ${colors.filter(Boolean).join(', ')}.`
      : ''

    const styleDesc = styles.length > 0
      ? `Style: ${styles.join(', ')}.`
      : ''

    const brandContext = scrapedBrand
      ? `Brand: ${scrapedBrand.name || ''}. ${scrapedBrand.tagline || ''}`
      : ''

    const internalContext = internalNotes
      ? `Design direction: ${internalNotes}`
      : ''

    const prompt = [
      `Photorealistic ${vehicleType} vehicle wrap design,`,
      `${coverageLabel} coverage,`,
      colorDesc,
      styleDesc,
      brief,
      brandContext,
      internalContext,
      `professional vinyl wrap installation, studio photography, commercial vehicle,`,
      `high resolution product render, shot from driver side 3/4 angle,`,
      `detailed realistic vehicle wrap graphics, photorealistic, sharp focus`,
    ].filter(Boolean).join(' ')

    // Call Replicate API — flux-schnell for 4 fast variations
    const predictions: string[] = []

    const angles = ['driver side 3/4 front', 'passenger side', 'rear 3/4', 'front 3/4']

    const generateOne = async (angle: string): Promise<string | null> => {
      const anglePrompt = prompt.replace('driver side 3/4 angle', angle)

      const startRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'wait',
        },
        body: JSON.stringify({
          input: {
            prompt: anglePrompt,
            width: 1920,
            height: 1080,
            num_outputs: 1,
            output_format: 'jpg',
          },
        }),
      })

      if (!startRes.ok) {
        const errText = await startRes.text()
        console.error('Replicate API error:', startRes.status, errText)
        return null
      }

      const prediction = await startRes.json()

      // If prediction is in progress, poll for result
      if (prediction.status === 'starting' || prediction.status === 'processing') {
        const pollUrl = prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`

        for (let attempt = 0; attempt < 30; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          const pollRes = await fetch(pollUrl, {
            headers: { Authorization: `Bearer ${REPLICATE_API_KEY}` },
          })
          const pollData = await pollRes.json()
          if (pollData.status === 'succeeded' && pollData.output?.[0]) {
            return pollData.output[0] as string
          }
          if (pollData.status === 'failed') {
            console.error('Prediction failed:', pollData.error)
            return null
          }
        }
        return null
      }

      // Immediate result
      if (prediction.output?.[0]) return prediction.output[0] as string
      return null
    }

    // Generate all 4 angles in parallel
    const results = await Promise.allSettled(
      angles.map(angle => generateOne(angle))
    )

    const images = results
      .map(r => r.status === 'fulfilled' ? r.value : null)
      .filter(Boolean) as string[]

    if (images.length === 0) {
      return NextResponse.json({ error: 'All image generations failed. Check Replicate API key and credits.' }, { status: 500 })
    }

    // Save mockup results to design_projects
    if (designId && images.length > 0) {
      const admin = getSupabaseAdmin()
      await admin.from('design_projects').update({
        mockup_results: images as any,
        updated_at: new Date().toISOString(),
      }).eq('id', designId)
    }

    return NextResponse.json({ images, prompt })
  } catch (err: any) {
    console.error('generate-mockup error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
