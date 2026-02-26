import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Profile, Invoice, LineItem, Payment } from '@/types'
import InvoiceDetailClient from '@/components/invoices/InvoiceDetailClient'

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  let invoice: Invoice | null = null
  let lineItems: LineItem[] = []
  let payments: Payment[] = []
  let isDemo = false

  try {
    // Fetch invoice without FK join to avoid Supabase FK resolution errors
    const { data, error } = await admin
      .from('invoices')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) throw error
    invoice = data as Invoice

    // Separately fetch customer (avoid FK join syntax which requires FK configured in DB)
    if (invoice?.customer_id) {
      const { data: cust } = await admin
        .from('customers')
        .select('id, name, email')
        .eq('id', invoice.customer_id)
        .single()
      if (cust) {
        invoice = { ...invoice, customer: cust as any }
      } else {
        // Fallback to profiles table
        const { data: prof } = await admin
          .from('profiles')
          .select('id, name, email')
          .eq('id', invoice.customer_id)
          .single()
        if (prof) invoice = { ...invoice, customer: prof as any }
      }
    }

    // Fetch sales rep separately
    if (invoice?.sales_rep_id) {
      const { data: rep } = await admin
        .from('profiles')
        .select('id, name')
        .eq('id', invoice.sales_rep_id)
        .single()
      if (rep) invoice = { ...invoice, sales_rep: rep as any }
    }

    // Fetch line items
    const { data: liData } = await admin
      .from('line_items')
      .select('*')
      .eq('parent_id', params.id)
      .eq('parent_type', 'invoice')
      .order('sort_order')
    lineItems = (liData as LineItem[]) || []

    // Fetch payments
    const { data: paymentData } = await admin
      .from('payments')
      .select('*')
      .eq('invoice_id', params.id)
      .order('payment_date', { ascending: false })
    payments = (paymentData as Payment[]) || []
  } catch (err) {
    console.error('[invoice detail] fetch error:', err)
    isDemo = true
  }

  return (
    <InvoiceDetailClient
      profile={profile as Profile}
      invoice={invoice}
      lineItems={lineItems}
      payments={payments}
      isDemo={isDemo}
      invoiceId={params.id}
    />
  )
}
