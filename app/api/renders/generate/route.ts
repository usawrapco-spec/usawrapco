import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { randomUUID } from 'crypto'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

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

const LIGHTING_PROMPTS: Record<string, string> = {
  showroom:    'white studio background, perfect studio lighting, clean reflective floor, showroom quality',
  daylight:    'outdoors on a clear sunny day, natural daylight, blue sky, bright environment',
  overcast:    'outdoors overcast day, soft diffuse lighting, no harsh shadows, even illumination',
  golden_hour: 'golden hour sunset lighting, warm orange and golden tones, long dramatic shadows',
  night:       'at night, headlights illuminated, dark background, dramatic night photography',
}

const BACKGROUND_PROMPTS: Record<string, string> = {
  studio:      'white studio backdrop, seamless white background, clean studio environment',
  city_street: 'city street background, urban environment, downtown setting',
  dealership:  'car dealership lot exterior, professional automotive setting',
  custom:      '',
}

const ANGLE_PROMPTS: Record<string, string> = {
  original:      '',
  front:         'front view of vehicle, facing camera head-on',
  side:          'side profile view, driver side, full broadside view',
  rear:          'rear view of vehicle, back of vehicle facing camera',
  three_quarter: 'three-quarter front angle view, dynamic perspective',
}

function buildPrompt(opts: {
  wrapDescription: string
  lighting: string
  background: string
  angle: string
}) {
  const parts = [
    `photorealistic vehicle wrap render, ${opts.wrapDescription || 'custom vinyl wrap design'}`,
    ANGLE_PROMPTS[opts.angle] || '',
    LIGHTING_PROMPTS[opts.lighting] || LIGHTING_PROMPTS.showroom,
    BACKGROUND_PROMPTS[opts.background] || BACKGROUND_PROMPTS.studio,
    'professional automotive photography, 8k resolution, sharp focus, commercial quality',
  ].filter(Boolean)
  return parts.join(', ')
}

async function startPrediction(
  token: string,
  prompt: string,
  vehiclePhotoUrl?: string
): Promise<{ id: string; status: string } | null> {
  const input: Record<string, any> = {
    prompt,
    negative_prompt: 'cartoon, illustration, CGI, 3d render, low quality, blurry, distorted, watermark, text overlay',
    num_inference_steps: 28,
    guidance_scale: 7.5,
    width: 1024,
    height: 768,
  }

  // img2img mode when vehicle photo provided
  if (vehiclePhotoUrl) {
    input.image = vehiclePhotoUrl
    input.prompt_strength = 0.68  // preserve vehicle shape, change surface
  }

  const endpoint = vehiclePhotoUrl
    ? 'https://api.replicate.com/v1/models/stability-ai/sdxl/predictions'
    : 'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions'

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

// ─── POST: Start one or more renders ────────────────────────────────────────
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
      customBackground,
    } = body

    if (!jobId) return Response.json({ error: 'jobId required' }, { status: 400 })

    const token = await getReplicateToken()
    if (!token) {
      return Response.json({
        error: 'Replicate API not configured — add REPLICATE_API_TOKEN to env or enable in Integrations',
      }, { status: 503 })
    }

    const admin = getSupabaseAdmin()

    // Check render limit
    const { data: settings } = await admin
      .from('render_settings')
      .select('max_renders_per_job')
      .eq('org_id', ORG_ID)
      .single()

    const maxRenders = settings?.max_renders_per_job ?? 20

    const { count } = await admin
      .from('job_renders')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', jobId)
      .neq('status', 'failed')

    if ((count ?? 0) >= maxRenders) {
      return Response.json({
        error: `Render limit reached (${maxRenders} per job). Contact admin to increase limit.`,
      }, { status: 429 })
    }

    // Get version number for this job
    const { count: versionCount } = await admin
      .from('job_renders')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', jobId)

    const version = (versionCount ?? 0) + 1

    const angles = multiAngle && vehiclePhotoUrl
      ? ['original', 'front', 'side', 'rear', 'three_quarter']
      : ['original']

    const angleSetId = multiAngle ? randomUUID() : null

    const bgOverride = background === 'custom' && customBackground ? customBackground : undefined

    // Launch all predictions in parallel
    const renderRows: any[] = []
    const predictionResults = await Promise.all(
      angles.map(async (angle) => {
        const prompt = buildPrompt({ wrapDescription, lighting, background, angle })
        const prediction = await startPrediction(token, prompt, vehiclePhotoUrl)
        if (!prediction) return null

        const row = {
          org_id: ORG_ID,
          project_id: jobId,
          created_by: user.id,
          prediction_id: prediction.id,
          status: prediction.status === 'succeeded' ? 'succeeded' : 'processing',
          original_photo_url: vehiclePhotoUrl || null,
          prompt,
          lighting,
          background,
          angle,
          version,
          is_multi_angle: multiAngle,
          angle_set_id: angleSetId,
          wrap_description: wrapDescription || null,
          cost_credits: vehiclePhotoUrl ? 0.012 : 0.006,
        }

        // If already succeeded synchronously (rare but possible)
        if (prediction.status === 'succeeded' && prediction.output?.[0]) {
          row.render_url = await storeRender(prediction.output[0], jobId)
          row.status = 'succeeded'
        }

        renderRows.push({ ...row, predictionId: prediction.id })
        return row
      })
    )

    // Insert all render rows
    const insertRows = renderRows.map(({ predictionId, ...row }) => row)
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
      message: `${angles.length} render(s) queued`,
    })
  } catch (err) {
    console.error('[renders/generate] POST error:', err)
    return Response.json({ error: 'Render generation failed' }, { status: 500 })
  }
}

// ─── GET: Poll prediction status and update DB ───────────────────────────────
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

  // Look up the render record
  let renderRecord: any = null
  if (renderId) {
    const { data } = await admin.from('job_renders').select('*').eq('id', renderId).single()
    renderRecord = data
  } else if (predictionId) {
    const { data } = await admin.from('job_renders').select('*').eq('prediction_id', predictionId).single()
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
  const updates: Record<string, any> = {
    status: prediction.status === 'succeeded' ? 'succeeded'
          : prediction.status === 'failed' ? 'failed'
          : prediction.status === 'canceled' ? 'canceled'
          : 'processing',
    updated_at: new Date().toISOString(),
  }

  if (prediction.status === 'succeeded' && prediction.output?.[0]) {
    const stored = await storeRender(prediction.output[0], renderRecord.project_id)
    updates.render_url = stored
  }

  if (prediction.status === 'failed') {
    updates.notes = prediction.error || 'Prediction failed'
  }

  await admin.from('job_renders').update(updates).eq('id', renderRecord.id)

  return Response.json({
    status: updates.status,
    renderUrl: updates.render_url || null,
    render: { ...renderRecord, ...updates },
    progress: prediction.logs
      ? Math.min(95, Math.round((prediction.logs.match(/\d+%/g)?.pop()?.replace('%', '') || 0) as number))
      : undefined,
  })
}
