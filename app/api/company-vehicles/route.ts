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

  const orgId = profile.org_id || ORG_ID
  const { data, error } = await admin
    .from('company_vehicles')
    .select('*, assigned_employee:assigned_to(id,name,email,avatar_url)')
    .eq('org_id', orgId)
    .order('make')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ vehicles: data })
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

  if (!body.make || !body.model) return NextResponse.json({ error: 'make and model required' }, { status: 400 })

  const { data, error } = await admin.from('company_vehicles').insert({
    org_id: orgId,
    make: body.make,
    model: body.model,
    year: body.year || null,
    color: body.color || null,
    plate: body.plate || null,
    vin: body.vin || null,
    assigned_to: body.assigned_to || null,
    current_mileage: body.current_mileage || 0,
    insurance_expiry: body.insurance_expiry || null,
    registration_expiry: body.registration_expiry || null,
    notes: body.notes || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If assigned to someone, mark them as company vehicle user
  if (body.assigned_to) {
    await admin.from('employee_pay_settings').upsert({
      user_id: body.assigned_to,
      org_id: orgId,
      uses_company_vehicle: true,
      vehicle_id: data.id,
    }, { onConflict: 'user_id' })
  }

  return NextResponse.json({ vehicle: data }, { status: 201 })
}
