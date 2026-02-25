import { NextRequest, NextResponse } from 'next/server'

// Twilio fetches this URL to get TwiML instructions for the outbound call
export async function POST(_req: NextRequest) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello, this is a call from USA Wrap Co. Please hold while we connect you.</Say>
  <Dial callerId="${process.env.TWILIO_PHONE_NUMBER || ''}">
  </Dial>
</Response>`

  return new NextResponse(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  })
}

export async function GET(_req: NextRequest) {
  return POST(_req)
}
