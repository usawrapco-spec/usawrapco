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
