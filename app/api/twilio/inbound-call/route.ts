import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { getAreaCodeLocation } from '@/lib/area-codes'
import twilio from 'twilio'

const VoiceResponse = twilio.twiml.VoiceResponse

/**
 * Twilio Inbound Call Webhook
 *
 * POST — called by Twilio when someone dials a tracking number.
 * Logs the call event to wrap_tracking_events, then forwards the
 * call to the campaign's forward_to number (or the default shop number).
 *
 * NO AUTH — this is a Twilio webhook.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.formData()
    const from = body.get('From') as string
    const to = body.get('To') as string

    const admin = getSupabaseAdmin()

    // Find the campaign that owns this tracking number
    const { data: campaign } = await admin
      .from('wrap_campaigns')
      .select('id, org_id, forward_to')
      .eq('tracking_phone', to)
      .single()

    // Look up caller location from area code
    const location = from ? getAreaCodeLocation(from) : null

    // Log the inbound call event
    if (campaign) {
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
        user_agent: req.headers.get('user-agent') || null,
      })
    }

    // Build TwiML to forward the call
    const twiml = new VoiceResponse()
    const forwardTo = campaign?.forward_to || process.env.TWILIO_DEFAULT_FROM || process.env.TWILIO_PHONE_NUMBER
    if (forwardTo) {
      const dial = twiml.dial({ callerId: to })
      dial.number(forwardTo)
    } else {
      twiml.say('Thank you for calling USA Wrap Co. Please leave a message after the beep.')
      twiml.record({ maxLength: 120 })
    }

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (err: any) {
    console.error('[twilio/inbound-call] error:', err)
    // Return valid TwiML even on error so Twilio doesn't retry endlessly
    const twiml = new VoiceResponse()
    twiml.say('We are experiencing a temporary issue. Please try again later.')
    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}
