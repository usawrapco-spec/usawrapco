import { getSupabaseAdmin } from '@/lib/supabase/service'
import { awardXP } from '@/lib/gamification'
import Stripe from 'stripe'

// ── Canonical Stripe webhook handler ─────────────────────────────────────────
// Configure this URL in Stripe Dashboard → Developers → Webhooks:
//   https://app.usawrapco.com/api/payments/webhook
// Events to listen for: checkout.session.completed, payment_intent.payment_failed
//
// /api/webhooks/stripe is an alias that forwards here.

export async function POST(req: Request) {
  const stripeKey =
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_API_KEY ||
    process.env.STRIPE_KEY ||
    process.env.STRIPE_SECRET
  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET ||
    process.env.STRIPE_WEBHOOK_SIGNING_SECRET

  if (!stripeKey || !webhookSecret) {
    // Return 200 so Stripe doesn't retry — keys just aren't configured yet
    console.log('[payments/webhook] Stripe not configured — skipping')
    return Response.json({ received: true, configured: false })
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' as any })
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') || ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('[payments/webhook] signature verification failed:', err.message)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  console.log('[payments/webhook] event:', event.type)

  try {
    // ── checkout.session.completed ───────────────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const { intake_token, project_id, invoice_id, org_id } = session.metadata || {}

      // Case 1: Design deposit / intake payment
      if (intake_token) {
        await admin
          .from('customer_intake')
          .update({
            payment_status: 'paid',
            payment_amount: (session.amount_total || 0) / 100,
            stripe_session_id: session.id,
          })
          .eq('token', intake_token)

        // Award XP to the sales agent
        if (project_id) {
          const { data: project } = await admin
            .from('projects')
            .select('agent_id')
            .eq('id', project_id)
            .single()

          if (project?.agent_id) {
            await awardXP(admin, project.agent_id, 'invoice_paid', 'project', project_id)
          }
        }

        console.log('[payments/webhook] intake deposit recorded:', session.id)
      }

      // Case 2: Invoice online payment (/pay/[invoiceId] flow)
      if (invoice_id) {
        const paidAmount = (session.amount_total || 0) / 100

        const { data: invoice } = await admin
          .from('invoices')
          .select('org_id, customer_id, total, amount_paid')
          .eq('id', invoice_id)
          .single()

        if (invoice) {
          const newPaid = (invoice.amount_paid || 0) + paidAmount
          const newBalance = Math.max(0, invoice.total - newPaid)
          const piId = typeof session.payment_intent === 'string' ? session.payment_intent : null

          // Record the payment (uses actual DB columns — no stripe-specific cols yet)
          await admin.from('payments').insert({
            org_id: org_id || invoice.org_id,
            invoice_id,
            customer_id: invoice.customer_id,
            amount: paidAmount,
            method: 'stripe',
            reference_number: piId || session.id,
            notes: `Stripe online payment${piId ? ` · ${piId}` : ''} · Session: ${session.id}`,
            payment_date: new Date().toISOString().split('T')[0],
          })

          // Update invoice — only use columns that actually exist in DB
          const updates: Record<string, unknown> = {
            amount_paid: newPaid,
            balance: newBalance,
            updated_at: new Date().toISOString(),
          }
          if (newBalance <= 0) {
            updates.status = 'paid'
            updates.paid_at = new Date().toISOString()
          } else {
            updates.status = 'partial'
          }
          await admin.from('invoices').update(updates).eq('id', invoice_id)

          console.log('[payments/webhook] invoice payment recorded:', invoice_id, `$${paidAmount}`)
        }
      }
    }

    // ── payment_intent.payment_failed ────────────────────────────────────────
    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent
      console.warn('[payments/webhook] payment failed:', pi.id, pi.last_payment_error?.message)
    }

  } catch (err) {
    console.error('[payments/webhook] processing error:', err)
    // Return 200 so Stripe doesn't retry for our processing errors
  }

  return Response.json({ received: true })
}
