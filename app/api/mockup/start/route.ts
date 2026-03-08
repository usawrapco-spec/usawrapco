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
  // Boat sub-types
  boat_center_console: 'center console fishing boat, side profile view on white studio background, open deck, T-top frame',
  boat_bowrider: 'bowrider sport boat, side profile view on white studio background, open bow seating area',
  boat_pontoon: 'pontoon boat, side profile view on white studio background, dual aluminum pontoons, flat deck',
  boat_bass: 'bass boat, low profile, side view on white studio background, sleek low-profile hull',
  boat_cruiser: 'cabin cruiser yacht, side profile view on white studio background, enclosed cabin',
  boat_ski: 'ski wake boat, side profile view on white studio background, inboard engine, tower',
  boat_jetski: 'jet ski personal watercraft, side view on white studio background, compact hull',
}

// ── Prompt builders (Ideogram V3 — text-aware, 3D render) ──────────────────

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
  boat_sub_type?: string
  base_analysis?: string
  vehicle_paint_color?: string
  logo_description?: string
}): Record<string, string> {
  const {
    company_name, phone, website, tagline, industry,
    brand_colors, style_notes, vehicle_body_type,
    vehicle_year, vehicle_make, vehicle_model,
    wrap_coverage, boat_sub_type, base_analysis,
    vehicle_paint_color, logo_description,
  } = params

  // Resolve vehicle description — use boat sub-type if available
  const descKey = boat_sub_type ? `boat_${boat_sub_type}` : vehicle_body_type
  const vehicleDesc = VEHICLE_DESCRIPTIONS[descKey] || VEHICLE_DESCRIPTIONS[vehicle_body_type] || VEHICLE_DESCRIPTIONS.van
  const vehicleName = [vehicle_year, vehicle_make, vehicle_model].filter(Boolean).join(' ') || 'commercial van'
  const coverDesc = wrap_coverage === 'full' ? 'full wrap covering entire vehicle' : `${wrap_coverage} wrap`
  const extraNotes = style_notes ? ` Design notes: ${style_notes}.` : ''

  // Very explicit color enforcement — repeat hex codes so AI follows them
  const primaryColor = brand_colors[0] || '#1a56f0'
  const secondaryColor = brand_colors[1] || '#ffffff'
  const accentColor = brand_colors[2] || ''
  const colorStr = brand_colors.length ? brand_colors.join(', ') : '#1a56f0, #ffffff'
  const colorEnforce = `STRICT COLOR REQUIREMENT: Use ONLY these exact brand colors: ${colorStr}. Primary: ${primaryColor} (dominant, used for main graphic elements, backgrounds, large shapes). Secondary: ${secondaryColor} (text, accent lines, contrast). ${accentColor ? `Accent: ${accentColor}. ` : ''}DO NOT use any other colors. All graphic elements must strictly follow this palette.`

  // Build the text elements that should appear on the wrap
  const textElements: string[] = []
  if (company_name) textElements.push(`company name "${company_name}" in large bold text`)
  if (phone) textElements.push(`phone number "${phone}"`)
  if (website) textElements.push(`website "${website}"`)
  if (tagline) textElements.push(`tagline "${tagline}"`)
  const textDesc = textElements.length
    ? `The wrap MUST prominently display: ${textElements.join(', ')}.`
    : ''

  const base = `Professional vehicle wrap mockup: ${vehicleName} ${vehicleDesc}, ${coverDesc}, brand colors ${colorStr}. ${colorEnforce} ${textDesc}${logo_description ? ` The company logo (${logo_description}) must be prominently featured on the vehicle sides — large, centered on the main panels, integrated into the wrap design as a primary visual element.` : ''}${industry ? ` ${industry} industry branding.` : ''}${extraNotes}${vehicle_paint_color ? ` Base vehicle paint is ${vehicle_paint_color} — show this color in unpainted/partial areas.` : ''} ${base_analysis || ''} Photorealistic vinyl wrap applied to the vehicle with accurate proportions, studio lighting, commercial photography, high detail`

  return {
    a: `${base}. BOLD AGGRESSIVE style — ${primaryColor} base color, sharp angular geometric cuts, high-contrast color blocks in ${primaryColor} and ${secondaryColor}, dramatic shadows, powerful brand presence, racing-inspired graphics`,
    b: `${base}. CLEAN PROFESSIONAL style — ${secondaryColor} base, thin ${primaryColor} accent lines, geometric color blocking, corporate feel, minimal and polished, modern business look, clean edges`,
    c: `${base}. DYNAMIC GRADIENT style — flowing diagonal design elements, smooth color gradient from ${primaryColor} to ${secondaryColor}, energetic motion lines, eye-catching composition, sweeping curves`,
    d: `${base}. SLEEK MINIMAL style — single ${primaryColor} accent stripe, large ${secondaryColor} areas, subtle branding, understated elegance, premium fleet look, thin pinstripe details`,
    e: `${base}. VIBRANT FULL-COLOR style — ${primaryColor} covering entire vehicle, large bold graphics in ${secondaryColor}, eye-catching from a distance, attention-grabbing street presence, full coverage design`,
    f: `${base}. CLASSIC TRADITIONAL style — timeless layout, centered logo placement, clean horizontal lines in ${primaryColor} and ${secondaryColor}, professional fleet branding, trusted business look, balanced composition`,
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
  logo_description?: string
}): Record<string, string> {
  const { company_name, phone, website, tagline, industry, brand_colors, style_notes, sign_type, logo_description } = params
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

  const base = `Professional commercial ${sign_type} sign design, brand colors ${colorStr}. ${textDesc}${logo_description ? ` The company logo (${logo_description}) must be prominently featured — large, centered, integrated into the design as a primary visual element.` : ''}${industry ? ` ${industry} industry.` : ''}${extraNotes} Print-ready graphic design`

  return {
    a: `${base}. BOLD style — high contrast, large color blocks, attention-grabbing`,
    b: `${base}. CLEAN MINIMAL style — white space, geometric shapes, corporate professional`,
    c: `${base}. MODERN GRADIENT style — smooth color transitions, diagonal elements, contemporary`,
    d: `${base}. ELEGANT DARK style — dark background, metallic accents, premium sophisticated look`,
    e: `${base}. VIBRANT POP style — bright saturated colors, playful layout, energetic and friendly`,
    f: `${base}. CLASSIC TRADITIONAL style — timeless layout, centered design, balanced proportions, trusted look`,
  }
}

// ── Boat Decking Prompts (top-down / aerial view) ────────────────────────────

function buildDeckingPrompts(params: {
  boat_sub_type: string
  deck_style: string
  deck_area: string
  boat_year: string
  boat_make: string
  boat_model: string
  style_notes: string
}): Record<string, string> {
  const { boat_sub_type, deck_style, deck_area, boat_year, boat_make, boat_model, style_notes } = params

  const boatDesc = [boat_year, boat_make, boat_model].filter(Boolean).join(' ') || boat_sub_type || 'center console boat'
  const areaDesc = deck_area === 'full_deck' ? 'entire top deck' : deck_area === 'cockpit_only' ? 'cockpit and helm area' : deck_area === 'bow_only' ? 'forward bow deck' : 'deck surfaces'
  const extraNotes = style_notes ? ` Design notes: ${style_notes}.` : ''

  // Base prompt — top-down aerial view showing the deck surface
  const base = `Aerial top-down overhead view of a ${boatDesc}, professional product photography on white studio background, showing the ${areaDesc} covered with custom EVA foam decking pattern. The decking covers the boat floor/deck surface completely — high resolution, photorealistic material texture, marine-grade foam material look.${extraNotes}`

  return {
    a: `${base} STRAIGHT TEAK pattern — classic parallel teak plank lines in warm brown tones with dark caulk seams, realistic wood-grain texture, traditional nautical look, precision cut to boat deck shape`,
    b: `${base} HERRINGBONE TEAK pattern — diagonal V-shaped chevron teak plank arrangement, alternating direction planks, premium yacht-style aesthetic, rich warm brown with dark seams`,
    c: `${base} DIAMOND GRIP pattern — raised embossed diamond non-slip texture, dark grey/charcoal color, sporty performance look, maximum traction surface`,
    d: `${base} CARBON FIBER texture — dark woven carbon fiber look, black and dark grey weave pattern, high-performance sport boat aesthetic, glossy finish`,
    e: `${base} TWO-TONE TEAK pattern — alternating light and dark teak planks, modern contrast striping design, premium custom layout with accent borders at edges`,
    f: `${base} SOLID COLOR CUSTOM — flat clean solid color EVA foam surface, minimal with subtle texture, modern yacht aesthetic, clean lines around deck hardware cutouts`,
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
    provider = 'ideogram_v3' as ImageProvider,
    customer_id,
    inspiration_urls = [] as string[],
    boat_sub_type = '',
    vehicle_paint_color = '',
    marine_service = '',
    deck_style = 'teak_straight',
    deck_area = 'full_deck',
    boat_details = '',
  } = body

  if (output_type === 'wrap' && !template_id && !vehicle_make) {
    return NextResponse.json({ error: 'template_id or vehicle_make required for wraps' }, { status: 400 })
  }

  const mockupId = randomUUID()

  const { error: insertError } = await admin.from('mockup_results').insert({
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
    wrap_coverage: wrap_coverage || 'full',
    inspiration_urls: body.inspiration_urls || null,
    boat_sub_type: boat_sub_type || null,
    input_prompt: JSON.stringify({
      brand_colors, company_name, industry, style_notes,
      vehicle_make, vehicle_model, vehicle_year, vehicle_body_type,
      wrap_coverage, vehicle_sqft, output_type, sign_type,
      phone, website, tagline, boat_sub_type,
      inspiration_urls: body.inspiration_urls || [],
    }),
  })

  if (insertError) {
    console.error('Failed to insert mockup_results:', insertError)
    return NextResponse.json({ error: `Failed to create mockup record: ${insertError.message}` }, { status: 500 })
  }

  try {
    // ── Step 1: Quick Claude brand analysis ──────────────────────────────────
    await admin.from('mockup_results').update({ current_step: 1, step_name: 'Analyzing brand…' }).eq('id', mockupId)

    let baseAnalysis = ''
    try {
      const content: Anthropic.MessageParam['content'] = []
      if (logo_url) content.push({ type: 'image', source: { type: 'url', url: logo_url } })
      // Include inspiration images in brand analysis
      if (inspiration_urls && inspiration_urls.length > 0) {
        for (const inspoUrl of inspiration_urls.slice(0, 3)) {
          if (inspoUrl) content.push({ type: 'image', source: { type: 'url', url: inspoUrl } })
        }
      }
      const inspoNote = inspiration_urls?.length ? ' The user has provided reference/inspiration images — incorporate their visual style, color usage, and layout patterns into your design direction.' : ''
      content.push({
        type: 'text',
        text: `You're a vehicle wrap designer. In 1-2 sentences, describe the ideal design direction for this brand.${inspoNote} Company: ${company_name || 'Business'}. Industry: ${industry || 'General'}. Colors: ${brand_colors.join(', ')}. Style: ${style_notes || 'Professional'}.`,
      })
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{ role: 'user', content }],
      })
      baseAnalysis = msg.content[0].type === 'text' ? msg.content[0].text : ''
    } catch { /* non-fatal */ }

    // ── Step 2: Generate 6 design concepts (parallel batches for speed) ─────
    await admin.from('mockup_results').update({ current_step: 2, step_name: 'Generating design concepts…' }).eq('id', mockupId)

    // For marine decking-only, use the top-down decking prompt builder
    const isDeckingOnly = output_type === 'decking' || (output_type === 'marine' && marine_service === 'decking')

    const prompts = output_type === 'signage'
      ? buildSignagePrompts({ company_name, phone, website, tagline, industry, brand_colors, style_notes, sign_type, logo_description: logo_url ? `brand logo prominently displayed, centered on vehicle side panels` : undefined })
      : isDeckingOnly
      ? buildDeckingPrompts({
          boat_sub_type: boat_sub_type || vehicle_body_type || 'center_console',
          deck_style,
          deck_area,
          boat_year: vehicle_year,
          boat_make: vehicle_make,
          boat_model: vehicle_model || boat_details,
          style_notes,
        })
      : buildWrapPrompts({
          company_name, phone, website, tagline, industry,
          brand_colors, style_notes, vehicle_body_type, wrap_coverage,
          vehicle_year, vehicle_make, vehicle_model,
          boat_sub_type: boat_sub_type || undefined,
          base_analysis: baseAnalysis,
          vehicle_paint_color: vehicle_paint_color || undefined,
          logo_description: logo_url ? `brand logo prominently displayed, centered on vehicle side panels` : undefined,
        })

    const sizeKey = output_type === 'signage' ? (size_key as string) : 'landscape_16_9'

    // Generate in 2 parallel batches of 3 for speed (~8-12s total vs 60-90s sequential)
    const results: Record<string, string> = {}
    const batch1 = (['a', 'b', 'c'] as const).map(async (slot) => {
      if (!prompts[slot]) return
      const result = await generateWrapConcept({ mockup_id: mockupId, prompt: prompts[slot], org_id: orgId, size_key: sizeKey, slot, provider })
      results[slot] = result.artwork_url
    })
    await Promise.all(batch1)

    const batch2 = (['d', 'e', 'f'] as const).map(async (slot) => {
      if (!prompts[slot]) return
      const result = await generateWrapConcept({ mockup_id: mockupId, prompt: prompts[slot], org_id: orgId, size_key: sizeKey, slot, provider })
      results[slot] = result.artwork_url
    })
    await Promise.all(batch2)

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
