import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import UnifiedJobBoard from '@/components/pipeline/UnifiedJobBoard'
import type { Profile, Project } from '@/types'

export default async function PipelinePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  let query = admin
    .from('projects')
    .select(`
      *,
      agent:agent_id(id, name, email),
      installer:installer_id(id, name, email),
      customer:customer_id(id, name, email)
    `)
    .eq('org_id', orgId)

  if (profile.role === 'installer') {
    query = query.eq('installer_id', user.id)
  }

  const { data: projects } = await query

  // Attach render counts
  const { data: renderCounts } = await admin
    .from('job_renders')
    .select('project_id')
    .eq('org_id', orgId)
    .eq('status', 'succeeded')

  const countByJob: Record<string, number> = {}
  for (const r of renderCounts || []) {
    countByJob[r.project_id] = (countByJob[r.project_id] || 0) + 1
  }

  const projectsWithRenderCount = (projects || []).map((p: any) => ({
    ...p,
    render_count: countByJob[p.id] || 0,
  }))

  return (
    <UnifiedJobBoard
      profile={profile as Profile}
      initialProjects={projectsWithRenderCount as Project[]}
      orgId={orgId}
    />
  )
}
