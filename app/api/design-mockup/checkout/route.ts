import Stripe from 'stripe'

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return Response.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' as any })
    const { mockupId, email } = await req.json()

    if (!mockupId) {
      return Response.json({ error: 'mockupId required' }, { status: 400 })
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
              name: 'AI Wrap Design Package — USA WRAP CO',
              description:
                'Full resolution mockups, editable design canvas, professional designer refinement, 2 revision rounds, and print-ready files.',
            },
            unit_amount: 15000, // $150.00
          },
          quantity: 1,
        },
      ],
      metadata: {
        design_mockup_id: mockupId,
        type: 'design_mockup',
      },
      success_url: `${appUrl}/portal/design?mockupId=${mockupId}&payment=success`,
      cancel_url: `${appUrl}/portal/design?mockupId=${mockupId}&payment=cancelled`,
    })

    return Response.json({ sessionId: session.id, url: session.url })
  } catch (err: any) {
    console.error('[design-mockup/checkout] error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
