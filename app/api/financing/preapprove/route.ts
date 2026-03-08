import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  try {
    const { amount, name, email } = await req.json()
    const cents = Math.round(Number(amount) * 100)

    if (!cents || cents < 5000 || cents > 3000000) {
      return NextResponse.json({ error: 'Amount must be between $50 and $30,000' }, { status: 400 })
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' as any })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['affirm'],
      customer_email: email || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Vehicle Wrap Project — Pre-Approval',
            description: `Financing pre-approval for ${name || 'customer'} · USA WRAP CO`,
          },
          unit_amount: cents,
        },
        quantity: 1,
      }],
      metadata: {
        type: 'preapproval',
        customer_name: name || '',
        customer_email: email || '',
      },
      success_url: `${appUrl}/preapprove?success=1`,
      cancel_url: `${appUrl}/preapprove?cancelled=1`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Preapprove checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
