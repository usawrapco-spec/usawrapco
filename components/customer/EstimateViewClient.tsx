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
  Wrench,
  AlertTriangle,
  CreditCard,
  Sparkles,
  XCircle,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────────
interface EstimateViewClientProps {
  token: string
}

interface DemoLineItem {
  item: string
  description: string
  vehicle: string
  qty: number
  price: number
}

type Step = 'estimate' | 'terms' | 'signature' | 'done'

// ─── Demo Data ──────────────────────────────────────────────────────────────────
const DEMO_ESTIMATE = {
  number: 'EST-1001',
  date: '2026-02-21',
  validUntil: '2026-03-23',
  customerName: 'James Mitchell',
  customerEmail: 'james@mitchelltrucking.com',
  customerPhone: '(555) 234-5678',
  customerCompany: 'Mitchell Trucking LLC',
  scopeOfWork:
    'Full commercial wrap on 2024 Ford F-250 with company branding, including custom graphic design, premium 3M IJ180Cv3 vinyl with 8519 laminate, and professional installation. Paint protection film (PPF) on front bumper, hood, and fenders for added durability.',
  lineItems: [
    {
      item: 'Full Commercial Wrap',
      description: '3M IJ180Cv3 + 8519 laminate, custom design, print & install',
      vehicle: '2024 Ford F-250',
      qty: 1,
      price: 4200.0,
    },
    {
      item: 'Paint Protection Film',
      description: 'XPEL Ultimate Plus PPF on front bumper, hood, fenders',
      vehicle: '2024 Ford F-250',
      qty: 1,
      price: 1800.0,
    },
  ] as DemoLineItem[],
  subtotal: 6000.0,
  taxRate: 0.0825,
  taxAmount: 495.0,
  total: 6495.0,
}

const TERMS_CONTENT = [
  {
    title: 'Scope of Work',
    content:
      'USA Wrap Co will perform the vehicle wrap and/or paint protection services as described in the attached estimate. All work will be completed at our facility using professional-grade materials and techniques.',
  },
  {
    title: 'What\'s Included',
    content:
      'Custom graphic design based on your approved brief, premium vinyl and laminate materials, professional surface preparation, expert installation by certified technicians, final quality inspection, and a 1-year warranty on installation workmanship.',
  },
  {
    title: 'What\'s Not Included',
    content:
      'Paint correction or body repair, dent or scratch removal, repair of pre-existing damage, mechanical or electrical modifications, window tinting (unless specified), and any work not explicitly listed in the estimate.',
  },
  {
    title: 'Payment Terms',
    content:
      'A 50% deposit is required to begin production. The remaining balance is due upon completion, before vehicle release. Accepted payment methods include credit/debit card, ACH transfer, and company check. A 3% convenience fee applies to credit card payments over $2,500.',
  },
  {
    title: 'Cancellation Policy',
    content:
      'Full refund if cancelled within 48 hours of acceptance. After 48 hours, the deposit is non-refundable if design work has begun. If materials have been ordered or printed, the customer is responsible for material costs. No refunds after installation has begun.',
  },
  {
    title: 'Warranty',
    content:
      'USA Wrap Co provides a 1-year warranty on installation workmanship covering lifting, peeling, and bubbling under normal conditions. Material warranty is per manufacturer specifications (typically 3-5 years for premium vinyl). Warranty does not cover damage from accidents, pressure washing, automatic car washes, or improper care.',
  },
  {
    title: 'Liability',
    content:
      'USA Wrap Co is not responsible for pre-existing paint damage, clear coat failure, or defects revealed during removal of prior wraps. Customer must disclose any known paint or body issues prior to installation. Vehicle must be free of aftermarket coatings that may affect adhesion.',
  },
  {
    title: 'Vehicle Preparation',
    content:
      'Customer is responsible for delivering the vehicle in a clean condition, free of heavy dirt, mud, and debris. A final detail wash will be performed by our team before installation. Vehicle should have at least a quarter tank of fuel and no personal belongings.',
  },
]

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
  text1: '#ffffff',
  text2: '#8b95a5',
  text3: '#5a6080',
}

// ─── Component ──────────────────────────────────────────────────────────────────
export default function EstimateViewClient({ token }: EstimateViewClientProps) {
  const [step, setStep] = useState<Step>('estimate')
  const [animDir, setAnimDir] = useState<'next' | 'back'>('next')
  const [animating, setAnimating] = useState(false)

  // Terms state
  const [termsScrolled, setTermsScrolled] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const termsRef = useRef<HTMLDivElement>(null)

  // Signature state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)
  const [signerName, setSignerName] = useState(DEMO_ESTIMATE.customerName)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  // Redirect timer
  const [countdown, setCountdown] = useState(3)

  const est = DEMO_ESTIMATE

  // ─── Step navigation ────────────────────────────────────────────────────────
  const steps: Step[] = ['estimate', 'terms', 'signature', 'done']
  const stepIndex = steps.indexOf(step)

  const goTo = useCallback((next: Step, dir: 'next' | 'back') => {
    if (animating) return
    setAnimDir(dir)
    setAnimating(true)
    setTimeout(() => {
      setStep(next)
      setAnimating(false)
    }, 250)
  }, [animating])

  // ─── Terms scroll detection ─────────────────────────────────────────────────
  const handleTermsScroll = useCallback(() => {
    const el = termsRef.current
    if (!el) return
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20
    if (atBottom) setTermsScrolled(true)
  }, [])

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

    // Smooth line with quadratic curve
    const midX = (lastPoint.current.x + pos.x) / 2
    const midY = (lastPoint.current.y + pos.y) / 2
    ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, midX, midY)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(midX, midY)

    // Pressure simulation based on speed
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

  const getSignatureData = (): string | null => {
    const canvas = canvasRef.current
    if (!canvas || !hasSigned) return null
    return canvas.toDataURL('image/png')
  }

  const handleSignAndContinue = () => {
    const sigData = getSignatureData()
    if (!sigData || !signerName.trim()) return

    // In a real app, POST to API with:
    // { token, signatureImage: sigData, signerName, timestamp, userAgent }
    console.log('[EstimateView] Signature captured:', {
      token,
      signerName: signerName.trim(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      signatureLength: sigData.length,
    })

    goTo('done', 'next')
  }

  // ─── Redirect countdown ────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'done') return
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          window.location.href = `/onboard/${token}`
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [step, token])

  // ─── Step indicator ────────────────────────────────────────────────────────
  const StepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
      {steps.map((s, i) => (
        <div
          key={s}
          style={{
            width: i <= stepIndex ? 28 : 8,
            height: 8,
            borderRadius: 4,
            background: i <= stepIndex ? C.accent : C.surface2,
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  )

  // ─── Slide animation wrapper ───────────────────────────────────────────────
  const slideStyle: React.CSSProperties = {
    opacity: animating ? 0 : 1,
    transform: animating
      ? `translateX(${animDir === 'next' ? '40px' : '-40px'})`
      : 'translateX(0)',
    transition: 'all 0.25s ease',
  }

  // ─── Format currency ──────────────────────────────────────────────────────
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  // ─── STEP 1: View Estimate ────────────────────────────────────────────────
  const renderEstimate = () => (
    <div style={slideStyle}>
      {/* Estimate title */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 16px',
          background: `${C.accent}12`,
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          color: C.accent,
          letterSpacing: '0.04em',
          marginBottom: 12,
        }}>
          <FileText size={13} />
          ESTIMATE
        </div>
        <h1 style={{
          fontSize: 28,
          fontWeight: 900,
          color: C.text1,
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '-0.01em',
          margin: '0 0 6px',
        }}>
          {est.number}
        </h1>
        <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>
          Issued {new Date(est.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
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
          Prepared For
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, marginBottom: 4 }}>
          {est.customerName}
        </div>
        <div style={{ fontSize: 13, color: C.text2 }}>{est.customerCompany}</div>
        <div style={{ fontSize: 13, color: C.text2 }}>{est.customerEmail}</div>
        <div style={{ fontSize: 13, color: C.text2 }}>{est.customerPhone}</div>
      </div>

      {/* Line items table */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 20,
      }}>
        {/* Table header */}
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

        {/* Line items */}
        {est.lineItems.map((li, i) => (
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
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 6,
                fontSize: 11,
                color: C.accent,
                fontWeight: 600,
              }}>
                <Truck size={11} />
                {li.vehicle}
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
        <div style={{
          borderTop: `1px solid ${C.border}`,
          padding: '16px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: C.text2 }}>Subtotal</span>
            <span style={{ fontSize: 14, color: C.text1, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
              {fmt(est.subtotal)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: C.text2 }}>Tax ({(est.taxRate * 100).toFixed(2)}%)</span>
            <span style={{ fontSize: 14, color: C.text1, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
              {fmt(est.taxAmount)}
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: 12,
            borderTop: `1px solid ${C.border}`,
          }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.text1 }}>Total</span>
            <span style={{
              fontSize: 24,
              fontWeight: 900,
              color: C.green,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {fmt(est.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Scope of work */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 20,
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Scope of Work
        </div>
        <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.7, margin: 0 }}>
          {est.scopeOfWork}
        </p>
      </div>

      {/* Validity footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '12px 0 20px',
        fontSize: 12,
        color: C.text3,
      }}>
        <Clock size={13} />
        This estimate is valid for 30 days (expires {new Date(est.validUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})
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

      {/* Accept button */}
      <button
        onClick={() => goTo('terms', 'next')}
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
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <CheckCircle size={20} />
        Accept Estimate
        <ChevronRight size={18} />
      </button>

      {/* Contact link */}
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
          Have questions? Call us at (555) 123-4567
        </a>
      </div>
    </div>
  )

  // ─── STEP 2: Terms & Conditions ────────────────────────────────────────────
  const renderTerms = () => (
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
          <Shield size={24} style={{ color: C.accent }} />
        </div>
        <h2 style={{
          fontSize: 24,
          fontWeight: 900,
          color: C.text1,
          fontFamily: "'Barlow Condensed', sans-serif",
          margin: '0 0 6px',
        }}>
          Terms & Conditions
        </h2>
        <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>
          Please review the following agreement before continuing
        </p>
      </div>

      {/* Scrollable terms */}
      <div
        ref={termsRef}
        onScroll={handleTermsScroll}
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: '24px 20px',
          maxHeight: 400,
          overflowY: 'auto',
          marginBottom: 20,
        }}
      >
        <div style={{
          fontSize: 11,
          fontWeight: 800,
          color: C.accent,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 20,
        }}>
          USA WRAP CO -- Service Agreement
        </div>

        {TERMS_CONTENT.map((section, i) => (
          <div key={i} style={{ marginBottom: i < TERMS_CONTENT.length - 1 ? 24 : 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}>
              {i === 0 && <Wrench size={14} style={{ color: C.accent }} />}
              {i === 1 && <CheckCircle size={14} style={{ color: C.green }} />}
              {i === 2 && <XCircle size={14} style={{ color: C.red }} />}
              {i === 3 && <CreditCard size={14} style={{ color: C.amber }} />}
              {i === 4 && <AlertTriangle size={14} style={{ color: C.amber }} />}
              {i === 5 && <Shield size={14} style={{ color: C.green }} />}
              {i === 6 && <AlertTriangle size={14} style={{ color: C.text3 }} />}
              {i === 7 && <Sparkles size={14} style={{ color: C.accent }} />}
              <h3 style={{
                fontSize: 14,
                fontWeight: 800,
                color: C.text1,
                margin: 0,
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: '0.01em',
              }}>
                {section.title}
              </h3>
            </div>
            <p style={{
              fontSize: 13,
              color: C.text2,
              lineHeight: 1.7,
              margin: 0,
              paddingLeft: 22,
            }}>
              {section.content}
            </p>
          </div>
        ))}
      </div>

      {/* Scroll hint */}
      {!termsScrolled && (
        <div style={{
          textAlign: 'center',
          fontSize: 12,
          color: C.amber,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}>
          <AlertTriangle size={13} />
          Scroll to the bottom to continue
        </div>
      )}

      {/* Checkbox */}
      <label style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '16px 18px',
        background: termsAgreed ? `${C.green}08` : C.surface,
        border: `1px solid ${termsAgreed ? `${C.green}40` : C.border}`,
        borderRadius: 12,
        cursor: termsScrolled ? 'pointer' : 'not-allowed',
        opacity: termsScrolled ? 1 : 0.4,
        transition: 'all 0.2s',
        marginBottom: 20,
      }}>
        <input
          type="checkbox"
          checked={termsAgreed}
          disabled={!termsScrolled}
          onChange={e => setTermsAgreed(e.target.checked)}
          style={{
            width: 20,
            height: 20,
            accentColor: C.green,
            flexShrink: 0,
            marginTop: 1,
            cursor: termsScrolled ? 'pointer' : 'not-allowed',
          }}
        />
        <span style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>
          I have read and agree to the Terms & Conditions outlined above. I understand the payment terms, cancellation policy, and warranty coverage.
        </span>
      </label>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => goTo('estimate', 'back')}
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
          onClick={() => termsAgreed && goTo('signature', 'next')}
          disabled={!termsAgreed}
          style={{
            flex: 2,
            padding: '14px',
            borderRadius: 10,
            border: 'none',
            background: termsAgreed ? C.accent : C.surface2,
            color: termsAgreed ? '#fff' : C.text3,
            fontSize: 15,
            fontWeight: 800,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '0.02em',
            cursor: termsAgreed ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s',
          }}
        >
          Continue to Signature
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )

  // ─── STEP 3: Digital Signature ─────────────────────────────────────────────
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
          Sign Your Agreement
        </h2>
        <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>
          Draw your signature below to finalize the agreement
        </p>
      </div>

      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 20,
        marginBottom: 20,
      }}>
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
                height: 160,
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

        {/* Name field */}
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

        {/* Date (read-only) */}
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

        {/* Legal notice */}
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
          By signing below, you agree to the terms and authorize USA Wrap Co to begin work as described in estimate {est.number}.
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => goTo('terms', 'back')}
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
          Sign & Continue
        </button>
      </div>
    </div>
  )

  // ─── STEP 4: Done / Redirect ───────────────────────────────────────────────
  const renderDone = () => (
    <div style={{
      ...slideStyle,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '60px 0',
    }}>
      {/* Animated checkmark */}
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: `${C.green}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        animation: 'scaleIn 0.4s ease',
      }}>
        <CheckCircle size={42} style={{ color: C.green }} />
      </div>
      <h2 style={{
        fontSize: 28,
        fontWeight: 900,
        color: C.text1,
        fontFamily: "'Barlow Condensed', sans-serif",
        marginBottom: 8,
      }}>
        Agreement Signed!
      </h2>
      <p style={{ fontSize: 14, color: C.text2, maxWidth: 360, marginBottom: 28, lineHeight: 1.6 }}>
        Thank you, {signerName}. Your signed agreement has been recorded.
        We are getting everything ready for your project.
      </p>
      <div style={{
        fontSize: 13,
        color: C.text3,
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <Clock size={14} />
        Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
      </div>
      <button
        onClick={() => { window.location.href = `/onboard/${token}` }}
        style={{
          padding: '16px 36px',
          borderRadius: 12,
          border: 'none',
          background: C.accent,
          color: '#fff',
          fontSize: 15,
          fontWeight: 800,
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '0.02em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        Continue to Upload Assets
        <ChevronRight size={16} />
      </button>

      {/* Inject animation keyframes */}
      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
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
          padding: '16px 0 8px',
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

        {/* Step indicator */}
        <StepIndicator />

        {/* Step content */}
        {step === 'estimate' && renderEstimate()}
        {step === 'terms' && renderTerms()}
        {step === 'signature' && renderSignature()}
        {step === 'done' && renderDone()}
      </div>
    </div>
  )
}
