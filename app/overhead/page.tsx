import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileNav } from '@/components/layout/MobileNav'
import { isAdminRole, canAccess } from '@/types'
import type { Profile } from '@/types'
import ShopOverheadCalc from '@/components/settings/ShopOverheadCalc'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function OverheadPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  if (!isAdminRole(profile.role) && !canAccess(profile.role, 'manage_settings')) {
    return (
      <div className="flex h-screen bg-bg overflow-hidden">
        <div className="hidden md:flex">
          <Sidebar profile={profile as Profile} />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar profile={profile as Profile} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
            <div style={{ maxWidth: 400, margin: '60px auto', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 32 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>Access Restricted</div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>Only admins can view shop expenses.</div>
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
          <ShopOverheadCalc profile={profile as Profile} />
        </main>
      </div>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
