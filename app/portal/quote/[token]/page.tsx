import { getSupabaseAdmin } from '@/lib/supabase/service'
import CustomerJobPortalClient from '@/components/portal/CustomerJobPortalClient'

export default async function CustomerJobPortalPage({ params }: { params: { token: string } }) {
  const supabase = getSupabaseAdmin()

  let salesOrder: any = null
  let lineItems: any[] = []
  let projects: any[] = []
  let estimates: any[] = []
  let salesOrders: any[] = []
  let invoices: any[] = []
  let coupons: any[] = []
  let redemptions: any[] = []
  let customer: any = null
  let isDemo = false

  // Per-project nested data: { [projectId]: { proofs, photos, comments } }
  let projectData: Record<string, { proofs: any[]; photos: any[]; comments: any[] }> = {}

  try {
    // 1. Load sales order by portal token
    const { data: so } = await supabase
      .from('sales_orders')
      .select('*, customer:customers!customer_id(id, name, email, phone)')
      .eq('portal_token', params.token)
      .single()

    if (so) {
      salesOrder = so
      customer = so.customer
      lineItems = Array.isArray(so.line_items) ? so.line_items : []

      if (so.customer_id) {
        // 2. Load ALL data for this customer in parallel
        const [
          projectsRes,
          estimatesRes,
          salesOrdersRes,
          invoicesRes,
          couponsRes,
          redemptionsRes,
        ] = await Promise.all([
          supabase
            .from('projects')
            .select('id, title, vehicle_desc, pipe_stage, status, type, created_at, install_date, revenue, form_data, customer_id')
            .eq('customer_id', so.customer_id)
            .order('created_at', { ascending: false }),
          supabase
            .from('estimates')
            .select('id, estimate_number, title, subtotal, discount, discount_amount, tax_rate, tax_amount, total, status, quote_date, due_date, line_items, notes, customer_note')
            .eq('customer_id', so.customer_id)
            .order('created_at', { ascending: false }),
          supabase
            .from('sales_orders')
            .select('id, so_number, title, subtotal, discount, discount_amount, tax_rate, tax_amount, total, status, so_date, due_date, line_items, notes, portal_token')
            .eq('customer_id', so.customer_id)
            .order('created_at', { ascending: false }),
          supabase
            .from('invoices')
            .select('id, invoice_number, title, subtotal, discount, discount_amount, tax_rate, tax_amount, total, amount_paid, balance, balance_due, status, invoice_date, due_date, line_items, notes')
            .eq('customer_id', so.customer_id)
            .order('created_at', { ascending: false }),
          supabase
            .from('coupons')
            .select('*')
            .eq('active', true)
            .or(`customer_id.is.null,customer_id.eq.${so.customer_id}`),
          supabase
            .from('coupon_redemptions')
            .select('*, coupon:coupons(*)')
            .eq('customer_id', so.customer_id),
        ])

        projects = projectsRes.data || []
        estimates = estimatesRes.data || []
        salesOrders = salesOrdersRes.data || []
        invoices = invoicesRes.data || []
        coupons = (couponsRes.data || []).filter((c: any) => {
          if (c.valid_until && new Date(c.valid_until) < new Date()) return false
          if (c.usage_limit && c.times_used >= c.usage_limit) return false
          return true
        })
        redemptions = redemptionsRes.data || []

        // 3. Batch-load proofs/photos/comments for each project in parallel
        if (projects.length > 0) {
          const projectIds = projects.map((p: any) => p.id)
          const [proofsRes, photosRes, commentsRes] = await Promise.all([
            supabase
              .from('design_proofs')
              .select('id, file_url, version, status, created_at, feedback, project_id')
              .in('project_id', projectIds)
              .order('created_at', { ascending: false }),
            supabase
              .from('job_images')
              .select('id, file_name, image_url, category, created_at, project_id')
              .in('project_id', projectIds)
              .order('created_at', { ascending: false }),
            supabase
              .from('job_comments')
              .select('id, body, author_name, created_at, project_id')
              .in('project_id', projectIds)
              .order('created_at', { ascending: false }),
          ])

          const allProofs = proofsRes.data || []
          const allPhotos = photosRes.data || []
          const allComments = commentsRes.data || []

          for (const p of projects) {
            projectData[p.id] = {
              proofs: allProofs.filter((x: any) => x.project_id === p.id),
              photos: allPhotos.filter((x: any) => x.project_id === p.id),
              comments: allComments.filter((x: any) => x.project_id === p.id),
            }
          }
        }
      }
    }
  } catch {
    isDemo = true
  }

  if (!salesOrder) isDemo = true

  return (
    <CustomerJobPortalClient
      customer={customer}
      salesOrder={salesOrder}
      lineItems={lineItems}
      projects={projects}
      projectData={projectData}
      estimates={estimates}
      salesOrders={salesOrders}
      invoices={invoices}
      coupons={coupons}
      redemptions={redemptions}
      token={params.token}
      isDemo={isDemo}
    />
  )
}
