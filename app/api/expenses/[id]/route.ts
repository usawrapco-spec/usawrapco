import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin = profile.role === 'owner' || profile.role === 'admin'
  const body = await req.json()

  const { data: expense } = await admin.from('expense_reports').select('user_id, status').eq('id', params.id).single()
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!isAdmin && expense.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updates: any = {}

  if (body.action === 'approve' && isAdmin) {
    updates.status = 'approved'
    updates.approved_by = user.id
    updates.approved_at = new Date().toISOString()
    updates.rejection_reason = null
    updates.manager_notes = body.manager_notes || null
  } else if (body.action === 'reject' && isAdmin) {
    updates.status = 'rejected'
    updates.rejection_reason = body.rejection_reason || 'No reason provided'
    updates.approved_by = user.id
    updates.approved_at = new Date().toISOString()
    updates.manager_notes = body.manager_notes || null
  } else if (body.action === 'request_info' && isAdmin) {
    updates.status = 'info_requested'
    updates.manager_notes = body.manager_notes || 'Please provide more information'
  } else if (body.action === 'flag' && isAdmin) {
    updates.flagged = true
    updates.flag_reason = body.flag_reason || null
  } else {
    // Employee editing their own pending expense
    if (expense.status !== 'pending' && !isAdmin)
      return NextResponse.json({ error: 'Cannot edit approved/rejected expense' }, { status: 400 })
    const allowed = ['category','amount','expense_date','description','receipt_url',
      'payment_method','merchant_name','job_id']
    allowed.forEach(k => { if (body[k] !== undefined) updates[k] = body[k] })
    if (updates.amount) updates.amount = parseFloat(updates.amount)
    if (body.status === 'pending' && expense.status === 'info_requested') updates.status = 'pending'
  }

  updates.updated_at = new Date().toISOString()
  const { data, error } = await admin.from('expense_reports').update(updates).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expense: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: expense } = await admin.from('expense_reports').select('user_id, status').eq('id', params.id).single()
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin = profile.role === 'owner' || profile.role === 'admin'
  if (!isAdmin && expense.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!isAdmin && expense.status !== 'pending') return NextResponse.json({ error: 'Cannot delete approved expense' }, { status: 400 })

  const { error } = await admin.from('expense_reports').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
