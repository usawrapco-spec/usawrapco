import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import DealerHome from '@/components/portal/DealerHome'
import type { DealerCtx } from '@/components/portal/DealerPortalShell'
import { DEFAULT_PORTAL_FEATURES } from '@/components/portal/DealerPortalShell'

export const dynamic = 'force-dynamic'

export default async function DealerPortalPage({ params }: { params: { token: string } }) {
  const supabase = getSupabaseAdmin()

  // Fetch dealer — try with branding columns, fall back without
  const baseCols = 'id, name, company_name, portal_token, commission_pct, portal_features, share_estimates, profiles:sales_rep_id ( name )'
  const brandingCols = ', logo_url, brand_color, tagline, primary_app'

  let dealer: any = null
  const { data: d1, error: e1 } = await supabase
    .from('dealers')
    .select(baseCols + brandingCols)
    .eq('portal_token', params.token)
    .eq('active', true)
    .single()

  if (d1) {
    dealer = d1
  } else if (e1?.code === '42703') {
    const { data: d2 } = await supabase
      .from('dealers')
      .select(baseCols)
      .eq('portal_token', params.token)
      .eq('active', true)
      .single()
    dealer = d2
  }

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

  const d = dealer as any
  const ctx: DealerCtx = {
    id: d.id,
    name: d.name,
    company_name: d.company_name,
    email: null,
    token: d.portal_token,
    sales_rep_name: d.profiles?.name ?? null,
    commission_pct: d.commission_pct ?? 2.5,
    unread_shop: unread.dealer_shop,
    unread_customer: unread.customer_shop,
    unread_group: unread.group,
    portal_features: { ...DEFAULT_PORTAL_FEATURES, ...(d.portal_features || {}) },
    logo_url: d.logo_url ?? null,
    brand_color: d.brand_color ?? null,
    tagline: d.tagline ?? null,
    primary_app: d.primary_app ?? null,
    share_estimates: d.share_estimates ?? false,
    total_earned: 0,
  }

  return <DealerHome ctx={ctx} referrals={referralsRes.data || []} />
}
