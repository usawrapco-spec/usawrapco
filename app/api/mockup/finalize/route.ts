/**
 * POST /api/mockup/finalize
 * Called after user picks a concept (A/B/C).
 * Runs: polish → vehicle render → text composite → done
 */
export const runtime = 'nodejs'
export const maxDuration = 300
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { logHealth, compositeText, polishMockup } from '@/lib/mockup/pipeline'

const VEHICLE_RENDER_PROMPTS: Record<string, string> = {
  car: 'sedan, 3/4 front angle, studio white background, professional automotive photography',
  suv: 'SUV crossover, 3/4 front angle, studio white background, professional automotive photography',
  van: 'full-size cargo van, side profile view, studio white background, commercial vehicle',
  sprinter: 'Mercedes Sprinter cargo van, side profile view, studio white background, commercial vehicle',
  pickup: 'pickup truck, 3/4 front angle, studio white background, professional automotive photography',
  box_truck: 'box truck delivery vehicle, side profile view, studio white background, commercial vehicle',
  trailer: 'semi trailer, side view, studio white background, commercial vehicle',
  boat: 'center console boat, side view, marina background, professional photography',
}

async function pollReplicate(token: string, predictionId: string, maxWaitMs = 90000): Promise<string | null> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 3000))
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
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

async function renderOnVehicle(conceptUrl: string, bodyType: string, year: string, make: string, model: string): Promise<string | null> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return null
  const vehicleDesc = [year, make, model].filter(Boolean).join(' ')
  const vehicleBase = VEHICLE_RENDER_PROMPTS[bodyType] || VEHICLE_RENDER_PROMPTS.van
  const prompt = `photorealistic vehicle wrap mockup AI preview, ${vehicleDesc} ${vehicleBase}, professional vinyl wrap covering vehicle body, custom graphic design applied, sharp edges, realistic vinyl texture, studio lighting`
  try {
    const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { prompt, image: conceptUrl, prompt_strength: 0.55, num_inference_steps: 28, guidance_scale: 3.5, aspect_ratio: '3:2', output_quality: 90, output_format: 'jpg' },
      }),
    })
    if (!res.ok) return null
    const prediction = await res.json()
    return await pollReplicate(token, prediction.id)
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 })
  const orgId = profile.org_id

  const { mockup_id, selected_concept = 'a' } = await req.json()
  if (!mockup_id) return NextResponse.json({ error: 'mockup_id required' }, { status: 400 })

  // Fetch mockup record
  const { data: mockup } = await admin
    .from('mockup_results')
    .select('*')
    .eq('id', mockup_id)
    .eq('org_id', orgId)
    .single()

  if (!mockup) return NextResponse.json({ error: 'Mockup not found' }, { status: 404 })

  // Get the selected artwork URL
  const artworkUrl =
    selected_concept === 'b' ? mockup.concept_b_url :
    selected_concept === 'c' ? mockup.concept_c_url :
    mockup.concept_a_url || mockup.flat_design_url

  if (!artworkUrl) return NextResponse.json({ error: 'No artwork URL for selected concept' }, { status: 400 })

  const inputData = typeof mockup.input_prompt === 'string'
    ? JSON.parse(mockup.input_prompt)
    : (mockup.input_prompt as Record<string, unknown>) || {}

  try {
    await admin.from('mockup_results').update({
      selected_concept,
      status: 'processing',
      current_step: 3,
      step_name: 'Refining selected concept…',
    }).eq('id', mockup_id)

    // Polish
    const { concept_url: polishedUrl } = await polishMockup({
      mockup_id,
      composited_url: artworkUrl,
      org_id: orgId,
    })

    // Vehicle render (wraps only)
    let renderUrl: string | null = null
    if (mockup.output_type !== 'signage') {
      await admin.from('mockup_results').update({ current_step: 4, step_name: 'Rendering on vehicle (AI preview)…' }).eq('id', mockup_id)
      renderUrl = await renderOnVehicle(
        polishedUrl,
        String(inputData.vehicle_body_type || 'van'),
        String(inputData.vehicle_year || ''),
        String(inputData.vehicle_make || ''),
        String(inputData.vehicle_model || ''),
      )
    }

    // Text composite on top
    await admin.from('mockup_results').update({ current_step: 5, step_name: 'Adding your information…' }).eq('id', mockup_id)
    const textBase = renderUrl || polishedUrl
    const { composited_url: finalUrl } = await compositeText({
      mockup_id,
      template_id: mockup.template_id || null,
      artwork_url: textBase,
      company_name: mockup.company_name || '',
      tagline: mockup.tagline || '',
      phone: mockup.phone || '',
      website: mockup.website || '',
      font_choice: mockup.font_choice || 'Impact',
      brand_colors: mockup.brand_colors || ['#1a56f0', '#ffffff'],
      logo_url: mockup.logo_url || undefined,
      org_id: orgId,
    })

    await admin.from('mockup_results').update({
      status: 'concept_ready',
      current_step: 6,
      step_name: 'Concept ready for approval',
      final_mockup_url: finalUrl,
      concept_url: polishedUrl,
    }).eq('id', mockup_id)

    return NextResponse.json({
      mockup_id,
      status: 'concept_ready',
      concept_url: finalUrl,
      render_url: renderUrl,
      flat_design_url: artworkUrl,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    await logHealth(orgId, 'mockup-finalize', msg)
    await admin.from('mockup_results').update({ status: 'failed', error_message: msg }).eq('id', mockup_id)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
