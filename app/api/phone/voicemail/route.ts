import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { isTwilioWebhook, formDataToParams } from '@/lib/phone/validate'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const body = await req.formData()
  if (!isTwilioWebhook(req, formDataToParams(body))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const { searchParams } = new URL(req.url)

  const callSid = searchParams.get('callSid') || (body.get('CallSid') as string)
  const recordingUrl = body.get('RecordingUrl') as string
  const recordingSid = body.get('RecordingSid') as string

  await supabase.from('call_logs')
    .update({
      status: 'voicemail',
      voicemail_url: recordingUrl ? `${recordingUrl}.mp3` : null,
      recording_sid: recordingSid,
      ended_at: new Date().toISOString(),
    })
    .eq('twilio_call_sid', callSid)

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you for your message. We will return your call as soon as possible. Goodbye.</Say>
  <Hangup/>
</Response>`

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}
