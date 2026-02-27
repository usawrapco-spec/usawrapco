export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import SchedulePageClient from '@/components/schedule/SchedulePageClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function SchedulePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  // Fetch appointments
  const { data: appointments } = await admin
    .from('appointments')
    .select('*')
    .eq('org_id', orgId)
    .order('start_time', { ascending: true })

  // Fetch team members for assignment dropdown
  const { data: team } = await admin
    .from('profiles')
    .select('id, name, email, role')
    .eq('org_id', orgId)
    .eq('active', true)
    .order('name')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <SchedulePageClient
          profile={profile as Profile}
          initialAppointments={appointments || []}
          team={team || []}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
