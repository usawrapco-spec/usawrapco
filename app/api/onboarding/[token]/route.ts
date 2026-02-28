import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    const { data: intake, error } = await admin
      .from('customer_intake')
      .select(`
        id,
        token,
        project_id,
        org_id,
        customer_name,
        customer_email,
        customer_phone,
        vehicle_year,
        vehicle_make,
        vehicle_model,
        vehicle_color,
        design_brief,
        wrap_style,
        coverage,
        budget_range,
        timeline,
        additional_notes,
        vehicle_photos,
        logo_files,
        completed,
        completed_at,
        expires_at,
        payment_status,
        payment_amount,
        created_at
      `)
      .eq('token', token)
      .single()

    if (error || !intake) {
      return NextResponse.json({ error: 'Onboarding token not found' }, { status: 404 })
    }

    const isExpired = intake.expires_at && new Date(intake.expires_at) < new Date()

    // Get linked project status if available
    let projectStatus: string | null = null
    if (intake.project_id) {
      const { data: project } = await admin
        .from('projects')
        .select('pipe_stage, status, title')
        .eq('id', intake.project_id)
        .single()
      if (project) projectStatus = project.pipe_stage || project.status
    }

    return NextResponse.json({
      id: intake.id,
      token: intake.token,
      project_id: intake.project_id,
      customer_name: intake.customer_name,
      customer_email: intake.customer_email,
      customer_phone: intake.customer_phone,
      vehicle: {
        year: intake.vehicle_year,
        make: intake.vehicle_make,
        model: intake.vehicle_model,
        color: intake.vehicle_color,
      },
      completed: intake.completed,
      completed_at: intake.completed_at,
      expires_at: intake.expires_at,
      is_expired: isExpired,
      payment_status: intake.payment_status || 'unpaid',
      payment_amount: intake.payment_amount,
      project_status: projectStatus,
      created_at: intake.created_at,
    })
  } catch (err) {
    console.error('[onboarding/[token]] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
