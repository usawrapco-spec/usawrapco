import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import DealerReferralsClient from './DealerReferralsClient'

export const dynamic = 'force-dynamic'

export default async function DealerReferralsPage({
  params,
}: {
  params: { token: string }
}) {
  const supabase = getSupabaseAdmin()
  const { token } = params

  const { data: dealer } = await supabase
    .from('dealers')
    .select('id, name, company_name, portal_token, commission_pct')
    .eq('portal_token', token)
    .eq('active', true)
    .single()

  if (!dealer) notFound()

  // Get referral history
  const { data: referrals } = await supabase
    .from('dealer_referrals')
    .select('id, customer_name, vehicle_desc, status, commission_amount, created_at')
    .eq('dealer_id', dealer.id)
    .order('created_at', { ascending: false })

  const shareUrl = `https://app.usawrapco.com/portal/dealer/${dealer.portal_token}/mockup`

  return (
    <DealerReferralsClient
      dealerName={dealer.company_name || dealer.name}
      commissionPct={dealer.commission_pct ?? 2.5}
      shareUrl={shareUrl}
      referrals={(referrals || []) as any[]}
    />
  )
}
