import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const { vehicleType, wrapType, sqft, panels, material, division, jobDetails } = await req.json()

    const prompt = `You are a vehicle wrap pricing expert for USA WRAP CO.
Calculate a detailed pricing breakdown for this job.

Job Details:
- Vehicle: ${vehicleType}
- Wrap Type: ${wrapType}
- Division: ${division || 'wraps'}
- Total sqft: ${sqft}
- Material: ${material || 'Avery MPI 1105'}
${panels?.length ? `- Panels: ${JSON.stringify(panels)}` : ''}
${jobDetails ? `- Additional: ${JSON.stringify(jobDetails)}` : ''}

Industry rates (use these as baseline):
- Material cost: $2.10–$2.80/sqft (use material type to determine rate)
- Labor: $35/hr installer billing rate
- Design fee: $150–$350 depending on complexity
- GPM target: 35–45%

Return a JSON object with these EXACT fields:
{
  "material_cost": number,
  "material_rate_per_sqft": number,
  "install_labor_cost": number,
  "install_hours_budgeted": number,
  "design_fee": number,
  "additional_fees": number,
  "total_sale": number,
  "net_profit": number,
  "gross_profit_margin": number,
  "agent_commission": number,
  "production_bonus": number,
  "explanation": "Brief explanation of pricing logic"
}

Return ONLY valid JSON, no markdown.`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const pricing = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

    return Response.json({ pricing })
  } catch (err) {
    console.error('[calculate-pricing] error:', err)
    return Response.json({ error: 'Pricing calculation failed' }, { status: 500 })
  }
}
