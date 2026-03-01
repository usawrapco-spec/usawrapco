import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// Known wildlife habitat areas (hardcoded from verified sources)
const HABITAT_AREAS = [
  {
    id: 'orca-pod-l',
    name: 'L Pod Orca Route',
    species: 'Orca (L Pod)',
    lat: 47.4,
    lng: -122.45,
    description: 'Southern Resident Killer Whales (L Pod) commonly transit through this area during salmon runs. Best viewing: Jun-Sep.',
    verified: true,
  },
  {
    id: 'harbor-seals-kopachuck',
    name: 'Harbor Seal Haul-Out',
    species: 'Harbor Seal',
    lat: 47.322,
    lng: -122.63,
    description: 'Kopachuck reef is a regular haul-out area for harbor seals. Maintain 100-yard distance per MMPA.',
    verified: true,
  },
  {
    id: 'eagles-vashon',
    name: 'Bald Eagle Nesting (Vashon)',
    species: 'Bald Eagle',
    lat: 47.4,
    lng: -122.47,
    description: 'Active bald eagle nesting territory along Vashon Island shoreline. Eagles hunt for salmon year-round.',
    verified: true,
  },
  {
    id: 'porpoise-narrows',
    name: "Dall's Porpoise — Narrows",
    species: "Dall's Porpoise",
    lat: 47.27,
    lng: -122.55,
    description: "Dall's porpoise frequently ride bow waves through the Tacoma Narrows. Fast-moving; look for rooster-tail spray.",
    verified: true,
  },
  {
    id: 'dungeness-crab-flatbottom',
    name: 'Dungeness Crab Grounds',
    species: 'Dungeness Crab',
    lat: 47.19,
    lng: -122.72,
    description: 'Productive Dungeness crab habitat on sandy/gravel bottom 20-60ft. Check WDFW for current season dates.',
    verified: true,
  },
]

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') || '30')

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const admin = getSupabaseAdmin()
    const since = new Date(Date.now() - days * 86400000).toISOString()

    const { data: sightings, error } = await admin
      .from('pnw_wildlife')
      .select('*')
      .gte('sighted_at', since)
      .order('sighted_at', { ascending: false })
      .limit(100)

    if (error) throw error

    return NextResponse.json({
      sightings: sightings || [],
      habitat_areas: HABITAT_AREAS,
      count: (sightings || []).length,
    })
  } catch (err) {
    console.error('Wildlife error:', err)
    // Return habitat areas even if DB fails
    return NextResponse.json({ sightings: [], habitat_areas: HABITAT_AREAS, count: 0 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { species, count, lat, lng, location_name, description, photo_url } = body
    if (!species || !lat || !lng) {
      return NextResponse.json({ error: 'Missing required fields: species, lat, lng' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('pnw_wildlife')
      .insert({
        user_id: user.id,
        species,
        count: count || 1,
        lat,
        lng,
        location_name,
        description,
        photo_url,
        reported_by: user.email,
        sighted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ sighting: data })
  } catch (err) {
    console.error('Wildlife POST error:', err)
    return NextResponse.json({ error: 'Failed to save sighting' }, { status: 500 })
  }
}
