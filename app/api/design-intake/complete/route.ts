import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

    const admin = getSupabaseAdmin()

    const { data: session } = await admin.from('design_intake_sessions')
      .select('*')
      .eq('token', token)
      .single()

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const now = new Date().toISOString()

    // Mark session complete
    await admin.from('design_intake_sessions')
      .update({ completed: true, completed_at: now, updated_at: now })
      .eq('token', token)

    // Create customer record if we have email and no existing customer
    let customerId: string | null = null
    if (session.contact_email) {
      const { data: existing } = await admin.from('customers')
        .select('id')
        .eq('org_id', ORG_ID)
        .eq('email', session.contact_email)
        .single()

      if (existing) {
        customerId = existing.id
      } else {
        const { data: newCustomer } = await admin.from('customers').insert({
          org_id: ORG_ID,
          name: session.business_name || session.contact_name || 'New Lead',
          contact_name: session.contact_name,
          email: session.contact_email,
          phone: session.contact_phone,
          company_name: session.business_name,
          website: session.website_url,
          source: 'design_intake',
        }).select('id').single()
        customerId = newCustomer?.id || null
      }
    }

    // Create project if not linked
    let projectId = session.project_id
    if (!projectId) {
      const services = session.services_selected || []
      const title = session.business_name
        ? `${session.business_name} - Design Intake`
        : `${session.contact_name || 'New Lead'} - Design Intake`

      const { data: project } = await admin.from('projects').insert({
        org_id: ORG_ID,
        title,
        type: 'design',
        status: 'estimate',
        pipe_stage: 'sales_in',
        customer_id: customerId,
        design_intake_token: token,
        form_data: {
          services_selected: services,
          vehicle_data: session.vehicle_data,
          brand_data: session.brand_data,
          style_preference: session.style_preference,
          ai_summary: session.ai_summary,
          source: 'design_intake',
        },
      }).select('id').single()

      projectId = project?.id || null

      // Link session to project
      if (projectId) {
        await admin.from('design_intake_sessions')
          .update({ project_id: projectId })
          .eq('token', token)
      }
    }

    // Notify team
    await admin.from('notifications').insert({
      org_id: ORG_ID,
      type: 'design_intake_completed',
      title: `New Design Intake: ${session.contact_name || session.business_name || 'Unknown'}`,
      message: `${(session.services_selected || []).join(', ')} - ${session.contact_email || 'no email'}`,
      read: false,
    })

    return NextResponse.json({ ok: true, project_id: projectId, customer_id: customerId })
  } catch (err) {
    console.error('[design-intake/complete] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
