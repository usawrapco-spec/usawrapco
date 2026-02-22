import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import CommissionsClient from '@/components/settings/CommissionsClient'

export default async function CommissionsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')
  if (!['owner', 'admin'].includes(profile.role)) redirect('/dashboard')

  const orgId = profile.org_id

  // Load team (agents) and their override rates
  const [settingsRes, agentsRes] = await Promise.all([
    admin.from('shop_settings').select('*').eq('org_id', orgId).in('category', ['commission', 'pricing']),
    admin.from('profiles').select('id, name, role, commission_rate_override').eq('org_id', orgId).eq('active', true),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <CommissionsClient
          profile={profile as Profile}
          settings={settingsRes.data || []}
          agents={agentsRes.data || []}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
