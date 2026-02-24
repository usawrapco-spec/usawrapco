import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Support both old format (logoUrl, brandFiles, brief) and new comprehensive brand analysis
    const {
      // Comprehensive brand analysis fields
      companyName, url, tagline, colors, services, aboutText, phone, email, socialLinks,
      // Legacy fields
      logoUrl, brandFiles, brief,
    } = body

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured.' }, { status: 503 })
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

    // Build message content array
    const msgContent: Anthropic.ContentBlockParam[] = []

    // Add logo image if provided (vision)
    if (logoUrl) {
      try {
        // Use URL source type (Claude supports direct URL images)
        msgContent.push({
          type: 'image',
          source: { type: 'url', url: logoUrl } as any,
        })
      } catch { /* skip */ }
    }

    // Determine prompt: comprehensive brand analysis vs legacy design analysis
    let promptText: string
    if (companyName || url) {
      promptText = `You are a professional brand strategist reviewing a business for a vehicle wrap proposal. Analyze this business's brand data and provide actionable insights.

Business data:
Company: ${companyName || 'Unknown'}
Website: ${url || 'Not provided'}
Tagline: ${tagline || 'None found'}
Phone: ${phone || 'Not found'}
Email: ${email || 'Not found'}
Colors found on website: ${colors?.length ? colors.map((c: any) => typeof c === 'string' ? c : c.hex).join(', ') : 'None'}
Services/headings found: ${services?.length ? services.join(', ') : 'None found'}
Social media: ${socialLinks ? Object.keys(socialLinks).join(', ') : 'None found'}
About text excerpt: ${aboutText?.slice(0, 300) || 'Not found'}
Design brief: ${brief || 'Not provided'}

Return ONLY valid JSON (no markdown fences, no explanation):
{
  "brand_personality": "2-3 sentence description of what their brand communicates",
  "strengths": ["strength 1", "strength 2"],
  "gaps": ["gap 1", "gap 2"],
  "color_psychology": "What their colors communicate",
  "wrap_recommendation": "Specific wrap style that best represents this brand",
  "headline": "A powerful one-line brand statement for them",
  "clean_services": ["Service 1", "Service 2", "Service 3"],
  "brand_keywords": ["keyword1", "keyword2", "keyword3", "keyword4"],
  "industry": "Their industry in 1-3 words",
  "wrap_style": "bold|corporate|minimal|luxury|rugged|playful",
  "primary_color_suggestion": "#hexcolor",
  "enhanced_prompt": "Detailed AI image generation prompt for their wrap design"
}`
    } else {
      promptText = `You are an expert vehicle wrap designer and brand analyst. Analyze this design brief and provide specific recommendations.

Design Brief: ${brief || 'No brief provided'}

Return ONLY valid JSON (no markdown fences):
{
  "enhanced_prompt": "Expanded prompt for image generation (2-3 sentences)",
  "color_analysis": "Analysis of brand colors and how to use them in a vehicle wrap",
  "style_recommendations": ["style 1", "style 2", "style 3"],
  "key_elements": ["element 1", "element 2", "element 3"],
  "avoid": ["thing to avoid 1", "thing to avoid 2"],
  "inspiration": "2-3 wrap design styles to reference",
  "brand_personality": "Brand personality description",
  "headline": "Brand headline",
  "brand_keywords": ["keyword1", "keyword2"],
  "wrap_style": "bold|corporate|minimal|luxury|rugged|playful"
}`
    }

    msgContent.push({ type: 'text', text: promptText })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: msgContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    let analysis: any = {}
    try {
      const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) analysis = JSON.parse(jsonMatch[0])
    } catch {
      analysis = { enhanced_prompt: text, brand_personality: text.slice(0, 200) }
    }

    return NextResponse.json({ analysis, success: true })
  } catch (err: any) {
    console.error('analyze-brand error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
