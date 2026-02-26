/**
 * Vehicle Measurements Lookup API
 * Queries the vehicle_measurements table (2,034 vehicles imported from industry data).
 *
 * GET /api/vehicles/lookup?makes=1               → distinct makes list
 * GET /api/vehicles/lookup?models=1&make=Toyota  → distinct models for a make
 * GET /api/vehicles/lookup?make=Toyota&model=Camry&year=2020 → best-match measurement
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const make  = searchParams.get('make')
  const model = searchParams.get('model')
  const year  = searchParams.get('year')

  try {
    const admin = getSupabaseAdmin()

    // ── Distinct makes ──────────────────────────────────────────────────────
    if (searchParams.has('makes')) {
      const { data, error } = await admin
        .from('vehicle_measurements')
        .select('make')
        .order('make')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const makes = [...new Set((data || []).map(r => r.make as string))].sort()
      return NextResponse.json({ makes })
    }

    // ── Distinct models for a make ──────────────────────────────────────────
    if (searchParams.has('models') && make) {
      const { data, error } = await admin
        .from('vehicle_measurements')
        .select('model')
        .ilike('make', make)
        .order('model')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const models = [...new Set((data || []).map(r => r.model as string))].sort()
      return NextResponse.json({ models })
    }

    // ── Best-match measurement row ──────────────────────────────────────────
    if (!make || !model) {
      return NextResponse.json({ error: 'make and model are required' }, { status: 400 })
    }

    let query = admin
      .from('vehicle_measurements')
      .select('*')
      .ilike('make', make)
      .ilike('model', model)

    if (year) {
      const yr = parseInt(year, 10)
      if (!isNaN(yr)) {
        // Rows where year range covers the requested year
        query = query
          .lte('year_start', yr)
          .or(`year_end.gte.${yr},year_end.is.null`)
      }
    }

    const { data, error } = await query
      .order('year_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ measurement: data ?? null })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
