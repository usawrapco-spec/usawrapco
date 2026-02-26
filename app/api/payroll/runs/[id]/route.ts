import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (profile.role !== 'owner' && profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [runRes, lineItemsRes] = await Promise.all([
    admin.from('payroll_runs').select('*, processor:processed_by(id,name)').eq('id', params.id).single(),
    admin.from('payroll_line_items').select('*, user:user_id(id,name,role,avatar_url)').eq('payroll_run_id', params.id).order('user_id'),
  ])

  if (runRes.error) return NextResponse.json({ error: runRes.error.message }, { status: 500 })
  if (!runRes.data) return NextResponse.json({ error: 'Run not found' }, { status: 404 })

  return NextResponse.json({ run: runRes.data, line_items: lineItemsRes.data || [] })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (profile.role !== 'owner' && profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data: run } = await admin.from('payroll_runs').select('status').eq('id', params.id).single()
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (run.status === 'processed' || run.status === 'paid')
    return NextResponse.json({ error: 'Cannot edit a processed payroll run' }, { status: 400 })

  const allowed = ['notes','pay_date','status']
  const updates: any = { updated_at: new Date().toISOString() }
  allowed.forEach(k => { if (body[k] !== undefined) updates[k] = body[k] })

  const { data, error } = await admin.from('payroll_runs').update(updates).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ run: data })
}
