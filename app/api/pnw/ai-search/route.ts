import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { query } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: 'Query required' }, { status: 400 })

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `You are PNW Navigator AI, an expert assistant for Pacific Northwest boating, fishing, and marine navigation. You help anglers, boaters, and mariners with:
- Washington State fishing regulations (WDFW) and marine areas 5-13
- Species identification, fishing techniques, and seasonal patterns
- Tide and current interpretation for Puget Sound, San Juan Islands, and Strait of Juan de Fuca
- Marine safety, VHF radio procedures, and boating regulations
- Marina locations, services, and navigation in the PNW
- Orca Be Whale Wise guidelines and wildlife considerations
- DekWave non-slip decking and hull wrap services from USA Wrap Co in Gig Harbor

Keep responses concise (2-4 paragraphs max), practical, and actionable. Always recommend verifying fishing regulations at wdfw.wa.gov as they change frequently. For safety issues, always emphasize official USCG and WDFW guidance.`,
      messages: [{ role: 'user', content: query.trim() }],
    })

    const answer = message.content[0].type === 'text' ? message.content[0].text : 'Unable to generate response.'
    return NextResponse.json({ answer })
  } catch (err) {
    console.error('[pnw/ai-search]', err)
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 500 })
  }
}
