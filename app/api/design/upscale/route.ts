import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, targetWidthInches, targetHeightInches, dpi = 300 } = await request.json()

    const targetWidthPx = Math.round(targetWidthInches * dpi)
    const targetHeightPx = Math.round(targetHeightInches * dpi)

    const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const imageBuffer = Buffer.from(imageData, 'base64')

    const sharp = (await import('sharp')).default
    const metadata = await sharp(imageBuffer).metadata()
    const currentWidth = metadata.width || 1024
    const currentHeight = metadata.height || 1024

    let processedBuffer: Buffer

    if (currentWidth >= targetWidthPx * 0.7 && currentHeight >= targetHeightPx * 0.7) {
      processedBuffer = await sharp(imageBuffer)
        .resize(targetWidthPx, targetHeightPx, { fit: 'fill' })
        .jpeg({ quality: 95 })
        .toBuffer()
    } else {
      const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
      if (!REPLICATE_API_TOKEN) {
        // Fallback to sharp upscaling
        processedBuffer = await sharp(imageBuffer)
          .resize(targetWidthPx, targetHeightPx, { fit: 'fill', kernel: 'lanczos3' })
          .jpeg({ quality: 95 })
          .toBuffer()
      } else {
        const startResponse = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
            input: {
              image: `data:image/jpeg;base64,${imageData}`,
              scale: 4,
              face_enhance: false,
            },
          }),
        })

        const prediction = await startResponse.json()

        let result = prediction
        let attempts = 0
        while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
            headers: { 'Authorization': `Token ${REPLICATE_API_TOKEN}` },
          })
          result = await pollResponse.json()
          attempts++
        }

        if (result.status !== 'succeeded' || !result.output) {
          processedBuffer = await sharp(imageBuffer)
            .resize(targetWidthPx, targetHeightPx, { fit: 'fill', kernel: 'lanczos3' })
            .jpeg({ quality: 95 })
            .toBuffer()
        } else {
          const upscaledResponse = await fetch(result.output)
          const upscaledBuffer = Buffer.from(await upscaledResponse.arrayBuffer())
          processedBuffer = await sharp(upscaledBuffer)
            .resize(targetWidthPx, targetHeightPx, { fit: 'fill', kernel: 'lanczos3' })
            .jpeg({ quality: 95 })
            .toBuffer()
        }
      }
    }

    return NextResponse.json({
      success: true,
      imageBase64: `data:image/jpeg;base64,${processedBuffer.toString('base64')}`,
      widthPx: targetWidthPx,
      heightPx: targetHeightPx,
      dpi,
    })
  } catch (error) {
    console.error('Upscale error:', error)
    return NextResponse.json({ error: 'Upscaling failed' }, { status: 500 })
  }
}
