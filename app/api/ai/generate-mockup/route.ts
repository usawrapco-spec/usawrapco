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

export async function POST(req: Request) {
  try {
    const { vehicleType, vehicleColor, designDescription, colors, style } = await req.json()

    const replicateToken = await getReplicateToken()
    if (!replicateToken) {
      return Response.json(
        { error: 'Replicate API token not configured. Add it in Settings → Integrations → Replicate.' },
        { status: 503 }
      )
    }

    const prompt = `Professional vehicle wrap mockup, ${vehicleType || 'cargo van'}, ${vehicleColor || 'white'} base vehicle, ${designDescription || 'custom vinyl wrap design'}, ${colors || 'bold colors'}, ${style || 'commercial business wrap'}, photorealistic, studio lighting, clean background, high quality`
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

    return Response.json({
      predictionId: prediction.id,
      status: prediction.status,
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

  return Response.json({
    status: prediction.status,
    imageUrl: prediction.output?.[0] ?? null,
    error: prediction.error ?? null,
  })
}
