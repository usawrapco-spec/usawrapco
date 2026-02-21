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
    }

    return Response.json({ received: true })
  } catch (err: any) {
    console.error('[payments/webhook] error:', err)
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
