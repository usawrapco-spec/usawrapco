import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await req.formData()

    const to = body.get('To') as string
    const callSid = body.get('CallSid') as string
    const callerIdentity = body.get('Caller') as string // format: client:userId

    const userId = callerIdentity?.replace('client:', '') || null
    const mainNumber = process.env.TWILIO_PHONE_NUMBER || ''

    // Log the outbound call (ignore insert errors — non-critical)
    await supabase.from('call_logs').insert({
      org_id: ORG_ID,
      twilio_call_sid: callSid,
      direction: 'outbound',
      from_number: mainNumber,
      to_number: to,
      status: 'in-progress',
      started_at: new Date().toISOString(),
      agent_id: userId,
    })

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial
    callerId="${mainNumber}"
    record="record-from-answer"
    recordingStatusCallback="/api/phone/recording"
    action="/api/phone/status"
    method="POST"
  >
    <Number
      statusCallbackEvent="initiated ringing answered completed"
      statusCallback="/api/phone/status"
    >${to}</Number>
  </Dial>
</Response>`

    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  } catch (err: any) {
    console.error('[phone/outbound-twiml] error:', err)
    const fallback = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Connection failed. Please try again.</Say><Hangup/></Response>`
    return new NextResponse(fallback, { headers: { 'Content-Type': 'text/xml' } })
  }
}
