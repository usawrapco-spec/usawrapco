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

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
    template_id,
    project_id,
    // Vehicle info (new — replaces template requirement)
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

  // template_id is now optional — either template_id OR vehicle info is required
  if (!template_id && !vehicle_make) {
    return NextResponse.json({ error: 'template_id or vehicle_make required' }, { status: 400 })
  }

  const mockupId = randomUUID()

  // Derive render category from body type
  const renderCategory = vehicle_body_type || 'van'

  // Create initial record
  await admin.from('mockup_results').insert({
    id: mockupId,
    org_id: orgId,
    project_id: project_id || null,
    template_id: template_id || null,
    status: 'processing',
    current_step: 1,
    step_name: 'Starting…',
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
      brand_colors,
      company_name,
      industry,
      style_notes,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      vehicle_body_type,
      wrap_coverage,
      vehicle_sqft,
    }),
  })

  try {
    // ── Step 1: Claude brand analysis → ideogram_prompt ──────────────────────
    await admin.from('mockup_results').update({ current_step: 1, step_name: 'Analyzing brand…' }).eq('id', mockupId)

    const vehicleDesc = [vehicle_year, vehicle_make, vehicle_model].filter(Boolean).join(' ')
    const coverageDesc = wrap_coverage === 'full' ? 'full vehicle wrap' :
      wrap_coverage === 'three_quarter' ? '3/4 vehicle wrap' :
      wrap_coverage === 'half' ? 'half wrap (sides only)' : 'partial wrap'

    let ideogramPrompt = `Professional commercial vehicle wrap graphic design for ${company_name || 'a business'} in ${industry || 'general'} industry. ${vehicleDesc ? `Vehicle: ${vehicleDesc}.` : ''} Coverage: ${coverageDesc}. ${brand_colors.length ? `Color palette: ${brand_colors.join(', ')}.` : ''} ${style_notes || ''}. Dynamic geometric shapes, color blocking, bold graphic elements. flat lay vehicle wrap graphic design, no text no letters no words, pure graphic artwork only, commercial wrap design, high contrast`
    let brandAnalysis: Record<string, unknown> | null = null

    try {
      const content: Anthropic.MessageParam['content'] = []

      if (logo_url) {
        content.push({ type: 'image', source: { type: 'url', url: logo_url } })
      }

      content.push({
        type: 'text',
        text: `Analyze this brand for a commercial vehicle wrap design. Return JSON only:
{
  "primary_color": "hex",
  "secondary_color": "hex",
  "accent_color": "hex",
  "style": "bold_aggressive|clean_professional|luxury_premium|fun_playful|industrial_tough",
  "industry_keywords": ["string"],
  "design_complexity": 1,
  "ideogram_prompt": "string under 250 words — describes flat wrap artwork with NO TEXT, focus on color blocking, graphic shapes, background patterns, visual flow. End with: flat lay vehicle wrap graphic design, no text no letters no words, pure graphic artwork only, commercial wrap design, high contrast"
}

COMPANY: ${company_name || 'Business'}
INDUSTRY: ${industry || 'General'}
VEHICLE: ${vehicleDesc || 'Commercial vehicle'}
VEHICLE TYPE: ${vehicle_body_type || 'van'}
WRAP COVERAGE: ${coverageDesc}
BRAND COLORS: ${brand_colors.join(', ')}
STYLE NOTES: ${style_notes || 'Professional'}
${logo_url ? 'LOGO: See image above' : 'NO LOGO PROVIDED'}`,
      })

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content }],
      })

      const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        brandAnalysis = JSON.parse(jsonMatch[0])
        if (brandAnalysis && typeof brandAnalysis.ideogram_prompt === 'string') {
          ideogramPrompt = brandAnalysis.ideogram_prompt
        }
      }
    } catch (claudeErr: unknown) {
      const msg = claudeErr instanceof Error ? claudeErr.message : String(claudeErr)
      await logHealth(orgId, 'mockup-start-claude', `Brand analysis error: ${msg}`)
    }

    await admin.from('mockup_results').update({
      brand_analysis: brandAnalysis,
    }).eq('id', mockupId)

    // ── Step 2: Generate artwork (Ideogram) ────────────────────────────────────
    await admin.from('mockup_results').update({ current_step: 2, step_name: 'Creating custom artwork…' }).eq('id', mockupId)
    const { artwork_url: artworkUrl } = await generateArtwork({
      mockup_id: mockupId,
      ideogram_prompt: ideogramPrompt,
      org_id: orgId,
    })

    // ── Step 3: Composite text ─────────────────────────────────────────────────
    await admin.from('mockup_results').update({ current_step: 3, step_name: 'Adding your information…' }).eq('id', mockupId)
    const { composited_url: compositedUrl } = await compositeText({
      mockup_id: mockupId,
      template_id: template_id || null,
      artwork_url: artworkUrl,
      company_name,
      tagline,
      phone,
      website,
      font_choice,
      brand_colors,
      org_id: orgId,
    })

    // ── Step 4: Polish (Flux img2img) ──────────────────────────────────────────
    await admin.from('mockup_results').update({ current_step: 4, step_name: 'Applying photorealism…' }).eq('id', mockupId)
    const { concept_url: conceptUrl } = await polishMockup({
      mockup_id: mockupId,
      composited_url: compositedUrl,
      org_id: orgId,
    })

    // ── Step 5: Render on vehicle (Flux img2img) ───────────────────────────────
    await admin.from('mockup_results').update({ current_step: 5, step_name: 'Rendering on vehicle…' }).eq('id', mockupId)
    const renderUrl = await renderOnVehicle(conceptUrl, renderCategory, vehicle_year, vehicle_make, vehicle_model)

    // ── Done ───────────────────────────────────────────────────────────────────
    await admin.from('mockup_results').update({
      status: 'concept_ready',
      current_step: 6,
      step_name: 'Concept ready for approval',
      final_mockup_url: renderUrl || conceptUrl,
      concept_url: conceptUrl,
    }).eq('id', mockupId)

    return NextResponse.json({
      mockup_id: mockupId,
      concept_url: conceptUrl,
      render_url: renderUrl,
      flat_design_url: artworkUrl,
      status: 'concept_ready',
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
