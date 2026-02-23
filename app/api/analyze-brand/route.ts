import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { logoUrl, brandFiles, brief } = body

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured.' },
        { status: 503 }
      )
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are an expert vehicle wrap designer and brand analyst. Analyze this design brief and provide specific recommendations.

Design Brief: ${brief || 'No brief provided'}

Provide JSON response with:
- "enhanced_prompt": expanded prompt ingredients for image generation (2-3 sentences)
- "color_analysis": analysis of brand colors and how to use them effectively
- "style_recommendations": 3-5 specific style recommendations for this wrap
- "key_elements": list of key design elements to include
- "avoid": things to avoid in this design
- "inspiration": 2-3 wrap design styles to reference

Return valid JSON only, no other text.`,
          },
        ],
      },
    ]

    // If logo URL provided, add vision analysis
    if (logoUrl) {
      ;(messages[0].content as any[]).unshift({
        type: 'image',
        source: {
          type: 'url',
          url: logoUrl,
        },
      })
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages,
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    let analysis: any = {}
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      }
    } catch {
      analysis = { enhanced_prompt: text }
    }

    return NextResponse.json({ analysis })
  } catch (err: any) {
    console.error('analyze-brand error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
