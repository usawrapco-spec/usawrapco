import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

/**
 * Check if current time is within business hours (8am-6pm M-F PST)
 */
function isBusinessHours(): boolean {
  const now = new Date()
  // Convert to PST (UTC-8) / PDT (UTC-7)
  const pst = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const day = pst.getDay() // 0=Sun, 6=Sat
  const hour = pst.getHours()
  return day >= 1 && day <= 5 && hour >= 8 && hour < 18
}

/**
 * Normalize phone number: strip non-digits except leading +
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '')
  // If 10 digits, assume US and prepend +1
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return `+${digits}`
}

/**
 * Twilio Voice Webhook Handler
 *
 * Receives inbound calls from Twilio.
 * During business hours: rings assigned employee, falls back to voicemail.
 * After hours: plays greeting, records voicemail.
 * Logs all calls to the calls table.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const callSid = formData.get('CallSid') as string
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const callStatus = formData.get('CallStatus') as string

    if (!from || !to) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>We are unable to take your call right now. Please try again later.</Say></Response>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      )
    }

    const supabase = getSupabaseAdmin()
    const normalizedFrom = normalizePhone(from)

    // --- Match caller to customer by phone ---
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, phone, email')
      .or(`phone.eq.${from},phone.eq.${normalizedFrom},phone.eq.${from.replace('+1', '')}`)
      .eq('org_id', ORG_ID)
      .limit(1)
      .single()

    // --- Find assigned employee for this number ---
    let assignedEmployee: { id: string; name: string; phone: string | null } | null = null

    // Check if there is a phone_number assignment for the dialed number
    const { data: phoneNumber } = await supabase
      .from('phone_numbers')
      .select('assigned_to')
      .eq('phone_number', to)
      .eq('org_id', ORG_ID)
      .single()

    if (phoneNumber?.assigned_to) {
      const { data: emp } = await supabase
        .from('profiles')
        .select('id, name, phone')
        .eq('id', phoneNumber.assigned_to)
        .single()
      if (emp) assignedEmployee = emp
    }

    // (customer table does not have assigned_to; routing uses phone_number assignment above)

    // --- Log the call ---
    await supabase.from('calls').insert({
      org_id: ORG_ID,
      call_sid: callSid,
      direction: 'inbound',
      from_number: from,
      to_number: to,
      customer_id: customer?.id || null,
      assigned_to: assignedEmployee?.id || null,
      status: callStatus || 'ringing',
      started_at: new Date().toISOString(),
    })

    // --- Also log to activity_log for timeline ---
    if (customer?.id) {
      await supabase.from('activity_log').insert({
        org_id: ORG_ID,
        customer_id: customer.id,
        actor_type: 'customer',
        actor_id: customer.id,
        actor_name: customer.name || from,
        action: 'inbound_call',
        details: `Inbound call from ${from}`,
        metadata: { call_sid: callSid, to_number: to },
      })
    }

    // --- Check if we should record all calls ---
    const { data: recordSetting } = await supabase
      .from('shop_settings')
      .select('value')
      .eq('org_id', ORG_ID)
      .eq('key', 'twilio_record_all_calls')
      .single()
    const recordAll = recordSetting?.value === 'true'

    // --- Generate TwiML response ---
    const callerName = customer ? customer.name : 'a caller'

    if (isBusinessHours() && assignedEmployee?.phone) {
      // Business hours: ring the assigned employee, then voicemail on no answer
      const recordAttr = recordAll ? ' record="record-from-answer-dual"' : ''
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="25" action="/api/webhooks/twilio/voice/status" method="POST"${recordAttr}>
    <Number>${assignedEmployee.phone}</Number>
  </Dial>
  <Say voice="Polly.Joanna">
    Sorry, ${assignedEmployee.name} is not available right now.
    Please leave a message after the beep and we will get back to you as soon as possible.
  </Say>
  <Record maxLength="120" playBeep="true" action="/api/webhooks/twilio/voice/recording" method="POST" transcribe="true" transcribeCallback="/api/webhooks/twilio/voice/transcription" />
  <Say voice="Polly.Joanna">We did not receive your message. Goodbye.</Say>
</Response>`
      return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    } else {
      // After hours or no assigned employee: voicemail greeting
      const greeting = isBusinessHours()
        ? `Thank you for calling USA Wrap Co. All of our team members are currently busy.`
        : `Thank you for calling USA Wrap Co. Our office hours are Monday through Friday, 8 AM to 6 PM Pacific Time.`
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    ${greeting}
    Please leave a message after the beep, including your name and number, and we will return your call as soon as possible.
  </Say>
  <Record maxLength="120" playBeep="true" action="/api/webhooks/twilio/voice/recording" method="POST" transcribe="true" transcribeCallback="/api/webhooks/twilio/voice/transcription" />
  <Say voice="Polly.Joanna">We did not receive your message. Goodbye.</Say>
</Response>`
      return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }
  } catch (error) {
    console.error('Twilio voice webhook error:', error)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We are experiencing technical difficulties. Please try again later.</Say>
</Response>`
    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}
