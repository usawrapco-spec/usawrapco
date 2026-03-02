import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import Anthropic from '@anthropic-ai/sdk'
import { randomUUID } from 'crypto'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function logHealth(orgId: string, service: string, message: string) {
  try {
    await getSupabaseAdmin()
      .from('system_health')
      .insert({ org_id: orgId, service, error_message: message, severity: 'error' })
  } catch { /* silent */ }
}

async function callRoute(path: string, body: object): Promise<any> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `${path} failed`)
  return data
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

  if (!template_id) return NextResponse.json({ error: 'template_id required' }, { status: 400 })

  const mockupId = randomUUID()

  // Create initial record
  await admin.from('mockup_results').insert({
    id: mockupId,
    org_id: orgId,
    project_id: project_id || null,
    template_id,
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
    input_prompt: JSON.stringify({ brand_colors, company_name, industry, style_notes }),
  })

  try {
    // ── Step 1: Claude brand analysis → ideogram_prompt ──────────────────────
    await admin.from('mockup_results').update({ current_step: 1, step_name: 'Analyzing brand…' }).eq('id', mockupId)

    let ideogramPrompt = `Professional commercial vehicle wrap design for ${company_name || 'a business'} in ${industry || 'general'} industry. ${brand_colors.length ? `Color palette: ${brand_colors.join(', ')}.` : ''} ${style_notes || ''}. Dynamic geometric shapes, color blocking, bold graphic elements. flat lay vehicle wrap graphic design, no text no letters no words, pure graphic artwork only, commercial wrap design, high contrast`
    let brandAnalysis: any = null

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
        if (brandAnalysis.ideogram_prompt) {
          ideogramPrompt = brandAnalysis.ideogram_prompt
        }
      }
    } catch (claudeErr: any) {
      await logHealth(orgId, 'mockup-start-claude', `Brand analysis error: ${claudeErr.message}`)
    }

    await admin.from('mockup_results').update({
      brand_analysis: brandAnalysis,
    }).eq('id', mockupId)

    // ── Step 2: Generate artwork (Ideogram) ────────────────────────────────────
    const artResult = await callRoute('/api/mockup/generate-artwork', {
      mockup_id: mockupId,
      ideogram_prompt: ideogramPrompt,
      org_id: orgId,
    })
    const artworkUrl = artResult.artwork_url

    // ── Step 3: Composite text ─────────────────────────────────────────────────
    const compResult = await callRoute('/api/mockup/composite-text', {
      mockup_id: mockupId,
      template_id,
      artwork_url: artworkUrl,
      company_name,
      tagline,
      phone,
      website,
      font_choice,
      brand_colors,
      org_id: orgId,
    })
    const compositedUrl = compResult.composited_url

    // ── Step 4: Polish (Flux img2img) ──────────────────────────────────────────
    const polishResult = await callRoute('/api/mockup/polish', {
      mockup_id: mockupId,
      composited_url: compositedUrl,
      org_id: orgId,
    })
    const conceptUrl = polishResult.concept_url

    // ── Done: concept ready for approval ──────────────────────────────────────
    await admin.from('mockup_results').update({
      status: 'concept_ready',
      current_step: 4,
      step_name: 'Concept ready for approval',
    }).eq('id', mockupId)

    return NextResponse.json({
      mockup_id: mockupId,
      concept_url: conceptUrl,
      flat_design_url: artworkUrl,
      status: 'concept_ready',
    })
  } catch (err: any) {
    await logHealth(orgId, 'mockup-start', `Pipeline failed: ${err.message}`)
    await admin.from('mockup_results').update({
      status: 'failed',
      error_message: err.message,
    }).eq('id', mockupId)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
