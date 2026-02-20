import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import type { Profile, Project } from '@/types'
import CalendarPageClient from '@/components/calendar/CalendarPage'

export default async function CalendarPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  let query = supabase
    .from('projects')
    .select(`
      *,
      agent:agent_id(id, name),
      installer:installer_id(id, name),
      customer:customer_id(id, name)
    `)
    .eq('org_id', profile.org_id)
    .not('status', 'in', '(closed,cancelled)')
    .order('install_date', { ascending: true })

  if (profile.role === 'installer') query = query.eq('installer_id', user.id)

  const { data: projects } = await query

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar profile={profile as Profile} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-6">
          <CalendarPageClient
            profile={profile as Profile}
            projects={(projects as Project[]) || []}
          />
        </main>
      </div>
    </div>
  )
}
