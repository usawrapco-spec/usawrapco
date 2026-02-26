import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import LeaderboardClient from '@/components/leaderboard/LeaderboardClient'

export default async function LeaderboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()

  const [membersRes, projectsRes, shopRecordsRes, recentBadgesRes] = await Promise.all([
    admin
      .from('profiles')
      .select('id, name, email, role, xp, level, current_streak, longest_streak, monthly_xp, weekly_xp, badges, last_active_date')
      .eq('org_id', orgId)
      .eq('active', true)
      .order('xp', { ascending: false }),

    admin
      .from('projects')
      .select('id, title, revenue, profit, gpm, agent_id, installer_id, pipe_stage, updated_at, service_division, fin_data')
      .eq('org_id', orgId)
      .gte('updated_at', oneYearAgo),

    admin
      .from('shop_records')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_current', true)
      .order('record_category', { ascending: true }),

    admin
      .from('user_badges')
      .select('*, profiles:user_id(name), badges:badge_id(name, icon, rarity)')
      .order('earned_at', { ascending: false })
      .limit(20),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <LeaderboardClient
          currentProfile={profile as Profile}
          members={membersRes.data || []}
          projects={projectsRes.data || []}
          shopRecords={shopRecordsRes.data || []}
          recentBadges={recentBadgesRes.data || []}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
