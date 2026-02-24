import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const {
      token,
      customer_name,
      customer_email,
      customer_phone,
      vehicle_year,
      vehicle_make,
      vehicle_model,
      vehicle_color,
      vehicle_vin,
      design_brief,
      wrap_style,
      coverage,
      budget_range,
      timeline,
      additional_notes,
      vehicle_photos,
      logo_files,
    } = await req.json()

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Look up intake record
    const { data: intake, error: lookupErr } = await admin
      .from('customer_intake')
      .select('id, project_id, expires_at, completed')
      .eq('token', token)
      .single()

    if (lookupErr || !intake) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 })
    }

    if (intake.completed) {
      return NextResponse.json({ error: 'This onboarding link has already been completed' }, { status: 409 })
    }

    if (intake.expires_at && new Date(intake.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This onboarding link has expired' }, { status: 410 })
    }

    // Update intake record with submitted data
    const { error: updateErr } = await admin.from('customer_intake').update({
      customer_name: customer_name || null,
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
      vehicle_year: vehicle_year || null,
      vehicle_make: vehicle_make || null,
      vehicle_model: vehicle_model || null,
      vehicle_color: vehicle_color || null,
      vehicle_vin: vehicle_vin || null,
      design_brief: design_brief || null,
      wrap_style: wrap_style || null,
      coverage: coverage || null,
      budget_range: budget_range || null,
      timeline: timeline || null,
      additional_notes: additional_notes || null,
      vehicle_photos: vehicle_photos || [],
      logo_files: logo_files || [],
      completed: true,
      completed_at: new Date().toISOString(),
    }).eq('token', token)

    if (updateErr) {
      console.error('[onboarding/submit] update error:', updateErr)
      return NextResponse.json({ error: 'Failed to save onboarding data' }, { status: 500 })
    }

    // Update linked project if exists
    if (intake.project_id) {
      await admin.from('projects').update({
        stage: 'sales_in',
        updated_at: new Date().toISOString(),
      }).eq('id', intake.project_id)
    }

    return NextResponse.json({ success: true, project_id: intake.project_id })
  } catch (err) {
    console.error('[onboarding/submit] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
