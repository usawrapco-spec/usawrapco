import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// Configure VAPID once on module load
const vapidConfigured =
  !!process.env.VAPID_PUBLIC_KEY &&
  !!process.env.VAPID_PRIVATE_KEY &&
  !!process.env.VAPID_EMAIL

if (vapidConfigured) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  url?: string     // where to navigate on tap
}

/**
 * POST /api/push/send
 * Body: { user_id: string, ...PushPayload }
 *
 * Can also pass user_ids: string[] to fan out to multiple users.
 * This endpoint is internal-only — call it from server-side code
 * (phone alerts, new message hooks, etc.).
 */
export async function POST(req: NextRequest) {
  // Block unauthenticated external calls — only server-side calls succeed
  const internalSecret = req.headers.get('x-internal-secret')
  if (internalSecret !== process.env.INTERNAL_API_SECRET) {
    // Also allow authenticated session users (for testing from the UI)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!vapidConfigured) {
    return NextResponse.json({ error: 'Push notifications not configured — set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL in .env.local' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const { user_id, user_ids, title, body: msgBody, icon, badge, tag, url } = body

    const targets: string[] = user_ids ?? (user_id ? [user_id] : [])
    if (!targets.length) return NextResponse.json({ error: 'user_id or user_ids required' }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .in('user_id', targets)

    if (error) throw error
    if (!subs?.length) return NextResponse.json({ sent: 0, message: 'No subscriptions found' })

    const payload: PushPayload = {
      title: title || 'USA Wrap Co',
      body: msgBody || '',
      icon: icon || '/icon-192.png',
      badge: badge || '/icon-192.png',
      tag: tag || 'usawrapco',
      url: url || '/dashboard',
    }

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 } // 24h TTL
        )
      )
    )

    const sent     = results.filter(r => r.status === 'fulfilled').length
    const failed   = results.filter(r => r.status === 'rejected').length
    const expired  = results.filter(r => r.status === 'rejected' && (r.reason?.statusCode === 404 || r.reason?.statusCode === 410))

    // Clean up expired endpoints
    if (expired.length) {
      const expiredEndpoints = subs
        .filter((_, i) => results[i].status === 'rejected' && ([404, 410].includes((results[i] as any).reason?.statusCode)))
        .map(s => s.endpoint)
      if (expiredEndpoints.length) {
        await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
      }
    }

    return NextResponse.json({ sent, failed: failed - expired.length, cleaned: expired.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
