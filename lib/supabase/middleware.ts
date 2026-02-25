import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl
  const publicRoutes = ['/login', '/auth/callback', '/intake/', '/proof/', '/signoff/', '/track/', '/ref/', '/affiliate/portal', '/portal/', '/shop', '/brand/', '/proposal/', '/get-started', '/design-intake/', '/api/design-intake/save', '/api/design-intake/chat', '/api/design-intake/complete', '/api/onboarding/lead', '/api/onboarding/create-checkout', '/api/vehicles/', '/pay/', '/api/stripe/', '/api/payments/webhook', '/configure/']
  const isPublic = publicRoutes.some(r => pathname.startsWith(r))

  // Portal routes: redirect unauthenticated users to portal login (not main login)
  if (!user && pathname === '/portal') {
    const url = request.nextUrl.clone()
    url.pathname = '/portal/login'
    return NextResponse.redirect(url)
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
