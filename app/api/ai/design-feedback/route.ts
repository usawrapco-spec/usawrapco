import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  try {
    const { designData, jobDetails } = await req.json()

    const prompt = `You are a vehicle wrap production expert reviewing a design for print readiness.

Design details:
${JSON.stringify(designData, null, 2)}

Job details:
${JSON.stringify(jobDetails, null, 2)}

Evaluate this design for:
1. Production readiness (resolution, bleed, file format)
2. Color concerns (out-of-gamut colors, white areas that need knockout)
3. Text legibility at vehicle scale
4. Compliance with wrap material specs
5. Potential installation issues

Return feedback as JSON:
{
  "production_ready": boolean,
  "overall_score": number (0-100),
  "issues": [
    { "severity": "critical|warning|info", "category": "string", "issue": "string", "fix": "string" }
  ],
  "approvals": ["list", "of", "things", "that", "look", "good"],
  "summary": "1-2 sentence overall assessment"
}

Return ONLY valid JSON, no markdown.`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const feedback = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

    return Response.json({ feedback })
  } catch (err) {
    console.error('[design-feedback] error:', err)
    return Response.json({ error: 'Design feedback failed' }, { status: 500 })
  }
}
