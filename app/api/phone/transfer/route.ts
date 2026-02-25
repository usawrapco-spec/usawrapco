import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const body = await req.json()
  const { callSid, transferToNumber, transferType } = body

  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN

  if (!sid || !token) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 503 })
  }

  try {
    const twimlUrl =
      transferType === 'warm'
        ? `https://app.usawrapco.com/api/phone/warm-transfer?to=${encodeURIComponent(transferToNumber)}&callSid=${callSid}`
        : `https://app.usawrapco.com/api/phone/blind-transfer?to=${encodeURIComponent(transferToNumber)}`

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls/${callSid}.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
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

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
