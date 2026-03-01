import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import { isAdminRole } from '@/types'
import EmployeePortalsClient from '@/components/admin/EmployeePortalsClient'
import { Lock } from 'lucide-react'

export default async function EmployeePortalsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  if (!isAdminRole(profile.role)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
        <TopNav profile={profile as Profile} />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <Lock size={40} color="var(--red)" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>
              Admin Access Required
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>
              Only admins and owners can view employee portals.
            </div>
          </div>
        </main>
        <div className="md:hidden"><MobileNav /></div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', paddingBottom: 80 }}>
        <EmployeePortalsClient currentProfile={profile as Profile} />
      </main>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  )
}
