import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { awardXP, checkAndAwardBadges } from '@/lib/gamification'
import type { XPAction } from '@/lib/commission'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { action, sourceId, sourceType } = await req.json() as {
      action: XPAction
      sourceId?: string
      sourceType?: string
    }

    if (!action) {
      return Response.json({ error: 'action required' }, { status: 400 })
    }

    const admin  = getSupabaseAdmin()
    const result = await awardXP(admin, user.id, action, sourceType, sourceId)

    if (!result) {
      return Response.json({ error: 'Award failed' }, { status: 500 })
    }

    // Check for new badges
    const newBadges = await checkAndAwardBadges(admin, user.id)

    return Response.json({ ...result, newBadges })
  } catch (err) {
    console.error('[xp/award] error:', err)
    return Response.json({ error: 'XP award failed' }, { status: 500 })
  }
}
