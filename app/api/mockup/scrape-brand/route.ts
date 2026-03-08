import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── HTML helpers ──────────────────────────────────────────────────────────────

function getMeta(html: string, name: string): string {
  const m =
    html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, 'i'))
  return m ? m[1].trim() : ''
}

function getTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m ? m[1].trim() : ''
}

function getPhone(html: string): string {
  // tel: links first
  const tel = html.match(/href=["']tel:([\d\s\-().+]+)["']/i)
  if (tel) return tel[1].trim()
  // Pattern match
  const pat = html.match(/\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/)
  return pat ? pat[0].trim() : ''
}

function getLogoUrl(html: string, baseUrl: string): string {
  // og:image first (usually highest quality brand image)
  const og = getMeta(html, 'og:image')
  if (og) return resolveUrl(og, baseUrl)

  // src containing "logo" in an img tag
  const logoImg = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*(?:alt|class|id)=["'][^"']*logo[^"']*["']/i)
    || html.match(/<img[^>]+(?:alt|class|id)=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i)
    || html.match(/<img[^>]+src=["']([^"']*logo[^"']*)["']/i)
  if (logoImg) return resolveUrl(logoImg[1], baseUrl)

  // apple-touch-icon
  const apple = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i)
  if (apple) return resolveUrl(apple[1], baseUrl)

  return ''
}

function resolveUrl(src: string, base: string): string {
  if (!src) return ''
  if (src.startsWith('http')) return src
  try {
    return new URL(src, base).href
  } catch {
    return src
  }
}

function cleanCompanyName(raw: string): string {
  if (!raw) return ''
  // Many sites use "SEO Keywords | Brand Name" or "Brand Name | Tagline" format.
  // Heuristic: if there's a pipe, try to find the actual brand name.
  const pipeMatch = raw.match(/^(.+?)\s*[|]\s*(.+)$/)
  if (pipeMatch) {
    const before = pipeMatch[1].trim()
    const after = pipeMatch[2].trim()
    // If 'after' is a generic word, strip it and keep 'before'
    const genericAfter = /^(home|welcome|official|site|website|main|homepage)$/i.test(after)
    if (genericAfter) return before.replace(/\s*(LLC|Inc\.?|Corp\.?|Co\.?|Ltd\.?)$/i, '').trim()
    // If 'before' looks like SEO keywords (contains commas, long, or has geo terms) use 'after'
    const beforeLooksLikeSEO = before.includes(',') || before.split(' ').length > 5
      || /\b(best|top|#1|no\.?\s*1|near me|in\s+\w+,?\s+\w{2}\b)/i.test(before)
    if (beforeLooksLikeSEO) return after.replace(/\s*(LLC|Inc\.?|Corp\.?|Co\.?|Ltd\.?)$/i, '').trim()
    // If 'after' is shorter (typical brand name position), prefer it
    if (after.length < before.length) return after.replace(/\s*(LLC|Inc\.?|Corp\.?|Co\.?|Ltd\.?)$/i, '').trim()
    return before.replace(/\s*(LLC|Inc\.?|Corp\.?|Co\.?|Ltd\.?)$/i, '').trim()
  }
  // Strip dash suffixes like "Brand Name - Home", "Brand Name — Official Site"
  return raw
    .replace(/\s*[-–—]\s*(Home|Welcome|Official|Site|Website|LLC|Inc|Co\.?|Corp\.?).*$/i, '')
    .replace(/\s*(LLC|Inc\.?|Corp\.?|Co\.?|Ltd\.?)$/i, '')
    .trim()
}

// ── Color extraction via Claude vision ────────────────────────────────────────

const COLOR_EXTRACTION_PROMPT = `Look at this logo image. Extract the 2-3 most dominant brand colors FROM THE LOGO ITSELF — not background colors, not white/light backgrounds unless they are clearly intentional brand colors.

Return JSON only, no explanation:
{"colors": ["#hex1", "#hex2", "#hex3"]}

Rules:
- Only include colors that are clearly part of the logo design
- Skip pure white (#ffffff or near-white) backgrounds unless the logo is on a colored background
- Skip very light grays unless that is a primary brand color
- Order: primary color first, then secondary, then accent
- Maximum 3 colors`

async function extractLogoColors(logoUrl: string): Promise<string[]> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: logoUrl } },
          { type: 'text', text: COLOR_EXTRACTION_PROMPT },
        ],
      }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      const colors: string[] = (parsed.colors || []).filter((c: string) => /^#[0-9a-fA-F]{6}$/.test(c))
      return colors.slice(0, 3)
    }
  } catch { /* fall through */ }
  return []
}

async function extractLogoColorsBase64(base64DataUrl: string): Promise<string[]> {
  try {
    const match = base64DataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!match) return []
    const mediaType = match[1] as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'
    const data = match[2]
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
          { type: 'text', text: COLOR_EXTRACTION_PROMPT },
        ],
      }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const m = text.match(/\{[\s\S]*\}/)
    if (m) {
      const parsed = JSON.parse(m[0])
      const colors: string[] = (parsed.colors || []).filter((c: string) => /^#[0-9a-fA-F]{6}$/.test(c))
      return colors.slice(0, 3)
    }
  } catch { /* fall through */ }
  return []
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { url, logo_base64 } = await req.json()

    // Logo-only color extraction (no website URL needed)
    if (!url && logo_base64) {
      const brand_colors = await extractLogoColorsBase64(logo_base64)
      return NextResponse.json({ brand_colors })
    }

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url required' }, { status: 400 })
    }

    // Normalize URL
    let targetUrl = url.trim()
    if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`

    // Fetch website HTML
    let html = ''
    let finalUrl = targetUrl
    try {
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; USAWrapCo/1.0; +https://usawrapco.com)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      })
      finalUrl = res.url || targetUrl
      if (res.ok) {
        // Only read first 100KB — enough for meta tags and early content
        const reader = res.body?.getReader()
        if (reader) {
          const chunks: Uint8Array[] = []
          let totalBytes = 0
          while (totalBytes < 100_000) {
            const { done, value } = await reader.read()
            if (done || !value) break
            chunks.push(value)
            totalBytes += value.length
          }
          reader.cancel()
          html = new TextDecoder().decode(Buffer.concat(chunks))
        }
      }
    } catch {
      return NextResponse.json({ error: 'Could not reach that website. Check the URL and try again.' }, { status: 422 })
    }

    if (!html) {
      return NextResponse.json({ error: 'Website returned no content.' }, { status: 422 })
    }

    // ── Extract basic info ──────────────────────────────────────────────────
    const ogTitle     = getMeta(html, 'og:title')
    const ogDesc      = getMeta(html, 'og:description')
    const ogSiteName  = getMeta(html, 'og:site_name')
    const metaDesc    = getMeta(html, 'description')
    const pageTitle   = getTitle(html)
    const phone       = getPhone(html)
    const logoUrl     = getLogoUrl(html, finalUrl)

    // Company name: og:site_name is the most reliable (pure brand name, no SEO keywords).
    // Fall back to og:title or page title, cleaned up.
    const companyName = ogSiteName
      ? ogSiteName.trim()
      : cleanCompanyName(ogTitle || pageTitle || '')

    // Tagline: prefer og:description > meta description (first sentence)
    const rawDesc = ogDesc || metaDesc || ''
    const tagline = rawDesc.split(/[.!?]/)[0].trim().slice(0, 80) || ''

    // Website: clean domain
    let website = ''
    try {
      website = new URL(finalUrl).hostname.replace(/^www\./, '')
    } catch { website = '' }

    // ── Extract colors from logo via Claude ──────────────────────────────────
    let brandColors: string[] = []
    if (logoUrl) {
      brandColors = await extractLogoColors(logoUrl)
    }

    return NextResponse.json({
      company_name: companyName,
      tagline,
      phone,
      website,
      logo_url: logoUrl,
      brand_colors: brandColors,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
