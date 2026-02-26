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

  const body = await req.json()
  const { data: advance } = await admin.from('employee_advances').select('user_id').eq('id', params.id).single()
  if (!advance) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin = profile.role === 'owner' || profile.role === 'admin'

  // Employee can acknowledge; admin can update everything
  const updates: any = { updated_at: new Date().toISOString() }

  if (body.action === 'acknowledge' && advance.user_id === user.id) {
    updates.employee_acknowledged = true
    updates.acknowledged_at = new Date().toISOString()
  } else if (isAdmin) {
    const allowed = ['reason','deduction_per_period','deduction_schedule','remaining_balance','notes','fully_repaid']
    allowed.forEach(k => { if (body[k] !== undefined) updates[k] = body[k] })
    if (updates.remaining_balance !== undefined) {
      updates.remaining_balance = parseFloat(updates.remaining_balance)
      if (updates.remaining_balance <= 0) updates.fully_repaid = true
    }
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await admin.from('employee_advances').update(updates).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ advance: data })
}
