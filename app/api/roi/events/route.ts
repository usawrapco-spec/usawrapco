import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id || ORG_ID

  if (!body.campaign_id || !body.event_type) {
    return Response.json({ error: 'campaign_id and event_type required' }, { status: 400 })
  }

  const { data, error } = await admin.from('wrap_tracking_events').insert({
    campaign_id: body.campaign_id,
    org_id: orgId,
    event_type: body.event_type,
    lat: body.lat || null,
    lng: body.lng || null,
    location_city: body.location_city || null,
    location_state: body.location_state || null,
    location_accuracy: body.location_accuracy || 'unknown',
    caller_number: body.caller_number || null,
    call_duration_seconds: body.call_duration_seconds || null,
    job_value: body.job_value || null,
    job_notes: body.job_notes || null,
    job_confirmed: body.job_confirmed ?? false,
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ event: data })
}
