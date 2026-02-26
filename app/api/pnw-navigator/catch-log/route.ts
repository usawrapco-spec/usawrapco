import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ catches: [] })

  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('catch_log')
    .select('*, spot:spot_id(name, region)')
    .eq('user_id', user.id)
    .order('catch_date', { ascending: false })
    .limit(50)

  return Response.json({ catches: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from('catch_log').insert({
    ...body,
    user_id: user.id,
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ catch: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const admin = getSupabaseAdmin()
  await admin.from('catch_log').delete().eq('id', id).eq('user_id', user.id)
  return Response.json({ success: true })
}
