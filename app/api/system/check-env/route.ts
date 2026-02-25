import { NextResponse } from 'next/server'

export async function GET() {
  const isConfigured = (val: string | undefined) =>
    !!val && !val.startsWith('PLACEHOLDER')

  const checks = {
    resend: isConfigured(process.env.RESEND_API_KEY),
    twilio_sid: isConfigured(process.env.TWILIO_ACCOUNT_SID),
    twilio_token: isConfigured(process.env.TWILIO_AUTH_TOKEN),
    twilio_phone: isConfigured(process.env.TWILIO_PHONE_NUMBER),
    anthropic: isConfigured(process.env.ANTHROPIC_API_KEY),
    stripe: isConfigured(process.env.STRIPE_SECRET_KEY),
    supabase_service: isConfigured(process.env.SUPABASE_SERVICE_ROLE_KEY),
    supabase_url: isConfigured(process.env.NEXT_PUBLIC_SUPABASE_URL),
  }

  return NextResponse.json(checks)
}
