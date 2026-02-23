import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { prompt, vehicle_type, style, colors, brief, designId } = body

  const replicateToken = process.env.REPLICATE_API_TOKEN
  if (!replicateToken) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 })
  }

  // Build the full prompt
  const fullPrompt = `Professional photorealistic vehicle wrap design, ${vehicle_type || 'pickup truck'},
  ${brief || 'bold commercial wrap design'}, ${colors?.join(', ') || 'red and black'} color scheme,
  ${style || 'professional'} style, studio photography, commercial vinyl wrap,
  high resolution product photography, clean background, sharp details, 8k quality`

  try {
    // Start the prediction
    const startRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=30'
      },
      body: JSON.stringify({
        input: {
          prompt: fullPrompt,
          num_outputs: 4,
          aspect_ratio: '16:9',
          output_format: 'webp',
          output_quality: 90
        }
      })
    })

    const prediction = await startRes.json()

    if (prediction.error) {
      return NextResponse.json({ error: prediction.error }, { status: 500 })
    }

    // If still processing, poll for result
    if (prediction.status !== 'succeeded') {
      let result = prediction
      let attempts = 0
      while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 30) {
        await new Promise(r => setTimeout(r, 2000))
        const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
          headers: { 'Authorization': `Bearer ${replicateToken}` }
        })
        result = await pollRes.json()
        attempts++
      }
      return NextResponse.json({ images: result.output || [], status: result.status })
    }

    return NextResponse.json({ images: prediction.output || [], status: 'succeeded' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
