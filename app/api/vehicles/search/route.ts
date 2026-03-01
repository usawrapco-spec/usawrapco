import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || ''
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '8')

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('vehicle_database')
    .select('id, year, make, model, body_style, sqft_full, render_category, template_url, difficulty_factor')
    .or(`make.ilike.%${q}%,model.ilike.%${q}%,body_style.ilike.%${q}%`)
    .order('year', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ vehicles: [] })
  return NextResponse.json({ vehicles: data })
}
