export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { imageUrl, scale = 4, faceEnhance = false, designId, originalName } = await req.json()
  if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })

  const replicateKey = process.env.REPLICATE_API_TOKEN
  if (!replicateKey) return NextResponse.json({ error: 'Replicate API key not configured' }, { status: 500 })

  // Validate scale
  const validScale = [2, 4, 8].includes(Number(scale)) ? Number(scale) : 4

  try {
    // Create prediction
    const predRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${replicateKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa',
        input: {
          image: imageUrl,
          scale: validScale,
          face_enhance: Boolean(faceEnhance),
        },
      }),
    })

    if (!predRes.ok) {
      const err = await predRes.text()
      return NextResponse.json({ error: 'Replicate prediction failed: ' + err }, { status: 500 })
    }

    let prediction = await predRes.json()

    // Poll until complete (up to 90s)
    let attempts = 0
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && attempts < 45) {
      await new Promise(r => setTimeout(r, 2000))
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { Authorization: `Token ${replicateKey}` },
      })
      prediction = await pollRes.json()
      attempts++
    }

    if (prediction.status !== 'succeeded' || !prediction.output) {
      return NextResponse.json({ error: 'Upscale failed or timed out', details: prediction.error }, { status: 500 })
    }

    const upscaledUrl: string = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output

    // Download and re-upload to our storage
    const imgRes = await fetch(upscaledUrl)
    if (!imgRes.ok) {
      // Return Replicate URL directly if download fails
      return NextResponse.json({ url: upscaledUrl, stored: false })
    }

    const blob = await imgRes.blob()
    const baseName = (originalName || 'image').replace(/\.[^.]+$/, '')
    const fileName = `${baseName}_${validScale}x_upscaled.png`
    const path = designId
      ? `designs/${designId}/upscaled/${Date.now()}_${fileName}`
      : `upscaled/${Date.now()}_${fileName}`

    const { error: uploadErr } = await supabase.storage
      .from('project-files')
      .upload(path, blob, { upsert: false, contentType: 'image/png' })

    if (uploadErr) {
      // Return Replicate URL if storage upload fails
      return NextResponse.json({ url: upscaledUrl, stored: false, fileName })
    }

    const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path)
    const storedUrl = urlData?.publicUrl || upscaledUrl

    // Save to design_project_files if designId provided
    if (designId) {
      await supabase.from('design_project_files').insert({
        design_project_id: designId,
        file_name: fileName,
        file_url: storedUrl,
        file_type: 'image/png',
        uploaded_by: user.id,
        version: 1,
      })
    }

    return NextResponse.json({ url: storedUrl, stored: true, fileName })
  } catch (err: any) {
    console.error('Upscale error:', err)
    return NextResponse.json({ error: err.message || 'Upscale failed' }, { status: 500 })
  }
}
