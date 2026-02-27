/**
 * lib/xp.ts
 * Clean XP utility — no supabase client arg required.
 * Uses admin client internally so it can be called from any API route.
 *
 * Signature: awardXP(userId, orgId, action, amount, metadata?)
 */
import { getSupabaseAdmin } from './supabase/service'
import { xpToLevel } from './commission'
import { checkAndAwardBadges } from './gamification'

export interface XPResult {
  newXP: number
  newLevel: number
  leveledUp: boolean
  amount: number
  newBadges: string[]
}

/**
 * Award XP to a user. Uses admin client internally.
 *
 * @param userId   - Supabase auth user id
 * @param orgId    - Organisation id
 * @param action   - Action label (e.g. 'job_comment', 'photo_upload')
 * @param amount   - XP to award (direct amount, NOT looked up from XP_VALUES)
 * @param metadata - Optional extra context stored with the ledger entry
 */
export async function awardXP(
  userId: string,
  orgId: string,
  action: string,
  amount: number,
  metadata?: Record<string, unknown>,
): Promise<XPResult | null> {
  if (!userId || !orgId || amount <= 0) return null

  const admin = getSupabaseAdmin()

  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('xp, level, monthly_xp, weekly_xp')
      .eq('id', userId)
      .single()

    if (!profile) return null

    const newXP    = (profile.xp    || 0) + amount
    const newLevel = xpToLevel(newXP)
    const leveledUp = newLevel > (profile.level || 1)

    await admin.from('profiles').update({
      xp:         newXP,
      level:      newLevel,
      monthly_xp: (profile.monthly_xp || 0) + amount,
      weekly_xp:  (profile.weekly_xp  || 0) + amount,
    }).eq('id', userId)

    // Log to ledger (graceful — columns may not exist on older DB versions)
    try {
      await admin.from('xp_ledger').insert({
        user_id:  userId,
        org_id:   orgId,
        amount,
        reason:   action,
        metadata: metadata || {},
      })
    } catch {}

    const newBadges = await checkAndAwardBadges(admin, userId)

    return { newXP, newLevel, leveledUp, amount, newBadges }
  } catch (err) {
    console.error('[lib/xp.awardXP] error:', err)
    return null
  }
}
