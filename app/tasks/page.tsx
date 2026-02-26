import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile, Project } from '@/types'
import { TasksClient } from '@/components/tasks/TasksClient'

export default async function TasksPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  // Load active projects with agent + installer info
  const { data: projects } = await admin
    .from('projects')
    .select(`
      *,
      agent:agent_id(id, name, email),
      installer:installer_id(id, name, email),
      send_backs:send_backs(*)
    `)
    .eq('org_id', orgId)
    .neq('pipe_stage', 'done')
    .order('updated_at', { ascending: false })
    .limit(200)

  // Load teammates (all profiles in org)
  const { data: teammates } = await admin
    .from('profiles')
    .select('id, name, role')
    .eq('org_id', orgId)
    .neq('role', 'viewer')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <TasksClient
          profile={profile as Profile}
          projects={(projects as Project[]) || []}
          teammates={(teammates || []).map(t => ({ id: t.id, name: t.name || '', role: t.role as any }))}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
