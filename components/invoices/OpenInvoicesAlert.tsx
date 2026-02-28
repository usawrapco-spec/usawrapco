'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, AlertCircle, DollarSign, CreditCard, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Invoice } from '@/types'

interface Props {
  // Can be server-prefetched or loaded client-side
  initialInvoices?: Invoice[]
  orgId?: string
  showPayModal?: (inv: Invoice) => void
}

const fmtCur = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export default function OpenInvoicesAlert({ initialInvoices, orgId, showPayModal }: Props) {
  const supabase = createClient()
  const [openInvoices, setOpenInvoices] = useState<Invoice[]>(initialInvoices || [])
  const [loading, setLoading] = useState(!initialInvoices)
  const [payModal, setPayModal] = useState<Invoice | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (initialInvoices) return
    const fetchOpen = async () => {
      const { data } = await supabase
        .from('invoices')
        .select('*, customer:customer_id(id, name, email)')
        .in('status', ['sent', 'overdue'])
        .order('total', { ascending: false })
        .limit(20)
      setOpenInvoices((data as Invoice[]) || [])
      setLoading(false)
    }
    fetchOpen()
  }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  if (loading || openInvoices.length === 0) return null

  const total = openInvoices.reduce((s, inv) => s + (inv.balance_due ?? 0), 0)
  const hasOverdue = openInvoices.some(inv => inv.status === 'overdue')
  const top3 = openInvoices.slice(0, 3)

  const bannerBg = hasOverdue ? 'rgba(242,90,90,0.08)' : 'rgba(245,158,11,0.08)'
  const bannerBorder = hasOverdue ? 'rgba(242,90,90,0.3)' : 'rgba(245,158,11,0.3)'
  const bannerColor = hasOverdue ? '#f25a5a' : '#f59e0b'
  const Icon = hasOverdue ? AlertCircle : AlertTriangle

  async function handleMarkPaid(inv: Invoice) {
    const amount = parseFloat(payAmount)
    if (!amount || isNaN(amount)) { showToast('Enter a valid amount'); return }
    setSaving(true)
    try {
      await supabase.from('payments').insert({
        invoice_id: inv.id,
        customer_id: inv.customer_id,
        amount,
        method: payMethod,
        payment_date: new Date().toISOString().split('T')[0],
        org_id: (inv as any).org_id,
      })
      const balance = (inv.balance_due ?? inv.total) - amount
      const newStatus = balance <= 0 ? 'paid' : 'partial'
      await supabase.from('invoices').update({ status: newStatus, amount_paid: (inv.amount_paid || 0) + amount }).eq('id', inv.id)
      setOpenInvoices(prev => newStatus === 'paid' ? prev.filter(i => i.id !== inv.id) : prev.map(i => i.id === inv.id ? { ...i, status: newStatus as any, amount_paid: (i.amount_paid || 0) + amount } : i))
      setPayModal(null)
      setPayAmount('')
      showToast(`Payment recorded for INV-${inv.invoice_number}`)
    } catch {
      showToast('Failed to record payment')
    }
    setSaving(false)
  }

  return (
    <>
      <div style={{
        background: bannerBg,
        border: `1px solid ${bannerBorder}`,
        borderRadius: 12, padding: '14px 18px',
        marginBottom: 20,
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon size={18} style={{ color: bannerColor, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: bannerColor, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {openInvoices.length} Open Invoice{openInvoices.length !== 1 ? 's' : ''} — {fmtCur(total)} Outstanding
            </span>
          </div>
          <Link
            href="/invoices"
            style={{
              fontSize: 12, fontWeight: 700, color: bannerColor,
              textDecoration: 'none', border: `1px solid ${bannerBorder}`,
              padding: '4px 12px', borderRadius: 20,
              background: `${bannerColor}10`,
            }}
          >
            View All Invoices
          </Link>
        </div>

        {/* Top 3 invoice rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {top3.map(inv => {
            const isOverdue = inv.status === 'overdue'
            const invColor = isOverdue ? '#f25a5a' : '#f59e0b'
            const balance = inv.balance_due ?? 0
            const custName = (inv.customer as any)?.name || `INV-${inv.invoice_number}`
            return (
              <div
                key={inv.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  background: 'var(--surface)', border: '1px solid var(--surface2)',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{
                  padding: '2px 8px', borderRadius: 10,
                  background: `${invColor}18`, color: invColor,
                  fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                  flexShrink: 0,
                }}>
                  {inv.status}
                </span>
                <Link href={`/invoices/${inv.id}`} style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--text1)', textDecoration: 'none', minWidth: 120 }}>
                  {custName}
                </Link>
                <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
                  INV-{inv.invoice_number}
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: invColor, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                  {fmtCur(balance)}
                </span>
                <button
                  onClick={() => { setPayModal(inv); setPayAmount(String(balance.toFixed(2))) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                    padding: '5px 12px', borderRadius: 8, border: 'none',
                    background: '#22c07a', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <CreditCard size={11} /> Mark Paid
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Pay Modal */}
      {payModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setPayModal(null)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 420, border: '1px solid var(--surface2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>
                Record Payment
              </div>
              <button onClick={() => setPayModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
              INV-{payModal.invoice_number} · {(payModal.customer as any)?.name || 'Customer'}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Amount
              </label>
              <input
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--surface2)', borderRadius: 8, color: 'var(--text1)', fontSize: 16, fontFamily: 'JetBrains Mono, monospace' }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Method
              </label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--surface2)', borderRadius: 8, color: 'var(--text1)', fontSize: 13 }}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="stripe">Stripe</option>
                <option value="zelle">Zelle</option>
                <option value="check">Check</option>
                <option value="ach">ACH</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setPayModal(null)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'transparent', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={() => handleMarkPaid(payModal)}
                disabled={saving}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#22c07a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <DollarSign size={13} /> {saving ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 10000, background: 'var(--surface2)', border: '1px solid var(--surface2)', borderRadius: 8, padding: '8px 16px', color: 'var(--text1)', fontSize: 13, fontWeight: 600 }}>
          {toast}
        </div>
      )}
    </>
  )
}
