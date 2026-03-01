import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

type MeasurementRow = {
  model: string
  full_wrap_sqft: number | null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const make = searchParams.get('make')
  const year = searchParams.get('year')

  if (!make) {
    return NextResponse.json({ error: 'make is required' }, { status: 400 })
  }

  try {
    const admin = getSupabaseAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = admin
      .from('vehicle_measurements')
      .select('model, full_wrap_sqft')
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

    // Deduplicate models, keep first sqft value found
    const seen = new Map<string, { model: string; sqft: number | null; base_price: number | null; install_hours: number | null }>()
    for (const row of (data || []) as MeasurementRow[]) {
      if (!seen.has(row.model)) {
        const sqft = row.full_wrap_sqft ? Number(row.full_wrap_sqft) : null
        seen.set(row.model, {
          model: row.model,
          sqft,
          base_price: sqft ? Math.round(sqft * 20) : null,
          install_hours: sqft ? Math.round((sqft / 30) * 10) / 10 : null,
        })
      }
    }

    const models = [...seen.values()].sort((a, b) => a.model.localeCompare(b.model))
    return NextResponse.json({ models })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
