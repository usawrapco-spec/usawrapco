import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `You are Genie, the AI assistant for USA Wrap Co — a vehicle wrap and decking shop CRM. You help sales agents make more money, track jobs, suggest next actions, draft customer messages, and answer questions about the wrap business.

Be concise, direct, and actionable. You know about:
- Vehicle wrap pricing (by sqft, complexity, material type)
- Pipeline stages: sales_in → production → install → prod_review → sales_close → done
- Commission structure: Inbound 4.5% GP, Outbound 7% GP, Pre-Sold 5% flat
- GPM targets: good is >60%, great is >73%
- 3M, Avery, Arlon vinyl brands and their properties
- Common install times: sedan 12-16h, truck 15-17h, van 17h, box truck 20-24h

When drafting customer messages, keep them professional but friendly.
When suggesting pricing, always show the GPM calculation.`

export async function POST(req: NextRequest) {
  // Verify auth
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({
      content: 'AI is not configured. Add ANTHROPIC_API_KEY to Settings → Integrations to enable Genie.',
    })
  }

  let body: { messages?: any[]; context?: any }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { messages = [], context = {} } = body

  // Build context string if provided
  let contextStr = ''
  if (context.page) contextStr += `\nCurrent page: ${context.page}`
  if (context.job) contextStr += `\nCurrent job: ${JSON.stringify(context.job)}`
  if (context.customer) contextStr += `\nCurrent customer: ${JSON.stringify(context.customer)}`

  const systemPrompt = contextStr
    ? `${SYSTEM_PROMPT}\n\nContext:${contextStr}`
    : SYSTEM_PROMPT

  // Call Anthropic API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('[ai/chat] Anthropic error:', err)
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
  }

  const data = await response.json()
  const content = data.content?.[0]?.text ?? ''

  return NextResponse.json({ content })
}
