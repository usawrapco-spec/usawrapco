import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { portal_token, items, shipping_address, notes } = body

    if (!portal_token || !items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Validate portal token
    const { data: customer } = await admin
      .from('customers')
      .select('id, org_id, name')
      .eq('portal_token', portal_token)
      .single()

    if (!customer) {
      return Response.json({ error: 'Invalid portal token' }, { status: 401 })
    }

    // Validate products and compute total
    const productIds = items.map((i: any) => i.product_id).filter(Boolean)
    const { data: products } = await admin
      .from('catalog_products')
      .select('id, name, price_cents, active')
      .in('id', productIds)

    if (!products || products.length !== productIds.length) {
      return Response.json({ error: 'Some products not found' }, { status: 400 })
    }

    const inactiveProduct = products.find(p => !p.active)
    if (inactiveProduct) {
      return Response.json({ error: `Product "${inactiveProduct.name}" is no longer available` }, { status: 400 })
    }

    // Build order items with verified prices
    const orderItems = items.map((item: any) => {
      const product = products.find(p => p.id === item.product_id)
      return {
        product_id: item.product_id,
        name: product?.name || item.name,
        quantity: Math.max(1, item.quantity || 1),
        price_cents: product?.price_cents || 0,
        options: item.options || {},
      }
    })

    const totalCents = orderItems.reduce(
      (sum: number, item: any) => sum + (item.price_cents * item.quantity),
      0
    )

    // Create order
    const { data: order, error: orderError } = await admin
      .from('portal_orders')
      .insert({
        customer_id: customer.id,
        org_id: customer.org_id,
        status: 'pending',
        total_cents: totalCents,
        items: orderItems,
        shipping_address: shipping_address || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (orderError) {
      console.error('[portal/orders] db error:', orderError)
      return Response.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Log activity
    await admin
      .from('activity_log')
      .insert({
        org_id: customer.org_id,
        action: `Customer ${customer.name || 'Unknown'} placed a catalog order ($${(totalCents / 100).toFixed(2)})`,
        details: `${orderItems.length} item${orderItems.length !== 1 ? 's' : ''}`,
        actor_type: 'customer',
      })
      .then(({ error }) => {
        if (error) console.error('[portal/orders] activity_log error (non-fatal):', error)
      })

    return Response.json({ order })
  } catch (err) {
    console.error('[portal/orders] error:', err)
    return Response.json({ error: 'Order failed' }, { status: 500 })
  }
}
