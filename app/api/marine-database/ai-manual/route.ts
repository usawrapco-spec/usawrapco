import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_API_KEY) return NextResponse.json({ error: 'AI not configured' }, { status: 503 })

  try {
    const { make, model, year } = await req.json()
    if (!make || !model) return NextResponse.json({ error: 'make and model required' }, { status: 400 })

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

    const prompt = `You are a marine research assistant specializing in boat owner's manuals and service documentation.

Find information about the owner's manual or service manual for this boat:
Make: ${make}
Model: ${model}
${year ? `Year: ${year}` : ''}

Return a JSON object with these EXACT fields:
{
  "manual_url": "URL to the PDF manual if available (manufacturer website preferred, or marineengine.com, iboats.com, etc.) - use null if no direct link can be confidently provided",
  "manual_summary": "A comprehensive 3-4 paragraph summary covering: (1) Key specifications and capacities from the manual (fuel system, electrical, engine compatibility), (2) Recommended maintenance schedule (engine hours intervals, seasonal tasks, winterization procedures), (3) Safety warnings and operational guidelines specific to this model, (4) Any unique features, factory options, or model-specific notes that a wrap installer should know about (access panels, removable components, areas requiring special attention)",
  "source_urls": ["manufacturer website URLs and documentation sources referenced"]
}

Return ONLY valid JSON, no markdown fences.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const result = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

    return NextResponse.json(result)
  } catch (err) {
    console.error('[marine-ai-manual] error:', err)
    return NextResponse.json({ error: 'Manual lookup failed' }, { status: 500 })
  }
}
