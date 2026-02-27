import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id || ORG_ID

  const { data: leads, error } = await admin
    .from('wrap_leads')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ leads: leads || [] })
}

export async function PUT(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const body = await req.json()
  const { leadId, status, convertToCampaign } = body

  if (!leadId) {
    return Response.json({ error: 'leadId required' }, { status: 400 })
  }

  // If converting to campaign, create the wrap_campaigns record first
  if (convertToCampaign) {
    const { data: lead } = await admin.from('wrap_leads').select('*').eq('id', leadId).single()
    if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 })

    const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
    const orgId = profile?.org_id || ORG_ID

    // Create campaign
    const qrSlug = lead.tracking_code?.toLowerCase() || Math.random().toString(36).slice(2, 8)
    const { data: campaign, error: campError } = await admin.from('wrap_campaigns').insert({
      org_id: orgId,
      vehicle_label: `${lead.company || lead.name || 'Lead'} - ${lead.vehicle_type || 'Vehicle'}`,
      industry: lead.industry,
      avg_ltv: lead.avg_job_value,
      investment_amount: 0,
      qr_slug: qrSlug,
      status: 'active',
    }).select().single()

    if (campError) {
      return Response.json({ error: campError.message }, { status: 500 })
    }

    // Update lead
    await admin.from('wrap_leads').update({
      status: 'converted',
      converted_to_campaign_id: campaign.id,
      updated_at: new Date().toISOString(),
    }).eq('id', leadId)

    return Response.json({ lead: { ...lead, status: 'converted', converted_to_campaign_id: campaign.id }, campaign })
  }

  // Simple status update
  const { data: updated, error } = await admin
    .from('wrap_leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', leadId)
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ lead: updated })
}
