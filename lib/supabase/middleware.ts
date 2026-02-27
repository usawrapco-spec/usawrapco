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
  const publicRoutes = ['/login', '/auth/callback', '/intake/', '/proof/', '/signoff/', '/track/', '/ref/', '/affiliate/portal', '/portal/', '/shop', '/brand/', '/proposal/', '/api/proposals/public/', '/get-started', '/start', '/design-intake/', '/api/design-intake/save', '/api/design-intake/chat', '/api/design-intake/complete', '/api/onboarding/lead', '/api/onboarding/create-checkout', '/api/vehicles/', '/pay/', '/api/stripe/', '/api/payments/webhook', '/configure/', '/api/phone/incoming', '/api/phone/sms-incoming', '/api/phone/call-complete', '/api/phone/voicemail', '/api/phone/transcription', '/api/phone/status', '/api/phone/menu', '/api/phone/outbound-connect', '/api/phone/recording', '/presentation/', '/api/presentation/public/', '/condition-report/', '/api/condition-reports/public/', '/api/wrap-funnel/', '/api/portal/maintenance', '/api/portal/reorder', '/api/portal/vehicles', '/api/portal/quote-action', '/book', '/api/appointments/public', '/roi-calculator', '/api/roi/leads', '/share/', '/api/media/packs/', '/api/twilio/inbound-sms', '/api/twilio/call-status']
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
