import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'

// Called when the target agent presses 1 to accept a warm transfer.
// Joins the agent into the conference (customer is already waiting there).
// Also updates call_log status to 'transferred'.
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const room = searchParams.get('room') || ''
  const callSid = searchParams.get('callSid') || ''
  const body = await req.formData()
  const digit = body.get('Digits') as string

  if (digit !== '1') {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Transfer declined. Goodbye.</Say>
  <Hangup/>
</Response>`
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  }

  // Update call log
  if (callSid) {
    const supabase = getSupabaseAdmin()
    await supabase.from('call_logs')
      .update({ status: 'transferred' })
      .eq('twilio_call_sid', callSid)
  }

  // Join the conference — startConferenceOnEnter=true bridges with the waiting customer
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Connecting you now.</Say>
  <Conference
    startConferenceOnEnter="true"
    endConferenceOnExit="true"
    beep="false"
  >${room}</Conference>
</Response>`

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}
