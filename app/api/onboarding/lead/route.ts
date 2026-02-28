import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await req.json()

    // Combine vehicle fields into a single string (DB only has a 'vehicle' text column)
    const vehicleParts = [body.vehicle_year, body.vehicle_make, body.vehicle_model].filter(Boolean)
    const vehicleStr = vehicleParts.length > 0 ? vehicleParts.join(' ') : (body.vehicle || null)

    // Store extended fields in metadata JSONB
    const metadata: Record<string, any> = {}
    if (body.vehicle_vin) metadata.vin = body.vehicle_vin
    if (body.project_type) metadata.project_type = body.project_type
    if (body.purpose) metadata.purpose = body.purpose
    if (body.coverage_type) metadata.coverage_type = body.coverage_type
    if (body.addons?.length) metadata.addons = body.addons
    if (body.total_price) metadata.total_price = body.total_price
    if (body.design_notes) metadata.design_notes = body.design_notes
    if (body.logo_url) metadata.logo_url = body.logo_url

    const { error, data } = await supabase
      .from('onboarding_leads')
      .insert({
        name: body.full_name || body.name || null,
        email: body.email || null,
        phone: body.phone || null,
        company: body.business_name || body.company || null,
        vehicle: vehicleStr,
        message: body.message || body.design_notes || null,
        source: body.referral_source || body.source || null,
        status: 'new',
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
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
