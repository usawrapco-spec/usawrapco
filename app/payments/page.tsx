export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import PaymentsClient from '@/components/payments/PaymentsClient'

export default async function PaymentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Admin/owner only
  if (profile.role !== 'owner' && profile.role !== 'admin') redirect('/dashboard')

  const orgId = profile.org_id || ORG_ID

  let payments: any[] = []
  try {
    const { data } = await admin
      .from('payments')
      .select('*, invoices(id, invoice_number, customer_id)')
      .eq('org_id', orgId)
      .order('payment_date', { ascending: false })
      .limit(500)
    payments = data || []
  } catch {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <PaymentsClient profile={profile as Profile} payments={payments} />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
