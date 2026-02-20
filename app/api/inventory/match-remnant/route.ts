import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: Request) {
  try {
    const { material, widthNeeded, lengthNeeded, sqftNeeded } = await req.json()

    const admin = getSupabaseAdmin()

    // Query available remnants that might fit
    let query = admin
      .from('vinyl_inventory')
      .select('*')
      .eq('status', 'available')
      .gte('sqft_available', sqftNeeded || 1)
      .order('sqft_available', { ascending: true }) // prefer exact fits
      .limit(20)

    if (material) {
      // Try to match by material type/brand in a case-insensitive way
      query = query.ilike('brand', `%${material}%`)
    }

    const { data: matches, error } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Score each match
    const scored = (matches || []).map(r => {
      let score = 0
      if (r.sqft_available >= (sqftNeeded || 0)) score += 50
      if (widthNeeded && r.width_inches >= widthNeeded) score += 25
      if (lengthNeeded && r.length_ft >= lengthNeeded) score += 25

      return { ...r, fit_score: score }
    }).filter(r => r.fit_score > 0)
      .sort((a, b) => b.fit_score - a.fit_score)

    return Response.json({ matches: scored })
  } catch (err) {
    console.error('[inventory/match-remnant] error:', err)
    return Response.json({ matches: [] })
  }
}
