import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  try {
    const { context } = await req.json()

    const prompt = `You are the Genie AI for USA WRAP CO shop management system.
Analyze the shop's current state and generate 1-3 proactive, actionable suggestions.

Shop context:
${JSON.stringify(context, null, 2)}

Generate suggestions in this JSON format:
[
  {
    "id": "unique-id",
    "type": "action|warning|tip|opportunity",
    "title": "Short title (max 8 words)",
    "message": "Specific actionable message (1-2 sentences)",
    "action_label": "Button label (optional)",
    "action_url": "URL to navigate to (optional)",
    "priority": "high|medium|low"
  }
]

Focus on: overdue follow-ups, at-risk deals, schedule conflicts, material shortages,
maintenance due, inventory alerts, commission opportunities.

Return ONLY valid JSON array, no markdown.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const suggestions = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

    return Response.json({ suggestions: Array.isArray(suggestions) ? suggestions : [] })
  } catch (err) {
    console.error('[genie-suggestion] error:', err)
    return Response.json({ suggestions: [] })
  }
}
