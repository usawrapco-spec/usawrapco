import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { updateLoginStreak, checkAndAwardBadges } from '@/lib/gamification'
import { xpToLevel } from '@/lib/commission'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()

    // Get level before
    const { data: before } = await admin
      .from('profiles')
      .select('xp, level')
      .eq('id', user.id)
      .single()

    const result = await updateLoginStreak(admin, user.id)

    // Get level after
    const { data: after } = await admin
      .from('profiles')
      .select('xp, level')
      .eq('id', user.id)
      .single()

    const leveledUp = after && before && (after.level || 1) > (before.level || 1)
    const newLevel  = after?.level || 1

    // Check for streak-based badges (hot_streak at 7 days)
    const newBadges = await checkAndAwardBadges(admin, user.id)

    return Response.json({ ...result, leveledUp: !!leveledUp, newLevel, newBadges })
  } catch (err) {
    console.error('[xp/daily-login] error:', err)
    return Response.json({ streak: 1, xpAwarded: 0, leveledUp: false, newLevel: 1 })
  }
}
