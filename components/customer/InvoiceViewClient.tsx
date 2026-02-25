'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Truck,
  FileText,
  Download,
  Phone,
  CheckCircle,
  ChevronRight,
  ArrowLeft,
  Eraser,
  PenTool,
  Shield,
  Clock,
  CreditCard,
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  DollarSign,
  Receipt,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────────
interface InvoiceViewClientProps {
  token: string
}

interface InvoiceLineItem {
  item: string
  description: string
  qty: number
  price: number
}

interface InvoiceData {
  number: string
  invoiceDate: string
  dueDate: string
  paymentTerms: string
  status: 'sent' | 'paid' | 'overdue'
  requiresSignature: boolean
  customerName: string
  customerEmail: string
  customerPhone: string
  customerCompany: string
  lineItems: InvoiceLineItem[]
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  amountPaid: number
  balanceDue: number
}

const EMPTY_INVOICE: InvoiceData = {
  number: '', invoiceDate: new Date().toISOString(), dueDate: '', paymentTerms: 'Net 30',
  status: 'sent', requiresSignature: true,
  customerName: '', customerEmail: '', customerPhone: '', customerCompany: '',
  lineItems: [], subtotal: 0, taxRate: 0.0825, taxAmount: 0, total: 0, amountPaid: 0, balanceDue: 0,
}

type Step = 'invoice' | 'signature' | 'payment'

// ─── Colors / Styles ────────────────────────────────────────────────────────────
const C = {
  bg: '#0d0f14',
  surface: '#161920',
  surface2: '#1e2330',
  border: '#2a2f3d',
  accent: '#4f7fff',
  green: '#22c07a',
  red: '#f25a5a',
  amber: '#f59e0b',
  cyan: '#22d3ee',
  text1: '#ffffff',
  text2: '#8b95a5',
  text3: '#5a6080',
}

// ─── Component ──────────────────────────────────────────────────────────────────
export default function InvoiceViewClient({ token }: InvoiceViewClientProps) {
  const [inv, setInv] = useState<InvoiceData>(EMPTY_INVOICE)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [step, setStep] = useState<Step>('invoice')
  const [animDir, setAnimDir] = useState<'next' | 'back'>('next')
  const [animating, setAnimating] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [isPaid, setIsPaid] = useState(false)

  // Signature state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [signedAlready, setSignedAlready] = useState(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  // ─── Fetch invoice by token ──────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    fetch(`/api/invoices/view/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setFetchError(data.error)
        } else {
          setInv(data)
          setSignerName(data.customerName)
          setIsPaid(data.status === 'paid')
        }
      })
      .catch(() => setFetchError('Failed to load invoice'))
      .finally(() => setLoading(false))
  }, [token])

  // ─── Step navigation ────────────────────────────────────────────────────────
  const goTo = useCallback((next: Step, dir: 'next' | 'back') => {
    if (animating) return
    setAnimDir(dir)
    setAnimating(true)
    setTimeout(() => {
      setStep(next)
      setAnimating(false)
    }, 250)
  }, [animating])

  // ─── Canvas signature pad ──────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'signature') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1a1d27'
    ctx.lineWidth = 2.5
  }, [step])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    const pos = getPos(e)
    lastPoint.current = pos
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !lastPoint.current) return
    const pos = getPos(e)

    const midX = (lastPoint.current.x + pos.x) / 2
    const midY = (lastPoint.current.y + pos.y) / 2
    ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, midX, midY)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(midX, midY)

    const dist = Math.sqrt(
      Math.pow(pos.x - lastPoint.current.x, 2) +
      Math.pow(pos.y - lastPoint.current.y, 2)
    )
    const speed = Math.min(dist / 2, 8)
    ctx.lineWidth = Math.max(1.5, 3.5 - speed * 0.2)

    lastPoint.current = pos
    if (!hasSigned) setHasSigned(true)
  }

  const endDraw = () => {
    setIsDrawing(false)
    lastPoint.current = null
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
  }

  const handleSignAndContinue = async () => {
    if (!hasSigned || !signerName.trim()) return
    const canvas = canvasRef.current
    const sigData = canvas ? canvas.toDataURL('image/png') : null

    try {
      await fetch('/api/invoices/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signerName: signerName.trim(),
          signatureData: sigData,
        }),
      })
    } catch {}

    setSignedAlready(true)
    goTo('payment', 'next')
  }

  // ─── Payment handler ──────────────────────────────────────────────────────
  const handlePayNow = async () => {
    setPaymentLoading(true)
    try {
      const res = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeToken: token,
          email: inv.customerEmail,
          amount: inv.balanceDue,
          invoiceNumber: inv.number,
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Payment error:', err)
    }
    setPaymentLoading(false)
  }

  // ─── Format helpers ───────────────────────────────────────────────────────
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  // ─── Status badge ─────────────────────────────────────────────────────────
  const statusColor = isPaid ? C.green : inv.status === 'overdue' ? C.red : C.amber
  const statusLabel = isPaid ? 'Paid in Full' : inv.status === 'overdue' ? 'Overdue' : 'Payment Due'
  const StatusIcon = isPaid ? CheckCircle : inv.status === 'overdue' ? AlertCircle : Clock

  // ─── Slide animation ──────────────────────────────────────────────────────
  const slideStyle: React.CSSProperties = {
    opacity: animating ? 0 : 1,
    transform: animating
      ? `translateX(${animDir === 'next' ? '40px' : '-40px'})`
      : 'translateX(0)',
    transition: 'all 0.25s ease',
  }

  // ─── Step: Invoice View ───────────────────────────────────────────────────
  const renderInvoice = () => (
    <div style={slideStyle}>
      {/* Paid banner */}
      {isPaid && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '14px 20px',
          background: `${C.green}12`,
          border: `1px solid ${C.green}30`,
          borderRadius: 12,
          marginBottom: 24,
        }}>
          <CheckCircle size={18} style={{ color: C.green }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: C.green, fontFamily: "'Barlow Condensed', sans-serif" }}>
            Paid in Full
          </span>
        </div>
      )}

      {/* Invoice title */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 16px',
          background: `${statusColor}12`,
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          color: statusColor,
          letterSpacing: '0.04em',
          marginBottom: 12,
        }}>
          <StatusIcon size={13} />
          {statusLabel}
        </div>
        <h1 style={{
          fontSize: 28,
          fontWeight: 900,
          color: C.text1,
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '-0.01em',
          margin: '0 0 6px',
        }}>
          {inv.number}
        </h1>
        <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>
          {inv.customerCompany}
        </p>
      </div>

      {/* Invoice meta */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 10,
        marginBottom: 20,
      }}>
        {[
          { label: 'Invoice Date', value: fmtDate(inv.invoiceDate), icon: CalendarDays },
          { label: 'Due Date', value: fmtDate(inv.dueDate), icon: Clock },
          { label: 'Terms', value: inv.paymentTerms, icon: Receipt },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: '14px 12px',
            textAlign: 'center',
          }}>
            <Icon size={14} style={{ color: C.accent, margin: '0 auto 6px', display: 'block' }} />
            <div style={{ fontSize: 10, fontWeight: 800, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Customer info */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 20,
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Bill To
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, marginBottom: 4 }}>
          {inv.customerName}
        </div>
        <div style={{ fontSize: 13, color: C.text2 }}>{inv.customerCompany}</div>
        <div style={{ fontSize: 13, color: C.text2 }}>{inv.customerEmail}</div>
        <div style={{ fontSize: 13, color: C.text2 }}>{inv.customerPhone}</div>
      </div>

      {/* Line items */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 20,
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto auto',
          gap: 12,
          padding: '14px 20px',
          background: C.surface2,
          fontSize: 11,
          fontWeight: 800,
          color: C.text3,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          <div>Item</div>
          <div style={{ textAlign: 'center' }}>Qty</div>
          <div style={{ textAlign: 'right' }}>Price</div>
          <div style={{ textAlign: 'right' }}>Total</div>
        </div>

        {/* Rows */}
        {inv.lineItems.map((li, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto auto',
              gap: 12,
              padding: '16px 20px',
              borderTop: `1px solid ${C.border}`,
              alignItems: 'start',
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text1, marginBottom: 3 }}>
                {li.item}
              </div>
              <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>
                {li.description}
              </div>
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: C.text1,
              textAlign: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              minWidth: 32,
              paddingTop: 2,
            }}>
              {li.qty}
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: C.text2,
              textAlign: 'right',
              fontFamily: "'JetBrains Mono', monospace",
              minWidth: 80,
              paddingTop: 2,
            }}>
              {fmt(li.price)}
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.text1,
              textAlign: 'right',
              fontFamily: "'JetBrains Mono', monospace",
              minWidth: 80,
              paddingTop: 2,
            }}>
              {fmt(li.price * li.qty)}
            </div>
          </div>
        ))}

        {/* Totals */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: C.text2 }}>Subtotal</span>
            <span style={{ fontSize: 14, color: C.text1, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
              {fmt(inv.subtotal)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: C.text2 }}>Tax ({(inv.taxRate * 100).toFixed(2)}%)</span>
            <span style={{ fontSize: 14, color: C.text1, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
              {fmt(inv.taxAmount)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.text1, fontFamily: "'JetBrains Mono', monospace" }}>
              {fmt(inv.total)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: C.green }}>Amount Paid</span>
            <span style={{ fontSize: 14, color: C.green, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
              -{fmt(inv.amountPaid)}
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: 12,
            borderTop: `2px solid ${C.border}`,
          }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: inv.balanceDue > 0 ? C.amber : C.green }}>
              Balance Due
            </span>
            <span style={{
              fontSize: 26,
              fontWeight: 900,
              color: inv.balanceDue > 0 ? C.amber : C.green,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {fmt(inv.balanceDue)}
            </span>
          </div>
        </div>
      </div>

      {/* Download PDF */}
      <button
        onClick={() => window.print()}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          background: 'transparent',
          color: C.text2,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <Download size={16} />
        Download PDF
      </button>

      {/* Actions (only if balance due) */}
      {!isPaid && inv.balanceDue > 0 && (
        <>
          {inv.requiresSignature && !signedAlready ? (
            <button
              onClick={() => goTo('signature', 'next')}
              style={{
                width: '100%',
                padding: '18px',
                borderRadius: 12,
                border: 'none',
                background: C.accent,
                color: '#fff',
                fontSize: 17,
                fontWeight: 900,
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: '0.02em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginBottom: 20,
              }}
            >
              <PenTool size={18} />
              Sign & Pay
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handlePayNow}
              disabled={paymentLoading}
              style={{
                width: '100%',
                padding: '18px',
                borderRadius: 12,
                border: 'none',
                background: C.green,
                color: '#fff',
                fontSize: 17,
                fontWeight: 900,
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: '0.02em',
                cursor: paymentLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginBottom: 20,
                opacity: paymentLoading ? 0.6 : 1,
              }}
            >
              <CreditCard size={18} />
              {paymentLoading ? 'Redirecting to payment...' : `Pay Now -- ${fmt(inv.balanceDue)}`}
            </button>
          )}
        </>
      )}

      {/* Contact */}
      <div style={{ textAlign: 'center' }}>
        <a
          href="tel:+15551234567"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: C.accent,
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Phone size={14} />
          Questions? Call (555) 123-4567
        </a>
      </div>
    </div>
  )

  // ─── Step: Signature ──────────────────────────────────────────────────────
  const renderSignature = () => (
    <div style={slideStyle}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${C.accent}12`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <PenTool size={24} style={{ color: C.accent }} />
        </div>
        <h2 style={{
          fontSize: 24,
          fontWeight: 900,
          color: C.text1,
          fontFamily: "'Barlow Condensed', sans-serif",
          margin: '0 0 6px',
        }}>
          Sign to Authorize Payment
        </h2>
        <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>
          Your signature confirms the invoice total of {fmt(inv.total)}
        </p>
      </div>

      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 20,
        marginBottom: 20,
      }}>
        {/* Invoice summary */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: C.surface2,
          borderRadius: 10,
          marginBottom: 20,
        }}>
          <div>
            <div style={{ fontSize: 12, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {inv.number}
            </div>
            <div style={{ fontSize: 13, color: C.text2, marginTop: 2 }}>Balance Due</div>
          </div>
          <div style={{
            fontSize: 22,
            fontWeight: 900,
            color: C.amber,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {fmt(inv.balanceDue)}
          </div>
        </div>

        {/* Signature pad */}
        <div style={{ marginBottom: 18 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}>
            <label style={{
              fontSize: 11,
              fontWeight: 800,
              color: C.text3,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              Your Signature
            </label>
            <button
              onClick={clearSignature}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: 'transparent',
                color: C.text3,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Eraser size={12} />
              Clear
            </button>
          </div>
          <div style={{
            borderRadius: 12,
            overflow: 'hidden',
            border: `2px solid ${hasSigned ? C.green + '40' : C.border}`,
            transition: 'border-color 0.2s',
          }}>
            <canvas
              ref={canvasRef}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
              style={{
                width: '100%',
                height: 140,
                background: '#ffffff',
                cursor: 'crosshair',
                touchAction: 'none',
                display: 'block',
              }}
            />
          </div>
          {!hasSigned && (
            <div style={{
              textAlign: 'center',
              fontSize: 12,
              color: C.text3,
              marginTop: 8,
              fontStyle: 'italic',
            }}>
              Draw your signature above using your mouse or finger
            </div>
          )}
        </div>

        {/* Name */}
        <div style={{ marginBottom: 18 }}>
          <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 800,
            color: C.text3,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8,
          }}>
            Full Name
          </label>
          <input
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            placeholder="Type your full legal name"
            style={{
              width: '100%',
              padding: '14px 16px',
              background: C.surface2,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              color: C.text1,
              fontSize: 15,
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Date */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 800,
            color: C.text3,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8,
          }}>
            Date
          </label>
          <div style={{
            padding: '14px 16px',
            background: C.surface2,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            color: C.text2,
            fontSize: 14,
          }}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>

        {/* Legal text */}
        <div style={{
          padding: '14px 16px',
          background: `${C.accent}08`,
          border: `1px solid ${C.accent}20`,
          borderRadius: 10,
          fontSize: 12,
          color: C.text2,
          lineHeight: 1.6,
        }}>
          <Shield size={13} style={{ color: C.accent, display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          By signing, you authorize payment of {fmt(inv.balanceDue)} for invoice {inv.number} and acknowledge the services rendered by USA Wrap Co.
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => goTo('invoice', 'back')}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            background: 'transparent',
            color: C.text2,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          onClick={handleSignAndContinue}
          disabled={!hasSigned || !signerName.trim()}
          style={{
            flex: 2,
            padding: '16px',
            borderRadius: 10,
            border: 'none',
            background: hasSigned && signerName.trim() ? C.green : C.surface2,
            color: hasSigned && signerName.trim() ? '#fff' : C.text3,
            fontSize: 16,
            fontWeight: 900,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '0.02em',
            cursor: hasSigned && signerName.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s',
          }}
        >
          <PenTool size={16} />
          Sign & Proceed to Pay
        </button>
      </div>
    </div>
  )

  // ─── Step: Payment ────────────────────────────────────────────────────────
  const renderPayment = () => (
    <div style={slideStyle}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${C.green}12`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <CreditCard size={24} style={{ color: C.green }} />
        </div>
        <h2 style={{
          fontSize: 24,
          fontWeight: 900,
          color: C.text1,
          fontFamily: "'Barlow Condensed', sans-serif",
          margin: '0 0 6px',
        }}>
          Complete Your Payment
        </h2>
        <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>
          Contract signed successfully. Proceed to secure payment.
        </p>
      </div>

      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 28,
        textAlign: 'center',
        marginBottom: 20,
      }}>
        {/* Signed confirmation */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          background: `${C.green}12`,
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 700,
          color: C.green,
          marginBottom: 24,
        }}>
          <CheckCircle size={14} />
          Contract Signed by {signerName}
        </div>

        {/* Amount */}
        <div style={{
          fontSize: 48,
          fontWeight: 900,
          color: C.text1,
          fontFamily: "'JetBrains Mono', monospace",
          marginBottom: 4,
        }}>
          {fmt(inv.balanceDue)}
        </div>
        <div style={{ fontSize: 14, color: C.text2, marginBottom: 28 }}>
          Balance due on {inv.number}
        </div>

        {/* Payment details */}
        <div style={{
          background: C.surface2,
          borderRadius: 12,
          padding: 16,
          textAlign: 'left',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.text3, textTransform: 'uppercase', marginBottom: 12 }}>
            Payment Summary
          </div>
          {[
            { label: 'Invoice Total', value: fmt(inv.total) },
            { label: 'Previously Paid', value: `-${fmt(inv.amountPaid)}` },
            { label: 'Balance Due', value: fmt(inv.balanceDue), highlight: true },
          ].map((row, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: i < 2 ? 8 : 0,
              paddingTop: row.highlight ? 8 : 0,
              borderTop: row.highlight ? `1px solid ${C.border}` : 'none',
            }}>
              <span style={{ fontSize: 13, color: row.highlight ? C.text1 : C.text2, fontWeight: row.highlight ? 700 : 400 }}>
                {row.label}
              </span>
              <span style={{
                fontSize: row.highlight ? 16 : 14,
                fontWeight: row.highlight ? 800 : 600,
                color: row.highlight ? C.green : C.text1,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Pay button */}
        <button
          onClick={handlePayNow}
          disabled={paymentLoading}
          style={{
            width: '100%',
            padding: '18px 32px',
            borderRadius: 12,
            border: 'none',
            background: C.green,
            color: '#fff',
            fontSize: 17,
            fontWeight: 900,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '0.02em',
            cursor: paymentLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: paymentLoading ? 0.6 : 1,
          }}
        >
          <DollarSign size={18} />
          {paymentLoading ? 'Redirecting to payment...' : `Pay ${fmt(inv.balanceDue)} Now`}
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginTop: 14,
          fontSize: 11,
          color: C.text3,
        }}>
          <Shield size={12} />
          Secure payment via Stripe
        </div>
      </div>

      {/* Back */}
      <button
        onClick={() => goTo('invoice', 'back')}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          background: 'transparent',
          color: C.text2,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <ArrowLeft size={16} />
        Back to Invoice
      </button>
    </div>
  )

  // ─── Loading / Error states ───────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Clock size={32} style={{ color: C.text3 }} />
    </div>
  )

  if (fetchError) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <AlertTriangle size={40} style={{ color: C.red }} />
      <p style={{ color: C.text2, textAlign: 'center', fontSize: 15, margin: 0 }}>
        {fetchError === 'Invoice not found' ? 'This invoice link is invalid or has expired.' : 'Unable to load invoice. Please try again.'}
      </p>
    </div>
  )

  // ─── Main Layout ──────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      color: C.text1,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        maxWidth: 700,
        margin: '0 auto',
        padding: '20px 16px 80px',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '16px 0 20px',
          marginBottom: 8,
        }}>
          <img
            src="https://usawrapco.com/wp-content/uploads/2025/10/main-logo-1-e1759926343108.webp"
            alt="USA WRAP CO"
            style={{ height: 48, width: 'auto' }}
            onError={(e) => {
              const el = e.currentTarget
              el.style.display = 'none'
              const fallback = el.nextElementSibling as HTMLElement | null
              if (fallback) fallback.style.display = 'flex'
            }}
          />
          <div style={{ display: 'none', alignItems: 'center', gap: 10 }}>
            <Truck size={24} style={{ color: C.accent }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: '-0.01em',
              color: C.text1,
            }}>
              USA WRAP CO
            </span>
          </div>
        </div>

        {/* Step content */}
        {step === 'invoice' && renderInvoice()}
        {step === 'signature' && renderSignature()}
        {step === 'payment' && renderPayment()}
      </div>
    </div>
  )
}
