import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// Public endpoint — no auth required
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const admin = getSupabaseAdmin()
    const body = await req.json()
    const { package_id, upsell_ids, stripe_payment_intent_id, scheduled_date, customer_notes } = body

    // Fetch proposal + estimate
    const { data: proposal } = await admin
      .from('proposals')
      .select('*, estimate:estimates(id, org_id, customer_id, sales_rep_id, title, line_items, subtotal, discount_percent, tax_percent, tax_amount, total, notes)')
      .eq('public_token', params.token)
      .single()

    if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

    const estimate = proposal.estimate

    // Server-side total calculation (never trust frontend)
    const { data: pkg } = await admin
      .from('proposal_packages')
      .select('price')
      .eq('id', package_id)
      .eq('proposal_id', proposal.id)
      .single()

    if (!pkg) return NextResponse.json({ error: 'Invalid package' }, { status: 400 })

    let serverTotal = Number(pkg.price) || 0
    if (upsell_ids?.length > 0) {
      const { data: validUpsells } = await admin
        .from('proposal_upsells')
        .select('price')
        .in('id', upsell_ids)
        .eq('proposal_id', proposal.id)
      if (validUpsells) {
        serverTotal += validUpsells.reduce((sum: number, u: any) => sum + (Number(u.price) || 0), 0)
      }
    }

    const serverDeposit = proposal.deposit_amount ?? 250

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
      total_amount: serverTotal,
      deposit_amount: serverDeposit,
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
          sales_rep_id: estimate.sales_rep_id,
          line_items: estimate.line_items || [],
          subtotal: serverTotal,
          tax_percent: estimate.tax_percent || 0,
          tax_amount: estimate.tax_amount || 0,
          total: serverTotal,
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
        message: `Customer accepted your proposal! Package: ${pkgName}, Total: $${serverTotal.toLocaleString()}, Deposit paid.`,
        type: 'proposal_accepted',
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
        total_amount: serverTotal,
        deposit_amount: serverDeposit,
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
