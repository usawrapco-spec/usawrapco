import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import PrintScheduleClient from '@/components/production/PrintScheduleClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function PrintSchedulePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const allowed = ['owner', 'admin', 'production']
  if (!allowed.includes(profile.role)) redirect('/production')

  const orgId = profile.org_id || ORG_ID

  // Load jobs in production or print queue
  const { data: jobs } = await admin
    .from('projects')
    .select('id, title, vehicle_desc, form_data, fin_data, install_date, pipe_stage, status, revenue')
    .eq('org_id', orgId)
    .in('pipe_stage', ['production', 'install'])
    .neq('status', 'cancelled')
    .order('install_date', { ascending: true, nullsFirst: false })
    .limit(50)

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar profile={profile as Profile} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <PrintScheduleClient
            profile={profile as Profile}
            jobs={jobs || []}
          />
        </main>
      </div>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
