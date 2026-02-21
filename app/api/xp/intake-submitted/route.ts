/**
 * Awards intake_submitted XP to the agent who owns the intake token.
 * Called by the public customer intake portal (no auth context).
 */
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { awardXP } from '@/lib/gamification'

export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    if (!token) return Response.json({ error: 'token required' }, { status: 400 })

    const admin = getSupabaseAdmin()

    // Look up the intake token to find the creating agent
    const { data: intakeToken } = await admin
      .from('customer_intake_tokens')
      .select('created_by, project_id')
      .eq('token', token)
      .single()

    if (!intakeToken?.created_by) {
      return Response.json({ ok: false })
    }

    const result = await awardXP(
      admin,
      intakeToken.created_by,
      'intake_submitted',
      'intake',
      intakeToken.project_id || token,
    )

    return Response.json({ ok: true, result })
  } catch (err) {
    console.error('[xp/intake-submitted] error:', err)
    return Response.json({ ok: false })
  }
}
