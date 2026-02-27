import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { imageBase64, imageType } = await req.json() as {
    imageBase64: string
    imageType?: string
  }

  if (!imageBase64) return Response.json({ error: 'No image data' }, { status: 400 })

  // Instantiate inside handler — Windows build requirement
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const mediaType = (imageType || 'image/png') as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: imageBase64 },
        },
        {
          type: 'text',
          text: 'Analyze this boat deck image and identify the location of all hardware including screws, bolts, cleats, drain holes, and any other deck hardware. Return a JSON array of detected items. Each item must have: type (one of: screw, bolt, cleat, drain, fitting, other), x (percentage of image width 0-100), y (percentage of image height 0-100), confidence (0-1), label (short description). Return ONLY the raw JSON array with no markdown, no code blocks.',
        },
      ],
    }],
  })

  try {
    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]'
    const clean = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const annotations = JSON.parse(clean)
    return Response.json({ annotations })
  } catch {
    return Response.json({ annotations: [], warning: 'Could not parse AI response' })
  }
}
