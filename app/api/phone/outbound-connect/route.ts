import { NextRequest, NextResponse } from 'next/server'

// After agent picks up, Twilio calls this to connect them to the customer
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const to = searchParams.get('to') || ''
  const toName = searchParams.get('toName') || ''

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Connecting you to ${toName || 'your customer'} now.</Say>
  <Dial>${to}</Dial>
</Response>`

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}
