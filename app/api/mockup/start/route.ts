import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import Anthropic from '@anthropic-ai/sdk'
import { randomUUID } from 'crypto'
import {
  logHealth,
  generateArtwork,
  compositeText,
  polishMockup,
} from '@/lib/mockup/pipeline'

export const runtime = 'nodejs'
export const maxDuration = 300

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Vehicle render (Flux img2img) ─────────────────────────────────────────────

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

async function renderOnVehicle(
  conceptUrl: string,
  vehicleBodyType: string,
  vehicleYear: string,
  vehicleMake: string,
  vehicleModel: string,
): Promise<string | null> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return null

  const vehicleDesc = [vehicleYear, vehicleMake, vehicleModel].filter(Boolean).join(' ')
  const vehicleBase = VEHICLE_RENDER_PROMPTS[vehicleBodyType] || VEHICLE_RENDER_PROMPTS.van

  const prompt = `photorealistic vehicle wrap mockup, ${vehicleDesc} ${vehicleBase}, professional vinyl wrap covering entire vehicle body, custom graphic design wrap applied to vehicle, sharp crisp edges, realistic vinyl material texture with slight sheen, professional automotive photography lighting, clean studio environment, high detail commercial vehicle photography`

  try {
    const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt,
          image: conceptUrl,
          prompt_strength: 0.55,
          num_inference_steps: 28,
          guidance_scale: 3.5,
          aspect_ratio: '3:2',
          output_quality: 90,
          output_format: 'jpg',
        },
      }),
    })
    if (!res.ok) return null
    const prediction = await res.json()
    return await pollReplicate(token, prediction.id)
  } catch {
    return null
  }
}

// ── Prompt builders ────────────────────────────────────────────────────────────

function buildWrapPrompts(params: {
  company_name: string
  industry: string
  brand_colors: string[]
  style_notes: string
  vehicle_body_type: string
  wrap_coverage: string
  base_analysis?: string
}): { a: string; b: string; c: string } {
  const { company_name, industry, brand_colors, style_notes, vehicle_body_type, wrap_coverage, base_analysis } = params
  const colorStr = brand_colors.length ? brand_colors.join(', ') : '#1a56f0, #ffffff'
  const bizContext = `${company_name || 'commercial business'} ${industry ? `(${industry})` : ''}`
  const coverDesc = wrap_coverage === 'full' ? 'full vehicle coverage' : `${wrap_coverage} wrap coverage`
  const vehicleType = vehicle_body_type || 'van'
  const extraNotes = style_notes ? ` ${style_notes}.` : ''

  const base = `commercial vehicle wrap graphic design for ${bizContext}, ${vehicleType} ${coverDesc}, brand colors: ${colorStr},${extraNotes} ${base_analysis || ''}`

  return {
    a: `${base} BOLD AGGRESSIVE style, large dramatic angular shapes, high contrast dark background, powerful geometric elements, dynamic composition, bold impact typography areas, professional vinyl wrap artwork, flat lay design`,
    b: `${base} CLEAN PROFESSIONAL style, minimal geometric shapes, solid color blocking, ample white space, corporate identity, straight lines, modern flat design, understated elegance, flat lay design`,
    c: `${base} DYNAMIC GRADIENT style, flowing diagonal elements, sweeping motion lines, bold color gradient transition from ${brand_colors[0] || '#1a56f0'} to ${brand_colors[1] || '#ffffff'}, energetic movement, eye-catching composition, flat lay design`,
  }
}

function buildSignagePrompts(params: {
  company_name: string
  industry: string
  brand_colors: string[]
  style_notes: string
  sign_type: string
}): { a: string; b: string; c: string } {
  const { company_name, industry, brand_colors, style_notes, sign_type } = params
  const colorStr = brand_colors.length ? brand_colors.join(', ') : '#1a56f0, #ffffff'
  const bizContext = `${company_name || 'business'} ${industry ? `(${industry})` : ''}`
  const extraNotes = style_notes ? ` ${style_notes}.` : ''

  const base = `professional commercial signage background design for ${bizContext}, ${sign_type}, brand colors: ${colorStr},${extraNotes}`

  return {
    a: `${base} BOLD style, large color blocks, high contrast, bold graphic shapes, business signage layout`,
    b: `${base} CLEAN MINIMAL style, geometric shapes, white space, professional corporate look, flat color areas`,
    c: `${base} MODERN GRADIENT style, smooth color transitions, diagonal elements, contemporary design, vibrant`,
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 })
  const orgId = profile.org_id

  const body = await req.json()
  const {
    // Output type
    output_type = 'wrap',      // 'wrap' | 'signage'
    sign_type = '',            // e.g. 'vinyl_banner', 'coroplast_sign', etc.
    sign_width_in,
    sign_height_in,
    size_key = 'landscape_16_9', // Recraft size key
    // Vehicle info (wraps only)
    template_id,
    project_id,
    vehicle_make = '',
    vehicle_model = '',
    vehicle_year = '',
    vehicle_body_type = 'van',
    vehicle_sqft,
    wrap_coverage = 'full',
    // Brand info
    company_name = '',
    tagline = '',
    phone = '',
    website = '',
    logo_url,
    brand_colors = ['#1a56f0', '#ffffff', '#f59e0b'],
    industry = '',
    style_notes = '',
    font_choice = 'Impact',
  } = body

  if (output_type === 'wrap' && !template_id && !vehicle_make) {
    return NextResponse.json({ error: 'template_id or vehicle_make required for wraps' }, { status: 400 })
  }

  const mockupId = randomUUID()
  const renderCategory = vehicle_body_type || 'van'

  await admin.from('mockup_results').insert({
    id: mockupId,
    org_id: orgId,
    project_id: project_id || null,
    template_id: template_id || null,
    status: 'processing',
    current_step: 1,
    step_name: 'Starting…',
    output_type,
    sign_type: sign_type || null,
    sign_width_in: sign_width_in || null,
    sign_height_in: sign_height_in || null,
    company_name,
    tagline,
    phone,
    website,
    logo_url: logo_url || null,
    brand_colors,
    industry,
    style_notes,
    font_choice,
    input_prompt: JSON.stringify({
      brand_colors, company_name, industry, style_notes,
      vehicle_make, vehicle_model, vehicle_year, vehicle_body_type,
      wrap_coverage, vehicle_sqft, output_type, sign_type,
    }),
  })

  try {
    // ── Step 1: Claude brand analysis ─────────────────────────────────────────
    await admin.from('mockup_results').update({ current_step: 1, step_name: 'Analyzing brand…' }).eq('id', mockupId)

    let baseAnalysis = ''
    try {
      const content: Anthropic.MessageParam['content'] = []
      if (logo_url) content.push({ type: 'image', source: { type: 'url', url: logo_url } })
      content.push({
        type: 'text',
        text: `Analyze this brand for a commercial ${output_type === 'signage' ? 'sign' : 'vehicle wrap'} design. Return 1-2 sentences describing the design direction, color mood, and visual style that fits this brand. Company: ${company_name || 'Business'}. Industry: ${industry || 'General'}. Colors: ${brand_colors.join(', ')}. Style notes: ${style_notes || 'Professional'}. ${logo_url ? 'Logo: see image.' : ''}`,
      })
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content }],
      })
      baseAnalysis = msg.content[0].type === 'text' ? msg.content[0].text : ''
    } catch { /* non-fatal */ }

    // ── Step 2: Generate 3 concepts in parallel (Recraft V3) ──────────────────
    await admin.from('mockup_results').update({ current_step: 2, step_name: 'Generating 3 design concepts…' }).eq('id', mockupId)

    const prompts = output_type === 'signage'
      ? buildSignagePrompts({ company_name, industry, brand_colors, style_notes, sign_type })
      : buildWrapPrompts({ company_name, industry, brand_colors, style_notes, vehicle_body_type, wrap_coverage, base_analysis: baseAnalysis })

    const recraftStyle = output_type === 'signage' ? 'digital_illustration' : 'digital_illustration'
    const recraftSize = output_type === 'signage' ? (size_key as string) : 'landscape_16_9'

    // Run sequentially to avoid Replicate rate limits (burst limit on low-credit accounts)
    const resultA = await generateArtwork({ mockup_id: mockupId, ideogram_prompt: prompts.a, org_id: orgId, style: recraftStyle, size_key: recraftSize as 'landscape_16_9', slot: 'a' })
    await new Promise(r => setTimeout(r, 1500))
    const resultB = await generateArtwork({ mockup_id: mockupId, ideogram_prompt: prompts.b, org_id: orgId, style: recraftStyle, size_key: recraftSize as 'landscape_16_9', slot: 'b' })
    await new Promise(r => setTimeout(r, 1500))
    const resultC = await generateArtwork({ mockup_id: mockupId, ideogram_prompt: prompts.c, org_id: orgId, style: recraftStyle, size_key: recraftSize as 'landscape_16_9', slot: 'c' })

    await admin.from('mockup_results').update({
      concept_a_url: resultA.artwork_url,
      concept_b_url: resultB.artwork_url,
      concept_c_url: resultC.artwork_url,
      flat_design_url: resultA.artwork_url,
      status: 'concepts_ready',
      current_step: 3,
      step_name: 'Choose your concept',
    }).eq('id', mockupId)

    return NextResponse.json({
      mockup_id: mockupId,
      status: 'concepts_ready',
      concept_a_url: resultA.artwork_url,
      concept_b_url: resultB.artwork_url,
      concept_c_url: resultC.artwork_url,
      // Legacy field — return concept A as default
      flat_design_url: resultA.artwork_url,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    await logHealth(orgId, 'mockup-start', `Pipeline failed: ${msg}`)
    await admin.from('mockup_results').update({
      status: 'failed',
      error_message: msg,
    }).eq('id', mockupId)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
