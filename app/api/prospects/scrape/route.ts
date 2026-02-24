import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { website } = await req.json()
  if (!website) return NextResponse.json({ error: 'website required' }, { status: 400 })

  const result = { email: '', linkedin: '', instagram: '', facebook: '' }

  try {
    const url = website.startsWith('http') ? website : `https://${website}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WrapBot/1.0)',
        'Accept': 'text/html',
      },
    })
    clearTimeout(timeout)

    const html = await res.text()
    const text = html.slice(0, 100000) // limit to first 100KB

    // Extract emails (basic regex)
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const emails: string[] = text.match(emailRegex) || []
    // Filter out common false positives
    const validEmails = emails.filter(e =>
      !e.includes('example.com') &&
      !e.includes('sentry.io') &&
      !e.includes('wixpress.com') &&
      !e.includes('.png') &&
      !e.includes('.jpg') &&
      !e.endsWith('.js') &&
      !e.endsWith('.css')
    )
    if (validEmails.length > 0) result.email = validEmails[0]

    // Extract social links
    const linkedinMatch = text.match(/https?:\/\/(www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]+/i)
    if (linkedinMatch) result.linkedin = linkedinMatch[0]

    const instagramMatch = text.match(/https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+/i)
    if (instagramMatch) result.instagram = instagramMatch[0]

    const facebookMatch = text.match(/https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9_.]+/i)
    if (facebookMatch) result.facebook = facebookMatch[0]
  } catch {
    // Scraping is best-effort — return whatever we got
  }

  return NextResponse.json(result)
}
