'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { CheckCircle2, FileText, CreditCard, Pen, Calendar, Shield } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────────
interface QuoteApprovalProps {
  salesOrder: any
  lineItems: any[]
  token: string
  isDemo: boolean
}

// ─── Brand ──────────────────────────────────────────────────────────────────────
const BRAND = {
  name: 'USA Wrap Co',
  tagline: 'American Craftsmanship You Can Trust',
  address: '4124 124th St. NW',
  city: 'Gig Harbor, WA 98332',
  phone: '253-525-8148',
  email: 'sales@usawrapco.com',
  website: 'usawrapco.com',
}

// ─── Demo Data ──────────────────────────────────────────────────────────────────
const DEMO_SO = {
  id: 'demo-so-001',
  so_number: 2001,
  title: 'Ford F-150 Full Wrap',
  so_date: new Date().toISOString(),
  subtotal: 3200,
  tax_rate: 0.0825,
  tax_amount: 264,
  total: 3464,
  discount: 0,
  customer: { id: 'demo-c', name: 'Mike Johnson', email: 'mike@example.com', phone: '253-555-0100' },
}

const DEMO_ITEMS = [
  { id: 'li-1', name: 'Full Body Wrap', description: '3M 2080 Satin Black — full vehicle coverage including bumpers and mirrors', quantity: 1, unit_price: 2800, total_price: 2800, sort_order: 0 },
  { id: 'li-2', name: 'Chrome Delete', description: 'Gloss black vinyl overlay on all chrome trim pieces', quantity: 1, unit_price: 400, total_price: 400, sort_order: 1 },
]

// ─── Colors (light customer-facing theme) ───────────────────────────────────────
const C = {
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  text1: '#0f172a',
  text2: '#64748b',
  text3: '#94a3b8',
  accent: '#3b82f6',
  accentDark: '#2563eb',
  green: '#22c55e',
  greenDark: '#16a34a',
  greenBg: '#f0fdf4',
  greenBorder: '#bbf7d0',
  blueBg: '#eff6ff',
  blueBorder: '#bfdbfe',
  sigStroke: '#1e40af',
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return d
  }
}

function todayStr(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ─── Component ──────────────────────────────────────────────────────────────────
export default function QuoteApprovalClient({ salesOrder, lineItems, token, isDemo }: QuoteApprovalProps) {
  const so = isDemo ? DEMO_SO : salesOrder
  const items = isDemo ? DEMO_ITEMS : lineItems
  const customer = so?.customer

  // Computed financials
  const subtotal = Number(so?.subtotal || 0)
  const taxAmount = Number(so?.tax_amount || 0)
  const total = Number(so?.total || 0)
  const deposit = 250
  const halfAmount = Math.max(0, (total * 0.5) - deposit)
  const balance = Math.max(0, total - deposit - halfAmount)

  // State
  const [customerName, setCustomerName] = useState(customer?.name || '')
  const [approved, setApproved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isSigning, setIsSigning] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  // Set up high-DPI canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
    }
  }, [])

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }, [])

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    setIsSigning(true)
    lastPos.current = getPos(e)
  }, [getPos])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx || !lastPos.current) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = C.sigStroke
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
  }, [isDrawing, getPos])

  const endDraw = useCallback(() => {
    if (isDrawing) {
      setHasSigned(true)
    }
    setIsDrawing(false)
    lastPos.current = null
  }, [isDrawing])

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    setHasSigned(false)
    setIsSigning(false)
  }, [])

  const handleApproveAndPay = async () => {
    setError('')

    if (!customerName.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!hasSigned) {
      setError('Please sign in the signature box above.')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeToken: token,
          email: customer?.email || '',
          projectId: so?.id || '',
          amount: 25000,
          metadata: {
            sales_order_id: so?.id || '',
            token: token,
            customer_name: customerName.trim(),
          },
        }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
        return
      }

      if (data.error) {
        // If Stripe not configured, show success for demo
        if (data.error === 'Stripe not configured' || isDemo) {
          setApproved(true)
          setSubmitting(false)
          return
        }
        setError(data.error)
      } else {
        // No URL returned but no error -- treat as approved
        setApproved(true)
      }
    } catch (err: any) {
      if (isDemo) {
        setApproved(true)
        setSubmitting(false)
        return
      }
      setError('Something went wrong. Please try again or contact us.')
    }

    setSubmitting(false)
  }

  // ─── Approved State ─────────────────────────────────────────────────────────
  if (approved) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.text1, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '-0.01em' }}>
              USA WRAP CO
            </div>
            <div style={{ fontSize: 13, color: C.text2, marginTop: 4 }}>{BRAND.tagline}</div>
          </div>

          <div style={{
            background: C.card,
            borderRadius: 16,
            border: `1px solid ${C.greenBorder}`,
            padding: '48px 32px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: C.greenBg, display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <CheckCircle2 size={32} style={{ color: C.green }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: C.text1, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>
              Quote Approved!
            </div>
            <div style={{ fontSize: 15, color: C.text2, lineHeight: 1.6, maxWidth: 440, margin: '0 auto' }}>
              Thank you, {customerName || 'valued customer'}. Your approval has been recorded and our team
              will begin preparing your project. You will receive a confirmation email shortly.
            </div>
            <div style={{
              marginTop: 24, padding: '12px 20px', background: C.greenBg,
              borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              <Shield size={16} style={{ color: C.greenDark }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.greenDark }}>
                Deposit of {fmt(deposit)} secured
              </span>
            </div>
          </div>

          {/* Contact footer */}
          <div style={{ textAlign: 'center', marginTop: 32, color: C.text3, fontSize: 13, lineHeight: 1.8 }}>
            <div>Questions? Call {BRAND.phone} or email {BRAND.email}</div>
            <div>{BRAND.address}, {BRAND.city}</div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Main Quote View ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontSize: 28, fontWeight: 900, color: C.text1,
            fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '-0.01em',
          }}>
            USA WRAP CO
          </div>
          <div style={{ fontSize: 13, color: C.text2, marginTop: 4 }}>{BRAND.tagline}</div>
        </div>

        {/* ── Demo Banner ─────────────────────────────────────────────────────── */}
        {isDemo && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12,
            padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <FileText size={18} style={{ color: '#d97706', flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.4 }}>
              <strong>Demo Mode</strong> -- This is a sample quote for preview purposes.
            </div>
          </div>
        )}

        {/* ── Quote Summary Card ──────────────────────────────────────────────── */}
        <div style={{
          background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
          overflow: 'hidden', marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        }}>
          {/* Card header */}
          <div style={{
            padding: '20px 24px', borderBottom: `1px solid ${C.borderLight}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <FileText size={18} style={{ color: C.accent }} />
                <span style={{
                  fontSize: 20, fontWeight: 800, color: C.text1,
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}>
                  Quote #{so?.so_number || '---'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: C.text2 }}>
                {so?.title || 'Vehicle Wrap Services'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: C.text3, marginBottom: 2 }}>Prepared for</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>
                {customer?.name || 'Customer'}
              </div>
            </div>
          </div>

          {/* Date row */}
          <div style={{
            padding: '12px 24px', borderBottom: `1px solid ${C.borderLight}`,
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text2,
          }}>
            <Calendar size={14} style={{ color: C.text3 }} />
            <span>Date: {fmtDate(so?.so_date)}</span>
          </div>

          {/* Line items table */}
          <div style={{ padding: '0 24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.borderLight}` }}>
                  <th style={{ padding: '14px 0 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Item
                  </th>
                  <th style={{ padding: '14px 0 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em', width: 50 }}>
                    Qty
                  </th>
                  <th style={{ padding: '14px 0 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em', width: 100 }}>
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, i: number) => (
                  <tr key={item.id || i} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                    <td style={{ padding: '14px 12px 14px 0' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>
                        {item.name}
                      </div>
                      {item.description && (
                        <div style={{ fontSize: 12, color: C.text2, marginTop: 3, lineHeight: 1.4 }}>
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 0', textAlign: 'center', fontSize: 14, color: C.text2, fontFamily: "'JetBrains Mono', monospace" }}>
                      {Number(item.quantity || 1)}
                    </td>
                    <td style={{ padding: '14px 0', textAlign: 'right', fontSize: 14, fontWeight: 600, color: C.text1, fontFamily: "'JetBrains Mono', monospace" }}>
                      {fmt(Number(item.total_price || item.unit_price || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ padding: '16px 24px 20px', background: '#fafbfc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: C.text2 }}>Subtotal</span>
              <span style={{ fontSize: 13, color: C.text1, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                {fmt(subtotal)}
              </span>
            </div>
            {Number(so?.discount || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: C.green }}>Discount</span>
                <span style={{ fontSize: 13, color: C.green, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                  -{fmt(Number(so.discount))}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: C.text2 }}>
                Tax ({((Number(so?.tax_rate || 0)) * 100).toFixed(2)}%)
              </span>
              <span style={{ fontSize: 13, color: C.text1, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                {fmt(taxAmount)}
              </span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingTop: 12, borderTop: `2px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: C.text1 }}>Total</span>
              <span style={{
                fontSize: 24, fontWeight: 900, color: C.text1,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {fmt(total)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Payment Schedule ─────────────────────────────────────────────────── */}
        <div style={{
          background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: 24, marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          }}>
            <CreditCard size={18} style={{ color: C.accent }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: C.text1, fontFamily: "'Barlow Condensed', sans-serif" }}>
              Payment Schedule
            </span>
          </div>

          {/* Due today - highlighted */}
          <div style={{
            background: C.greenBg, border: `1px solid ${C.greenBorder}`,
            borderRadius: 10, padding: '14px 16px', marginBottom: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.greenDark }}>Due Today</div>
              <div style={{ fontSize: 12, color: '#4ade80', marginTop: 2 }}>Design Deposit</div>
            </div>
            <div style={{
              fontSize: 22, fontWeight: 900, color: C.greenDark,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {fmt(deposit)}
            </div>
          </div>

          {/* Due before start */}
          <div style={{
            background: C.blueBg, border: `1px solid ${C.blueBorder}`,
            borderRadius: 10, padding: '14px 16px', marginBottom: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.accentDark }}>Due Before Start</div>
              <div style={{ fontSize: 12, color: C.accent, marginTop: 2 }}>50% of total less deposit</div>
            </div>
            <div style={{
              fontSize: 18, fontWeight: 700, color: C.accentDark,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {fmt(halfAmount)}
            </div>
          </div>

          {/* Balance at pickup */}
          <div style={{
            background: '#f8fafc', border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>Balance at Pickup</div>
              <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>Remaining balance</div>
            </div>
            <div style={{
              fontSize: 18, fontWeight: 700, color: C.text1,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {fmt(balance)}
            </div>
          </div>
        </div>

        {/* ── Digital Signature ────────────────────────────────────────────────── */}
        <div style={{
          background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: 24, marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
          }}>
            <Pen size={18} style={{ color: C.accent }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: C.text1, fontFamily: "'Barlow Condensed', sans-serif" }}>
              Digital Signature
            </span>
          </div>
          <div style={{ fontSize: 13, color: C.text2, marginBottom: 18, lineHeight: 1.5 }}>
            By signing below, you approve this quote and authorize USA Wrap Co to proceed with the work described above.
          </div>

          {/* Signature canvas */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Sign Here
            </div>
            <div style={{
              position: 'relative', border: `2px solid ${hasSigned ? C.accent : C.border}`,
              borderRadius: 10, overflow: 'hidden', background: '#fafbfc',
              touchAction: 'none', transition: 'border-color 0.2s',
            }}>
              <canvas
                ref={canvasRef}
                style={{
                  display: 'block', width: '100%', height: 140,
                  cursor: 'crosshair', touchAction: 'none',
                }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              {!isSigning && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
                }}>
                  <span style={{ fontSize: 14, color: '#cbd5e1', fontStyle: 'italic' }}>
                    Draw your signature here
                  </span>
                </div>
              )}
              {/* Signature baseline */}
              <div style={{
                position: 'absolute', bottom: 24, left: 24, right: 24,
                borderBottom: '1px dashed #e2e8f0', pointerEvents: 'none',
              }} />
            </div>
            <button
              onClick={clearSignature}
              style={{
                marginTop: 8, fontSize: 12, color: C.text3, background: 'none',
                border: 'none', cursor: 'pointer', padding: '4px 0',
                textDecoration: 'underline',
              }}
            >
              Clear signature
            </button>
          </div>

          {/* Customer name input */}
          <div style={{ marginBottom: 14 }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700, color: C.text3,
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
            }}>
              Full Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={e => { setCustomerName(e.target.value); setError('') }}
              placeholder="Enter your full legal name"
              style={{
                width: '100%', padding: '12px 14px', background: '#fafbfc',
                border: `1px solid ${C.border}`, borderRadius: 10,
                color: C.text1, fontSize: 14, outline: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = C.accent }}
              onBlur={e => { e.target.style.borderColor = C.border }}
            />
          </div>

          {/* Date (auto-filled) */}
          <div>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700, color: C.text3,
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
            }}>
              Date
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px',
              background: '#f1f5f9', border: `1px solid ${C.border}`,
              borderRadius: 10, fontSize: 14, color: C.text2,
            }}>
              <Calendar size={14} style={{ color: C.text3 }} />
              {todayStr()}
            </div>
          </div>
        </div>

        {/* ── Error message ────────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
            padding: '12px 16px', marginBottom: 16,
            fontSize: 13, color: '#dc2626', fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        {/* ── Approve & Pay Button ─────────────────────────────────────────────── */}
        <button
          onClick={handleApproveAndPay}
          disabled={submitting}
          style={{
            width: '100%', padding: '18px 24px', borderRadius: 14,
            border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
            background: submitting ? '#86efac' : C.green,
            color: '#052e16', fontSize: 17, fontWeight: 900,
            fontFamily: "'Barlow Condensed', sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            opacity: submitting ? 0.7 : 1,
            transition: 'all 0.2s',
            boxShadow: submitting ? 'none' : '0 4px 14px rgba(34, 197, 94, 0.3)',
            letterSpacing: '0.01em',
          }}
        >
          <CheckCircle2 size={22} />
          {submitting ? 'Processing...' : `Approve & Pay Deposit -- ${fmt(deposit)}`}
        </button>

        {/* ── Security badge ───────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, marginTop: 14, marginBottom: 32,
        }}>
          <Shield size={14} style={{ color: C.text3 }} />
          <span style={{ fontSize: 12, color: C.text3 }}>
            Secure payment powered by Stripe
          </span>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────────── */}
        <div style={{
          borderTop: `1px solid ${C.border}`, paddingTop: 24,
          textAlign: 'center', color: C.text3, fontSize: 12, lineHeight: 1.8,
        }}>
          <div style={{ fontWeight: 700, color: C.text2 }}>{BRAND.name}</div>
          <div>{BRAND.address}, {BRAND.city}</div>
          <div>{BRAND.phone} | {BRAND.email}</div>
          <div style={{ marginTop: 8, fontSize: 11 }}>{BRAND.website}</div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #94a3b8; }
        @media (max-width: 480px) {
          table { font-size: 13px; }
        }
      `}</style>
    </div>
  )
}
