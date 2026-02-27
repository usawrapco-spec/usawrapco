/**
 * POST /api/twilio/make-call
 * Initiates an outbound call via Twilio. Requires authenticated user.
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

    const { to, from } = await req.json()
    if (!to) {
      return NextResponse.json({ error: 'Missing required field: to' }, { status: 400 })
    }

    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN
    const twilioFrom = from || process.env.TWILIO_PHONE_NUMBER

    if (!twilioSid || !twilioAuth || !twilioFrom) {
      return NextResponse.json({ error: 'Twilio not configured' }, { status: 503 })
    }

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('id, name')
      .eq('id', user.id)
      .single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'
    const statusCallback = `${appUrl}/api/twilio/call-status`

    // Initiate call via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`
    const callParams = new URLSearchParams({
      To: to,
      From: twilioFrom,
      Url: `${appUrl}/api/phone/outbound-twiml`, // TwiML for outbound call
      StatusCallback: statusCallback,
      StatusCallbackEvent: 'initiated ringing answered completed',
    })

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64')}`,
      },
      body: callParams.toString(),
    })

    const twilioData = await twilioRes.json()

    if (!twilioRes.ok) {
      console.error('[make-call] Twilio error:', twilioData)
      return NextResponse.json({ error: 'Failed to initiate call' }, { status: 502 })
    }

    // Insert into call_logs
    await admin.from('call_logs').insert({
      org_id: ORG_ID,
      twilio_call_sid: twilioData.sid,
      direction: 'outbound',
      from_number: twilioFrom,
      to_number: to,
      caller_name: profile?.name || user.email,
      initiated_by: user.id,
      status: 'initiated',
      started_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, call_sid: twilioData.sid })
  } catch (err: any) {
    console.error('[make-call] error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
