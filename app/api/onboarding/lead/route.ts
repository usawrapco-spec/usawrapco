import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await req.json()
    const { error, data } = await supabase
      .from('onboarding_leads')
      .insert({
        full_name: body.full_name || null,
        email: body.email || null,
        phone: body.phone || null,
        business_name: body.business_name || null,
        project_type: body.project_type || null,
        purpose: body.purpose || null,
        vehicle_year: body.vehicle_year || null,
        vehicle_make: body.vehicle_make || null,
        vehicle_model: body.vehicle_model || null,
        vehicle_vin: body.vehicle_vin || null,
        coverage_type: body.coverage_type || null,
        addons: body.addons || [],
        total_price: body.total_price || null,
        design_notes: body.design_notes || null,
        logo_url: body.logo_url || null,
        referral_source: body.referral_source || null,
        status: 'new',
      })
      .select()
      .single()

    if (error) {
      console.error('lead create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ id: data.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
