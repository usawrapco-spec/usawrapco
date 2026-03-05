/**
 * POST /api/mockup/generate-vehicle
 * Generates a photorealistic vehicle or product base image using Flux 1.1 Pro text-to-image.
 * Used by the internal Design Studio as the canvas background before staff soft-mocks a design.
 */
export const runtime    = 'nodejs'
export const maxDuration = 120
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { randomUUID } from 'crypto'

const REPLICATE_API = 'https://api.replicate.com/v1'

// Per body-type base prompts — clean studio, no wrap, no text
const VEHICLE_PROMPTS: Record<string, string> = {
  car:       'sedan, 3/4 front-left angle, studio white background, professional automotive photography, no graphics, no text, clean factory finish',
  suv:       'SUV crossover, 3/4 front-left angle, studio white background, professional automotive photography, no graphics, no text',
  pickup:    'pickup truck, 3/4 front-left angle, studio white background, professional automotive photography, no graphics, no text',
  van:       'full-size cargo van, side profile view, studio white background, commercial vehicle photography, no graphics, no text',
  sprinter:  'Mercedes Sprinter high-roof cargo van, side profile view, studio white background, commercial vehicle photography, no graphics',
  box_truck: 'box truck delivery vehicle, side profile view, studio white background, commercial vehicle photography, no graphics, no text',
  trailer:   'semi trailer, side profile view, studio white background, commercial vehicle photography, no graphics, no text',
  boat:      'center console boat, side view, marina dock background, professional photography, no graphics, no text',
}

// Apparel product prompts — flat lay, no design
const APPAREL_PROMPTS: Record<string, string> = {
  tshirt:     'white blank t-shirt, flat lay, studio white background, no design, no text, no graphics, product photography',
  hoodie:     'white blank pullover hoodie, flat lay, studio white background, no design, no text, no graphics, product photography',
  hat:        'white blank baseball cap, front view, studio white background, no design, no text, no graphics, product photography',
  polo:       'white blank polo shirt, flat lay, studio white background, no design, no text, no graphics, product photography',
  longsleeve: 'white blank long sleeve t-shirt, flat lay, studio white background, no design, no text, product photography',
}

async function pollReplicate(token: string, predictionId: string, maxWaitMs = 90000): Promise<string | null> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 3000))
    const res = await fetch(`${REPLICATE_API}/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) continue
    const data = await res.json()
    if (data.status === 'succeeded') {
      const out = Array.isArray(data.output) ? data.output[0] : data.output
      return typeof out === 'string' ? out : null
    }
    if (data.status === 'failed' || data.status === 'canceled') return null
  }
  return null
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return NextResponse.json({ error: 'Replicate not configured' }, { status: 500 })

  const body = await req.json()
  const {
    year         = '',
    make         = '',
    model        = '',
    body_type    = 'van',
    product_type,         // 'tshirt' | 'hoodie' | 'hat' etc. (for apparel mode)
    base_color   = 'white',
  } = body

  // Build prompt
  let prompt: string
  if (product_type) {
    // Apparel
    const base = APPAREL_PROMPTS[product_type] || APPAREL_PROMPTS.tshirt
    const colorMap: Record<string,string> = { white: 'white', black: 'black', navy: 'navy blue', grey: 'heather grey' }
    const colorWord = colorMap[base_color] || base_color
    prompt = base.replace('white blank', `${colorWord} blank`)
  } else {
    // Vehicle
    const vehicleDesc = [year, make, model].filter(Boolean).join(' ')
    const bodyBase = VEHICLE_PROMPTS[body_type] || VEHICLE_PROMPTS.van
    prompt = vehicleDesc
      ? `${vehicleDesc} ${bodyBase}`
      : bodyBase
    prompt += ', photorealistic, ultra detailed, 8K, professional quality'
  }

  try {
    const res = await fetch(`${REPLICATE_API}/models/black-forest-labs/flux-1.1-pro/predictions`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio:  product_type ? '2:3' : '3:2',
          output_format: 'jpg',
          output_quality: 90,
          num_inference_steps: 28,
          guidance_scale: 3.5,
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Replicate error: ${err}` }, { status: 500 })
    }

    const prediction = await res.json()
    let renderUrl: string | null = null

    if (prediction.status === 'succeeded') {
      renderUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    } else {
      renderUrl = await pollReplicate(token, prediction.id)
    }

    if (!renderUrl) return NextResponse.json({ error: 'No render URL from Replicate' }, { status: 500 })

    // Download and store in our bucket so URL is stable
    const imgRes = await fetch(renderUrl)
    if (!imgRes.ok) return NextResponse.json({ render_url: renderUrl }) // return Replicate URL as fallback

    const buffer  = Buffer.from(await imgRes.arrayBuffer())
    const admin   = getSupabaseAdmin()
    const orgId   = (await admin.from('profiles').select('org_id').eq('id', user.id).single()).data?.org_id || 'unknown'
    const id      = randomUUID()
    const path    = `studio-renders/${orgId}/${id}.jpg`

    const { error: upErr } = await admin.storage
      .from('mockup-results')
      .upload(path, buffer, { contentType: 'image/jpeg', upsert: false })

    if (upErr) return NextResponse.json({ render_url: renderUrl })

    const { data: urlData } = admin.storage.from('mockup-results').getPublicUrl(path)
    return NextResponse.json({ render_url: urlData.publicUrl, prompt })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
