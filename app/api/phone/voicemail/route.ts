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

  // Bridge voicemail to inbox — look up from_number via call_logs
  const { data: callLog } = await supabase.from('call_logs')
    .select('from_number, caller_name')
    .eq('twilio_call_sid', callSid)
    .maybeSingle()

  if (callLog?.from_number) {
    const { convoId } = await findOrCreatePhoneConversation(supabase, callLog.from_number, callLog.caller_name)
    if (convoId) {
      const vmUrl = recordingUrl ? `${recordingUrl}.mp3` : null
      // Update existing call message to voicemail, or insert new
      const { data: existing } = await supabase.from('conversation_messages')
        .select('id')
        .eq('twilio_sid', callSid)
        .maybeSingle()
      if (existing) {
        await supabase.from('conversation_messages')
          .update({ channel: 'voicemail', status: 'delivered', voicemail_url: vmUrl, body: 'Left a voicemail' })
          .eq('id', existing.id)
      } else {
        await supabase.from('conversation_messages').insert({
          org_id: ORG_ID,
          conversation_id: convoId,
          channel: 'voicemail',
          direction: 'inbound',
          body: 'Left a voicemail',
          twilio_sid: callSid,
          voicemail_url: vmUrl,
          status: 'delivered',
          open_count: 0,
        })
      }
      await updateConversationLastMessage(supabase, convoId, 'voicemail', 'Left a voicemail', false)
    }
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you for your message. We will return your call as soon as possible. Goodbye.</Say>
  <Hangup/>
</Response>`

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}
