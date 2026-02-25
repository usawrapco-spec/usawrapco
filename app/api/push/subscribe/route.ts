import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — return VAPID public key so the client can subscribe
// Use VAPID_PUBLIC_KEY (server-side) — this is a server route, NEXT_PUBLIC_ not needed
export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!key) {
    return NextResponse.json({ error: 'Push notifications not configured' }, { status: 503 })
  }
  return NextResponse.json({ vapidPublicKey: key })
}

// POST — save a new push subscription
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { endpoint, keys } = await req.json()
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const userAgent = req.headers.get('user-agent') ?? undefined

    // Upsert — same device visiting again updates the record
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        { user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, user_agent: userAgent, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,endpoint' }
      )

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — remove a push subscription (user unsubscribes)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { endpoint } = await req.json()
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
