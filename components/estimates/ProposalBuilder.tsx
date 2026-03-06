'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Copy, Eye, Save, Plus, Trash2, GripVertical,
  CheckCircle2, Clock, Loader2,
  ChevronDown, ChevronRight, Image, Video, X, Sparkles, Package,
  Link2, AlertTriangle, Car, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  type Proposal, type ProposalPackage, type ProposalUpsell, type ProposalStatus,
  BADGE_OPTIONS, COMMON_UPSELLS, PROPOSAL_STATUS_CONFIG, DEFAULT_DEPOSIT,
} from '@/lib/proposals'

interface EstimateLineItem {
  id: string
  name: string
  description: string | null
  totalPrice: number
  productType: string
}

interface ProposalBuilderProps {
  estimateId: string
  customerId: string | null
  customerEmail: string | null
  customerName: string | null
  customerPhone: string | null
  lineItems?: EstimateLineItem[]
  onClose?: () => void
  onProposalReady?: (proposalId: string, publicToken: string) => void
  onAddLineItem?: () => Promise<string | null>
  renderLineItemCard?: (id: string) => React.ReactNode
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

interface LocalLineItem {
  _key: string
  name: string
  description: string
  price: string
}

interface LocalPackage {
  _key: string
  name: string
  badge: string
  description: string
  price: string
  price_mode: 'auto' | 'manual'
  line_item_ids: string[]
  custom_line_items: LocalLineItem[]
  includes: string[]
  photos: string[]
  video_urls: string[]
}

interface LocalUpsell {
  _key: string
  name: string
  description: string
  price: string
  photo_url: string
  link_url: string
  video_url: string
  badge: string
}

export default function ProposalBuilder({
  estimateId, customerId, customerEmail, customerName, customerPhone,
  lineItems = [], onClose, onProposalReady, onAddLineItem, renderLineItemCard,
}: ProposalBuilderProps) {
  const supabase = createClient()
  const router = useRouter()

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
  const [depositType, setDepositType] = useState<'fixed' | 'percent_50' | 'percent_100'>('fixed')

  // Packages
  const [packages, setPackages] = useState<LocalPackage[]>([])
  const [upsells, setUpsells] = useState<LocalUpsell[]>([])

  // Temp video URL inputs per package (keyed by _key)
  const [videoInputs, setVideoInputs] = useState<Record<string, string>>({})

  // Survey vehicles (concerns section)
  const [surveyVehicles, setSurveyVehicles] = useState<any[]>([])
  const [includeInspection, setIncludeInspection] = useState(true)
  const [inspectionExpanded, setInspectionExpanded] = useState(true)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

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
    price_mode: 'auto', line_item_ids: [], custom_line_items: [],
    includes: [''], photos: [], video_urls: [],
  })

  const newUps = (): LocalUpsell => ({
    _key: crypto.randomUUID(),
    name: '', description: '', price: '', photo_url: '', link_url: '', video_url: '', badge: '',
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
        onProposalReady?.(pid, json.proposal.public_token)

        // Now load full data
        const fullRes = await fetch(`/api/proposals/${pid}`)
        const full = await fullRes.json()
        if (full.proposal) {
          setTitle(full.proposal.title || 'Your Custom Wrap Proposal')
          setMessage(full.proposal.message || '')
          setDepositAmount((full.proposal.deposit_amount ?? DEFAULT_DEPOSIT).toString())
          setDepositType(full.proposal.deposit_type || 'fixed')
          setStatus(full.proposal.status || 'draft')
          setIncludeInspection(full.proposal.include_inspection !== false)
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
            price_mode: p.price_mode || 'manual',
            line_item_ids: p.line_item_ids || [],
            custom_line_items: (p.custom_line_items || []).map((li: any) => ({
              _key: crypto.randomUUID(),
              name: li.name || '',
              description: li.description || '',
              price: li.price?.toString() || '0',
            })),
            includes: p.includes?.length ? p.includes : [''],
            photos: p.photos || [],
            video_urls: p.video_urls || (p.video_url ? [p.video_url] : []),
          })))
        } else {
          // Default: 1 section with ALL line items assigned
          setPackages([{
            ...newPkg(),
            name: 'Section 1',
            line_item_ids: lineItems.map(li => li.id),
            custom_line_items: [],
          }])
        }

        // Upsells
        if (full.upsells?.length > 0) {
          setUpsells(full.upsells.map((u: any) => ({
            _key: u.id || crypto.randomUUID(),
            name: u.name || '',
            description: u.description || '',
            price: u.price?.toString() || '',
            photo_url: u.photo_url || '',
            link_url: u.link_url || '',
            video_url: u.video_url || '',
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

  // ─── Load survey vehicles ──────────────────────────────────────────
  useEffect(() => {
    if (!estimateId) return
    supabase
      .from('estimate_survey_vehicles')
      .select(`*, estimate_survey_photos(*)`)
      .eq('estimate_id', estimateId)
      .order('sort_order')
      .then(({ data }) => {
        if (data) setSurveyVehicles(data.map((v: any) => ({
          ...v,
          photos: v.estimate_survey_photos || [],
        })))
      })
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
          deposit_type: depositType,
          include_inspection: includeInspection,
          packages: packages.map(p => {
            const hasLinkedItems = p.line_item_ids.length > 0
            const hasCustomItems = p.custom_line_items.length > 0
            const customTotal = p.custom_line_items.reduce((s, li) => s + (Number(li.price) || 0), 0)
            return {
              name: p.name || 'Untitled Section',
              badge: p.badge || null,
              description: p.description || null,
              price: hasLinkedItems || hasCustomItems ? customTotal : (Number(p.price) || 0),
              price_mode: hasLinkedItems || hasCustomItems ? 'auto' : 'manual',
              line_item_ids: p.line_item_ids,
              custom_line_items: p.custom_line_items.map(li => ({
                name: li.name, description: li.description || null, price: Number(li.price) || 0,
              })),
              includes: p.includes.filter(Boolean),
              photos: p.photos,
              video_urls: p.video_urls,
              video_url: p.video_urls[0] || null,
            }
          }),
          upsells: upsells.map(u => ({
            name: u.name || 'Untitled Upsell',
            description: u.description || null,
            price: Number(u.price) || 0,
            photo_url: u.photo_url || null,
            link_url: u.link_url || null,
            video_url: u.video_url || null,
            badge: u.badge || null,
          })),
        }),
      })
    } catch (err) {
      console.error('[ProposalBuilder] save error:', err)
    }
    setSaving(false)
  }, [proposalId, title, message, expirationDate, depositAmount, depositType, packages, upsells, includeInspection])

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

  // ─── Custom line item helpers ─────────────────────────────────────
  const addCustomLineItem = async (pkgIdx: number) => {
    // If parent provides a real line item creator, use that and link it
    if (onAddLineItem) {
      const newId = await onAddLineItem()
      if (newId) {
        setPackages(prev => prev.map((p, i) =>
          i === pkgIdx ? { ...p, line_item_ids: [...p.line_item_ids, newId] } : p
        ))
        return
      }
    }
    // Fallback: local simple item
    setPackages(prev => prev.map((p, i) =>
      i === pkgIdx ? { ...p, custom_line_items: [...p.custom_line_items, { _key: crypto.randomUUID(), name: '', description: '', price: '' }] } : p
    ))
  }

  const updateCustomLineItem = (pkgIdx: number, liIdx: number, field: keyof LocalLineItem, value: string) => {
    setPackages(prev => prev.map((p, i) =>
      i === pkgIdx ? { ...p, custom_line_items: p.custom_line_items.map((li, j) => j === liIdx ? { ...li, [field]: value } : li) } : p
    ))
  }

  const removeCustomLineItem = (pkgIdx: number, liIdx: number) => {
    setPackages(prev => prev.map((p, i) =>
      i === pkgIdx ? { ...p, custom_line_items: p.custom_line_items.filter((_, j) => j !== liIdx) } : p
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
      link_url: '',
      video_url: '',
      badge: u.badge || '',
    }))
    setUpsells(prev => [...prev, ...common])
  }

  // ─── Photo upload (package) ────────────────────────────────────────
  const uploadPhoto = async (pkgIdx: number) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,video/*'
    input.multiple = true
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      for (const file of files) {
        const path = `proposal-photos/${proposalId}/${Date.now()}-${file.name}`
        const { data, error } = await supabase.storage.from('project-files').upload(path, file)
        if (!error && data) {
          const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(data.path)
          if (urlData?.publicUrl) {
            if (file.type.startsWith('video/')) {
              setPackages(prev => prev.map((p, i) =>
                i === pkgIdx ? { ...p, video_urls: [...p.video_urls, urlData.publicUrl] } : p
              ))
            } else {
              setPackages(prev => prev.map((p, i) =>
                i === pkgIdx ? { ...p, photos: [...p.photos, urlData.publicUrl] } : p
              ))
            }
          }
        }
      }
    }
    input.click()
  }

  // ─── Photo upload (upsell) ─────────────────────────────────────────
  const uploadUpsellPhoto = async (upsIdx: number) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const path = `proposal-photos/${proposalId}/upsell-${Date.now()}-${file.name}`
      const { data, error } = await supabase.storage.from('project-files').upload(path, file)
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(data.path)
        if (urlData?.publicUrl) {
          updateUps(upsIdx, 'photo_url', urlData.publicUrl)
        }
      }
    }
    input.click()
  }

  // ─── Add video URL (package) ──────────────────────────────────────
  const addVideoUrl = (pkgIdx: number, url: string) => {
    if (!url.trim()) return
    setPackages(prev => prev.map((p, i) =>
      i === pkgIdx ? { ...p, video_urls: [...p.video_urls, url.trim()] } : p
    ))
  }

  const removeVideoUrl = (pkgIdx: number, vidIdx: number) => {
    setPackages(prev => prev.map((p, i) =>
      i === pkgIdx ? { ...p, video_urls: p.video_urls.filter((_, j) => j !== vidIdx) } : p
    ))
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
              onClick={() => router.push(`/proposal/${publicToken}`)}
              style={btnSecondary}
            >
              <Eye size={14} /> Preview
            </button>
          )}
          {onClose && (
            <button onClick={onClose} style={btnSecondary}>
              <X size={14} /> Close Proposal Builder
            </button>
          )}
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
              Deposit Required
            </label>
            {/* Preset options */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {([
                { key: 'fixed', label: '$250 Flat', calc: () => '250' },
                { key: 'percent_50', label: '50% Down', calc: () => String(Math.round(lineItems.reduce((s, li) => s + li.totalPrice, 0) * 0.5)) },
                { key: 'percent_100', label: '100% Upfront', calc: () => String(Math.round(lineItems.reduce((s, li) => s + li.totalPrice, 0))) },
              ] as { key: 'fixed' | 'percent_50' | 'percent_100'; label: string; calc: () => string }[]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setDepositType(opt.key); setDepositAmount(opt.calc()) }}
                  style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    border: `1px solid ${depositType === opt.key ? C.accent : C.border}`,
                    background: depositType === opt.key ? 'rgba(79,127,255,0.15)' : C.surface,
                    color: depositType === opt.key ? C.accent : C.text2,
                    fontFamily: headingFont, letterSpacing: '0.03em',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: C.text3, fontSize: 13 }}>$</span>
              <input
                type="number"
                value={depositAmount}
                onChange={e => { setDepositType('fixed'); setDepositAmount(e.target.value) }}
                style={{ ...inputStyle, fontFamily: monoFont, flex: 1 }}
                placeholder="250"
              />
              {depositType !== 'fixed' && (
                <span style={{ fontSize: 11, color: C.text2, whiteSpace: 'nowrap' }}>
                  {depositType === 'percent_50' ? '50%' : '100%'} of total
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sections (Packages) ──────────────────────────────── */}
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
            Sections ({packages.length}/4)
          </div>
          <button
            onClick={() => packages.length < 4 && setPackages(prev => [...prev, { ...newPkg(), name: `Section ${prev.length + 1}` }])}
            disabled={packages.length >= 4}
            style={{
              ...btnSecondary,
              opacity: packages.length >= 4 ? 0.4 : 1,
              cursor: packages.length >= 4 ? 'not-allowed' : 'pointer',
            }}
          >
            <Plus size={14} /> Add Section
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
                placeholder="Section name..."
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
              placeholder="Section description..."
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }}
            />

            {/* Line Items */}
            {lineItems.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {/* Assigned line items as rows */}
                {pkg.line_item_ids.length > 0 && (
                  <div style={{
                    border: `1px solid ${C.border}`, borderRadius: 8,
                    overflow: 'hidden', marginBottom: 8,
                  }}>
                    {pkg.line_item_ids.map(id => {
                      const li = lineItems.find(l => l.id === id)
                      if (!li) return null
                      // If parent provides full card renderer, use it
                      if (renderLineItemCard) {
                        return (
                          <div key={id} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <div style={{ padding: '4px 8px', display: 'flex', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => updatePkg(pkgIdx, 'line_item_ids', pkg.line_item_ids.filter(i => i !== id))}
                                style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}
                              >
                                <X size={10} /> Remove from section
                              </button>
                            </div>
                            {renderLineItemCard(id)}
                          </div>
                        )
                      }
                      return (
                        <div key={id} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 12px',
                          borderBottom: `1px solid ${C.border}`,
                          background: C.surface,
                        }}>
                          <span style={{ flex: 1, fontSize: 13, color: C.text1 }}>
                            {li.name || 'Untitled'}
                          </span>
                          <span style={{ fontFamily: monoFont, fontSize: 13, fontWeight: 600, color: C.text1, whiteSpace: 'nowrap' }}>
                            ${li.totalPrice.toLocaleString()}
                          </span>
                          <button
                            onClick={() => updatePkg(pkgIdx, 'line_item_ids', pkg.line_item_ids.filter(i => i !== id))}
                            style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', padding: 2, display: 'flex' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )
                    })}
                    {/* Linked items subtotal */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', background: 'rgba(34,192,122,0.06)',
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {pkg.custom_line_items.length > 0 ? 'Linked Items Subtotal' : 'Section Total'}
                      </span>
                      <span style={{ fontFamily: monoFont, fontSize: 14, fontWeight: 800, color: C.green }}>
                        ${lineItems.filter(li => pkg.line_item_ids.includes(li.id)).reduce((s, li) => s + li.totalPrice, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Add line item dropdown */}
                {(() => {
                  const allAssigned = new Set(packages.flatMap(p => p.line_item_ids))
                  const available = lineItems.filter(li => !allAssigned.has(li.id))
                  if (available.length === 0) return null
                  return (
                    <select
                      value=""
                      onChange={e => {
                        if (!e.target.value) return
                        updatePkg(pkgIdx, 'line_item_ids', [...pkg.line_item_ids, e.target.value])
                      }}
                      style={{
                        ...inputStyle, fontSize: 12, color: C.text3,
                        cursor: 'pointer', width: 'auto',
                      }}
                    >
                      <option value="">+ Add line item...</option>
                      {available.map(li => (
                        <option key={li.id} value={li.id}>
                          {li.name || 'Untitled'} — ${li.totalPrice.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  )
                })()}
              </div>
            )}

            {/* Custom Line Items */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Line Items
              </label>
              {pkg.custom_line_items.length > 0 && (
                <div style={{
                  border: `1px solid ${C.border}`, borderRadius: 8,
                  overflow: 'hidden', marginBottom: 8,
                }}>
                  {pkg.custom_line_items.map((li, liIdx) => (
                    <div key={li._key} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px',
                      borderBottom: `1px solid ${C.border}`,
                      background: C.surface,
                    }}>
                      <input
                        value={li.name}
                        onChange={e => updateCustomLineItem(pkgIdx, liIdx, 'name', e.target.value)}
                        placeholder="Item name..."
                        style={{ ...inputStyle, flex: 1, padding: '6px 10px', fontSize: 13 }}
                      />
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: 10, color: C.text3, fontSize: 13, pointerEvents: 'none' }}>$</span>
                        <input
                          type="number"
                          value={li.price}
                          onChange={e => updateCustomLineItem(pkgIdx, liIdx, 'price', e.target.value)}
                          placeholder="0.00"
                          style={{ ...inputStyle, width: 110, padding: '6px 10px 6px 22px', fontSize: 13, fontFamily: monoFont, textAlign: 'right' }}
                        />
                      </div>
                      <button
                        onClick={() => removeCustomLineItem(pkgIdx, liIdx)}
                        style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', padding: 2, display: 'flex' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {/* Custom line items total */}
                  {pkg.custom_line_items.length > 0 && (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', background: 'rgba(79,127,255,0.06)',
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {pkg.line_item_ids.length > 0 ? 'Custom Items Subtotal' : 'Section Total'}
                      </span>
                      <span style={{ fontFamily: monoFont, fontSize: 14, fontWeight: 800, color: C.accent }}>
                        ${pkg.custom_line_items.reduce((s, li) => s + (Number(li.price) || 0), 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => addCustomLineItem(pkgIdx)}
                style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12 }}
              >
                <Plus size={12} /> Add Line Item
              </button>
            </div>

            {/* Manual price — only when no line items at all */}
            {lineItems.length === 0 && pkg.custom_line_items.length === 0 && (
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
            )}

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

            {/* Photos & Videos */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Media
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
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
                {pkg.video_urls.map((vurl, vidIdx) => (
                  <div key={vidIdx} style={{ position: 'relative', width: 64, height: 64 }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: 6, border: `1px solid ${C.border}`,
                      background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexDirection: 'column', gap: 2,
                    }}>
                      <Video size={20} style={{ color: C.accent }} />
                      <span style={{ fontSize: 8, color: C.text3 }}>Video</span>
                    </div>
                    <button
                      onClick={() => removeVideoUrl(pkgIdx, vidIdx)}
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
                <button
                  onClick={() => uploadPhoto(pkgIdx)}
                  style={{
                    width: 64, height: 64, background: C.surface,
                    border: `1px dashed ${C.border}`, borderRadius: 6,
                    color: C.text3, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2,
                  }}
                >
                  <Image size={18} />
                  <span style={{ fontSize: 9 }}>Add</span>
                </button>
              </div>
              {/* Video URL input */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Video size={13} style={{ color: C.text3, flexShrink: 0 }} />
                <input
                  value={videoInputs[pkg._key] || ''}
                  onChange={e => setVideoInputs(prev => ({ ...prev, [pkg._key]: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      addVideoUrl(pkgIdx, videoInputs[pkg._key] || '')
                      setVideoInputs(prev => ({ ...prev, [pkg._key]: '' }))
                    }
                  }}
                  placeholder="YouTube or Vimeo URL — press Enter to add"
                  style={{ ...inputStyle, flex: 1, fontSize: 12 }}
                />
                <button
                  onClick={() => {
                    addVideoUrl(pkgIdx, videoInputs[pkg._key] || '')
                    setVideoInputs(prev => ({ ...prev, [pkg._key]: '' }))
                  }}
                  style={{ ...btnSecondary, padding: '7px 10px', fontSize: 12 }}
                >
                  <Plus size={12} />
                </button>
              </div>
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
          }}>
            {/* Row 1: name, price, badge, delete */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 140px auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
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
                style={{ ...inputStyle, cursor: 'pointer' }}
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
            </div>
            {/* Row 2: description */}
            <textarea
              value={ups.description}
              onChange={e => updateUps(upsIdx, 'description', e.target.value)}
              placeholder="Brief description..."
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', marginBottom: 8 }}
            />
            {/* Row 3: photo + link + video */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 8, alignItems: 'center' }}>
              {/* Photo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {ups.photo_url ? (
                  <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
                    <img src={ups.photo_url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: `1px solid ${C.border}` }} />
                    <button
                      onClick={() => updateUps(upsIdx, 'photo_url', '')}
                      style={{ position: 'absolute', top: -5, right: -5, width: 16, height: 16, background: C.red, border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                    >
                      <X size={9} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => uploadUpsellPhoto(upsIdx)}
                    style={{ width: 48, height: 48, background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 6, color: C.text3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    <Image size={16} />
                  </button>
                )}
              </div>
              <input
                value={ups.link_url}
                onChange={e => updateUps(upsIdx, 'link_url', e.target.value)}
                placeholder="Link URL (optional)"
                style={{ ...inputStyle, fontSize: 12 }}
              />
              <input
                value={ups.video_url}
                onChange={e => updateUps(upsIdx, 'video_url', e.target.value)}
                placeholder="Video URL (optional)"
                style={{ ...inputStyle, fontSize: 12 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Vehicle Inspection Notes ─────────────────────────── */}
      {surveyVehicles.length > 0 && (() => {
        const vehiclesWithConcerns = surveyVehicles.filter(v =>
          v.concern_notes || v.surface_condition === 'poor' || v.surface_condition === 'fair' ||
          v.photos.some((p: any) => p.is_flagged)
        )
        const totalFlagged = surveyVehicles.reduce((s: number, v: any) =>
          s + v.photos.filter((p: any) => p.is_flagged).length, 0)

        return (
          <div style={{
            background: C.surface,
            border: `1px solid ${includeInspection ? C.amber + '44' : C.border}`,
            borderRadius: 12, marginBottom: 20, overflow: 'hidden',
          }}>
            {/* Section header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 20px', borderBottom: inspectionExpanded ? `1px solid ${C.border}` : 'none',
            }}>
              <button
                onClick={() => setInspectionExpanded(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text3, display: 'flex', padding: 0 }}
              >
                {inspectionExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <Car size={16} style={{ color: C.amber }} />
              <div style={{ flex: 1 }}>
                <span style={{
                  fontSize: 14, fontWeight: 800, fontFamily: headingFont,
                  textTransform: 'uppercase', letterSpacing: '0.05em', color: C.text1,
                }}>
                  Vehicle Inspection Notes
                </span>
                <span style={{ marginLeft: 10, fontSize: 11, color: C.text3 }}>
                  {surveyVehicles.length} vehicle{surveyVehicles.length !== 1 ? 's' : ''}
                  {totalFlagged > 0 && ` · ${totalFlagged} concern${totalFlagged !== 1 ? 's' : ''} flagged`}
                </span>
              </div>
              {/* Include toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: includeInspection ? C.text2 : C.text3 }}>
                  {includeInspection ? 'Included in proposal' : 'Hidden from customer'}
                </span>
                <button
                  onClick={() => setIncludeInspection(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0,
                    color: includeInspection ? C.amber : C.text3 }}
                >
                  {includeInspection
                    ? <ToggleRight size={24} />
                    : <ToggleLeft size={24} />}
                </button>
              </div>
            </div>

            {inspectionExpanded && (
              <div style={{ padding: 20 }}>

                {/* Disclaimer banner — only shown when there are concerns */}
                {vehiclesWithConcerns.length > 0 && (
                  <div style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    background: 'rgba(245,158,11,0.06)', border: `1px solid rgba(245,158,11,0.2)`,
                    borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                  }}>
                    <AlertTriangle size={16} style={{ color: C.amber, flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: C.amber, margin: '0 0 2px' }}>
                        Surface Preparation Required
                      </p>
                      <p style={{ fontSize: 12, color: 'rgba(245,158,11,0.7)', margin: 0 }}>
                        Some vehicles have surface issues noted during inspection. Final pricing may be adjusted
                        based on preparation work required. All concerns are documented below.
                      </p>
                    </div>
                  </div>
                )}

                {/* Vehicle rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {surveyVehicles.map((vehicle: any, idx: number) => {
                    const label = [vehicle.vehicle_year, vehicle.vehicle_make, vehicle.vehicle_model]
                      .filter(Boolean).join(' ') || `Vehicle ${idx + 1}`
                    const flaggedPhotos = vehicle.photos.filter((p: any) => p.is_flagged)
                    const allPhotos = vehicle.photos
                    const hasConcerns = vehicle.concern_notes || flaggedPhotos.length > 0 ||
                      vehicle.surface_condition === 'poor' || vehicle.surface_condition === 'fair'
                    const condColor = vehicle.surface_condition === 'good' ? C.green :
                      vehicle.surface_condition === 'fair' ? C.amber :
                      vehicle.surface_condition === 'poor' ? C.red : C.text3

                    return (
                      <div key={vehicle.id} style={{
                        background: C.surface2,
                        border: `1px solid ${hasConcerns ? 'rgba(245,158,11,0.2)' : C.border}`,
                        borderRadius: 10, padding: 14,
                      }}>
                        {/* Vehicle header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: allPhotos.length > 0 || vehicle.design_notes || vehicle.concern_notes ? 12 : 0 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                            background: 'rgba(79,127,255,0.12)', border: '1px solid rgba(79,127,255,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: C.accent }}>{idx + 1}</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>{label}</span>
                              {vehicle.vehicle_plate && (
                                <span style={{ fontSize: 11, color: C.text3, fontFamily: monoFont }}>
                                  #{vehicle.vehicle_plate}
                                </span>
                              )}
                              {vehicle.vin && (
                                <span style={{ fontSize: 10, color: C.text3, fontFamily: monoFont }}>
                                  VIN: {vehicle.vin}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Surface condition badge */}
                          {vehicle.surface_condition && (
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '3px 10px',
                              borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.04em',
                              color: condColor, background: condColor + '18',
                              border: `1px solid ${condColor}30`,
                            }}>
                              {vehicle.surface_condition === 'good' ? '✓ Good Surface' :
                               vehicle.surface_condition === 'fair' ? '⚠ Fair Surface' : '✗ Poor Surface'}
                            </span>
                          )}
                        </div>

                        {/* Design notes */}
                        {vehicle.design_notes && (
                          <div style={{ marginBottom: 10 }}>
                            <p style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, margin: '0 0 4px' }}>
                              Design Notes
                            </p>
                            <p style={{ fontSize: 13, color: C.text2, margin: 0, lineHeight: 1.5 }}>
                              {vehicle.design_notes}
                            </p>
                          </div>
                        )}

                        {/* Concern notes */}
                        {vehicle.concern_notes && (
                          <div style={{
                            background: 'rgba(245,158,11,0.05)',
                            border: '1px solid rgba(245,158,11,0.15)',
                            borderRadius: 8, padding: '8px 12px', marginBottom: 10,
                          }}>
                            <p style={{ fontSize: 10, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, margin: '0 0 3px', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <AlertTriangle size={10} /> Surface Concerns
                            </p>
                            <p style={{ fontSize: 13, color: 'rgba(245,158,11,0.8)', margin: 0, lineHeight: 1.5 }}>
                              {vehicle.concern_notes}
                            </p>
                          </div>
                        )}

                        {/* Photo grid — show flagged first, then rest */}
                        {allPhotos.length > 0 && (() => {
                          const ordered = [
                            ...flaggedPhotos,
                            ...allPhotos.filter((p: any) => !p.is_flagged),
                          ]
                          return (
                            <div>
                              <p style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, margin: '0 0 6px' }}>
                                Photos ({allPhotos.length})
                                {flaggedPhotos.length > 0 && (
                                  <span style={{ marginLeft: 6, color: C.amber }}>
                                    · {flaggedPhotos.length} concern{flaggedPhotos.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </p>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {ordered.map((photo: any) => (
                                  <div
                                    key={photo.id}
                                    onClick={() => setLightboxUrl(photo.public_url)}
                                    style={{
                                      position: 'relative', width: 72, height: 72,
                                      borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                                      border: `1px solid ${photo.is_flagged ? 'rgba(245,158,11,0.4)' : C.border}`,
                                      flexShrink: 0,
                                    }}
                                  >
                                    <img
                                      src={photo.public_url}
                                      alt={photo.angle || 'photo'}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />
                                    {photo.is_flagged && (
                                      <div style={{
                                        position: 'absolute', top: 3, right: 3,
                                        background: 'rgba(0,0,0,0.6)', borderRadius: 4,
                                        padding: '1px 3px',
                                      }}>
                                        <AlertTriangle size={10} style={{ color: C.amber }} />
                                      </div>
                                    )}
                                    <div style={{
                                      position: 'absolute', bottom: 0, left: 0, right: 0,
                                      background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
                                      padding: '10px 4px 3px',
                                    }}>
                                      <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)', margin: 0, textTransform: 'capitalize' }}>
                                        {photo.angle?.replace('_', ' ')}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })()}

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
          {publicToken && (
            <button onClick={copyLink} style={btnSecondary}>
              {linkCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              {linkCopied ? 'Copied!' : 'Copy Link'}
            </button>
          )}
          <button onClick={handleSave} disabled={saving} style={btnSecondary}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save Draft'}
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

      {/* ── Photo Lightbox ──────────────────────────────────── */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            style={{
              position: 'absolute', top: 16, right: 16, background: 'none',
              border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 4,
            }}
          >
            <X size={24} />
          </button>
          <img
            src={lightboxUrl}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }}
            alt="inspection photo"
          />
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
