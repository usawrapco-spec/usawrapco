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

  const params = req.nextUrl.searchParams
  const isAdmin = profile.role === 'owner' || profile.role === 'admin'
  const orgId = profile.org_id || ORG_ID

  let query = admin
    .from('expense_reports')
    .select('*, user:user_id(id,name,avatar_url,role), job:job_id(id,title), approver:approved_by(id,name)')
    .eq('org_id', orgId)
    .order('expense_date', { ascending: false })

  if (!isAdmin) query = query.eq('user_id', user.id)

  const status = params.get('status')
  if (status) query = query.eq('status', status)

  const userId = params.get('user_id')
  if (userId && isAdmin) query = query.eq('user_id', userId)

  const category = params.get('category')
  if (category) query = query.eq('category', category)

  const from = params.get('from')
  const to = params.get('to')
  if (from) query = query.gte('expense_date', from)
  if (to) query = query.lte('expense_date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ expenses: data })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const orgId = profile.org_id || ORG_ID
  const amount = parseFloat(body.amount) || 0

  if (amount <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
  if (!body.description) return NextResponse.json({ error: 'Description required' }, { status: 400 })
  if (amount > 25 && !body.receipt_url) return NextResponse.json({ error: 'Receipt required for expenses over $25' }, { status: 400 })

  // Check auto-approve threshold
  const { data: paySettings } = await admin
    .from('employee_pay_settings')
    .select('auto_approve_expenses_under')
    .eq('user_id', user.id)
    .single()

  const autoApproveThreshold = paySettings?.auto_approve_expenses_under ?? 25
  const autoApproved = amount <= autoApproveThreshold

  const { data, error } = await admin.from('expense_reports').insert({
    org_id: orgId,
    user_id: user.id,
    job_id: body.job_id || null,
    category: body.category || 'other',
    amount,
    currency: body.currency || 'USD',
    expense_date: body.expense_date || new Date().toISOString().split('T')[0],
    description: body.description,
    receipt_url: body.receipt_url || null,
    payment_method: body.payment_method || 'personal_card',
    merchant_name: body.merchant_name || null,
    ai_extracted: body.ai_extracted || false,
    status: autoApproved ? 'approved' : 'pending',
    approved_by: autoApproved ? null : null,
    approved_at: autoApproved ? new Date().toISOString() : null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expense: data, auto_approved: autoApproved }, { status: 201 })
}
