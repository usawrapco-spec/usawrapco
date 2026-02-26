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
    const customerId = url.searchParams.get('customer_id')
    const wrapStatus = url.searchParams.get('wrap_status')

    let query = admin
      .from('fleet_vehicles')
      .select('*, customer:customer_id(id, name, business_name)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (customerId) query = query.eq('customer_id', customerId)
    if (wrapStatus) query = query.eq('wrap_status', wrapStatus)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ vehicles: data || [] })
  } catch (err) {
    console.error('[fleet/vehicles GET]', err)
    return Response.json({ error: 'Failed to load vehicles' }, { status: 500 })
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

    // Support batch insert
    if (Array.isArray(body.vehicles)) {
      const rows = body.vehicles.map((v: any) => ({
        org_id: orgId,
        added_by: user.id,
        year: v.year || null,
        make: v.make || null,
        model: v.model || null,
        trim: v.trim || null,
        color: v.color || null,
        vin: v.vin || null,
        body_class: v.body_class || null,
        engine: v.engine || null,
        fuel_type: v.fuel_type || null,
        drive_type: v.drive_type || null,
        customer_id: v.customer_id || null,
        source: v.source || 'manual',
        notes: v.notes || null,
      }))
      const { data, error } = await admin.from('fleet_vehicles').insert(rows).select()
      if (error) return Response.json({ error: error.message }, { status: 500 })
      return Response.json({ vehicles: data })
    }

    // Single insert
    const { data, error } = await admin.from('fleet_vehicles').insert({
      org_id: orgId,
      added_by: user.id,
      year: body.year || null,
      make: body.make || null,
      model: body.model || null,
      trim: body.trim || null,
      color: body.color || null,
      vin: body.vin || null,
      body_class: body.body_class || null,
      engine: body.engine || null,
      fuel_type: body.fuel_type || null,
      drive_type: body.drive_type || null,
      customer_id: body.customer_id || null,
      source: body.source || 'manual',
      wrap_status: body.wrap_status || 'none',
      notes: body.notes || null,
    }).select().single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ vehicle: data })
  } catch (err) {
    console.error('[fleet/vehicles POST]', err)
    return Response.json({ error: 'Failed to create vehicle' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
    const orgId = profile?.org_id || ORG_ID

    const body = await req.json()
    if (!body.id) return Response.json({ error: 'id required' }, { status: 400 })

    const { id, ...updates } = body
    updates.updated_at = new Date().toISOString()

    const { data, error } = await admin
      .from('fleet_vehicles')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ vehicle: data })
  } catch (err) {
    console.error('[fleet/vehicles PATCH]', err)
    return Response.json({ error: 'Failed to update vehicle' }, { status: 500 })
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
      .from('fleet_vehicles')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (err) {
    console.error('[fleet/vehicles DELETE]', err)
    return Response.json({ error: 'Failed to delete vehicle' }, { status: 500 })
  }
}
