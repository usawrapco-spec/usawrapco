import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json(
      { error: 'Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.' },
      { status: 503 }
    )
  }

  const body = await req.json()
  const { to, body: messageBody, conversationId } = body as {
    to: string
    body: string
    conversationId: string
  }

  if (!to || !messageBody || !conversationId) {
    return NextResponse.json({ error: 'Missing required fields: to, body, conversationId' }, { status: 400 })
  }

  // Send via Twilio REST API
  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: messageBody }).toString(),
    }
  )

  const twilioData = await twilioRes.json()
  if (!twilioRes.ok) {
    return NextResponse.json(
      { error: twilioData.message || 'Twilio send failed' },
      { status: 500 }
    )
  }

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.org_id || ORG_ID
  const now = new Date().toISOString()

  // Log the outbound message
  await admin.from('sms_messages').insert({
    conversation_id: conversationId,
    direction: 'outbound',
    body: messageBody,
    from_number: fromNumber,
    to_number: to,
    twilio_sid: twilioData.sid,
    ai_generated: false,
    status: 'sent',
  })

  // Update conversation's last_message
  await admin
    .from('sms_conversations')
    .update({ last_message: messageBody, last_message_at: now })
    .eq('id', conversationId)
    .eq('org_id', orgId)

  return NextResponse.json({ success: true, sid: twilioData.sid })
}
