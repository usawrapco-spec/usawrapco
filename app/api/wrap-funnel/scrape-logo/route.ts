import { NextRequest, NextResponse } from 'next/server'

// ── SSRF guard ────────────────────────────────────────────────────────────────
function isPrivateUrl(urlString: string): boolean {
  let parsed: URL
  try { parsed = new URL(urlString) } catch { return true }

  // Only allow http/https
  if (!['http:', 'https:'].includes(parsed.protocol)) return true

  const host = parsed.hostname.toLowerCase()

  // Block metadata endpoints
  if (host === '169.254.169.254' || host === 'metadata.google.internal') return true

  // Block localhost variants
  if (host === 'localhost' || host === '::1' || host === '0.0.0.0') return true

  // Block private IPv4 ranges
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const [, a, b] = ipv4.map(Number)
    if (a === 10) return true                     // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true // 172.16–31.x.x
    if (a === 192 && b === 168) return true        // 192.168.x.x
    if (a === 127) return true                     // 127.x.x.x
  }

  return false
}

// Extracts ONLY logo/brand colors — NOT page background or photo colors
// Strategy: SVG fill/stroke colors > CSS brand vars > top hex counts (filtered)

function isNeutral(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const avg = (r + g + b) / 3
  const deviation = Math.max(Math.abs(r - avg), Math.abs(g - avg), Math.abs(b - avg))
  // Pure grays, near-whites, near-blacks
  if (avg < 25 || avg > 230) return true
  // Very desaturated (gray-ish)
  if (deviation < 18) return true
  // Common web neutrals
  const common = ['#ffffff','#000000','#eeeeee','#cccccc','#f5f5f5','#333333','#666666','#999999','#dddddd','#111111','#222222','#444444','#555555','#777777','#888888','#aaaaaa','#bbbbbb','#e5e5e5','#f0f0f0','#fafafa','#1a1a1a','#2a2a2a','#3a3a3a','#4a4a4a']
  return common.includes(hex.toLowerCase())
}

async function extractSvgColors(svgText: string): Promise<string[]> {
  const colors = new Set<string>()

  // fill="..." and stroke="..."
  const attrRe = /(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/gi
  let m: RegExpExecArray | null
  while ((m = attrRe.exec(svgText)) !== null) colors.add(m[1].toLowerCase())

  // fill: #... in style attrs
  const styleRe = /(?:fill|stroke):\s*(#[0-9A-Fa-f]{6})/gi
  while ((m = styleRe.exec(svgText)) !== null) colors.add(m[1].toLowerCase())

  // stop-color
  const stopRe = /stop-color[:\s"']+([#]?[0-9A-Fa-f]{6})/gi
  while ((m = stopRe.exec(svgText)) !== null) {
    const c = m[1].startsWith('#') ? m[1] : '#' + m[1]
    colors.add(c.toLowerCase())
  }

  return [...colors].filter(c => !isNeutral(c)).slice(0, 3)
}

function extractCssBrandVars(html: string): string[] {
  // CSS custom properties with brand-suggesting names
  const re = /--(?:primary|brand|accent|color-1|color-2|main|theme|highlight|corporate)[^:]*:\s*(#[0-9A-Fa-f]{6})/gi
  const colors: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const c = m[1].toLowerCase()
    if (!isNeutral(c) && !colors.includes(c)) colors.push(c)
  }
  return colors.slice(0, 3)
}

function extractTopHexColors(html: string): string[] {
  const colorCount: Record<string, number> = {}
  const matches = html.match(/#[0-9A-Fa-f]{6}\b/g) || []
  matches.forEach(c => {
    const hex = c.toLowerCase()
    if (!isNeutral(hex)) colorCount[hex] = (colorCount[hex] || 0) + 1
  })
  return Object.entries(colorCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([hex]) => hex)
}

async function findLogoUrl(html: string, baseUrl: string): Promise<string> {
  const patterns = [
    /src="([^"]*logo[^"]*\.(?:svg|png|webp|jpg|jpeg)[^"]*)"/i,
    /href="([^"]*logo[^"]*\.(?:svg|png|webp|jpg|jpeg)[^"]*)"/i,
    /<img[^>]*id="[^"]*logo[^"]*"[^>]*src="([^"]+)"/i,
    /<img[^>]*class="[^"]*logo[^"]*"[^>]*src="([^"]+)"/i,
    /src="([^"]*brand[^"]*\.(?:svg|png|webp|jpg)[^"]*)"/i,
    /<link[^>]*rel="icon"[^>]*href="([^"]+)"/i,
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      const src = match[1]
      try {
        return src.startsWith('http') ? src : new URL(src, baseUrl).href
      } catch { continue }
    }
  }
  return ''
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    const fullUrl = url.startsWith('http') ? url : `https://${url}`

    // Block SSRF attempts — private IPs, localhost, metadata endpoints
    if (isPrivateUrl(fullUrl)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Fetch the HTML
    let html = ''
    try {
      const res = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; USAWrapCo/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(10000),
      })
      html = res.ok ? await res.text() : ''
    } catch {
      return NextResponse.json({ error: 'Could not reach website' }, { status: 400 })
    }

    // Company name
    const ogSite = html.match(/property="og:site_name"\s+content="([^"]+)"/i)
    const titleEl = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const companyName = (ogSite?.[1] || titleEl?.[1] || '')
      .split('|')[0].split('-')[0].split('–')[0].trim().slice(0, 80)

    // Find logo URL
    const logoUrl = await findLogoUrl(html, fullUrl)

    // Attempt to extract colors from SVG logo
    let brandColors: string[] = []

    if (logoUrl && logoUrl.match(/\.svg(\?|$)/i) && !isPrivateUrl(logoUrl)) {
      try {
        const svgRes = await fetch(logoUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(5000),
        })
        if (svgRes.ok) {
          const svgText = await svgRes.text()
          brandColors = await extractSvgColors(svgText)
        }
      } catch { /* fall through */ }
    }

    // If no SVG colors, try CSS brand variables
    if (brandColors.length === 0) {
      brandColors = extractCssBrandVars(html)
    }

    // If still nothing, fall back to top hex colors from the page
    if (brandColors.length === 0) {
      brandColors = extractTopHexColors(html).slice(0, 3)
    }

    // Ensure max 3 colors
    brandColors = brandColors.slice(0, 3)

    return NextResponse.json({
      ok: true,
      logoUrl,
      companyName,
      brandColors,
      source: logoUrl.match(/\.svg/) ? 'svg' : brandColors.length > 0 ? 'css' : 'fallback',
    })
  } catch (err: any) {
    console.error('[wrap-funnel/scrape-logo]', err)
    return NextResponse.json({ error: err.message || 'Scrape failed' }, { status: 500 })
  }
}
