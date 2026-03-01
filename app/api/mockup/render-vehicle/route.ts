import { NextRequest, NextResponse } from 'next/server'

const VEHICLE_RENDER_PROMPTS: Record<string, string> = {
  car: 'sedan, 3/4 front angle, studio white background, professional automotive photography',
  suv: 'SUV crossover, 3/4 front angle, studio white background, professional automotive photography',
  van: 'full-size cargo van, 3/4 front angle, studio white background, commercial vehicle',
  sprinter: 'Mercedes Sprinter cargo van, 3/4 front angle, studio white background, commercial vehicle',
  pickup: 'pickup truck, 3/4 front angle, studio white background, professional automotive photography',
  box_truck: 'box truck delivery vehicle, 3/4 front angle, studio white background, commercial vehicle',
  trailer: 'semi trailer, side view, studio white background, commercial vehicle',
}

const ANGLE_PROMPTS = [
  'three quarter front driver side view',
  'driver side profile view, flat on',
  'three quarter rear driver side view',
]

async function pollPrediction(token: string, predictionId: string, maxWaitMs = 120000): Promise<string | null> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 3000))
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) continue
    const data = await res.json()
    if (data.status === 'succeeded') {
      const out = Array.isArray(data.output) ? data.output[0] : data.output
      return typeof out === 'string' ? out : null
    }
    if (data.status === 'failed' || data.status === 'canceled') return null
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const token = process.env.REPLICATE_API_TOKEN
    if (!token) throw new Error('REPLICATE_API_TOKEN not configured')

    const {
      conceptImageUrl,
      renderCategory,
      vehicleYear,
      vehicleMake,
      vehicleModel,
      angle = 0,
    } = await request.json()

    if (!conceptImageUrl) throw new Error('No concept image URL provided')

    const vehicleDesc = `${vehicleYear || ''} ${vehicleMake || ''} ${vehicleModel || ''}`.trim()
    const vehicleBase = VEHICLE_RENDER_PROMPTS[renderCategory] || VEHICLE_RENDER_PROMPTS.van
    const angleDesc = ANGLE_PROMPTS[angle] || ANGLE_PROMPTS[0]

    const prompt = `photorealistic vehicle wrap mockup, ${vehicleDesc} ${vehicleBase}, ${angleDesc}, professional vinyl wrap covering entire vehicle body, custom graphic design wrap applied to vehicle, sharp crisp edges, realistic material texture with slight shine, professional automotive photography lighting, clean studio environment, high detail, 8k quality`

    const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt,
          image: conceptImageUrl,
          prompt_strength: 0.62,
          num_inference_steps: 30,
          guidance_scale: 3.5,
          aspect_ratio: '3:2',
          output_quality: 90,
          output_format: 'jpg',
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Replicate error: ${err}`)
    }

    const prediction = await res.json()
    const imageUrl = await pollPrediction(token, prediction.id)

    if (!imageUrl) throw new Error('Render timed out or failed')
    return NextResponse.json({ success: true, imageUrl })
  } catch (error) {
    console.error('Vehicle render error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
