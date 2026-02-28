import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// Public — called from /pay/[invoiceId] (no auth required)
export async function POST(req: NextRequest) {
  // Try common env var naming conventions
  const stripeKey =
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_API_KEY ||
    process.env.STRIPE_KEY ||
    process.env.STRIPE_SECRET
  if (!stripeKey) {
    return NextResponse.json({
      error: 'Stripe not configured. Add STRIPE_SECRET_KEY to your Vercel environment variables.',
    }, { status: 503 })
  }

  try {
    const { invoice_id } = await req.json()
    if (!invoice_id) return NextResponse.json({ error: 'invoice_id required' }, { status: 400 })

    const admin = getSupabaseAdmin()

    // Fetch invoice without FK join (join syntax unreliable without explicit FK)
    const { data: invoice } = await admin
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .maybeSingle()

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    // Separately fetch customer
    let customer: { name?: string; email?: string } | null = null
    if (invoice.customer_id) {
      const { data: cust } = await admin
        .from('customers')
        .select('id, name, email')
        .eq('id', invoice.customer_id)
        .maybeSingle()
      customer = cust
    }
    // Fallback to profiles
    if (!customer && invoice.customer_id) {
      const { data: prof } = await admin
        .from('profiles')
        .select('id, name, email')
        .eq('id', invoice.customer_id)
        .maybeSingle()
      customer = prof
    }

    const balanceDue = Math.max(0, invoice.balance_due ?? (invoice.total - (invoice.amount_paid || 0)))
    if (balanceDue <= 0) return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })

    const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' as any })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customer?.email || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Invoice INV-${invoice.invoice_number}`,
            description: `Invoice INV-${invoice.invoice_number} · USA WRAP CO`,
          },
          unit_amount: Math.round(balanceDue * 100),
        },
        quantity: 1,
      }],
      metadata: {
        invoice_id: invoice.id,
        invoice_number: String(invoice.invoice_number),
        org_id: invoice.org_id || '',
        customer_name: customer?.name || '',
      },
      success_url: `${appUrl}/pay/${invoice_id}?success=true`,
      cancel_url: `${appUrl}/pay/${invoice_id}?cancelled=true`,
    })

    return NextResponse.json({ url: session.url, session_id: session.id })
  } catch (err: any) {
    console.error('[stripe/create-invoice-checkout]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
