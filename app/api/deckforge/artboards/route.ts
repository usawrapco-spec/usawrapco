import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('project_id')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let query = getSupabaseAdmin().from('deckforge_artboards').select('*')
  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query.order('created_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const admin = getSupabaseAdmin()

  // Upsert: update existing artboard or create new one
  const { data: existing } = await admin
    .from('deckforge_artboards')
    .select('id')
    .eq('project_id', body.project_id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { data, error } = await admin
      .from('deckforge_artboards')
      .update({ canvas_data: body.canvas_data, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ data })
  }

  const { data, error } = await admin
    .from('deckforge_artboards')
    .insert({
      project_id: body.project_id,
      name: body.name || 'Main Artboard',
      canvas_data: body.canvas_data || {},
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}
