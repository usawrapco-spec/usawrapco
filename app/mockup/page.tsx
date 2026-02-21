import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileNav } from '@/components/layout/MobileNav'
import { isAdminRole } from '@/types'
import type { Profile } from '@/types'
import MockupToolClient from '@/components/mockup/MockupToolClient'

export default async function MockupPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const allowed = ['owner', 'admin', 'designer', 'sales_agent', 'production']
  if (!isAdminRole(profile.role) && !allowed.includes(profile.role)) {
    return (
      <div className="flex h-screen bg-bg overflow-hidden">
        <div className="hidden md:flex">
          <Sidebar profile={profile as Profile} />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar profile={profile as Profile} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>Access restricted</div>
            </div>
          </main>
        </div>
        <div className="md:hidden">
          <MobileNav />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar profile={profile as Profile} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <MockupToolClient profile={profile as Profile} />
        </main>
      </div>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
