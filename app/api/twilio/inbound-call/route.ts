/**
 * POST /api/twilio/inbound-call
 * Set Twilio webhook to https://app.usawrapco.com/api/twilio/inbound-call
 *
 * Handles inbound calls — logs to call_logs, matches caller to customer,
 * tracks wrap campaign events, and returns TwiML.
 */
import { ORG_ID } from '@/lib/org'
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { isTwilioWebhook, formDataToParams } from '@/lib/phone/validate'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const params = formDataToParams(formData)

    if (!isTwilioWebhook(req, params)) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 403, headers: { 'Content-Type': 'text/xml' } }
      )
    }

    const callSid = formData.get('CallSid') as string
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const callStatus = (formData.get('CallStatus') as string) || 'ringing'
    const callerName = formData.get('CallerName') as string | null

    const admin = getSupabaseAdmin()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'

    // Match caller to customer
    let customerId: string | null = null
    let customerName: string | null = callerName
    if (from) {
      const cleanPhone = from.replace(/\D/g, '')
      const { data: customer } = await admin
        .from('customers')
        .select('id, name')
        .or(`phone.eq.${from},phone.eq.+1${cleanPhone.slice(-10)},phone.eq.${cleanPhone.slice(-10)}`)
        .eq('org_id', ORG_ID)
        .limit(1)
        .maybeSingle()

      if (customer) {
        customerId = customer.id
        customerName = customer.name || callerName
      }
    }

    // Insert into call_logs
    await admin.from('call_logs').insert({
      org_id: ORG_ID,
      twilio_call_sid: callSid,
      direction: 'inbound',
      from_number: from,
      to_number: to,
      caller_name: customerName || from,
      customer_id: customerId,
      status: callStatus,
      started_at: new Date().toISOString(),
    })

    // Check if this is a wrap campaign tracking number
    const { data: campaign } = await admin
      .from('wrap_campaigns')
      .select('id, org_id, forward_to')
      .eq('tracking_phone', to)
      .single()

    if (campaign) {
      // Log wrap tracking event
      try {
        const { getAreaCodeLocation } = await import('@/lib/area-codes')
        const location = from ? getAreaCodeLocation(from) : null
        await admin.from('wrap_tracking_events').insert({
          campaign_id: campaign.id,
          org_id: campaign.org_id,
          event_type: 'call',
          caller_number: from || null,
          lat: location?.lat || null,
          lng: location?.lng || null,
          location_city: location?.city || null,
          location_state: location?.state || null,
          location_accuracy: location ? 'area_code' : 'unknown',
        })
      } catch {}

      // Forward to campaign's forward_to number
      const forwardTo = campaign.forward_to || process.env.TWILIO_DEFAULT_FROM || process.env.TWILIO_PHONE_NUMBER
      if (forwardTo) {
        const statusCallback = `${appUrl}/api/twilio/call-status`
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${escapeXml(to)}" action="${escapeXml(statusCallback)}">
    <Number>${escapeXml(forwardTo)}</Number>
  </Dial>
</Response>`,
          { headers: { 'Content-Type': 'text/xml' } }
        )
      }
    }

    // Default: greeting + voicemail recording
    const statusCallback = `${appUrl}/api/twilio/call-status`
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling USA Wrap Co. Please leave a message after the beep and we will get back to you shortly.</Say>
  <Record maxLength="120" action="${escapeXml(statusCallback)}" transcribe="true" playBeep="true" />
  <Say voice="alice">We did not receive a recording. Goodbye.</Say>
</Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    )
  } catch (error) {
    console.error('[inbound-call] error:', error)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>We are experiencing a temporary issue. Please try again later.</Say></Response>',
      { status: 500, headers: { 'Content-Type': 'text/xml' } }
    )
  }
}
