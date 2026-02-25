import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// Public — called from /pay/[invoiceId] (no auth required)
export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to your environment.' }, { status: 503 })
  }

  try {
    const { invoice_id } = await req.json()
    if (!invoice_id) return NextResponse.json({ error: 'invoice_id required' }, { status: 400 })

    const admin = getSupabaseAdmin()
    const { data: invoice } = await admin
      .from('invoices')
      .select('*, customer:customer_id(id, name, email)')
      .eq('id', invoice_id)
      .single()

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    const balanceDue = Math.max(0, invoice.balance_due ?? invoice.balance ?? (invoice.total - invoice.amount_paid))
    if (balanceDue <= 0) return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })

    const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' as any })
    const customer = invoice.customer as any
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customer?.email || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: invoice.title || `Invoice INV-${invoice.invoice_number}`,
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
