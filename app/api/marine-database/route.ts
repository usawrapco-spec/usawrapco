import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const search = url.searchParams.get('search') || ''
  const boat_class = url.searchParams.get('boat_class') || ''
  const make = url.searchParams.get('make') || ''
  const page = parseInt(url.searchParams.get('page') || '0')
  const pageSize = 50

  const admin = getSupabaseAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = admin
    .from('marine_vessels')
    .select('*', { count: 'exact' })
    .order('make')
    .order('model')
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (make) query = query.eq('make', make)
  if (boat_class) query = query.eq('boat_class', boat_class)
  if (search.length >= 2) query = query.or(`make.ilike.%${search}%,model.ilike.%${search}%`)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['owner', 'admin'].includes(profile.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!body.make || !body.model) return NextResponse.json({ error: 'make and model required' }, { status: 400 })

  const { data, error } = await admin.from('marine_vessels').insert({
    make: body.make,
    model: body.model,
    year: body.year || null,
    boat_class: body.boat_class || 'custom',
    overall_length_ft: body.overall_length_ft || null,
    beam_ft: body.beam_ft || null,
    draft_ft: body.draft_ft || null,
    dry_weight_lbs: body.dry_weight_lbs || null,
    fuel_capacity_gal: body.fuel_capacity_gal || null,
    water_capacity_gal: body.water_capacity_gal || null,
    num_levels: body.num_levels || 1,
    deck_components: body.deck_components || [],
    estimated_value_min: body.estimated_value_min || null,
    estimated_value_max: body.estimated_value_max || null,
    fun_facts: body.fun_facts || [],
    schematic_svg: body.schematic_svg || null,
    manual_url: body.manual_url || null,
    manual_summary: body.manual_summary || null,
    ai_generated: body.ai_generated || false,
    source_urls: body.source_urls || [],
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
