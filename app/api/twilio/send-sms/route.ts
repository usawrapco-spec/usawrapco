/**
 * POST /api/twilio/send-sms
 * Sends an outbound SMS via Twilio. Requires authenticated user.
 */
import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { to, body, conversation_id } = await req.json()
    if (!to || !body) {
      return NextResponse.json({ error: 'Missing required fields: to, body' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('id, org_id, name')
      .eq('id', user.id)
      .single()

    const orgId = profile?.org_id || ORG_ID
    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER

    let messageSid: string | null = null
    let status: 'sent' | 'queued' | 'failed' = 'sent'

    if (twilioSid && twilioAuth && twilioFrom) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
      const params = new URLSearchParams({ To: to, From: twilioFrom, Body: body })

      const twilioRes = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64')}`,
        },
        body: params.toString(),
      })

      const twilioData = await twilioRes.json()

      if (!twilioRes.ok) {
        console.error('[send-sms] Twilio error:', twilioData)
        status = 'failed'
      } else {
        messageSid = twilioData.sid
        status = twilioData.status === 'queued' ? 'queued' : 'sent'
      }
    } else {
      console.log('[send-sms] Demo mode — Twilio not configured. Would send to:', to)
    }

    // Insert message into conversation_messages if conversation_id provided
    if (conversation_id) {
      await admin.from('conversation_messages').insert({
        conversation_id,
        channel: 'sms',
        direction: 'outbound',
        body,
        sent_by: user.id,
        sender_name: profile?.name || user.email,
        status,
        twilio_sid: messageSid,
      })

      // Update conversation last message fields
      await admin
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: body.substring(0, 100),
          last_message_channel: 'sms',
          status: 'open',
        })
        .eq('id', conversation_id)
    }

    // Also log to communications table
    await admin.from('communications').insert({
      org_id: orgId,
      channel: 'sms',
      direction: 'outbound',
      from_number: twilioFrom || 'system',
      to_number: to,
      body,
      twilio_sid: messageSid,
      status,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, message_sid: messageSid, status })
  } catch (err: any) {
    console.error('[send-sms] error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
