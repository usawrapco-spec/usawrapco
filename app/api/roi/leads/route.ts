import { getSupabaseAdmin } from '@/lib/supabase/service'

const DEFAULT_ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.name) {
      return Response.json({ error: 'name is required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    const { data, error } = await admin.from('wrap_leads').insert({
      org_id: DEFAULT_ORG_ID,
      name: body.name,
      business_name: body.business_name || null,
      phone: body.phone || null,
      email: body.email || null,
      fleet_size: body.fleet_size || null,
      notes: body.notes || null,
      industry: body.industry || null,
      num_vehicles: body.num_vehicles || null,
      wrap_type: body.wrap_type || null,
      estimated_roi: body.estimated_roi || null,
      estimated_annual_impressions: body.estimated_annual_impressions || null,
      source: body.source || 'roi-calculator',
    }).select().single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Fire-and-forget: create a task for the sales team
    admin.from('tasks').insert({
      org_id: DEFAULT_ORG_ID,
      title: `New ROI Calculator Lead: ${body.name}${body.business_name ? ` — ${body.business_name}` : ''}`,
      description: `Phone: ${body.phone || 'n/a'} | Email: ${body.email || 'n/a'} | Industry: ${body.industry || 'n/a'} | Est. Annual ROI: $${body.estimated_roi?.toLocaleString() || 'n/a'}`,
      priority: 'high',
      status: 'pending',
      due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    }).then(() => {}, () => {})

    return Response.json({ lead: data })
  } catch (err) {
    console.error('ROI leads error:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
