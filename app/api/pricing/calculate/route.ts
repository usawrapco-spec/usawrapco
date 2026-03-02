import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// ── Pricing defaults ────────────────────────────────────────────────────────
const MATERIAL_COST_PER_SQFT = 8.50
const LABOR_COST_PER_SQFT = 3.00
const DESIGN_FEE_STANDARD = 250
const DESIGN_FEE_VECTOR = 400
const WASTE_BUFFER = 0.10

const COVERAGE_LEVELS: Record<string, { label: string; pct: number; desc: string }> = {
  full:          { label: 'Full Wrap',       pct: 1.00, desc: 'Complete bumper-to-bumper coverage' },
  three_quarter: { label: '3/4 Wrap',        pct: 0.75, desc: 'Sides, rear, and partial hood' },
  half:          { label: 'Half Wrap',        pct: 0.60, desc: 'Strategic high-visibility panels' },
  quarter:       { label: 'Quarter Wrap',     pct: 0.30, desc: 'Key branding areas only' },
  spot:          { label: 'Spot Graphics',    pct: 0.15, desc: 'Logo and contact info decals' },
}

// ── GET: vehicle lookup (makes, models, detail) ──────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'makes'
  const make = searchParams.get('make') || ''
  const model = searchParams.get('model') || ''
  const year = searchParams.get('year') || ''

  const admin = getSupabaseAdmin()

  try {
    if (action === 'makes') {
      const { data, error } = await admin
        .from('vehicle_database')
        .select('make')
        .order('make')
      if (error) throw error
      const makes = [...new Set((data || []).map((r: any) => r.make))].sort()
      return NextResponse.json({ makes })
    }

    if (action === 'models' && make) {
      const { data, error } = await admin
        .from('vehicle_database')
        .select('model')
        .eq('make', make)
        .order('model')
      if (error) throw error
      const models = [...new Set((data || []).map((r: any) => r.model))].sort()
      return NextResponse.json({ models })
    }

    if (action === 'vehicle' && make && model) {
      let q = admin
        .from('vehicle_database')
        .select('*')
        .eq('make', make)
        .eq('model', model)
      if (year) q = q.lte('year_start', Number(year)).gte('year_end', Number(year))
      const { data, error } = await q.limit(1)
      if (error) throw error
      return NextResponse.json({ vehicle: data?.[0] || null })
    }

    // Return all coverage levels with pricing defaults
    if (action === 'coverage-levels') {
      return NextResponse.json({ coverageLevels: COVERAGE_LEVELS })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[pricing/calculate] GET error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── POST: calculate price ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { vehicleId, coverageLevel, make, model, year, designType } = body

    if (!coverageLevel || !COVERAGE_LEVELS[coverageLevel]) {
      return NextResponse.json(
        { error: 'Invalid coverage level. Must be: full, three_quarter, half, quarter, spot' },
        { status: 400 }
      )
    }

    const admin = getSupabaseAdmin()
    let vehicle: any = null

    // Look up vehicle by ID first, then by make/model/year
    if (vehicleId) {
      const { data } = await admin
        .from('vehicle_database')
        .select('*')
        .eq('id', vehicleId)
        .single()
      vehicle = data
    } else if (make && model) {
      let q = admin
        .from('vehicle_database')
        .select('*')
        .eq('make', make)
        .eq('model', model)
      if (year) q = q.lte('year_start', Number(year)).gte('year_end', Number(year))
      const { data } = await q.limit(1)
      vehicle = data?.[0] || null
    }

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    // ── Pricing calc ──
    const coverage = COVERAGE_LEVELS[coverageLevel]
    const sqftFull = Number(vehicle.sqft_full) || 200
    const difficultyFactor = Number(vehicle.difficulty_factor) || 1.0

    // Apply coverage percentage + waste buffer
    const effectiveSqft = sqftFull * coverage.pct * (1 + WASTE_BUFFER)

    const materialCost = effectiveSqft * MATERIAL_COST_PER_SQFT * difficultyFactor
    const laborCost = effectiveSqft * LABOR_COST_PER_SQFT * difficultyFactor
    const designFee = designType === 'vector' ? DESIGN_FEE_VECTOR : DESIGN_FEE_STANDARD
    const totalPrice = materialCost + laborCost + designFee

    const monthlyFinancing = totalPrice / 12

    return NextResponse.json({
      vehicleId: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      bodyStyle: vehicle.body_style,
      sqftFull,
      coverageLevel,
      coveragePct: coverage.pct,
      coverageLabel: coverage.label,
      effectiveSqft: Math.round(effectiveSqft),
      difficultyFactor,
      materialCost: Math.round(materialCost),
      laborCost: Math.round(laborCost),
      designFee,
      totalPrice: Math.round(totalPrice),
      monthlyFinancing: Math.round(monthlyFinancing),
      breakdown: {
        sqftBase: Math.round(sqftFull * coverage.pct),
        sqftWithWaste: Math.round(effectiveSqft),
        materialPerSqft: MATERIAL_COST_PER_SQFT,
        laborPerSqft: LABOR_COST_PER_SQFT,
        difficultyMultiplier: difficultyFactor,
        wasteBuffer: `${WASTE_BUFFER * 100}%`,
      },
    })
  } catch (err) {
    console.error('[pricing/calculate] POST error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
