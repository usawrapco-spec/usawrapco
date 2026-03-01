import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-01-28.clover' as any })

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature') || ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_MOCKUP_WEBHOOK_SECRET || '')
  } catch {
    return NextResponse.json({ error: 'Webhook signature failed' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const mockupId = session.metadata?.mockupId

    if (mockupId) {
      const supabase = getSupabaseAdmin()

      await supabase.from('design_mockups').update({
        payment_status: 'paid',
        amount_paid: session.amount_total,
        unlocked_at: new Date().toISOString(),
      }).eq('id', mockupId)

      const { data: mockup } = await supabase
        .from('design_mockups')
        .select('*')
        .eq('id', mockupId)
        .single()

      if (mockup) {
        let customerId: string | null = null
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', mockup.email)
          .maybeSingle()

        if (existingCustomer) {
          customerId = existingCustomer.id
        } else if (mockup.email) {
          const { data: newCustomer } = await supabase.from('customers').insert({
            org_id: mockup.org_id,
            name: session.metadata?.customerName || mockup.email,
            email: mockup.email,
            company_name: mockup.business_name,
          }).select('id').single()
          customerId = newCustomer?.id || null
        }

        await supabase.from('projects').insert({
          org_id: mockup.org_id,
          title: `${mockup.business_name} — ${mockup.vehicle_year || ''} ${mockup.vehicle_make || ''} ${mockup.vehicle_model || ''} Wrap`.trim(),
          type: 'wrap',
          status: 'intake',
          pipe_stage: 'sales_in',
          customer_id: customerId,
          vehicle_desc: `${mockup.vehicle_year || ''} ${mockup.vehicle_make || ''} ${mockup.vehicle_model || ''}`.trim(),
          revenue: mockup.estimated_price,
          form_data: {
            mockup_id: mockupId,
            mockup_images: mockup.render_images,
            brand_colors: mockup.brand_colors,
            style_preference: mockup.style_preference,
            industry: mockup.industry,
            deposit_paid: true,
            deposit_amount: 250,
          },
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}
