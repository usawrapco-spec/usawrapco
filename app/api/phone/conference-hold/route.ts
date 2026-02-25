import { NextRequest, NextResponse } from 'next/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'

// TwiML endpoint that holds the customer in a named conference while we announce
// the transfer to the target agent. Customer hears bensound hold music until
// the target agent accepts and joins with startConferenceOnEnter=true.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const room = searchParams.get('room') || ''

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Please hold while we connect you to our team.</Say>
  <Conference
    startConferenceOnEnter="false"
    endConferenceOnExit="false"
    waitUrl="${APP_URL}/api/phone/conference-wait"
    waitMethod="GET"
    beep="false"
  >${room}</Conference>
</Response>`

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
