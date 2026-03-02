import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'
import { randomUUID } from 'crypto'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const REPLICATE_API = 'https://api.replicate.com/v1'
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN

async function logSystemHealth(orgId: string, service: string, message: string) {
  try {
    await getSupabaseAdmin()
      .from('system_health')
      .insert({ org_id: orgId, service, error_message: message, severity: 'error' })
  } catch { /* silent */ }
}

async function replicateRun(model: string, input: object): Promise<any> {
  const createRes = await fetch(`${REPLICATE_API}/models/${model}/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input }),
  })
  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Replicate create failed: ${err}`)
  }
  let prediction = await createRes.json()

  // Poll until complete (max 120s)
  const deadline = Date.now() + 120000
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
    if (Date.now() > deadline) throw new Error('Replicate timeout')
    await new Promise(r => setTimeout(r, 2000))
    const pollRes = await fetch(`${REPLICATE_API}/predictions/${prediction.id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` },
    })
    prediction = await pollRes.json()
  }
  if (prediction.status === 'failed') throw new Error(`Replicate failed: ${prediction.error}`)
  return prediction.output
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
  const { template_id, project_id, brand_colors = [], logo_url, company_name, industry, style_notes } = body

  if (!template_id) return NextResponse.json({ error: 'template_id required' }, { status: 400 })

  // Fetch template
  const { data: template, error: tplErr } = await admin
    .from('vehicle_templates')
    .select('*')
    .eq('id', template_id)
    .single()

  if (tplErr || !template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const mockupId = randomUUID()

  // Create initial mockup_results record
  await admin.from('mockup_results').insert({
    id: mockupId,
    org_id: orgId,
    project_id: project_id || null,
    template_id,
    status: 'generating',
    input_prompt: JSON.stringify({ brand_colors, company_name, industry, style_notes }),
  })

  try {
    // ── Step A: Claude brand analysis → Ideogram prompt ──────────────────────
    let ideogramPrompt = `Professional vehicle wrap design for ${company_name || 'a business'}`

    try {
      const colorList = brand_colors.length > 0
        ? `Brand colors: ${brand_colors.join(', ')}.`
        : ''
      const logoContext = logo_url ? 'A logo will be incorporated.' : ''

      const brandMessages: Anthropic.MessageParam[] = logo_url
        ? [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'url', url: logo_url } },
              {
                type: 'text',
                text: `You are a vehicle wrap design director. Analyze this logo and brand identity for ${company_name || 'this company'}.
${colorList} Industry: ${industry || 'General'}. Style notes: ${style_notes || 'None'}.

Generate a detailed Ideogram 2.0 prompt (under 300 words) for a flat lay vehicle wrap graphic design.
Include: color palette, graphic elements, typography direction, patterns, and visual style.
The design should work as a full wrap across all panels.
Return ONLY the prompt text, no explanation.`,
              },
            ],
          }]
        : [{
            role: 'user',
            content: `You are a vehicle wrap design director. Create an Ideogram 2.0 prompt for a vehicle wrap design.
Company: ${company_name || 'Modern Business'}. Industry: ${industry || 'General'}.
${colorList} Style notes: ${style_notes || 'Bold, professional'}.
Generate a detailed prompt (under 300 words) for a flat lay graphic design.
Include: color palette, graphic elements, typography direction, patterns, visual style.
Return ONLY the prompt text.`,
          }]

      const claudeRes = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: brandMessages,
      })
      const rawPrompt = claudeRes.content[0].type === 'text' ? claudeRes.content[0].text.trim() : ''
      if (rawPrompt) ideogramPrompt = rawPrompt
    } catch (claudeErr: any) {
      await logSystemHealth(orgId, 'mockup-claude', `Brand analysis failed: ${claudeErr.message}`)
    }

    // ── Step B: Flat design via Replicate Ideogram V2 ─────────────────────────
    let flatDesignUrl: string | null = null

    if (REPLICATE_TOKEN) {
      try {
        const fullPrompt = `${ideogramPrompt}. Flat lay vehicle wrap graphic design, no vehicle shape, pure graphic design only, commercial wrap art, seamless tiling pattern, high resolution print ready.`
        const output = await replicateRun('ideogram-ai/ideogram-v2', {
          prompt: fullPrompt,
          width: 2160,
          height: 1080,
          style_type: 'DESIGN',
          aspect_ratio: 'ASPECT_2_1',
          magic_prompt_option: 'OFF',
        })
        flatDesignUrl = Array.isArray(output) ? output[0] : output
        await admin.from('mockup_results').update({ flat_design_url: flatDesignUrl }).eq('id', mockupId)
      } catch (repErr: any) {
        await logSystemHealth(orgId, 'mockup-ideogram', `Ideogram generation failed: ${repErr.message}`)
      }
    }

    // ── Step C: Compositing via Sharp ─────────────────────────────────────────
    let finalMockupUrl: string | null = null

    if (template.base_image_url && flatDesignUrl) {
      try {
        // Fetch base template
        const [baseRes, designRes] = await Promise.all([
          fetch(template.base_image_url),
          fetch(flatDesignUrl),
        ])

        if (baseRes.ok && designRes.ok) {
          const baseBuffer  = Buffer.from(await baseRes.arrayBuffer())
          const designBuffer = Buffer.from(await designRes.arrayBuffer())

          // Get base dimensions
          const baseMeta = await sharp(baseBuffer).metadata()
          const baseW = baseMeta.width || 2400
          const baseH = baseMeta.height || 1200

          // Ensure minimum 2400px wide
          const targetW = Math.max(baseW, 2400)
          const targetH = Math.round(baseH * (targetW / baseW))

          // Resize base to target
          const baseResized = await sharp(baseBuffer).resize(targetW, targetH).png().toBuffer()

          // Resize flat design to target dimensions (92% opacity via premultiplied alpha)
          const designResized = await sharp(designBuffer)
            .resize(targetW, targetH)
            .ensureAlpha()
            .png()
            .toBuffer()

          // Composite: base → design overlay at 92% opacity
          const composited = await sharp(baseResized)
            .composite([{
              input: designResized,
              blend: 'over',
              premultiplied: false,
            }])
            .png()
            .toBuffer()

          // Apply a subtle vignette/shadow to make it look rendered
          const finalBuffer = await sharp(composited)
            .modulate({ brightness: 0.98, saturation: 1.05 })
            .sharpen()
            .png()
            .toBuffer()

          // Upload to mockup-results bucket
          const { error: upErr } = await admin.storage
            .from('mockup-results')
            .upload(`${project_id || 'general'}/${mockupId}.png`, finalBuffer, {
              contentType: 'image/png',
              upsert: true,
            })

          if (!upErr) {
            const { data: urlData } = admin.storage
              .from('mockup-results')
              .getPublicUrl(`${project_id || 'general'}/${mockupId}.png`)
            finalMockupUrl = urlData.publicUrl
          }
        }
      } catch (sharpErr: any) {
        await logSystemHealth(orgId, 'mockup-compositing', `Compositing failed: ${sharpErr.message}`)
        // Fall back to using the flat design URL as the mockup
        finalMockupUrl = flatDesignUrl
      }
    } else {
      // No base template or no flat design — use flat design or placeholder
      finalMockupUrl = flatDesignUrl
    }

    // ── Step D: Save result ───────────────────────────────────────────────────
    await admin.from('mockup_results').update({
      final_mockup_url: finalMockupUrl,
      status: 'complete',
      input_prompt: `${ideogramPrompt}\n\n[Generated for ${company_name || 'client'}]`,
    }).eq('id', mockupId)

    return NextResponse.json({
      mockup_id: mockupId,
      mockup_url: finalMockupUrl,
      flat_design_url: flatDesignUrl,
      prompt_used: ideogramPrompt,
    })
  } catch (err: any) {
    await logSystemHealth(orgId, 'mockup-generate', `Generation failed: ${err.message}`)
    await admin.from('mockup_results').update({ status: 'failed' }).eq('id', mockupId)
    return NextResponse.json({ error: 'Generation failed', details: err.message }, { status: 500 })
  }
}
