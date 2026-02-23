import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import AdminDashboard from '@/components/admin/AdminDashboard'
import { Lock } from 'lucide-react'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Only is_owner=true can access Admin Control Center
  if (!profile.is_owner) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
        <TopNav profile={profile as Profile} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Lock size={48} className="mx-auto mb-4 text-red" />
            <div className="text-2xl font-700 text-text1 mb-2">Admin Access Required</div>
            <div className="text-sm text-text3">Only the organization owner can access the Admin Control Center.</div>
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
        <AdminDashboard profile={profile as Profile} />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
