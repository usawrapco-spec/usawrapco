import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import OrgSettingsClient from '@/components/admin/OrgSettingsClient'
import { Lock } from 'lucide-react'

export default async function OrgSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || !profile.is_owner) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
        <TopNav profile={profile as Profile} />
        <main style={{ flex: 1, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="text-center">
            <Lock size={48} className="mx-auto mb-4 text-red" />
            <div className="text-xl font-700 text-text1">Admin Access Required</div>
          </div>
        </main>
        <MobileNav />
      </div>
    )
  }

  const { data: org } = await admin.from('orgs').select('*').eq('id', profile.org_id).single()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <OrgSettingsClient profile={profile as Profile} org={org || {}} />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
