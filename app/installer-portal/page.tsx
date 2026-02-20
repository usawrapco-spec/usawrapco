import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import type { Profile } from '@/types'
import InstallerPortalClient from '@/components/installer/InstallerPortalClient'

export default async function InstallerPortalPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Fetch installer bids for this user, with joined project data
  const { data: bids } = await supabase
    .from('installer_bids')
    .select('*, project:project_id(id, title, vehicle_desc, form_data, fin_data, install_date, pipe_stage)')
    .eq('installer_id', user.id)
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar profile={profile as Profile} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-6">
          <InstallerPortalClient
            profile={profile as Profile}
            bids={bids || []}
          />
        </main>
      </div>
    </div>
  )
}
