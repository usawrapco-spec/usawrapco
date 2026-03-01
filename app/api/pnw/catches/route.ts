import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('pnw_catches')
      .select('*, trip:trip_id(title, start_time)')
      .eq('user_id', user.id)
      .order('caught_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return NextResponse.json({ catches: data || [] })
  } catch (err) {
    console.error('Catches GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch catches' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { species, trip_id, length_inches, weight_lbs, kept, bait, depth_ft, lat, lng, photo_url } = body

    if (!species) return NextResponse.json({ error: 'species is required' }, { status: 400 })

    const admin = getSupabaseAdmin()

    // Insert the catch
    const { data, error } = await admin
      .from('pnw_catches')
      .insert({
        user_id: user.id,
        trip_id: trip_id || null,
        species,
        length_inches: length_inches || null,
        weight_lbs: weight_lbs || null,
        kept: kept ?? false,
        bait: bait || null,
        depth_ft: depth_ft || null,
        lat: lat || null,
        lng: lng || null,
        photo_url: photo_url || null,
        caught_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Increment trip catch_count if a trip_id was provided
    if (trip_id) {
      await admin.rpc('increment_trip_catch_count', { p_trip_id: trip_id }).then(
        // Fallback if RPC doesn't exist: do a manual increment
        async ({ error: rpcError }) => {
          if (rpcError) {
            const { data: trip } = await admin
              .from('pnw_trips')
              .select('catch_count')
              .eq('id', trip_id)
              .single()
            if (trip) {
              await admin
                .from('pnw_trips')
                .update({ catch_count: (trip.catch_count || 0) + 1 })
                .eq('id', trip_id)
            }
          }
        }
      )
    }

    return NextResponse.json({ catch: data })
  } catch (err) {
    console.error('Catches POST error:', err)
    return NextResponse.json({ error: 'Failed to save catch' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Missing catch id' }, { status: 400 })

    const allowed = ['species', 'length_inches', 'weight_lbs', 'kept', 'bait', 'depth_ft', 'photo_url']
    const clean: Record<string, any> = {}
    for (const k of allowed) {
      if (k in updates) clean[k] = updates[k]
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('pnw_catches')
      .update(clean)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ catch: data })
  } catch (err) {
    console.error('Catches PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update catch' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const admin = getSupabaseAdmin()

    // Get the catch first so we can decrement the trip count
    const { data: catchRow } = await admin
      .from('pnw_catches')
      .select('trip_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    const { error } = await admin
      .from('pnw_catches')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    // Decrement trip catch_count if applicable
    if (catchRow?.trip_id) {
      const { data: trip } = await admin
        .from('pnw_trips')
        .select('catch_count')
        .eq('id', catchRow.trip_id)
        .single()
      if (trip && trip.catch_count > 0) {
        await admin
          .from('pnw_trips')
          .update({ catch_count: trip.catch_count - 1 })
          .eq('id', catchRow.trip_id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Catches DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete catch' }, { status: 500 })
  }
}
