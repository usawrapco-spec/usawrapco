import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Auth-gated endpoint — check which Stripe env vars are configured
// Visit: GET /api/stripe/config-check (must be logged in)
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const checks = {
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_API_KEY: !!process.env.STRIPE_API_KEY,
    STRIPE_KEY: !!process.env.STRIPE_KEY,
    STRIPE_SECRET: !!process.env.STRIPE_SECRET,
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_WEBHOOK_SIGNING_SECRET: !!process.env.STRIPE_WEBHOOK_SIGNING_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '(not set)',
    NODE_ENV: process.env.NODE_ENV,
  }

  const hasAnyKey = checks.STRIPE_SECRET_KEY || checks.STRIPE_API_KEY || checks.STRIPE_KEY || checks.STRIPE_SECRET

  return NextResponse.json({
    configured: hasAnyKey,
    checks,
    message: hasAnyKey
      ? 'Stripe key found'
      : 'No Stripe key found. Add STRIPE_SECRET_KEY to Vercel Environment Variables and redeploy.',
  })
}
