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

    // Look up the intake and its project to find the agent
    const { data: intake } = await admin
      .from('customer_intake')
      .select('project_id, project:project_id(agent_id)')
      .eq('token', token)
      .single()

    const agentId = (intake?.project as any)?.agent_id
    if (!agentId) {
      return Response.json({ ok: false })
    }

    const result = await awardXP(
      admin,
      agentId,
      'intake_submitted',
      'intake',
      (intake as any)?.project_id || token,
    )

    return Response.json({ ok: true, result })
  } catch (err) {
    console.error('[xp/intake-submitted] error:', err)
    return Response.json({ ok: false })
  }
}
