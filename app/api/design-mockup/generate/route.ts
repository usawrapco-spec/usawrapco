import { ORG_ID } from '@/lib/org'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export const maxDuration = 60

async function getReplicateToken(): Promise<string | null> {
  if (process.env.REPLICATE_API_TOKEN) {
    return process.env.REPLICATE_API_TOKEN
  }
  try {
    const admin = getSupabaseAdmin()
    const { data: integration } = await admin
      .from('integrations')
      .select('config')
      .eq('org_id', ORG_ID)
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
    const { prompts, mockupId } = await req.json()

    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return Response.json({ error: 'Prompts array required' }, { status: 400 })
    }

    const replicateToken = await getReplicateToken()
    if (!replicateToken) {
      return Response.json({
        error: 'Image generation not configured — add REPLICATE_API_TOKEN to env',
      }, { status: 503 })
    }

    // Launch all 3 predictions in parallel
    const predictions = await Promise.all(
      prompts.slice(0, 3).map(async (prompt: string) => {
        const res = await fetch(
          'https://api.replicate.com/v1/models/black-forest-labs/flux-pro/predictions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${replicateToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: {
                prompt,
                width: 1024,
                height: 768,
                num_outputs: 1,
                guidance_scale: 7.5,
                num_inference_steps: 30,
              },
            }),
          }
        )

        if (!res.ok) {
          const err = await res.text()
          console.error('[design-mockup/generate] Replicate error:', err)
          return { id: null, status: 'failed', error: err }
        }

        const prediction = await res.json()
        return { id: prediction.id, status: prediction.status }
      })
    )

    // Store prediction IDs in design_mockups record
    if (mockupId) {
      const admin = getSupabaseAdmin()
      const predictionIds = predictions.map(p => p.id).filter(Boolean)
      await admin
        .from('design_mockups')
        .update({
          prediction_ids: predictionIds,
          image_prompt: prompts[0],
        })
        .eq('id', mockupId)
    }

    return Response.json({
      predictions: predictions.map(p => ({
        id: p.id,
        status: p.status,
      })),
    })
  } catch (err: any) {
    console.error('[design-mockup/generate] error:', err)
    return Response.json({ error: 'Generation failed' }, { status: 500 })
  }
}

// Poll for prediction status
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const ids = searchParams.get('ids')
  const mockupId = searchParams.get('mockupId')

  if (!ids) {
    return Response.json({ error: 'Prediction IDs required' }, { status: 400 })
  }

  const replicateToken = await getReplicateToken()
  if (!replicateToken) {
    return Response.json({ error: 'Replicate not configured' }, { status: 503 })
  }

  const predictionIds = ids.split(',')

  const results = await Promise.all(
    predictionIds.map(async (id) => {
      try {
        const res = await fetch(
          `https://api.replicate.com/v1/predictions/${id}`,
          { headers: { Authorization: `Bearer ${replicateToken}` } }
        )
        const prediction = await res.json()

        let imageUrl = prediction.output?.[0] ?? null

        // Store completed images in Supabase
        if (prediction.status === 'succeeded' && imageUrl) {
          try {
            const imgRes = await fetch(imageUrl)
            if (imgRes.ok) {
              const buffer = await imgRes.arrayBuffer()
              const admin = getSupabaseAdmin()
              const fileName = `design-mockup-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
              const path = `design-mockups/${fileName}`
              const { error } = await admin.storage
                .from('project-files')
                .upload(path, Buffer.from(buffer), { contentType: 'image/jpeg', upsert: false })
              if (!error) {
                const { data: { publicUrl } } = admin.storage.from('project-files').getPublicUrl(path)
                imageUrl = publicUrl
              }
            }
          } catch {
            // Keep original URL on storage failure
          }
        }

        return {
          id,
          status: prediction.status,
          imageUrl,
          error: prediction.error ?? null,
        }
      } catch {
        return { id, status: 'processing', imageUrl: null, error: null }
      }
    })
  )

  // If all are done, update the mockup record
  const allDone = results.every(r => r.status === 'succeeded' || r.status === 'failed')
  if (allDone && mockupId) {
    const admin = getSupabaseAdmin()
    const urls = results.filter(r => r.imageUrl).map(r => r.imageUrl)
    await admin
      .from('design_mockups')
      .update({ mockup_urls: urls })
      .eq('id', mockupId)
  }

  return Response.json({ results, allDone })
}
