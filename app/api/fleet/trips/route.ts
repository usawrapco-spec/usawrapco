import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
    const orgId = profile?.org_id || ORG_ID

    const url = new URL(req.url)
    const vehicleId = url.searchParams.get('vehicle_id')

    let query = admin
      .from('fleet_trips')
      .select('*, vehicle:vehicle_id(id, year, make, model), driver:driver_id(id, name)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (vehicleId) query = query.eq('vehicle_id', vehicleId)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ trips: data || [] })
  } catch (err) {
    console.error('[fleet/trips GET]', err)
    return Response.json({ error: 'Failed to load trips' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
    const orgId = profile?.org_id || ORG_ID

    const body = await req.json()
    if (!body.vehicle_id) return Response.json({ error: 'vehicle_id required' }, { status: 400 })

    const { data, error } = await admin.from('fleet_trips').insert({
      org_id: orgId,
      vehicle_id: body.vehicle_id,
      driver_id: body.driver_id || user.id,
      start_time: body.start_time || null,
      end_time: body.end_time || null,
      miles: body.miles || 0,
      route_points: body.route_points || [],
      date: body.date || new Date().toISOString().split('T')[0],
      trip_type: body.trip_type || 'business',
      notes: body.notes || null,
      simulated: body.simulated || false,
    }).select().single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Update vehicle mileage
    if (body.miles && body.miles > 0) {
      // Manual mileage update — get current + add
      const { data: vehicle } = await admin.from('fleet_vehicles').select('mileage').eq('id', body.vehicle_id).single()
      if (vehicle) {
        await admin.from('fleet_vehicles').update({
          mileage: (vehicle.mileage || 0) + Math.round(Number(body.miles)),
          updated_at: new Date().toISOString(),
        }).eq('id', body.vehicle_id)
      }
    }

    return Response.json({ trip: data })
  } catch (err) {
    console.error('[fleet/trips POST]', err)
    return Response.json({ error: 'Failed to save trip' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
    const orgId = profile?.org_id || ORG_ID

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    const { error } = await admin
      .from('fleet_trips')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (err) {
    console.error('[fleet/trips DELETE]', err)
    return Response.json({ error: 'Failed to delete trip' }, { status: 500 })
  }
}
