import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('org_id')

  if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

  const supabase = createClient()

  const { data, error } = await supabase
    .from('vinyl_inventory')
    .select(`
      id,
      brand,
      color,
      finish,
      sku,
      width_inches,
      length_ft,
      sqft_available,
      cost_per_foot,
      status,
      location,
      notes,
      metadata
    `)
    .eq('org_id', orgId)
    .in('status', ['in_stock', 'low'])
    .order('brand', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Compute cost_per_sqft from cost_per_foot and width
  const rolls = (data || []).map(r => {
    const widthFt = (r.width_inches || 54) / 12
    const costPerSqft = widthFt > 0 && r.cost_per_foot ? r.cost_per_foot / widthFt : null
    // Build display name: brand + color + finish
    const parts = [r.brand, r.color, r.finish].filter(Boolean)
    const name = parts.length ? parts.join(' · ') : (r.sku || 'Unknown Roll')
    return {
      id: r.id,
      name,
      brand: r.brand,
      color: r.color,
      finish: r.finish,
      sku: r.sku,
      width_in: r.width_inches,
      roll_length_ft: r.length_ft,
      sqft_available: r.sqft_available,
      cost_per_sqft: costPerSqft ? Math.round(costPerSqft * 1000) / 1000 : null,
      cost_per_foot: r.cost_per_foot,
      status: r.status,
      location: r.location,
      notes: r.notes,
    }
  })

  return NextResponse.json({ rolls })
}
