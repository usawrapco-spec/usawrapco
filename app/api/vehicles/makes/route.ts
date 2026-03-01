import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year')

  try {
    const admin = getSupabaseAdmin()
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
