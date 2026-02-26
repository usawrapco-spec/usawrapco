import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

/**
 * Outbound Call Initiation
 *
 * POST { to, from?, userId }
 * Creates an outbound call via Twilio REST API, logs to calls table.
 */
export async function POST(req: NextRequest) {
  try {
    // --- Check Twilio credentials ---
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const defaultFrom = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'Twilio is not connected. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.' },
        { status: 503 }
      )
    }

    const body = await req.json()
    const { to, from, userId } = body as { to: string; from?: string; userId: string }

    if (!to) {
      return NextResponse.json({ error: 'Missing required field: to' }, { status: 400 })
    }
    if (!userId) {
      return NextResponse.json({ error: 'Missing required field: userId' }, { status: 400 })
    }

    const fromNumber = from || defaultFrom
    if (!fromNumber) {
      return NextResponse.json(
        { error: 'No "from" number provided and TWILIO_PHONE_NUMBER is not set.' },
        { status: 400 }
      )
    }

    // --- Create Twilio call via REST API ---
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://usawrapco.com'
    const statusCallbackUrl = `${siteUrl}/api/webhooks/twilio/voice/status`

    const callRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Url: `${siteUrl}/api/webhooks/twilio/voice/outbound-twiml`,
          StatusCallback: statusCallbackUrl,
          StatusCallbackEvent: 'initiated ringing answered completed',
          StatusCallbackMethod: 'POST',
        }).toString(),
      }
    )
    const call = await callRes.json()
    if (!callRes.ok) {
      return NextResponse.json({ error: call.message || 'Twilio call failed' }, { status: 500 })
    }

    // --- Look up customer by phone ---
    const supabase = getSupabaseAdmin()
    const normalizedTo = to.replace(/[^\d]/g, '')
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name')
      .or(`phone.eq.${to},phone.eq.+1${normalizedTo.slice(-10)},phone.eq.${normalizedTo.slice(-10)}`)
      .eq('org_id', ORG_ID)
      .limit(1)
      .single()

    // --- Log call to calls table ---
    await supabase.from('calls').insert({
      org_id: ORG_ID,
      call_sid: call.sid,
      direction: 'outbound',
      from_number: fromNumber,
      to_number: to,
      customer_id: customer?.id || null,
      assigned_to: userId,
      status: 'initiated',
      started_at: new Date().toISOString(),
    })

    // --- Log to activity_log ---
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('id', userId)
      .single()

    if (customer?.id) {
      await supabase.from('activity_log').insert({
        org_id: ORG_ID,
        customer_id: customer.id,
        actor_type: 'user',
        actor_id: userId,
        actor_name: callerProfile?.name || 'Team member',
        action: 'outbound_call',
        details: `Outbound call to ${to}`,
        metadata: { call_sid: call.sid },
      })
    }

    return NextResponse.json({ callSid: call.sid, status: 'initiated' })
  } catch (error: any) {
    console.error('Outbound call error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to initiate call' },
      { status: 500 }
    )
  }
}
