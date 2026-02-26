import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') || 'all'
  const limit = parseInt(searchParams.get('limit') || '50')

  const admin = getSupabaseAdmin()
  let query = admin
    .from('call_logs')
    .select('*, department:department_id(name), answered_by_profile:answered_by(name)')
    .eq('org_id', ORG_ID)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filter === 'answered') query = query.eq('status', 'completed')
  else if (filter === 'missed') query = query.eq('status', 'missed')
  else if (filter === 'voicemail') query = query.eq('status', 'voicemail')
  else if (filter === 'outbound') query = query.eq('direction', 'outbound')

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...rest } = body
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('call_logs')
    .update(rest)
    .eq('id', id)
    .eq('org_id', ORG_ID)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
