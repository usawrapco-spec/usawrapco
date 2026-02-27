import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import PortalJobDetail from '@/components/portal/PortalJobDetail'

export const dynamic = 'force-dynamic'

export default async function PortalJobDetailPage({
  params,
}: {
  params: { token: string; jobId: string }
}) {
  const { token, jobId } = params
  const supabase = getSupabaseAdmin()

  // Verify customer owns this token
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('portal_token', token)
    .single()

  if (!customer) return notFound()

  // Verify project belongs to this customer
  const { data: project } = await supabase
    .from('projects')
    .select('id, title, vehicle_desc, pipe_stage, install_date, install_address, is_mobile_install, install_completed_date, warranty_years, warranty_expiry, created_at, revenue, type, customer_id, notes')
    .eq('id', jobId)
    .eq('customer_id', customer.id)
    .single()

  if (!project) return notFound()

  const [photosRes, proofsRes, milestonesRes] = await Promise.all([
    supabase
      .from('job_images')
      .select('id, image_url, category, description, created_at')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('design_proofs')
      .select('id, image_url, version_number, customer_status, created_at')
      .eq('project_id', project.id)
      .order('version_number', { ascending: false }),
    supabase
      .from('stage_approvals')
      .select('id, stage, approved_by, approved_at, notes')
      .eq('project_id', project.id)
      .order('approved_at', { ascending: true }),
  ])

  return (
    <PortalJobDetail
      project={project as any}
      photos={(photosRes.data || []) as any[]}
      proofs={(proofsRes.data || []) as any[]}
      milestones={(milestonesRes.data || []) as any[]}
    />
  )
}
