import { NextRequest, NextResponse } from 'next/server'

const IDEOGRAM_BASE = 'https://api.ideogram.ai'

export async function POST(request: NextRequest) {
  try {
    const { concepts, aspectRatio = 'ASPECT_16_9' } = await request.json()
    const apiKey = process.env.IDEOGRAM_API_KEY
    if (!apiKey) throw new Error('IDEOGRAM_API_KEY not configured')

    const results = await Promise.allSettled(
      concepts.map(async (concept: { ideogram_prompt: string; negative_prompt: string; style_type: string }) => {
        const response = await fetch(`${IDEOGRAM_BASE}/generate`, {
          method: 'POST',
          headers: {
            'Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_request: {
              prompt: concept.ideogram_prompt,
              negative_prompt: concept.negative_prompt,
              model: 'V_2',
              style_type: concept.style_type || 'DESIGN',
              aspect_ratio: aspectRatio,
              num_images: 1,
              magic_prompt_option: 'OFF',
            },
          }),
        })

        if (!response.ok) {
          const err = await response.text()
          throw new Error(`Ideogram API error: ${err}`)
        }

        const data = await response.json()
        const imageUrl = data?.data?.[0]?.url
        if (!imageUrl) throw new Error('No image URL in Ideogram response')
        return imageUrl
      })
    )

    const imageUrls = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value
      console.error(`Concept ${i} failed:`, (r as PromiseRejectedResult).reason)
      return null
    })

    if (imageUrls.every(u => u === null)) {
      throw new Error('All concept generations failed')
    }

    return NextResponse.json({ success: true, imageUrls })
  } catch (error) {
    console.error('Concept generation error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
