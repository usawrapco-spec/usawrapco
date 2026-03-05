import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import Anthropic from '@anthropic-ai/sdk'
import { randomUUID } from 'crypto'
import { logHealth, generateWrapConcept, type ImageProvider } from '@/lib/mockup/pipeline'
import { logMockupActivity } from '@/lib/mockup/logActivity'

export const runtime = 'nodejs'
export const maxDuration = 300

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Vehicle descriptions for consistent rendering ────────────────────────────

const VEHICLE_DESCRIPTIONS: Record<string, string> = {
  car: 'sedan car, side profile view on white studio background',
  suv: 'SUV crossover, side profile view on white studio background',
  van: 'full-size cargo van, side profile view on white studio background',
  sprinter: 'Mercedes-Benz Sprinter high-roof cargo van, side profile view on white studio background',
  pickup: 'full-size pickup truck, side profile view on white studio background',
  box_truck: 'box truck, side profile view on white studio background',
  trailer: 'semi trailer, side view on white studio background',
  boat: 'center console boat, side view on white background',
}

// ── Prompt builders (Ideogram V2 — text-aware) ──────────────────────────────

function buildWrapPrompts(params: {
  company_name: string
  phone: string
  website: string
  tagline: string
  industry: string
  brand_colors: string[]
  style_notes: string
  vehicle_body_type: string
  vehicle_year: string
  vehicle_make: string
  vehicle_model: string
  wrap_coverage: string
  base_analysis?: string
}): Record<string, string> {
  const {
    company_name, phone, website, tagline, industry,
    brand_colors, style_notes, vehicle_body_type,
    vehicle_year, vehicle_make, vehicle_model,
    wrap_coverage, base_analysis,
  } = params

  const colorStr = brand_colors.length ? brand_colors.join(', ') : '#1a56f0, #ffffff'
  const vehicleDesc = VEHICLE_DESCRIPTIONS[vehicle_body_type] || VEHICLE_DESCRIPTIONS.van
  const vehicleName = [vehicle_year, vehicle_make, vehicle_model].filter(Boolean).join(' ') || 'commercial van'
  const coverDesc = wrap_coverage === 'full' ? 'full wrap covering entire vehicle' : `${wrap_coverage} wrap`
  const extraNotes = style_notes ? ` Design notes: ${style_notes}.` : ''

  // Build the text elements that should appear on the wrap
  const textElements: string[] = []
  if (company_name) textElements.push(`company name "${company_name}" in large bold text`)
  if (phone) textElements.push(`phone number "${phone}"`)
  if (website) textElements.push(`website "${website}"`)
  if (tagline) textElements.push(`tagline "${tagline}"`)
  const textDesc = textElements.length
    ? `The wrap MUST prominently display: ${textElements.join(', ')}.`
    : ''

  const base = `Professional vehicle wrap mockup: ${vehicleName} ${vehicleDesc}, ${coverDesc}, brand colors ${colorStr}. ${textDesc}${industry ? ` ${industry} industry branding.` : ''}${extraNotes} ${base_analysis || ''} Photorealistic vinyl wrap applied to the vehicle, studio lighting, commercial photography`

  return {
    a: `${base}. BOLD AGGRESSIVE style — dark background, high contrast, sharp angular graphics, dramatic look, powerful brand presence`,
    b: `${base}. CLEAN PROFESSIONAL style — white/light areas, geometric color blocking, corporate feel, minimal and polished, modern business look`,
    c: `${base}. DYNAMIC GRADIENT style — flowing diagonal design elements, color gradient from ${brand_colors[0] || '#1a56f0'} to ${brand_colors[1] || '#ffffff'}, energetic motion lines, eye-catching composition`,
    d: `${base}. SLEEK MINIMAL style — single accent stripe, large white/neutral areas, subtle branding, understated elegance, premium fleet look`,
    e: `${base}. VIBRANT FULL-COLOR style — rich saturated colors covering entire vehicle, large bold graphics, eye-catching from a distance, attention-grabbing street presence`,
    f: `${base}. CLASSIC TRADITIONAL style — timeless layout, centered logo placement, clean horizontal lines, professional fleet branding, trusted business look`,
  }
}

function buildSignagePrompts(params: {
  company_name: string
  phone: string
  website: string
  tagline: string
  industry: string
  brand_colors: string[]
  style_notes: string
  sign_type: string
}): Record<string, string> {
  const { company_name, phone, website, tagline, industry, brand_colors, style_notes, sign_type } = params
  const colorStr = brand_colors.length ? brand_colors.join(', ') : '#1a56f0, #ffffff'
  const extraNotes = style_notes ? ` ${style_notes}.` : ''

  const textElements: string[] = []
  if (company_name) textElements.push(`"${company_name}" in large bold text`)
  if (phone) textElements.push(`phone "${phone}"`)
  if (website) textElements.push(`website "${website}"`)
  if (tagline) textElements.push(`tagline "${tagline}"`)
  const textDesc = textElements.length
    ? `Display: ${textElements.join(', ')}.`
    : ''

  const base = `Professional commercial ${sign_type} sign design, brand colors ${colorStr}. ${textDesc}${industry ? ` ${industry} industry.` : ''}${extraNotes} Print-ready graphic design`

  return {
    a: `${base}. BOLD style — high contrast, large color blocks, attention-grabbing`,
    b: `${base}. CLEAN MINIMAL style — white space, geometric shapes, corporate professional`,
    c: `${base}. MODERN GRADIENT style — smooth color transitions, diagonal elements, contemporary`,
    d: `${base}. ELEGANT DARK style — dark background, metallic accents, premium sophisticated look`,
    e: `${base}. VIBRANT POP style — bright saturated colors, playful layout, energetic and friendly`,
    f: `${base}. CLASSIC TRADITIONAL style — timeless layout, centered design, balanced proportions, trusted look`,
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
    output_type = 'wrap',
    sign_type = '',
    sign_width_in,
    sign_height_in,
    size_key = 'landscape_16_9',
    template_id,
    project_id,
    vehicle_make = '',
    vehicle_model = '',
    vehicle_year = '',
    vehicle_body_type = 'van',
    vehicle_sqft,
    wrap_coverage = 'full',
    company_name = '',
    tagline = '',
    phone = '',
    website = '',
    logo_url,
    brand_colors = ['#1a56f0', '#ffffff', '#f59e0b'],
    industry = '',
    style_notes = '',
    font_choice = 'Impact',
    // Re-render from selected concept: lock all 3 slots to this style variant
    force_style,            // 'a' | 'b' | 'c' | undefined
    provider = 'openai' as ImageProvider,
    customer_id,
  } = body

  if (output_type === 'wrap' && !template_id && !vehicle_make) {
    return NextResponse.json({ error: 'template_id or vehicle_make required for wraps' }, { status: 400 })
  }

  const mockupId = randomUUID()

  await admin.from('mockup_results').insert({
    id: mockupId,
    org_id: orgId,
    project_id: project_id || null,
    customer_id: customer_id || null,
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
      phone, website, tagline,
    }),
  })

  try {
    // ── Step 1: Quick Claude brand analysis ──────────────────────────────────
    await admin.from('mockup_results').update({ current_step: 1, step_name: 'Analyzing brand…' }).eq('id', mockupId)

    let baseAnalysis = ''
    try {
      const content: Anthropic.MessageParam['content'] = []
      if (logo_url) content.push({ type: 'image', source: { type: 'url', url: logo_url } })
      content.push({
        type: 'text',
        text: `You're a vehicle wrap designer. In 1-2 sentences, describe the ideal design direction for this brand. Company: ${company_name || 'Business'}. Industry: ${industry || 'General'}. Colors: ${brand_colors.join(', ')}. Style: ${style_notes || 'Professional'}.`,
      })
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{ role: 'user', content }],
      })
      baseAnalysis = msg.content[0].type === 'text' ? msg.content[0].text : ''
    } catch { /* non-fatal */ }

    // ── Step 2: Generate 6 design concepts with Ideogram V2 (text-aware) ────
    await admin.from('mockup_results').update({ current_step: 2, step_name: 'Generating design concepts…' }).eq('id', mockupId)

    const prompts = output_type === 'signage'
      ? buildSignagePrompts({ company_name, phone, website, tagline, industry, brand_colors, style_notes, sign_type })
      : buildWrapPrompts({
          company_name, phone, website, tagline, industry,
          brand_colors, style_notes, vehicle_body_type, wrap_coverage,
          vehicle_year, vehicle_make, vehicle_model,
          base_analysis: baseAnalysis,
        })

    const sizeKey = output_type === 'signage' ? (size_key as string) : 'landscape_16_9'
    const slots = ['a', 'b', 'c', 'd', 'e', 'f'] as const

    // Generate sequentially to avoid rate limits
    const results: Record<string, string> = {}
    for (const slot of slots) {
      if (prompts[slot]) {
        const result = await generateWrapConcept({ mockup_id: mockupId, prompt: prompts[slot], org_id: orgId, size_key: sizeKey, slot, provider })
        results[slot] = result.artwork_url
        if (slot !== 'f') await new Promise(r => setTimeout(r, 800))
      }
    }

    await admin.from('mockup_results').update({
      concept_a_url: results.a || null,
      concept_b_url: results.b || null,
      concept_c_url: results.c || null,
      concept_d_url: results.d || null,
      concept_e_url: results.e || null,
      concept_f_url: results.f || null,
      flat_design_url: results.a || null,
      status: 'concepts_ready',
      current_step: 3,
      step_name: 'Choose your concept',
    }).eq('id', mockupId)

    await logMockupActivity({
      org_id: orgId,
      customer_id: customer_id || null,
      project_id: project_id || null,
      mockup_id: mockupId,
      action: 'mockup_concepts_generated',
      details: `6 design concepts generated for ${company_name || 'customer'}`,
      metadata: { company_name, vehicle_body_type, output_type, provider },
      actor_type: 'ai',
      actor_id: user?.id || null,
    })

    return NextResponse.json({
      mockup_id: mockupId,
      status: 'concepts_ready',
      concept_a_url: results.a || null,
      concept_b_url: results.b || null,
      concept_c_url: results.c || null,
      concept_d_url: results.d || null,
      concept_e_url: results.e || null,
      concept_f_url: results.f || null,
      flat_design_url: results.a || null,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    await logHealth(orgId, 'mockup-start', `Pipeline failed: ${msg}`)
    await admin.from('mockup_results').update({
      status: 'failed',
      error_message: msg,
    }).eq('id', mockupId)
    await logMockupActivity({
      org_id: orgId,
      customer_id: customer_id || null,
      mockup_id: mockupId,
      action: 'mockup_generation_failed',
      details: msg,
      actor_type: 'system',
    })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
