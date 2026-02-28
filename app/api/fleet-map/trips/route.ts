import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const vehicle_id = searchParams.get('vehicle_id')

  if (!vehicle_id) return NextResponse.json({ error: 'vehicle_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('fleet_trips')
    .select('id, trip_date, from_location, to_location, distance_miles, started_at, ended_at, notes, created_at')
    .eq('vehicle_id', vehicle_id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const body = await req.json()

  const { data, error } = await supabase
    .from('fleet_trips')
    .insert({
      vehicle_id: body.vehicle_id,
      org_id: ORG_ID,
      trip_date: body.trip_date || new Date().toISOString().split('T')[0],
      from_location: body.from_location,
      to_location: body.to_location,
      distance_miles: body.distance_miles || 0,
      notes: body.notes,
      logged_by: user?.id,
      started_at: body.started_at,
      ended_at: body.ended_at,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
