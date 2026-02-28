import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const admin = getSupabaseAdmin()

    // Wisetack sends: { eventType, transactionId, merchantRef, status, amount, termMonths, apr }
    const { merchantRef, status, amount, termMonths, apr } = payload

    const statusMap: Record<string, string> = {
      PREQUALIFIED:  'prequalified',
      APPLYING:      'applying',
      APPROVED:      'approved',
      DECLINED:      'declined',
      LOAN_ACCEPTED: 'loan_accepted',
      FUNDED:        'funded',
      EXPIRED:       'expired',
      CANCELLED:     'cancelled',
    }

    const ourStatus = statusMap[status] || status?.toLowerCase() || 'pending'

    if (merchantRef) {
      // Find financing app by invoice number (merchantRef = invoice_number)
      const { data: finApps } = await admin
        .from('financing_applications')
        .select('id, invoice_id, org_id')
        .eq('merchant_ref', merchantRef)
        .order('created_at', { ascending: false })
        .limit(1)

      const finApp = finApps?.[0]

      if (finApp) {
        const updates: Record<string, any> = {
          status: ourStatus,
          webhook_payload: payload,
          updated_at: new Date().toISOString(),
        }

        if (status === 'APPROVED') {
          updates.amount_approved = amount
          updates.term_months = termMonths
          updates.apr_percent = apr
          updates.monthly_payment = (termMonths && amount) ? amount / termMonths : null
          updates.approved_at = new Date().toISOString()
        }

        if (status === 'FUNDED') {
          updates.funded_at = new Date().toISOString()
          // Mark invoice preferred payment as financing
          if (finApp.invoice_id) {
            await admin
              .from('invoices')
              .update({ preferred_payment_method: 'financing' })
              .eq('id', finApp.invoice_id)
          }
        }

        await admin
          .from('financing_applications')
          .update(updates)
          .eq('id', finApp.id)

        // Create notification for admin
        if (['APPROVED', 'FUNDED', 'DECLINED'].includes(status)) {
          try {
            const { data: inv } = await admin
              .from('invoices')
              .select('invoice_number, org_id')
              .eq('id', finApp.invoice_id)
              .single()

            if (inv) {
              await admin.from('notifications').insert({
                org_id: inv.org_id,
                title: `Financing ${ourStatus.replace('_', ' ')} — INV-${inv.invoice_number}`,
                message: status === 'FUNDED'
                  ? `Customer financing funded — ${amount ? `$${Number(amount).toFixed(2)}` : 'amount pending'}`
                  : status === 'APPROVED'
                  ? `Customer approved for ${amount ? `$${Number(amount).toFixed(2)}` : 'financing'} at ${apr ?? '?'}% APR`
                  : `Customer financing application ${ourStatus}`,
                type: 'invoice',
                read: false,
              })
            }
          } catch {}
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Wisetack webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
