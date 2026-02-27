export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { messages = [], context = {} } = body

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ response: 'AI assistant is not configured. Please set ANTHROPIC_API_KEY.' })
    }

    // Build system prompt with CRM context
    const systemPrompt = `You are V.I.N.Y.L. (Virtual Intelligence Navigating Your Logistics), the AI assistant for USA WRAP CO's vehicle wrap shop CRM platform.

You help the team with:
- Estimating vehicle wrap jobs and pricing guidance
- Understanding job pipeline stages (sales_in, production, install, prod_review, sales_close, done)
- GPM (Gross Profit Margin) targets and commission calculations
- Customer follow-ups and communication drafts
- Production scheduling and material tracking
- Business insights and operational questions

Current page context: ${context.page || 'unknown'}
${context.projectId ? `Active project: ${context.projectId}` : ''}

Be concise, helpful, and professional. When suggesting actions, provide specific next steps. Keep responses under 200 words unless asked for detail.`

    // Format messages for Anthropic API
    const formattedMessages = (messages as { role: string; content: string }[]).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: systemPrompt,
        messages: formattedMessages.length > 0 ? formattedMessages : [{ role: 'user', content: 'Hello' }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', errText)
      return NextResponse.json({ response: 'Sorry, I had trouble connecting. Please try again.' })
    }

    const data = await response.json()
    const assistantMessage = data.content?.[0]?.text || 'Sorry, I could not generate a response.'

    // Log to vinyl_context_log (fire and forget)
    try {
      const admin = getSupabaseAdmin()
      await admin.from('vinyl_context_log').insert({
        user_id: user.id,
        page_route: context.page || '',
        context_data: context,
        message_count: formattedMessages.length,
      })
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      response: assistantMessage,
      model: 'claude-sonnet-4-6',
    })
  } catch (e: any) {
    console.error('Vinyl companion error:', e)
    return NextResponse.json({ response: 'Something went wrong. Please try again.' })
  }
}
