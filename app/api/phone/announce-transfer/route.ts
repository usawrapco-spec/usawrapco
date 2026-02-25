import { NextRequest, NextResponse } from 'next/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'

// Twilio calls target agent's cell and plays this TwiML to announce the transfer.
// Agent presses 1 to accept → routes to /api/phone/accept-transfer
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const room = searchParams.get('room') || ''
  const callSid = searchParams.get('callSid') || ''
  const callerName = searchParams.get('callerName') || 'a customer'

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${APP_URL}/api/phone/accept-transfer?room=${encodeURIComponent(room)}&amp;callSid=${encodeURIComponent(callSid)}" method="POST" timeout="20">
    <Say voice="Polly.Joanna">
      Incoming transfer from USA Wrap Co.
      ${callerName} is on hold and has been transferred to you.
      Press 1 to accept the call, or hang up to decline.
    </Say>
  </Gather>
  <Say voice="Polly.Joanna">No response received. The transfer has been cancelled.</Say>
  <Hangup/>
</Response>`

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
