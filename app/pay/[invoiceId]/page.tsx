import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import PaymentClient from './PaymentClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: { invoiceId: string }
  searchParams: { success?: string; cancelled?: string }
}

export default async function PayPage({ params, searchParams }: Props) {
  const { invoiceId } = params
  const isSuccess = searchParams.success === 'true'
  const isCancelled = searchParams.cancelled === 'true'

  const admin = getSupabaseAdmin()

  // Try by direct ID first, then by pay_link_token (supports both URL formats)
  let invoice: any = null
  const { data: byId } = await admin
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single()

  if (byId) {
    invoice = byId
  } else {
    const { data: byToken } = await admin
      .from('invoices')
      .select('*')
      .eq('pay_link_token', invoiceId)
      .single()
    invoice = byToken
  }

  if (!invoice) return notFound()

  // Fetch customer
  let customer: { id: string; name: string; email?: string; phone?: string } | null = null
  if (invoice.customer_id) {
    const { data: cust } = await admin
      .from('customers')
      .select('id, name, email, phone')
      .eq('id', invoice.customer_id)
      .single()
    customer = cust

    if (!customer) {
      const { data: prof } = await admin
        .from('profiles')
        .select('id, name, email')
        .eq('id', invoice.customer_id)
        .single()
      customer = prof
    }
  }

  const { data: lineItems } = await admin
    .from('line_items')
    .select('name, total_price')
    .eq('parent_id', invoice.id)
    .eq('parent_type', 'invoice')
    .order('sort_order')

  const balanceDue = Math.max(0, invoice.balance ?? (invoice.total - invoice.amount_paid))
  const isPaid = (invoice.status === 'paid' || balanceDue <= 0) && !isSuccess

  // Get current financing status if any app exists
  let financingStatus: string | null = null
  if (invoice.financing_application_id) {
    const { data: finApp } = await admin
      .from('financing_applications')
      .select('status')
      .eq('id', invoice.financing_application_id)
      .single()
    financingStatus = finApp?.status ?? null
  }

  const wisetackUrl = process.env.WISETACK_MERCHANT_URL || null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <div style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 26, fontWeight: 900, color: 'var(--accent)',
          letterSpacing: '0.05em',
        }}>
          USA WRAP CO
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
          Secure Online Payment
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          {/* Card header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface2)',
          }}>
            <div style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 22, fontWeight: 900, color: 'var(--text1)', marginBottom: 4,
            }}>
              {isSuccess ? 'Payment Complete' : isPaid ? 'Invoice Paid' : 'Complete Payment'}
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12, color: 'var(--accent)', fontWeight: 600,
              }}>
                INV-{invoice.invoice_number}
              </span>
              {customer?.name && (
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                  {customer.name}
                </span>
              )}
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: '20px 24px' }}>
            <PaymentClient
              invoiceId={invoice.id}
              invoiceNumber={String(invoice.invoice_number)}
              customerName={customer?.name || 'Customer'}
              customerEmail={customer?.email || null}
              total={invoice.total}
              amountPaid={invoice.amount_paid || 0}
              balanceDue={isSuccess ? (invoice.balance_due ?? invoice.balance ?? (invoice.total - invoice.amount_paid)) : balanceDue}
              lineItems={lineItems || []}
              isSuccess={isSuccess}
              isPaid={isPaid}
              isCancelled={isCancelled}
              wisetackUrl={wisetackUrl}
              financingStatus={financingStatus}
            />
          </div>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center', fontSize: 11, color: 'var(--text3)',
          marginTop: 16,
        }}>
          Questions? Visit{' '}
          <span style={{ color: 'var(--accent)' }}>usawrapco.com</span>
          {' '}or reply to your invoice email.
        </p>
      </div>
    </div>
  )
}
