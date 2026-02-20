import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { canAccess } from '@/types'
import type { Profile } from '@/types'
import { EmployeesClient } from '@/components/employees/EmployeesClient'

export default async function EmployeesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  if (!canAccess(profile.role, 'manage_users')) {
    return (
      <div className="flex h-screen bg-bg overflow-hidden">
        <Sidebar profile={profile as Profile} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar profile={profile as Profile} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="card text-center py-16 max-w-md mx-auto">
              <div className="text-4xl mb-3">🔒</div>
              <div className="text-lg font-700 text-text1">Access Restricted</div>
              <div className="text-sm text-text3 mt-1">Only admins can manage team members.</div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('role')
    .order('name')

  // Build project counts: count active projects where each member is agent, installer, or customer
  const projectCounts: Record<string, number> = {}
  const { data: agentCounts } = await supabase
    .from('projects')
    .select('agent_id')
    .eq('org_id', profile.org_id)
    .not('status', 'in', '("closed","cancelled")')
    .not('agent_id', 'is', null)
  const { data: installerCounts } = await supabase
    .from('projects')
    .select('installer_id')
    .eq('org_id', profile.org_id)
    .not('status', 'in', '("closed","cancelled")')
    .not('installer_id', 'is', null)

  agentCounts?.forEach(p => {
    if (p.agent_id) projectCounts[p.agent_id] = (projectCounts[p.agent_id] || 0) + 1
  })
  installerCounts?.forEach(p => {
    if (p.installer_id) projectCounts[p.installer_id] = (projectCounts[p.installer_id] || 0) + 1
  })

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar profile={profile as Profile} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-6">
          <EmployeesClient
            profile={profile as Profile}
            initialMembers={(members as Profile[]) || []}
            projectCounts={projectCounts}
          />
        </main>
      </div>
    </div>
  )
}
