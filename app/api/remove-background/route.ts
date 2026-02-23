import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json()
    if (!imageUrl) return NextResponse.json({ error: 'No image URL' }, { status: 400 })
    // Background removal is handled client-side via @imgly/background-removal
    return NextResponse.json({ imageUrl, clientSide: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
