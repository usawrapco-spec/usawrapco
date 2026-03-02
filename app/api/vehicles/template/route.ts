/**
 * Vehicle Template Lookup API
 * Returns the best template tier for a given vehicle:
 *   Tier 1 — Exact match in vehicle_templates table (same make/model, year in range)
 *   Tier 2 — Class match (same vehicle_class)
 *   Tier 3 — AI fallback (no template found)
 *
 * GET /api/vehicles/template?make=Ford&model=Transit&year=2024&body_style=van
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

function bodyStyleToClass(bodyStyle: string): string {
  const bs = (bodyStyle || '').toLowerCase()
  if (bs.includes('box truck') || bs.includes('box_truck')) return 'box_truck'
  if (bs.includes('trailer')) return 'trailer'
  if (bs.includes('sprinter') || (bs.includes('van') && bs.includes('high roof'))) return 'van'
  if (bs.includes('van') || bs.includes('cargo')) return 'van'
  if (bs.includes('pickup') || bs.includes('truck')) return 'truck'
  if (bs.includes('suv') || bs.includes('crossover') || bs.includes('cuv')) return 'suv'
  if (bs.includes('sedan') || bs.includes('coupe') || bs.includes('hatch')) return 'sedan'
  if (bs.includes('marine') || bs.includes('boat')) return 'marine'
  return 'van'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const make       = searchParams.get('make') || ''
  const model      = searchParams.get('model') || ''
  const year       = searchParams.get('year') || ''
  const bodyStyle  = searchParams.get('body_style') || ''
  const vehicleClass = bodyStyleToClass(bodyStyle)

  try {
    const admin = getSupabaseAdmin()

    // ── Tier 1: Exact match ────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let exactQuery: any = admin
      .from('vehicle_templates')
      .select('id, make, model, template_url, template_type, vehicle_class, side_views')
      .ilike('make', make)
      .ilike('model', model)

    if (year) {
      const yr = parseInt(year, 10)
      if (!isNaN(yr)) {
        exactQuery = exactQuery
          .or(`year_start.lte.${yr},year_start.is.null`)
          .or(`year_end.gte.${yr},year_end.is.null`)
      }
    }

    const { data: exactData } = await exactQuery.limit(1).maybeSingle()

    if (exactData) {
      return NextResponse.json({
        tier: 1,
        template_id: exactData.id,
        template_url: exactData.template_url,
        template_type: exactData.template_type,
        side_views: exactData.side_views,
        matched_vehicle: `${make} ${model}`,
        vehicle_class: vehicleClass,
      })
    }

    // ── Tier 2: Class match ────────────────────────────────────────────────────
    const { data: classData } = await admin
      .from('vehicle_templates')
      .select('id, make, model, template_url, template_type, vehicle_class, side_views')
      .eq('vehicle_class', vehicleClass)
      .limit(1)
      .maybeSingle()

    if (classData) {
      return NextResponse.json({
        tier: 2,
        template_id: classData.id,
        template_url: classData.template_url,
        template_type: classData.template_type,
        side_views: classData.side_views,
        matched_vehicle: `${classData.make} ${classData.model}`,
        vehicle_class: vehicleClass,
      })
    }

    // ── Tier 3: AI fallback ───────────────────────────────────────────────────
    return NextResponse.json({
      tier: 3,
      template_url: null,
      template_type: 'ai_generated',
      matched_vehicle: null,
      vehicle_class: vehicleClass,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg, tier: 3 }, { status: 500 })
  }
}
