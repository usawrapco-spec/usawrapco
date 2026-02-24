import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  const body = await req.text()
  const signature = req.headers.get('stripe-signature') || ''

  console.log('[webhooks/stripe] received event')

  if (!stripeKey || !webhookSecret) {
    // Log but acknowledge to prevent Stripe retries
    console.log('[webhooks/stripe] Stripe not fully configured — logging raw payload')
    try {
      const payload = JSON.parse(body)
      console.log('[webhooks/stripe] event type:', payload?.type)
    } catch {}
    return NextResponse.json({ received: true, configured: false })
  }

  let Stripe: typeof import('stripe').default
  try {
    const stripeModule = await import('stripe')
    Stripe = stripeModule.default
  } catch {
    return NextResponse.json({ error: 'Stripe package not installed' }, { status: 500 })
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' as any })

  let event: import('stripe').Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('[webhooks/stripe] signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  console.log('[webhooks/stripe] event:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as import('stripe').Stripe.Checkout.Session
        const intakeToken = session.metadata?.intake_token
        const projectId = session.metadata?.project_id

        if (intakeToken) {
          await admin.from('customer_intake').update({
            payment_status: 'paid',
            payment_amount: (session.amount_total || 0) / 100,
            stripe_session_id: session.id,
          }).eq('token', intakeToken)
        }

        // Record payment
        if (projectId) {
          await admin.from('payments').insert({
            project_id: projectId,
            amount: (session.amount_total || 0) / 100,
            status: 'paid',
            method: 'stripe',
            stripe_session_id: session.id,
            paid_at: new Date().toISOString(),
            notes: `Stripe checkout session ${session.id}`,
          }).select().single()
        }

        console.log('[webhooks/stripe] checkout.session.completed processed:', session.id)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as import('stripe').Stripe.Invoice
        const projectId = invoice.metadata?.project_id
        const invoiceId = invoice.metadata?.invoice_id

        if (invoiceId) {
          await admin.from('invoices').update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_invoice_id: invoice.id,
          }).eq('id', invoiceId)
        }

        if (projectId) {
          await admin.from('payments').insert({
            project_id: projectId,
            amount: (invoice.amount_paid || 0) / 100,
            status: 'paid',
            method: 'stripe',
            stripe_invoice_id: invoice.id,
            paid_at: new Date().toISOString(),
            notes: `Stripe invoice ${invoice.id}`,
          }).select().single()
        }

        console.log('[webhooks/stripe] invoice.paid processed:', invoice.id)
        break
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as import('stripe').Stripe.PaymentIntent
        console.log('[webhooks/stripe] payment_intent.succeeded:', pi.id, 'amount:', (pi.amount || 0) / 100)
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as import('stripe').Stripe.PaymentIntent
        console.log('[webhooks/stripe] payment_intent.payment_failed:', pi.id)
        break
      }

      default:
        console.log('[webhooks/stripe] unhandled event type:', event.type)
    }
  } catch (err) {
    console.error('[webhooks/stripe] processing error:', err)
    // Still return 200 to prevent retries for processing errors
  }

  return NextResponse.json({ received: true })
}
