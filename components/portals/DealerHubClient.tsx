'use client'

import { useState, useMemo } from 'react'
import type { Profile } from '@/types'
import {
  Plus, Search, CheckCircle, Clock, Building2, TrendingUp,
  DollarSign, Settings, Eye, Save, ExternalLink, X,
  Home, Briefcase, MessageSquare, Wand2, Menu, Compass, Map,
  User, ChevronRight,
} from 'lucide-react'
import PortalLinkCopier from './PortalLinkCopier'
import AddAffiliateModal from './AddAffiliateModal'
import { createClient } from '@/lib/supabase/client'

interface DealerHubClientProps {
  profile: Profile
  dealers: any[]
  referralCounts: Record<string, number>
  commissionTotals: Record<string, number>
}

interface PortalFeatures {
  pnw_navigator: boolean
  fleet_manager: boolean
  mockup_generator: boolean
  messaging: boolean
  earnings: boolean
}

interface CommissionRule {
  type: 'percentage' | 'flat'
  value: number
}

interface CommissionRules {
  default_pct: number
  job_types: Record<string, CommissionRule>
}

const DEFAULT_COMMISSION_RULES: CommissionRules = {
  default_pct: 2.5,
  job_types: {},
}

const JOB_TYPE_OPTIONS = [
  { key: 'full_wrap', label: 'Full Wrap' },
  { key: 'partial_wrap', label: 'Partial Wrap' },
  { key: 'ppf', label: 'PPF' },
  { key: 'tint', label: 'Window Tint' },
  { key: 'lettering', label: 'Lettering' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'fleet', label: 'Fleet' },
  { key: 'design_only', label: 'Design Only' },
]

const DEFAULT_FEATURES: PortalFeatures = {
  pnw_navigator: true,
  fleet_manager: true,
  mockup_generator: true,
  messaging: true,
  earnings: true,
}

const FEATURE_LIST: { key: keyof PortalFeatures; label: string; desc: string }[] = [
  { key: 'mockup_generator', label: 'Vehicle Mockup Generator', desc: 'Design & quote tool' },
  { key: 'pnw_navigator', label: 'PNW Navigator', desc: 'Boat ramps, marinas & scenic routes' },
  { key: 'fleet_manager', label: 'Fleet Manager', desc: 'Track wrapped vehicles & impressions' },
  { key: 'messaging', label: '3-Way Messaging', desc: 'Dealer ↔ Shop ↔ Customer chat' },
  { key: 'earnings', label: 'Earnings Dashboard', desc: 'Commission tracking & payouts' },
]

const fM = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none',
}

export default function DealerHubClient({ profile, dealers: initial, referralCounts, commissionTotals }: DealerHubClientProps) {
  const [dealers, setDealers] = useState(initial)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<'settings' | 'preview'>('settings')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Editable fields for selected dealer
  const [editName, setEditName] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCommission, setEditCommission] = useState('2.5')
  const [editActive, setEditActive] = useState(true)
  const [editFeatures, setEditFeatures] = useState<PortalFeatures>(DEFAULT_FEATURES)
  const [editCommissionRules, setEditCommissionRules] = useState<CommissionRules>(DEFAULT_COMMISSION_RULES)
  const [editShareEstimates, setEditShareEstimates] = useState(false)
  const [addJobType, setAddJobType] = useState('')

  const selected = useMemo(() => dealers.find(d => d.id === selectedId) ?? null, [dealers, selectedId])

  function selectDealer(d: any) {
    setSelectedId(d.id)
    setTab('settings')
    setEditName(d.name || '')
    setEditCompany(d.company_name || '')
    setEditEmail(d.email || '')
    setEditPhone(d.phone || '')
    setEditCommission(String(d.commission_pct ?? 2.5))
    setEditActive(d.active !== false)
    setEditFeatures({ ...DEFAULT_FEATURES, ...(d.portal_features || {}) })
    setEditCommissionRules({ ...DEFAULT_COMMISSION_RULES, ...(d.commission_rules || {}) })
    setEditShareEstimates(d.share_estimates ?? false)
    setAddJobType('')
    setSaveMsg('')
  }

  const filtered = useMemo(() => {
    if (!search) return dealers
    const q = search.toLowerCase()
    return dealers.filter(d =>
      d.name?.toLowerCase().includes(q) ||
      d.company_name?.toLowerCase().includes(q) ||
      d.email?.toLowerCase().includes(q)
    )
  }, [dealers, search])

  const active = dealers.filter(d => d.active !== false).length
  const totalCommission = Object.values(commissionTotals).reduce((s, v) => s + v, 0)
  const totalJobs = Object.values(referralCounts).reduce((s, v) => s + v, 0)

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    setSaveMsg('')
    const supabase = createClient()
    const updatedRules = {
      ...editCommissionRules,
      default_pct: parseFloat(editCommission) || 2.5,
    }
    const { error } = await supabase.from('dealers').update({
      name: editName.trim(),
      company_name: editCompany.trim() || null,
      email: editEmail.trim() || null,
      phone: editPhone.trim() || null,
      commission_pct: parseFloat(editCommission) || 2.5,
      active: editActive,
      portal_features: editFeatures,
      commission_rules: updatedRules,
      share_estimates: editShareEstimates,
    }).eq('id', selected.id)

    if (error) {
      setSaveMsg(`Error: ${error.message}`)
    } else {
      setSaveMsg('Saved!')
      setDealers(prev => prev.map(d => d.id === selected.id ? {
        ...d,
        name: editName.trim(),
        company_name: editCompany.trim() || null,
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
        commission_pct: parseFloat(editCommission) || 2.5,
        active: editActive,
        portal_features: editFeatures,
        commission_rules: updatedRules,
        share_estimates: editShareEstimates,
      } : d))
      setTimeout(() => setSaveMsg(''), 2000)
    }
    setSaving(false)
  }

  function toggleFeature(key: keyof PortalFeatures) {
    setEditFeatures(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const STATS = [
    { label: 'Total Dealers', value: dealers.length, color: 'var(--cyan)', Icon: Building2 },
    { label: 'Active', value: active, color: 'var(--green)', Icon: CheckCircle },
    { label: 'Total Jobs', value: totalJobs, color: 'var(--amber)', Icon: Clock },
    { label: 'Commission', value: fM(totalCommission), color: 'var(--green)', Icon: TrendingUp },
  ]

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 900, color: 'var(--text1)', lineHeight: 1 }}>
            Dealer Portal
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            Manage dealership partners, customize their portal experience
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
        >
          <Plus size={15} />New Dealer
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {STATS.map(({ label, value, color, Icon }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Icon size={16} color={color} />
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</div>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 22, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Split Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '340px 1fr' : '1fr', gap: 16 }}>

        {/* Left: Dealer List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} color="var(--text3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search dealers..."
              style={{ width: '100%', padding: '9px 12px 9px 34px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                {search ? 'No dealers match your search' : 'No dealers yet.'}
              </div>
            )}
            {filtered.map(d => {
              const isSelected = d.id === selectedId
              const jobs = referralCounts[d.id] || 0
              const comm = commissionTotals[d.id] || 0
              return (
                <div
                  key={d.id}
                  onClick={() => selectDealer(d)}
                  style={{
                    background: isSelected ? 'rgba(79,127,255,.08)' : 'var(--surface)',
                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{d.name}</div>
                      {d.company_name && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{d.company_name}</div>}
                    </div>
                    <span style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                      background: d.active !== false ? 'rgba(34,192,122,.15)' : 'rgba(245,158,11,.15)',
                      color: d.active !== false ? 'var(--green)' : 'var(--amber)',
                    }}>
                      {d.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>
                    <span>{jobs} job{jobs !== 1 ? 's' : ''}</span>
                    <span style={{ color: 'var(--green)', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>{fM(comm)}</span>
                    <span>{d.commission_pct ?? 2.5}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Detail Panel */}
        {selected && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              <button
                onClick={() => setTab('settings')}
                style={{
                  flex: 1, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, color: tab === 'settings' ? 'var(--accent)' : 'var(--text3)',
                  borderBottom: tab === 'settings' ? '2px solid var(--accent)' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '.04em',
                }}
              >
                <Settings size={15} /> Settings
              </button>
              <button
                onClick={() => setTab('preview')}
                style={{
                  flex: 1, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, color: tab === 'preview' ? 'var(--accent)' : 'var(--text3)',
                  borderBottom: tab === 'preview' ? '2px solid var(--accent)' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '.04em',
                }}
              >
                <Eye size={15} /> Preview
              </button>
              <button
                onClick={() => setSelectedId(null)}
                style={{ padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Settings Tab */}
            {tab === 'settings' && (
              <div style={{ padding: 20, maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Name</div>
                    <input style={inp} value={editName} onChange={e => setEditName(e.target.value)} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Company</div>
                    <input style={inp} value={editCompany} onChange={e => setEditCompany(e.target.value)} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Email</div>
                    <input style={inp} type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Phone</div>
                    <input style={inp} type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                  </div>
                </div>

                {/* Default Commission + Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Default Commission % (of GPM)</div>
                    <input
                      style={{ ...inp, fontFamily: 'JetBrains Mono', fontWeight: 700 }}
                      type="number" step="0.5" min="0" max="50"
                      value={editCommission}
                      onChange={e => setEditCommission(e.target.value)}
                    />
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
                      Calculated as % of Gross Profit Margin, shown to dealer as flat dollar amount
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Status</div>
                    <button
                      onClick={() => setEditActive(!editActive)}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                        border: '1px solid var(--border)', cursor: 'pointer',
                        background: editActive ? 'rgba(34,192,122,.12)' : 'rgba(245,158,11,.12)',
                        color: editActive ? 'var(--green)' : 'var(--amber)',
                      }}
                    >
                      {editActive ? 'Active' : 'Inactive'} — tap to toggle
                    </button>
                  </div>
                </div>

                {/* Per Job-Type Commission Rules */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    Commission Rates by Job Type
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 10 }}>
                    Override default rate per job type. Percentage rates are calculated on GPM and converted to a flat dollar amount for the dealer.
                  </div>

                  {/* Existing rules */}
                  {Object.entries(editCommissionRules.job_types || {}).map(([jobType, rule]) => {
                    const label = JOB_TYPE_OPTIONS.find(j => j.key === jobType)?.label || jobType
                    return (
                      <div key={jobType} style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                        padding: '8px 12px', background: 'var(--surface2)',
                        border: '1px solid var(--border)', borderRadius: 8,
                      }}>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{label}</span>
                        <select
                          value={rule.type}
                          onChange={e => {
                            const updated = { ...editCommissionRules }
                            updated.job_types = { ...updated.job_types }
                            updated.job_types[jobType] = { ...rule, type: e.target.value as 'percentage' | 'flat' }
                            setEditCommissionRules(updated)
                          }}
                          style={{
                            padding: '4px 8px', background: 'var(--bg)', border: '1px solid var(--border)',
                            borderRadius: 6, color: 'var(--text1)', fontSize: 12,
                          }}
                        >
                          <option value="percentage">% of GPM</option>
                          <option value="flat">Flat $</option>
                        </select>
                        <input
                          type="number"
                          step={rule.type === 'percentage' ? '0.5' : '5'}
                          min="0"
                          value={rule.value}
                          onChange={e => {
                            const updated = { ...editCommissionRules }
                            updated.job_types = { ...updated.job_types }
                            updated.job_types[jobType] = { ...rule, value: parseFloat(e.target.value) || 0 }
                            setEditCommissionRules(updated)
                          }}
                          style={{
                            width: 70, padding: '4px 8px', background: 'var(--bg)', border: '1px solid var(--border)',
                            borderRadius: 6, color: 'var(--text1)', fontSize: 12,
                            fontFamily: 'JetBrains Mono', fontWeight: 700, textAlign: 'right',
                          }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 20 }}>
                          {rule.type === 'percentage' ? '%' : '$'}
                        </span>
                        <button
                          onClick={() => {
                            const updated = { ...editCommissionRules }
                            updated.job_types = { ...updated.job_types }
                            delete updated.job_types[jobType]
                            setEditCommissionRules(updated)
                          }}
                          style={{
                            padding: '2px 6px', background: 'none', border: '1px solid var(--border)',
                            borderRadius: 4, color: 'var(--red)', fontSize: 11, cursor: 'pointer',
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )
                  })}

                  {/* Add new job type rule */}
                  {(() => {
                    const usedTypes = Object.keys(editCommissionRules.job_types || {})
                    const available = JOB_TYPE_OPTIONS.filter(j => !usedTypes.includes(j.key))
                    if (available.length === 0) return null
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <select
                          value={addJobType}
                          onChange={e => setAddJobType(e.target.value)}
                          style={{
                            flex: 1, padding: '6px 10px', background: 'var(--surface2)', border: '1px solid var(--border)',
                            borderRadius: 6, color: 'var(--text1)', fontSize: 12,
                          }}
                        >
                          <option value="">Add job type...</option>
                          {available.map(j => <option key={j.key} value={j.key}>{j.label}</option>)}
                        </select>
                        <button
                          disabled={!addJobType}
                          onClick={() => {
                            if (!addJobType) return
                            const updated = { ...editCommissionRules }
                            updated.job_types = { ...updated.job_types }
                            updated.job_types[addJobType] = { type: 'percentage', value: parseFloat(editCommission) || 2.5 }
                            setEditCommissionRules(updated)
                            setAddJobType('')
                          }}
                          style={{
                            padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                            background: addJobType ? 'var(--accent)' : 'var(--surface2)',
                            color: addJobType ? '#fff' : 'var(--text3)',
                            border: 'none', cursor: addJobType ? 'pointer' : 'default',
                          }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    )
                  })()}
                </div>

                {/* Share Estimates Toggle */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                    background: editShareEstimates ? 'rgba(34,192,122,.06)' : 'var(--surface2)',
                    border: `1px solid ${editShareEstimates ? 'rgba(34,192,122,.2)' : 'var(--border)'}`,
                    borderRadius: 10, cursor: 'pointer', transition: 'all .15s',
                  }}>
                    <input
                      type="checkbox"
                      checked={editShareEstimates}
                      onChange={() => setEditShareEstimates(!editShareEstimates)}
                      style={{ width: 16, height: 16, accentColor: 'var(--green)', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>Share Estimates with Dealer</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        When enabled, dealers can view customer estimates for their referrals
                      </div>
                    </div>
                  </label>
                </div>

                {/* Portal Link */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Portal Link</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PortalLinkCopier token={selected.portal_token} portalType="dealer" />
                    <a
                      href={`/portal/dealer/${selected.portal_token}`}
                      target="_blank"
                      rel="noopener"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'var(--surface2)', color: 'var(--text2)',
                        fontSize: 11, fontWeight: 600, textDecoration: 'none',
                      }}
                    >
                      <ExternalLink size={12} /> Open Portal
                    </a>
                  </div>
                </div>

                {/* Feature Toggles */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    Portal Features
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {FEATURE_LIST.map(f => (
                      <label
                        key={f.key}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                          background: editFeatures[f.key] ? 'rgba(34,192,122,.06)' : 'var(--surface2)',
                          border: `1px solid ${editFeatures[f.key] ? 'rgba(34,192,122,.2)' : 'var(--border)'}`,
                          borderRadius: 10, cursor: 'pointer', transition: 'all .15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editFeatures[f.key]}
                          onChange={() => toggleFeature(f.key)}
                          style={{ width: 16, height: 16, accentColor: 'var(--green)', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{f.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{f.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Save */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      padding: '12px 24px', background: 'var(--accent)', color: '#fff',
                      border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 13,
                      cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  {saveMsg && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: saveMsg.startsWith('Error') ? 'var(--red)' : 'var(--green)' }}>
                      {saveMsg}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Preview Tab */}
            {tab === 'preview' && (
              <div style={{ padding: 20 }}>
                <DealerPortalPreview dealer={selected} features={editFeatures} />
              </div>
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <AddAffiliateModal
          type="dealer"
          onClose={() => setShowAdd(false)}
          onCreated={(d) => { setDealers(prev => [d, ...prev]); setShowAdd(false) }}
        />
      )}
    </div>
  )
}

/* ── Dealer Portal Preview ────────────────────────────────────────────────── */

function DealerPortalPreview({ dealer, features }: { dealer: any; features: PortalFeatures }) {
  const bg = '#0e1117'
  const surface = '#161b22'
  const border = '#21262d'
  const green = '#22c07a'
  const text1 = '#e6edf3'
  const text2 = '#8b949e'
  const text3 = '#484f58'
  const accent = '#4f7fff'
  const cyan = '#22d3ee'
  const purple = '#8b5cf6'

  const navItems = [
    { icon: Home, label: 'Home', active: true },
    { icon: Briefcase, label: 'Jobs', active: false },
    ...(features.messaging ? [{ icon: MessageSquare, label: 'Messages', active: false }] : []),
    ...(features.mockup_generator ? [{ icon: Wand2, label: 'Mockup', active: false }] : []),
    { icon: Menu, label: 'More', active: false },
  ]

  const moreItems = [
    ...(features.pnw_navigator ? [{ icon: Compass, label: 'PNW Navigator', color: cyan }] : []),
    ...(features.fleet_manager ? [{ icon: Map, label: 'Fleet Manager', color: purple }] : []),
    ...(features.earnings ? [{ icon: TrendingUp, label: 'Earnings', color: green }] : []),
    { icon: User, label: 'My Profile', color: text2 },
  ]

  const featuredApps = [
    ...(features.mockup_generator ? [{ label: 'Vehicle Mockup Generator', desc: 'Design & quote in 60 sec', icon: Wand2, color: green }] : []),
    ...(features.pnw_navigator ? [{ label: 'PNW Navigator', desc: 'Boat ramps & marinas', icon: Compass, color: cyan }] : []),
    ...(features.fleet_manager ? [{ label: 'Fleet Manager', desc: 'Track wrapped vehicles', icon: Map, color: purple }] : []),
  ]

  return (
    <div style={{ maxWidth: 380, margin: '0 auto' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
        Portal Preview — {dealer.name}
      </div>

      {/* Phone frame */}
      <div style={{
        background: bg, borderRadius: 24, overflow: 'hidden',
        border: `2px solid ${border}`, position: 'relative',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}`, background: surface }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: green, textTransform: 'uppercase' }}>
            Dealer Portal · USA Wrap Co
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: text1 }}>
              {dealer.company_name || dealer.name}
            </div>
            <div style={{
              padding: '3px 8px', borderRadius: 12,
              background: `${green}20`, border: `1px solid ${green}30`,
              fontSize: 10, fontWeight: 700, color: green,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              Partner
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 12px', minHeight: 320 }}>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
            {[
              { label: 'Active', value: '—', color: accent },
              { label: 'Done', value: '—', color: green },
              { label: 'Owed', value: '$0', color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{
                background: surface, border: `1px solid ${border}`,
                borderRadius: 10, padding: '10px 6px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: text1, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                <div style={{ fontSize: 8, color: text3, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.6 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Refer CTA */}
          <div style={{
            background: `linear-gradient(135deg, ${green}18, ${accent}10)`,
            border: `1px solid ${green}30`, borderRadius: 12, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${green}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={16} color={green} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: text1 }}>Refer a New Customer</div>
              <div style={{ fontSize: 9, color: text2 }}>Build a mockup and earn commission</div>
            </div>
          </div>

          {/* Featured Apps */}
          {featuredApps.length > 0 && (
            <>
              <div style={{ fontSize: 9, fontWeight: 700, color: text3, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>
                Featured Apps
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                {featuredApps.map(a => (
                  <div key={a.label} style={{
                    background: `${a.color}08`, border: `1px solid ${a.color}20`,
                    borderRadius: 10, padding: '10px 12px',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <a.icon size={16} color={a.color} strokeWidth={1.6} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: text1 }}>{a.label}</div>
                      <div style={{ fontSize: 9, color: text2 }}>{a.desc}</div>
                    </div>
                    <ChevronRight size={12} color={text3} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* More drawer items */}
          <div style={{ fontSize: 9, fontWeight: 700, color: text3, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>
            More Menu
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {moreItems.map(item => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: `${green}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <item.icon size={14} color={green} strokeWidth={1.8} />
                </div>
                <span style={{ fontSize: 12, color: text1 }}>{item.label}</span>
                <ChevronRight size={12} color={text3} style={{ marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Nav */}
        <div style={{
          borderTop: `1px solid ${border}`, background: surface,
          display: 'flex', justifyContent: 'space-around', padding: '8px 0',
        }}>
          {navItems.map(item => (
            <div key={item.label} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              color: item.active ? green : text3, fontSize: 8,
            }}>
              <item.icon size={16} strokeWidth={item.active ? 2.2 : 1.5} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Open full portal */}
      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <a
          href={`/portal/dealer/${dealer.portal_token}`}
          target="_blank"
          rel="noopener"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 9,
            background: 'var(--accent)', color: '#fff',
            fontSize: 13, fontWeight: 700, textDecoration: 'none',
          }}
        >
          <ExternalLink size={14} /> Open Full Portal
        </a>
      </div>
    </div>
  )
}
