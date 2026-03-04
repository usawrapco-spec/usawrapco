import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ suggestion: 'AI is not configured. Add ANTHROPIC_API_KEY to enable reply suggestions.' })
  }

  let body: { messages?: Array<{ role: string; content: string }>; channel?: string; customerName?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { messages = [], channel = 'customer', customerName = 'the customer' } = body

  const conversationHistory = messages
    .map(m => `${m.role === 'user' ? 'Team' : customerName}: ${m.content}`)
    .join('\n')

  const systemPrompt = `You are an AI assistant for USA Wrap Co, a professional vehicle wrap shop. Your job is to draft a single, professional and friendly reply from the shop's team.

Channel context: ${channel === 'customer' ? 'This is a direct customer message thread' : channel === 'designer' ? 'This is a message to the assigned designer' : 'This is an internal team message'}

Guidelines:
- Be concise and professional
- Match the tone of the conversation
- Don't start with "I" — start with action or empathy
- Keep it under 3 sentences
- For customers: friendly, reassuring, proactive
- For designers: clear, specific, creative

Reply ONLY with the message draft itself — no labels, no quotes, no explanation.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Conversation so far:\n${conversationHistory}\n\nDraft a reply:` }],
    }),
  })

  if (!response.ok) {
    return NextResponse.json({ suggestion: 'Unable to generate suggestion. Please try again.' })
  }

  const data = await response.json()
  const suggestion = data.content?.[0]?.text?.trim() ?? ''
  return NextResponse.json({ suggestion })
}
