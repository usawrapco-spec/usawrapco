import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

async function getReplicateToken(): Promise<string | null> {
  if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN
  try {
    const admin = getSupabaseAdmin()
    const { data } = await admin
      .from('integrations')
      .select('config')
      .eq('org_id', ORG_ID)
      .eq('integration_id', 'replicate')
      .eq('enabled', true)
      .single()
    return data?.config?.api_token || null
  } catch { return null }
}

async function buildPrompts(params: {
  vehicleYear: string
  vehicleMake: string
  vehicleModel: string
  wrapCoverage: string
  brandColors: string[]
  stylePreference: string
  businessDescription: string
  logoUrl: string
}): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const colorStr = params.brandColors.length
    ? params.brandColors.join(', ')
    : 'bold blue and white'

  const coverageLabel: Record<string, string> = {
    decal: 'partial decal wrap (doors/sides only)',
    quarter: 'quarter wrap (rear quarter panels)',
    half: 'half wrap (rear half of vehicle)',
    full: 'full wrap (entire vehicle)',
  }

  if (!apiKey) {
    // Fallback prompt if no Claude key
    const base = `Professional vehicle wrap mockup, ${params.vehicleYear} ${params.vehicleMake} ${params.vehicleModel}, ${coverageLabel[params.wrapCoverage] || 'full wrap'}, brand colors ${colorStr}, ${params.stylePreference} design style, photorealistic render, studio lighting, white background, 3/4 front angle, high quality`
    return [base, base.replace('3/4 front', 'side view'), base.replace('3/4 front', 'rear 3/4')]
  }

  const anthropic = new Anthropic({ apiKey })
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Generate 3 vehicle wrap mockup image prompts for Stable Diffusion / Flux.

Vehicle: ${params.vehicleYear} ${params.vehicleMake} ${params.vehicleModel}
Coverage: ${coverageLabel[params.wrapCoverage] || 'full wrap'}
Brand Colors: ${colorStr}
Style: ${params.stylePreference || 'Modern & Clean'}
Business: ${params.businessDescription || ''}

Each prompt must:
- Describe photorealistic professional vehicle wrap mockup photography
- Studio lighting, clean white/gray gradient background
- Show the vehicle from a slightly different angle each (3/4 front, side, 3/4 rear)
- Apply the exact brand colors prominently on the wrap
- Look like a professional commercial vehicle wrap
- Include "high quality, 8K, sharp focus, commercial photography" at the end

Return ONLY a JSON array of 3 strings. No markdown, no explanation.`,
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  try {
    const arr = JSON.parse(text.trim())
    if (Array.isArray(arr) && arr.length >= 2) return arr.slice(0, 3)
  } catch { /* fall through */ }

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]).slice(0, 3) } catch { /* fall through */ }
  }

  const fallback = `Photorealistic ${params.vehicleYear} ${params.vehicleMake} ${params.vehicleModel} vehicle wrap mockup, ${colorStr} brand colors, ${params.stylePreference} style, professional commercial vehicle, studio lighting, white background, 3/4 front angle, sharp focus, 8K`
  return [fallback, fallback, fallback]
}

export async function POST(req: NextRequest) {
  try {
    const { session_token, vehicle_year, vehicle_make, vehicle_model, wrap_coverage, brand_colors, style_preference, business_description, logo_url } = await req.json()

    if (!session_token) return NextResponse.json({ error: 'session_token required' }, { status: 400 })

    const replicateToken = await getReplicateToken()
    if (!replicateToken) {
      return NextResponse.json({ error: 'Image generation not configured' }, { status: 503 })
    }

    // Build prompts via Claude
    const prompts = await buildPrompts({
      vehicleYear: vehicle_year || '',
      vehicleMake: vehicle_make || '',
      vehicleModel: vehicle_model || '',
      wrapCoverage: wrap_coverage || 'full',
      brandColors: brand_colors || [],
      stylePreference: style_preference || 'Modern & Clean',
      businessDescription: business_description || '',
      logoUrl: logo_url || '',
    })

    // Launch predictions — use flux-schnell for speed (low-res teaser)
    const predictions = await Promise.all(
      prompts.slice(0, 3).map(async (prompt: string) => {
        try {
          const res = await fetch(
            'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${replicateToken}`,
                'Content-Type': 'application/json',
                Prefer: 'wait',
              },
              body: JSON.stringify({
                input: {
                  prompt,
                  width: 768,
                  height: 512,
                  num_outputs: 1,
                  num_inference_steps: 4,
                  go_fast: true,
                },
              }),
            }
          )
          if (!res.ok) return { id: null, status: 'failed' }
          const p = await res.json()
          return { id: p.id, status: p.status, output: p.output }
        } catch { return { id: null, status: 'failed' } }
      })
    )

    // Save prediction IDs to session
    const admin = getSupabaseAdmin()
    const predIds = predictions.map(p => p.id).filter(Boolean)
    await admin.from('wrap_funnel_sessions')
      .update({
        mockup_prompts: prompts,
        prediction_ids: predIds,
        step_reached: 3,
        updated_at: new Date().toISOString(),
      })
      .eq('session_token', session_token)

    return NextResponse.json({
      ok: true,
      predictions: predictions.map(p => ({ id: p.id, status: p.status, output: p.output })),
    })
  } catch (err: any) {
    console.error('[wrap-funnel/generate]', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
