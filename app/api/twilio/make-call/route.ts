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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.usawrapco.com'

  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json(
      { error: 'Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.' },
      { status: 503 }
    )
  }

  const body = await req.json()
  const { to } = body as { to: string }

  if (!to) {
    return NextResponse.json({ error: 'Missing required field: to' }, { status: 400 })
  }

  // Initiate call via Twilio REST API
  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Url: `${siteUrl}/api/phone/outbound-twiml`,
        StatusCallback: `${siteUrl}/api/twilio/call-status`,
        StatusCallbackEvent: 'completed',
        StatusCallbackMethod: 'POST',
      }).toString(),
    }
  )

  const callData = await twilioRes.json()
  if (!twilioRes.ok) {
    return NextResponse.json(
      { error: callData.message || 'Twilio call failed' },
      { status: 500 }
    )
  }

  // Log to call_logs
  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.org_id || ORG_ID

  await admin.from('call_logs').insert({
    org_id: orgId,
    twilio_call_sid: callData.sid,
    direction: 'outbound',
    from_number: fromNumber,
    to_number: to,
    status: 'initiated',
    answered_by: user.id,
    started_at: new Date().toISOString(),
  })

  return NextResponse.json({ success: true, callSid: callData.sid })
}
