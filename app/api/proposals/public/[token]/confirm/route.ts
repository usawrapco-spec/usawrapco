import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// Public endpoint — no auth required
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const admin = getSupabaseAdmin()
    const body = await req.json()
    const { package_id, upsell_ids, stripe_payment_intent_id, scheduled_date, customer_notes, total_amount, deposit_amount } = body

    // Fetch proposal + estimate
    const { data: proposal } = await admin
      .from('proposals')
      .select('*, estimate:estimates(id, org_id, customer_id, sales_rep_id, title, line_items, subtotal, discount, discount_percent, tax_rate, tax_percent, tax_amount, total, notes, contact_id, production_manager_id)')
      .eq('public_token', params.token)
      .single()

    if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

    const estimate = proposal.estimate

    // 1. Update proposal status
    await admin.from('proposals').update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_package_id: package_id,
      updated_at: new Date().toISOString(),
    }).eq('id', proposal.id)

    // 2. Insert proposal selection
    await admin.from('proposal_selections').insert({
      proposal_id: proposal.id,
      package_id,
      upsell_ids: upsell_ids || [],
      total_amount: total_amount || 0,
      deposit_amount: deposit_amount || proposal.deposit_amount || 250,
      stripe_payment_intent_id: stripe_payment_intent_id || null,
      deposit_paid_at: new Date().toISOString(),
      scheduled_date: scheduled_date || null,
      customer_notes: customer_notes || null,
    })

    // 3. Auto-create Sales Order from estimate
    let salesOrder: any = null
    if (estimate) {
      const { data: so } = await admin
        .from('sales_orders')
        .insert({
          org_id: estimate.org_id || ORG_ID,
          estimate_id: estimate.id,
          customer_id: estimate.customer_id,
          contact_id: estimate.contact_id || null,
          sales_rep_id: estimate.sales_rep_id,
          production_manager_id: estimate.production_manager_id || null,
          line_items: estimate.line_items || [],
          subtotal: total_amount || estimate.subtotal || 0,
          discount: estimate.discount || 0,
          discount_percent: estimate.discount_percent || 0,
          tax_rate: estimate.tax_rate || 0,
          tax_percent: estimate.tax_percent || 0,
          tax_amount: estimate.tax_amount || 0,
          total: total_amount || estimate.total || 0,
          status: 'new',
          notes: estimate.notes || null,
          so_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single() as { data: any }

      salesOrder = so

      // Update estimate as ordered
      if (so) {
        await admin.from('estimates').update({
          ordered: true,
          converted_to_so_id: so.id,
          status: 'accepted',
          updated_at: new Date().toISOString(),
        }).eq('id', estimate.id)
      }
    }

    // 4. Create notification for sales rep
    if (estimate?.sales_rep_id) {
      const pkgName = body.package_name || 'selected package'
      await admin.from('notifications').insert({
        org_id: estimate.org_id || ORG_ID,
        user_id: estimate.sales_rep_id,
        title: 'Proposal Accepted!',
        body: `Customer accepted your proposal! Package: ${pkgName}, Total: $${Number(total_amount || 0).toLocaleString()}, Deposit paid.`,
        type: 'proposal_accepted',
        entity_type: 'proposal',
        entity_id: proposal.id,
        read: false,
      }).then(() => {})
    }

    // 5. Log activity
    await admin.from('activity_log').insert({
      org_id: estimate?.org_id || ORG_ID,
      action: 'proposal_accepted',
      entity_type: 'proposal',
      entity_id: proposal.id,
      details: {
        package_id,
        upsell_ids,
        total_amount,
        deposit_amount,
        stripe_payment_intent_id,
        sales_order_id: salesOrder?.id,
      },
    }).then(() => {})

    return NextResponse.json({
      success: true,
      sales_order_id: salesOrder?.id,
      sales_order_number: salesOrder?.so_number,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
