import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const projectId = url.searchParams.get('project_id')
  const limit = parseInt(url.searchParams.get('limit') || '50')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id || ORG_ID

  let query = admin
    .from('activity_log')
    .select('*, actor:actor_id(name, role)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) return Response.json({ logs: [] })
  return Response.json({ logs: data || [] })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { project_id, action, details, entity_type, entity_id } = body

  if (!action) return Response.json({ error: 'action required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, name').eq('id', user.id).single()
  const orgId = profile?.org_id || ORG_ID

  const { data, error } = await admin.from('activity_log').insert({
    org_id: orgId,
    project_id: project_id || null,
    actor_id: user.id,
    action,
    details: details || {},
    entity_type: entity_type || 'project',
    entity_id: entity_id || project_id || null,
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ log: data })
}
