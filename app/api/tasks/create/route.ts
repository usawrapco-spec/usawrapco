import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    title,
    description,
    department = 'general',
    priority = 'normal',
    assigned_to,
    project_id,
    due_at,
  } = body

  if (!title?.trim()) return Response.json({ error: 'title required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id || ORG_ID

  const { data, error } = await admin.from('tasks').insert({
    org_id: orgId,
    title: title.trim(),
    description: description?.trim() || null,
    department,
    priority,
    assigned_to: assigned_to || null,
    project_id: project_id || null,
    due_at: due_at || null,
    type: 'manual',
    status: 'open',
    source: 'manual',
    created_by: user.id,
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ task: data })
}
