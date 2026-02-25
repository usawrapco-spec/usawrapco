import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { isTwilioWebhook, formDataToParams } from '@/lib/phone/validate'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: NextRequest) {
  let body: FormData
  try {
    body = await req.formData()
  } catch {
    return new NextResponse('Bad Request', { status: 400 })
  }

  if (!isTwilioWebhook(req, formDataToParams(body))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const callSid = body.get('CallSid') as string
    const from = body.get('From') as string
    const callerName = (body.get('CallerName') as string) || 'Unknown Caller'

    const { data: config } = await supabase
      .from('phone_system')
      .select('*')
      .eq('org_id', ORG_ID)
      .single()

    const isOpen = checkBusinessHours(config?.business_hours, config?.timezone)

    await supabase.from('call_logs').insert({
      org_id: ORG_ID,
      twilio_call_sid: callSid,
      direction: 'inbound',
      from_number: from,
      to_number: body.get('To') as string,
      caller_name: callerName,
      status: 'initiated',
      started_at: new Date().toISOString(),
    })

    const { data: departments } = await supabase
      .from('phone_departments')
      .select('*')
      .eq('org_id', ORG_ID)
      .eq('enabled', true)
      .order('sort_order')

    if (!isOpen) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">${config?.after_hours_text || 'Our office is currently closed. Please leave a message and we will return your call next business day.'}</Say>
  <Record
    action="/api/phone/voicemail?dept=general&amp;callSid=${callSid}"
    maxLength="120"
    transcribe="true"
    transcribeCallback="/api/phone/transcription"
    playBeep="true"
  />
</Response>`
      return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
    }

    const menuItems = departments?.map(d => `Press ${d.dtmf_key} ${d.description}.`).join(' ') || ''

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="/api/phone/menu?callSid=${callSid}" method="POST" timeout="8">
    <Say voice="Polly.Joanna" language="en-US">
      ${config?.greeting_text || 'Thank you for calling USA Wrap Co.'}
      ${menuItems}
      Press 0 to speak with the next available team member.
      Press star to dial a team member by extension.
    </Say>
  </Gather>
  <Say voice="Polly.Joanna">We did not receive your selection. Please try your call again.</Say>
  <Hangup/>
</Response>`

    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  } catch (err: any) {
    console.error('[phone/incoming] error:', err)
    // Return a safe TwiML fallback so Twilio doesn't retry endlessly
    const fallback = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>We're sorry, we're experiencing technical difficulties. Please try again shortly.</Say><Hangup/></Response>`
    return new NextResponse(fallback, { headers: { 'Content-Type': 'text/xml' } })
  }
}

function checkBusinessHours(hours: Record<string, { open: string; close: string; enabled: boolean }> | null, timezone = 'America/Los_Angeles'): boolean {
  if (!hours) return true

  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const dayName = parts.find(p => p.type === 'weekday')?.value?.toLowerCase() ?? ''
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0')
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0')
  const currentMinutes = hour * 60 + minute

  const dayConfig = hours[dayName]
  if (!dayConfig?.enabled) return false

  const [openH, openM] = dayConfig.open.split(':').map(Number)
  const [closeH, closeM] = dayConfig.close.split(':').map(Number)
  return currentMinutes >= openH * 60 + openM && currentMinutes < closeH * 60 + closeM
}
