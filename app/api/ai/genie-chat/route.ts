import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { message, context, conversationHistory = [] } = await req.json()

    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 })
    }

    const systemPrompt = `You are the Genie, an AI assistant for USA WRAP CO's shop management system.
You're helpful, proactive, slightly playful, and always focused on efficiency and profit.
Current user: ${context?.userName ?? 'Team Member'} (${context?.userRole ?? 'staff'})
Current page: ${context?.currentPage ?? 'dashboard'}
${context?.entityData ? `Viewing: ${JSON.stringify(context.entityData).slice(0, 500)}` : ''}
Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

You can help with:
- Drafting follow-up emails and customer messages
- Explaining job financials (GPM, commissions, production bonuses)
- Recommending next actions on leads and jobs
- Checking material/remnant availability
- Print scheduling conflicts
- Commission calculations
- Design feedback and production readiness

Shop terminology: GPM = gross profit margin, GP = gross profit, sqft = square feet,
WQ = work quote number prefix, install = installation, brief = production brief.

Keep responses concise and actionable. Use bullet points for multi-step answers.
When doing calculations, show your work briefly.`

    const messages = [
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: 'user' as const, content: message },
    ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    return Response.json({ response: text })
  } catch (err) {
    console.error('[genie-chat] error:', err)
    return Response.json(
      { error: 'AI service temporarily unavailable' },
      { status: 503 }
    )
  }
}
