import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are V.I.N.Y.L. (Virtual Intelligence Navigating Your Logistics), the AI assistant for USA Wrap Co's WrapShop Pro platform. You help with estimates, scheduling, job status, design feedback, and general wrap shop questions. Be concise, friendly, and action-oriented.

You know about:
- Vehicle wraps, PPF (paint protection film), boat decking, marine wraps, box trucks, trailers, and commercial fleet work
- Pricing: full wrap $2,500–$6,000+, partial $800–$2,500, PPF $800–$4,000, boat decking $600–$2,000
- Pipeline stages: sales_in → production → install → prod_review → sales_close → done
- Commission: Inbound 4.5% GP, Outbound 7% GP, Pre-Sold 5% flat, GPM target >73%
- Install times: sedan 12–16h, truck 15–17h, van 17h, box truck 20–24h
- Vinyl brands: 3M, Avery Dennison, Arlon, Oracal, Hexis

When the user asks to do something in the CRM (create an estimate, check job status, find a customer, etc), tell them exactly which page to go to and what to click. Always include an "actions" array with relevant navigation links when directing users to pages.

Return JSON in this format when navigation is helpful:
{
  "response": "Your helpful message here",
  "actions": [{ "type": "navigate", "label": "Go to Estimates", "url": "/estimates" }]
}
Otherwise just return:
{
  "response": "Your helpful message here"
}

Page reference:
- New estimate: /estimates → click "New Estimate"
- Job pipeline: /pipeline
- All jobs: /jobs
- Customers: /customers
- Inbox / messages: /inbox
- Calendar: /calendar
- Design studio: /design
- Reports: /reports
- Inventory: /inventory
- Settings: /settings
- Dashboard: /dashboard
- Tasks: /tasks`

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  let body: { message: string; history?: { role: string; content: string }[]; context?: { page?: string; projectId?: string } }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ response: 'Invalid request.' }, { status: 400 })
  }

  const { message, history = [], context } = body

  if (!message?.trim()) {
    return NextResponse.json({ response: 'No message provided.' }, { status: 400 })
  }

  if (!apiKey) {
    return NextResponse.json({
      response: 'V.I.N.Y.L. is not configured yet. Ask your admin to add the ANTHROPIC_API_KEY to the environment settings.',
      actions: [{ type: 'navigate', label: 'Go to Settings', url: '/settings' }],
    })
  }

  // Build system prompt with page context if available
  let systemPrompt = SYSTEM_PROMPT
  if (context?.page) systemPrompt += `\n\nThe user is currently on page: ${context.page}`
  if (context?.projectId) systemPrompt += `\nCurrent project ID: ${context.projectId}`

  // Build message history (last 20 turns)
  const recentHistory = history.slice(-20).filter(m => m.role && m.content)
  const anthropicMessages = [
    ...recentHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message },
  ]

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: anthropicMessages,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[vinyl] Anthropic error:', err)
      return NextResponse.json({ response: 'AI request failed. Please try again.' })
    }

    const data = await res.json()
    const raw = data.content?.[0]?.text ?? ''

    // Try to parse JSON response (V.I.N.Y.L. sometimes returns structured JSON)
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.response) {
          return NextResponse.json({
            response: parsed.response,
            actions: parsed.actions || [],
          })
        }
      }
    } catch {}

    // Fallback: plain text response
    return NextResponse.json({ response: raw, actions: [] })
  } catch (err) {
    console.error('[vinyl] error:', err)
    return NextResponse.json({ response: 'Something went wrong. Please try again.' })
  }
}
