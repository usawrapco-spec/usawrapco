import { getSupabaseAdmin } from '@/lib/supabase/service'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const { jobId, panels } = await req.json()
    if (!panels || !Array.isArray(panels)) {
      return Response.json({ matches: [] })
    }

    const admin = getSupabaseAdmin()

    // Load available vinyl inventory remnants
    const { data: remnants } = await admin
      .from('vinyl_inventory')
      .select('id, brand, color, finish, width_in, roll_length_ft, qty_sqft, notes')
      .eq('status', 'available')
      .order('qty_sqft', { ascending: false })
      .limit(50)

    if (!remnants || remnants.length === 0) {
      return Response.json({ matches: [] })
    }

    const prompt = `You are matching vinyl remnant inventory to job panel requirements.

Job panels needed:
${JSON.stringify(panels, null, 2)}

Available inventory remnants:
${JSON.stringify(remnants, null, 2)}

For each panel, find the best matching remnant (by size and material type).
Return JSON: { "matches": [{ "remnantId": "...", "panel": "panel_name", "fit_assessment": "good/partial/none", "notes": "..." }] }
Return ONLY the JSON, no other text.`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    let result = { matches: [] }
    try {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) result = JSON.parse(match[0])
    } catch {}

    return Response.json(result)
  } catch (err) {
    console.error('[material-match] error:', err)
    return Response.json({ matches: [] })
  }
}
