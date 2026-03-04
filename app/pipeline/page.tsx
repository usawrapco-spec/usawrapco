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

  // Attach connection counts
  const { data: connections } = await admin
    .from('job_connections')
    .select('job_a, job_b')

  const connByJob: Record<string, string[]> = {}
  for (const c of connections || []) {
    if (!connByJob[c.job_a]) connByJob[c.job_a] = []
    if (!connByJob[c.job_b]) connByJob[c.job_b] = []
    connByJob[c.job_a].push(c.job_b)
    connByJob[c.job_b].push(c.job_a)
  }

  const projectsWithRenderCount = (projects || []).map((p: any) => ({
    ...p,
    render_count: countByJob[p.id] || 0,
    connected_job_ids: connByJob[p.id] || [],
  }))

  return (
    <UnifiedJobBoard
      profile={profile as Profile}
      initialProjects={projectsWithRenderCount as Project[]}
      orgId={orgId}
    />
  )
}
