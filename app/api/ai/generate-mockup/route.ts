import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

async function getReplicateToken(): Promise<string | null> {
  if (process.env.REPLICATE_API_TOKEN) {
    return process.env.REPLICATE_API_TOKEN
  }
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) return null

    const { data: integration } = await admin
      .from('integrations')
      .select('config')
      .eq('org_id', profile.org_id)
      .eq('integration_id', 'replicate')
      .eq('enabled', true)
      .single()

    return integration?.config?.api_token || null
  } catch {
    return null
  }
}

async function storeInSupabase(imageUrl: string, orgId?: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const admin = getSupabaseAdmin()
    const fileName = `mockup-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    const path = orgId ? `${orgId}/${fileName}` : fileName
    const { error } = await admin.storage
      .from('project-files')
      .upload(path, Buffer.from(buffer), { contentType: 'image/jpeg', upsert: false })
    if (error) return imageUrl // fallback to original URL
    const { data: { publicUrl } } = admin.storage.from('project-files').getPublicUrl(path)
    return publicUrl
  } catch {
    return imageUrl
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Support both old params (vehicleType, vehicleColor, etc.) and new params (vehicleImageBase64, brandAssets, wrapStyle, coverage)
    const {
      vehicleType,
      vehicleColor,
      designDescription,
      colors,
      style,
      vehicleImageBase64,
      brandAssets,
      wrapStyle,
      coverage,
    } = body

    const replicateToken = await getReplicateToken()
    if (!replicateToken) {
      return Response.json({
        message: 'Mockup generation not configured — add REPLICATE_API_TOKEN to env',
        mockupUrl: null,
        thumbnailUrl: null,
      })
    }

    // Build prompt from whichever params are provided
    let prompt: string
    if (vehicleImageBase64 || wrapStyle || coverage) {
      const styleDesc = wrapStyle || 'custom vinyl wrap'
      const coverageDesc = coverage || 'full wrap'
      const colorsDesc = Array.isArray(brandAssets) && brandAssets.length > 0
        ? `brand colors: ${brandAssets.slice(0, 3).join(', ')}`
        : 'bold commercial colors'
      prompt = `Professional vehicle wrap mockup, ${vehicleType || 'cargo van'}, ${styleDesc}, ${coverageDesc} coverage, ${colorsDesc}, photorealistic, studio lighting, clean background, high quality render`
    } else {
      prompt = `Professional vehicle wrap mockup, ${vehicleType || 'cargo van'}, ${vehicleColor || 'white'} base vehicle, ${designDescription || 'custom vinyl wrap design'}, ${colors || 'bold colors'}, ${style || 'commercial business wrap'}, photorealistic, studio lighting, clean background, high quality`
    }

    const negativePrompt = 'cartoon, illustration, low quality, blurry, distorted, watermark'

    const replicateResponse = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-pro/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt,
          negative_prompt: negativePrompt,
          width: 1024,
          height: 768,
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 30,
        },
      }),
    })

    if (!replicateResponse.ok) {
      const err = await replicateResponse.text()
      console.error('[generate-mockup] Replicate error:', err)
      return Response.json({ error: 'Mockup generation failed' }, { status: 500 })
    }

    const prediction = await replicateResponse.json()

    // If prediction is already complete with output, store it
    if (prediction.status === 'succeeded' && prediction.output?.[0]) {
      const storedUrl = await storeInSupabase(prediction.output[0])
      return Response.json({
        predictionId: prediction.id,
        status: prediction.status,
        mockupUrl: storedUrl || prediction.output[0],
        thumbnailUrl: storedUrl || prediction.output[0],
        prompt,
      })
    }

    return Response.json({
      predictionId: prediction.id,
      status: prediction.status,
      mockupUrl: null,
      thumbnailUrl: null,
      prompt,
    })
  } catch (err) {
    console.error('[generate-mockup] error:', err)
    return Response.json({ error: 'Mockup generation failed' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const predictionId = searchParams.get('id')

  if (!predictionId) {
    return Response.json({ error: 'Prediction ID required' }, { status: 400 })
  }

  const replicateToken = await getReplicateToken()
  if (!replicateToken) {
    return Response.json({ error: 'Replicate API token not configured' }, { status: 503 })
  }

  const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: { 'Authorization': `Bearer ${replicateToken}` },
  })

  const prediction = await res.json()

  let mockupUrl = prediction.output?.[0] ?? null

  // Store in Supabase if succeeded
  if (prediction.status === 'succeeded' && mockupUrl) {
    const stored = await storeInSupabase(mockupUrl)
    if (stored) mockupUrl = stored
  }

  return Response.json({
    status: prediction.status,
    imageUrl: mockupUrl,
    mockupUrl,
    thumbnailUrl: mockupUrl,
    error: prediction.error ?? null,
  })
}
