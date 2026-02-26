import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types'
import RevenueReportClient from '@/components/reports/RevenueReportClient'

export default async function RevenueReportPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  // Fetch revenue data from invoices
  let revenueData: any[] = []
  let totalRevenue = 0
  let totalPaid = 0

  try {
    const { data: invoices } = await admin
      .from('invoices')
      .select('invoice_number, invoice_date, customer_id, total, amount_paid, status')
      .eq('org_id', orgId)
      .order('invoice_date', { ascending: false })
      .limit(500)

    if (invoices) {
      revenueData = invoices
      totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      totalPaid = invoices.filter(inv => inv.status === 'paid' || inv.status === 'partial')
        .reduce((sum, inv) => sum + (inv.amount_paid || 0), 0)
    }
  } catch (err) {
    console.error('[revenue report] fetch error:', err)
  }

  return (
    <RevenueReportClient
      profile={profile as Profile}
      revenueData={revenueData}
      totalRevenue={totalRevenue}
      totalPaid={totalPaid}
    />
  )
}
