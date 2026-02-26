import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const region = searchParams.get('region')
  const fuel = searchParams.get('fuel')
  const launch = searchParams.get('launch')

  const admin = getSupabaseAdmin()

  let query = admin
    .from('marinas')
    .select('*')
    .eq('is_operational', true)
    .order('name')

  if (region) query = query.eq('region', region)
  if (fuel === 'true') query = query.eq('has_fuel_dock', true)
  if (launch === 'true') query = query.eq('has_launch_ramp', true)

  const { data, error } = await query
  if (error) return Response.json({ marinas: [] })

  return Response.json({ marinas: data || [] })
}
