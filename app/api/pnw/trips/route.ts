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
      .from('pnw_trips')
      .select('*, catches:pnw_catches(count)')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json({ trips: data || [] })
  } catch (err) {
    console.error('Trips GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('pnw_trips')
      .insert({ ...body, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ trip: data })
  } catch (err) {
    console.error('Trips POST error:', err)
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Missing trip id' }, { status: 400 })

    const allowed = [
      'title', 'end_time', 'distance_nm', 'max_speed_knots', 'avg_speed_knots',
      'route_geojson', 'catch_count', 'photos', 'notes', 'is_public', 'start_time',
    ]
    const clean: Record<string, any> = {}
    for (const k of allowed) {
      if (k in updates) clean[k] = updates[k]
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('pnw_trips')
      .update(clean)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ trip: data })
  } catch (err) {
    console.error('Trips PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 })
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
    const { error } = await admin
      .from('pnw_trips')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Trips DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 })
  }
}
