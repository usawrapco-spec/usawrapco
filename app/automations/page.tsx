import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import AutomationsPageClient from '@/components/automations/AutomationsPageClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function AutomationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Admin/owner only
  if (profile.role !== 'owner' && profile.role !== 'admin') {
    redirect('/dashboard')
  }

  const orgId = profile.org_id || ORG_ID

  // Fetch workflow triggers
  const { data: triggers } = await admin
    .from('workflow_triggers')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  // Fetch recent workflow runs
  const { data: runs } = await admin
    .from('workflow_runs')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <AutomationsPageClient
          profile={profile as Profile}
          initialTriggers={triggers || []}
          initialRuns={runs || []}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
