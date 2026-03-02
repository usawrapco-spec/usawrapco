import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    replicate: !!process.env.REPLICATE_API_TOKEN,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    twilio: !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    ),
  })
}
