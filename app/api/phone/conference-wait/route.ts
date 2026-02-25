import { NextResponse } from 'next/server'

// TwiML returned as the waitUrl for conference hold
// Plays the royalty-free bensound ukulele track
export async function GET() {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play loop="10">https://www.bensound.com/bensound-music/bensound-ukulele.mp3</Play>
</Response>`
  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}

export async function POST() {
  return GET()
}
