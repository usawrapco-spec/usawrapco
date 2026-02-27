import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import LeaderboardClient from '@/components/leaderboard/LeaderboardClient'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getWeekBounds(): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay() // 0=Sun ... 6=Sat
  const diffToMon = (day === 0 ? -6 : 1 - day)
  const mon = new Date(now)
  mon.setDate(now.getDate() + diffToMon)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return {
    start: mon.toISOString().split('T')[0],
    end:   sun.toISOString().split('T')[0],
  }
}

function getMonthBounds(): { start: string; end: string } {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    start: first.toISOString().split('T')[0],
    end:   last.toISOString().split('T')[0],
  }
}

/** Upsert a leaderboard_periods snapshot for the current period. */
async function ensurePeriod(
  admin: ReturnType<typeof import('@/lib/supabase/service').getSupabaseAdmin>,
  orgId: string,
  periodType: 'week' | 'month',
  periodStart: string,
  periodEnd: string,
  rankings: unknown[],
) {
  // Check if a snapshot already exists for this period
  const { data: existing } = await admin
    .from('leaderboard_periods')
    .select('id, computed_at')
    .eq('org_id', orgId)
    .eq('period_type', periodType)
    .eq('period_start', periodStart)
    .eq('category', 'xp')
    .limit(1)
    .single()

  if (existing) {
    // Refresh snapshot if computed > 1h ago
    const computedAt = new Date(existing.computed_at).getTime()
    if (Date.now() - computedAt < 3600_000) return
    await admin.from('leaderboard_periods').update({
      rankings,
      computed_at: new Date().toISOString(),
    }).eq('id', existing.id)
  } else {
    await admin.from('leaderboard_periods').insert({
      org_id:       orgId,
      period_type:  periodType,
      period_start: periodStart,
      period_end:   periodEnd,
      division:     'all',
      category:     'xp',
      rankings,
    }).then(() => {}, () => {})
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

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

  const [membersRes, projectsRes, shopRecordsRes, recentBadgesRes, allBadgesRes, myXPHistoryRes] = await Promise.all([
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

    // All badge definitions for the badge grid
    admin.from('badges').select('id, name, description, icon, category, rarity, xp_value'),

    // Current user's XP history
    admin
      .from('xp_ledger')
      .select('amount, reason, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(25),
  ])

  const members = membersRes.data || []

  // XP breakdown per member (from ledger, org-scoped)
  let xpBreakdown: Record<string, Record<string, number>> = {}
  try {
    const memberIds = members.map(m => m.id)
    if (memberIds.length > 0) {
      const { data: ledger } = await admin
        .from('xp_ledger')
        .select('user_id, reason, amount')
        .in('user_id', memberIds)
        .limit(5000)
      if (ledger) {
        for (const row of ledger) {
          if (!xpBreakdown[row.user_id]) xpBreakdown[row.user_id] = {}
          xpBreakdown[row.user_id][row.reason] = (xpBreakdown[row.user_id][row.reason] || 0) + (row.amount || 0)
        }
      }
    }
  } catch {}

  // Ensure leaderboard period snapshots
  const week  = getWeekBounds()
  const month = getMonthBounds()
  const xpRankings = members
    .sort((a, b) => (b.xp || 0) - (a.xp || 0))
    .map((m, i) => ({ rank: i + 1, userId: m.id, name: m.name, xp: m.xp, level: m.level }))
  await Promise.all([
    ensurePeriod(admin, orgId, 'week',  week.start,  week.end,  xpRankings),
    ensurePeriod(admin, orgId, 'month', month.start, month.end, xpRankings),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <LeaderboardClient
          currentProfile={profile as Profile}
          members={members}
          projects={projectsRes.data || []}
          shopRecords={shopRecordsRes.data || []}
          recentBadges={recentBadgesRes.data || []}
          allBadges={allBadgesRes.data || []}
          myXPHistory={myXPHistoryRes.data || []}
          xpBreakdown={xpBreakdown}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
