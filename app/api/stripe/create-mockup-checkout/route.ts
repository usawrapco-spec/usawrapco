import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-01-28.clover' as any })

export async function POST(request: NextRequest) {
  try {
    const { mockupId, customerEmail, customerName, businessName, vehicleDesc, amount } = await request.json()

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: amount || 25000,
          product_data: {
            name: 'Vehicle Wrap Design Deposit',
            description: `${vehicleDesc} · ${businessName} · Includes 2 revision rounds`,
          },
        },
        quantity: 1,
      }],
      metadata: { mockupId: mockupId || '', customerName: customerName || '', businessName: businessName || '' },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'}/wrap-wizard/success?session_id={CHECKOUT_SESSION_ID}&mockup_id=${mockupId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'}/wrap-wizard`,
    })

    const supabase = getSupabaseAdmin()
    if (mockupId) {
      await supabase.from('design_mockups')
        .update({ stripe_session_id: session.id, payment_status: 'initiated' })
        .eq('id', mockupId)
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
