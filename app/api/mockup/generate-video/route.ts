import { NextRequest, NextResponse } from 'next/server'

const REPLICATE_API = 'https://api.replicate.com/v1'

export async function POST(request: NextRequest) {
  try {
    const token = process.env.REPLICATE_API_TOKEN
    if (!token) throw new Error('REPLICATE_API_TOKEN not configured')

    const { imageUrl, vehicleType, businessName: _businessName } = await request.json()
    if (!imageUrl) throw new Error('No image URL provided')

    const res = await fetch(`${REPLICATE_API}/models/klingai/kling-v1-5/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          image: imageUrl,
          prompt: `commercial ${vehicleType || 'van'} with custom vehicle wrap drives smoothly forward, subtle professional motion, cinematic camera follows vehicle, realistic lighting, premium automotive feel`,
          negative_prompt: 'distortion, warping, blur, unrealistic, cartoon',
          duration: 5,
          cfg_scale: 0.5,
          mode: 'std',
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Replicate error: ${err}`)
    }

    const prediction = await res.json()
    return NextResponse.json({
      success: true,
      predictionId: prediction.id,
      status: prediction.status,
    })
  } catch (error) {
    console.error('Video generation error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = process.env.REPLICATE_API_TOKEN
    if (!token) return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 503 })

    const predictionId = request.nextUrl.searchParams.get('id')
    if (!predictionId) return NextResponse.json({ error: 'No prediction ID' }, { status: 400 })

    const res = await fetch(`${REPLICATE_API}/predictions/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })

    if (!res.ok) throw new Error('Failed to fetch prediction')

    const prediction = await res.json()
    const output = prediction.output
    const videoUrl = typeof output === 'string' ? output : (Array.isArray(output) ? output[0] : null)

    return NextResponse.json({
      status: prediction.status,
      videoUrl: videoUrl || null,
      error: prediction.error,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
