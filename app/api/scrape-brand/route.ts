import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    // Normalize URL
    const fullUrl = url.startsWith('http') ? url : `https://${url}`

    const res = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; USAWrapCo/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch: ${res.status}` }, { status: 400 })
    }

    const html = await res.text()

    const extracted: {
      companyName: string
      tagline: string
      phone: string
      email: string
      address: string
      logoUrl: string
      ogImage: string
      colors: { hex: string; name: string; usage: string }[]
      fonts: string[]
      services: string[]
      socialLinks: Record<string, string>
      aboutText: string
      images: string[]
    } = {
      companyName: '',
      tagline: '',
      phone: '',
      email: '',
      address: '',
      logoUrl: '',
      ogImage: '',
      colors: [],
      fonts: [],
      services: [],
      socialLinks: {},
      aboutText: '',
      images: [],
    }

    // Company name
    const ogSiteName = html.match(/property="og:site_name"\s+content="([^"]+)"/i)
    const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/i)
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    extracted.companyName = (ogSiteName?.[1] || ogTitle?.[1] || titleMatch?.[1] || '')
      .split('|')[0].split('-')[0].split('–')[0].trim().slice(0, 80)

    // Tagline from meta description
    const descMatch = html.match(/name="description"\s+content="([^"]+)"/i)
                   || html.match(/property="og:description"\s+content="([^"]+)"/i)
    extracted.tagline = (descMatch?.[1] || '').trim().slice(0, 200)

    // Phone numbers
    const phoneMatches = html.match(/(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/g)
    extracted.phone = phoneMatches?.[0]?.trim() || ''

    // Email
    const emailMatches = html.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g)
    extracted.email = emailMatches?.find(e =>
      !e.includes('example') && !e.includes('your@') && !e.includes('email@') && !e.includes('sentry') && !e.includes('wix')
    ) || ''

    // Logo
    const logoPatterns = [
      /src="([^"]*logo[^"]*\.(png|svg|webp|jpg))/i,
      /src="([^"]*brand[^"]*\.(png|svg|webp|jpg))/i,
      /<img[^>]*id="[^"]*logo[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*class="[^"]*logo[^"]*"[^>]*src="([^"]+)"/i,
      /href="([^"]*logo[^"]*\.(png|svg|jpg|webp))"/i,
    ]
    for (const pattern of logoPatterns) {
      const match = html.match(pattern)
      if (match) {
        const src = match[1]
        extracted.logoUrl = src.startsWith('http') ? src : new URL(src, fullUrl).href
        break
      }
    }

    // og:image as fallback
    const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i)
    extracted.ogImage = ogImageMatch?.[1] || ''

    // Colors from CSS (hex values)
    const colorMatches = html.match(/#[0-9A-Fa-f]{6}\b/g) || []
    const colorCount: Record<string, number> = {}
    colorMatches.forEach(c => {
      const hex = c.toLowerCase()
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      const lightness = (r + g + b) / 3
      if (lightness > 30 && lightness < 225 && hex !== '#ffffff' && hex !== '#000000' && hex !== '#eeeeee' && hex !== '#cccccc') {
        colorCount[hex] = (colorCount[hex] || 0) + 1
      }
    })
    extracted.colors = Object.entries(colorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([hex]) => ({ hex, name: '', usage: 'brand' }))

    // Social links
    const socialPatterns: Record<string, RegExp> = {
      instagram: /(?:href="|url\()(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^"\/\s)]+)/i,
      facebook: /(?:href="|url\()(?:https?:\/\/)?(?:www\.)?facebook\.com\/([^"\/\s)]+)/i,
      linkedin: /(?:href="|url\()(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company\/)?([^"\/\s)]+)/i,
      twitter: /(?:href="|url\()(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/([^"\/\s)]+)/i,
      youtube: /(?:href="|url\()(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:@|c\/|channel\/)?([^"\/\s)]+)/i,
      tiktok: /(?:href="|url\()(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([^"\/\s)]+)/i,
    }
    Object.entries(socialPatterns).forEach(([platform, pattern]) => {
      const match = html.match(pattern)
      if (match?.[1] && !['watch', 'share', 'feed', 'intent'].includes(match[1])) {
        extracted.socialLinks[platform] = `https://${platform === 'twitter' ? 'x' : platform}.com/${match[1]}`
      }
    })

    // Services from headings
    const headingMatches = html.match(/<h[23][^>]*>([^<]{5,60})<\/h[23]>/gi) || []
    extracted.services = headingMatches
      .map(h => h.replace(/<[^>]+>/g, '').trim())
      .filter(h => h.length > 3 && h.length < 60 && !/^\d+$/.test(h))
      .slice(0, 8)

    // About text
    const aboutMatch = html.match(/about[^<]{0,50}<\/h[^>]*>[\s\S]{0,100}<p[^>]*>([^<]{50,400})/i)
    extracted.aboutText = aboutMatch?.[1]?.replace(/\s+/g, ' ').trim() || ''

    // All images on the page
    const imgSrcMatches = html.match(/src="([^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi) || []
    extracted.images = imgSrcMatches
      .map(m => m.match(/src="([^"]+)"/)?.[1] || '')
      .filter(src => src && !src.includes('icon') && !src.includes('favicon') && !src.includes('data:'))
      .map(src => {
        try { return src.startsWith('http') ? src : new URL(src, fullUrl).href }
        catch { return '' }
      })
      .filter(Boolean)
      .slice(0, 12)

    // Return both the new structured format and old `brand` key for backwards compatibility
    const brand = {
      name: extracted.companyName,
      tagline: extracted.tagline,
      colors: extracted.colors.map(c => c.hex),
      logoUrl: extracted.logoUrl,
      ogImage: extracted.ogImage,
    }

    return NextResponse.json({ success: true, data: extracted, brand, url: fullUrl })
  } catch (err: any) {
    console.error('scrape-brand error:', err)
    return NextResponse.json({ error: err.message || 'Failed to scrape website' }, { status: 500 })
  }
}
