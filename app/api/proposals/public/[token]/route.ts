import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// Public endpoint — no auth required
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const admin = getSupabaseAdmin()

    const { data: proposal, error } = await admin
      .from('proposals')
      .select('*')
      .eq('public_token', params.token)
      .single()

    if (!proposal || error) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    // Check expiration
    if (proposal.expiration_date && new Date(proposal.expiration_date) < new Date()) {
      if (proposal.status !== 'accepted') {
        await admin.from('proposals').update({ status: 'expired' }).eq('id', proposal.id)
        return NextResponse.json({ error: 'This proposal has expired' }, { status: 410 })
      }
    }

    // Track first view
    if (!proposal.viewed_at && proposal.status === 'sent') {
      await admin.from('proposals').update({
        viewed_at: new Date().toISOString(),
        status: 'viewed',
        updated_at: new Date().toISOString(),
      }).eq('id', proposal.id)
    }

    // Fetch packages
    const { data: packages } = await admin
      .from('proposal_packages')
      .select('*')
      .eq('proposal_id', proposal.id)
      .order('sort_order')

    // Fetch upsells
    const { data: upsells } = await admin
      .from('proposal_upsells')
      .select('*')
      .eq('proposal_id', proposal.id)
      .order('sort_order')

    // Fetch estimate + customer + sales rep info
    let customer: any = null
    let salesRep: any = null
    let vehicleInfo: any = null

    if (proposal.estimate_id) {
      const { data: estimate } = await admin
        .from('estimates')
        .select('id, title, customer_id, sales_rep_id, line_items, form_data')
        .eq('id', proposal.estimate_id)
        .single()

      if (estimate) {
        // Get customer
        if (estimate.customer_id) {
          const { data: cust } = await admin
            .from('profiles')
            .select('id, name, email, phone, avatar_url')
            .eq('id', estimate.customer_id)
            .single()
          customer = cust
        }

        // Get sales rep
        if (estimate.sales_rep_id) {
          const { data: rep } = await admin
            .from('profiles')
            .select('id, name, email, phone, avatar_url')
            .eq('id', estimate.sales_rep_id)
            .single()
          salesRep = rep
        }

        // Extract vehicle info from line items
        const lineItems = estimate.line_items || []
        if (lineItems.length > 0) {
          const specs = lineItems[0]?.specs || {}
          vehicleInfo = {
            year: specs.vehicleYear,
            make: specs.vehicleMake,
            model: specs.vehicleModel,
            color: specs.vehicleColor,
          }
        }
      }
    }

    return NextResponse.json({
      proposal: {
        ...proposal,
        status: proposal.viewed_at ? 'viewed' : proposal.status,
      },
      packages: packages || [],
      upsells: upsells || [],
      customer,
      salesRep,
      vehicleInfo,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
