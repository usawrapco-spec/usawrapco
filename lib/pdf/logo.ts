// Server-only: reads local PNG logo for use in react-pdf (which doesn't support WebP)
import fs from 'fs'
import path from 'path'

let _cached: string | null = null

export function getPdfLogoSrc(): string {
  if (_cached) return _cached
  try {
    const filePath = path.join(process.cwd(), 'public', 'images', 'usawrapco-logo-white.png')
    const buf = fs.readFileSync(filePath)
    _cached = `data:image/png;base64,${buf.toString('base64')}`
    return _cached
  } catch {
    // Fallback: absolute URL (won't work if WebP is unsupported, but better than crashing)
    return 'https://usawrapco.com/wp-content/uploads/2025/10/main-logo-1-e1759926343108.webp'
  }
}
