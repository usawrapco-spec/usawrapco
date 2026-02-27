import { getSupabaseAdmin } from '@/lib/supabase/service'
import PortalInvoices from '@/components/portal/PortalInvoices'

export const dynamic = 'force-dynamic'

export default async function PortalInvoicesPage({ params }: { params: { token: string } }) {
  const { token } = params
  const supabase = getSupabaseAdmin()

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('portal_token', token)
    .single()

  if (!customer) return <div style={{ padding: 40, textAlign: 'center', color: '#9299b5' }}>Not found</div>

  const [invoicesRes, paymentsRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, title, total, amount_paid, balance, status, due_date, invoice_date, created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select('id, invoice_id, amount, method, payment_date, created_at')
      .eq('customer_id', customer.id)
      .order('payment_date', { ascending: false }),
  ])

  return (
    <PortalInvoices
      invoices={(invoicesRes.data || []) as any[]}
      payments={(paymentsRes.data || []) as any[]}
    />
  )
}
