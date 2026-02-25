import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const admin = getSupabaseAdmin()
    const { data: inv, error } = await admin
      .from('invoices')
      .select('*, customer:customer_id(*), org:org_id(*)')
      .eq('id', params.token)
      .single()

    if (error || !inv) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const { data: lineItems } = await admin
      .from('line_items')
      .select('*')
      .eq('parent_type', 'invoice')
      .eq('parent_id', params.token)
      .order('sort_order', { ascending: true })

    const customer = (inv.customer as any) || {}
    const org = (inv.org as any) || {}
    const taxRate = org.settings?.tax_rate || 8.25

    const items = (lineItems || []).map((li: any) => ({
      item: li.product || li.name || 'Item',
      description: li.description || '',
      qty: li.qty || li.quantity || 1,
      price: li.price || li.unit_price || 0,
    }))

    const subtotal = items.reduce((s: number, li: any) => s + li.price * li.qty, 0)
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount
    const amountPaid = inv.amount_paid || 0
    const balanceDue = Math.max(0, total - amountPaid)

    return NextResponse.json({
      number: `INV-${inv.invoice_number || inv.id.slice(0, 8).toUpperCase()}`,
      invoiceDate: inv.created_at,
      dueDate: inv.due_date || '',
      paymentTerms: inv.payment_terms || 'Net 30',
      status: inv.status || 'sent',
      requiresSignature: inv.requires_signature ?? true,
      customerName: customer.name || '',
      customerEmail: customer.email || '',
      customerPhone: customer.phone || '',
      customerCompany: customer.company_name || '',
      lineItems: items,
      subtotal,
      taxRate: taxRate / 100,
      taxAmount,
      total,
      amountPaid,
      balanceDue,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
