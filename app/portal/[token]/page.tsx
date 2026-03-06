import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'
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

  if (!customer) {
    // ── Try project portal_token → redirect to customer portal ──────────
    const { data: project } = await supabase
      .from('projects')
      .select('id, customer_id')
      .eq('portal_token', token)
      .single()

    if (project?.customer_id) {
      const { data: projCustomer } = await supabase
        .from('customers')
        .select('portal_token')
        .eq('id', project.customer_id)
        .single()

      if (projCustomer?.portal_token) {
        redirect(`/portal/${projCustomer.portal_token}`)
      }
      // Generate portal_token if missing
      if (projCustomer && !projCustomer.portal_token) {
        const newToken = crypto.randomUUID()
        await supabase.from('customers').update({ portal_token: newToken }).eq('id', project.customer_id)
        redirect(`/portal/${newToken}`)
      }
    }

    // No matching token at all
    notFound()
  }

  // Customer found — render the new multi-page portal home
  {
    // Get project IDs first
    const { data: custProjects } = await supabase
      .from('projects')
      .select('id, form_data')
      .eq('customer_id', customer.id)

    const projectIds = (custProjects || []).map((p: any) => p.id)

    // Get estimate IDs for proposal lookup
    const { data: custEstimates } = await supabase
      .from('estimates')
      .select('id')
      .eq('customer_id', customer.id)
    const estimateIds = (custEstimates || []).map((e: any) => e.id)

    // Fetch dashboard data in parallel
    const [activityRes, invoiceRes, proofsRes, photosRes, proposalsRes] = await Promise.all([
      supabase
        .from('activity_log')
        .select('id, action, details, created_at')
        .eq('entity_id', customer.id)
        .eq('entity_type', 'customer')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('invoices')
        .select('balance_due')
        .eq('customer_id', customer.id)
        .in('status', ['open', 'sent', 'partial', 'overdue']),
      projectIds.length > 0
        ? supabase
            .from('design_proofs')
            .select('id, project_id')
            .eq('customer_status', 'pending')
            .in('project_id', projectIds)
        : Promise.resolve({ data: [] }),
      projectIds.length > 0
        ? supabase
            .from('job_images')
            .select('project_id')
            .in('project_id', projectIds)
        : Promise.resolve({ data: [] }),
      estimateIds.length > 0
        ? supabase
            .from('proposals')
            .select('id, title, status')
            .in('estimate_id', estimateIds)
            .in('status', ['sent', 'viewed'])
        : Promise.resolve({ data: [] }),
    ])

    const invoiceBalance = (invoiceRes.data || []).reduce((sum: number, inv: any) => sum + (inv.balance_due || 0), 0)

    // Build photo counts per project
    const photoCounts: Record<string, number> = {}
    for (const p of (photosRes.data || [])) {
      photoCounts[p.project_id] = (photoCounts[p.project_id] || 0) + 1
    }

    // Build form_data map for timeline
    const formDataMap: Record<string, Record<string, any>> = {}
    for (const p of (custProjects || [])) {
      if ((p as any).form_data) formDataMap[p.id] = (p as any).form_data
    }

    return (
      <PortalHomePage
        recentActivity={(activityRes.data || []) as any[]}
        invoiceBalance={invoiceBalance}
        proofsPending={(proofsRes.data || []).length}
        photoCounts={photoCounts}
        formDataMap={formDataMap}
        pendingProposals={(proposalsRes.data || []) as any[]}
      />
    )
  }
}
