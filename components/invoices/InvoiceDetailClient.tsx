'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Send, CheckCircle2, XCircle, FileText, DollarSign,
  Calendar, User, CreditCard, Download, Clock, AlertTriangle,
  ExternalLink, Ban, Link2, Copy, Check,
} from 'lucide-react'
import RelatedDocsPanel from '@/components/shared/RelatedDocsPanel'
import SendFinancingButton from '@/components/invoices/SendFinancingButton'
import type { Profile, Invoice, InvoiceStatus, LineItem, Payment } from '@/types'
import { isAdminRole } from '@/types'
import { hasPermission } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'

// ─── Demo data ──────────────────────────────────────────────────────────────────
const DEMO_INVOICE = {
  id: 'demo-inv-1', org_id: '', invoice_number: '2001', title: 'Ford F-150 Full Wrap',
  sales_order_id: 'so-demo', customer_id: null, status: 'sent',
  invoice_date: '2026-02-18', due_date: '2026-03-04',
  subtotal: 3200, discount: 0, tax_rate: 0.0825, tax_amount: 264, total: 3464,
  amount_paid: 1000, balance_due: 2464, notes: 'Matte black full wrap with chrome delete',
  form_data: {}, created_at: '2026-02-18T10:00:00Z', updated_at: '2026-02-18T10:00:00Z',
  customer: { id: 'c1', name: 'Mike Johnson', email: 'mike@example.com' },
  sales_order: { id: 'so-demo', so_number: '3001' },
} as Invoice

const DEMO_LINE_ITEMS: LineItem[] = [
  {
    id: 'li-inv-1', parent_type: 'invoice', parent_id: 'demo-inv-1', product_type: 'wrap',
    name: 'Full Body Wrap - Matte Black', description: '3M 2080 Matte Black',
    quantity: 1, unit_price: 2800, unit_discount: 0, total_price: 2800,
    specs: {
      vehicleYear: '2024', vehicleMake: 'Ford', vehicleModel: 'F-150',
      vehicleColor: 'White', wrapType: 'Full Wrap', vinylType: '3M 2080 Matte Black',
    },
    sort_order: 0, created_at: '2026-02-18T10:00:00Z',
  },
  {
    id: 'li-inv-2', parent_type: 'invoice', parent_id: 'demo-inv-1', product_type: 'wrap',
    name: 'Chrome Delete Package', description: 'Gloss black chrome delete - all trim',
    quantity: 1, unit_price: 400, unit_discount: 0, total_price: 400,
    specs: {
      wrapType: 'Chrome Delete', vinylType: '3M 2080 Gloss Black',
    },
    sort_order: 1, created_at: '2026-02-18T10:00:00Z',
  },
]

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  draft:   { label: 'Draft',   color: 'var(--text3)',  bg: 'rgba(90,96,128,0.15)' },
  open:    { label: 'Open',    color: 'var(--cyan)',   bg: 'rgba(34,211,238,0.15)' },
  sent:    { label: 'Sent',    color: 'var(--accent)', bg: 'rgba(79,127,255,0.15)' },
  partial: { label: 'Partial', color: 'var(--amber)',  bg: 'rgba(245,158,11,0.15)' },
  paid:    { label: 'Paid',    color: 'var(--green)',  bg: 'rgba(34,192,122,0.15)' },
  overdue: { label: 'Overdue', color: 'var(--red)',    bg: 'rgba(242,90,90,0.15)' },
  void:    { label: 'Void',    color: 'var(--text3)',  bg: 'rgba(90,96,128,0.10)' },
}

interface Props {
  profile: Profile
  invoice: Invoice | null
  lineItems?: LineItem[]
  payments?: Payment[]
  isDemo: boolean
  invoiceId: string
  financingStatus?: string | null
  payLinkToken?: string | null
}

export default function InvoiceDetailClient({ profile, invoice, lineItems = [], payments = [], isDemo, invoiceId, financingStatus = null, payLinkToken = null }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const inv = invoice || DEMO_INVOICE
  const items = lineItems.length > 0 ? lineItems : isDemo ? DEMO_LINE_ITEMS : []

  const canWrite = isAdminRole(profile.role) || hasPermission(profile.role, 'sales.write')

  const [status, setStatus] = useState<InvoiceStatus>(inv.status)
  const [amountPaid, setAmountPaid] = useState(inv.amount_paid)
  const [vehicleYear, setVehicleYear] = useState<string>((inv.form_data?.vehicleYear as string) || '')
  const [vehicleMake, setVehicleMake] = useState<string>((inv.form_data?.vehicleMake as string) || '')
  const [vehicleModel, setVehicleModel] = useState<string>((inv.form_data?.vehicleModel as string) || '')
  const [paymentInput, setPaymentInput] = useState('')
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendMessage, setSendMessage] = useState('')

  // Calculated totals — use stored total from DB when available to avoid NaN from missing columns
  const subtotal = useMemo(() => items.reduce((s, li) => s + li.total_price, 0), [items])
  const discount = inv.discount ?? 0
  // tax_percent is stored as e.g. 8.25 (percentage), tax_rate as 0.0825 (decimal) — handle both
  const taxRate = inv.tax_rate ?? (inv.tax_percent ? inv.tax_percent / 100 : 0)
  const taxAmount = useMemo(() => (subtotal - discount) * taxRate, [subtotal, discount, taxRate])
  const total = useMemo(() => {
    // Prefer stored total from DB if line items haven't been computed
    if (subtotal === 0 && inv.total > 0) return inv.total
    return subtotal - discount + taxAmount
  }, [subtotal, discount, taxAmount, inv.total])
  const balanceDue = useMemo(() => total - amountPaid, [total, amountPaid])

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const fmtDate = (d: string | null) => {
    if (!d) return '--'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleStatusChange(newStatus: InvoiceStatus) {
    if (!canWrite) return
    setStatus(newStatus)
    if (!isDemo) {
      try {
        const updates: Record<string, unknown> = { status: newStatus }
        if (newStatus === 'paid') {
          updates.amount_paid = total
          updates.balance = 0
          updates.paid_at = new Date().toISOString()
          setAmountPaid(total)
        }
        await supabase.from('invoices').update(updates).eq('id', invoiceId)
        showToast(`Status changed to ${STATUS_CONFIG[newStatus].label}`)
      } catch {
        showToast('Error updating status')
      }
    } else {
      if (newStatus === 'paid') setAmountPaid(total)
      showToast(`Demo: Status changed to ${STATUS_CONFIG[newStatus].label}`)
    }
  }

  async function handleRecordPayment() {
    const amount = parseFloat(paymentInput)
    if (isNaN(amount) || amount <= 0) {
      showToast('Enter a valid payment amount')
      return
    }
    const newPaid = amountPaid + amount
    const newBalance = total - newPaid
    setAmountPaid(newPaid)
    setPaymentInput('')
    setShowPaymentForm(false)

    if (newBalance <= 0) {
      setStatus('paid')
    }

    if (!isDemo) {
      try {
        const updates: Record<string, unknown> = {
          amount_paid: newPaid,
          balance: Math.max(0, newBalance),
        }
        if (newBalance <= 0) { updates.status = 'paid'; updates.paid_at = new Date().toISOString() }
        await supabase.from('invoices').update(updates).eq('id', invoiceId)
        showToast(`Payment of ${fmtCurrency(amount)} recorded`)
      } catch {
        showToast('Error recording payment')
      }
    } else {
      showToast(`Demo: Payment of ${fmtCurrency(amount)} recorded`)
    }
  }

  async function handleSaveVehicle(year: string, make: string, model: string) {
    if (!canWrite || isDemo) return
    await supabase.from('invoices').update({
      form_data: { ...inv.form_data, vehicleYear: year || undefined, vehicleMake: make || undefined, vehicleModel: model || undefined },
    }).eq('id', invoiceId)
  }

  function handleExportPdf() {
    window.location.href = `/api/pdf/invoice/${invoiceId}`
  }

  function handleSendInvoice() {
    setShowSendModal(true)
  }

  async function confirmSendInvoice() {
    setSending(true)
    try {
      if (!isDemo) {
        const res = await fetch('/api/invoices/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoice_id: invoiceId, message: sendMessage }),
        })
        const data = await res.json()
        showToast(data.message || 'Invoice sent')
        setStatus('sent')
      } else {
        showToast('Demo: Invoice marked as sent')
        setStatus('sent')
      }
    } catch {
      showToast('Error sending invoice')
    } finally {
      setSending(false)
      setShowSendModal(false)
      setSendMessage('')
    }
  }

  const sc = STATUS_CONFIG[status]

  return (
    <div>
      {/* Print styles */}
      <style>{`
        @media print {
          nav, header, aside, [data-no-print], .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .invoice-print-area { background: white !important; color: black !important; border: none !important; }
          .print-logo-header { display: flex !important; }
        }
        .print-logo-header { display: none; }
      `}</style>

      {/* Print-only logo header */}
      <div className="print-logo-header" style={{
        alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: 12, borderBottom: '2px solid #1a1d27', marginBottom: 16,
      }}>
        <img
          src="https://usawrapco.com/wp-content/uploads/2025/10/main-logo-1-e1759926343108.webp"
          alt="USA WRAP CO"
          style={{ height: 40, width: 'auto' }}
          onError={(e) => {
            const el = e.currentTarget
            el.style.display = 'none'
            const fb = document.getElementById('print-logo-fallback')
            if (fb) fb.style.display = 'block'
          }}
        />
        <span id="print-logo-fallback" style={{ display: 'none', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 900, color: '#4f7fff' }}>
          USA WRAP CO
        </span>
        <span style={{ fontSize: 11, color: '#5a6080' }}>INVOICE — CONFIDENTIAL</span>
      </div>

      {/* Send Invoice Modal */}
      {showSendModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:28, width:'100%', maxWidth:480 }}>
            <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontSize:20, fontWeight:900, color:'var(--text1)', marginBottom:4 }}>Send Invoice</div>
            <div style={{ fontSize:12, color:'var(--text3)', marginBottom:16 }}>
              INV-{inv.invoice_number} · {(inv.customer as any)?.name || 'Customer'}
              {(inv.customer as any)?.email && <span style={{ color:'var(--accent)', marginLeft:6 }}>{(inv.customer as any).email}</span>}
            </div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text3)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' }}>
              Custom Message (optional)
            </label>
            <textarea
              value={sendMessage}
              onChange={e => setSendMessage(e.target.value)}
              placeholder="Leave blank to use the default invoice message..."
              rows={4}
              style={{ width:'100%', padding:'10px 12px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text1)', fontSize:13, resize:'vertical', outline:'none' }}
            />
            <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'flex-end' }}>
              <button onClick={() => setShowSendModal(false)} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text2)', fontSize:13, cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={confirmSendInvoice} disabled={sending} style={{ padding:'8px 20px', borderRadius:8, border:'none', background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                <Send size={13} /> {sending ? 'Sending...' : 'Send Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo banner */}
      {isDemo && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 10, marginBottom: 20, fontSize: 13, color: 'var(--amber)',
        }}>
          <AlertTriangle size={14} />
          <span>Viewing demo invoice. Run the v6 migration to enable live data.</span>
        </div>
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/invoices')} className="btn-ghost btn-sm">
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <span className="mono" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
              INV-{inv.invoice_number}
            </span>
            <span style={{
              marginLeft: 10, display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
              borderRadius: 6, fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg,
            }}>
              {sc.label}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canWrite && status === 'draft' && (
            <button onClick={handleSendInvoice} className="btn-ghost btn-sm">
              <Send size={13} /> Send Invoice
            </button>
          )}
          {canWrite && status !== 'paid' && status !== 'void' && (
            <button onClick={handleExportPdf} className="btn-ghost btn-sm">
              <Download size={13} /> Export PDF
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'flex-start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Invoice info card */}
          <div className="card">
            <div className="section-label">Invoice Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label">Title</label>
                <input
                  value={inv.title || ''}
                  className="field"
                  disabled
                  style={{ opacity: 0.7 }}
                />
              </div>
              <div>
                <label className="field-label">Customer</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <input
                    value={inv.customer?.name || '--'}
                    className="field"
                    disabled
                    style={{ opacity: 0.7 }}
                  />
                </div>
                {inv.customer?.email && (
                  <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, display: 'block' }}>
                    {inv.customer.email}
                  </span>
                )}
              </div>
              <div>
                <label className="field-label">Year</label>
                <input
                  value={vehicleYear}
                  onChange={e => setVehicleYear(e.target.value)}
                  onBlur={e => handleSaveVehicle(e.target.value, vehicleMake, vehicleModel)}
                  className="field"
                  disabled={!canWrite}
                  placeholder="2024"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="field-label">Make</label>
                <input
                  value={vehicleMake}
                  onChange={e => setVehicleMake(e.target.value)}
                  onBlur={e => handleSaveVehicle(vehicleYear, e.target.value, vehicleModel)}
                  className="field"
                  disabled={!canWrite}
                  placeholder="Ford"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Model</label>
                <input
                  value={vehicleModel}
                  onChange={e => setVehicleModel(e.target.value)}
                  onBlur={e => handleSaveVehicle(vehicleYear, vehicleMake, e.target.value)}
                  className="field"
                  disabled={!canWrite}
                  placeholder="Transit 350"
                />
              </div>
              <div>
                <label className="field-label">Invoice Date</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <input
                    value={fmtDate(inv.invoice_date)}
                    className="field"
                    disabled
                    style={{ opacity: 0.7 }}
                  />
                </div>
              </div>
              <div>
                <label className="field-label">Due Date</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={13} style={{
                    color: status === 'overdue' ? 'var(--red)' : 'var(--accent)',
                    flexShrink: 0,
                  }} />
                  <input
                    value={fmtDate(inv.due_date)}
                    className="field"
                    disabled
                    style={{ opacity: 0.7 }}
                  />
                </div>
              </div>
            </div>

            {/* Sales Order link */}
            {inv.sales_order && (
              <div style={{ marginTop: 12 }}>
                <label className="field-label">Linked Sales Order</label>
                <button
                  onClick={() => router.push(`/sales-orders/${inv.sales_order_id}`)}
                  className="btn-ghost btn-sm"
                  style={{ gap: 6 }}
                >
                  <ExternalLink size={12} />
                  <span className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>
                    SO-{inv.sales_order.so_number}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Line Items (read-only) */}
          <div className="card">
            <div className="section-label" style={{ marginBottom: 16 }}>
              Line Items ({items.length})
            </div>

            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)', fontSize: 13 }}>
                No line items on this invoice.
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Item</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right', width: 60 }}>Qty</th>
                      <th style={{ textAlign: 'right', width: 100 }}>Unit Price</th>
                      <th style={{ textAlign: 'right', width: 100 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((li, idx) => (
                      <tr key={li.id}>
                        <td>
                          <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>
                            {idx + 1}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 13 }}>
                          {li.name || 'Untitled'}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                          {li.description || '--'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="mono" style={{ fontSize: 13, color: 'var(--text1)' }}>
                            {li.quantity}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="mono" style={{ fontSize: 13, color: 'var(--text2)' }}>
                            {fmtCurrency(li.unit_price)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="mono" style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>
                            {fmtCurrency(li.total_price)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes */}
          {inv.notes && (
            <div className="card">
              <div className="section-label">Notes</div>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
                {inv.notes}
              </p>
            </div>
          )}
        </div>

        {/* Right column: Pricing + Payment + Actions */}
        <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pricing summary */}
          <div className="card">
            <div className="section-label">Pricing Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <PricingRow label="Subtotal" value={fmtCurrency(subtotal)} />
              {discount > 0 && (
                <PricingRow label="Discount" value={`-${fmtCurrency(discount)}`} color="var(--green)" />
              )}
              <PricingRow label={`Tax (${(taxRate * 100).toFixed(2)}%)`} value={fmtCurrency(taxAmount)} />
              <div style={{ borderTop: '2px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                <PricingRow label="Total" value={fmtCurrency(total)} isTotal />
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
                <PricingRow label="Amount Paid" value={fmtCurrency(amountPaid)} color="var(--green)" />
                <div style={{ marginTop: 8 }}>
                  <PricingRow
                    label="Balance Due"
                    value={fmtCurrency(Math.max(0, balanceDue))}
                    isTotal
                    color={balanceDue > 0 ? 'var(--amber)' : 'var(--green)'}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment section */}
          {canWrite && status !== 'void' && balanceDue > 0 && (
            <div className="card">
              <div className="section-label">Record Payment</div>
              {showPaymentForm ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label className="field-label">Payment Amount</label>
                    <div style={{ position: 'relative' }}>
                      <DollarSign size={13} style={{
                        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--text3)', pointerEvents: 'none',
                      }} />
                      <input
                        type="number"
                        value={paymentInput}
                        onChange={e => setPaymentInput(e.target.value)}
                        className="field mono"
                        placeholder="0.00"
                        style={{ paddingLeft: 30 }}
                        min={0}
                        step={0.01}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleRecordPayment}
                      className="btn-primary btn-sm"
                      style={{ flex: 1, background: 'var(--green)' }}
                    >
                      <CreditCard size={13} /> Record
                    </button>
                    <button
                      onClick={() => { setShowPaymentForm(false); setPaymentInput('') }}
                      className="btn-ghost btn-sm"
                    >
                      Cancel
                    </button>
                  </div>
                  {/* Quick amount buttons */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setPaymentInput(balanceDue.toFixed(2))}
                      className="btn-ghost btn-xs"
                      style={{ fontSize: 11 }}
                    >
                      Full Balance ({fmtCurrency(balanceDue)})
                    </button>
                    <button
                      onClick={() => setPaymentInput((balanceDue / 2).toFixed(2))}
                      className="btn-ghost btn-xs"
                      style={{ fontSize: 11 }}
                    >
                      Half ({fmtCurrency(balanceDue / 2)})
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowPaymentForm(true)}
                  className="btn-primary btn-sm"
                  style={{ width: '100%', background: 'var(--green)' }}
                >
                  <CreditCard size={13} /> Record Payment
                </button>
              )}
            </div>
          )}

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="card">
              <div className="section-label">Payment History</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {payments.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: '1px solid var(--border)',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600, textTransform: 'capitalize' }}>
                        {p.method}
                        {p.reference_number && (
                          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400, marginLeft: 6 }}>
                            #{p.reference_number.slice(0, 18)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        {p.payment_date}
                      </div>
                    </div>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>
                      {fmtCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Online Payment Link */}
          {canWrite && status !== 'void' && status !== 'paid' && !isDemo && (
            <div className="card">
              <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Link2 size={13} style={{ color: 'var(--accent)' }} /> Online Payment Link
              </div>
              <PaymentLinkPanel invoiceId={invoiceId} payLinkToken={payLinkToken} />
            </div>
          )}

          {/* Financing */}
          {canWrite && status !== 'void' && status !== 'paid' && !isDemo && (
            <div className="card">
              <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={13} style={{ color: 'var(--accent)' }} /> Financing (Wisetack)
              </div>
              <SendFinancingButton
                invoiceId={invoiceId}
                invoiceNumber={inv.invoice_number}
                payLinkToken={payLinkToken}
                balance={Math.max(0, balanceDue)}
                customerId={inv.customer_id}
                projectId={inv.project_id}
                customerPhone={(inv as any).customer?.phone || null}
                customerEmail={inv.customer?.email || null}
                currentFinancingStatus={financingStatus as any}
              />
            </div>
          )}

          {/* Status actions */}
          {canWrite && (
            <div className="card">
              <div className="section-label">Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {status === 'draft' && (
                  <button onClick={handleSendInvoice} className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                    <Send size={13} style={{ color: 'var(--accent)' }} /> Send Invoice
                  </button>
                )}
                {status !== 'sent' && status !== 'void' && status !== 'paid' && (
                  <button onClick={() => handleStatusChange('sent')} className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                    <Send size={13} style={{ color: 'var(--accent)' }} /> Mark as Sent
                  </button>
                )}
                {status !== 'paid' && status !== 'void' && (
                  <button onClick={() => handleStatusChange('paid')} className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                    <CheckCircle2 size={13} style={{ color: 'var(--green)' }} /> Mark as Paid
                  </button>
                )}
                {status !== 'void' && (
                  <button onClick={() => handleStatusChange('void')} className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                    <Ban size={13} style={{ color: 'var(--text3)' }} /> Void Invoice
                  </button>
                )}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                  <button onClick={handleExportPdf} className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start', width: '100%' }}>
                    <Download size={13} style={{ color: 'var(--accent)' }} /> Export PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Related Documents */}
          <RelatedDocsPanel
            projectId={inv.project_id}
            customerId={inv.customer_id}
            currentDocId={invoiceId}
            currentDocType="invoice"
          />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text1)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ─── Payment Link Panel ───────────────────────────────────────────────────────
function PaymentLinkPanel({ invoiceId, payLinkToken }: { invoiceId: string; payLinkToken?: string | null }) {
  const [copied, setCopied] = useState(false)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'
  const token = payLinkToken || invoiceId
  const url = `${appUrl}/pay/${token}`

  function copyLink() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '7px 10px',
      }}>
        <span style={{
          flex: 1, fontSize: 11, color: 'var(--text3)',
          fontFamily: 'JetBrains Mono, monospace',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {url}
        </span>
        <button
          onClick={copyLink}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 6, border: 'none',
            background: copied ? 'var(--green)' : 'var(--accent)',
            color: '#fff', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s',
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0, lineHeight: 1.4 }}>
        Share this link to collect secure card payment via Stripe.
      </p>
    </div>
  )
}

// ─── Pricing Row ─────────────────────────────────────────────────────────────
function PricingRow({
  label, value, isTotal, color,
}: {
  label: string; value: string; isTotal?: boolean; color?: string
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{
        fontSize: isTotal ? 14 : 13,
        color: isTotal ? 'var(--text1)' : 'var(--text2)',
        fontWeight: isTotal ? 700 : 400,
      }}>
        {label}
      </span>
      <span className="mono" style={{
        fontSize: isTotal ? 18 : 14,
        color: color || (isTotal ? 'var(--green)' : 'var(--text1)'),
        fontWeight: isTotal ? 800 : 600,
      }}>
        {value}
      </span>
    </div>
  )
}
