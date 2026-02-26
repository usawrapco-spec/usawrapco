import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const spot_id = searchParams.get('spot_id')
  const region = searchParams.get('region')
  const days = parseInt(searchParams.get('days') || '7')

  const admin = getSupabaseAdmin()
  const since = new Date()
  since.setDate(since.getDate() - days)

  let query = admin
    .from('fishing_reports')
    .select('*, spot:spot_id(name, region, lat, lng)')
    .eq('is_public', true)
    .gte('report_date', since.toISOString().split('T')[0])
    .order('created_at', { ascending: false })
    .limit(30)

  if (spot_id) query = query.eq('spot_id', spot_id)

  const { data, error } = await query
  if (error) return Response.json({ reports: [] })

  return Response.json({ reports: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from('fishing_reports').insert({
    ...body,
    user_id: user.id,
    report_date: body.report_date || new Date().toISOString().split('T')[0],
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ report: data })
}
