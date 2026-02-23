import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { isAdminRole } from '@/types'
import type { Profile } from '@/types'
import AICommandCenterClient from '@/components/settings/AICommandCenter'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function AISettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  if (!isAdminRole(profile.role)) redirect('/settings')

  // Load AI settings from app_state
  const { data: aiState } = await admin
    .from('app_state')
    .select('value')
    .eq('org_id', ORG_ID)
    .eq('key', 'ai_settings')
    .single()

  const aiSettings = (aiState?.value as any) || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <AICommandCenterClient initialSettings={aiSettings} />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
