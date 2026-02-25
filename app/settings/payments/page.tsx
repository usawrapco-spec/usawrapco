import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import PaymentSettings from '@/components/settings/PaymentSettings'
import { TopNav } from '@/components/layout/TopNav'

export const dynamic = 'force-dynamic'

export default async function PaymentsSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const stripeConfigured = !!(process.env.STRIPE_SECRET_KEY)
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null
  const webhookConfigured = !!(process.env.STRIPE_WEBHOOK_SECRET)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav profile={profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        <PaymentSettings
          stripeConfigured={stripeConfigured}
          publishableKey={publishableKey}
          webhookConfigured={webhookConfigured}
          webhookUrl={`${appUrl}/api/payments/webhook`}
        />
      </main>
    </div>
  )
}
