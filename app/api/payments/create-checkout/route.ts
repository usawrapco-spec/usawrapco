import { getSupabaseAdmin } from '@/lib/supabase/service'
import Stripe from 'stripe'

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return Response.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' })
    const body = await req.json()
    const { intakeToken, email, projectId, invoiceId, token, amount } = body

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'

    // ── Invoice payment flow ──
    if (invoiceId && amount) {
      const admin = getSupabaseAdmin()
      const { data: inv } = await admin.from('invoices')
        .select('id, invoice_number, title, customer_id, customers(email)')
        .eq('id', invoiceId)
        .single()

      const customerEmail = email || (inv?.customers as any)?.email || undefined
      const unitAmount = Math.round(Number(amount) * 100) // dollars → cents

      if (unitAmount <= 0) {
        return Response.json({ error: 'Invalid amount' }, { status: 400 })
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: customerEmail,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: inv?.title || `Invoice ${inv?.invoice_number || ''}`,
              description: 'Payment to USA WRAP CO',
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        }],
        metadata: {
          invoice_id: invoiceId,
          pay_link_token: token || '',
        },
        success_url: `${appUrl}/pay/${token || invoiceId}?success=true`,
        cancel_url: `${appUrl}/pay/${token || invoiceId}?cancelled=true`,
      })

      return Response.json({ sessionId: session.id, url: session.url })
    }

    // ── Design deposit flow (legacy) ──
    if (!intakeToken) {
      return Response.json({ error: 'intakeToken or invoiceId required' }, { status: 400 })
    }

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
