import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Support both old interface (projectId, imageUrls, brandName, vehicleType)
    // and new interface (logoBase64, brandMaterials)
    const {
      projectId,
      imageUrls,
      brandName,
      vehicleType,
      logoBase64,
      brandMaterials,
    } = body

    const hasNewInterface = !!logoBase64
    const hasOldInterface = imageUrls && imageUrls.length > 0

    if (!hasNewInterface && !hasOldInterface) {
      return Response.json({ error: 'No images provided' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      // Return a helpful placeholder instead of crashing
      return Response.json({
        analysis: null,
        colors: [{ hex: '#4f7fff', name: 'Brand Blue', percentage: 60 }, { hex: '#ffffff', name: 'White', percentage: 30 }, { hex: '#000000', name: 'Black', percentage: 10 }],
        style: 'professional',
        complexityScore: 5,
        suggestedApproach: 'full wrap',
        fontSuggestions: ['Helvetica Neue', 'Montserrat', 'Bebas Neue'],
        message: 'AI brand analysis not configured — add ANTHROPIC_API_KEY to env',
      })
    }

    const anthropic = getAnthropic()

    if (hasNewInterface) {
      // New interface: logoBase64 + optional brandMaterials array
      const content: Anthropic.ContentBlockParam[] = [
        {
          type: 'text',
          text: `You are an expert brand analyst for a vehicle wrap company. Analyze this logo and brand materials.

Return ONLY valid JSON in this exact format:
{
  "colors": [
    {"hex": "#4f7fff", "name": "Brand Blue", "percentage": 60},
    {"hex": "#ffffff", "name": "White", "percentage": 30},
    {"hex": "#000000", "name": "Black", "percentage": 10}
  ],
  "style": "professional|playful|luxury|bold|minimal|corporate|industrial",
  "complexityScore": 7,
  "suggestedApproach": "full wrap|3/4 wrap|half wrap|partial wrap|logo only",
  "fontSuggestions": ["Montserrat", "Bebas Neue", "Helvetica Neue"],
  "brandPersonality": "A 1-2 sentence description of the brand feel",
  "wrapNotes": "Specific notes for the wrap designer"
}
complexityScore is 1-10 (1=simple text logo, 10=intricate multi-layer). Return ONLY the JSON.`,
        },
      ]

      // Add primary logo
      const mimeType = logoBase64.startsWith('data:') ? (logoBase64.split(';')[0].split(':')[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp') : 'image/jpeg'
      const base64Data = logoBase64.includes(',') ? logoBase64.split(',')[1] : logoBase64
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mimeType, data: base64Data },
      })

      // Add additional brand materials (up to 2 more)
      if (Array.isArray(brandMaterials)) {
        for (const mat of brandMaterials.slice(0, 2)) {
          try {
            const matMime = mat.startsWith('data:') ? (mat.split(';')[0].split(':')[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp') : 'image/jpeg'
            const matData = mat.includes(',') ? mat.split(',')[1] : mat
            content.push({ type: 'image', source: { type: 'base64', media_type: matMime, data: matData } })
          } catch {}
        }
      }

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
      let parsed: Record<string, unknown> = {}
      try {
        const match = text.match(/\{[\s\S]*\}/)
        if (match) parsed = JSON.parse(match[0])
      } catch {}

      return Response.json({
        colors: parsed.colors || [],
        style: parsed.style || 'professional',
        complexityScore: parsed.complexityScore || 5,
        suggestedApproach: parsed.suggestedApproach || 'full wrap',
        fontSuggestions: parsed.fontSuggestions || [],
        brandPersonality: parsed.brandPersonality || '',
        wrapNotes: parsed.wrapNotes || '',
        analysis: parsed,
      })
    }

    // Old interface: imageUrls array
    const content: Anthropic.ContentBlockParam[] = [
      {
        type: 'text',
        text: `You are a professional vehicle wrap designer reviewing brand materials for a new wrap project.

Brand: ${brandName || 'Unknown'}
Vehicle: ${vehicleType || 'Unknown'}

Analyze the provided brand images and return a JSON response with:
{
  "colors": ["#hex1", "#hex2", "#hex3"],
  "color_names": ["Blue", "White", "Gold"],
  "logo_quality": "high|medium|low",
  "design_complexity_score": 7,
  "style_recommendations": "Brief style suggestions for the wrap design",
  "suggested_wrap_approach": "full|3quarter|half|partial",
  "wrap_complexity": "simple|moderate|complex",
  "recommended_coverage": "full|3quarter|half|partial",
  "font_style": "sans-serif|serif|script|display|unknown",
  "brand_personality": "professional|playful|luxury|bold|minimal|corporate",
  "ai_tags": ["tag1", "tag2"],
  "brand_notes": "Any special brand considerations"
}
The design_complexity_score should be 1-10 where 1 is simple text/logo and 10 is intricate multi-layer design.
Return ONLY valid JSON.`,
      },
    ]

    for (const url of (imageUrls as string[]).slice(0, 3)) {
      try {
        const imgRes = await fetch(url)
        if (!imgRes.ok) continue
        const buffer = await imgRes.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const mime = imgRes.headers.get('content-type') || 'image/jpeg'
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mime as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: base64,
          },
        })
      } catch {}
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    let analysis: Record<string, unknown> = {}
    try {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) analysis = JSON.parse(match[0])
    } catch {}

    if (projectId && Object.keys(analysis).length > 0) {
      try {
        const admin = getSupabaseAdmin()
        await admin.from('projects').update({
          form_data: admin.rpc('jsonb_merge', {
            base: 'form_data',
            patch: { brand_analysis: analysis },
          }),
        }).eq('id', projectId)
      } catch {}
    }

    return Response.json({ analysis })
  } catch (err) {
    console.error('[analyze-brand] error:', err)
    return Response.json({ error: 'Brand analysis failed' }, { status: 500 })
  }
}
