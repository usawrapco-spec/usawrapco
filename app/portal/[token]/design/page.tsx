import { getSupabaseAdmin } from '@/lib/supabase/service'
import PortalDesignProofs from '@/components/portal/PortalDesignProofs'

export const dynamic = 'force-dynamic'

export default async function PortalDesignPage({ params }: { params: { token: string } }) {
  const { token } = params
  const supabase = getSupabaseAdmin()

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('portal_token', token)
    .single()

  if (!customer) return <div style={{ padding: 40, textAlign: 'center', color: '#9299b5' }}>Not found</div>

  // Get all projects for this customer
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title')
    .eq('customer_id', customer.id)

  const projectIds = (projects || []).map((p: any) => p.id)

  // Fetch all proofs across customer's projects
  const { data: proofs } = projectIds.length > 0
    ? await supabase
        .from('design_proofs')
        .select('id, project_id, image_url, thumbnail_url, version_number, customer_status, designer_notes, created_at')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  // Attach project title to each proof
  const projectMap = Object.fromEntries((projects || []).map((p: any) => [p.id, p.title]))
  const proofsWithProject = (proofs || []).map((proof: any) => ({
    ...proof,
    project_title: projectMap[proof.project_id] || 'Unknown Project',
  }))

  return <PortalDesignProofs proofs={proofsWithProject} />
}
