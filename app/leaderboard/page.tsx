import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
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
    <div className="flex h-screen bg-bg overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar profile={profile as Profile} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <LeaderboardClient
            currentProfile={profile as Profile}
            members={members || []}
            projects={projects || []}
          />
        </main>
      </div>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
