/**
 * lib/pdf/fonts.ts
 * Load PDF fonts from the local filesystem (public/fonts/) instead of fetching
 * from Google CDN at render time. This is much more reliable in serverless environments
 * where outbound network requests to CDNs can fail or time out.
 *
 * SERVER-ONLY — never import in client components.
 */
import fs from 'fs'
import path from 'path'
import { Font } from '@react-pdf/renderer'

let registered = false

export function registerPdfFonts() {
  if (registered) return
  registered = true

  const fontsDir = path.join(process.cwd(), 'public', 'fonts')

  const toDataUri = (filename: string) => {
    const buf = fs.readFileSync(path.join(fontsDir, filename))
    return `data:font/truetype;base64,${buf.toString('base64')}`
  }

  Font.register({
    family: 'Inter',
    fonts: [
      { src: toDataUri('inter-400.ttf'), fontWeight: 400 },
      { src: toDataUri('inter-600.ttf'), fontWeight: 600 },
      { src: toDataUri('inter-700.ttf'), fontWeight: 700 },
    ],
  })

  Font.register({
    family: 'BarlowCondensed',
    fonts: [
      { src: toDataUri('barlow-condensed-400.ttf'), fontWeight: 400 },
      { src: toDataUri('barlow-condensed-700.ttf'), fontWeight: 700 },
    ],
  })
}
