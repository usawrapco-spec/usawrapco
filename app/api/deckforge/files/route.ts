import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('project_id')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let query = getSupabaseAdmin().from('deckforge_files').select('*')
  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const { data, error } = await getSupabaseAdmin()
    .from('deckforge_files')
    .insert({
      project_id: body.project_id,
      name: body.name,
      original_name: body.original_name,
      file_type: body.file_type,
      file_size: body.file_size,
      storage_path: body.storage_path,
      status: 'uploaded',
      metadata: body.metadata || {},
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}
