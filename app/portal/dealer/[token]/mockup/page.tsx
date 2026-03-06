import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import DealerMockupPage from '@/components/portal/DealerMockupPage'

export const dynamic = 'force-dynamic'

export default async function DealerMockup({ params }: { params: { token: string } }) {
  const supabase = getSupabaseAdmin()

  const { data: dealer } = await supabase
    .from('dealers')
    .select('id, name, portal_token, commission_pct')
    .eq('portal_token', params.token)
    .eq('active', true)
    .single()

  if (!dealer) notFound()

  return (
    <DealerMockupPage
      dealerId={dealer.id}
      dealerName={dealer.name}
      token={dealer.portal_token}
      commissionPct={dealer.commission_pct ?? 2.5}
    />
  )
}
