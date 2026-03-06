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

  const { data: dealer } = await supabase
    .from('dealers')
    .select(`
      id, name, company_name, email, portal_token, commission_pct, portal_features,
      sales_rep_id,
      profiles:sales_rep_id ( name )
    `)
    .eq('portal_token', token)
    .eq('active', true)
    .single()

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
  }

  return <DealerPortalShell ctx={ctx}>{children}</DealerPortalShell>
}
