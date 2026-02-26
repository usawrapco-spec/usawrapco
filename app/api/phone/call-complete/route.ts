import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { isTwilioWebhook, formDataToParams } from '@/lib/phone/validate'
import { findOrCreatePhoneConversation, updateConversationLastMessage } from '@/lib/phone/inbox'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const body = await req.formData()
  if (!isTwilioWebhook(req, formDataToParams(body))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const { searchParams } = new URL(req.url)

  const callSid = searchParams.get('callSid')
  const deptId = searchParams.get('deptId')
  const dialStatus = body.get('DialCallStatus') as string
  const duration = parseInt((body.get('DialCallDuration') as string) || '0')
  const from = body.get('From') as string

  if (dialStatus === 'completed') {
    await supabase.from('call_logs')
      .update({
        status: 'completed',
        duration_seconds: duration,
        ended_at: new Date().toISOString(),
      })
      .eq('twilio_call_sid', callSid)

    // Update inbox conversation message with duration
    await supabase.from('conversation_messages')
      .update({ status: 'delivered', call_duration_seconds: duration })
      .eq('twilio_sid', callSid)

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }

  await supabase.from('call_logs')
    .update({ status: 'missed' })
    .eq('twilio_call_sid', callSid)

  // Bridge missed call to inbox
  if (from) {
    const { convoId } = await findOrCreatePhoneConversation(supabase, from)
    if (convoId) {
      // Update the ringing message to missed, or insert new if none
      const { data: existing } = await supabase.from('conversation_messages')
        .select('id')
        .eq('twilio_sid', callSid)
        .maybeSingle()
      if (existing) {
        await supabase.from('conversation_messages')
          .update({ status: 'missed', body: `Missed call from ${from}` })
          .eq('id', existing.id)
      } else {
        await supabase.from('conversation_messages').insert({
          org_id: ORG_ID,
          conversation_id: convoId,
          channel: 'call',
          direction: 'inbound',
          body: `Missed call from ${from}`,
          twilio_sid: callSid,
          status: 'missed',
          open_count: 0,
        })
      }
      await updateConversationLastMessage(supabase, convoId, 'call', `Missed call from ${from}`, true)
    }
  }

  // Auto-SMS on missed call
  const { data: config } = await supabase
    .from('phone_system')
    .select('auto_sms_on_miss')
    .eq('org_id', ORG_ID)
    .single()

  if (config?.auto_sms_on_miss !== false) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN
      const fromPhone = process.env.TWILIO_PHONE_NUMBER

      if (accountSid && authToken && fromPhone && from && !from.startsWith('+1800')) {
        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: from,
              From: fromPhone,
              Body: `Hi, this is USA Wrap Co! Sorry we missed your call. We will call you right back, or reply to this text anytime. — USA Wrap Co, Gig Harbor WA`,
            }).toString(),
          }
        )
      }
    } catch (e) {
      console.error('[PHONE] Auto-SMS failed:', e)
    }
  }

  const { data: dept } = await supabase
    .from('phone_departments')
    .select('*')
    .eq('id', deptId)
    .single()

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    ${dept?.voicemail_greeting || 'We were unable to take your call. Please leave a message.'}
  </Say>
  <Record
    action="/api/phone/voicemail?dept=${deptId}&amp;callSid=${callSid}"
    maxLength="120"
    transcribe="true"
    transcribeCallback="/api/phone/transcription"
    playBeep="true"
  />
</Response>`

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}
