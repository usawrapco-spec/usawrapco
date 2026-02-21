import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: Request) {
  try {
    const { token, signerName, agreed } = await req.json()
    if (!token || !signerName || !agreed) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Find project by signoff token
    const { data: projects } = await admin
      .from('projects')
      .select('id, actuals')
      .filter('actuals->signoff_token', 'eq', token)

    if (projects?.length) {
      const project = projects[0]
      const now = new Date().toISOString()
      const updatedActuals = {
        ...(project.actuals as Record<string, unknown> || {}),
        installerSignoff: 'approved',
        signoff_completed_at: now,
        signoff_signer_name: signerName,
      }
      await admin.from('projects').update({
        actuals: updatedActuals,
        updated_at: now,
      }).eq('id', project.id)

      // Award customer_signoff XP to the project agent (if any)
      const { data: fullProject } = await admin
        .from('projects')
        .select('agent_id')
        .eq('id', project.id)
        .single()
      if (fullProject?.agent_id) {
        const { awardXP } = await import('@/lib/gamification')
        await awardXP(admin, fullProject.agent_id, 'customer_signoff', 'project', project.id)
      }

      return Response.json({ success: true })
    }

    // Try customer_intake table (intake form signoff)
    const { data: intake } = await admin
      .from('customer_intake')
      .select('id')
      .eq('token', token)
      .single()

    if (intake) {
      const now = new Date().toISOString()
      await admin.from('customer_intake').update({
        completed: true,
        completed_at: now,
        updated_at: now,
      }).eq('token', token)

      return Response.json({ success: true })
    }

    return Response.json({ error: 'Token not found' }, { status: 404 })
  } catch (err) {
    console.error('[signoff] error:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
