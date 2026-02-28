'use client'

import { useState } from 'react'
import {
  CheckCircle2, CreditCard, ArrowRight, AlertCircle, Lock,
  Calendar, ChevronRight, Info,
} from 'lucide-react'

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
  wisetackUrl: string | null
  financingStatus: string | null
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

// Monthly payment using amortization formula
// For 0% APR promos — just divide
function calcMonthly(principal: number, months: number, aprPercent: number): number {
  if (aprPercent === 0) return principal / months
  const r = aprPercent / 100 / 12
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

const PLANS = [
  { months: 3,  aprPercent: 0,    label: '3 mo',  tag: '0% APR' },
  { months: 6,  aprPercent: 0,    label: '6 mo',  tag: '0% APR' },
  { months: 12, aprPercent: 9.99, label: '12 mo', tag: null },
  { months: 24, aprPercent: 9.99, label: '24 mo', tag: null },
  { months: 36, aprPercent: 9.99, label: '36 mo', tag: null },
  { months: 60, aprPercent: 9.99, label: '60 mo', tag: null },
]

const FINANCING_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:      { label: 'Link Sent',      color: 'var(--amber)' },
  sent:         { label: 'Link Sent',      color: 'var(--amber)' },
  prequalified: { label: 'Prequalified',   color: 'var(--cyan)' },
  applying:     { label: 'Applying',       color: 'var(--cyan)' },
  approved:     { label: 'Approved',       color: 'var(--green)' },
  declined:     { label: 'Declined',       color: 'var(--red)' },
  loan_accepted:{ label: 'Loan Accepted',  color: 'var(--green)' },
  funded:       { label: 'Funded',         color: 'var(--green)' },
  expired:      { label: 'Expired',        color: 'var(--text3)' },
  cancelled:    { label: 'Cancelled',      color: 'var(--text3)' },
}

const MIN_FINANCING_AMOUNT = 500

export default function PaymentClient({
  invoiceId, invoiceNumber, customerName, customerEmail,
  total, amountPaid, balanceDue, lineItems,
  isSuccess, isPaid, isCancelled,
  wisetackUrl, financingStatus,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null)
  const [showPlans, setShowPlans] = useState(false)

  const canFinance = balanceDue >= MIN_FINANCING_AMOUNT && !isPaid && !isSuccess
  const selectedPlanObj = PLANS.find(p => p.months === selectedPlan)

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

      {/* Financing status badge */}
      {financingStatus && FINANCING_STATUS_LABEL[financingStatus] && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
          background: 'rgba(79,127,255,0.08)', border: '1px solid rgba(79,127,255,0.25)',
          borderRadius: 8, fontSize: 12,
        }}>
          <Calendar size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ color: 'var(--text2)' }}>Financing application:</span>
          <span style={{
            fontWeight: 700,
            color: FINANCING_STATUS_LABEL[financingStatus].color,
          }}>
            {FINANCING_STATUS_LABEL[financingStatus].label}
          </span>
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

      {/* ── FINANCING OPTION ─────────────────────────────────────────────────── */}
      {canFinance && (
        <div style={{
          border: '1px solid rgba(79,127,255,0.3)',
          borderRadius: 12,
          overflow: 'hidden',
          background: 'rgba(79,127,255,0.04)',
        }}>
          {/* Financing header */}
          <button
            onClick={() => setShowPlans(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px', background: 'transparent', border: 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Calendar size={16} style={{ color: 'var(--accent)' }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                  Pay Monthly — from {fmt(calcMonthly(balanceDue, 6, 0))}/mo
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                  0% APR options available · No credit impact to check
                </div>
              </div>
            </div>
            <ChevronRight
              size={16}
              style={{
                color: 'var(--text3)',
                transform: showPlans ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                flexShrink: 0,
              }}
            />
          </button>

          {/* Plan grid */}
          {showPlans && (
            <div style={{
              padding: '0 16px 16px',
              borderTop: '1px solid rgba(79,127,255,0.15)',
            }}>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8, marginTop: 12, marginBottom: 14,
              }}>
                {PLANS.map(plan => {
                  const monthly = calcMonthly(balanceDue, plan.months, plan.aprPercent)
                  const isSelected = selectedPlan === plan.months
                  return (
                    <button
                      key={plan.months}
                      onClick={() => setSelectedPlan(isSelected ? null : plan.months)}
                      style={{
                        padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                        border: isSelected
                          ? '2px solid var(--accent)'
                          : '1px solid var(--border)',
                        background: isSelected ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                        transition: 'all 0.15s', textAlign: 'center',
                      }}
                    >
                      <div style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 16, fontWeight: 900,
                        color: isSelected ? 'var(--accent)' : 'var(--text1)',
                      }}>
                        {fmt(monthly)}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text3)' }}>/mo</span>
                      </div>
                      <div style={{
                        fontSize: 11, color: 'var(--text3)', marginTop: 2, fontWeight: 600,
                      }}>
                        {plan.label}
                      </div>
                      {plan.tag && (
                        <div style={{
                          marginTop: 4, display: 'inline-block',
                          fontSize: 9, fontWeight: 800,
                          background: 'rgba(34,192,122,0.15)',
                          color: 'var(--green)', padding: '1px 6px',
                          borderRadius: 4, textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}>
                          {plan.tag}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Selected plan summary */}
              {selectedPlanObj && (
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(79,127,255,0.08)',
                  border: '1px solid rgba(79,127,255,0.2)',
                  borderRadius: 8, marginBottom: 12,
                  fontSize: 12, color: 'var(--text2)',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Loan amount</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)' }}>
                      {fmt(balanceDue)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Monthly payment</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)', fontWeight: 700 }}>
                      {fmt(calcMonthly(balanceDue, selectedPlanObj.months, selectedPlanObj.aprPercent))}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Term</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)' }}>
                      {selectedPlanObj.months} months
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Est. APR</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)' }}>
                      {selectedPlanObj.aprPercent}%
                    </span>
                  </div>
                  {selectedPlanObj.aprPercent > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Total interest</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text2)' }}>
                        {fmt(
                          calcMonthly(balanceDue, selectedPlanObj.months, selectedPlanObj.aprPercent) *
                          selectedPlanObj.months - balanceDue
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Check My Rate button */}
              <a
                href={wisetackUrl || 'https://wisetack.com'}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8,
                  padding: '13px 20px', borderRadius: 10, border: 'none',
                  background: 'var(--accent)', color: '#fff',
                  fontSize: 15, fontWeight: 800, cursor: 'pointer',
                  fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.02em',
                  textDecoration: 'none', boxSizing: 'border-box',
                }}
              >
                <Calendar size={16} />
                Check My Rate — No Credit Impact
                <ArrowRight size={14} />
              </a>

              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 6,
                marginTop: 8, fontSize: 10, color: 'var(--text3)', lineHeight: 1.4,
              }}>
                <Info size={10} style={{ flexShrink: 0, marginTop: 1 }} />
                Rates shown are estimates. Checking your rate is a soft pull and won&apos;t affect your credit score.
                Actual rates determined by Wisetack upon application.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      {canFinance && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11, color: 'var(--text3)',
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          or pay in full
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
      )}

      {/* Pay in full button */}
      <button
        onClick={handlePayNow}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '15px 24px', borderRadius: 10,
          background: loading ? 'var(--surface2)' : canFinance ? 'var(--surface2)' : 'var(--accent)',
          border: canFinance ? '1px solid var(--border)' : 'none',
          color: loading ? 'var(--text3)' : canFinance ? 'var(--text2)' : '#fff',
          fontSize: 16, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.02em',
          transition: 'all 0.15s',
        } as React.CSSProperties}
      >
        <CreditCard size={17} />
        {loading ? 'Redirecting to Stripe...' : `Pay ${fmt(balanceDue)} Now`}
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
