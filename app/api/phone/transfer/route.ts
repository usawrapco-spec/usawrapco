import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { callSid, transferToNumber, transferToAgentId, transferType, callerName } = body

  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!sid || !token || !fromNumber) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 503 })
  }

  const supabase = getSupabaseAdmin()

  // Resolve target phone number
  let targetNumber = transferToNumber
  if (!targetNumber && transferToAgentId) {
    const { data: agent } = await supabase
      .from('phone_agents')
      .select('cell_number, display_name, profile:profile_id(name)')
      .eq('id', transferToAgentId)
      .single()
    targetNumber = agent?.cell_number
  }

  if (!targetNumber) {
    return NextResponse.json({ error: 'No target phone number' }, { status: 400 })
  }

  const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64')

  try {
    if (transferType === 'blind') {
      // Blind transfer: redirect customer call directly to target agent
      const twimlUrl = `${APP_URL}/api/phone/blind-transfer?to=${encodeURIComponent(targetNumber)}`

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls/${callSid}.json`,
        {
          method: 'POST',
          headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ Url: twimlUrl, Method: 'POST' }).toString(),
        }
      )

      if (!res.ok) {
        const err = await res.json()
        return NextResponse.json({ error: err }, { status: 400 })
      }

      await supabase.from('call_logs')
        .update({ status: 'transferred' })
        .eq('twilio_call_sid', callSid)

      return NextResponse.json({ success: true, type: 'blind' })
    }

    // Warm transfer with conference + announce
    // 1. Create a unique conference room name
    const roomName = `transfer-${callSid}-${Date.now()}`

    // 2. Move the customer's call into a hold conference (they hear bensound music)
    const confTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Please hold while we connect you to our team.</Say>
  <Conference
    startConferenceOnEnter="false"
    endConferenceOnExit="false"
    waitUrl="${APP_URL}/api/phone/conference-wait"
    waitMethod="GET"
    beep="false"
  >${roomName}</Conference>
</Response>`

    const confTwimlEncoded = encodeURIComponent(confTwiml)

    // Twilio requires a URL for redirecting calls, not inline TwiML.
    // Use our conference-hold endpoint with room as param.
    const holdUrl = `${APP_URL}/api/phone/conference-hold?room=${encodeURIComponent(roomName)}&callSid=${encodeURIComponent(callSid)}`

    const redirectRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls/${callSid}.json`,
      {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ Url: holdUrl, Method: 'GET' }).toString(),
      }
    )

    if (!redirectRes.ok) {
      const err = await redirectRes.json()
      console.error('[Transfer] Failed to redirect customer to conference:', err)
      return NextResponse.json({ error: err }, { status: 400 })
    }

    // 3. Call the target agent and announce the transfer
    const displayName = callerName || 'a customer'
    const announceUrl = `${APP_URL}/api/phone/announce-transfer?room=${encodeURIComponent(roomName)}&callSid=${encodeURIComponent(callSid)}&callerName=${encodeURIComponent(displayName)}`

    const outboundRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`,
      {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          To: targetNumber,
          From: fromNumber,
          Url: announceUrl,
          Method: 'POST',
          Timeout: '30',
        }).toString(),
      }
    )

    if (!outboundRes.ok) {
      const err = await outboundRes.json()
      console.error('[Transfer] Failed to call target agent:', err)
      return NextResponse.json({ error: err }, { status: 400 })
    }

    await supabase.from('call_logs')
      .update({ status: 'transferred' })
      .eq('twilio_call_sid', callSid)

    return NextResponse.json({ success: true, type: 'warm', room: roomName })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
