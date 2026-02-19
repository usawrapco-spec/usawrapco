import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { TasksClient } from '@/components/tasks/TasksClient'
import type { Profile, Project } from '@/types'

export default async function TasksPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Load active projects to generate tasks from
  let query = supabase
    .from('projects')
    .select(`*, agent:agent_id(id,name), installer:installer_id(id,name)`)
    .eq('org_id', profile.org_id)
    .not('status', 'in', '(closed,cancelled)')
    .order('updated_at', { ascending: false })

  if (profile.role === 'installer') query = query.eq('installer_id', user.id)
  else if (profile.role === 'sales')  query = query.eq('agent_id', user.id)

  const { data: projects } = await query

  // Load all profiles for task assignment reference
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
          <TasksClient
            profile={profile as Profile}
            projects={(projects as Project[]) || []}
            teammates={teammates || []}
          />
        </main>
      </div>
    </div>
  )
}
