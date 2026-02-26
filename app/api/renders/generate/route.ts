import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { randomUUID } from 'crypto'

async function getReplicateToken(): Promise<string | null> {
  if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN
  try {
    const admin = getSupabaseAdmin()
    const { data } = await admin
      .from('integrations')
      .select('config')
      .eq('org_id', ORG_ID)
      .eq('integration_id', 'replicate')
      .eq('enabled', true)
      .single()
    return data?.config?.api_token || null
  } catch { return null }
}

async function storeRender(imageUrl: string, jobId: string): Promise<string> {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return imageUrl
    const buffer = await res.arrayBuffer()
    const admin = getSupabaseAdmin()
    const fileName = `render-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    const path = `renders/${jobId}/${fileName}`
    const { error } = await admin.storage
      .from('project-files')
      .upload(path, Buffer.from(buffer), { contentType: 'image/jpeg', upsert: false })
    if (error) return imageUrl
    const { data: { publicUrl } } = admin.storage.from('project-files').getPublicUrl(path)
    return publicUrl
  } catch { return imageUrl }
}

// ─── Prompt builders ─────────────────────────────────────────────────────────

const LIGHTING_PROMPTS: Record<string, string> = {
  showroom:    'white studio background, perfect three-point studio lighting, clean seamless white floor, showroom quality photography',
  daylight:    'outdoors on a clear sunny day, natural bright sunlight, vivid blue sky with scattered clouds',
  overcast:    'outdoors overcast day, soft diffuse even lighting, no harsh shadows, diffused natural light',
  golden_hour: 'golden hour sunset, warm orange and amber light, long dramatic shadows, magic hour photography',
  night:       'night scene, vehicle headlights and taillights glowing, dramatic dark environment, moody night photography',
}

const BACKGROUND_PROMPTS: Record<string, string> = {
  studio:      'seamless white studio backdrop, reflective polished floor',
  city_street: 'urban city street, downtown buildings, road surface, city environment',
  dealership:  'car dealership exterior lot, automotive showroom setting',
  custom:      '',
}

const ANGLE_PROMPTS: Record<string, string> = {
  original:      '',
  front:         'front view facing camera, head-on angle',
  side:          'driver side profile view, full broadside angle, lateral view',
  rear:          'rear view, back of vehicle facing camera',
  three_quarter: 'dynamic three-quarter front angle, 45-degree perspective',
}

function buildPrompt(opts: {
  wrapDescription: string
  lighting: string
  background: string
  angle: string
}): string {
  return [
    `photorealistic professional vehicle wrap render`,
    opts.wrapDescription || 'custom vinyl wrap design with bold graphics',
    ANGLE_PROMPTS[opts.angle] || '',
    LIGHTING_PROMPTS[opts.lighting] || LIGHTING_PROMPTS.showroom,
    BACKGROUND_PROMPTS[opts.background] || BACKGROUND_PROMPTS.studio,
    'DSLR photography, ultra sharp, 8k resolution, commercial automotive photography',
  ].filter(Boolean).join(', ')
}

// ─── Replicate API calls ──────────────────────────────────────────────────────
// Uses flux-dev for img2img (vehicle photo provided) or flux-schnell for text2img

async function startPrediction(
  token: string,
  prompt: string,
  vehiclePhotoUrl?: string
): Promise<{ id: string; status: string; output?: any[] } | null> {
  let endpoint: string
  let input: Record<string, any>

  if (vehiclePhotoUrl) {
    // flux-dev img2img: applies wrap design onto actual vehicle photo
    endpoint = 'https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions'
    input = {
      prompt,
      image: vehiclePhotoUrl,
      prompt_strength: 0.70,   // 0 = keep original, 1 = ignore original
      num_inference_steps: 28,
      guidance: 3.5,
      output_format: 'jpg',
      output_quality: 90,
    }
  } else {
    // flux-schnell text2img: pure AI generation from description
    endpoint = 'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions'
    input = {
      prompt,
      num_outputs: 1,
      aspect_ratio: '4:3',
      output_format: 'jpg',
      output_quality: 90,
      go_fast: true,
    }
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[renders/generate] Replicate error:', err)
    return null
  }

  return await res.json()
}

// ─── POST: Start one or more renders ─────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      jobId,
      vehiclePhotoUrl,
      wrapDescription,
      lighting = 'showroom',
      background = 'studio',
      multiAngle = false,
      // Preset support: array of {lighting, background, angle} to batch-generate
      presetAngles,
    } = body

    if (!jobId) return Response.json({ error: 'jobId required' }, { status: 400 })

    const token = await getReplicateToken()
    if (!token) {
      return Response.json({
        error: 'Replicate API not configured — add REPLICATE_API_TOKEN to .env.local or enable in Settings → Integrations',
      }, { status: 503 })
    }

    const admin = getSupabaseAdmin()

    // Enforce render limit
    const { data: settings } = await admin
      .from('render_settings')
      .select('max_renders_per_job')
      .eq('org_id', ORG_ID)
      .single()
    const maxRenders = settings?.max_renders_per_job ?? 20

    const { count: existing } = await admin
      .from('job_renders')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', jobId)
      .neq('status', 'failed')
      .neq('status', 'canceled')

    // Determine angles to render
    let angles: { angle: string; lighting: string; background: string }[]

    if (presetAngles && Array.isArray(presetAngles)) {
      // Preset batch: caller specifies exact combinations
      angles = presetAngles
    } else if (multiAngle && vehiclePhotoUrl) {
      angles = [
        { angle: 'original',      lighting, background },
        { angle: 'front',         lighting, background },
        { angle: 'side',          lighting, background },
        { angle: 'rear',          lighting, background },
        { angle: 'three_quarter', lighting, background },
      ]
    } else {
      angles = [{ angle: 'original', lighting, background }]
    }

    if ((existing ?? 0) + angles.length > maxRenders) {
      return Response.json({
        error: `Render limit would be exceeded. ${maxRenders - (existing ?? 0)} renders remaining for this job.`,
      }, { status: 429 })
    }

    // Version number
    const { count: versionBase } = await admin
      .from('job_renders')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', jobId)
    const version = (versionBase ?? 0) + 1

    const angleSetId = angles.length > 1 ? randomUUID() : null

    // Launch all predictions in parallel
    const insertRows: any[] = []

    await Promise.all(
      angles.map(async (a) => {
        const prompt = buildPrompt({
          wrapDescription,
          lighting: a.lighting,
          background: a.background,
          angle: a.angle,
        })

        const prediction = await startPrediction(token, prompt, vehiclePhotoUrl)
        if (!prediction) return

        const row: any = {
          org_id: ORG_ID,
          project_id: jobId,
          created_by: user.id,
          prediction_id: prediction.id,
          status: 'processing',
          original_photo_url: vehiclePhotoUrl || null,
          prompt,
          lighting: a.lighting,
          background: a.background,
          angle: a.angle,
          version,
          is_multi_angle: angles.length > 1,
          angle_set_id: angleSetId,
          wrap_description: wrapDescription || null,
          cost_credits: vehiclePhotoUrl ? 0.012 : 0.006,
        }

        // Handle synchronous completion (rare)
        if (prediction.status === 'succeeded' && prediction.output?.[0]) {
          const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
          row.render_url = await storeRender(typeof url === 'string' ? url : url.url, jobId)
          row.status = 'succeeded'
        }

        insertRows.push(row)
      })
    )

    if (insertRows.length === 0) {
      return Response.json({ error: 'All predictions failed to start' }, { status: 500 })
    }

    const { data: inserted, error: insertErr } = await admin
      .from('job_renders')
      .insert(insertRows)
      .select()

    if (insertErr) {
      console.error('[renders/generate] insert error:', insertErr)
      return Response.json({ error: 'Failed to save render records' }, { status: 500 })
    }

    return Response.json({
      renders: inserted,
      angleSetId,
      count: inserted?.length ?? 0,
      message: `${inserted?.length ?? 0} render${(inserted?.length ?? 0) !== 1 ? 's' : ''} queued`,
    })
  } catch (err) {
    console.error('[renders/generate] POST error:', err)
    return Response.json({ error: 'Render generation failed' }, { status: 500 })
  }
}

// ─── GET: Poll prediction status, update DB ───────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const renderId = searchParams.get('renderId')
  const predictionId = searchParams.get('predictionId')

  if (!renderId && !predictionId) {
    return Response.json({ error: 'renderId or predictionId required' }, { status: 400 })
  }

  const token = await getReplicateToken()
  if (!token) return Response.json({ error: 'Replicate not configured' }, { status: 503 })

  const admin = getSupabaseAdmin()

  let renderRecord: any = null
  if (renderId) {
    const { data } = await admin.from('job_renders').select('*').eq('id', renderId).single()
    renderRecord = data
  } else {
    const { data } = await admin.from('job_renders').select('*').eq('prediction_id', predictionId!).single()
    renderRecord = data
  }

  if (!renderRecord) return Response.json({ error: 'Render not found' }, { status: 404 })
  if (renderRecord.status === 'succeeded') {
    return Response.json({ status: 'succeeded', renderUrl: renderRecord.render_url, render: renderRecord })
  }

  // Poll Replicate
  const res = await fetch(`https://api.replicate.com/v1/predictions/${renderRecord.prediction_id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!res.ok) return Response.json({ error: 'Failed to poll prediction' }, { status: 500 })

  const prediction = await res.json()

  const newStatus =
    prediction.status === 'succeeded' ? 'succeeded' :
    prediction.status === 'failed'    ? 'failed'    :
    prediction.status === 'canceled'  ? 'canceled'  : 'processing'

  const updates: Record<string, any> = { status: newStatus, updated_at: new Date().toISOString() }

  if (newStatus === 'succeeded') {
    // flux models return output as string array OR string
    const rawUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    if (rawUrl) {
      updates.render_url = await storeRender(typeof rawUrl === 'string' ? rawUrl : rawUrl.url, renderRecord.project_id)
    }
  }

  if (newStatus === 'failed') {
    updates.notes = prediction.error || 'Prediction failed'
  }

  // Parse progress from logs
  let progress: number | undefined
  if (prediction.logs) {
    const pcts = prediction.logs.match(/(\d+)%/g)
    if (pcts?.length) progress = Math.min(95, parseInt(pcts[pcts.length - 1]))
  }
  // Estimate from timing
  if (!progress && prediction.created_at) {
    const elapsed = (Date.now() - new Date(prediction.created_at).getTime()) / 1000
    progress = Math.min(90, Math.round((elapsed / 25) * 100))
  }

  await admin.from('job_renders').update(updates).eq('id', renderRecord.id)

  return Response.json({
    status: newStatus,
    renderUrl: updates.render_url ?? null,
    render: { ...renderRecord, ...updates },
    progress,
  })
}
