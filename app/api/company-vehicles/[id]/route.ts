import { ORG_ID } from '@/lib/org'
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
  if (profile.role !== 'owner' && profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const orgId = profile.org_id || ORG_ID

  const { data: vehicle } = await admin.from('company_vehicles').select('assigned_to').eq('id', params.id).single()
  if (!vehicle) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowed = ['make','model','year','color','plate','vin','assigned_to','current_mileage',
    'insurance_expiry','registration_expiry','notes','active',
    'last_oil_change_miles','next_oil_change_miles']
  const updates: any = { updated_at: new Date().toISOString() }
  allowed.forEach(k => { if (body[k] !== undefined) updates[k] = body[k] })

  const { data, error } = await admin.from('company_vehicles').update(updates).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Handle reassignment
  if (body.assigned_to !== undefined) {
    // Unmark old assignee
    if (vehicle.assigned_to && vehicle.assigned_to !== body.assigned_to) {
      await admin.from('employee_pay_settings').update({
        uses_company_vehicle: false,
        vehicle_id: null,
      }).eq('user_id', vehicle.assigned_to)
    }
    // Mark new assignee
    if (body.assigned_to) {
      await admin.from('employee_pay_settings').upsert({
        user_id: body.assigned_to,
        org_id: orgId,
        uses_company_vehicle: true,
        vehicle_id: params.id,
      }, { onConflict: 'user_id' })
    }
  }

  return NextResponse.json({ vehicle: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (profile.role !== 'owner' && profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Soft delete
  const { error } = await admin.from('company_vehicles').update({ active: false }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
