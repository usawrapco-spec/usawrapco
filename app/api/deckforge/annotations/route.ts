import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('project_id')
  const fileId = searchParams.get('file_id')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let query = getSupabaseAdmin().from('deckforge_annotations').select('*')
  if (projectId) query = query.eq('project_id', projectId)
  if (fileId) query = query.eq('file_id', fileId)

  const { data, error } = await query.order('created_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const records = Array.isArray(body) ? body : [body]

  const { data, error } = await getSupabaseAdmin()
    .from('deckforge_annotations')
    .insert(records.map((r: {
      project_id?: string; file_id?: string; job_id?: string;
      type: string; label?: string; coordinates: Record<string, unknown>; properties?: Record<string, unknown>
    }) => ({
      project_id: r.project_id || null,
      file_id: r.file_id || null,
      job_id: r.job_id || null,
      type: r.type,
      label: r.label || null,
      coordinates: r.coordinates,
      properties: r.properties || {},
    })))
    .select()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const projectId = searchParams.get('project_id')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!id && !projectId) return Response.json({ error: 'Need id or project_id' }, { status: 400 })

  let query = getSupabaseAdmin().from('deckforge_annotations').delete()
  if (id) query = query.eq('id', id)
  else if (projectId) query = query.eq('project_id', projectId)

  const { error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
