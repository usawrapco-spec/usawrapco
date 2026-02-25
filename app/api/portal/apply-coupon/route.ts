import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { portal_token, coupon_id, document_type, document_id } = body

    if (!portal_token || !coupon_id || !document_type || !document_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // 1. Validate portal token
    const { data: so } = await supabase
      .from('sales_orders')
      .select('id, customer_id, org_id, total')
      .eq('portal_token', portal_token)
      .single()

    if (!so) {
      return NextResponse.json({ error: 'Invalid portal token' }, { status: 403 })
    }

    // 2. Load the coupon
    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', coupon_id)
      .single()

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    // 3. Validate coupon
    if (!coupon.active) {
      return NextResponse.json({ error: 'This coupon is no longer active' }, { status: 400 })
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 })
    }

    if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
      return NextResponse.json({ error: 'This coupon has reached its usage limit' }, { status: 400 })
    }

    if (coupon.customer_id && coupon.customer_id !== so.customer_id) {
      return NextResponse.json({ error: 'This coupon is not available for your account' }, { status: 400 })
    }

    // Check min order amount against document total
    let docTotal = 0
    const docTable = document_type === 'estimate' ? 'estimates'
      : document_type === 'sales_order' ? 'sales_orders'
      : 'invoices'
    const { data: doc } = await supabase
      .from(docTable)
      .select('id, total, discount, discount_amount')
      .eq('id', document_id)
      .single()

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    docTotal = Number(doc.total || 0)

    if (coupon.min_order_amount && docTotal < Number(coupon.min_order_amount)) {
      return NextResponse.json({ error: `Minimum order amount is $${Number(coupon.min_order_amount).toFixed(2)}` }, { status: 400 })
    }

    // 4. Check if already redeemed
    const { data: existing } = await supabase
      .from('coupon_redemptions')
      .select('id')
      .eq('coupon_id', coupon_id)
      .eq('customer_id', so.customer_id)
      .eq('document_id', document_id)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'This coupon has already been applied to this document' }, { status: 400 })
    }

    // 5. Calculate discount
    let discountApplied = 0
    if (coupon.discount_type === 'percent') {
      discountApplied = docTotal * (Number(coupon.discount_value) / 100)
    } else {
      discountApplied = Number(coupon.discount_value)
    }

    if (coupon.max_discount_amount && discountApplied > Number(coupon.max_discount_amount)) {
      discountApplied = Number(coupon.max_discount_amount)
    }

    discountApplied = Math.round(discountApplied * 100) / 100

    // 6. Create redemption
    await supabase.from('coupon_redemptions').insert({
      org_id: so.org_id,
      coupon_id,
      customer_id: so.customer_id,
      document_type,
      document_id,
      discount_applied: discountApplied,
    })

    // 7. Increment times_used
    await supabase
      .from('coupons')
      .update({ times_used: (coupon.times_used || 0) + 1 })
      .eq('id', coupon_id)

    // 8. Update document discount
    const currentDiscount = Number(doc.discount_amount || doc.discount || 0)
    await supabase
      .from(docTable)
      .update({
        discount_amount: currentDiscount + discountApplied,
        discount: currentDiscount + discountApplied,
      })
      .eq('id', document_id)

    return NextResponse.json({ success: true, discount_applied: discountApplied })
  } catch (err: any) {
    console.error('apply-coupon error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
