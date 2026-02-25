import { NextResponse } from 'next/server'

interface SystemAlert {
  id: string
  severity: 'error' | 'warning' | 'info'
  title: string
  message: string
  fixPath?: string
}

export async function GET() {
  const alerts: SystemAlert[] = []

  // Check server-side env vars
  const checks = [
    {
      key: 'STRIPE_SECRET_KEY',
      id: 'stripe-secret',
      severity: 'warning' as const,
      title: 'Stripe Payments Disabled',
      message: 'Add STRIPE_SECRET_KEY to .env.local to enable invoice payments.',
      fixPath: '/settings/payments',
    },
    {
      key: 'TWILIO_ACCOUNT_SID',
      id: 'twilio-sid',
      severity: 'warning' as const,
      title: 'SMS/Calls Disabled',
      message: 'Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to enable SMS messaging.',
      fixPath: '/settings/phone',
    },
    {
      key: 'ANTHROPIC_API_KEY',
      id: 'anthropic-key',
      severity: 'error' as const,
      title: 'AI Features Offline',
      message: 'ANTHROPIC_API_KEY missing — V.I.N.Y.L. AI assistant and all AI features are disabled.',
      fixPath: '/settings/ai',
    },
  ]

  for (const check of checks) {
    const val = process.env[check.key]
    if (!val || val.includes('PLACEHOLDER')) {
      alerts.push({
        id: check.id,
        severity: check.severity,
        title: check.title,
        message: check.message,
        fixPath: check.fixPath,
      })
    }
  }

  return NextResponse.json({ alerts })
}
