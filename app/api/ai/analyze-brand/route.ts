import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  try {
    const { projectId, imageUrls, brandName, vehicleType } = await req.json()

    if (!imageUrls || imageUrls.length === 0) {
      return Response.json({ error: 'No images provided' }, { status: 400 })
    }

    // Build content array with images
    const content: Anthropic.ContentBlockParam[] = [
      {
        type: 'text',
        text: `You are a professional vehicle wrap designer reviewing brand materials for a new wrap project.

Brand: ${brandName || 'Unknown'}
Vehicle: ${vehicleType || 'Unknown'}

Analyze the provided brand images and return a JSON response with:
{
  "colors": ["#hex1", "#hex2"],  // dominant brand colors as hex codes
  "logo_quality": "high|medium|low",  // logo resolution/quality assessment
  "design_recommendations": "string",  // brief design suggestions
  "wrap_complexity": "simple|moderate|complex",  // estimated wrap complexity
  "recommended_coverage": "full|3quarter|half|partial",  // recommended coverage
  "ai_tags": ["tag1", "tag2"],  // descriptive tags for search
  "brand_notes": "string"  // any special brand considerations
}
Return ONLY valid JSON.`,
      },
    ]

    // Add images (up to 3 to stay within token limits)
    for (const url of imageUrls.slice(0, 3)) {
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
      } catch {
        // Skip images that can't be fetched
      }
    }

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    let analysis: Record<string, unknown> = {}
    try {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) analysis = JSON.parse(match[0])
    } catch {}

    // Save analysis to project if projectId provided
    if (projectId && Object.keys(analysis).length > 0) {
      try {
        const admin = getSupabaseAdmin()
        await admin.from('projects').update({
          form_data: admin.rpc('jsonb_merge', {
            base: 'form_data',
            patch: { brand_analysis: analysis },
          }),
        }).eq('id', projectId)
      } catch {
        // If the jsonb_merge RPC doesn't exist, just skip saving
      }
    }

    return Response.json({ analysis })
  } catch (err) {
    console.error('[analyze-brand] error:', err)
    return Response.json({ error: 'Brand analysis failed' }, { status: 500 })
  }
}
