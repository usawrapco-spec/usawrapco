import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { isTwilioWebhook, formDataToParams } from '@/lib/phone/validate'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const body = await req.formData()
  if (!isTwilioWebhook(req, formDataToParams(body))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const callSid = body.get('CallSid') as string
  const callStatus = body.get('CallStatus') as string
  const duration = parseInt((body.get('CallDuration') as string) || '0')

  const updateMap: Record<string, string> = {
    'completed': 'completed',
    'busy': 'missed',
    'failed': 'missed',
    'no-answer': 'missed',
    'canceled': 'missed',
    'in-progress': 'in-progress',
    'initiated': 'initiated',
    'ringing': 'ringing',
  }

  const status = updateMap[callStatus] || callStatus
  const isFinal = ['completed', 'missed'].includes(status)

  await supabase.from('call_logs')
    .update({
      status,
      duration_seconds: duration > 0 ? duration : undefined,
      ended_at: isFinal ? new Date().toISOString() : undefined,
    })
    .eq('twilio_call_sid', callSid)

  // ── Auto-SMS on missed call ──────────────────────────────────
  if (status === 'missed') {
    try {
      // Check config
      const { data: config } = await supabase
        .from('phone_system')
        .select('auto_sms_on_miss')
        .eq('org_id', ORG_ID)
        .maybeSingle()

      if (config?.auto_sms_on_miss) {
        // Get the call's from_number and check if SMS already sent
        const { data: callLog } = await supabase
          .from('call_logs')
          .select('from_number, missed_sms_sent')
          .eq('twilio_call_sid', callSid)
          .maybeSingle()

        if (callLog?.from_number && !callLog.missed_sms_sent) {
          const accountSid = process.env.TWILIO_ACCOUNT_SID
          const authToken = process.env.TWILIO_AUTH_TOKEN
          const fromNumber = process.env.TWILIO_PHONE_NUMBER

          if (accountSid && authToken && fromNumber) {
            await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
              {
                method: 'POST',
                headers: {
                  Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  To: callLog.from_number,
                  From: fromNumber,
                  Body: "Hi! We tried calling you from USA Wrap Co but missed you. Give us a call back or reply to this message — we're happy to help!",
                }).toString(),
              }
            )

            await supabase
              .from('call_logs')
              .update({ missed_sms_sent: true })
              .eq('twilio_call_sid', callSid)
          }
        }
      }
    } catch (err) {
      console.error('[Phone Status] Auto-SMS error:', err)
    }
  }

  return new NextResponse('OK')
}
