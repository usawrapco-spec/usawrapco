import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
            <div style={{ maxWidth: 400, margin: '60px auto', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 32 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>Access Restricted</div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>Only admins can view shop expenses.</div>
            </div>
          </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
          <ShopOverheadCalc profile={profile as Profile} />
        </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
