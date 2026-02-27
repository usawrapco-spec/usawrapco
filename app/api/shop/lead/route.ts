import { ORG_ID } from '@/lib/org'
import { getSupabaseAdmin } from '@/lib/supabase/service'

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
          business_name: company || null,
          lead_source: 'online_shop',
        }).select('id').maybeSingle()
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
        discovered_via: 'online_shop',
        notes: [
          `Online Shop Lead`,
          `Vehicle: ${vehicle_year || ''} ${vehicle_make || ''} ${vehicle_model || ''} ${vehicle || ''}`.trim(),
          `Coverage: ${coverage || 'Full'}`,
          `Style: ${style || 'Company Branding'}`,
          `Est: $${estimate || 'TBD'}`,
          notes || '',
        ].filter(Boolean).join('\n'),
        last_contacted_at: new Date().toISOString(),
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
