import { createClient } from '@/lib/supabase/server'
import CustomerJobPortalClient from '@/components/portal/CustomerJobPortalClient'

export default async function CustomerJobPortalPage({ params }: { params: { token: string } }) {
  const supabase = createClient()

  let salesOrder: any = null
  let lineItems: any[] = []
  let project: any = null
  let proofs: any[] = []
  let photos: any[] = []
  let comments: any[] = []
  let invoices: any[] = []
  let isDemo = false

  try {
    // 1. Load sales order by portal token
    const { data: so } = await supabase
      .from('sales_orders')
      .select('*, customer:customers!customer_id(id, contact_name, email, phone)')
      .eq('portal_token', params.token)
      .single()

    if (so) {
      salesOrder = so

      // 2. Line items for the sales order
      const { data: items } = await supabase
        .from('line_items')
        .select('*')
        .eq('parent_type', 'sales_order')
        .eq('parent_id', so.id)
        .order('sort_order')
      lineItems = items || []

      // 3. Find the linked project
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, title, vehicle_desc, pipe_stage, status, type, created_at, install_date, revenue, form_data')
        .or(`id.eq.${so.id},form_data->>sales_order_id.eq.${so.id}`)
        .limit(1)

      // Also try matching by customer + recent
      if (!projectData?.length && so.customer_id) {
        const { data: byCustomer } = await supabase
          .from('projects')
          .select('id, title, vehicle_desc, pipe_stage, status, type, created_at, install_date, revenue, form_data')
          .eq('customer_id', so.customer_id)
          .order('created_at', { ascending: false })
          .limit(1)
        if (byCustomer?.length) project = byCustomer[0]
      } else if (projectData?.length) {
        project = projectData[0]
      }

      // 4. Load project-related data if we have a project
      if (project) {
        const [proofRes, photoRes, commentRes] = await Promise.all([
          supabase
            .from('design_proofs')
            .select('id, file_url, version, status, created_at, feedback')
            .eq('project_id', project.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('job_images')
            .select('id, file_name, image_url, category, created_at')
            .eq('project_id', project.id)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('job_comments')
            .select('id, body, author_name, created_at')
            .eq('project_id', project.id)
            .order('created_at', { ascending: false })
            .limit(30),
        ])
        proofs = proofRes.data || []
        photos = photoRes.data || []
        comments = commentRes.data || []
      }

      // 5. Load invoices for the customer
      if (so.customer_id) {
        const { data: invData } = await supabase
          .from('invoices')
          .select('id, invoice_number, title, total, balance_due, status, due_date')
          .eq('customer_id', so.customer_id)
          .order('created_at', { ascending: false })
        invoices = invData || []
      }
    }
  } catch {
    isDemo = true
  }

  if (!salesOrder) isDemo = true

  return (
    <CustomerJobPortalClient
      salesOrder={salesOrder}
      lineItems={lineItems}
      project={project}
      proofs={proofs}
      photos={photos}
      comments={comments}
      invoices={invoices}
      token={params.token}
      isDemo={isDemo}
    />
  )
}
