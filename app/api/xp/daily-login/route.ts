import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { updateLoginStreak } from '@/lib/gamification'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const result = await updateLoginStreak(admin, user.id)

    return Response.json(result)
  } catch (err) {
    console.error('[xp/daily-login] error:', err)
    return Response.json({ streak: 1, xpAwarded: 0 })
  }
}
