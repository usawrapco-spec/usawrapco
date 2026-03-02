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
  const { mockup_id, ideogram_prompt, org_id } = await req.json()

  if (!mockup_id || !ideogram_prompt) {
    return NextResponse.json({ error: 'mockup_id and ideogram_prompt required' }, { status: 400 })
  }

  const orgId = org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

  if (!REPLICATE_TOKEN) {
    await logHealth(orgId, 'generate-artwork', 'REPLICATE_API_TOKEN not set')
    return NextResponse.json({ error: 'Replicate not configured' }, { status: 503 })
  }

  await admin.from('mockup_results').update({
    current_step: 2,
    step_name: 'Generating artwork…',
  }).eq('id', mockup_id)

  try {
    const fullPrompt = `${ideogram_prompt} NO TEXT NO WORDS NO LETTERS NO NUMBERS`
    const negativePrompt = 'text, words, letters, numbers, typography, fonts, labels, signs, watermarks, logos'

    // Create Ideogram v2 prediction via Replicate
    const createRes = await fetch(`${REPLICATE_API}/models/ideogram-ai/ideogram-v2/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({
        input: {
          prompt: fullPrompt,
          negative_prompt: negativePrompt,
          width: 2160,
          height: 1080,
          style_type: 'Design',
          magic_prompt_option: 'Off',
        },
      }),
    })

    if (!createRes.ok) {
      const err = await createRes.text()
      throw new Error(`Replicate create failed: ${err}`)
    }

    let prediction = await createRes.json()

    // If not immediately done, poll
    if (prediction.status !== 'succeeded') {
      const output = await pollReplicate(prediction.id)
      prediction = { ...prediction, output }
    }

    const artworkUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output

    if (!artworkUrl) throw new Error('No artwork URL returned from Replicate')

    // Download and upload to Supabase Storage
    const imgRes = await fetch(artworkUrl)
    if (!imgRes.ok) throw new Error('Failed to download artwork from Replicate')
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer())

    const storagePath = `${mockup_id}/artwork.png`
    const { error: upErr } = await admin.storage
      .from('mockup-results')
      .upload(storagePath, imgBuffer, { contentType: 'image/png', upsert: true })

    if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`)

    const { data: urlData } = admin.storage.from('mockup-results').getPublicUrl(storagePath)
    const storedUrl = urlData.publicUrl

    await admin.from('mockup_results').update({
      flat_design_url: storedUrl,
      current_step: 2,
      step_name: 'Artwork generated',
    }).eq('id', mockup_id)

    return NextResponse.json({ artwork_url: storedUrl })
  } catch (err: any) {
    await logHealth(orgId, 'generate-artwork', err.message)
    await admin.from('mockup_results').update({
      error_step: 'generate-artwork',
      error_message: err.message,
    }).eq('id', mockup_id)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
