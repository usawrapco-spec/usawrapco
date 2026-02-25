import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ noStripe: true }, { status: 200 })
    }

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' as any })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://usawrapco.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Vehicle Wrap Deposit',
              description: `${body.coverage_type || 'Wrap'} — ${body.vehicle_make || ''} ${body.vehicle_model || ''}`,
            },
            unit_amount: 25000, // $250.00
          },
          quantity: 1,
        },
      ],
      customer_email: body.email || undefined,
      metadata: {
        lead_id: body.lead_id || '',
        vehicle: `${body.vehicle_year || ''} ${body.vehicle_make || ''} ${body.vehicle_model || ''}`,
        coverage: body.coverage_type || '',
      },
      success_url: `${siteUrl}/get-started/confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/get-started/checkout`,
    })

    // Update lead with stripe session id
    if (body.lead_id) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      await supabase
        .from('onboarding_leads')
        .update({ stripe_session_id: session.id, status: 'checkout_started' })
        .eq('id', body.lead_id)
    }

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('checkout error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
