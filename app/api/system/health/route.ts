import { NextResponse } from 'next/server'

// Returns true/false per service — never exposes actual key values
export async function GET() {
  const isSet = (key: string) => {
    const val = process.env[key]
    return !!val && !val.startsWith('PLACEHOLDER')
  }

  return NextResponse.json({
    stripe:    isSet('STRIPE_SECRET_KEY'),
    anthropic: isSet('ANTHROPIC_API_KEY'),
    twilio:    isSet('TWILIO_ACCOUNT_SID') && isSet('TWILIO_AUTH_TOKEN'),
    resend:    isSet('RESEND_API_KEY'),
    supabase:  isSet('SUPABASE_SERVICE_ROLE_KEY'),
  })
}
