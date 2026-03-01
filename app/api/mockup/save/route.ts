import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    const { data, error } = await supabase
      .from('design_mockups')
      .upsert({
        id: body.id,
        org_id: 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
        vehicle_db_id: body.vehicleDbId || null,
        vehicle_year: body.vehicleYear || null,
        vehicle_make: body.vehicleMake || null,
        vehicle_model: body.vehicleModel || null,
        vehicle_type: body.renderCategory || null,
        business_name: body.businessName || null,
        industry: body.industry || null,
        brand_colors: body.brandColors || [],
        logo_url: body.logoUrl || null,
        wrap_style: body.styleVibe || null,
        style_preference: body.feelStatement || null,
        brand_analysis: body.brandAnalysis || {},
        ideogram_prompts: body.ideogramPrompts || [],
        concept_images: body.conceptImages || [],
        render_images: body.renderImages || [],
        video_url: body.videoUrl || null,
        video_prediction_id: body.videoPredictionId || null,
        generation_status: body.generationStatus || 'pending',
        selected_concept: body.selectedConcept || 0,
        estimated_price: body.estimatedPrice || null,
        email: body.email || null,
        phone: body.phone || null,
        primary_message: {
          name: body.businessName,
          phone: body.phone,
          website: body.website,
          tagline: body.tagline,
        },
      }, { onConflict: 'id' })
      .select('id')
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, id: data.id })
  } catch (error) {
    console.error('Save mockup error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
