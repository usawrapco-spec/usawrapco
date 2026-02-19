import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { canAccess } from '@/types'
import type { Profile, Project } from '@/types'
import { DesignClient } from '@/components/design/DesignClient'

export default async function DesignPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  if (!canAccess(profile.role, 'access_design_studio')) {
    return (
      <div className="flex h-screen bg-bg overflow-hidden">
        <Sidebar profile={profile as Profile} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar profile={profile as Profile} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="card text-center py-16 max-w-md mx-auto">
              <div className="text-4xl mb-3">🔒</div>
              <div className="text-lg font-700 text-text1">Access Restricted</div>
              <div className="text-sm text-text3 mt-1">You don't have permission to access Design Studio.</div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const { data: projects } = await supabase
    .from('projects')
    .select(`*, agent:agent_id(id, name), customer:customer_id(id, name)`)
    .eq('org_id', profile.org_id)
    .not('status', 'in', '(closed,cancelled)')
    .order('updated_at', { ascending: false })

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar profile={profile as Profile} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-6">
          <DesignClient
            profile={profile as Profile}
            projects={(projects as Project[]) || []}
          />
        </main>
      </div>
    </div>
  )
}
