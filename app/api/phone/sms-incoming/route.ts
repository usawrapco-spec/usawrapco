/**
 * /api/phone/sms-incoming
 * Twilio webhook for inbound SMS and MMS messages.
 * Set as the Messaging webhook URL in Twilio console.
 */
import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { isTwilioWebhook, formDataToParams } from '@/lib/phone/validate'
import { findOrCreatePhoneConversation, updateConversationLastMessage } from '@/lib/phone/inbox'

export async function POST(req: NextRequest) {
  const body = await req.formData()
  if (!isTwilioWebhook(req, formDataToParams(body))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const admin = getSupabaseAdmin()
  const from = body.get('From') as string
  const messageSid = body.get('MessageSid') as string
  const msgBody = (body.get('Body') as string) || ''
  const numMedia = parseInt((body.get('NumMedia') as string) || '0')

  // Collect MMS media URLs
  const mediaUrls: string[] = []
  for (let i = 0; i < numMedia; i++) {
    const url = body.get(`MediaUrl${i}`) as string
    if (url) mediaUrls.push(url)
  }

  // Find or create conversation by phone number
  const { convoId } = await findOrCreatePhoneConversation(admin, from)
  if (!convoId) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }

  const preview = msgBody.slice(0, 120) || (numMedia > 0 ? `[${numMedia} photo${numMedia > 1 ? 's' : ''}]` : '(SMS)')

  // Insert inbound message
  await admin.from('conversation_messages').insert({
    org_id: ORG_ID,
    conversation_id: convoId,
    channel: 'sms',
    direction: 'inbound',
    body: msgBody,
    twilio_sid: messageSid,
    media_urls: mediaUrls.length > 0 ? mediaUrls : null,
    status: 'received',
    open_count: 0,
  })

  await updateConversationLastMessage(admin, convoId, 'sms', preview, true)

  // Empty TwiML response (no auto-reply)
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  )
}
