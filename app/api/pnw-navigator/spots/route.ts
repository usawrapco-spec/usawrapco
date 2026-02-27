import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const region = searchParams.get('region')
  const water_type = searchParams.get('water_type')
  const species = searchParams.get('species')

  const admin = getSupabaseAdmin()

  let query = admin
    .from('fishing_spots')
    .select('*')
    .eq('verified', true)
    .order('avg_rating', { ascending: false })

  if (region) query = query.eq('region', region)
  if (water_type) query = query.eq('water_type', water_type)

  const { data, error } = await query.limit(100)
  if (error) return Response.json({ spots: [] })

  let spots = data || []

  // Filter by species if specified
  if (species) {
    spots = spots.filter((s: any) => {
      if (!s.species_present) return false
      const arr = typeof s.species_present === 'string'
        ? JSON.parse(s.species_present)
        : s.species_present
      return arr.some((sp: any) => sp.species_id === species)
    })
  }

  return Response.json({ spots })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from('fishing_spots').insert({
    name: body.name,
    water_type: body.water_type || 'saltwater',
    lat: body.lat || null,
    lng: body.lng || null,
    description: body.notes || body.description || null,
    difficulty: body.difficulty || 'intermediate',
    contributor_id: user.id,
    verified: false,
    species_present: [],
    best_techniques: [],
    photos: [],
    gps_waypoints: [],
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ spot: data })
}
