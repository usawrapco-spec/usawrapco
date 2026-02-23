import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Fetch the page
    const fetchUrl = url.startsWith('https://') ? url : url.replace('http://', 'https://')

    const res = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; USAWrapCo-BrandScraper/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${res.status}` }, { status: 400 })
    }

    const html = await res.text()

    // Extract brand data using regex (avoiding cheerio to reduce bundle size)
    const brand: {
      name: string
      tagline: string
      colors: string[]
      logoUrl: string
      ogImage: string
    } = {
      name: '',
      tagline: '',
      colors: [],
      logoUrl: '',
      ogImage: '',
    }

    // Extract title / og:site_name
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const ogSiteName = html.match(/property="og:site_name"\s+content="([^"]+)"/i)
    const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/i)
    brand.name = (ogSiteName?.[1] || ogTitle?.[1] || titleMatch?.[1] || '').trim().split(' | ')[0].split(' - ')[0]

    // Extract description / tagline
    const metaDesc = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)
    const ogDesc = html.match(/property="og:description"\s+content="([^"]+)"/i)
    brand.tagline = (ogDesc?.[1] || metaDesc?.[1] || '').trim().slice(0, 120)

    // Extract og:image
    const ogImage = html.match(/property="og:image"\s+content="([^"]+)"/i)
    if (ogImage?.[1]) brand.ogImage = ogImage[1]

    // Extract CSS colors (hex colors in style blocks)
    const colorMatches = html.match(/#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g) || []
    const colorCounts: Record<string, number> = {}
    colorMatches.forEach(c => {
      const normalized = c.length === 4
        ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]
        : c.toLowerCase()
      // Skip near-black and near-white
      const r = parseInt(normalized.slice(1, 3), 16)
      const g = parseInt(normalized.slice(3, 5), 16)
      const b = parseInt(normalized.slice(5, 7), 16)
      const lightness = (r + g + b) / 3
      if (lightness > 30 && lightness < 225) {
        colorCounts[normalized] = (colorCounts[normalized] || 0) + 1
      }
    })

    // Top 5 most frequent colors
    brand.colors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => color)

    // Try to find logo
    const logoPatterns = [
      /src="([^"]*logo[^"]*\.(png|svg|jpg|webp))"/i,
      /href="([^"]*logo[^"]*\.(png|svg|jpg|webp))"/i,
      /<img[^>]+class="[^"]*logo[^"]*"[^>]+src="([^"]+)"/i,
    ]

    for (const pattern of logoPatterns) {
      const match = html.match(pattern)
      if (match) {
        let logoSrc = match[1]
        if (!logoSrc.startsWith('http')) {
          const base = new URL(fetchUrl)
          logoSrc = logoSrc.startsWith('/')
            ? `${base.origin}${logoSrc}`
            : `${base.origin}/${logoSrc}`
        }
        brand.logoUrl = logoSrc
        break
      }
    }

    return NextResponse.json({ brand, url: fetchUrl })
  } catch (err: any) {
    console.error('scrape-brand error:', err)
    return NextResponse.json({ error: err.message || 'Failed to scrape website' }, { status: 500 })
  }
}
