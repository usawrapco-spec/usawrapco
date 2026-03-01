/**
 * Vehicle Measurements Lookup API
 * Queries the vehicle_measurements table (2,034 vehicles imported from industry data).
 *
 * GET /api/vehicles/lookup?years=true                        → distinct years (2026..1990)
 * GET /api/vehicles/lookup?makes=1                           → all distinct makes
 * GET /api/vehicles/lookup?makes=1&year=2023                 → makes for a specific year
 * GET /api/vehicles/lookup?models=1&make=Toyota              → models for a make
 * GET /api/vehicles/lookup?models=1&make=Toyota&year=2023    → models for make + year
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

    // ── Distinct years (static range) ────────────────────────────────────────
    if (searchParams.has('years')) {
      const years = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => 2026 - i)
      return NextResponse.json({ years })
    }

    // ── Distinct makes (optionally filtered by year) ─────────────────────────
    if (searchParams.has('makes')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = admin
        .from('vehicle_measurements')
        .select('make')
        .order('make')

      if (year) {
        const yr = parseInt(year, 10)
        if (!isNaN(yr)) {
          query = query
            .lte('year_start', yr)
            .or(`year_end.gte.${yr},year_end.is.null`)
        }
      }

      const { data, error } = await query
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const makes = [...new Set((data || []).map((r: { make: string }) => r.make))].sort()
      return NextResponse.json({ makes })
    }

    // ── Distinct models for a make (optionally filtered by year) ────────────
    if (searchParams.has('models') && make) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = admin
        .from('vehicle_measurements')
        .select('model')
        .ilike('make', make)
        .order('model')

      if (year) {
        const yr = parseInt(year, 10)
        if (!isNaN(yr)) {
          query = query
            .lte('year_start', yr)
            .or(`year_end.gte.${yr},year_end.is.null`)
        }
      }

      const { data, error } = await query
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const models = [...new Set((data || []).map((r: { model: string }) => r.model))].sort()
      return NextResponse.json({ models })
    }

    // ── Best-match measurement row ──────────────────────────────────────────
    if (!make || !model) {
      return NextResponse.json({ error: 'make and model are required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = admin
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

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
