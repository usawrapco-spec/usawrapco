import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: Request) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const { mediaFileId, imageUrl } = await req.json()

    if (!imageUrl || !mediaFileId) {
      return Response.json({ error: 'imageUrl and mediaFileId required' }, { status: 400 })
    }

    // Fetch image
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) return Response.json({ error: 'Cannot fetch image' }, { status: 400 })
    const buffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mime = imgRes.headers.get('content-type') || 'image/jpeg'

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mime as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64,
            },
          },
          {
            type: 'text',
            text: `Analyze this image for a vehicle wrap/decking business media library.
Return ONLY valid JSON:
{
  "ai_description": "one sentence describing the image",
  "ai_tags": ["tag1", "tag2", "tag3"],
  "vehicle_type_tag": "van|truck|car|boat|trailer|fleet|suv|motorcycle|other|none",
  "wrap_type_tag": "full_wrap|partial_wrap|decal|lettering|color_change|ppf|decking|other|none",
  "color_tags": ["#hex1", "#hex2"]
}
Tags should be lowercase, descriptive terms useful for search (e.g. "commercial", "fleet", "chrome", "matte", "gloss", "boat wrap", "box truck").`,
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    let tags: Record<string, unknown> = {}
    try {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) tags = JSON.parse(match[0])
    } catch {}

    // Update media_files row
    if (Object.keys(tags).length > 0) {
      const admin = getSupabaseAdmin()
      await admin.from('media_files').update({
        ai_description: tags.ai_description || null,
        ai_tags: Array.isArray(tags.ai_tags) ? tags.ai_tags : [],
        vehicle_type_tag: tags.vehicle_type_tag || null,
        wrap_type_tag: tags.wrap_type_tag || null,
        color_tags: Array.isArray(tags.color_tags) ? tags.color_tags : [],
      }).eq('id', mediaFileId)
    }

    return Response.json({ tags })
  } catch (err) {
    console.error('[auto-tag] error:', err)
    return Response.json({ error: 'Auto-tag failed' }, { status: 500 })
  }
}
