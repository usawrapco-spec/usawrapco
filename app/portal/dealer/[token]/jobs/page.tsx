import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import DealerJobsList from '@/components/portal/DealerJobsList'

export const dynamic = 'force-dynamic'

export default async function DealerJobsPage({ params }: { params: { token: string } }) {
  const supabase = getSupabaseAdmin()

  const { data: dealer } = await supabase
    .from('dealers')
    .select('id, name, portal_token, commission_pct')
    .eq('portal_token', params.token)
    .eq('active', true)
    .single()

  if (!dealer) notFound()

  const { data: referrals } = await supabase
    .from('dealer_referrals')
    .select(`
      id, customer_name, vehicle_desc, status,
      commission_amount, commission_pct, created_at,
      project_id, paid, notes
    `)
    .eq('dealer_id', dealer.id)
    .order('created_at', { ascending: false })

  return (
    <DealerJobsList
      token={dealer.portal_token}
      defaultCommission={dealer.commission_pct ?? 2.5}
      referrals={referrals || []}
    />
  )
}
