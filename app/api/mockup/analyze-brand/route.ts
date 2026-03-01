import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const {
      businessName, industry, styleVibe, feelStatement,
      brandColors, vehicleType, logoBase64
    } = await request.json()

    const colorDesc = brandColors?.length
      ? `Brand colors: ${brandColors.join(', ')}`
      : 'No specific brand colors provided — suggest complementary colors for the industry'

    const content: Anthropic.MessageParam['content'] = []

    if (logoBase64) {
      const base64Data = logoBase64.replace(/^data:image\/\w+;base64,/, '')
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: base64Data },
      })
    }

    content.push({
      type: 'text',
      text: `You are an expert vehicle wrap designer at a premium wrap shop. Analyze this brand and generate 3 distinct wrap design concepts.

BUSINESS: ${businessName}
INDUSTRY: ${industry}
VEHICLE TYPE: ${vehicleType}
${colorDesc}
STYLE PREFERENCE: ${styleVibe}
WHAT THEY WANT PEOPLE TO FEEL: ${feelStatement || 'Professional and trustworthy'}
${logoBase64 ? 'LOGO: Provided above — analyze colors, style, and personality' : 'NO LOGO PROVIDED'}

Generate exactly 3 concepts. Each concept needs an Ideogram image generation prompt that:
- Creates ONLY the graphic design background/pattern (NO text, NO logos, NO letters, NO numbers)
- Is specific about colors, patterns, textures, shapes
- Targets commercial vehicle wrap aesthetic
- Is distinct from the other concepts

Return ONLY valid JSON in this exact format:
{
  "brand_personality": "2-3 word description",
  "color_strategy": "how colors should be used",
  "text_hierarchy": "how business name, phone, website should be arranged visually",
  "visual_flow": "how eye moves across the vehicle",
  "avoid": "specific things to avoid for this brand",
  "industry_context": "what visual cues work for this industry",
  "concepts": [
    {
      "name": "Clean & Professional",
      "description": "What the customer will see — 1 sentence, exciting but honest",
      "ideogram_prompt": "commercial van wrap graphic design, [colors], [pattern/texture], geometric shapes, vinyl wrap background, no text, no letters, no words, no logos, isolated design elements, professional fleet vehicle graphics",
      "negative_prompt": "text, letters, words, numbers, logos, watermarks, signatures, typography, fonts",
      "style_type": "DESIGN"
    },
    {
      "name": "Bold & Dynamic",
      "description": "...",
      "ideogram_prompt": "...",
      "negative_prompt": "text, letters, words, numbers, logos, watermarks, signatures, typography, fonts",
      "style_type": "DESIGN"
    },
    {
      "name": "${industry}-Inspired",
      "description": "...",
      "ideogram_prompt": "...",
      "negative_prompt": "text, letters, words, numbers, logos, watermarks, signatures, typography, fonts",
      "style_type": "DESIGN"
    }
  ]
}`,
    })

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in Claude response')

    const analysis = JSON.parse(jsonMatch[0])
    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error('Brand analysis error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
