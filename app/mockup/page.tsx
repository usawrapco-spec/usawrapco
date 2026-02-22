import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>Access restricted</div>
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
          <MockupToolClient profile={profile as Profile} />
        </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
