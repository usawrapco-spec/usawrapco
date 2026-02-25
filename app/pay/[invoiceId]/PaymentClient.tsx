'use client'

import { useState } from 'react'
import { CheckCircle2, CreditCard, ArrowRight, AlertCircle, Lock } from 'lucide-react'

interface LineItemRow { name: string; total_price: number }

interface Props {
  invoiceId: string
  invoiceNumber: string
  customerName: string
  customerEmail: string | null
  total: number
  amountPaid: number
  balanceDue: number
  lineItems: LineItemRow[]
  isSuccess: boolean
  isPaid: boolean
  isCancelled: boolean
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function PaymentClient({
  invoiceId, invoiceNumber, customerName, customerEmail,
  total, amountPaid, balanceDue, lineItems,
  isSuccess, isPaid, isCancelled,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePayNow() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/create-invoice-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Could not start checkout')
        setLoading(false)
      }
    } catch (e: any) {
      setError(e.message || 'Network error')
      setLoading(false)
    }
  }

  // ── Payment successful ───────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 8px' }}>
        <div style={{
          display: 'inline-flex', background: 'rgba(34,192,122,0.12)',
          borderRadius: '50%', padding: 20, marginBottom: 20,
        }}>
          <CheckCircle2 size={44} style={{ color: 'var(--green)' }} />
        </div>
        <h2 style={{
          fontFamily: 'Barlow Condensed, sans-serif', fontSize: 30, fontWeight: 900,
          color: 'var(--text1)', marginBottom: 8, marginTop: 0,
        }}>
          Payment Received
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 4 }}>
          Thank you, {customerName}!
        </p>
        <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>
          Your payment of {fmt(balanceDue)} for INV-{invoiceNumber} has been processed.
          {customerEmail && <><br />A receipt was sent to {customerEmail}.</>}
        </p>
      </div>
    )
  }

  // ── Already paid ─────────────────────────────────────────────────────────────
  if (isPaid) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 8px' }}>
        <div style={{
          display: 'inline-flex', background: 'rgba(34,192,122,0.12)',
          borderRadius: '50%', padding: 20, marginBottom: 20,
        }}>
          <CheckCircle2 size={44} style={{ color: 'var(--green)' }} />
        </div>
        <h2 style={{
          fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 900,
          color: 'var(--text1)', marginBottom: 8, marginTop: 0,
        }}>
          Invoice Paid
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>
          INV-{invoiceNumber} has already been paid in full. Thank you!
        </p>
      </div>
    )
  }

  // ── Payment form ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Cancelled notice */}
      {isCancelled && (
        <div style={{
          display: 'flex', gap: 8, padding: '10px 14px',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 8, fontSize: 13, color: 'var(--amber)',
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          Payment was cancelled. You can try again below.
        </div>
      )}

      {/* Line items */}
      {lineItems.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{
            padding: '10px 16px', borderBottom: '1px solid var(--border)',
            background: 'var(--surface2)',
            fontSize: 11, fontWeight: 700, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Invoice Items
          </div>
          {lineItems.map((li, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', padding: '10px 16px',
              borderBottom: i < lineItems.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: 13, color: 'var(--text1)' }}>{li.name || 'Item'}</span>
              <span style={{
                fontSize: 13, color: 'var(--text1)',
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
              }}>
                {fmt(li.total_price)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
        {amountPaid > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>Invoice Total</span>
              <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text2)' }}>
                {fmt(total)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--green)' }}>Already Paid</span>
              <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: 'var(--green)' }}>
                -{fmt(amountPaid)}
              </span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }} />
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>Amount Due</span>
          <span style={{
            fontSize: 26, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--amber)',
          }}>
            {fmt(balanceDue)}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', gap: 8, padding: '10px 14px',
          background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.25)',
          borderRadius: 8, fontSize: 13, color: 'var(--red)',
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      {/* Pay button */}
      <button
        onClick={handlePayNow}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '15px 24px', borderRadius: 10, border: 'none',
          background: loading ? 'var(--surface2)' : 'var(--accent)',
          color: loading ? 'var(--text3)' : '#fff',
          fontSize: 16, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.02em',
          transition: 'opacity 0.15s',
        }}
      >
        <CreditCard size={17} />
        {loading ? 'Redirecting to Stripe...' : `Pay ${fmt(balanceDue)} Securely`}
        {!loading && <ArrowRight size={15} />}
      </button>

      {/* Trust line */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <Lock size={11} style={{ color: 'var(--text3)' }} />
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
          Secured by Stripe · 256-bit SSL encryption
        </span>
      </div>
    </div>
  )
}
