import { getSupabaseAdmin } from '@/lib/supabase/service'
import PortalUploadCenter from '@/components/portal/PortalUploadCenter'

export const dynamic = 'force-dynamic'

export default async function PortalUploadPage({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams: { project?: string }
}) {
  const { token } = params
  const supabase = getSupabaseAdmin()

  // Validate customer token
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, org_id')
    .eq('portal_token', token)
    .single()

  if (!customer) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#8a8fa8' }}>Invalid portal link.</div>
  }

  // Fetch active projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, vehicle_desc, pipe_stage')
    .eq('customer_id', customer.id)
    .neq('pipe_stage', 'done')
    .order('created_at', { ascending: false })

  // Fetch existing photos per project
  const projectIds = (projects || []).map(p => p.id)
  let existingPhotos: Record<string, { category: string; image_url: string }[]> = {}

  if (projectIds.length > 0) {
    const { data: photos } = await supabase
      .from('job_images')
      .select('project_id, category, image_url')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })

    if (photos) {
      for (const p of photos) {
        if (!existingPhotos[p.project_id]) existingPhotos[p.project_id] = []
        existingPhotos[p.project_id].push({ category: p.category, image_url: p.image_url })
      }
    }
  }

  return (
    <PortalUploadCenter
      token={token}
      orgId={customer.org_id}
      projects={projects || []}
      existingPhotos={existingPhotos}
      preselectedProjectId={searchParams.project || null}
    />
  )
}
