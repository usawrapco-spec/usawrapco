import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { onStageAdvanced, onSendBack, onJobClosed } from '@/lib/integrations/webhooks'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { project_id, event, from_stage, to_stage, reason } = body

  if (!project_id || !event) return Response.json({ error: 'Missing fields' }, { status: 400 })

  const admin = getSupabaseAdmin()

  // Get actor name
  const { data: profile } = await admin.from('profiles').select('name, org_id').eq('id', user.id).single()
  const orgId = profile?.org_id || ORG_ID
  const actorName = profile?.name || 'Team Member'

  // Get project details
  const { data: project } = await admin.from('projects').select('*').eq('id', project_id).single()
  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 })

  // Fire appropriate webhook (non-blocking)
  if (event === 'stage_advanced') {
    onStageAdvanced(orgId, project, from_stage, to_stage, actorName).catch(() => {})
  } else if (event === 'send_back') {
    onSendBack(orgId, project, from_stage, to_stage, reason || '', actorName).catch(() => {})
  } else if (event === 'job_closed') {
    onJobClosed(orgId, project, actorName).catch(() => {})
  }

  return Response.json({ success: true })
}
