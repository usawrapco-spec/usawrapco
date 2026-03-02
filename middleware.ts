import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const { pathname } = request.nextUrl

  // ── Portal domain detection ────────────────────────────────────────────────
  const isPortalDomain =
    hostname === 'portal.usawrapco.com' ||
    hostname.startsWith('portal.') ||
    // Support local dev with PORTAL_DOMAIN env override
    (process.env.NEXT_PUBLIC_PORTAL_DOMAIN && hostname === process.env.NEXT_PUBLIC_PORTAL_DOMAIN)

  if (isPortalDomain) {
    // Static assets pass through
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/') ||
      pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|js|css|woff|woff2)$/)
    ) {
      return NextResponse.next()
    }

    // /p/[token] → /portal/[token]  (magic link short URL)
    if (pathname.startsWith('/p/')) {
      const url = request.nextUrl.clone()
      url.pathname = '/portal' + pathname.slice(2)
      return NextResponse.rewrite(url)
    }

    // Root → /portal
    if (pathname === '/' || pathname === '') {
      const url = request.nextUrl.clone()
      url.pathname = '/portal'
      return NextResponse.rewrite(url)
    }

    // Already a /portal/... path — let through
    if (pathname.startsWith('/portal/') || pathname === '/portal') {
      return NextResponse.next()
    }

    // Any other path on portal domain → prefix with /portal
    const url = request.nextUrl.clone()
    url.pathname = '/portal' + pathname
    return NextResponse.rewrite(url)
  }

  // ── Normal CRM auth for app.usawrapco.com / localhost ─────────────────────
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
