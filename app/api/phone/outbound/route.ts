import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'
const APP_URL = 'https://app.usawrapco.com'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { toNumber, toName, projectId, agentCellNumber } = body

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 503 })
  }

  if (!agentCellNumber) {
    return NextResponse.json({ error: 'Agent cell number required' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: agentCellNumber,
          From: fromNumber,
          Url: `${APP_URL}/api/phone/outbound-connect?to=${encodeURIComponent(toNumber)}&toName=${encodeURIComponent(toName || '')}`,
          Record: 'true',
          RecordingStatusCallback: `${APP_URL}/api/phone/recording`,
          StatusCallback: `${APP_URL}/api/phone/status`,
        }).toString(),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data?.message || 'Twilio error' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    await admin.from('call_logs').insert({
      org_id: ORG_ID,
      twilio_call_sid: data.sid,
      direction: 'outbound',
      from_number: fromNumber,
      to_number: toNumber,
      caller_name: toName || toNumber,
      status: 'initiated',
      answered_by: user.id,
      project_id: projectId || null,
      started_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, callSid: data.sid })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
