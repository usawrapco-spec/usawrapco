'use client'

import { useState } from 'react'
import { Calendar, Send, CheckCircle2, ChevronDown, Phone, Mail, X } from 'lucide-react'

type FinancingStatus =
  | 'pending' | 'sent' | 'prequalified' | 'applying' | 'approved'
  | 'declined' | 'loan_accepted' | 'funded' | 'expired' | 'cancelled'
  | null

interface Props {
  invoiceId: string
  invoiceNumber: string | number
  payLinkToken?: string | null
  balance: number
  customerId?: string | null
  projectId?: string | null
  orgId?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  currentFinancingStatus?: FinancingStatus
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:       { label: 'Link Sent',      color: 'var(--amber)',  bg: 'rgba(245,158,11,0.12)' },
  sent:          { label: 'Link Sent',      color: 'var(--amber)',  bg: 'rgba(245,158,11,0.12)' },
  prequalified:  { label: 'Prequalified',   color: 'var(--cyan)',   bg: 'rgba(34,211,238,0.12)' },
  applying:      { label: 'Applying',       color: 'var(--cyan)',   bg: 'rgba(34,211,238,0.12)' },
  approved:      { label: 'Approved',       color: 'var(--green)',  bg: 'rgba(34,192,122,0.12)' },
  declined:      { label: 'Declined',       color: 'var(--red)',    bg: 'rgba(242,90,90,0.12)'  },
  loan_accepted: { label: 'Loan Accepted',  color: 'var(--green)',  bg: 'rgba(34,192,122,0.12)' },
  funded:        { label: 'Funded',         color: 'var(--green)',  bg: 'rgba(34,192,122,0.12)' },
  expired:       { label: 'Expired',        color: 'var(--text3)',  bg: 'rgba(90,96,128,0.12)'  },
  cancelled:     { label: 'Cancelled',      color: 'var(--text3)',  bg: 'rgba(90,96,128,0.12)'  },
}

const MIN_AMOUNT = 500

export default function SendFinancingButton({
  invoiceId, invoiceNumber, payLinkToken,
  balance, customerPhone, customerEmail,
  currentFinancingStatus,
}: Props) {
  const [showModal, setShowModal] = useState(false)
  const [phone, setPhone] = useState(customerPhone || '')
  const [email, setEmail] = useState(customerEmail || '')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [status, setStatus] = useState<FinancingStatus>(currentFinancingStatus ?? null)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'
  const token = payLinkToken || invoiceId
  const payUrl = `${appUrl}/pay/${token}`
  const monthlyEst = (balance / 6).toFixed(2)

  const canFinance = balance >= MIN_AMOUNT

  async function handleSend() {
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/financing/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoiceId,
          customer_phone: phone || null,
          customer_email: email || null,
        }),
      })
      const data = await res.json()
      if (data.success || data.financing_application_id) {
        setResult({ success: true, message: data.message || 'Financing link sent' })
        setStatus('sent')
      } else {
        setResult({ success: false, message: data.error || 'Failed to send' })
      }
    } catch (e: any) {
      setResult({ success: false, message: e.message || 'Network error' })
    } finally {
      setSending(false)
    }
  }

  if (!canFinance) return null

  const sc = status ? STATUS_CONFIG[status] : null

  return (
    <>
      {/* Status badge + button */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sc && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', borderRadius: 6,
            background: sc.bg, border: `1px solid ${sc.color}22`,
            fontSize: 11, fontWeight: 700, color: sc.color,
          }}>
            <Calendar size={10} />
            Financing: {sc.label}
          </div>
        )}

        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 8,
            border: '1px solid rgba(79,127,255,0.4)',
            background: 'rgba(79,127,255,0.08)',
            color: 'var(--accent)', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', width: '100%', justifyContent: 'flex-start',
          }}
        >
          <Calendar size={14} />
          {status && status !== 'expired' && status !== 'cancelled' && status !== 'declined'
            ? 'Resend Financing Link'
            : 'Send Financing Link'}
          <span style={{
            marginLeft: 'auto', fontSize: 11, color: 'var(--text3)',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            from ${monthlyEst}/mo
          </span>
          <ChevronDown size={12} style={{ color: 'var(--text3)', flexShrink: 0 }} />
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 9999, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 28, width: '100%', maxWidth: 460,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{
                  fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20,
                  fontWeight: 900, color: 'var(--text1)', marginBottom: 2,
                }}>
                  Send Financing Link
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  INV-{invoiceNumber} · ${balance.toFixed(2)} balance
                </div>
              </div>
              <button
                onClick={() => { setShowModal(false); setResult(null) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text3)', padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Pay URL preview */}
            <div style={{
              padding: '10px 14px', background: 'var(--surface2)',
              border: '1px solid var(--border)', borderRadius: 8,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                Customer Pay Link
              </div>
              <div style={{
                fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--accent)', wordBreak: 'break-all',
              }}>
                {payUrl}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                Balance {`$${balance.toFixed(2)}`} · Finance from ${monthlyEst}/mo (6-month 0% APR est.)
              </div>
            </div>

            {/* Contact fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  color: 'var(--text3)', marginBottom: 6,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  <Phone size={10} style={{ display: 'inline', marginRight: 4 }} />
                  Customer Phone (SMS)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="field"
                />
              </div>
              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  color: 'var(--text3)', marginBottom: 6,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  <Mail size={10} style={{ display: 'inline', marginRight: 4 }} />
                  Customer Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="field"
                />
              </div>
            </div>

            {/* Result */}
            {result && (
              <div style={{
                display: 'flex', gap: 8, padding: '10px 14px',
                background: result.success ? 'rgba(34,192,122,0.08)' : 'rgba(242,90,90,0.08)',
                border: `1px solid ${result.success ? 'rgba(34,192,122,0.25)' : 'rgba(242,90,90,0.25)'}`,
                borderRadius: 8, fontSize: 13,
                color: result.success ? 'var(--green)' : 'var(--red)',
                marginBottom: 12,
              }}>
                {result.success ? <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} /> : null}
                {result.message}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowModal(false); setResult(null) }}
                style={{
                  padding: '8px 16px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text2)', fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || (!phone && !email)}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: sending || (!phone && !email) ? 'var(--surface2)' : 'var(--accent)',
                  color: sending || (!phone && !email) ? 'var(--text3)' : '#fff',
                  fontSize: 13, fontWeight: 700, cursor: sending || (!phone && !email) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Send size={13} />
                {sending ? 'Sending...' : 'Send Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
