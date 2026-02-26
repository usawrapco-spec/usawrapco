import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const admin = getSupabaseAdmin()
  const slug = params.token

  const { data: campaign } = await admin
    .from('wrap_campaigns')
    .select('id, org_id, qr_code_url')
    .eq('qr_slug', slug)
    .single()

  if (!campaign) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Try IP-based geolocation
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  let geo: any = {}
  if (ip && ip !== '127.0.0.1' && ip !== '::1') {
    try {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(3000) })
      if (geoRes.ok) geo = await geoRes.json()
    } catch {
      // Geo lookup failed, continue without
    }
  }

  // Log the QR scan event
  await admin.from('wrap_tracking_events').insert({
    campaign_id: campaign.id,
    org_id: campaign.org_id,
    event_type: 'qr_scan',
    lat: geo.latitude || null,
    lng: geo.longitude || null,
    location_city: geo.city || null,
    location_state: geo.region || null,
    location_accuracy: geo.latitude ? 'ip' : 'unknown',
    user_agent: req.headers.get('user-agent') || null,
    referrer_url: req.headers.get('referer') || null,
  })

  // Redirect to the campaign's QR destination
  const redirectUrl = campaign.qr_code_url || 'https://usawrapco.com'
  return NextResponse.redirect(redirectUrl)
}

// POST endpoint for updating scan with GPS coordinates
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const body = await req.json()
  const { eventId, lat, lng } = body

  if (!eventId || !lat || !lng) {
    return Response.json({ error: 'eventId, lat, lng required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  await admin.from('wrap_tracking_events').update({
    lat,
    lng,
    location_accuracy: 'gps',
  }).eq('id', eventId)

  return Response.json({ success: true })
}
