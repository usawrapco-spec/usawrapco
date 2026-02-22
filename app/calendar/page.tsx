import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile, Project } from '@/types'
import CalendarPageClient from '@/components/calendar/CalendarPage'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function CalendarPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  let query = admin
    .from('projects')
    .select(`
      *,
      agent:agent_id(id, name),
      installer:installer_id(id, name),
      customer:customer_id(id, name)
    `)
    .eq('org_id', orgId)
    .not('status', 'in', '(closed,cancelled)')
    .order('install_date', { ascending: true })

  if (profile.role === 'installer') query = query.eq('installer_id', user.id)

  const { data: projects } = await query

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
          <CalendarPageClient
            profile={profile as Profile}
            projects={(projects as Project[]) || []}
          />
        </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
