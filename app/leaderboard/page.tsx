import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import LeaderboardClient from '@/components/leaderboard/LeaderboardClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function LeaderboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  // Load all team members with XP data
  const { data: members } = await admin
    .from('profiles')
    .select('id, name, email, role, xp, level, current_streak, longest_streak, monthly_xp, weekly_xp, badges, last_active_date')
    .eq('org_id', orgId)
    .eq('active', true)
    .order('xp', { ascending: false })

  // Load recent closed projects for revenue leaderboard
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: projects } = await admin
    .from('projects')
    .select('id, title, revenue, profit, agent_id, pipe_stage, updated_at')
    .eq('org_id', orgId)
    .gte('updated_at', thirtyDaysAgo)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
          <LeaderboardClient
            currentProfile={profile as Profile}
            members={members || []}
            projects={projects || []}
          />
        </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
