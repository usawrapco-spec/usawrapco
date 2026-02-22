import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { isAdminRole } from '@/types'
import type { Profile } from '@/types'
import ReportsClient from '@/components/reports/ReportsClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function ReportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  // Load recent projects for report generation
  const { data: projects } = await admin
    .from('projects')
    .select('id, title, vehicle_desc, status, pipe_stage, revenue, profit, created_at, updated_at, agent_id')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
          <ReportsClient
            profile={profile as Profile}
            projects={projects || []}
          />
        </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
