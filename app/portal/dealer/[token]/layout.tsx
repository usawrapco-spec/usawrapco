import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import DealerPortalShell from '@/components/portal/DealerPortalShell'
import type { DealerCtx } from '@/components/portal/DealerPortalShell'
import { DEFAULT_PORTAL_FEATURES } from '@/components/portal/DealerPortalShell'

export const dynamic = 'force-dynamic'

export default async function DealerPortalLayout({
  params,
  children,
}: {
  params: { token: string }
  children: React.ReactNode
}) {
  const supabase = getSupabaseAdmin()
  const { token } = params

  // Fetch dealer — try with branding columns first, fall back without them
  let dealer: any = null
  const brandingCols = ', logo_url, brand_color, tagline, primary_app'
  const baseCols = 'id, name, company_name, email, portal_token, commission_pct, portal_features, share_estimates, commission_rules, sales_rep_id, profiles:sales_rep_id ( name )'

  const { data: d1, error: e1 } = await supabase
    .from('dealers')
    .select(baseCols + brandingCols)
    .eq('portal_token', token)
    .eq('active', true)
    .single()

  if (d1) {
    dealer = d1
  } else if (e1?.code === '42703') {
    // Branding columns don't exist yet — query without them
    const { data: d2 } = await supabase
      .from('dealers')
      .select(baseCols)
      .eq('portal_token', token)
      .eq('active', true)
      .single()
    dealer = d2
  }

  if (!dealer) notFound()

  // Unread message counts per channel
  const { data: unreadRows } = await supabase
    .from('dealer_messages')
    .select('channel')
    .eq('dealer_id', dealer.id)
    .eq('read_dealer', false)

  const unread = (unreadRows || []).reduce(
    (acc, r) => {
      if (r.channel === 'dealer_shop') acc.dealer_shop++
      else if (r.channel === 'group') acc.group++
      else if (r.channel === 'customer_shop') acc.customer_shop++
      return acc
    },
    { dealer_shop: 0, group: 0, customer_shop: 0 }
  )

  // Calculate total earned from referrals (display_amount or commission_amount)
  const { data: earningsRows } = await supabase
    .from('dealer_referrals')
    .select('display_amount, commission_amount')
    .eq('dealer_id', dealer.id)
    .in('status', ['complete', 'paid'])

  const totalEarned = (earningsRows || []).reduce((sum, r) =>
    sum + (r.display_amount ?? r.commission_amount ?? 0), 0)

  const ctx: DealerCtx = {
    id: dealer.id,
    name: dealer.name,
    company_name: dealer.company_name,
    email: dealer.email,
    token: dealer.portal_token,
    sales_rep_name: (dealer.profiles as any)?.name ?? null,
    commission_pct: dealer.commission_pct ?? 2.5,
    unread_shop: unread.dealer_shop,
    unread_customer: unread.customer_shop,
    unread_group: unread.group,
    portal_features: { ...DEFAULT_PORTAL_FEATURES, ...(dealer.portal_features || {}) },
    logo_url: dealer.logo_url ?? null,
    brand_color: dealer.brand_color ?? null,
    tagline: dealer.tagline ?? null,
    primary_app: dealer.primary_app ?? null,
    share_estimates: dealer.share_estimates ?? false,
    total_earned: totalEarned,
  }

  return <DealerPortalShell ctx={ctx}>{children}</DealerPortalShell>
}
