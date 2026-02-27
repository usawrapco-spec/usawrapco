'use client'

import { usePortal } from '@/lib/portal-context'
import { C, money, fmt } from '@/lib/portal-theme'
import { Receipt, CreditCard, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'

interface Invoice {
  id: string
  invoice_number: string | null
  title: string | null
  total: number
  amount_paid: number
  balance: number
  status: string
  due_date: string | null
  invoice_date: string | null
  created_at: string
}

interface Payment {
  id: string
  invoice_id: string
  amount: number
  method: string
  payment_date: string
  created_at: string
}

const STATUS_STYLE: Record<string, { color: string; label: string; icon: typeof CheckCircle2 }> = {
  paid:    { color: '#22c07a', label: 'Paid',    icon: CheckCircle2 },
  partial: { color: '#f59e0b', label: 'Partial', icon: Clock },
  open:    { color: '#4f7fff', label: 'Open',    icon: Receipt },
  sent:    { color: '#4f7fff', label: 'Sent',    icon: Receipt },
  overdue: { color: '#f25a5a', label: 'Overdue', icon: AlertTriangle },
  draft:   { color: '#5a6080', label: 'Draft',   icon: Receipt },
  void:    { color: '#5a6080', label: 'Void',    icon: Receipt },
}

export default function PortalInvoices({ invoices, payments }: { invoices: Invoice[]; payments: Payment[] }) {
  const { token } = usePortal()

  const totalBalance = invoices
    .filter(inv => ['open', 'sent', 'partial', 'overdue'].includes(inv.status))
    .reduce((sum, inv) => sum + (inv.balance || 0), 0)

  return (
    <div style={{ padding: '20px 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
        Invoices & Payments
      </h1>

      {/* Balance due banner */}
      {totalBalance > 0 && (
        <div style={{
          background: `${C.accent}12`,
          border: `1px solid ${C.accent}30`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, color: C.text2, marginBottom: 4 }}>Total Balance Due</div>
          <div style={{
            fontSize: 28,
            fontWeight: 700,
            color: C.accent,
            fontFamily: 'var(--font-mono, JetBrains Mono, monospace)',
          }}>
            {money(totalBalance)}
          </div>
          <button style={{
            marginTop: 12,
            padding: '10px 28px',
            background: C.accent,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <CreditCard size={16} />
            Pay Now
          </button>
        </div>
      )}

      {invoices.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.text3 }}>
          <Receipt size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>No invoices yet</div>
        </div>
      )}

      {/* Invoice list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {invoices.map((inv) => {
          const st = STATUS_STYLE[inv.status] || STATUS_STYLE.open
          const Icon = st.icon
          return (
            <div key={inv.id} style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>
                    Invoice #{inv.invoice_number}
                  </div>
                  {inv.title && <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{inv.title}</div>}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: `${st.color}18`,
                  color: st.color,
                }}>
                  <Icon size={12} />
                  {st.label}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: C.text3 }}>Total</span>
                <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono, JetBrains Mono, monospace)' }}>
                  {money(inv.total)}
                </span>
              </div>

              {inv.amount_paid > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: C.text3 }}>Paid</span>
                  <span style={{ fontSize: 13, color: C.green, fontFamily: 'var(--font-mono, JetBrains Mono, monospace)' }}>
                    {money(inv.amount_paid)}
                  </span>
                </div>
              )}

              {inv.balance > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: C.text3 }}>Balance</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.accent, fontFamily: 'var(--font-mono, JetBrains Mono, monospace)' }}>
                    {money(inv.balance)}
                  </span>
                </div>
              )}

              {inv.due_date && (
                <div style={{ fontSize: 11, color: C.text3, marginTop: 8 }}>
                  Due: {fmt(inv.due_date)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: C.text3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            Payment History
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {payments.map((pmt) => (
              <div key={pmt.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{money(pmt.amount)}</div>
                  <div style={{ fontSize: 11, color: C.text3 }}>{pmt.method} &middot; {fmt(pmt.payment_date)}</div>
                </div>
                <CheckCircle2 size={16} color={C.green} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
