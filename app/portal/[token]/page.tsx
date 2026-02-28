import { getSupabaseAdmin } from '@/lib/supabase/service'
import ProjectPortalClient from '@/components/portal/ProjectPortalClient'
import CustomerPortalHome from '@/components/portal/CustomerPortalHome'
import PortalHomePage from '@/components/portal/PortalHomePage'

export const dynamic = 'force-dynamic'

export default async function PortalTokenPage({
  params,
}: {
  params: { token: string }
}) {
  const { token } = params
  const supabase = getSupabaseAdmin()

  // ── Try customer portal_token FIRST (new multi-page portal) ────────────
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, org_id')
    .eq('portal_token', token)
    .single()

  if (customer) {
    // Fetch dashboard data
    const [activityRes, invoiceRes, proofsRes] = await Promise.all([
      supabase
        .from('activity_log')
        .select('id, action, details, created_at')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('invoices')
        .select('balance')
        .eq('customer_id', customer.id)
        .in('status', ['open', 'sent', 'partial', 'overdue']),
      supabase
        .from('design_proofs')
        .select('id, project_id')
        .eq('customer_status', 'pending')
        .in('project_id', (
          await supabase
            .from('projects')
            .select('id')
            .eq('customer_id', customer.id)
        ).data?.map((p: any) => p.id) || []),
    ])

    const invoiceBalance = (invoiceRes.data || []).reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0)

    return (
      <PortalHomePage
        recentActivity={(activityRes.data || []) as any[]}
        invoiceBalance={invoiceBalance}
        proofsPending={(proofsRes.data || []).length}
      />
    )
  }

  // ── Try project portal_token ───────────────────────────────────────────
  const { data: project } = await supabase
    .from('projects')
    .select(
      'id, title, vehicle_desc, pipe_stage, install_date, install_address, is_mobile_install, warranty_years, warranty_expiry, install_completed_date, portal_token, org_id, type, revenue, notes, agent_id, customer_id'
    )
    .eq('portal_token', token)
    .single()

  if (project) {
    const customerId = (project as any).customer_id as string | null

    const [customerRes, estimateRes, proofRes, photoRes, invoiceRes, messagesRes] =
      await Promise.all([
        customerId
          ? supabase
              .from('customers')
              .select('id, name, email, phone')
              .eq('id', customerId)
              .single()
          : Promise.resolve({ data: null, error: null }),
        customerId
          ? supabase
              .from('estimates')
              .select(
                'id, estimate_number, title, subtotal, discount_percent, tax_percent, tax_amount, total, notes, status, line_items'
              )
              .eq('customer_id', customerId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from('design_proofs')
          .select(
            'id, image_url, thumbnail_url, version_number, customer_status, designer_notes, created_at'
          )
          .eq('project_id', (project as any).id)
          .order('version_number', { ascending: false }),
        supabase
          .from('job_images')
          .select('id, image_url, category, description, created_at')
          .eq('project_id', (project as any).id)
          .order('created_at', { ascending: false }),
        customerId
          ? supabase
              .from('invoices')
              .select(
                'id, invoice_number, total, amount_paid, balance, status, due_date, invoice_date'
              )
              .eq('customer_id', customerId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from('portal_messages')
          .select('id, sender_name, body, direction, created_at')
          .eq('project_id', (project as any).id)
          .order('created_at', { ascending: true }),
      ])

    // Load line items — try line_items table first, fall back to estimate JSON
    let lineItems: any[] = []
    const est = (estimateRes as any).data
    if (est?.id) {
      const { data: li } = await supabase
        .from('line_items')
        .select('id, name, description, quantity, unit_price, total_price, sort_order')
        .eq('parent_id', est.id)
        .order('sort_order', { ascending: true })
      lineItems = li && li.length > 0 ? li : Array.isArray(est.line_items) ? est.line_items : []
    }

    const { data: org } = await supabase
      .from('orgs')
      .select('name')
      .eq('id', (project as any).org_id)
      .single()

    return (
      <ProjectPortalClient
        project={project as any}
        customer={(customerRes as any).data}
        estimate={est}
        lineItems={lineItems}
        proofs={((proofRes as any).data || []) as any[]}
        photos={((photoRes as any).data || []) as any[]}
        invoice={(invoiceRes as any).data}
        messages={((messagesRes as any).data || []) as any[]}
        orgName={org?.name || 'USA Wrap Co'}
      />
    )
  }

  // ── Fall back to legacy intake-token portal ───────────────────────────────
  return <CustomerPortalHome token={token} />
}
