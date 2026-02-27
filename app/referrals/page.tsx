export const dynamic = 'force-dynamic'
import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import ReferralsClient from '@/components/referral/ReferralsClient'

export default async function ReferralsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  // Load sales_referrals if table exists, otherwise empty
  let referrals: any[] = []
  try {
    const { data } = await admin
      .from('sales_referrals')
      .select('*, referrer:referrer_id(name, role), referee:referee_id(name, role), project:project_id(title, revenue, gpm)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100)
    referrals = data || []
  } catch {}

  // Load team members
  let team: any[] = []
  try {
    const { data } = await admin
      .from('profiles')
      .select('id, name, role')
      .eq('org_id', orgId)
      .eq('active', true)
      .order('name')
    team = data || []
  } catch {}

  // Load closed projects for referral association
  let projects: any[] = []
  try {
    const { data } = await admin
      .from('projects')
      .select('id, title, revenue, gpm, pipe_stage')
      .eq('org_id', orgId)
      .in('pipe_stage', ['sales_close', 'done'])
      .order('created_at', { ascending: false })
      .limit(100)
    projects = data || []
  } catch {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <ReferralsClient
          profile={profile as Profile}
          referrals={referrals}
          team={team}
          projects={projects}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
