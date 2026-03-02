import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const REPLICATE_API = 'https://api.replicate.com/v1'
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN

async function logHealth(orgId: string, service: string, message: string) {
  try {
    await getSupabaseAdmin()
      .from('system_health')
      .insert({ org_id: orgId, service, error_message: message, severity: 'error' })
  } catch { /* silent */ }
}

async function pollReplicate(predictionId: string, timeoutMs = 120000): Promise<any> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2000))
    const res = await fetch(`${REPLICATE_API}/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
    })
    const pred = await res.json()
    if (pred.status === 'succeeded') return pred.output
    if (pred.status === 'failed') throw new Error(`Replicate failed: ${pred.error}`)
  }
  throw new Error('Replicate timeout after 120s')
}

export async function POST(req: NextRequest) {
  const admin = getSupabaseAdmin()
  const { mockup_id, composited_url, org_id } = await req.json()

  if (!mockup_id || !composited_url) {
    return NextResponse.json({ error: 'mockup_id and composited_url required' }, { status: 400 })
  }

  const orgId = org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

  if (!REPLICATE_TOKEN) {
    // Skip polish gracefully if Replicate not configured — return composited_url as concept
    await admin.from('mockup_results').update({
      concept_url: composited_url,
      current_step: 4,
      step_name: 'Concept ready (no Replicate key)',
    }).eq('id', mockup_id)
    return NextResponse.json({ concept_url: composited_url })
  }

  await admin.from('mockup_results').update({
    current_step: 4,
    step_name: 'Applying photorealism…',
  }).eq('id', mockup_id)

  try {
    const createRes = await fetch(`${REPLICATE_API}/models/black-forest-labs/flux-1.1-pro/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({
        input: {
          image: composited_url,
          prompt: 'photorealistic commercial vehicle wrap, professional vehicle graphics, studio photography lighting, sharp details, premium vinyl finish, high quality photograph',
          prompt_strength: 0.12,
          aspect_ratio: '16:9',
          output_format: 'png',
          output_quality: 95,
        },
      }),
    })

    if (!createRes.ok) {
      const err = await createRes.text()
      throw new Error(`Replicate create failed: ${err}`)
    }

    let prediction = await createRes.json()
    if (prediction.status !== 'succeeded') {
      const output = await pollReplicate(prediction.id)
      prediction = { ...prediction, output }
    }

    const polishedUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    if (!polishedUrl) throw new Error('No polished URL from Replicate')

    // Download and upload to Supabase Storage
    const imgRes = await fetch(polishedUrl)
    if (!imgRes.ok) throw new Error('Failed to download polished image')
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer())

    const storagePath = `${mockup_id}/polished.png`
    const { error: upErr } = await admin.storage
      .from('mockup-results')
      .upload(storagePath, imgBuffer, { contentType: 'image/png', upsert: true })

    if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`)

    const { data: urlData } = admin.storage.from('mockup-results').getPublicUrl(storagePath)
    const conceptUrl = urlData.publicUrl

    await admin.from('mockup_results').update({
      concept_url: conceptUrl,
      current_step: 4,
      step_name: 'Photorealism applied',
    }).eq('id', mockup_id)

    return NextResponse.json({ concept_url: conceptUrl })
  } catch (err: any) {
    await logHealth(orgId, 'mockup-polish', err.message)
    // Fallback: use composited_url as concept
    await admin.from('mockup_results').update({
      concept_url: composited_url,
      current_step: 4,
      step_name: 'Concept ready (polish failed)',
      error_step: 'polish',
      error_message: err.message,
    }).eq('id', mockup_id)
    return NextResponse.json({ concept_url: composited_url })
  }
}
