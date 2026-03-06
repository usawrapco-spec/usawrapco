import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import DealerHome from '@/components/portal/DealerHome'
import type { DealerCtx } from '@/components/portal/DealerPortalShell'
import { DEFAULT_PORTAL_FEATURES } from '@/components/portal/DealerPortalShell'

export const dynamic = 'force-dynamic'

export default async function DealerPortalPage({ params }: { params: { token: string } }) {
  const supabase = getSupabaseAdmin()

  const { data: dealer } = await supabase
    .from('dealers')
    .select(`
      id, name, company_name, portal_token, commission_pct, portal_features,
      profiles:sales_rep_id ( name )
    `)
    .eq('portal_token', params.token)
    .eq('active', true)
    .single()

  if (!dealer) notFound()

  const [referralsRes, unreadRes] = await Promise.all([
    supabase
      .from('dealer_referrals')
      .select('id, customer_name, vehicle_desc, status, commission_amount, commission_pct, created_at, project_id')
      .eq('dealer_id', dealer.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('dealer_messages')
      .select('channel')
      .eq('dealer_id', dealer.id)
      .eq('read_dealer', false),
  ])

  const unread = (unreadRes.data || []).reduce(
    (acc, r) => {
      if (r.channel === 'dealer_shop') acc.dealer_shop++
      else if (r.channel === 'group') acc.group++
      else if (r.channel === 'customer_shop') acc.customer_shop++
      return acc
    },
    { dealer_shop: 0, group: 0, customer_shop: 0 }
  )

  const ctx: DealerCtx = {
    id: dealer.id,
    name: dealer.name,
    company_name: dealer.company_name,
    email: null,
    token: dealer.portal_token,
    sales_rep_name: (dealer.profiles as any)?.name ?? null,
    commission_pct: dealer.commission_pct ?? 2.5,
    unread_shop: unread.dealer_shop,
    unread_customer: unread.customer_shop,
    unread_group: unread.group,
    portal_features: { ...DEFAULT_PORTAL_FEATURES, ...((dealer as any).portal_features || {}) },
  }

  return <DealerHome ctx={ctx} referrals={referralsRes.data || []} />
}
