import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import InstallerPortalClient from '@/components/installer/InstallerPortalClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function InstallerPortalPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  // Fetch this installer's bids
  const { data: myBids } = await admin
    .from('installer_bids')
    .select('*, project:project_id(id, title, vehicle_desc, form_data, fin_data, install_date, pipe_stage)')
    .eq('installer_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch open bids from org (available for all installers)
  const { data: openBids } = await admin
    .from('installer_bids')
    .select('*, project:project_id(id, title, vehicle_desc, form_data, fin_data, install_date, pipe_stage)')
    .eq('org_id', orgId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch active jobs assigned to this installer
  const { data: activeJobs } = await admin
    .from('projects')
    .select('id, title, vehicle_desc, form_data, fin_data, install_date, pipe_stage, status, checkout')
    .eq('installer_id', user.id)
    .in('pipe_stage', ['install', 'prod_review', 'sales_close', 'done'])
    .order('install_date', { ascending: true, nullsFirst: false })
    .limit(50)

  // Fetch recent install sessions for this installer
  const { data: installSessions } = await admin
    .from('install_sessions')
    .select('*')
    .eq('installer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
          <InstallerPortalClient
            profile={profile as Profile}
            bids={myBids || []}
            openBids={openBids || []}
            activeJobs={activeJobs || []}
            installSessions={installSessions || []}
          />
        </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
