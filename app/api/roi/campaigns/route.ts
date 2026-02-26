import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id || ORG_ID

  const { data, error } = await admin
    .from('wrap_campaigns')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Fetch aggregated event counts per campaign
  const campaignIds = (data || []).map((c: any) => c.id)
  let eventAggs: any[] = []
  if (campaignIds.length > 0) {
    const { data: events } = await admin
      .from('wrap_tracking_events')
      .select('campaign_id, event_type, job_value, job_confirmed')
      .in('campaign_id', campaignIds)

    // Aggregate manually
    const agg: Record<string, { calls: number; scans: number; jobs: number; revenue: number }> = {}
    for (const e of events || []) {
      if (!agg[e.campaign_id]) agg[e.campaign_id] = { calls: 0, scans: 0, jobs: 0, revenue: 0 }
      if (e.event_type === 'call') agg[e.campaign_id].calls++
      if (e.event_type === 'qr_scan') agg[e.campaign_id].scans++
      if (e.event_type === 'job_logged') {
        agg[e.campaign_id].jobs++
        if (e.job_confirmed && e.job_value) agg[e.campaign_id].revenue += Number(e.job_value)
      }
    }
    eventAggs = (data || []).map((c: any) => ({
      ...c,
      stats: agg[c.id] || { calls: 0, scans: 0, jobs: 0, revenue: 0 },
    }))
  } else {
    eventAggs = (data || []).map((c: any) => ({
      ...c,
      stats: { calls: 0, scans: 0, jobs: 0, revenue: 0 },
    }))
  }

  return Response.json({ campaigns: eventAggs })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id || ORG_ID

  // Generate unique QR slug
  const slug = Math.random().toString(36).slice(2, 8)

  const { data, error } = await admin.from('wrap_campaigns').insert({
    org_id: orgId,
    customer_id: body.customer_id || null,
    project_id: body.project_id || null,
    vehicle_label: body.vehicle_label,
    industry: body.industry,
    avg_ltv: body.avg_ltv || 1050,
    install_date: body.install_date || null,
    investment_amount: body.investment_amount || null,
    tracking_phone: body.tracking_phone || null,
    forward_to: body.forward_to || null,
    qr_code_url: body.qr_code_url || `https://app.usawrapco.com`,
    qr_slug: slug,
    notes: body.notes || null,
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ campaign: data })
}
