import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id || ORG_ID

  const { data: campaign, error } = await admin
    .from('wrap_campaigns')
    .select('*')
    .eq('id', params.id)
    .eq('org_id', orgId)
    .single()

  if (error || !campaign) return Response.json({ error: 'Not found' }, { status: 404 })

  // Fetch all events
  const { data: events } = await admin
    .from('wrap_tracking_events')
    .select('*')
    .eq('campaign_id', params.id)
    .order('event_at', { ascending: false })

  // Fetch route logs
  const { data: routes } = await admin
    .from('wrap_route_logs')
    .select('*')
    .eq('campaign_id', params.id)
    .order('route_date', { ascending: false })

  // Fetch snapshots
  const { data: snapshots } = await admin
    .from('wrap_roi_snapshots')
    .select('*')
    .eq('campaign_id', params.id)
    .order('snapshot_date', { ascending: true })

  // Compute stats
  const calls = (events || []).filter((e: any) => e.event_type === 'call').length
  const scans = (events || []).filter((e: any) => e.event_type === 'qr_scan').length
  const jobs = (events || []).filter((e: any) => e.event_type === 'job_logged')
  const totalRevenue = jobs.reduce((sum: number, j: any) => sum + (j.job_confirmed ? Number(j.job_value || 0) : 0), 0)
  const roi = totalRevenue - Number(campaign.investment_amount || 0)

  return Response.json({
    campaign,
    events: events || [],
    routes: routes || [],
    snapshots: snapshots || [],
    stats: { calls, scans, jobs: jobs.length, totalRevenue, roi },
  })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id || ORG_ID

  const { data, error } = await admin
    .from('wrap_campaigns')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ campaign: data })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id || ORG_ID

  const { error } = await admin
    .from('wrap_campaigns')
    .delete()
    .eq('id', params.id)
    .eq('org_id', orgId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
