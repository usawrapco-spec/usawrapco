import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, phone, company, vehicle, coverage, style, estimate, vehicle_year, vehicle_make, vehicle_model, notes } = body

    if (!name || !email) {
      return Response.json({ error: 'name and email required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Create or find customer
    let customerId: string | null = null
    try {
      const { data: existing } = await admin.from('customers').select('id').eq('email', email).eq('org_id', ORG_ID).single()
      if (existing) {
        customerId = existing.id
      } else {
        const { data: newCustomer } = await admin.from('customers').insert({
          org_id: ORG_ID,
          name,
          email,
          phone: phone || null,
          company: company || null,
          source: 'online_shop',
        }).select('id').single()
        customerId = newCustomer?.id || null
      }
    } catch {}

    // Create prospect record
    try {
      await admin.from('prospects').insert({
        org_id: ORG_ID,
        name,
        company: company || name,
        email,
        phone: phone || null,
        status: 'hot',
        source: 'Website',
        estimated_revenue: estimate || 0,
        fleet_size: vehicle || 'unknown',
        notes: [
          `Online Shop Lead`,
          `Vehicle: ${vehicle_year || ''} ${vehicle_make || ''} ${vehicle_model || ''} ${vehicle || ''}`.trim(),
          `Coverage: ${coverage || 'Full'}`,
          `Style: ${style || 'Company Branding'}`,
          `Est: $${estimate || 'TBD'}`,
          notes || '',
        ].filter(Boolean).join('\n'),
        activities: [{
          id: 'shop-1',
          type: 'note',
          description: `Submitted online quote request. Estimated $${estimate || 'TBD'}`,
          date: new Date().toISOString().split('T')[0],
        }],
        last_contact: new Date().toISOString().split('T')[0],
      })
    } catch {}

    // Create notification for sales team
    try {
      await admin.from('notifications').insert({
        org_id: ORG_ID,
        type: 'shop_lead',
        title: 'New Online Quote Request',
        message: `${name}${company ? ` (${company})` : ''} requested a quote for ${vehicle || 'vehicle'} wrap — est. $${estimate || 'TBD'}`,
        read: false,
      })
    } catch {}

    return Response.json({ success: true, customerId })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
