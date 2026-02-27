'use client'

import { useState, useEffect } from 'react'
import {
  X, Send, Copy, Eye, CheckCircle2, Link2, Download,
  FileText, Package, ChevronRight, Loader2, Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  type ProposalStatus, PROPOSAL_STATUS_CONFIG, DEFAULT_DEPOSIT,
} from '@/lib/proposals'

interface ProposalSlideOverProps {
  open: boolean
  onClose: () => void
  estimateId: string
  customerId: string | null
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  lineItems: Array<{
    id: string
    name: string
    salePrice: number
    gpm: number
    type: string
  }>
  totalPrice: number
  totalGPM: number
}

const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

export default function ProposalSlideOver({
  open, onClose, estimateId, customerId, customerName,
  customerEmail, customerPhone, lineItems, totalPrice, totalGPM,
}: ProposalSlideOverProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [proposalId, setProposalId] = useState<string | null>(null)
  const [publicToken, setPublicToken] = useState<string | null>(null)
  const [status, setStatus] = useState<ProposalStatus>('draft')
  const [linkCopied, setLinkCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  // Proposal data
  const [packages, setPackages] = useState<any[]>([])
  const [sentAt, setSentAt] = useState<string | null>(null)
  const [viewedAt, setViewedAt] = useState<string | null>(null)
  const [expirationDate, setExpirationDate] = useState('')
  const [depositAmount, setDepositAmount] = useState(DEFAULT_DEPOSIT)

  // Init proposal when opened
  useEffect(() => {
    if (!open || proposalId) return
    async function init() {
      setLoading(true)
      try {
        const res = await fetch('/api/proposals/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estimate_id: estimateId }),
        })
        const json = await res.json()
        if (!json.proposal) { setLoading(false); return }
        setProposalId(json.proposal.id)
        setPublicToken(json.proposal.public_token)

        const fullRes = await fetch(`/api/proposals/${json.proposal.id}`)
        const full = await fullRes.json()
        if (full.proposal) {
          setStatus(full.proposal.status || 'draft')
          setSentAt(full.proposal.sent_at)
          setViewedAt(full.proposal.viewed_at)
          setDepositAmount(full.proposal.deposit_amount ?? DEFAULT_DEPOSIT)
          setExpirationDate(full.proposal.expiration_date
            ? full.proposal.expiration_date.split('T')[0]
            : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0])
        }
        if (full.packages?.length > 0) {
          setPackages(full.packages)
        }
      } catch (err) {
        console.error('[ProposalSlideOver] init error:', err)
      }
      setLoading(false)
    }
    init()
  }, [open, estimateId, proposalId])

  const proposalUrl = publicToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/proposal/${publicToken}` : ''
  const statusCfg = PROPOSAL_STATUS_CONFIG[status] || PROPOSAL_STATUS_CONFIG.draft

  const copyLink = () => {
    if (!proposalUrl) return
    navigator.clipboard.writeText(proposalUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleSendToPortal = async () => {
    if (!proposalId) return
    setSending(true)
    try {
      const res = await fetch(`/api/proposals/${proposalId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerEmail || null,
          send_sms: !!customerPhone,
          phone: customerPhone || null,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setStatus('sent')
        setSentAt(new Date().toISOString())
      }
    } catch {}
    setSending(false)
  }

  const fM = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 998,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            transition: 'opacity 200ms ease',
          }}
        />
      )}

      {/* Slide-over panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: open ? 480 : 0,
        maxWidth: '100vw',
        zIndex: 999,
        background: 'var(--bg)',
        borderLeft: open ? '1px solid var(--border)' : 'none',
        boxShadow: open ? '-8px 0 32px rgba(0,0,0,0.5)' : 'none',
        transition: 'width 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {open && (
          <>
            {/* ─── Header ──────────────────────────────────────────────────── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
              background: 'var(--surface)', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={18} style={{ color: 'var(--accent)' }} />
                <span style={{
                  fontSize: 16, fontWeight: 800, color: 'var(--text1)',
                  fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  Proposal Preview
                </span>
                <span style={{
                  padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                  background: statusCfg.bg, color: statusCfg.color,
                  textTransform: 'uppercase',
                }}>
                  {statusCfg.label}
                </span>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', color: 'var(--text3)',
                  cursor: 'pointer', padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* ─── Body — Live Preview ─────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 40, color: 'var(--text2)', justifyContent: 'center' }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Loading proposal...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Company Header */}
                  <div style={{
                    textAlign: 'center', padding: '24px 16px',
                    background: 'linear-gradient(135deg, rgba(79,127,255,0.08), rgba(34,211,238,0.06))',
                    borderRadius: 12, border: '1px solid rgba(79,127,255,0.15)',
                  }}>
                    <div style={{
                      fontSize: 22, fontWeight: 900, color: 'var(--text1)',
                      fontFamily: headingFont, textTransform: 'uppercase',
                      letterSpacing: '0.08em', marginBottom: 4,
                    }}>
                      USA WRAP CO
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Custom Vehicle Wrap Proposal
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div style={{
                    padding: 16, borderRadius: 10,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontFamily: headingFont }}>
                      Prepared For
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>
                      {customerName || 'Customer Name'}
                    </div>
                    {customerEmail && (
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{customerEmail}</div>
                    )}
                    <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                      <div>
                        <span style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>Deposit</span>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)', fontFamily: monoFont }}>{fM(depositAmount)}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>Expires</span>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>
                          {expirationDate ? new Date(expirationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '30 days'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Package Options */}
                  {packages.length > 0 ? (
                    <>
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: headingFont }}>
                        Choose Your Package
                      </div>
                      {packages.map((pkg: any, i: number) => (
                        <div key={pkg.id || i} style={{
                          padding: 16, borderRadius: 12,
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          position: 'relative', overflow: 'hidden',
                        }}>
                          {pkg.badge && (
                            <div style={{
                              position: 'absolute', top: 0, right: 0,
                              padding: '4px 12px', borderRadius: '0 0 0 8px',
                              background: pkg.badge === 'Most Popular' ? 'var(--accent)' : pkg.badge === 'Premium' ? 'var(--purple)' : 'var(--green)',
                              color: '#fff', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}>
                              {pkg.badge}
                            </div>
                          )}
                          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text1)', fontFamily: headingFont, textTransform: 'uppercase', marginBottom: 4 }}>
                            {pkg.name || `Option ${String.fromCharCode(65 + i)}`}
                          </div>
                          {pkg.description && (
                            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>{pkg.description}</div>
                          )}
                          {pkg.includes?.filter(Boolean).map((inc: string, j: number) => (
                            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text1)', marginBottom: 3 }}>
                              <CheckCircle2 size={12} style={{ color: 'var(--green)', flexShrink: 0 }} />
                              {inc}
                            </div>
                          ))}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)', fontFamily: monoFont }}>
                              {fM(pkg.price || 0)}
                            </div>
                            <div style={{
                              padding: '8px 20px', borderRadius: 8,
                              background: 'var(--accent)', color: '#fff',
                              fontSize: 12, fontWeight: 700, fontFamily: headingFont,
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>
                              Select This Option
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    /* Line items when no packages exist yet */
                    <>
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: headingFont }}>
                        Estimate Summary
                      </div>
                      {lineItems.map(item => (
                        <div key={item.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 14px', borderRadius: 8,
                          background: 'var(--surface)', border: '1px solid var(--border)',
                        }}>
                          <span style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>{item.name}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)', fontFamily: monoFont }}>{fM(item.salePrice)}</span>
                        </div>
                      ))}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 14px', borderRadius: 8,
                        background: 'rgba(34,192,122,0.06)', border: '1px solid rgba(34,192,122,0.15)',
                      }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', fontFamily: headingFont, textTransform: 'uppercase' }}>Total</span>
                        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)', fontFamily: monoFont }}>{fM(totalPrice)}</span>
                      </div>
                    </>
                  )}

                  {/* Terms & Conditions */}
                  <div style={{
                    padding: 14, borderRadius: 10,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                  }}>
                    <button
                      onClick={() => setShowTerms(!showTerms)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text2)', fontSize: 12, fontWeight: 700,
                      }}
                    >
                      <span>Terms & Conditions</span>
                      <ChevronRight size={14} style={{ transform: showTerms ? 'rotate(90deg)' : 'none', transition: 'transform 150ms ease' }} />
                    </button>
                    {showTerms && (
                      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
                        All work is performed by licensed and insured professionals. A deposit of {fM(depositAmount)} is required to schedule installation. Balance due upon completion. All materials come with manufacturer warranty. Custom designs remain property of USA Wrap Co until paid in full. Cancellations within 48 hours receive a full refund.
                      </div>
                    )}
                  </div>

                  {/* Signature Line */}
                  <div style={{
                    padding: 16, borderRadius: 10,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontFamily: headingFont }}>
                      Customer Signature
                    </div>
                    <div style={{
                      height: 60, borderRadius: 8, border: '1px dashed var(--border)',
                      background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>Sign here to accept</span>
                    </div>
                  </div>

                  {/* Status timeline */}
                  {sentAt && (
                    <div style={{
                      padding: 12, borderRadius: 8,
                      background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.15)',
                      display: 'flex', flexDirection: 'column', gap: 6,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--accent)' }}>
                        <Send size={10} /> Sent {new Date(sentAt).toLocaleString()}
                      </div>
                      {viewedAt && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--cyan)' }}>
                          <Eye size={10} /> Viewed {new Date(viewedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─── Footer Actions ──────────────────────────────────────────── */}
            <div style={{
              padding: '14px 20px', borderTop: '1px solid var(--border)',
              background: 'var(--surface)', display: 'flex', gap: 8, flexShrink: 0,
            }}>
              <button onClick={handleSendToPortal} disabled={sending} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px', borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: '#fff',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em',
                opacity: sending ? 0.7 : 1,
              }}>
                {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                Send to Portal
              </button>
              <button onClick={copyLink} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px 14px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface2)',
                color: 'var(--text2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: headingFont, textTransform: 'uppercase',
              }}>
                {linkCopied ? <CheckCircle2 size={14} style={{ color: 'var(--green)' }} /> : <Copy size={14} />}
                {linkCopied ? 'Copied' : 'Link'}
              </button>
              <button
                onClick={() => publicToken && window.open(`/api/pdf/proposal/${publicToken}`, '_blank')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 14px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--surface2)',
                  color: 'var(--text2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: headingFont, textTransform: 'uppercase',
                }}
              >
                <Download size={14} /> PDF
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile: override to full screen */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="width: 480"] { width: 100vw !important; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
