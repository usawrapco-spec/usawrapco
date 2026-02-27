import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: Request) {
  try {
    const { material, widthNeeded, sqftNeeded } = await req.json()
    const admin = getSupabaseAdmin()

    let query = admin
      .from('vinyl_inventory')
      .select('*')
      .eq('status', 'in_stock')
      .gte('qty_sqft', sqftNeeded || 1)
      .order('qty_sqft', { ascending: true })
      .limit(20)

    if (material) {
      query = query.ilike('brand', `%${material}%`)
    }

    const { data: matches, error } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    const scored = (matches || []).map((r: Record<string, unknown>) => {
      let score = 0
      if (Number(r.qty_sqft) >= (sqftNeeded || 0)) score += 50
      if (widthNeeded && Number(r.width_in) >= widthNeeded) score += 50
      return { ...r, fit_score: score }
    }).filter((r: { fit_score: number }) => r.fit_score > 0)
      .sort((a: { fit_score: number }, b: { fit_score: number }) => b.fit_score - a.fit_score)

    return Response.json({ matches: scored })
  } catch (err) {
    console.error('[inventory/match-remnant] error:', err)
    return Response.json({ matches: [] })
  }
}
