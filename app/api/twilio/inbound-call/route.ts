import { getSupabaseAdmin } from '@/lib/supabase/service'
import { getAreaCodeLocation } from '@/lib/area-codes'

export async function POST(req: Request) {
  try {
    const body = await req.formData()
    const from = (body.get('From') as string) || ''
    const to = (body.get('To') as string) || ''
    const callSid = (body.get('CallSid') as string) || ''
    const callDuration = parseInt((body.get('CallDuration') as string) || '0')

    const admin = getSupabaseAdmin()

    // Find campaign by tracking phone
    const { data: campaign } = await admin
      .from('wrap_campaigns')
      .select('id, org_id, forward_to')
      .eq('tracking_phone', to)
      .single()

    if (campaign) {
      // Get location from area code
      const location = getAreaCodeLocation(from)

      await admin.from('wrap_tracking_events').insert({
        campaign_id: campaign.id,
        org_id: campaign.org_id,
        event_type: 'call',
        caller_number: from,
        call_duration_seconds: callDuration || null,
        lat: location?.lat || null,
        lng: location?.lng || null,
        location_city: location ? `${location.city}, ${location.state}` : null,
        location_state: location?.state || null,
        location_accuracy: location ? 'area_code' : 'unknown',
      })
    }

    // Return TwiML to forward the call
    const forwardTo = campaign?.forward_to || process.env.TWILIO_DEFAULT_FROM || ''
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${to}">
    <Number>${forwardTo}</Number>
  </Dial>
</Response>`

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (err: any) {
    // Return a basic TwiML response even on error
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>We're sorry, we're unable to connect your call right now. Please try again later.</Say>
</Response>`
    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}
