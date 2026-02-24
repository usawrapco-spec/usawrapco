import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://usawrapco.com'

export async function POST(req: NextRequest) {
  try {
    const {
      token,
      amount = 250,
      customer_name,
      customer_email,
      project_id,
      description,
    } = await req.json()

    if (!customer_email) {
      return NextResponse.json({ error: 'customer_email required' }, { status: 400 })
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY

    if (!stripeKey || stripeKey.startsWith('PLACEHOLDER') || stripeKey.startsWith('sk_test_PLACEHOLDER')) {
      // Stripe not configured — return placeholder response
      return NextResponse.json({
        configured: false,
        message: 'Deposit checkout not configured — add STRIPE_SECRET_KEY to env',
        checkoutUrl: null,
        sessionId: null,
      })
    }

    // Dynamic import to avoid crashing when Stripe isn't installed
    let Stripe: typeof import('stripe').default
    try {
      const stripeModule = await import('stripe')
      Stripe = stripeModule.default
    } catch {
      return NextResponse.json({
        configured: false,
        message: 'Stripe package not installed',
        checkoutUrl: null,
      })
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' as any })

    const successUrl = token
      ? `${SITE_URL}/onboard/${token}?deposit=success`
      : `${SITE_URL}/deposit?success=true`

    const cancelUrl = token
      ? `${SITE_URL}/onboard/${token}?deposit=cancelled`
      : `${SITE_URL}/deposit?cancelled=true`

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: description || 'Vehicle Wrap Deposit',
            description: `Deposit for ${customer_name || 'your vehicle wrap project'}`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      customer_email: customer_email,
      metadata: {
        intake_token: token || '',
        project_id: project_id || '',
        type: 'onboarding_deposit',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    // Mark intake as deposit initiated
    if (token) {
      const admin = getSupabaseAdmin()
      await admin.from('customer_intake').update({
        payment_status: 'pending',
        stripe_session_id: session.id,
      }).eq('token', token)
    }

    return NextResponse.json({
      configured: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    })
  } catch (err) {
    console.error('[onboarding/deposit] error:', err)
    return NextResponse.json({ error: 'Failed to create deposit session' }, { status: 500 })
  }
}
