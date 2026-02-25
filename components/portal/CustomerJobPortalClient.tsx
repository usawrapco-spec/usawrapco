'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  CheckCircle2,
  FileText,
  CreditCard,
  Pen,
  Calendar,
  Shield,
  Car,
  Camera,
  MessageSquare,
  Send,
  Eye,
  ThumbsUp,
  MessageCircle,
  Clock,
  Package,
  Palette,
  ShieldCheck,
  MapPin,
  CalendarCheck,
  Circle,
  ChevronRight,
  X,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────────
interface CustomerJobPortalProps {
  salesOrder: any
  lineItems: any[]
  project: any
  proofs: any[]
  photos: any[]
  comments: any[]
  invoices: any[]
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
  customer: { id: 'demo-c', contact_name: 'Mike Johnson', email: 'mike@example.com', phone: '253-555-0100' },
}
const DEMO_ITEMS = [
  { id: 'li-1', name: 'Full Body Wrap', description: '3M 2080 Satin Black -- full coverage including bumpers', quantity: 1, unit_price: 2800, total_price: 2800, sort_order: 0 },
  { id: 'li-2', name: 'Chrome Delete', description: 'Gloss black vinyl overlay on all chrome trim', quantity: 1, unit_price: 400, total_price: 400, sort_order: 1 },
]
const DEMO_PROJECT = {
  id: 'demo-p', title: 'Ford F-150 Full Wrap', vehicle_desc: '2024 Ford F-150 XLT',
  pipe_stage: 'production', status: 'active', type: 'Full Wrap',
  created_at: new Date(Date.now() - 7 * 86400000).toISOString(), install_date: null,
}

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
  amber: '#f59e0b',
  amberBg: '#fffbeb',
  amberBorder: '#fde68a',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  sigStroke: '#1e40af',
}

type PortalTab = 'overview' | 'quote' | 'design' | 'photos' | 'messages'

// ─── Timeline stages ────────────────────────────────────────────────────────────
const CUSTOMER_STAGES = [
  { key: 'received',        label: 'Order Received',     icon: CheckCircle2, color: C.green },
  { key: 'deposit_paid',    label: 'Deposit Paid',       icon: CreditCard,   color: C.accent },
  { key: 'in_design',       label: 'In Design',          icon: Palette,      color: C.purple },
  { key: 'design_approved', label: 'Design Approved',    icon: ThumbsUp,     color: C.green },
  { key: 'in_production',   label: 'In Production',      icon: Package,      color: C.amber },
  { key: 'quality_check',   label: 'Quality Check',      icon: ShieldCheck,  color: C.cyan },
  { key: 'ready_pickup',    label: 'Ready for Pickup',   icon: MapPin,       color: C.accent },
  { key: 'complete',        label: 'Complete',            icon: CalendarCheck, color: C.green },
]

function pipeToTimelineIdx(pipeStage: string): number {
  const map: Record<string, number> = {
    sales_in: 1, production: 4, install: 5, prod_review: 5, sales_close: 6, done: 7,
  }
  return map[pipeStage] ?? 0
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
const fmtDate = (d: string | null) => {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return d }
}
const todayStr = () => new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

// ─── Component ──────────────────────────────────────────────────────────────────
export default function CustomerJobPortalClient({
  salesOrder, lineItems, project: serverProject, proofs: serverProofs,
  photos: serverPhotos, comments: serverComments, invoices: serverInvoices,
  token, isDemo,
}: CustomerJobPortalProps) {
  const so = isDemo ? DEMO_SO : salesOrder
  const items = isDemo ? DEMO_ITEMS : lineItems
  const project = isDemo ? DEMO_PROJECT : serverProject
  const customer = so?.customer
  const proofs = isDemo ? [] : serverProofs
  const photos = isDemo ? [] : serverPhotos
  const comments = isDemo ? [] : serverComments
  const invoices = isDemo ? [] : serverInvoices

  const [tab, setTab] = useState<PortalTab>('overview')
  const [approved, setApproved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [customerName, setCustomerName] = useState(customer?.contact_name || customer?.name || '')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [feedbackId, setFeedbackId] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')

  // Signature
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isSigning, setIsSigning] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(dpr, dpr)
  }, [tab])

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }, [])

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); setIsDrawing(true); setIsSigning(true); lastPos.current = getPos(e)
  }, [getPos])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); if (!isDrawing) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx || !lastPos.current) return
    const pos = getPos(e)
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = C.sigStroke; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke()
    lastPos.current = pos
  }, [isDrawing, getPos])

  const endDraw = useCallback(() => { if (isDrawing) setHasSigned(true); setIsDrawing(false); lastPos.current = null }, [isDrawing])

  const clearSig = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    setHasSigned(false); setIsSigning(false)
  }, [])

  // Financials
  const subtotal = Number(so?.subtotal || 0)
  const taxAmount = Number(so?.tax_amount || 0)
  const total = Number(so?.total || 0)
  const deposit = 250
  const halfAmount = Math.max(0, (total * 0.5) - deposit)
  const balance = Math.max(0, total - deposit - halfAmount)

  // Timeline
  const timelineIdx = project ? pipeToTimelineIdx(project.pipe_stage) : 0
  const pendingProofs = proofs.filter((p: any) => p.status === 'pending')
  const openInvoices = invoices.filter((i: any) => i.status !== 'paid' && i.status !== 'void')

  const handleApproveAndPay = async () => {
    setError('')
    if (!customerName.trim()) { setError('Please enter your full name.'); return }
    if (!hasSigned) { setError('Please sign in the signature box above.'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeToken: token, email: customer?.email || '', projectId: so?.id || '', amount: 25000,
          metadata: { sales_order_id: so?.id || '', token, customer_name: customerName.trim() },
        }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      if (data.error) {
        if (data.error === 'Stripe not configured' || isDemo) { setApproved(true); setSubmitting(false); return }
        setError(data.error)
      } else { setApproved(true) }
    } catch {
      if (isDemo) { setApproved(true); setSubmitting(false); return }
      setError('Something went wrong. Please try again or contact us.')
    }
    setSubmitting(false)
  }

  // Tab config
  const tabs: { key: PortalTab; label: string; icon: typeof Circle; badge?: number }[] = [
    { key: 'overview', label: 'Overview', icon: Car },
    { key: 'quote', label: 'Quote', icon: FileText },
    { key: 'design', label: 'Design', icon: Palette, badge: pendingProofs.length },
    { key: 'photos', label: 'Photos', icon: Camera, badge: photos.length },
    { key: 'messages', label: 'Messages', icon: MessageSquare, badge: comments.length },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '16px 20px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.text1, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '-0.01em' }}>USA WRAP CO</div>
            <div style={{ fontSize: 12, color: C.text2 }}>{BRAND.tagline}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>{customer?.contact_name || customer?.name || 'Customer'}</div>
            {customer?.email && <div style={{ fontSize: 12, color: C.text3 }}>{customer.email}</div>}
          </div>
        </div>
      </div>

      {/* ─── Demo Banner ─────────────────────────────────────────────── */}
      {isDemo && (
        <div style={{ maxWidth: 720, margin: '16px auto 0', padding: '0 20px' }}>
          <div style={{ background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={18} style={{ color: '#d97706', flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: '#92400e' }}><strong>Demo Mode</strong> -- This is a sample portal for preview purposes.</div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 20px 60px' }}>

        {/* ─── Job Header Card ────────────────────────────────────────── */}
        {project && (
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px 24px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text1, fontFamily: "'Barlow Condensed', sans-serif" }}>{project.title || so?.title}</div>
                {project.vehicle_desc && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: C.text2, marginTop: 4 }}><Car size={15} /> {project.vehicle_desc}</div>
                )}
              </div>
              {project.type && <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: C.blueBg, color: C.accentDark, border: `1px solid ${C.blueBorder}` }}>{project.type}</span>}
            </div>
            <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
              <div><span style={{ color: C.text3 }}>Created </span><span style={{ color: C.text1, fontWeight: 600 }}>{fmtDate(project.created_at)}</span></div>
              {project.install_date && <div><span style={{ color: C.text3 }}>Install </span><span style={{ color: C.amber, fontWeight: 600 }}>{fmtDate(project.install_date)}</span></div>}
            </div>
          </div>
        )}

        {/* ─── Tab Navigation ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 2 }}>
          {tabs.map(t => {
            const active = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif",
                background: active ? C.accent : 'transparent', color: active ? '#fff' : C.text2,
                whiteSpace: 'nowrap',
              }}>
                <t.icon size={15} />
                {t.label}
                {(t.badge || 0) > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 6,
                    background: active ? 'rgba(255,255,255,0.25)' : C.borderLight, color: active ? '#fff' : C.text3,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{t.badge}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* ─── OVERVIEW TAB ───────────────────────────────────────────── */}
        {tab === 'overview' && (
          <>
            {/* Timeline */}
            {project && (
              <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '24px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text1, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 20 }}>Project Timeline</div>
                <div style={{ position: 'relative' }}>
                  {CUSTOMER_STAGES.map((stage, i) => {
                    const isCompleted = i < timelineIdx
                    const isCurrent = i === timelineIdx
                    const StageIcon = stage.icon
                    const isLast = i === CUSTOMER_STAGES.length - 1
                    const nodeColor = isCompleted ? C.green : isCurrent ? C.accent : C.text3
                    const nodeBg = isCompleted ? C.greenBg : isCurrent ? C.blueBg : '#f8fafc'
                    return (
                      <div key={stage.key} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                        {!isLast && (
                          <div style={{ position: 'absolute', left: 17, top: 36, bottom: 0, width: 2, background: isCompleted ? C.greenBorder : C.borderLight }} />
                        )}
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', background: nodeBg,
                          border: `2px solid ${isCompleted ? C.green : isCurrent ? C.accent : C.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1,
                        }}>
                          <StageIcon size={16} style={{ color: nodeColor }} />
                        </div>
                        <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
                          <div style={{ fontSize: 14, fontWeight: isCurrent ? 800 : 600, color: isCompleted || isCurrent ? C.text1 : C.text3, marginBottom: 2 }}>
                            {stage.label}
                            {isCurrent && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: C.blueBg, color: C.accent, border: `1px solid ${C.blueBorder}` }}>CURRENT</span>}
                          </div>
                          {isCompleted && i === 0 && project.created_at && (
                            <div style={{ fontSize: 11, color: C.text3 }}>{fmtDate(project.created_at)}</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quick action cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
              {pendingProofs.length > 0 && (
                <button onClick={() => setTab('design')} style={{ background: `${C.purple}08`, border: `1px solid ${C.purple}25`, borderRadius: 14, padding: 18, cursor: 'pointer', textAlign: 'left', color: C.text1 }}>
                  <Palette size={22} style={{ color: C.purple, marginBottom: 8 }} />
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{pendingProofs.length} proof{pendingProofs.length > 1 ? 's' : ''} to review</div>
                  <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>Tap to approve designs</div>
                </button>
              )}
              {openInvoices.length > 0 && (
                <button onClick={() => setTab('quote')} style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 14, padding: 18, cursor: 'pointer', textAlign: 'left', color: C.text1 }}>
                  <CreditCard size={22} style={{ color: C.greenDark, marginBottom: 8 }} />
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{openInvoices.length} open invoice{openInvoices.length > 1 ? 's' : ''}</div>
                  <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>View payment details</div>
                </button>
              )}
              {photos.length > 0 && (
                <button onClick={() => setTab('photos')} style={{ background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 14, padding: 18, cursor: 'pointer', textAlign: 'left', color: C.text1 }}>
                  <Camera size={22} style={{ color: C.accent, marginBottom: 8 }} />
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{photos.length} photo{photos.length > 1 ? 's' : ''}</div>
                  <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>View project gallery</div>
                </button>
              )}
              <button onClick={() => setTab('messages')} style={{ background: '#f8fafc', border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, cursor: 'pointer', textAlign: 'left', color: C.text1 }}>
                <MessageSquare size={22} style={{ color: C.accent, marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 700 }}>Messages</div>
                <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{comments.length > 0 ? `${comments.length} message${comments.length > 1 ? 's' : ''}` : 'Contact your team'}</div>
              </button>
            </div>
          </>
        )}

        {/* ─── QUOTE TAB ──────────────────────────────────────────────── */}
        {tab === 'quote' && (
          <>
            {/* Quote card */}
            <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <FileText size={18} style={{ color: C.accent }} />
                    <span style={{ fontSize: 20, fontWeight: 800, color: C.text1, fontFamily: "'Barlow Condensed', sans-serif" }}>Quote #{so?.so_number || '---'}</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.text2 }}>{so?.title || 'Vehicle Wrap Services'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: C.text3 }}>Date</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{fmtDate(so?.so_date) || todayStr()}</div>
                </div>
              </div>

              <div style={{ padding: '0 24px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.borderLight}` }}>
                      <th style={{ padding: '14px 0 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item</th>
                      <th style={{ padding: '14px 0 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em', width: 50 }}>Qty</th>
                      <th style={{ padding: '14px 0 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em', width: 100 }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, i: number) => (
                      <tr key={item.id || i} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                        <td style={{ padding: '14px 12px 14px 0' }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>{item.name}</div>
                          {item.description && <div style={{ fontSize: 12, color: C.text2, marginTop: 3, lineHeight: 1.4 }}>{item.description}</div>}
                        </td>
                        <td style={{ padding: '14px 0', textAlign: 'center', fontSize: 14, color: C.text2, fontFamily: "'JetBrains Mono', monospace" }}>{Number(item.quantity || 1)}</td>
                        <td style={{ padding: '14px 0', textAlign: 'right', fontSize: 14, fontWeight: 600, color: C.text1, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(Number(item.total_price || item.unit_price || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ padding: '16px 24px 20px', background: '#fafbfc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: C.text2 }}>Subtotal</span>
                  <span style={{ fontSize: 13, color: C.text1, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(subtotal)}</span>
                </div>
                {Number(so?.discount || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: C.green }}>Discount</span>
                    <span style={{ fontSize: 13, color: C.green, fontFamily: "'JetBrains Mono', monospace" }}>-{fmt(Number(so.discount))}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: C.text2 }}>Tax ({(Number(so?.tax_rate || 0) * 100).toFixed(2)}%)</span>
                  <span style={{ fontSize: 13, color: C.text1, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(taxAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: `2px solid ${C.border}` }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: C.text1 }}>Total</span>
                  <span style={{ fontSize: 24, fontWeight: 900, color: C.text1, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Schedule */}
            <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <CreditCard size={18} style={{ color: C.accent }} />
                <span style={{ fontSize: 16, fontWeight: 800, color: C.text1, fontFamily: "'Barlow Condensed', sans-serif" }}>Payment Schedule</span>
              </div>
              {[
                { label: 'Due Today', sub: 'Design Deposit', amount: deposit, bg: C.greenBg, border: C.greenBorder, color: C.greenDark },
                { label: 'Due Before Start', sub: '50% of total less deposit', amount: halfAmount, bg: C.blueBg, border: C.blueBorder, color: C.accentDark },
                { label: 'Balance at Pickup', sub: 'Remaining balance', amount: balance, bg: '#f8fafc', border: C.border, color: C.text1 },
              ].map(p => (
                <div key={p.label} style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: p.color }}>{p.label}</div>
                    <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>{p.sub}</div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: p.color, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(p.amount)}</div>
                </div>
              ))}
            </div>

            {/* Signature & Approve */}
            {!approved ? (
              <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Pen size={18} style={{ color: C.accent }} />
                  <span style={{ fontSize: 16, fontWeight: 800, color: C.text1, fontFamily: "'Barlow Condensed', sans-serif" }}>Approve & Sign</span>
                </div>
                <div style={{ fontSize: 13, color: C.text2, marginBottom: 18, lineHeight: 1.5 }}>
                  By signing below, you approve this quote and authorize USA Wrap Co to proceed.
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Sign Here</div>
                  <div style={{ position: 'relative', border: `2px solid ${hasSigned ? C.accent : C.border}`, borderRadius: 10, overflow: 'hidden', background: '#fafbfc', touchAction: 'none' }}>
                    <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: 140, cursor: 'crosshair', touchAction: 'none' }}
                      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                      onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
                    {!isSigning && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}><span style={{ fontSize: 14, color: '#cbd5e1', fontStyle: 'italic' }}>Draw your signature here</span></div>}
                    <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, borderBottom: '1px dashed #e2e8f0', pointerEvents: 'none' }} />
                  </div>
                  <button onClick={clearSig} style={{ marginTop: 8, fontSize: 12, color: C.text3, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textDecoration: 'underline' }}>Clear signature</button>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Full Name</label>
                  <input type="text" value={customerName} onChange={e => { setCustomerName(e.target.value); setError('') }} placeholder="Enter your full legal name"
                    style={{ width: '100%', padding: '12px 14px', background: '#fafbfc', border: `1px solid ${C.border}`, borderRadius: 10, color: C.text1, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    onFocus={e => { e.target.style.borderColor = C.accent }} onBlur={e => { e.target.style.borderColor = C.border }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Date</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: '#f1f5f9', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14, color: C.text2 }}><Calendar size={14} style={{ color: C.text3 }} />{todayStr()}</div>
                </div>
                {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#dc2626', fontWeight: 500 }}>{error}</div>}
                <button onClick={handleApproveAndPay} disabled={submitting} style={{
                  width: '100%', padding: '18px 24px', borderRadius: 14, border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer', background: submitting ? '#86efac' : C.green,
                  color: '#052e16', fontSize: 17, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  opacity: submitting ? 0.7 : 1, boxShadow: submitting ? 'none' : '0 4px 14px rgba(34,197,94,0.3)',
                }}>
                  <CheckCircle2 size={22} />
                  {submitting ? 'Processing...' : `Approve & Pay Deposit -- ${fmt(deposit)}`}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 }}>
                  <Shield size={14} style={{ color: C.text3 }} />
                  <span style={{ fontSize: 12, color: C.text3 }}>Secure payment powered by Stripe</span>
                </div>
              </div>
            ) : (
              <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.greenBorder}`, padding: '48px 32px', textAlign: 'center', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle2 size={32} style={{ color: C.green }} />
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: C.text1, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>Quote Approved!</div>
                <div style={{ fontSize: 15, color: C.text2, lineHeight: 1.6, maxWidth: 440, margin: '0 auto' }}>
                  Thank you, {customerName || 'valued customer'}. Your approval has been recorded and our team will begin preparing your project.
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── DESIGN TAB ─────────────────────────────────────────────── */}
        {tab === 'design' && (
          <>
            {proofs.length === 0 ? (
              <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '60px 20px', textAlign: 'center' }}>
                <Palette size={40} style={{ color: C.text3, marginBottom: 12 }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, marginBottom: 6 }}>No Design Proofs Yet</div>
                <div style={{ fontSize: 13, color: C.text2 }}>Your designer will upload proofs here for your review.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {proofs.map((p: any) => (
                  <div key={p.id} style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: 13, color: C.text3, fontFamily: "'JetBrains Mono', monospace" }}>Version {p.version}</div>
                      <span style={{
                        padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800,
                        background: p.status === 'approved' ? C.greenBg : p.status === 'rejected' ? '#fef2f2' : C.amberBg,
                        color: p.status === 'approved' ? C.greenDark : p.status === 'rejected' ? '#dc2626' : '#d97706',
                        border: `1px solid ${p.status === 'approved' ? C.greenBorder : p.status === 'rejected' ? '#fecaca' : C.amberBorder}`,
                      }}>{p.status === 'pending' ? 'Awaiting Review' : p.status === 'approved' ? 'Approved' : 'Changes Requested'}</span>
                    </div>
                    {p.file_url && (
                      <div onClick={() => setLightbox(p.file_url)} style={{ cursor: 'pointer', borderRadius: 10, overflow: 'hidden', marginBottom: 14, border: `1px solid ${C.borderLight}` }}>
                        <img src={p.file_url} alt="Design proof" style={{ width: '100%', display: 'block' }} />
                      </div>
                    )}
                    {p.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, background: C.green, color: '#052e16', fontFamily: "'Barlow Condensed', sans-serif" }}>
                          <ThumbsUp size={16} /> Approve
                        </button>
                        <button onClick={() => { setFeedbackId(p.id); setFeedbackText('') }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 800, background: 'transparent', color: C.text2, fontFamily: "'Barlow Condensed', sans-serif" }}>
                          <MessageCircle size={16} /> Request Changes
                        </button>
                      </div>
                    )}
                    {feedbackId === p.id && (
                      <div style={{ marginTop: 14, background: '#fafbfc', borderRadius: 10, padding: 16, border: `1px solid ${C.borderLight}` }}>
                        <textarea style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: C.text1, outline: 'none', minHeight: 80, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Describe the changes you'd like..." value={feedbackText} onChange={e => setFeedbackText(e.target.value)} />
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button disabled={!feedbackText.trim()} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', cursor: feedbackText.trim() ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 700, background: C.accent, color: '#fff', opacity: feedbackText.trim() ? 1 : 0.5 }}>Submit Feedback</button>
                          <button onClick={() => setFeedbackId(null)} style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: 'transparent', color: C.text2 }}>Cancel</button>
                        </div>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: C.text3, marginTop: 10 }}>{fmtDate(p.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── PHOTOS TAB ─────────────────────────────────────────────── */}
        {tab === 'photos' && (
          <>
            {photos.length === 0 ? (
              <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '60px 20px', textAlign: 'center' }}>
                <Camera size={40} style={{ color: C.text3, marginBottom: 12 }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, marginBottom: 6 }}>No Photos Yet</div>
                <div style={{ fontSize: 13, color: C.text2 }}>Photos will be uploaded as your project progresses.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {photos.map((photo: any) => (
                  <div key={photo.id} onClick={() => photo.image_url && setLightbox(photo.image_url)} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, cursor: photo.image_url ? 'pointer' : 'default', background: C.card }}>
                    {photo.image_url ? (
                      <img src={photo.image_url} alt={photo.file_name} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}><Camera size={24} style={{ color: C.text3 }} /></div>
                    )}
                    <div style={{ padding: '8px 12px' }}>
                      <div style={{ fontSize: 12, color: C.text1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.file_name}</div>
                      <div style={{ fontSize: 10, color: C.text3 }}>{photo.category || 'Photo'} -- {fmtDate(photo.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── MESSAGES TAB ───────────────────────────────────────────── */}
        {tab === 'messages' && (
          <>
            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <input style={{ flex: 1, background: '#f8fafc', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', fontSize: 14, color: C.text1, outline: 'none', fontFamily: 'inherit' }} placeholder="Send a message to your team..." value={message} onChange={e => setMessage(e.target.value)} />
                <button disabled={!message.trim()} style={{ padding: '12px 16px', borderRadius: 10, border: 'none', cursor: message.trim() ? 'pointer' : 'not-allowed', background: C.accent, color: '#fff', display: 'flex', alignItems: 'center', opacity: message.trim() ? 1 : 0.5 }}><Send size={16} /></button>
              </div>
            </div>
            {comments.length === 0 ? (
              <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '60px 20px', textAlign: 'center' }}>
                <MessageSquare size={40} style={{ color: C.text3, marginBottom: 12 }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, marginBottom: 6 }}>No Messages Yet</div>
                <div style={{ fontSize: 13, color: C.text2 }}>Send a message above to contact your wrap team.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {comments.map((c: any) => (
                  <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: C.accent }}>{c.author_name || 'USA Wrap Co'}</span>
                      <span style={{ fontSize: 10, color: C.text3 }}>{fmtDate(c.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5 }}>{c.body}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── Footer ─────────────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, marginTop: 32, textAlign: 'center', color: C.text3, fontSize: 12, lineHeight: 1.8 }}>
          <div style={{ fontWeight: 700, color: C.text2 }}>{BRAND.name}</div>
          <div>{BRAND.address}, {BRAND.city}</div>
          <div>{BRAND.phone} | {BRAND.email}</div>
        </div>
      </div>

      {/* ─── Lightbox ─────────────────────────────────────────────────── */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff' }}><X size={22} /></button>
          <img src={lightbox} alt="Preview" style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} onClick={e => e.stopPropagation()} />
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        input::placeholder { color: #94a3b8; }
        textarea::placeholder { color: #94a3b8; }
      `}</style>
    </div>
  )
}
