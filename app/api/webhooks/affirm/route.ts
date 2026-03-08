import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

/**
 * Affirm webhook handler
 * Receives events: charge.captured, charge.voided, charge.refunded, charge.completed
 * Configure this URL in your Affirm merchant dashboard.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const admin = getSupabaseAdmin()

    // Affirm webhook payload: { type, data: { id, order_id, amount, ... } }
    const eventType = payload.type
    const chargeData = payload.data || {}
    const chargeId = chargeData.id
    const orderId = chargeData.order_id
    const amount = chargeData.amount ? chargeData.amount / 100 : null // Affirm sends cents

    if (!chargeId) {
      return NextResponse.json({ error: 'Missing charge ID' }, { status: 400 })
    }

    // Map Affirm events to our status
    const statusMap: Record<string, string> = {
      'charge.captured':  'funded',
      'charge.completed': 'funded',
      'charge.voided':    'cancelled',
      'charge.refunded':  'cancelled',
    }

    const ourStatus = statusMap[eventType]
    if (!ourStatus) {
      // Unknown event type — acknowledge but don't process
      return NextResponse.json({ received: true, ignored: true })
    }

    // Find financing application by Affirm charge ID
    const { data: finApps } = await admin
      .from('financing_applications')
      .select('id, invoice_id, org_id')
      .eq('affirm_charge_id', chargeId)
      .limit(1)

    const finApp = finApps?.[0]

    if (finApp) {
      const updates: Record<string, any> = {
        status: ourStatus,
        webhook_payload: payload,
        updated_at: new Date().toISOString(),
      }

      if (ourStatus === 'funded') {
        updates.funded_at = new Date().toISOString()
        if (amount) updates.amount_approved = amount

        // Mark invoice as paid
        if (finApp.invoice_id) {
          await admin
            .from('invoices')
            .update({
              status: 'paid',
              preferred_payment_method: 'financing',
              paid_at: new Date().toISOString(),
            })
            .eq('id', finApp.invoice_id)
        }
      }

      if (ourStatus === 'cancelled' && finApp.invoice_id) {
        // Revert invoice if financing was voided/refunded
        await admin
          .from('invoices')
          .update({ preferred_payment_method: null })
          .eq('id', finApp.invoice_id)
      }

      await admin
        .from('financing_applications')
        .update(updates)
        .eq('id', finApp.id)

      // Create notification
      try {
        const { data: inv } = await admin
          .from('invoices')
          .select('invoice_number, org_id')
          .eq('id', finApp.invoice_id)
          .single()

        if (inv) {
          const title = ourStatus === 'funded'
            ? `Financing funded — INV-${inv.invoice_number}`
            : `Financing ${ourStatus} — INV-${inv.invoice_number}`

          const message = ourStatus === 'funded'
            ? `Affirm loan funded${amount ? ` — $${amount.toFixed(2)}` : ''}`
            : `Affirm financing ${ourStatus} for INV-${inv.invoice_number}`

          await admin.from('notifications').insert({
            org_id: inv.org_id,
            title,
            message,
            type: 'invoice',
            read: false,
          })
        }
      } catch {
        // Non-critical — notification failure shouldn't block webhook
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Affirm webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
