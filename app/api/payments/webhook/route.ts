import { getSupabaseAdmin } from '@/lib/supabase/service'
import { awardXP } from '@/lib/gamification'
import Stripe from 'stripe'

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeKey || !webhookSecret) {
    return Response.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' })
    const body = await req.text()
    const signature = req.headers.get('stripe-signature') || ''

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('[payments/webhook] signature verification failed:', err.message)
      return Response.json({ error: 'Invalid signature' }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const intakeToken = session.metadata?.intake_token
      const projectId   = session.metadata?.project_id
      const invoiceId   = session.metadata?.invoice_id

      if (intakeToken) {
        const admin = getSupabaseAdmin()

        // Update customer_intake payment status
        await admin
          .from('customer_intake')
          .update({
            payment_status: 'paid',
            payment_amount: (session.amount_total || 0) / 100,
            stripe_session_id: session.id,
          })
          .eq('token', intakeToken)

        // Award XP to the agent who generated the intake link
        if (projectId) {
          const { data: project } = await admin
            .from('projects')
            .select('agent_id')
            .eq('id', projectId)
            .single()

          if (project?.agent_id) {
            // XP for intake payment received
            await awardXP(admin, project.agent_id, 'invoice_paid', 'project', projectId)
          }
        }
      }

      // ── Invoice online payment ──────────────────────────────────────────────
      if (invoiceId) {
        const admin = getSupabaseAdmin()
        const paidAmount = (session.amount_total || 0) / 100

        const { data: invoice } = await admin
          .from('invoices')
          .select('org_id, customer_id, total, amount_paid')
          .eq('id', invoiceId)
          .single()

        if (invoice) {
          const newPaid = (invoice.amount_paid || 0) + paidAmount
          const newBalance = Math.max(0, invoice.total - newPaid)

          // Record the Stripe payment
          await admin.from('payments').insert({
            org_id: session.metadata?.org_id || invoice.org_id,
            invoice_id: invoiceId,
            customer_id: invoice.customer_id,
            amount: paidAmount,
            method: 'stripe',
            reference_number: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
            stripe_session_id: session.id,
            stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
            notes: `Stripe online payment`,
            payment_date: new Date().toISOString().split('T')[0],
          })

          // Update invoice
          const updates: Record<string, unknown> = {
            amount_paid: newPaid,
            balance_due: newBalance,
            balance: newBalance,
            updated_at: new Date().toISOString(),
          }
          if (newBalance <= 0) {
            updates.status = 'paid'
            updates.paid_at = new Date().toISOString()
          } else {
            updates.status = 'partial'
          }
          await admin.from('invoices').update(updates).eq('id', invoiceId)
        }
      }
    }

    return Response.json({ received: true })
  } catch (err: any) {
    console.error('[payments/webhook] error:', err)
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
