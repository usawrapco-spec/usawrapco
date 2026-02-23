import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60 // allow up to 60s for Replicate polling

async function getReplicateToken(): Promise<string | null> {
  // 1. Try environment variable first
  if (process.env.REPLICATE_API_TOKEN) {
    return process.env.REPLICATE_API_TOKEN
  }

  // 2. Fall back to org_config table (set via Settings → Integrations UI)
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: row } = await supabase
      .from('org_config')
      .select('value')
      .eq('key', 'integration_replicate')
      .single()

    if (row?.value) {
      const config = JSON.parse(row.value)
      return config?.api_token || null
    }
  } catch {}

  return null
}

function extractReplicateError(body: any): string | null {
  // Replicate returns errors in multiple formats:
  // { "error": "..." } — standard prediction error
  // { "title": "...", "detail": "...", "status": 402 } — account/billing error
  if (body?.error) return body.error
  if (body?.detail) return `${body.title || 'Replicate error'}: ${body.detail}`
  return null
}

export async function POST(req: NextRequest) {
  console.log('=== MOCKUP API CALLED ===')

  const body = await req.json()
  const { prompt, vehicle_type, style, colors, brief } = body

  console.log('Body received:', JSON.stringify(body).slice(0, 200))

  const replicateToken = await getReplicateToken()

  console.log('ENV token exists:', !!process.env.REPLICATE_API_TOKEN)
  console.log('Token resolved:', !!replicateToken)

  if (!replicateToken) {
    return NextResponse.json(
      { error: 'Replicate API token not configured. Add it in Settings → Integrations → Replicate.' },
      { status: 500 }
    )
  }

  const fullPrompt = prompt || `Professional photorealistic vehicle wrap design, ${vehicle_type || 'pickup truck'},
  ${brief || 'bold commercial wrap design'}, ${colors?.join(', ') || 'red and black'} color scheme,
  ${style || 'professional'} style, studio photography, commercial vinyl wrap,
  high resolution product photography, clean background, sharp details, 8k quality`

  console.log('Prompt:', fullPrompt.slice(0, 200))

  try {
    const startRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=55',
      },
      body: JSON.stringify({
        input: {
          prompt: fullPrompt,
          num_outputs: 4,
          aspect_ratio: '16:9',
          output_format: 'webp',
          output_quality: 90,
          go_fast: true,
        },
      }),
    })

    const prediction = await startRes.json()

    console.log('Replicate HTTP status:', startRes.status)
    console.log('Replicate response:', JSON.stringify(prediction).slice(0, 400))

    // Check for HTTP-level errors (402 billing, 401 auth, 422 validation, etc.)
    if (!startRes.ok) {
      const errMsg = extractReplicateError(prediction) || `Replicate API error (HTTP ${startRes.status})`
      console.error('Replicate error:', errMsg)
      return NextResponse.json({ error: errMsg }, { status: startRes.status === 402 ? 402 : 500 })
    }

    // Check for prediction-level errors
    const predErr = extractReplicateError(prediction)
    if (predErr) {
      return NextResponse.json({ error: predErr }, { status: 500 })
    }

    // Already succeeded (Prefer: wait=55 delivered synchronously)
    if (prediction.status === 'succeeded') {
      const images = prediction.output || []
      console.log('Succeeded immediately, images:', images.length)
      return NextResponse.json({ images, status: 'succeeded' })
    }

    // Still processing — poll with tight loop
    let result = prediction
    let attempts = 0
    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 25) {
      await new Promise(r => setTimeout(r, 2000))
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Bearer ${replicateToken}` },
      })
      result = await pollRes.json()
      console.log(`Poll ${attempts + 1}: status=${result.status}`)
      attempts++
    }

    if (result.status === 'failed') {
      const failErr = extractReplicateError(result) || 'Generation failed'
      return NextResponse.json({ error: failErr }, { status: 500 })
    }

    const images = result.output || []
    if (images.length === 0) {
      return NextResponse.json({ error: `No images returned (status: ${result.status})` }, { status: 500 })
    }

    return NextResponse.json({ images, status: result.status })
  } catch (err: any) {
    console.error('Mockup API exception:', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
