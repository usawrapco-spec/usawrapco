import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { ProjectDetail } from '@/components/projects/ProjectDetail'
import type { Profile, Project } from '@/types'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use admin client so RLS never blocks the profile or project fetch
  const admin = getSupabaseAdmin()

  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Fetch project — use org_id from profile if set, fallback to ORG_ID constant
  const orgId = profile.org_id || ORG_ID
  let projectQuery = admin
    .from('projects')
    .select(`
      *,
      agent:agent_id(id,name,email),
      installer:installer_id(id,name,email),
      customer:customer_id(id,name,email)
    `)
    .eq('id', params.id)

  if (orgId) {
    projectQuery = projectQuery.eq('org_id', orgId)
  }

  const { data: project, error } = await projectQuery.single()

  if (error || !project) notFound()

  // Load teammates for assignment dropdowns
  const { data: teammates } = await admin
    .from('profiles')
    .select('id, name, role')
    .eq('org_id', orgId)
    .neq('role', 'viewer')

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar profile={profile as Profile} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-6">
          <ProjectDetail
            profile={profile as Profile}
            project={project as Project}
            teammates={teammates || []}
          />
        </main>
      </div>
    </div>
  )
}
