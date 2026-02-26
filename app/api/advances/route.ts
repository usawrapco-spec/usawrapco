import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'


export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin = profile.role === 'owner' || profile.role === 'admin'
  const orgId = profile.org_id || ORG_ID

  let query = admin
    .from('employee_advances')
    .select('*, user:user_id(id,name,avatar_url), issuer:issued_by(id,name)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (!isAdmin) query = query.eq('user_id', user.id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ advances: data })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (profile.role !== 'owner' && profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const orgId = profile.org_id || ORG_ID
  const amount = parseFloat(body.amount) || 0

  if (amount <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
  if (!body.user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const { data, error } = await admin.from('employee_advances').insert({
    org_id: orgId,
    user_id: body.user_id,
    amount,
    remaining_balance: amount,
    reason: body.reason || null,
    deduction_per_period: body.deduction_per_period || null,
    deduction_schedule: body.deduction_schedule || 'next_paycheck',
    issued_by: user.id,
    notes: body.notes || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ advance: data }, { status: 201 })
}
