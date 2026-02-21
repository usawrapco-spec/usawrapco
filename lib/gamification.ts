/**
 * lib/gamification.ts
 * XP award system — call from server-side code (API routes, server actions).
 * Records XP in profiles table and returns level-up info.
 */
import { XP_LEVELS, xpToLevel, XP_VALUES, type XPAction } from './commission'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface XPAwardResult {
  newXP: number
  newLevel: number
  leveledUp: boolean
  amount: number
}

/**
 * Award XP to a user. Updates profiles table and returns result.
 */
export async function awardXP(
  supabase: SupabaseClient,
  userId: string,
  action: XPAction,
  sourceType?: string,
  sourceId?: string,
): Promise<XPAwardResult | null> {
  const amount = XP_VALUES[action]

  try {
    // Fetch current profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp, level, monthly_xp, weekly_xp')
      .eq('id', userId)
      .single()

    if (!profile) return null

    const newXP    = (profile.xp || 0) + amount
    const newLevel = xpToLevel(newXP)
    const leveledUp = newLevel > (profile.level || 1)

    // Update profile totals
    await supabase.from('profiles').update({
      xp:         newXP,
      level:      newLevel,
      monthly_xp: (profile.monthly_xp || 0) + amount,
      weekly_xp:  (profile.weekly_xp  || 0) + amount,
    }).eq('id', userId)

    // Try to record in xp_ledger (may not exist in all DB setups)
    try {
      await supabase.from('xp_ledger').insert({
        user_id:     userId,
        amount,
        reason:      action,
        source_type: sourceType,
        source_id:   sourceId,
      })
    } catch {}

    return { newXP, newLevel, leveledUp, amount }
  } catch (err) {
    console.error('[gamification.awardXP] error:', err)
    return null
  }
}

/**
 * Update daily login streak and award streak XP.
 */
export async function updateLoginStreak(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ streak: number; xpAwarded: number }> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_streak, longest_streak, last_active_date')
      .eq('id', userId)
      .single()

    if (!profile) return { streak: 1, xpAwarded: 0 }

    const today = new Date().toISOString().split('T')[0]
    const lastActive = profile.last_active_date || ''

    // Check if already logged in today
    if (lastActive === today) {
      return { streak: profile.current_streak || 1, xpAwarded: 0 }
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const isConsecutive = lastActive === yesterday

    const newStreak = isConsecutive ? (profile.current_streak || 0) + 1 : 1
    const longestStreak = Math.max(newStreak, profile.longest_streak || 0)

    // XP = base(5) + streak bonus (capped at +10)
    const streakBonus = Math.min(10, newStreak - 1)
    const xpBase = XP_VALUES.daily_login
    const xpTotal = xpBase + streakBonus

    await supabase.from('profiles').update({
      current_streak:  newStreak,
      longest_streak:  longestStreak,
      last_active_date: today,
    }).eq('id', userId)

    // Award XP
    await awardXP(supabase, userId, 'daily_login')

    // Award bonus XP directly if streak bonus > 0
    if (streakBonus > 0) {
      const { data: p } = await supabase
        .from('profiles')
        .select('xp, monthly_xp, weekly_xp')
        .eq('id', userId)
        .single()
      if (p) {
        await supabase.from('profiles').update({
          xp:         (p.xp || 0) + streakBonus,
          monthly_xp: (p.monthly_xp || 0) + streakBonus,
          weekly_xp:  (p.weekly_xp  || 0) + streakBonus,
        }).eq('id', userId)
      }
    }

    return { streak: newStreak, xpAwarded: xpTotal }
  } catch (err) {
    console.error('[gamification.updateLoginStreak] error:', err)
    return { streak: 1, xpAwarded: 0 }
  }
}

/**
 * Check if a user has earned any new badges based on current stats.
 */
export async function checkAndAwardBadges(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  try {
    const [profileRes, closedRes, imageRes, referralRes, earlyRes, materialRes, topRes, proofRes] = await Promise.all([
      supabase.from('profiles').select('xp, level, monthly_xp, current_streak, longest_streak, badges').eq('id', userId).single(),
      supabase.from('projects').select('id, gpm').eq('agent_id', userId).eq('status', 'closed'),
      supabase.from('job_images').select('id', { count: 'exact', head: true }).eq('uploaded_by', userId),
      supabase.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', userId),
      // Speed Demon: project closed 2+ days before scheduled install date
      supabase.from('projects').select('id, install_date, updated_at').eq('agent_id', userId).eq('status', 'closed').not('install_date', 'is', null),
      // Material Wizard: logged 20+ vinyl/material tracking entries
      supabase.from('vinyl_usage').select('id', { count: 'exact', head: true }).eq('logged_by', userId),
      // Top Dog: check if user has highest monthly XP in the org
      supabase.from('profiles').select('id, monthly_xp').order('monthly_xp', { ascending: false }).limit(1),
      // Pixel Perfect: 5+ design proofs approved on first pass (no revisions used)
      supabase.from('design_proofs').select('id', { count: 'exact', head: true })
        .eq('designer_id', userId)
        .eq('customer_status', 'approved')
        .eq('revisions_used', 0),
    ])

    const profile = profileRes.data
    if (!profile) return []

    const existingBadges: string[] = profile.badges || []
    const newBadges: string[] = []

    const addBadge = (key: string) => {
      if (!existingBadges.includes(key)) {
        existingBadges.push(key)
        newBadges.push(key)
      }
    }

    // Streak & level badges
    if ((profile.longest_streak || 0) >= 7)  addBadge('hot_streak')
    if ((profile.longest_streak || 0) >= 30) addBadge('marathon')
    if ((profile.level || 1) >= 25)           addBadge('elite')

    // Closer — 10 deals closed
    const closedDeals = closedRes.data || []
    if (closedDeals.length >= 10) addBadge('closer')

    // Sharpshooter — 5 deals closed with GPM > 50%
    const highGpmDeals = closedDeals.filter(p => (p.gpm || 0) > 50)
    if (highGpmDeals.length >= 5) addBadge('sharpshooter')

    // Shutterbug — 50 photos uploaded
    if ((imageRes.count || 0) >= 50) addBadge('shutterbug')

    // Team Player — 5 cross-division referrals
    if ((referralRes.count || 0) >= 5) addBadge('team_player')

    // Speed Demon — at least one job completed 2+ days before scheduled install date
    const earlyJobs = (earlyRes.data || []).filter(p => {
      if (!p.install_date || !p.updated_at) return false
      const installDate = new Date(p.install_date).getTime()
      const closedDate = new Date(p.updated_at).getTime()
      return installDate - closedDate >= 2 * 86400000
    })
    if (earlyJobs.length >= 1) addBadge('speed_demon')

    // Material Wizard — 20+ vinyl/material usage entries logged
    if ((materialRes.count || 0) >= 20) addBadge('material_wizard')

    // Pixel Perfect — 5+ proofs approved on first pass (no revisions)
    if ((proofRes.count || 0) >= 5) addBadge('pixel_perfect')

    // Top Dog — highest monthly XP in the org
    const topProfile = (topRes.data || [])[0]
    if (topProfile && topProfile.id === userId && (profile.monthly_xp || 0) > 0) addBadge('top_dog')

    if (newBadges.length > 0) {
      await supabase.from('profiles').update({
        badges: existingBadges,
      }).eq('id', userId)
    }

    return newBadges
  } catch {
    return []
  }
}

export { XP_VALUES, xpToLevel, XP_LEVELS }
