import { getSupabaseAdmin } from '@/lib/supabase/service'
import Stripe from 'stripe'

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return Response.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' })
    const { intakeToken, email, projectId } = await req.json()

    if (!intakeToken) {
      return Response.json({ error: 'intakeToken required' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Design Deposit — USA WRAP CO',
              description: 'Secures your design consultation and unlocks the design canvas.',
            },
            unit_amount: 25000, // $250.00
          },
          quantity: 1,
        },
      ],
      metadata: {
        intake_token: intakeToken,
        project_id: projectId || '',
      },
      success_url: `${appUrl}/intake/${intakeToken}?payment=success`,
      cancel_url:  `${appUrl}/intake/${intakeToken}?payment=cancelled`,
    })

    return Response.json({ sessionId: session.id, url: session.url })
  } catch (err: any) {
    console.error('[payments/create-checkout] error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
