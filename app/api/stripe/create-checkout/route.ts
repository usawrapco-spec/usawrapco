import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// Public — called from /portal/design paywall (no auth required)
export async function POST(req: NextRequest) {
  const stripeKey =
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_API_KEY ||
    process.env.STRIPE_KEY ||
    process.env.STRIPE_SECRET

  if (!stripeKey) {
    return NextResponse.json(
      { error: 'Stripe not configured. Add STRIPE_SECRET_KEY to environment variables.' },
      { status: 503 },
    )
  }

  try {
    const { mockup_id, customer_email } = await req.json()
    if (!mockup_id) return NextResponse.json({ error: 'mockup_id required' }, { status: 400 })

    const admin = getSupabaseAdmin()
    const { data: mockup } = await admin
      .from('design_mockups')
      .select('id, business_name, vehicle_type, customer_id, payment_status')
      .eq('id', mockup_id)
      .maybeSingle()

    if (!mockup) return NextResponse.json({ error: 'Mockup not found' }, { status: 404 })
    if (mockup.payment_status === 'paid') {
      return NextResponse.json({ error: 'Already paid' }, { status: 400 })
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' as any })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customer_email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'AI Vehicle Wrap Design — Design Deposit',
              description: `Professional wrap mockups for ${mockup.business_name || 'your vehicle'} · Includes 2 revision rounds + print-ready files`,
            },
            unit_amount: 15000, // $150.00
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'design_mockup',
        design_mockup_id: mockup_id,
        customer_email: customer_email || '',
      },
      success_url: `${appUrl}/portal/design/unlocked?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/portal/design?mockup=${mockup_id}`,
    })

    // Store session ID on the mockup
    await admin
      .from('design_mockups')
      .update({ stripe_session_id: session.id })
      .eq('id', mockup_id)

    return NextResponse.json({ url: session.url, session_id: session.id })
  } catch (err: any) {
    console.error('[stripe/create-checkout]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
