import { ORG_ID } from '@/lib/org'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://usawrapco.com'
export async function POST(req: Request) {
  const { name, email, phone, vehicle_desc, amount, conversation_id } = await req.json()

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email required' }, { status: 400 })
  }

  const depositAmount = amount || 250

  // If Stripe not configured, simulate success
  if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.startsWith('PLACEHOLDER')) {
    console.log('[DEPOSIT] Stripe not configured, simulating deposit:', { name, email, amount: depositAmount })

    const admin = getSupabaseAdmin()

    // Find or create customer
    let customerId: string | null = null
    const { data: existingCust } = await admin.from('customers')
      .select('id').eq('org_id', ORG_ID).eq('email', email).limit(1).maybeSingle()

    if (existingCust) {
      customerId = existingCust.id
    } else {
      const { data: newCust } = await admin.from('customers').insert({
        org_id: ORG_ID, name, email, phone: phone || null,
        status: 'active', source: 'deposit',
      }).select('id').single()
      customerId = newCust?.id || null
    }

    // Create job from deposit
    if (customerId) {
      await admin.from('projects').insert({
        org_id: ORG_ID,
        title: `Wrap — ${vehicle_desc || name}`,
        type: 'wrap',
        status: 'active',
        pipe_stage: 'sales_in',
        customer_id: customerId,
        vehicle_desc: vehicle_desc || null,
        division: 'wraps',
        priority: 'normal',
        form_data: { deposit_amount: depositAmount, deposit_paid: true, deposit_date: new Date().toISOString() },
        fin_data: null,
        actuals: {},
        checkout: {},
        send_backs: [],
      })
    }

    // Update conversation if linked
    if (conversation_id) {
      await admin.from('conversations').update({
        lead_stage: 'converted',
        status: 'converted',
        updated_at: new Date().toISOString(),
      }).eq('id', conversation_id)
    }

    // Log payment
    await admin.from('payments').insert({
      org_id: ORG_ID,
      customer_id: customerId,
      amount: depositAmount,
      method: 'stripe_demo',
      reference_number: `demo_${Date.now()}`,
      notes: `Deposit - ${vehicle_desc || 'vehicle wrap'}${conversation_id ? ` (conv: ${conversation_id})` : ''}`,
      payment_date: new Date().toISOString().slice(0, 10),
    })

    return NextResponse.json({ success: true, demo: true })
  }

  // Real Stripe checkout
  try {
    const stripe = require('stripe')(STRIPE_SECRET_KEY)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Design Deposit — USA Wrap Co',
            description: vehicle_desc ? `Vehicle: ${vehicle_desc}` : 'Vehicle wrap design deposit',
          },
          unit_amount: depositAmount * 100, // cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${SITE_URL}/deposit?success=1&conversation_id=${conversation_id || ''}`,
      cancel_url: `${SITE_URL}/deposit?cancelled=1&conversation_id=${conversation_id || ''}`,
      metadata: {
        customer_name: name,
        customer_email: email,
        customer_phone: phone || '',
        vehicle_desc: vehicle_desc || '',
        conversation_id: conversation_id || '',
        org_id: ORG_ID,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[DEPOSIT] Stripe error:', err)
    return NextResponse.json({ error: err.message || 'Payment failed' }, { status: 500 })
  }
}
