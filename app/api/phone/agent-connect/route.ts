import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    USA Wrap Co incoming call. Press any key to answer.
  </Say>
  <Gather numDigits="1" action="/api/phone/agent-accept" method="POST" timeout="5">
  </Gather>
</Response>`
  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}
