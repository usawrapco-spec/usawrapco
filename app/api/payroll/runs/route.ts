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
  if (profile.role !== 'owner' && profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const orgId = profile.org_id || ORG_ID
  const { data, error } = await admin
    .from('payroll_runs')
    .select('*, processor:processed_by(id,name)')
    .eq('org_id', orgId)
    .order('period_start', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ runs: data })
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

  if (!body.period_start || !body.period_end)
    return NextResponse.json({ error: 'period_start and period_end required' }, { status: 400 })

  // Check for overlapping open run
  const { data: existing } = await admin
    .from('payroll_runs')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'open')
    .gte('period_end', body.period_start)
    .lte('period_start', body.period_end)
    .limit(1)

  if (existing && existing.length > 0)
    return NextResponse.json({ error: 'An open payroll run already overlaps this period' }, { status: 400 })

  const { data, error } = await admin.from('payroll_runs').insert({
    org_id: orgId,
    period_start: body.period_start,
    period_end: body.period_end,
    pay_date: body.pay_date || null,
    status: 'open',
    notes: body.notes || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ run: data }, { status: 201 })
}
