import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const vehicle_id = searchParams.get('vehicle_id')

  if (!vehicle_id) return NextResponse.json({ error: 'vehicle_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('fleet_mileage_logs')
    .select('id, log_date, miles, odometer_reading, purpose, source, created_at')
    .eq('vehicle_id', vehicle_id)
    .order('log_date', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const body = await req.json()

  const { data, error } = await supabase
    .from('fleet_mileage_logs')
    .insert({
      vehicle_id: body.vehicle_id,
      org_id: ORG_ID,
      log_date: body.log_date || new Date().toISOString().split('T')[0],
      miles: body.miles,
      odometer_reading: body.odometer_reading,
      purpose: body.purpose,
      logged_by: user?.id,
      source: 'manual',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update vehicle mileage if odometer provided
  if (body.odometer_reading && body.vehicle_id) {
    await supabase
      .from('fleet_vehicles')
      .update({ mileage: body.odometer_reading, updated_at: new Date().toISOString() })
      .eq('id', body.vehicle_id)
      .eq('org_id', ORG_ID)
  }

  return NextResponse.json(data)
}
