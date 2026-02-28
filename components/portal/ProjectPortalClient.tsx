'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2, Circle, Clock, AlertTriangle, Loader2,
  Car, Calendar, MapPin, MessageSquare, Send, FileText,
  CreditCard, Image, ChevronDown, ChevronUp, ThumbsUp,
  RotateCcw, Copy, CheckCheck, ExternalLink, Phone, Mail,
  X, ZoomIn, Receipt, Package, Wrench, Printer, DollarSign,
  CalendarCheck, ShieldCheck, Star, Info, ArrowRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProjectPortalClientProps {
  project: ProjectRow
  customer: CustomerRow | null
  estimate: EstimateRow | null
  lineItems: LineItem[]
  proofs: ProofRow[]
  photos: PhotoRow[]
  invoice: InvoiceRow | null
  messages: MessageRow[]
  orgName: string
}

interface ProjectRow {
  id: string
  title: string
  vehicle_desc: string | null
  pipe_stage: string
  install_date: string | null
  install_address: string | null
  is_mobile_install: boolean
  warranty_years: number
  warranty_expiry: string | null
  install_completed_date: string | null
  portal_token: string
  org_id: string
  type: string | null
  revenue: number | null
  notes: string | null
  agent_id: string | null
}

interface CustomerRow {
  id: string
  name: string
  email: string | null
  phone: string | null
}

interface EstimateRow {
  id: string
  estimate_number: string | null
  title: string | null
  subtotal: number
  discount_percent: number | null
  tax_percent: number | null
  tax_amount: number | null
  total: number
  notes: string | null
  status: string
}

interface LineItem {
  id: string
  name: string
  description: string | null
  quantity: number
  unit_price: number
  total_price: number
  sort_order: number
}

interface ProofRow {
  id: string
  image_url: string | null
  thumbnail_url: string | null
  version_number: number
  customer_status: string
  designer_notes: string | null
  created_at: string
}

interface PhotoRow {
  id: string
  image_url: string
  category: string | null
  description: string | null
  created_at: string
}

interface InvoiceRow {
  id: string
  invoice_number: string | null
  total: number
  amount_paid: number
  balance: number
  status: string
  due_date: string | null
  invoice_date: string | null
}

interface MessageRow {
  id: string
  sender_name: string
  body: string
  direction: string
  created_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const C = {
  bg: '#0d0f14', surface: '#13151c', surface2: '#1a1d27', border: '#2a2f3d',
  accent: '#4f7fff', green: '#22c07a', red: '#f25a5a', cyan: '#22d3ee',
  amber: '#f59e0b', purple: '#8b5cf6', text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
}

const STAGE_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  sales_in:    { label: 'Quote Review',  color: C.accent,  icon: FileText },
  production:  { label: 'In Production', color: C.purple,  icon: Printer },
  install:     { label: 'Installing',    color: C.cyan,    icon: Wrench },
  prod_review: { label: 'Quality Check', color: C.amber,   icon: ShieldCheck },
  sales_close: { label: 'Wrapping Up',   color: C.amber,   icon: CheckCheck },
  done:        { label: 'Complete',      color: C.green,   icon: CheckCircle2 },
}

// Customer-facing stage progression
const PORTAL_STAGES = [
  { key: 'estimate',  label: 'Estimate',     pipeStages: ['sales_in'] },
  { key: 'approved',  label: 'Approved',     pipeStages: [] },
  { key: 'design',    label: 'Design',       pipeStages: ['production'] },
  { key: 'proof',     label: 'Proof Review', pipeStages: ['production'] },
  { key: 'print',     label: 'Print',        pipeStages: ['production'] },
  { key: 'install',   label: 'Install',      pipeStages: ['install', 'prod_review'] },
  { key: 'complete',  label: 'Complete',     pipeStages: ['sales_close', 'done'] },
]

function getPortalStageIndex(pipeStage: string): number {
  const stageMap: Record<string, number> = {
    sales_in: 0, production: 3, install: 5, prod_review: 5, sales_close: 6, done: 6,
  }
  return stageMap[pipeStage] ?? 0
}

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function googleCalLink(project: ProjectRow): string {
  if (!project.install_date) return ''
  const title = encodeURIComponent(`Wrap Install — ${project.title}`)
  const date = project.install_date.replace(/-/g, '')
  const loc = encodeURIComponent(project.install_address || '4124 124th St NW, Gig Harbor WA 98332')
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}/${date}&location=${loc}`
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProjectPortalClient({
  project: initial,
  customer,
  estimate,
  lineItems,
  proofs: initialProofs,
  photos,
  invoice,
  messages: initialMessages,
  orgName,
}: ProjectPortalClientProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [proofs, setProofs] = useState<ProofRow[]>(initialProofs)
  const [msgBody, setMsgBody] = useState('')
  const [senderName, setSenderName] = useState(customer?.name || '')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [msgSent, setMsgSent] = useState(false)

  // Quote approval
  const [quoteAction, setQuoteAction] = useState<'approved' | 'changes_requested' | null>(null)
  const [changeNotes, setChangeNotes] = useState('')
  const [quoteSubmitting, setQuoteSubmitting] = useState(false)
  const [quoteResult, setQuoteResult] = useState<string | null>(null)

  // Design proof approval
  const [proofAction, setProofAction] = useState<Record<string, 'approved' | 'revision'>>({})
  const [proofFeedback, setProofFeedback] = useState<Record<string, string>>({})
  const [proofSubmitting, setProofSubmitting] = useState<Record<string, boolean>>({})

  // Lightbox
  const [lightbox, setLightbox] = useState<string | null>(null)

  // Sections expanded/collapsed
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['quote', 'proofs', 'photos', 'appointment', 'messages', 'invoice'])
  )

  const stageIdx = getPortalStageIndex(initial.pipe_stage)
  const sc = STAGE_CONFIG[initial.pipe_stage] || STAGE_CONFIG.sales_in
  const StageIcon = sc.icon
  const customerName = customer?.name?.split(' ')[0] || 'there'

  function toggleSection(key: string) {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ── Submit quote action ──────────────────────────────────────────────────────
  async function submitQuoteAction(action: 'approved' | 'changes_requested') {
    setQuoteSubmitting(true)
    try {
      const res = await fetch('/api/portal/quote-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: initial.id,
          portal_token: initial.portal_token,
          action,
          customer_name: customer?.name,
          notes: action === 'changes_requested' ? changeNotes : undefined,
        }),
      })
      if (res.ok) {
        setQuoteAction(action)
        setQuoteResult(action === 'approved'
          ? 'Quote approved! Your team has been notified.'
          : 'Change request submitted. Your rep will follow up shortly.')
      }
    } catch (e) {
      console.error('Quote action error:', e)
    } finally {
      setQuoteSubmitting(false)
    }
  }

  // ── Submit proof action ──────────────────────────────────────────────────────
  async function submitProofAction(proofId: string, action: 'approved' | 'revision') {
    setProofSubmitting(prev => ({ ...prev, [proofId]: true }))
    try {
      const { error } = await supabase.from('design_proofs').update({
        customer_status: action === 'approved' ? 'approved' : 'revision_requested',
        customer_feedback: proofFeedback[proofId] || null,
        customer_approved_at: action === 'approved' ? new Date().toISOString() : null,
      }).eq('id', proofId)
      if (!error) {
        setProofs(prev => prev.map(p => p.id === proofId
          ? { ...p, customer_status: action === 'approved' ? 'approved' : 'revision_requested' }
          : p
        ))
        setProofAction(prev => ({ ...prev, [proofId]: action }))
      }
    } catch (e) {
      console.error('Proof action error:', e)
    } finally {
      setProofSubmitting(prev => ({ ...prev, [proofId]: false }))
    }
  }

  // ── Send message ─────────────────────────────────────────────────────────────
  async function sendMessage() {
    if (!msgBody.trim() || !senderName.trim()) return
    setSendingMsg(true)
    try {
      const { data, error } = await supabase.from('portal_messages').insert({
        project_id: initial.id,
        org_id: initial.org_id,
        portal_token: initial.portal_token,
        sender_name: senderName.trim(),
        body: msgBody.trim(),
        direction: 'customer',
      }).select().single()
      if (!error && data) {
        setMessages(prev => [...prev, data])
        setMsgBody('')
        setMsgSent(true)
        setTimeout(() => setMsgSent(false), 3000)
      }
    } catch (e) {
      console.error('Message error:', e)
    } finally {
      setSendingMsg(false)
    }
  }

  // ── Section header helper ────────────────────────────────────────────────────
  function SectionHeader({ id, title, icon: Icon, color, badge }: {
    id: string; title: string; icon: typeof Clock; color?: string; badge?: string
  }) {
    const open = expandedSections.has(id)
    return (
      <button
        onClick={() => toggleSection(id)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: open ? `1px solid ${C.border}` : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon size={16} color={color || C.accent} />
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>{title}</span>
          {badge && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${C.accent}20`, color: C.accent }}>
              {badge}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={16} color={C.text3} /> : <ChevronDown size={16} color={C.text3} />}
      </button>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} />
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '16px 20px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 900, color: C.text1, letterSpacing: 1 }}>
              USA WRAP CO
            </div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Customer Portal</div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <a href="tel:2535258148" style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.text2, textDecoration: 'none', fontSize: 13 }}>
              <Phone size={14} /> 253-525-8148
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px' }}>

        {/* Greeting + Job Title */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: C.text3, marginBottom: 4 }}>Hey {customerName},</div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 900, color: C.text1, lineHeight: 1.1 }}>
            {initial.title}
          </div>
          {initial.vehicle_desc && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: C.text2, fontSize: 13 }}>
              <Car size={14} /> {initial.vehicle_desc}
            </div>
          )}
        </div>

        {/* Progress Tracker */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${sc.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <StageIcon size={16} color={sc.color} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: sc.color }}>{sc.label}</div>
              <div style={{ fontSize: 11, color: C.text3 }}>Current stage</div>
            </div>
          </div>

          {/* Stage dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {PORTAL_STAGES.map((stage, i) => {
              const isDone = i < stageIdx
              const isCurrent = i === stageIdx
              const isFuture = i > stageIdx
              return (
                <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: i < PORTAL_STAGES.length - 1 ? 1 : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone ? C.green : isCurrent ? C.accent : C.surface2,
                      border: `2px solid ${isDone ? C.green : isCurrent ? C.accent : C.border}`,
                      flexShrink: 0,
                    }}>
                      {isDone
                        ? <CheckCircle2 size={14} color="#fff" />
                        : isCurrent
                          ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                          : <Circle size={10} color={C.text3} />}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? C.text1 : C.text3, whiteSpace: 'nowrap', letterSpacing: 0.3 }}>
                      {stage.label}
                    </div>
                  </div>
                  {i < PORTAL_STAGES.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: isDone ? C.green : C.border, margin: '0 4px', marginBottom: 18 }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Job Summary Card */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 1, marginBottom: 12 }}>YOUR JOB</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: C.text3, marginBottom: 2 }}>Service</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>{initial.type || 'Vehicle Wrap'}</div>
            </div>
            {initial.install_date && (
              <div>
                <div style={{ fontSize: 11, color: C.text3, marginBottom: 2 }}>Install Date</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>{fmt(initial.install_date)}</div>
              </div>
            )}
            {customer?.phone && (
              <div>
                <div style={{ fontSize: 11, color: C.text3, marginBottom: 2 }}>Your Phone</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>{customer.phone}</div>
              </div>
            )}
            {customer?.email && (
              <div>
                <div style={{ fontSize: 11, color: C.text3, marginBottom: 2 }}>Your Email</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.email}</div>
              </div>
            )}
          </div>
        </div>

        {/* Quote / Estimate Section */}
        {(estimate || lineItems.length > 0) && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
            <SectionHeader id="quote" title="Your Quote" icon={FileText} color={C.accent}
              badge={quoteAction === 'approved' ? 'Approved' : quoteAction === 'changes_requested' ? 'Changes Requested' : undefined}
            />
            {expandedSections.has('quote') && (
              <div style={{ padding: 20 }}>
                {/* Line items */}
                {lineItems.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    {lineItems.map((item, i) => (
                      <div key={item.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        padding: '12px 0', borderBottom: i < lineItems.length - 1 ? `1px solid ${C.border}` : 'none',
                      }}>
                        <div style={{ flex: 1, marginRight: 16 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>{item.name}</div>
                          {item.description && (
                            <div style={{ fontSize: 12, color: C.text2, marginTop: 3, lineHeight: 1.4 }}>{item.description}</div>
                          )}
                          {item.quantity !== 1 && (
                            <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>Qty: {item.quantity} × {money(item.unit_price)}</div>
                          )}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.text1, whiteSpace: 'nowrap' }}>
                          {money(item.total_price)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totals */}
                {estimate && (
                  <div style={{ background: C.surface2, borderRadius: 10, padding: 14 }}>
                    {estimate.discount_percent && estimate.discount_percent > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: C.text2 }}>Subtotal</span>
                        <span style={{ fontSize: 13, color: C.text1 }}>{money(estimate.subtotal)}</span>
                      </div>
                    )}
                    {estimate.discount_percent && estimate.discount_percent > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: C.green }}>Discount ({estimate.discount_percent}%)</span>
                        <span style={{ fontSize: 13, color: C.green }}>-{money((estimate.subtotal * estimate.discount_percent) / 100)}</span>
                      </div>
                    )}
                    {estimate.tax_amount && estimate.tax_amount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: C.text2 }}>Tax ({estimate.tax_percent}%)</span>
                        <span style={{ fontSize: 13, color: C.text1 }}>{money(estimate.tax_amount)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: C.text1 }}>Total</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: C.text1, fontFamily: 'JetBrains Mono, monospace' }}>{money(estimate.total)}</span>
                    </div>
                  </div>
                )}

                {/* Approve / Request Changes */}
                {!quoteResult && initial.pipe_stage === 'sales_in' && (
                  <div style={{ marginTop: 20 }}>
                    {quoteAction === 'changes_requested' ? (
                      <div>
                        <textarea
                          value={changeNotes}
                          onChange={e => setChangeNotes(e.target.value)}
                          placeholder="Describe what you'd like changed..."
                          rows={3}
                          style={{
                            width: '100%', padding: '10px 14px', background: C.surface2,
                            border: `1px solid ${C.border}`, borderRadius: 10, color: C.text1,
                            fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                          <button
                            onClick={() => submitQuoteAction('changes_requested')}
                            disabled={!changeNotes.trim() || quoteSubmitting}
                            style={{ flex: 1, padding: '10px 16px', background: C.amber, color: '#000', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, opacity: quoteSubmitting ? 0.6 : 1 }}
                          >
                            {quoteSubmitting ? 'Sending…' : 'Submit Changes'}
                          </button>
                          <button onClick={() => setQuoteAction(null)} style={{ padding: '10px 16px', background: C.surface2, color: C.text2, border: `1px solid ${C.border}`, borderRadius: 10, cursor: 'pointer', fontSize: 13 }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          onClick={() => submitQuoteAction('approved')}
                          disabled={quoteSubmitting}
                          style={{ flex: 1, padding: '12px 16px', background: C.green, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: quoteSubmitting ? 0.6 : 1 }}
                        >
                          <ThumbsUp size={16} /> Approve Quote
                        </button>
                        <button
                          onClick={() => setQuoteAction('changes_requested')}
                          style={{ flex: 1, padding: '12px 16px', background: C.surface2, color: C.text2, border: `1px solid ${C.border}`, borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                        >
                          Request Changes
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {quoteResult && (
                  <div style={{ marginTop: 16, padding: 14, background: quoteAction === 'approved' ? `${C.green}15` : `${C.amber}15`, borderRadius: 10, border: `1px solid ${quoteAction === 'approved' ? C.green : C.amber}30` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={16} color={quoteAction === 'approved' ? C.green : C.amber} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: quoteAction === 'approved' ? C.green : C.amber }}>
                        {quoteResult}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Design Proofs Section */}
        {proofs.length > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
            <SectionHeader id="proofs" title="Design Proofs" icon={Package} color={C.purple}
              badge={`${proofs.filter(p => p.customer_status === 'approved').length}/${proofs.length} Approved`}
            />
            {expandedSections.has('proofs') && (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {proofs.map(proof => {
                  const isApproved = proof.customer_status === 'approved' || proofAction[proof.id] === 'approved'
                  const isRevision = proof.customer_status === 'revision_requested' || proofAction[proof.id] === 'revision'
                  const imgUrl = proof.image_url || proof.thumbnail_url
                  return (
                    <div key={proof.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                      {imgUrl && (
                        <div
                          style={{ position: 'relative', cursor: 'pointer', background: C.surface2 }}
                          onClick={() => setLightbox(imgUrl)}
                        >
                          <img src={imgUrl} alt={`Design v${proof.version_number}`} style={{ width: '100%', maxHeight: 280, objectFit: 'contain', display: 'block' }} />
                          <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,.6)', borderRadius: 6, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ZoomIn size={12} color="#fff" />
                            <span style={{ fontSize: 11, color: '#fff' }}>Zoom</span>
                          </div>
                        </div>
                      )}
                      <div style={{ padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>Version {proof.version_number}</div>
                          {isApproved && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: `${C.green}20`, color: C.green }}>Approved</span>
                          )}
                          {isRevision && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: `${C.amber}20`, color: C.amber }}>Revision Requested</span>
                          )}
                        </div>
                        {proof.designer_notes && (
                          <div style={{ fontSize: 12, color: C.text2, marginBottom: 10, lineHeight: 1.5 }}>{proof.designer_notes}</div>
                        )}

                        {!isApproved && !isRevision && (
                          <div>
                            {proofAction[proof.id] === 'revision' ? (
                              <div>
                                <textarea
                                  value={proofFeedback[proof.id] || ''}
                                  onChange={e => setProofFeedback(prev => ({ ...prev, [proof.id]: e.target.value }))}
                                  placeholder="Describe what you'd like changed..."
                                  rows={2}
                                  style={{ width: '100%', padding: '8px 12px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text1, fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                                />
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                  <button
                                    onClick={() => submitProofAction(proof.id, 'revision')}
                                    disabled={proofSubmitting[proof.id]}
                                    style={{ flex: 1, padding: '8px 14px', background: C.amber, color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                                  >
                                    {proofSubmitting[proof.id] ? 'Submitting…' : 'Request Revision'}
                                  </button>
                                  <button
                                    onClick={() => setProofAction(prev => { const n = { ...prev }; delete n[proof.id]; return n })}
                                    style={{ padding: '8px 14px', background: C.surface2, color: C.text2, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', fontSize: 12 }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  onClick={() => submitProofAction(proof.id, 'approved')}
                                  disabled={proofSubmitting[proof.id]}
                                  style={{ flex: 1, padding: '9px 14px', background: C.green, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                >
                                  <ThumbsUp size={14} /> Approve Design
                                </button>
                                <button
                                  onClick={() => setProofAction(prev => ({ ...prev, [proof.id]: 'revision' }))}
                                  style={{ flex: 1, padding: '9px 14px', background: C.surface2, color: C.text2, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                                >
                                  Request Revision
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Photos Section */}
        {photos.length > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
            <SectionHeader id="photos" title="Job Photos" icon={Image} color={C.cyan} badge={`${photos.length}`} />
            {expandedSections.has('photos') && (
              <div style={{ padding: 20 }}>
                {(['before', 'after', 'in_progress'] as const).map(cat => {
                  const catPhotos = photos.filter(p =>
                    cat === 'in_progress' ? (p.category === 'in_progress' || p.category === 'install') : p.category === cat
                  )
                  if (catPhotos.length === 0) return null
                  const labels: Record<string, string> = { before: 'Before', after: 'After', in_progress: 'In Progress' }
                  return (
                    <div key={cat} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 1, marginBottom: 10 }}>
                        {labels[cat]}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {catPhotos.map(photo => (
                          <div
                            key={photo.id}
                            onClick={() => setLightbox(photo.image_url)}
                            style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: C.surface2 }}
                          >
                            <img src={photo.image_url} alt={photo.description || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Appointment Section */}
        {initial.install_date && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
            <SectionHeader id="appointment" title="Appointment" icon={CalendarCheck} color={C.green} />
            {expandedSections.has('appointment') && (
              <div style={{ padding: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                  <div style={{ padding: 14, background: C.surface2, borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: C.text3, marginBottom: 4 }}>Date</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text1 }}>{fmt(initial.install_date)}</div>
                  </div>
                  <div style={{ padding: 14, background: C.surface2, borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: C.text3, marginBottom: 4 }}>Location</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text1, lineHeight: 1.3 }}>
                      {initial.is_mobile_install && initial.install_address
                        ? initial.install_address
                        : '4124 124th St NW\nGig Harbor, WA 98332'}
                    </div>
                  </div>
                </div>
                {googleCalLink(initial) && (
                  <a
                    href={googleCalLink(initial)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text1, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}
                  >
                    <Calendar size={15} /> Add to Google Calendar
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Messages Section */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
          <SectionHeader id="messages" title="Messages" icon={MessageSquare} color={C.accent}
            badge={messages.filter(m => m.direction === 'team').length > 0 ? `${messages.filter(m => m.direction === 'team').length} replies` : undefined}
          />
          {expandedSections.has('messages') && (
            <div style={{ padding: 20 }}>
              {/* Message thread */}
              {messages.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, maxHeight: 300, overflowY: 'auto' }}>
                  {messages.map(msg => {
                    const isCustomer = msg.direction === 'customer'
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isCustomer ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '80%', padding: '10px 14px', borderRadius: isCustomer ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                          background: isCustomer ? C.accent : C.surface2,
                          border: `1px solid ${isCustomer ? C.accent : C.border}`,
                        }}>
                          {!isCustomer && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.cyan, marginBottom: 4 }}>{msg.sender_name}</div>
                          )}
                          <div style={{ fontSize: 13, color: isCustomer ? '#fff' : C.text1, lineHeight: 1.4 }}>{msg.body}</div>
                          <div style={{ fontSize: 10, color: isCustomer ? 'rgba(255,255,255,.6)' : C.text3, marginTop: 4 }}>
                            {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Sender name */}
              {!customer?.name && (
                <input
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  placeholder="Your name"
                  style={{ width: '100%', padding: '10px 14px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text1, fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
                />
              )}

              {/* Message input */}
              <div style={{ display: 'flex', gap: 10 }}>
                <textarea
                  value={msgBody}
                  onChange={e => setMsgBody(e.target.value)}
                  placeholder="Send a message to the team…"
                  rows={2}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  style={{ flex: 1, padding: '10px 14px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text1, fontSize: 13, resize: 'none', outline: 'none' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!msgBody.trim() || !senderName.trim() || sendingMsg}
                  style={{ padding: '0 16px', background: C.accent, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !msgBody.trim() || !senderName.trim() ? 0.5 : 1 }}
                >
                  {msgSent ? <CheckCheck size={18} /> : <Send size={18} />}
                </button>
              </div>
              {msgSent && (
                <div style={{ fontSize: 12, color: C.green, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCheck size={12} /> Message sent!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Invoice / Payment Section */}
        {invoice && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
            <SectionHeader id="invoice" title="Invoice & Payment" icon={Receipt} color={C.amber} />
            {expandedSections.has('invoice') && (
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.text3, marginBottom: 2 }}>
                      {invoice.invoice_number ? `Invoice #${invoice.invoice_number}` : 'Invoice'}
                    </div>
                    {invoice.due_date && (
                      <div style={{ fontSize: 12, color: C.text2 }}>Due {fmt(invoice.due_date)}</div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                    background: invoice.status === 'paid' ? `${C.green}20` : invoice.status === 'partial' ? `${C.amber}20` : `${C.red}20`,
                    color: invoice.status === 'paid' ? C.green : invoice.status === 'partial' ? C.amber : C.red,
                  }}>
                    {invoice.status === 'paid' ? 'Paid' : invoice.status === 'partial' ? 'Partial' : 'Unpaid'}
                  </span>
                </div>

                <div style={{ background: C.surface2, borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: C.text2 }}>Total</span>
                    <span style={{ fontSize: 13, color: C.text1, fontFamily: 'JetBrains Mono, monospace' }}>{money(invoice.total)}</span>
                  </div>
                  {invoice.amount_paid > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: C.green }}>Paid</span>
                      <span style={{ fontSize: 13, color: C.green, fontFamily: 'JetBrains Mono, monospace' }}>-{money(invoice.amount_paid)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.text1 }}>Balance Due</span>
                    <span style={{ fontSize: 17, fontWeight: 800, color: (invoice as any).balance_due > 0 ? C.red : C.green, fontFamily: 'JetBrains Mono, monospace' }}>
                      {money((invoice as any).balance_due)}
                    </span>
                  </div>
                </div>

                {(invoice as any).balance_due > 0 && (
                  <div style={{ marginTop: 14, padding: 14, background: `${C.accent}10`, borderRadius: 10, border: `1px solid ${C.accent}30` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CreditCard size={15} color={C.accent} />
                      <span style={{ fontSize: 13, color: C.text2 }}>
                        To pay, contact us at{' '}
                        <a href="tel:2535258148" style={{ color: C.accent }}>253-525-8148</a>
                        {' '}or{' '}
                        <a href="mailto:sales@usawrapco.com" style={{ color: C.accent }}>sales@usawrapco.com</a>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 32, padding: 20, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800, color: C.text3, letterSpacing: 1, marginBottom: 6 }}>
            USA WRAP CO
          </div>
          <div style={{ fontSize: 12, color: C.text3, lineHeight: 1.6 }}>
            4124 124th St NW, Gig Harbor, WA 98332<br />
            <a href="tel:2535258148" style={{ color: C.text3 }}>253-525-8148</a>
            {' · '}
            <a href="mailto:sales@usawrapco.com" style={{ color: C.text3 }}>sales@usawrapco.com</a>
          </div>
        </div>
      </div>
    </div>
  )
}
