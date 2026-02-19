import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { ProjectDetail } from '@/components/projects/ProjectDetail'
import type { Profile, Project } from '@/types'

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      agent:agent_id(id,name,email),
      installer:installer_id(id,name,email),
      customer:customer_id(id,name,email)
    `)
    .eq('id', params.id)
    .eq('org_id', profile.org_id)
    .single()

  if (error || !project) notFound()

  // Load teammates for assignment dropdowns
  const { data: teammates } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('org_id', profile.org_id)
    .eq('active', true)

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
