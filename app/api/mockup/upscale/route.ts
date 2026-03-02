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

async function pollReplicate(predictionId: string, timeoutMs = 180000): Promise<any> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3000))
    const res = await fetch(`${REPLICATE_API}/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
    })
    const pred = await res.json()
    if (pred.status === 'succeeded') return pred.output
    if (pred.status === 'failed') throw new Error(`Replicate failed: ${pred.error}`)
  }
  throw new Error('Upscale timeout after 180s')
}

export async function POST(req: NextRequest) {
  const admin = getSupabaseAdmin()
  const { mockup_id, concept_url, org_id } = await req.json()

  if (!mockup_id || !concept_url) {
    return NextResponse.json({ error: 'mockup_id and concept_url required' }, { status: 400 })
  }

  const orgId = org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

  if (!REPLICATE_TOKEN) {
    await admin.from('mockup_results').update({
      upscaled_url: concept_url,
      current_step: 5,
      step_name: 'Upscaled (no Replicate key)',
    }).eq('id', mockup_id)
    return NextResponse.json({ upscaled_url: concept_url })
  }

  await admin.from('mockup_results').update({
    current_step: 5,
    step_name: 'Upscaling to print resolution…',
  }).eq('id', mockup_id)

  try {
    // Real-ESRGAN 4x upscale via Replicate
    const createRes = await fetch(`${REPLICATE_API}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({
        version: '42fed1c4974146d4d2414e2be2c5277c7fcf05fea2c99b4d5d30c7e4',
        input: {
          image: concept_url,
          scale: 4,
          face_enhance: false,
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

    const upscaledUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    if (!upscaledUrl) throw new Error('No upscaled URL from Replicate')

    // Download and re-upload to our storage
    const imgRes = await fetch(upscaledUrl)
    if (!imgRes.ok) throw new Error('Failed to download upscaled image')
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer())

    const storagePath = `${mockup_id}/upscaled.png`
    const { error: upErr } = await admin.storage
      .from('mockup-results')
      .upload(storagePath, imgBuffer, { contentType: 'image/png', upsert: true })

    if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`)

    const { data: urlData } = admin.storage.from('mockup-results').getPublicUrl(storagePath)
    const storedUrl = urlData.publicUrl

    await admin.from('mockup_results').update({
      upscaled_url: storedUrl,
      current_step: 5,
      step_name: 'Upscaled to print resolution',
    }).eq('id', mockup_id)

    return NextResponse.json({ upscaled_url: storedUrl })
  } catch (err: any) {
    await logHealth(orgId, 'mockup-upscale', err.message)
    // Graceful fallback — use concept_url
    await admin.from('mockup_results').update({
      upscaled_url: concept_url,
      current_step: 5,
      step_name: 'Upscale complete (fallback)',
    }).eq('id', mockup_id)
    return NextResponse.json({ upscaled_url: concept_url })
  }
}
