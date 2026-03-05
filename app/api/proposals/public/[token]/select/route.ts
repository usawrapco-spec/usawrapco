import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// Public endpoint — no auth required
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const admin = getSupabaseAdmin()
    const body = await req.json()
    const { package_id, upsell_ids, signature_base64 } = body

    if (!package_id) {
      return NextResponse.json({ error: 'package_id required' }, { status: 400 })
    }

    // Fetch proposal
    const { data: proposal } = await admin
      .from('proposals')
      .select('*')
      .eq('public_token', params.token)
      .single()

    if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

    // Check not expired
    if (proposal.expiration_date && new Date(proposal.expiration_date) < new Date()) {
      return NextResponse.json({ error: 'This proposal has expired' }, { status: 410 })
    }

    // Fetch selected package
    const { data: pkg } = await admin
      .from('proposal_packages')
      .select('*')
      .eq('id', package_id)
      .single()

    if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

    // Validate package belongs to this proposal
    if (pkg.proposal_id !== proposal.id) {
      return NextResponse.json({ error: 'Package does not belong to this proposal' }, { status: 400 })
    }

    // Calculate total with upsells (server-side — never trust frontend total)
    let total = Number(pkg.price) || 0
    if (upsell_ids?.length > 0) {
      const { data: selectedUpsells } = await admin
        .from('proposal_upsells')
        .select('id, price')
        .in('id', upsell_ids)
        .eq('proposal_id', proposal.id)
      if (!selectedUpsells || selectedUpsells.length !== upsell_ids.length) {
        return NextResponse.json({ error: 'One or more upsells are invalid' }, { status: 400 })
      }
      total += selectedUpsells.reduce((sum: number, u: any) => sum + (Number(u.price) || 0), 0)
    }

    const depositAmount = proposal.deposit_amount ?? 250

    // Store signature
    if (signature_base64) {
      await admin.from('proposals').update({
        customer_signature: signature_base64,
        updated_at: new Date().toISOString(),
      }).eq('id', proposal.id)
    }

    // Create Stripe Payment Intent (or demo mode)
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
    let clientSecret: string | null = null as string | null
    let paymentIntentId: string | null = null as string | null

    if (STRIPE_SECRET_KEY && !STRIPE_SECRET_KEY.startsWith('PLACEHOLDER')) {
      const Stripe = require('stripe')
      const stripe = new Stripe(STRIPE_SECRET_KEY)

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(depositAmount * 100),
        currency: 'usd',
        metadata: {
          proposal_id: proposal.id,
          package_id,
          package_name: pkg.name,
          total_amount: total.toString(),
          deposit_amount: depositAmount.toString(),
        },
      })

      clientSecret = paymentIntent.client_secret
      paymentIntentId = paymentIntent.id
    } else {
      // Demo mode — generate fake intent
      paymentIntentId = `demo_pi_${Date.now()}`
      clientSecret = `demo_secret_${Date.now()}`
    }

    return NextResponse.json({
      client_secret: clientSecret,
      payment_intent_id: paymentIntentId,
      deposit_amount: depositAmount,
      total_amount: total,
      demo: !STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.startsWith('PLACEHOLDER'),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
