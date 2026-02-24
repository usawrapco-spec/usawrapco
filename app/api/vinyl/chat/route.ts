import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are V.I.N.Y.L. — Virtual Intelligence Navigating Your Logistics — the AI assistant for USA Wrap Co, a professional vehicle wrap shop.

You help the team with:
- Job status updates and pipeline info
- Revenue and financial summaries
- Customer follow-ups and lead management
- Estimate creation guidance
- Production scheduling
- Material/inventory checks
- Design project status
- Task management

Keep responses concise and actionable. Use bullet points for lists. Reference specific job numbers when possible.

When you need to take an action, include an ACTION block at the end of your response:
[ACTION:navigate:/path] — Navigate to a page
[ACTION:query:table_name:filters] — Query data
[ACTION:create_task:title:assignee] — Create a task

Current page context will be provided. Use it to give contextually relevant responses.`

export async function POST(req: NextRequest) {
  try {
    const { messages, page_context } = await req.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        response: "I'm not fully connected yet — the AI API key needs to be configured in settings. I can still help with navigation and basic info!",
        actions: []
      })
    }

    const systemMessage = `${SYSTEM_PROMPT}\n\nCurrent page: ${page_context || 'unknown'}\nCurrent time: ${new Date().toISOString()}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemMessage,
        messages: messages.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic API error:', err)
      return NextResponse.json({
        response: "I'm having trouble connecting right now. Try again in a moment.",
        actions: []
      })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || "I couldn't generate a response."

    // Parse action blocks
    const actions: { type: string; payload: string }[] = []
    const actionRegex = /\[ACTION:(\w+):([^\]]+)\]/g
    let match
    while ((match = actionRegex.exec(text)) !== null) {
      actions.push({ type: match[1], payload: match[2] })
    }

    const cleanText = text.replace(/\[ACTION:[^\]]+\]/g, '').trim()

    return NextResponse.json({ response: cleanText, actions })
  } catch (error) {
    console.error('VINYL chat error:', error)
    return NextResponse.json({
      response: "Something went wrong. Please try again.",
      actions: []
    })
  }
}
