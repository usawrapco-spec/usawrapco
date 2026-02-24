import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Profile, Invoice, Payment } from '@/types'
import InvoiceDetailClient from '@/components/invoices/InvoiceDetailClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  let invoice: Invoice | null = null
  let payments: Payment[] = []
  let isDemo = false

  try {
    const { data, error } = await admin
      .from('invoices')
      .select(`
        *,
        customer:customer_id(id, name, email),
        sales_rep:sales_rep_id(id, name)
      `)
      .eq('id', params.id)
      .single()

    if (error) throw error
    invoice = data as Invoice

    // Fetch payments for this invoice
    const { data: paymentData } = await admin
      .from('payments')
      .select(`
        *,
        recorder:recorded_by(id, name)
      `)
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
      payments={payments}
      isDemo={isDemo}
      invoiceId={params.id}
    />
  )
}
