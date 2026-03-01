import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json()
    const apiKey = process.env.REMOVEBG_API_KEY

    if (!apiKey) {
      return NextResponse.json({ success: true, imageBase64, skipped: true })
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

    const formData = new FormData()
    formData.append('image_file_b64', base64Data)
    formData.append('size', 'auto')
    formData.append('format', 'png')

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: formData,
    })

    if (!response.ok) {
      return NextResponse.json({ success: true, imageBase64, skipped: true })
    }

    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    return NextResponse.json({
      success: true,
      imageBase64: `data:image/png;base64,${base64}`,
    })
  } catch (error) {
    console.error('Remove BG error:', error)
    return NextResponse.json({ success: true, imageBase64: '', skipped: true })
  }
}
