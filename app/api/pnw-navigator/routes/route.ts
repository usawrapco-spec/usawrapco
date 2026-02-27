import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ routes: [] })

  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('user_routes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return Response.json({ routes: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from('user_routes').insert({
    user_id:    user.id,
    name:       body.name,
    description: body.description || null,
    waypoints:  body.waypoints || [],
    is_private: true,
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ route: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const admin = getSupabaseAdmin()
  await admin.from('user_routes').delete().eq('id', id).eq('user_id', user.id)
  return Response.json({ success: true })
}
