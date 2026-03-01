import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'
import Anthropic from '@anthropic-ai/sdk'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getReplicateToken(): Promise<string | null> {
  if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const admin = getSupabaseAdmin()
    const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) return null
    const { data: integration } = await admin
      .from('integrations').select('config')
      .eq('org_id', profile.org_id).eq('integration_id', 'replicate').eq('enabled', true).single()
    return integration?.config?.api_token || null
  } catch { return null }
}

async function getOrgId(): Promise<string> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return ORG_ID
    const admin = getSupabaseAdmin()
    const { data: profile } = await admin.from('profiles').select('org_id, id').eq('id', user.id).single()
    return profile?.org_id || ORG_ID
  } catch { return ORG_ID }
}

async function getUserId(): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
  } catch { return null }
}

async function storeImageInSupabase(imageUrl: string, orgId: string): Promise<string> {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return imageUrl
    const buffer = await res.arrayBuffer()
    const admin = getSupabaseAdmin()
    const fileName = `mockup-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`
    const path = `${orgId}/mockups/${fileName}`
    const { error } = await admin.storage.from('project-files')
      .upload(path, Buffer.from(buffer), { contentType: 'image/webp', upsert: false })
    if (error) return imageUrl
    const { data: { publicUrl } } = admin.storage.from('project-files').getPublicUrl(path)
    return publicUrl
  } catch { return imageUrl }
}

// Poll replicate prediction until done
async function pollPrediction(token: string, predictionId: string, maxWaitMs = 120000): Promise<string | null> {
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

// ── ANGLE / VIEW MAPS ─────────────────────────────────────────────────────────

const VIEW_ANGLE_PROMPTS: Record<string, string> = {
  'Driver Side':     'driver side profile view, perfectly flat lateral perspective',
  'Passenger Side':  'passenger side profile view, perfectly flat lateral perspective',
  'Front 3/4':       'three quarter front driver side angle',
  'Rear 3/4':        'three quarter rear driver side angle',
  'Full Front':      'straight on front view, centered',
  'Full Rear':       'straight on rear view, centered',
}

// ── LAYER 2: Brand Analysis ───────────────────────────────────────────────────

async function analyzeBrand(params: {
  websiteUrl?: string
  companyName?: string
  industry?: string
  brandColors?: string[]
  logoBase64?: string
}): Promise<{ colors: string[]; keywords: string[]; styleNotes: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { colors: params.brandColors || [], keywords: [], styleNotes: '' }

  try {
    const anthropic = new Anthropic({ apiKey })
    const content: Anthropic.ContentBlockParam[] = []

    let prompt = `You are an expert brand analyst for a vehicle wrap company. `
    prompt += `Analyze the brand information provided and return ONLY valid JSON:\n`
    prompt += `{ "colors": ["#hex1","#hex2","#hex3"], "keywords": ["bold","professional","dynamic"], "styleNotes": "Brief design direction" }\n\n`
    prompt += `Company: ${params.companyName || 'Unknown'}\n`
    prompt += `Industry: ${params.industry || 'Unknown'}\n`
    if (params.brandColors?.length) prompt += `Known brand colors: ${params.brandColors.join(', ')}\n`
    if (params.websiteUrl) prompt += `Website: ${params.websiteUrl}\n`
    prompt += `Extract dominant colors, style keywords, and design direction. Return ONLY JSON.`

    content.push({ type: 'text', text: prompt })

    if (params.logoBase64) {
      const mimeType = params.logoBase64.startsWith('data:')
        ? (params.logoBase64.split(';')[0].split(':')[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp')
        : 'image/png'
      const base64Data = params.logoBase64.includes(',') ? params.logoBase64.split(',')[1] : params.logoBase64
      content.push({ type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      return {
        colors: parsed.colors || params.brandColors || [],
        keywords: parsed.keywords || [],
        styleNotes: parsed.styleNotes || '',
      }
    }
  } catch (e) {
    console.error('[generate-mockup] brand analysis error:', e)
  }
  return { colors: params.brandColors || [], keywords: [], styleNotes: '' }
}

// ── LAYER 3: Prompt Construction ──────────────────────────────────────────────

function buildFluxPrompt(params: {
  year: string
  make: string
  model: string
  vehicleColor: string
  viewAngle: string
  wrapStyle: string
  companyName: string
  industry: string
  colorScheme: string
  specificElements: string
  brandColors: string[]
  brandKeywords: string[]
  brandStyleNotes: string
}): string {
  const {
    year, make, model, vehicleColor, viewAngle, wrapStyle,
    companyName, industry, colorScheme, specificElements,
    brandColors, brandKeywords, brandStyleNotes,
  } = params

  const vehicleDesc = [year, make, model].filter(Boolean).join(' ') || 'commercial van'
  const angleDesc = VIEW_ANGLE_PROMPTS[viewAngle] || VIEW_ANGLE_PROMPTS['Driver Side']

  // Color description — prefer brand colors over generic scheme
  const colorList = brandColors.length > 0
    ? brandColors.slice(0, 4).join(' and ')
    : colorScheme || 'professional brand colors'

  // Style modifiers
  const styleMap: Record<string, string> = {
    'Full Color Change': 'full body color change vinyl wrap, solid color, seamless coverage',
    'Company Branding / Logo': 'commercial vehicle branding, bold graphic elements, professional business identity',
    'Racing / Sport Stripes': 'racing stripes, speed lines, dynamic sport graphics',
    'Geometric / Abstract': 'geometric pattern wrap, abstract graphic design, angular shapes',
    'Photography / Scene': 'photographic scene wrap, full coverage scene imagery',
    'Gradient / Color Fade': 'gradient color fade, smooth color transition, ombre effect',
    'Minimalist / Clean': 'minimalist clean design, subtle branding, understated elegance',
    'Bold & Aggressive': 'bold aggressive graphics, high contrast, dramatic visual impact',
  }
  const styleDesc = styleMap[wrapStyle] || 'professional vehicle wrap design'

  // Build prompt — CRITICAL: no text/words rendered in image
  let prompt = `photorealistic professional vehicle wrap mockup, ${vehicleDesc}, ${angleDesc}`
  prompt += `, ${styleDesc}`
  prompt += `, ${colorList} color scheme`
  if (brandKeywords.length) prompt += `, ${brandKeywords.slice(0, 3).join(', ')} aesthetic`
  if (brandStyleNotes) prompt += `, ${brandStyleNotes}`
  if (specificElements) prompt += `, ${specificElements}`
  if (companyName && industry) prompt += `, suitable for ${industry} industry`
  prompt += `, ${vehicleColor || 'white'} base vehicle`
  prompt += `, vinyl wrap covering vehicle body, realistic material texture with slight gloss sheen`
  prompt += `, professional automotive photography, studio environment, clean white background`
  prompt += `, ultra sharp, 8k resolution, commercial photography quality`
  // CRITICAL: No text
  prompt += `. No text, no letters, no words, no numbers, no logos, no typography in image.`

  return prompt
}

// ── LAYER 4: Flux Pro Generation ──────────────────────────────────────────────

async function generateWithFluxPro(token: string, prompt: string): Promise<{ predictionId: string } | { imageUrl: string }> {
  const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: '16:9',
        output_format: 'webp',
        output_quality: 95,
        safety_tolerance: 2,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Replicate error: ${err}`)
  }

  const prediction = await res.json()

  // If already done (synchronous mode)
  if (prediction.status === 'succeeded') {
    const out = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    if (typeof out === 'string') return { imageUrl: out }
  }

  return { predictionId: prediction.id }
}

// ── POST: Start generation ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      year = '',
      make = '',
      model = '',
      vehicleColor = 'White',
      viewAngle = 'Driver Side',
      wrapStyle = 'Company Branding / Logo',
      websiteUrl = '',
      companyName = '',
      brandColors = [],
      industry = '',
      logoBase64 = '',
      colorScheme = '',
      specificElements = '',
      projectId = null,
      customerId = null,
    } = body

    if (!year && !make) {
      return NextResponse.json({ error: 'Vehicle year and make are required' }, { status: 400 })
    }

    const replicateToken = await getReplicateToken()
    if (!replicateToken) {
      return NextResponse.json({ error: 'Replicate API not configured — add REPLICATE_API_TOKEN to environment' }, { status: 503 })
    }

    const orgId = await getOrgId()
    const userId = await getUserId()

    // ── LAYER 2: Brand Analysis ──
    const brandAnalysis = await analyzeBrand({
      websiteUrl, companyName, industry,
      brandColors: Array.isArray(brandColors) ? brandColors : [],
      logoBase64: logoBase64 || undefined,
    })

    // ── LAYER 3: Prompt Construction ──
    const prompt = buildFluxPrompt({
      year, make, model, vehicleColor, viewAngle, wrapStyle,
      companyName, industry, colorScheme, specificElements,
      brandColors: brandAnalysis.colors.length ? brandAnalysis.colors : (Array.isArray(brandColors) ? brandColors : []),
      brandKeywords: brandAnalysis.keywords,
      brandStyleNotes: brandAnalysis.styleNotes,
    })

    // ── LAYER 4: Generate ──
    const result = await generateWithFluxPro(replicateToken, prompt)

    // Store brand data for history record (created when done)
    const brandData = {
      companyName, industry, websiteUrl,
      colors: brandAnalysis.colors,
      keywords: brandAnalysis.keywords,
      styleNotes: brandAnalysis.styleNotes,
      wrapStyle, viewAngle,
    }

    if ('imageUrl' in result) {
      // Completed synchronously — store and return
      const storedUrl = await storeImageInSupabase(result.imageUrl, orgId)

      const admin = getSupabaseAdmin()
      const { data: record } = await admin.from('mockup_history').insert({
        org_id: orgId,
        project_id: projectId || null,
        customer_id: customerId || null,
        vehicle_year: year,
        vehicle_make: make,
        vehicle_model: model,
        vehicle_color: vehicleColor,
        view_angle: viewAngle,
        wrap_style: wrapStyle,
        brand_data: brandData,
        prompt_used: prompt,
        result_url: storedUrl,
        design_score: 8,
        brand_analysis: brandAnalysis,
        generated_by: userId,
      }).select('id').single()

      return NextResponse.json({
        status: 'succeeded',
        imageUrl: storedUrl,
        prompt,
        brandAnalysis,
        designScore: 8,
        historyId: record?.id || null,
      })
    }

    // Async — return predictionId for polling
    return NextResponse.json({
      status: 'starting',
      predictionId: result.predictionId,
      prompt,
      brandAnalysis,
      brandData,
      orgId,
      projectId,
      customerId,
      userId,
      vehicleYear: year,
      vehicleMake: make,
      vehicleModel: model,
      vehicleColor,
      viewAngle,
      wrapStyle,
    })
  } catch (err) {
    console.error('[generate-mockup] POST error:', err)
    return NextResponse.json({ error: String(err) || 'Mockup generation failed' }, { status: 500 })
  }
}

// ── GET: Poll prediction status ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const predictionId = searchParams.get('id')

  if (!predictionId) {
    return NextResponse.json({ error: 'Prediction ID required' }, { status: 400 })
  }

  const replicateToken = await getReplicateToken()
  if (!replicateToken) {
    return NextResponse.json({ error: 'Replicate API not configured' }, { status: 503 })
  }

  const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: { Authorization: `Bearer ${replicateToken}` },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }

  const prediction = await res.json()

  if (prediction.status === 'succeeded') {
    const raw = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    const imageUrl = typeof raw === 'string' ? raw : null

    if (imageUrl) {
      // Store in Supabase + save history record
      const orgId = await getOrgId()
      const storedUrl = await storeImageInSupabase(imageUrl, orgId)

      // Try to get context from query params for history
      const projectId = searchParams.get('projectId')
      const customerId = searchParams.get('customerId')
      const userId = searchParams.get('userId')
      const brandDataStr = searchParams.get('brandData')
      let brandData: Record<string, unknown> = {}
      try { if (brandDataStr) brandData = JSON.parse(decodeURIComponent(brandDataStr)) } catch { /* ignore */ }

      try {
        const admin = getSupabaseAdmin()
        await admin.from('mockup_history').insert({
          org_id: orgId,
          project_id: projectId || null,
          customer_id: customerId || null,
          vehicle_year: searchParams.get('vehicleYear') || null,
          vehicle_make: searchParams.get('vehicleMake') || null,
          vehicle_model: searchParams.get('vehicleModel') || null,
          vehicle_color: searchParams.get('vehicleColor') || null,
          view_angle: searchParams.get('viewAngle') || null,
          wrap_style: searchParams.get('wrapStyle') || null,
          brand_data: brandData,
          prompt_used: searchParams.get('prompt') || null,
          result_url: storedUrl,
          design_score: 8,
          generated_by: userId || null,
        })
      } catch (e) {
        console.error('[generate-mockup] history save error:', e)
      }

      return NextResponse.json({ status: 'succeeded', imageUrl: storedUrl })
    }
  }

  return NextResponse.json({
    status: prediction.status,
    imageUrl: null,
    error: prediction.error || null,
  })
}
