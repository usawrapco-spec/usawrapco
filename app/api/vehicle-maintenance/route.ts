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
  const vehicleId = req.nextUrl.searchParams.get('vehicle_id')

  let query = admin
    .from('vehicle_maintenance')
    .select('*, vehicle:vehicle_id(id,make,model,year,plate)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (vehicleId) query = query.eq('vehicle_id', vehicleId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ records: data })
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

  if (!body.vehicle_id || !body.type) return NextResponse.json({ error: 'vehicle_id and type required' }, { status: 400 })

  const { data, error } = await admin.from('vehicle_maintenance').insert({
    vehicle_id: body.vehicle_id,
    org_id: orgId,
    type: body.type,
    description: body.description || null,
    cost: parseFloat(body.cost) || 0,
    mileage_at_service: body.mileage_at_service || null,
    next_service_due_miles: body.next_service_due_miles || null,
    next_service_due_date: body.next_service_due_date || null,
    receipt_url: body.receipt_url || null,
    performed_by: body.performed_by || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update vehicle current mileage if provided
  if (body.mileage_at_service) {
    await admin.from('company_vehicles').update({
      current_mileage: body.mileage_at_service,
      last_oil_change_miles: body.type === 'oil_change' ? body.mileage_at_service : undefined,
      next_oil_change_miles: body.type === 'oil_change' && body.next_service_due_miles ? body.next_service_due_miles : undefined,
      updated_at: new Date().toISOString(),
    }).eq('id', body.vehicle_id)
  }

  return NextResponse.json({ record: data }, { status: 201 })
}
