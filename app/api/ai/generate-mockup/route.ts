export async function POST(req: Request) {
  try {
    const { vehicleType, vehicleColor, designDescription, colors, style } = await req.json()

    const replicateToken = process.env.REPLICATE_API_TOKEN
    if (!replicateToken) {
      return Response.json({ error: 'Replicate API token not configured' }, { status: 503 })
    }

    // Build a detailed prompt for the mockup
    const prompt = `Professional vehicle wrap mockup, ${vehicleType || 'cargo van'}, ${vehicleColor || 'white'} base vehicle, ${designDescription || 'custom vinyl wrap design'}, ${colors || 'bold colors'}, ${style || 'commercial business wrap'}, photorealistic, studio lighting, clean background, high quality`
    const negativePrompt = 'cartoon, illustration, low quality, blurry, distorted, watermark'

    // Call Replicate API (flux-pro model)
    const replicateResponse = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-pro/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt,
          negative_prompt: negativePrompt,
          width: 1024,
          height: 768,
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 30,
        },
      }),
    })

    if (!replicateResponse.ok) {
      const err = await replicateResponse.text()
      console.error('[generate-mockup] Replicate error:', err)
      return Response.json({ error: 'Mockup generation failed' }, { status: 500 })
    }

    const prediction = await replicateResponse.json()

    // Return the prediction ID so the client can poll for completion
    return Response.json({
      predictionId: prediction.id,
      status: prediction.status,
      prompt,
    })
  } catch (err) {
    console.error('[generate-mockup] error:', err)
    return Response.json({ error: 'Mockup generation failed' }, { status: 500 })
  }
}

// Poll for mockup status
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const predictionId = searchParams.get('id')

  if (!predictionId) {
    return Response.json({ error: 'Prediction ID required' }, { status: 400 })
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN
  const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: { 'Authorization': `Bearer ${replicateToken}` },
  })

  const prediction = await res.json()

  return Response.json({
    status: prediction.status,
    imageUrl: prediction.output?.[0] ?? null,
    error: prediction.error ?? null,
  })
}
