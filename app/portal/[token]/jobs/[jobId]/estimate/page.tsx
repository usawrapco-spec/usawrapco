import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import PortalDocumentView from '@/components/portal/PortalDocumentView'

export const dynamic = 'force-dynamic'

export default async function PortalEstimatePage({
  params,
}: {
  params: { token: string; jobId: string }
}) {
  const { token, jobId } = params
  const supabase = getSupabaseAdmin()

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, email, phone, company_name')
    .eq('portal_token', token)
    .single()

  if (!customer) return notFound()

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, vehicle_desc, customer_id')
    .eq('id', jobId)
    .eq('customer_id', customer.id)
    .single()

  if (!project) return notFound()

  // Fetch the most recent estimate linked to this project
  const { data: estimate } = await supabase
    .from('estimates')
    .select('*, line_items(*)')
    .eq('project_id', jobId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Fallback: try by customer
  const { data: orgRes } = await supabase
    .from('orgs')
    .select('name, phone, email, address')
    .limit(1)
    .single()

  return (
    <PortalDocumentView
      docType="estimate"
      customer={customer}
      project={project}
      document={estimate}
      orgName={orgRes?.name || 'USA Wrap Co'}
      orgPhone={orgRes?.phone || null}
      orgEmail={orgRes?.email || null}
      orgAddress={orgRes?.address || null}
      token={token}
    />
  )
}
