import { getSupabaseAdmin } from '@/lib/supabase/service'
import PortalShell from '@/components/portal/PortalShell'
import type { PortalContextValue } from '@/lib/portal-context'

export const dynamic = 'force-dynamic'

export default async function PortalTokenLayout({
  params,
  children,
}: {
  params: { token: string }
  children: React.ReactNode
}) {
  const { token } = params
  const supabase = getSupabaseAdmin()

  // ── Try customer portal_token first ────────────────────────────────────────
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, email, phone, portal_token, company_name, org_id')
    .eq('portal_token', token)
    .single()

  if (customer) {
    // Fetch customer's projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, title, vehicle_desc, pipe_stage, install_date, created_at, revenue, type, customer_id, is_mobile_install, install_address')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })

    const projectIds = (projects || []).map(p => p.id)

    // Fetch org name, fleet count, loyalty data, pending proofs, and unread messages in parallel
    const [orgRes, fleetRes, invoiceRes, redemptionRes, proofsRes, messagesRes] = await Promise.all([
      supabase.from('orgs').select('name').eq('id', customer.org_id).single(),
      supabase.from('fleet_vehicles').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).not('name', 'is', null),
      supabase.from('invoices').select('total').eq('customer_id', customer.id).eq('status', 'paid'),
      supabase.from('loyalty_redemptions').select('points_redeemed, status').eq('customer_id', customer.id),
      projectIds.length > 0
        ? supabase.from('design_proofs').select('id', { count: 'exact', head: true }).in('project_id', projectIds).eq('status', 'pending')
        : Promise.resolve({ count: 0 }),
      supabase.from('portal_messages').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).eq('read', false).eq('direction', 'inbound'),
    ])

    // Compute loyalty points balance
    const totalSpend = (invoiceRes.data || []).reduce((s, inv) => s + (inv.total || 0), 0)
    const totalEarned = Math.floor(totalSpend)
    const totalRedeemed = (redemptionRes.data || [])
      .filter((r: any) => r.status !== 'denied' && r.status !== 'rejected')
      .reduce((s: number, r: any) => s + (r.points_redeemed || 0), 0)
    const loyaltyPoints = Math.max(0, totalEarned - totalRedeemed)

    const ctx: PortalContextValue = {
      customer: {
        id: customer.id,
        name: customer.name || 'Customer',
        email: customer.email,
        phone: customer.phone,
        portal_token: customer.portal_token,
        company_name: customer.company_name,
      },
      token,
      orgName: orgRes.data?.name || 'USA Wrap Co',
      projects: projects || [],
      hasFleet: (fleetRes.count ?? 0) > 0,
      loyaltyPoints,
      pendingProofs: proofsRes.count ?? 0,
      unreadMessages: messagesRes.count ?? 0,
    }

    return (
      <>
        <PortalShell ctx={ctx}>{children}</PortalShell>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/portal-sw.js').catch(()=>{})}`,
          }}
        />
      </>
    )
  }

  // ── Not a customer token → pass through (project token or intake token) ────
  return <>{children}</>
}
