'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Send, Copy, Eye, Save, Plus, Trash2, GripVertical,
  CheckCircle2, Clock, Mail, MessageSquare, Loader2,
  ChevronDown, Image, Video, X, Sparkles, Package,
  Calendar, Link2, AlertTriangle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  type Proposal, type ProposalPackage, type ProposalUpsell, type ProposalStatus,
  BADGE_OPTIONS, COMMON_UPSELLS, PROPOSAL_STATUS_CONFIG, DEFAULT_DEPOSIT,
} from '@/lib/proposals'

interface ProposalBuilderProps {
  estimateId: string
  customerId: string | null
  customerEmail: string | null
  customerName: string | null
  customerPhone: string | null
}

const C = {
  bg: '#0d0f14', surface: '#13151c', surface2: '#1a1d27', border: '#1e2738',
  accent: '#4f7fff', green: '#22c07a', red: '#f25a5a', amber: '#f59e0b',
  cyan: '#22d3ee', purple: '#8b5cf6',
  text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
}

const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: C.surface2,
  border: `1px solid ${C.border}`, borderRadius: 8, color: C.text1,
  fontSize: 14, fontFamily: 'inherit', outline: 'none',
}

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 20px', background: C.accent, border: 'none',
  borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700,
  cursor: 'pointer', fontFamily: headingFont, letterSpacing: '0.03em',
}

const btnSecondary: React.CSSProperties = {
  ...btnPrimary,
  background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`,
  color: C.text2,
}

interface LocalPackage {
  _key: string
  name: string
  badge: string
  description: string
  price: string
  includes: string[]
  photos: string[]
  video_url: string
}

interface LocalUpsell {
  _key: string
  name: string
  description: string
  price: string
  photo_url: string
  badge: string
}

export default function ProposalBuilder({
  estimateId, customerId, customerEmail, customerName, customerPhone,
}: ProposalBuilderProps) {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [proposalId, setProposalId] = useState<string | null>(null)
  const [publicToken, setPublicToken] = useState<string | null>(null)
  const [status, setStatus] = useState<ProposalStatus>('draft')

  // Form state
  const [title, setTitle] = useState('Your Custom Wrap Proposal')
  const [message, setMessage] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [depositAmount, setDepositAmount] = useState(DEFAULT_DEPOSIT.toString())

  // Packages
  const [packages, setPackages] = useState<LocalPackage[]>([])
  const [upsells, setUpsells] = useState<LocalUpsell[]>([])

  // Send modal
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [sendEmail, setSendEmail] = useState(customerEmail || '')
  const [sendSms, setSendSms] = useState(false)
  const [sendPhone, setSendPhone] = useState(customerPhone || '')
  const [sending, setSending] = useState(false)

  // Activity
  const [activity, setActivity] = useState<any[]>([])
  const [linkCopied, setLinkCopied] = useState(false)

  // Timestamps
  const [sentAt, setSentAt] = useState<string | null>(null)
  const [viewedAt, setViewedAt] = useState<string | null>(null)
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null)

  const newPkg = (): LocalPackage => ({
    _key: crypto.randomUUID(),
    name: '', badge: '', description: '', price: '',
    includes: [''], photos: [], video_url: '',
  })

  const newUps = (): LocalUpsell => ({
    _key: crypto.randomUUID(),
    name: '', description: '', price: '', photo_url: '', badge: '',
  })

  // ─── Init: Create or load proposal ─────────────────────────────────
  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        // Try to create (returns existing if already exists)
        const res = await fetch('/api/proposals/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estimate_id: estimateId }),
        })
        const json = await res.json()
        if (!json.proposal) { setLoading(false); return }

        const pid = json.proposal.id
        setProposalId(pid)
        setPublicToken(json.proposal.public_token)

        // Now load full data
        const fullRes = await fetch(`/api/proposals/${pid}`)
        const full = await fullRes.json()
        if (full.proposal) {
          setTitle(full.proposal.title || 'Your Custom Wrap Proposal')
          setMessage(full.proposal.message || '')
          setDepositAmount((full.proposal.deposit_amount ?? DEFAULT_DEPOSIT).toString())
          setStatus(full.proposal.status || 'draft')
          setSentAt(full.proposal.sent_at)
          setViewedAt(full.proposal.viewed_at)
          setAcceptedAt(full.proposal.accepted_at)
          setPublicToken(full.proposal.public_token)
          if (full.proposal.expiration_date) {
            setExpirationDate(full.proposal.expiration_date.split('T')[0])
          } else {
            setExpirationDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0])
          }
        }

        // Packages
        if (full.packages?.length > 0) {
          setPackages(full.packages.map((p: any) => ({
            _key: p.id || crypto.randomUUID(),
            name: p.name || '',
            badge: p.badge || '',
            description: p.description || '',
            price: p.price?.toString() || '',
            includes: p.includes?.length ? p.includes : [''],
            photos: p.photos || [],
            video_url: p.video_url || '',
          })))
        } else {
          setPackages([
            { ...newPkg(), name: 'Good' },
            { ...newPkg(), name: 'Better', badge: 'Most Popular' },
            { ...newPkg(), name: 'Best', badge: 'Premium' },
          ])
        }

        // Upsells
        if (full.upsells?.length > 0) {
          setUpsells(full.upsells.map((u: any) => ({
            _key: u.id || crypto.randomUUID(),
            name: u.name || '',
            description: u.description || '',
            price: u.price?.toString() || '',
            photo_url: u.photo_url || '',
            badge: u.badge || '',
          })))
        }
      } catch (err) {
        console.error('[ProposalBuilder] init error:', err)
      }
      setLoading(false)
    }
    init()
  }, [estimateId])

  // ─── Load activity feed ────────────────────────────────────────────
  useEffect(() => {
    if (!proposalId) return
    async function loadActivity() {
      const res = await fetch(`/api/activity-log?entity_type=proposal&entity_id=${proposalId}&limit=20`)
      const json = await res.json()
      if (json.logs) setActivity(json.logs)
    }
    loadActivity()
  }, [proposalId, status])

  // ─── Save ──────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!proposalId) return
    setSaving(true)
    try {
      await fetch(`/api/proposals/${proposalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message: message || null,
          expiration_date: expirationDate ? new Date(expirationDate).toISOString() : null,
          deposit_amount: Number(depositAmount) || DEFAULT_DEPOSIT,
          packages: packages.map(p => ({
            name: p.name || 'Untitled Package',
            badge: p.badge || null,
            description: p.description || null,
            price: Number(p.price) || 0,
            includes: p.includes.filter(Boolean),
            photos: p.photos,
            video_url: p.video_url || null,
          })),
          upsells: upsells.map(u => ({
            name: u.name || 'Untitled Upsell',
            description: u.description || null,
            price: Number(u.price) || 0,
            photo_url: u.photo_url || null,
            badge: u.badge || null,
          })),
        }),
      })
    } catch (err) {
      console.error('[ProposalBuilder] save error:', err)
    }
    setSaving(false)
  }, [proposalId, title, message, expirationDate, depositAmount, packages, upsells])

  // ─── Send ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!proposalId) return
    await handleSave()
    setSending(true)
    try {
      const res = await fetch(`/api/proposals/${proposalId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sendEmail || null,
          send_sms: sendSms,
          phone: sendPhone || null,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setStatus('sent')
        setSentAt(new Date().toISOString())
        setSendModalOpen(false)
      }
    } catch {}
    setSending(false)
  }

  // ─── Copy link ─────────────────────────────────────────────────────
  const copyLink = () => {
    if (!publicToken) return
    const url = `${window.location.origin}/proposal/${publicToken}`
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  // ─── Package helpers ───────────────────────────────────────────────
  const updatePkg = (idx: number, field: keyof LocalPackage, value: any) => {
    setPackages(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  const addInclude = (pkgIdx: number) => {
    setPackages(prev => prev.map((p, i) =>
      i === pkgIdx ? { ...p, includes: [...p.includes, ''] } : p
    ))
  }

  const updateInclude = (pkgIdx: number, inclIdx: number, value: string) => {
    setPackages(prev => prev.map((p, i) =>
      i === pkgIdx ? { ...p, includes: p.includes.map((inc, j) => j === inclIdx ? value : inc) } : p
    ))
  }

  const removeInclude = (pkgIdx: number, inclIdx: number) => {
    setPackages(prev => prev.map((p, i) =>
      i === pkgIdx ? { ...p, includes: p.includes.filter((_, j) => j !== inclIdx) } : p
    ))
  }

  // ─── Upsell helpers ───────────────────────────────────────────────
  const updateUps = (idx: number, field: keyof LocalUpsell, value: string) => {
    setUpsells(prev => prev.map((u, i) => i === idx ? { ...u, [field]: value } : u))
  }

  const addCommonUpsells = () => {
    const common = COMMON_UPSELLS.map(u => ({
      _key: crypto.randomUUID(),
      name: u.name,
      description: u.description,
      price: u.price.toString(),
      photo_url: '',
      badge: u.badge || '',
    }))
    setUpsells(prev => [...prev, ...common])
  }

  // ─── Photo upload ──────────────────────────────────────────────────
  const uploadPhoto = async (pkgIdx: number) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const path = `proposal-photos/${proposalId}/${Date.now()}-${file.name}`
      const { data, error } = await supabase.storage.from('project-files').upload(path, file)
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(data.path)
        if (urlData?.publicUrl) {
          setPackages(prev => prev.map((p, i) =>
            i === pkgIdx ? { ...p, photos: [...p.photos, urlData.publicUrl] } : p
          ))
        }
      }
    }
    input.click()
  }

  // ─── Render ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 40, color: C.text2 }}>
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
        Loading proposal builder...
      </div>
    )
  }

  const proposalUrl = publicToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/proposal/${publicToken}` : ''
  const statusCfg = PROPOSAL_STATUS_CONFIG[status] || PROPOSAL_STATUS_CONFIG.draft

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            fontSize: 16, fontWeight: 800, fontFamily: headingFont,
            textTransform: 'uppercase', letterSpacing: '0.05em', color: C.text1,
          }}>
            Proposal Builder
          </div>
          <span style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: statusCfg.bg, color: statusCfg.color,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {statusCfg.label}
          </span>
          {sentAt && !viewedAt && (
            <span style={{ fontSize: 12, color: C.amber }}>
              <Clock size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
              Not yet opened
            </span>
          )}
          {viewedAt && (
            <span style={{ fontSize: 12, color: C.cyan }}>
              <Eye size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
              Viewed {timeAgo(viewedAt)}
            </span>
          )}
          {acceptedAt && (
            <span style={{ fontSize: 12, color: C.green }}>
              <CheckCircle2 size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
              Accepted {timeAgo(acceptedAt)}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {publicToken && (
            <button onClick={copyLink} style={btnSecondary}>
              {linkCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              {linkCopied ? 'Copied!' : 'Copy Link'}
            </button>
          )}
          {publicToken && (
            <button
              onClick={() => window.open(`/proposal/${publicToken}`, '_blank')}
              style={btnSecondary}
            >
              <Eye size={14} /> Preview
            </button>
          )}
          <button onClick={() => setSendModalOpen(true)} style={btnPrimary}>
            <Send size={14} /> Send Proposal
          </button>
        </div>
      </div>

      {/* ── Personal Message + Expiration ────────────────────── */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: 20, marginBottom: 20,
      }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6, display: 'block' }}>
            Proposal Title
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={inputStyle}
            placeholder="Your Custom Wrap Proposal"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6, display: 'block' }}>
            Personal Message
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
            placeholder="Add a personal note to your customer..."
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6, display: 'block' }}>
              Expiration Date
            </label>
            <input
              type="date"
              value={expirationDate}
              onChange={e => setExpirationDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6, display: 'block' }}>
              Deposit Amount ($)
            </label>
            <input
              type="number"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              style={{ ...inputStyle, fontFamily: monoFont }}
              placeholder="250"
            />
          </div>
        </div>
      </div>

      {/* ── Packages ─────────────────────────────────────────── */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: 20, marginBottom: 20,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
        }}>
          <div style={{
            fontSize: 14, fontWeight: 800, fontFamily: headingFont,
            textTransform: 'uppercase', letterSpacing: '0.05em', color: C.text1,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Package size={16} style={{ color: C.accent }} />
            Packages ({packages.length}/4)
          </div>
          <button
            onClick={() => packages.length < 4 && setPackages(prev => [...prev, newPkg()])}
            disabled={packages.length >= 4}
            style={{
              ...btnSecondary,
              opacity: packages.length >= 4 ? 0.4 : 1,
              cursor: packages.length >= 4 ? 'not-allowed' : 'pointer',
            }}
          >
            <Plus size={14} /> Add Package
          </button>
        </div>

        {packages.map((pkg, pkgIdx) => (
          <div key={pkg._key} style={{
            background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: 16, marginBottom: 12,
          }}>
            {/* Package header row */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
              <GripVertical size={16} style={{ color: C.text3, cursor: 'grab', flexShrink: 0 }} />
              <input
                value={pkg.name}
                onChange={e => updatePkg(pkgIdx, 'name', e.target.value)}
                placeholder="Good / Better / Best or custom"
                style={{ ...inputStyle, fontWeight: 700, flex: 1 }}
              />
              <select
                value={pkg.badge}
                onChange={e => updatePkg(pkgIdx, 'badge', e.target.value)}
                style={{ ...inputStyle, width: 160, cursor: 'pointer' }}
              >
                {BADGE_OPTIONS.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (packages.length <= 1) return
                  setPackages(prev => prev.filter((_, i) => i !== pkgIdx))
                }}
                style={{
                  background: 'none', border: 'none', cursor: packages.length <= 1 ? 'not-allowed' : 'pointer',
                  color: packages.length <= 1 ? C.text3 : C.red, padding: 6,
                  opacity: packages.length <= 1 ? 0.4 : 1,
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Description */}
            <textarea
              value={pkg.description}
              onChange={e => updatePkg(pkgIdx, 'description', e.target.value)}
              placeholder="Package description..."
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }}
            />

            {/* Price */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 4, display: 'block' }}>Price ($)</label>
              <input
                type="number"
                value={pkg.price}
                onChange={e => updatePkg(pkgIdx, 'price', e.target.value)}
                placeholder="0.00"
                style={{ ...inputStyle, fontFamily: monoFont, width: 200 }}
              />
            </div>

            {/* What's Included */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 6, display: 'block' }}>
                What&apos;s Included
              </label>
              {pkg.includes.map((inc, inclIdx) => (
                <div key={inclIdx} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                  <CheckCircle2 size={14} style={{ color: C.green, flexShrink: 0 }} />
                  <input
                    value={inc}
                    onChange={e => updateInclude(pkgIdx, inclIdx, e.target.value)}
                    placeholder="e.g. Full vehicle wrap"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={() => removeInclude(pkgIdx, inclIdx)}
                    style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', padding: 4 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addInclude(pkgIdx)}
                style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12 }}
              >
                <Plus size={12} /> Add Item
              </button>
            </div>

            {/* Photos */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {pkg.photos.map((url, photoIdx) => (
                <div key={photoIdx} style={{ position: 'relative', width: 64, height: 64 }}>
                  <img src={url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: `1px solid ${C.border}` }} />
                  <button
                    onClick={() => updatePkg(pkgIdx, 'photos', pkg.photos.filter((_, j) => j !== photoIdx))}
                    style={{
                      position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                      background: C.red, border: 'none', borderRadius: '50%', color: '#fff',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, padding: 0,
                    }}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              {pkg.photos.length < 3 && (
                <button
                  onClick={() => uploadPhoto(pkgIdx)}
                  style={{
                    width: 64, height: 64, background: C.surface,
                    border: `1px dashed ${C.border}`, borderRadius: 6,
                    color: C.text3, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Image size={20} />
                </button>
              )}
            </div>

            {/* Video URL */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Video size={14} style={{ color: C.text3, flexShrink: 0 }} />
              <input
                value={pkg.video_url}
                onChange={e => updatePkg(pkgIdx, 'video_url', e.target.value)}
                placeholder="YouTube or Vimeo URL"
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Upsells ──────────────────────────────────────────── */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: 20, marginBottom: 20,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
        }}>
          <div style={{
            fontSize: 14, fontWeight: 800, fontFamily: headingFont,
            textTransform: 'uppercase', letterSpacing: '0.05em', color: C.text1,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Sparkles size={16} style={{ color: C.amber }} />
            Add-On Upsells ({upsells.length})
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {upsells.length === 0 && (
              <button onClick={addCommonUpsells} style={{ ...btnSecondary, fontSize: 12, padding: '8px 14px' }}>
                <Sparkles size={12} /> Add Common Upsells
              </button>
            )}
            <button onClick={() => setUpsells(prev => [...prev, newUps()])} style={{ ...btnSecondary, fontSize: 12, padding: '8px 14px' }}>
              <Plus size={12} /> Add Upsell
            </button>
          </div>
        </div>

        {upsells.map((ups, upsIdx) => (
          <div key={ups._key} style={{
            background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: 14, marginBottom: 10,
            display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 10, alignItems: 'center',
          }}>
            <input
              value={ups.name}
              onChange={e => updateUps(upsIdx, 'name', e.target.value)}
              placeholder="Upsell name..."
              style={inputStyle}
            />
            <input
              type="number"
              value={ups.price}
              onChange={e => updateUps(upsIdx, 'price', e.target.value)}
              placeholder="Price"
              style={{ ...inputStyle, fontFamily: monoFont }}
            />
            <select
              value={ups.badge}
              onChange={e => updateUps(upsIdx, 'badge', e.target.value)}
              style={{ ...inputStyle, width: 140, cursor: 'pointer' }}
            >
              {BADGE_OPTIONS.map(b => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
            <button
              onClick={() => setUpsells(prev => prev.filter((_, i) => i !== upsIdx))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.red, padding: 6 }}
            >
              <Trash2 size={16} />
            </button>
            <textarea
              value={ups.description}
              onChange={e => updateUps(upsIdx, 'description', e.target.value)}
              placeholder="Brief description..."
              rows={1}
              style={{ ...inputStyle, gridColumn: '1 / -1', resize: 'vertical' }}
            />
          </div>
        ))}
      </div>

      {/* ── Bottom Actions ────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 0', borderTop: `1px solid ${C.border}`,
      }}>
        <div style={{ fontSize: 12, color: C.text3 }}>
          {publicToken && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link2 size={12} />
              {proposalUrl}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={saving} style={btnSecondary}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button onClick={() => { handleSave().then(() => setSendModalOpen(true)) }} style={btnPrimary}>
            <Send size={14} /> Send to Customer
          </button>
        </div>
      </div>

      {/* ── Activity Feed ─────────────────────────────────────── */}
      {activity.length > 0 && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: 20, marginTop: 20,
        }}>
          <div style={{
            fontSize: 14, fontWeight: 800, fontFamily: headingFont,
            textTransform: 'uppercase', letterSpacing: '0.05em', color: C.text1,
            marginBottom: 12,
          }}>
            Activity
          </div>
          {activity.map((item: any, i: number) => (
            <div key={item.id || i} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '8px 0', borderBottom: i < activity.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: item.action === 'proposal_accepted' ? C.green : item.action === 'proposal_sent' ? C.accent : C.text3,
                marginTop: 6, flexShrink: 0,
              }} />
              <div>
                <div style={{ fontSize: 13, color: C.text1 }}>
                  {activityLabel(item)}
                </div>
                <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                  {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Send Modal ────────────────────────────────────────── */}
      {sendModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setSendModalOpen(false) }}
        >
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
            padding: 28, width: 440, maxWidth: '90vw',
          }}>
            <div style={{
              fontSize: 18, fontWeight: 800, fontFamily: headingFont, marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Send size={18} style={{ color: C.accent }} />
              Send Proposal
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.text3, marginBottom: 6, display: 'block' }}>
                Customer Email
              </label>
              <input
                value={sendEmail}
                onChange={e => setSendEmail(e.target.value)}
                style={inputStyle}
                placeholder="customer@email.com"
              />
            </div>

            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setSendSms(!sendSms)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: sendSms ? C.accent : C.text3 }}
              >
                <MessageSquare size={18} />
              </button>
              <span style={{ fontSize: 13, color: C.text2 }}>Also send SMS</span>
              {sendSms && (
                <input
                  value={sendPhone}
                  onChange={e => setSendPhone(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="(555) 555-5555"
                />
              )}
            </div>

            <div style={{
              background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: 12, marginBottom: 20, fontSize: 12, color: C.text3,
              wordBreak: 'break-all',
            }}>
              <Link2 size={12} style={{ marginRight: 6, verticalAlign: -2 }} />
              {proposalUrl}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setSendModalOpen(false)} style={btnSecondary}>Cancel</button>
              <button onClick={handleSend} disabled={sending} style={btnPrimary}>
                {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                {sending ? 'Sending...' : 'Confirm Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function activityLabel(item: any): string {
  switch (item.action) {
    case 'proposal_sent': return `Proposal sent to ${item.details?.email || 'customer'}`
    case 'proposal_viewed': return 'Customer viewed proposal'
    case 'proposal_accepted': return `Customer accepted proposal — Deposit paid`
    default: return item.action?.replace(/_/g, ' ') || 'Activity'
  }
}
