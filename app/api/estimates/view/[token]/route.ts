import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const admin = getSupabaseAdmin()
    const { data: est, error } = await admin
      .from('estimates')
      .select('*, customer:customer_id(*), org:org_id(*)')
      .eq('id', params.token)
      .single()

    if (error || !est) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    const { data: lineItems } = await admin
      .from('line_items')
      .select('*')
      .eq('parent_type', 'estimate')
      .eq('parent_id', params.token)
      .order('sort_order', { ascending: true })

    const customer = (est.customer as any) || {}
    const org = (est.org as any) || {}
    const taxRate = org.settings?.tax_rate || 8.25

    const items = (lineItems || []).map((li: any) => ({
      item: li.product || li.name || 'Item',
      description: li.description || '',
      vehicle: li.vehicle || '',
      qty: li.qty || li.quantity || 1,
      price: li.price || li.unit_price || 0,
    }))

    const subtotal = items.reduce((s: number, li: any) => s + li.price * li.qty, 0)
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount

    const createdAt = new Date(est.created_at)
    const validUntil = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)

    return NextResponse.json({
      number: est.estimate_number ? `EST-${est.estimate_number}` : `EST-${est.id.slice(0, 8).toUpperCase()}`,
      date: est.created_at,
      validUntil: validUntil.toISOString(),
      customerName: customer.name || '',
      customerEmail: customer.email || '',
      customerPhone: customer.phone || '',
      customerCompany: customer.company_name || '',
      scopeOfWork: est.notes || est.scope_of_work || '',
      lineItems: items,
      subtotal,
      taxRate: taxRate / 100,
      taxAmount,
      total,
      status: est.status,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
