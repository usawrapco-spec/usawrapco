import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin = profile.role === 'owner' || profile.role === 'admin'
  const body = await req.json()

  // Fetch the log to check ownership
  const { data: log } = await admin.from('mileage_logs').select('user_id, status').eq('id', params.id).single()
  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!isAdmin && log.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Admin-only: approve/reject
  const updates: any = {}
  if (body.action === 'approve' && isAdmin) {
    updates.status = 'approved'
    updates.approved_by = user.id
    updates.approved_at = new Date().toISOString()
    updates.rejection_reason = null
  } else if (body.action === 'reject' && isAdmin) {
    updates.status = 'rejected'
    updates.rejection_reason = body.rejection_reason || 'No reason provided'
  } else {
    // Employee edits (only if still pending)
    if (log.status !== 'pending' && !isAdmin)
      return NextResponse.json({ error: 'Cannot edit approved/rejected entry' }, { status: 400 })
    const allowed = ['miles','from_address','to_address','purpose','date','notes','job_id',
      'vehicle_type','odometer_start','odometer_end','odometer_start_photo_url','odometer_end_photo_url','route_data']
    allowed.forEach(k => { if (body[k] !== undefined) updates[k] = body[k] })
  }

  updates.updated_at = new Date().toISOString()
  const { data, error } = await admin.from('mileage_logs').update(updates).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: log } = await admin.from('mileage_logs').select('user_id, status').eq('id', params.id).single()
  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin = profile.role === 'owner' || profile.role === 'admin'
  if (!isAdmin && log.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!isAdmin && log.status !== 'pending') return NextResponse.json({ error: 'Cannot delete approved entry' }, { status: 400 })

  const { error } = await admin.from('mileage_logs').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
