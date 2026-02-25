import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      businessName,
      industry,
      brandColors,
      logoUrl,
      vehicleType,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      wrapStyle,
      stylePreference,
      primaryMessage,
      websiteData,
    } = body

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'AI not configured' }, { status: 503 })
    }

    const anthropic = new Anthropic({ apiKey })

    const colorList = (brandColors || []).map((c: string) => c).join(', ')
    const messageFields = primaryMessage || {}
    const messageText = [
      messageFields.businessName,
      messageFields.phone,
      messageFields.website,
      messageFields.tagline,
    ].filter(Boolean).join(' | ')

    const userPrompt = `Generate 3 different detailed image generation prompts for a professional vehicle wrap mockup. Each prompt should be a variation on the same core design but with different creative approaches.

Business: ${businessName || 'Generic Business'}
Industry: ${industry || 'general'}
Vehicle: ${vehicleYear || ''} ${vehicleMake || ''} ${vehicleModel || ''} ${vehicleType || 'cargo van'}
Wrap Coverage: ${wrapStyle || 'Full Wrap'}
Design Style: ${stylePreference || 'Modern & Clean'}
Brand Colors: ${colorList || 'blue and white'}
Text to Display: ${messageText || businessName || 'Company Name'}
${websiteData?.tagline ? `Tagline: ${websiteData.tagline}` : ''}
${websiteData?.services?.length ? `Services: ${websiteData.services.join(', ')}` : ''}

Requirements for each prompt:
- Must be a photorealistic vehicle wrap mockup
- Studio lighting, clean white/gray background
- Show the vehicle from a 3/4 front angle
- The wrap should look professionally installed
- Include the specified text/branding elements
- High quality, 8K render quality

Return ONLY a JSON array of 3 prompt strings. No explanation, no markdown. Just the JSON array.
Example: ["prompt 1...", "prompt 2...", "prompt 3..."]`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    let prompts: string[]
    try {
      prompts = JSON.parse(text.trim())
    } catch {
      // Try extracting JSON from response
      const match = text.match(/\[[\s\S]*\]/)
      if (match) {
        prompts = JSON.parse(match[0])
      } else {
        // Fallback: generate a single prompt from the text
        const fallback = `Professional vehicle wrap mockup, ${vehicleType || 'cargo van'}, ${wrapStyle || 'full wrap'}, ${stylePreference || 'modern clean'} design, brand colors ${colorList || 'blue white'}, business name "${businessName || 'Company'}", photorealistic, studio lighting, 3/4 front angle, high quality 8K render`
        prompts = [fallback, fallback, fallback]
      }
    }

    return Response.json({ prompts })
  } catch (err: any) {
    console.error('[design-mockup/generate-prompt] error:', err)
    return Response.json({ error: err.message || 'Prompt generation failed' }, { status: 500 })
  }
}
