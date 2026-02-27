import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import InstallerMobilePortal from '@/components/installer/InstallerMobilePortal'

export default async function InstallerPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const allowed = ['owner', 'admin', 'installer']
  if (!allowed.includes(profile.role)) redirect('/dashboard')

  const orgId = profile.org_id || ORG_ID
  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  // Week start (Monday) for the weekly hours total
  const nowDate = new Date()
  const dayOfWeek = nowDate.getDay() // 0=Sun
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStartDate = new Date(nowDate)
  weekStartDate.setDate(nowDate.getDate() + diffToMon)
  weekStartDate.setHours(0, 0, 0, 0)
  const weekStartStr = weekStartDate.toISOString()

  const [
    { data: todayJobs },
    { data: upcomingJobs },
    { data: myJobs },
    { data: activeEntry },
    { data: availableJobs },
    { data: myBids },
    { data: weekEntries },
    { data: supplyRequests },
  ] = await Promise.all([
    // Today's jobs for this installer
    admin.from('projects')
      .select('id, title, vehicle_desc, form_data, install_date, pipe_stage, install_address, installer_id, status')
      .eq('installer_id', user.id)
      .eq('install_date', today)
      .order('install_date'),

    // Upcoming jobs (next 7 days)
    admin.from('projects')
      .select('id, title, vehicle_desc, form_data, install_date, pipe_stage, install_address, installer_id, status')
      .eq('installer_id', user.id)
      .gt('install_date', today)
      .lte('install_date', nextWeek)
      .order('install_date'),

    // All assigned jobs
    admin.from('projects')
      .select('id, title, vehicle_desc, form_data, fin_data, install_date, pipe_stage, status, install_address, installer_id, checkout')
      .eq('installer_id', user.id)
      .order('install_date', { ascending: false, nullsFirst: false })
      .limit(100),

    // Active clock entry (clocked in, no clock_out)
    admin.from('time_clock_entries')
      .select('*')
      .eq('user_id', user.id)
      .is('clock_out', null)
      .maybeSingle(),

    // Available jobs (install stage, no installer assigned)
    admin.from('projects')
      .select('id, title, vehicle_desc, form_data, fin_data, install_date, pipe_stage, install_address, status')
      .eq('org_id', orgId)
      .eq('pipe_stage', 'install')
      .is('installer_id', null)
      .order('install_date')
      .limit(30),

    // My bids
    admin.from('installer_bids')
      .select('*, project:project_id(id, title, vehicle_desc, install_date)')
      .eq('installer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),

    // This week's clock entries (for weekly hours total + today's display)
    admin.from('time_clock_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('clock_in', weekStartStr)
      .order('clock_in', { ascending: false }),

    // My supply requests
    admin.from('supply_requests')
      .select('*, project:project_id(id, title)')
      .eq('requested_by', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 80, display: 'flex', flexDirection: 'column' }}>
        <InstallerMobilePortal
          profile={profile as Profile}
          todayJobs={todayJobs || []}
          upcomingJobs={upcomingJobs || []}
          myJobs={myJobs || []}
          activeEntry={activeEntry || null}
          availableJobs={availableJobs || []}
          myBids={myBids || []}
          weekEntries={weekEntries || []}
          supplyRequests={supplyRequests || []}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
