import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt } = await req.json()

  const anthropic = new Anthropic()

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a business strategy AI for USA Wrap Co, a vehicle wrap company in Seattle, WA.

Based on this request: "${prompt || 'Generate business venture ideas'}"

Generate 5 business ideas that leverage the company's existing capabilities (vehicle wraps, large format printing, vinyl installation, design services).

Return ONLY valid JSON array with this structure:
[
  {
    "id": "vi-1",
    "name": "Business Name",
    "category": "Category",
    "description": "2-3 sentence description",
    "market_size": "$X.XB by 20XX",
    "startup_cost": "$X,000 - $XX,000",
    "monthly_revenue": "$X,000 - $XX,000",
    "competition": "low|medium|high",
    "difficulty": "easy|medium|hard",
    "synergy": "How this connects to current vehicle wrap business",
    "steps": ["Step 1", "Step 2", "Step 3", "Step 4"],
    "score": 0-100
  }
]

Sort by score descending. Be specific to Seattle/Pacific NW market.`,
      }],
    })

    const text = (response.content[0] as any).text || '[]'
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    const ideas = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    return NextResponse.json({ ideas })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI failed' }, { status: 500 })
  }
}
