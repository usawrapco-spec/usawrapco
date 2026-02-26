import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import PrintScheduleClient from '@/components/production/PrintScheduleClient'

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
          <PrintScheduleClient
            profile={profile as Profile}
            jobs={jobs || []}
          />
        </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
