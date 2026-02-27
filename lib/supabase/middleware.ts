import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const { pathname } = request.nextUrl
  if (
    pathname === '/login' ||
    pathname === '/book' ||
    pathname.startsWith('/api/')
  ) {
    return supabaseResponse
  }

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
  const publicRoutes = ['/login', '/book', '/api/', '/auth/callback', '/intake/', '/proof/', '/signoff/', '/track/', '/ref/', '/affiliate/portal', '/portal/', '/shop', '/brand/', '/proposal/', '/get-started', '/start', '/design-intake/', '/configure/', '/pay/', '/presentation/', '/condition-report/', '/onboard/']
  const exactPublicRoutes = ['/roi']
  const isPublic = publicRoutes.some(r => pathname.startsWith(r)) || exactPublicRoutes.includes(pathname)

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
