import { getSupabaseAdmin } from '@/lib/supabase/service'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const { vehicleType, wrapType, description, colors } = await req.json()

    const admin = getSupabaseAdmin()

    // Load recent completed jobs with media
    const { data: images } = await admin
      .from('job_images')
      .select('id, image_url, project_id, category, project:project_id(title, vehicle_desc, type)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!images || images.length === 0) {
      return Response.json({ photos: [] })
    }

    // Use Claude to score similarity
    const prompt = `You are matching portfolio photos to a customer request.

Customer wants:
- Vehicle type: ${vehicleType || 'unknown'}
- Wrap type: ${wrapType || 'unknown'}
- Description: ${description || 'no details'}
- Colors: ${colors || 'any'}

Available photos (as JSON array with id, image_url, project title, vehicle desc, type, category):
${JSON.stringify(images.slice(0, 30), null, 2)}

Return a JSON array of the top 5 matching photo IDs with a similarity score (0-100) and brief match reason.
Format: [{ "id": "...", "image_url": "...", "similarity_score": 85, "match_reason": "..." }]
Return ONLY the JSON array, no other text.`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
    let photos = []
    try {
      const match = text.match(/\[[\s\S]*\]/)
      if (match) photos = JSON.parse(match[0])
    } catch {}

    return Response.json({ photos })
  } catch (err: any) {
    console.error('[similar-photos] error:', err)
    return Response.json({ photos: [], error: err.message || 'Similar photos failed' }, { status: 500 })
  }
}
