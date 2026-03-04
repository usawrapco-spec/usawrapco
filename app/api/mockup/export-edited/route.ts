import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const maxDuration = 30

interface TextLayer {
  id: string
  text: string
  x: number        // percentage 0–100 of image width
  y: number        // percentage 0–100 of image height
  fontSize: number
  fontFamily: string
  color: string
  fontWeight: 'normal' | 'bold'
  align: 'left' | 'center' | 'right'
  opacity: number
  rotation: number
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildLayerSvg(imgW: number, imgH: number, layers: TextLayer[]): string {
  const elements = layers.map(l => {
    const xPx = (l.x / 100) * imgW
    const yPx = (l.y / 100) * imgH
    const strokeW = Math.max(1, Math.round(l.fontSize * 0.04))
    const textAnchor = l.align === 'left' ? 'start' : l.align === 'right' ? 'end' : 'middle'
    const fontWeight = l.fontWeight === 'bold' ? 700 : 400

    // Handle multi-line text
    const lines = l.text.split('\n')
    const lineHeight = l.fontSize * 1.15

    if (lines.length === 1) {
      return `<text
        x="${xPx}" y="${yPx}"
        font-family="${escapeXml(l.fontFamily)}, Impact, Arial Black, sans-serif"
        font-size="${l.fontSize}"
        font-weight="${fontWeight}"
        fill="${escapeXml(l.color)}"
        text-anchor="${textAnchor}"
        dominant-baseline="middle"
        opacity="${l.opacity}"
        transform="rotate(${l.rotation}, ${xPx}, ${yPx})"
        paint-order="stroke"
        stroke="#000000"
        stroke-width="${strokeW}"
        stroke-linejoin="round"
        filter="url(#txshadow)"
      >${escapeXml(l.text)}</text>`
    }

    // Multi-line via tspan
    const totalH = lines.length * lineHeight
    const startY = yPx - totalH / 2 + lineHeight / 2
    const tspans = lines.map((line, i) =>
      `<tspan x="${xPx}" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`
    ).join('')

    return `<text
      font-family="${escapeXml(l.fontFamily)}, Impact, Arial Black, sans-serif"
      font-size="${l.fontSize}"
      font-weight="${fontWeight}"
      fill="${escapeXml(l.color)}"
      text-anchor="${textAnchor}"
      opacity="${l.opacity}"
      transform="rotate(${l.rotation}, ${xPx}, ${yPx})"
      paint-order="stroke"
      stroke="#000000"
      stroke-width="${strokeW}"
      stroke-linejoin="round"
      filter="url(#txshadow)"
    >${tspans}</text>`
  }).join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}" viewBox="0 0 ${imgW} ${imgH}">
  <defs>
    <filter id="txshadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.7"/>
    </filter>
  </defs>
  ${elements}
</svg>`
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, layers } = await req.json() as { imageUrl: string; layers: TextLayer[] }

    if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })
    if (!Array.isArray(layers)) return NextResponse.json({ error: 'layers array required' }, { status: 400 })

    // Fetch base image
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) })
    if (!imgRes.ok) return NextResponse.json({ error: 'Could not fetch image' }, { status: 422 })
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer())

    // Get dimensions
    const meta = await sharp(imgBuffer).metadata()
    const imgW = meta.width || 2160
    const imgH = meta.height || 1080

    // Resize to a consistent size for compositing
    const baseBuffer = await sharp(imgBuffer).resize(imgW, imgH).png().toBuffer()

    // Build text SVG
    const svgStr = buildLayerSvg(imgW, imgH, layers.filter(l => l.text.trim()))
    const svgBuffer = Buffer.from(svgStr)

    // Composite
    const finalBuffer = await sharp(baseBuffer)
      .composite([{ input: svgBuffer, blend: 'over' }])
      .png()
      .toBuffer()

    return new NextResponse(finalBuffer.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="mockup-edited-${Date.now()}.png"`,
        'Content-Length': String(finalBuffer.length),
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
