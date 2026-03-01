import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const admin = getSupabaseAdmin()

    const allowed = ['status', 'mockup_id', 'converted_customer_id', 'converted_project_id']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    const { error } = await admin
      .from('design_intakes')
      .update(updates)
      .eq('id', params.id)
      .eq('org_id', ORG_ID)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[design-intakes/[id]] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Convert intake to project
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { action } = await request.json()
    const admin = getSupabaseAdmin()

    const { data: intake, error: fetchErr } = await admin
      .from('design_intakes')
      .select('*')
      .eq('id', params.id)
      .eq('org_id', ORG_ID)
      .single()

    if (fetchErr || !intake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    if (action === 'convert_to_job') {
      // Create project from intake
      const title = intake.business_name
        ? `${intake.business_name} — Design`
        : `${intake.customer_name || 'New Lead'} — Design`

      const { data: project, error: projectErr } = await admin
        .from('projects')
        .insert({
          org_id: ORG_ID,
          title,
          type: 'design',
          status: 'estimate',
          pipe_stage: 'sales_in',
          customer_id: intake.converted_customer_id || null,
          form_data: {
            services: intake.services_requested,
            vehicle_details: intake.vehicle_details,
            brand_assets: intake.brand_assets,
            vision_notes: intake.vision_notes,
            source: 'design_intake',
            intake_id: intake.id,
          },
        })
        .select('id')
        .single()

      if (projectErr || !project) {
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
      }

      // Link intake to project
      await admin
        .from('design_intakes')
        .update({ converted_project_id: project.id, status: 'converted' })
        .eq('id', params.id)

      return NextResponse.json({ projectId: project.id })
    }

    if (action === 'create_brief') {
      // Create brief record
      const briefContent = `
# Design Brief — ${intake.business_name || intake.customer_name}

## Contact
- **Name:** ${intake.customer_name || 'N/A'}
- **Business:** ${intake.business_name || 'N/A'}
- **Email:** ${intake.email || 'N/A'}
- **Phone:** ${intake.phone || 'N/A'}

## Services Requested
${((intake.services_requested as string[]) || []).map((s: string) => `- ${s.replace(/_/g, ' ')}`).join('\n')}

## Vehicle Details
${intake.vehicle_details ? JSON.stringify(intake.vehicle_details, null, 2) : 'N/A'}

## Brand Assets
${intake.brand_assets ? JSON.stringify(intake.brand_assets, null, 2) : 'N/A'}

## Vision Notes
${intake.vision_notes || 'See AI conversation transcript'}

## AI Conversation
${((intake.ai_conversation as Array<{ role: string; content: string }>) || [])
  .map((m: { role: string; content: string }) => `**${m.role.toUpperCase()}:** ${m.content}`)
  .join('\n\n')}
      `.trim()

      // Try to insert into design_project_briefs or briefs table
      const { data: brief } = await admin
        .from('design_projects')
        .insert({
          org_id: ORG_ID,
          title: `Brief — ${intake.business_name || intake.customer_name}`,
          status: 'brief_created',
          client_name: intake.customer_name || intake.business_name || null,
          ai_brief: briefContent,
          intake_id: intake.id,
        })
        .select('id')
        .single()

      await admin
        .from('design_intakes')
        .update({ status: 'brief_created' })
        .eq('id', params.id)

      return NextResponse.json({ briefId: brief?.id })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[design-intakes/[id]] POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
