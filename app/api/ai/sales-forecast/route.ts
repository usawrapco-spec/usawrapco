import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const { historicalData, pipeline, monthlyTarget, currentRevenue } = await req.json()

    const prompt = `You are a sales analyst for USA WRAP CO, a vehicle wrap + deck coating shop.
Analyze this sales data and provide forecasting insights.

Monthly target: $${monthlyTarget || 50000}
Current month revenue: $${currentRevenue || 0}
Active pipeline value: $${pipeline?.totalValue || 0}
Pipeline by stage: ${JSON.stringify(pipeline?.byStage || {})}
Historical 90-day data: ${JSON.stringify(historicalData || [])}

Provide a forecast in this JSON format:
{
  "projected_monthly_revenue": number,
  "confidence_percent": number,
  "velocity_score": number (0-100, how fast deals are moving),
  "win_rate_estimate": number (0-1),
  "days_to_target": number (or null if target already met),
  "at_risk_deals": ["reason1", "reason2"],
  "opportunities": ["opportunity1", "opportunity2"],
  "recommended_actions": ["action1", "action2"],
  "summary": "2-3 sentence summary"
}

Return ONLY valid JSON, no markdown.`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const forecast = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

    return Response.json({ forecast })
  } catch (err) {
    console.error('[sales-forecast] error:', err)
    return Response.json({ error: 'Forecast failed' }, { status: 500 })
  }
}
