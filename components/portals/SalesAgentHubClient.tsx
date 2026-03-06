'use client'

import { useState, useMemo } from 'react'
import type { Profile } from '@/types'
import {
  Plus, Search, CheckCircle, Clock, Users, TrendingUp,
  DollarSign, Settings, Eye, Save, ExternalLink, X,
  ChevronRight, UserPlus,
} from 'lucide-react'
import PortalLinkCopier from './PortalLinkCopier'
import AddAffiliateModal from './AddAffiliateModal'
import { createClient } from '@/lib/supabase/client'

interface SalesAgentHubClientProps {
  profile: Profile
  agents: any[]
  commissions: any[]
}

interface PortalFeatures {
  pnw_navigator: boolean
  fleet_manager: boolean
  mockup_generator: boolean
  messaging: boolean
  earnings: boolean
}

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
  { key: 'messaging', label: 'Messaging', desc: 'Communication with the shop' },
  { key: 'earnings', label: 'Earnings Dashboard', desc: 'Commission tracking & payouts' },
]

const fM = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none',
}

export default function SalesAgentHubClient({ profile, agents: initial, commissions }: SalesAgentHubClientProps) {
  const [agents, setAgents] = useState(initial)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<'settings' | 'preview'>('settings')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const [editName, setEditName] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRate, setEditRate] = useState('7')
  const [editStatus, setEditStatus] = useState('active')
  const [editFeatures, setEditFeatures] = useState<PortalFeatures>(DEFAULT_FEATURES)

  const selected = useMemo(() => agents.find(a => a.id === selectedId) ?? null, [agents, selectedId])

  function selectAgent(a: any) {
    setSelectedId(a.id)
    setTab('settings')
    setEditName(a.name || '')
    setEditCompany(a.company || '')
    setEditEmail(a.email || '')
    setEditPhone(a.phone || '')
    setEditRate(String(a.commission_structure?.rate ?? 7))
    setEditStatus(a.status || 'active')
    setEditFeatures({ ...DEFAULT_FEATURES, ...(a.portal_features || {}) })
    setSaveMsg('')
  }

  const filtered = useMemo(() => {
    if (!search) return agents
    const q = search.toLowerCase()
    return agents.filter(a => a.name?.toLowerCase().includes(q) || a.company?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q))
  }, [agents, search])

  const active = agents.filter(a => a.status === 'active').length
  const totalPending = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + (c.amount || 0), 0)
  const totalPaid = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + (c.amount || 0), 0)

  function getJobCount(agentId: string) {
    return commissions.filter(c => c.affiliate_id === agentId).length
  }

  function getAgentCommission(agentId: string) {
    return commissions.filter(c => c.affiliate_id === agentId).reduce((s, c) => s + (c.amount || 0), 0)
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    setSaveMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('affiliates').update({
      name: editName.trim(),
      company: editCompany.trim() || null,
      email: editEmail.trim() || null,
      phone: editPhone.trim() || null,
      status: editStatus,
      commission_structure: { type: 'percent_gp', rate: parseFloat(editRate) || 7 },
      portal_features: editFeatures,
    }).eq('id', selected.id)

    if (error) {
      setSaveMsg(`Error: ${error.message}`)
    } else {
      setSaveMsg('Saved!')
      setAgents(prev => prev.map(a => a.id === selected.id ? {
        ...a,
        name: editName.trim(),
        company: editCompany.trim() || null,
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
        status: editStatus,
        commission_structure: { type: 'percent_gp', rate: parseFloat(editRate) || 7 },
        portal_features: editFeatures,
      } : a))
      setTimeout(() => setSaveMsg(''), 2000)
    }
    setSaving(false)
  }

  function toggleFeature(key: keyof PortalFeatures) {
    setEditFeatures(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const STATS = [
    { label: 'Total Agents', value: agents.length, color: 'var(--cyan)', Icon: Users },
    { label: 'Active', value: active, color: 'var(--green)', Icon: CheckCircle },
    { label: 'Pending', value: fM(totalPending), color: 'var(--amber)', Icon: Clock },
    { label: 'Total Paid', value: fM(totalPaid), color: 'var(--green)', Icon: TrendingUp },
  ]

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 900, color: 'var(--text1)', lineHeight: 1 }}>
            Sales Agent Portal
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            Manage outbound sales agents, customize their portal experience
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
        >
          <Plus size={15} />New Agent
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

        {/* Left: Agent List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} color="var(--text3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents..."
              style={{ width: '100%', padding: '9px 12px 9px 34px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                {search ? 'No agents match your search' : 'No sales agents yet.'}
              </div>
            )}
            {filtered.map(a => {
              const isSelected = a.id === selectedId
              const jobs = getJobCount(a.id)
              const comm = getAgentCommission(a.id)
              return (
                <div
                  key={a.id}
                  onClick={() => selectAgent(a)}
                  style={{
                    background: isSelected ? 'rgba(79,127,255,.08)' : 'var(--surface)',
                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{a.name}</div>
                      {a.company && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{a.company}</div>}
                    </div>
                    <span style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                      background: a.status === 'active' ? 'rgba(34,192,122,.15)' : 'rgba(245,158,11,.15)',
                      color: a.status === 'active' ? 'var(--green)' : 'var(--amber)',
                    }}>
                      {a.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>
                    <span>{jobs} job{jobs !== 1 ? 's' : ''}</span>
                    <span style={{ color: 'var(--green)', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>{fM(comm)}</span>
                    <span>{a.commission_structure?.rate ?? 7}%</span>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Commission Rate %</div>
                    <input
                      style={{ ...inp, fontFamily: 'JetBrains Mono', fontWeight: 700 }}
                      type="number" step="0.5" min="0" max="50"
                      value={editRate}
                      onChange={e => setEditRate(e.target.value)}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Status</div>
                    <button
                      onClick={() => setEditStatus(editStatus === 'active' ? 'inactive' : 'active')}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                        border: '1px solid var(--border)', cursor: 'pointer',
                        background: editStatus === 'active' ? 'rgba(34,192,122,.12)' : 'rgba(245,158,11,.12)',
                        color: editStatus === 'active' ? 'var(--green)' : 'var(--amber)',
                      }}
                    >
                      {editStatus === 'active' ? 'Active' : 'Inactive'} — tap to toggle
                    </button>
                  </div>
                </div>

                {/* Portal Link */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Portal Link</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {selected.portal_token ? (
                      <>
                        <PortalLinkCopier token={selected.portal_token} portalType="sales-agent" />
                        <a
                          href={`/portal/sales-agent/${selected.portal_token}`}
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
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>No token generated</span>
                    )}
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
                <SalesAgentPortalPreview agent={selected} features={editFeatures} commissionRate={parseFloat(editRate) || 7} />
              </div>
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <AddAffiliateModal
          type="sales_agent"
          onClose={() => setShowAdd(false)}
          onCreated={(a) => { setAgents(prev => [a, ...prev]); setShowAdd(false) }}
        />
      )}
    </div>
  )
}

/* ── Sales Agent Portal Preview ───────────────────────────────────────────── */

function SalesAgentPortalPreview({ agent, features, commissionRate }: { agent: any; features: PortalFeatures; commissionRate: number }) {
  const bg = '#0e1117'
  const surface = '#161b22'
  const border = '#21262d'
  const green = '#22c07a'
  const text1 = '#e6edf3'
  const text2 = '#8b949e'
  const text3 = '#484f58'
  const blue = '#4f7fff'

  return (
    <div style={{ maxWidth: 380, margin: '0 auto' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
        Portal Preview — {agent.name}
      </div>

      {/* Phone frame */}
      <div style={{
        background: bg, borderRadius: 24, overflow: 'hidden',
        border: `2px solid ${border}`, position: 'relative',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${border}`,
          background: `linear-gradient(to bottom, ${surface}, ${bg})`,
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: text3, textTransform: 'uppercase' }}>
            Sales Agent Portal · USA Wrap Co
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: text1, marginTop: 4 }}>{agent.name}</div>
          {agent.company && <div style={{ fontSize: 12, color: text2 }}>{agent.company}</div>}
        </div>

        {/* Body */}
        <div style={{ padding: '16px 14px', minHeight: 320 }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div style={{ background: `${green}08`, border: `1px solid ${green}20`, borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <DollarSign size={12} color={green} />
                <span style={{ fontSize: 9, color: text2 }}>Pending</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: text1, fontFamily: 'JetBrains Mono, monospace' }}>$0</div>
            </div>
            <div style={{ background: `${blue}08`, border: `1px solid ${blue}20`, borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <TrendingUp size={12} color={blue} />
                <span style={{ fontSize: 9, color: text2 }}>Earned</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: text1, fontFamily: 'JetBrains Mono, monospace' }}>$0</div>
            </div>
          </div>

          {/* Jobs */}
          <div style={{ fontSize: 9, fontWeight: 700, color: text3, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>
            Referred Jobs
          </div>
          <div style={{
            textAlign: 'center', padding: '24px 16px',
            background: surface, border: `1px solid ${border}`, borderRadius: 14, marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, color: text2 }}>No referred jobs yet</div>
            <div style={{ fontSize: 10, color: text3, marginTop: 4 }}>Share referral link to start earning</div>
          </div>

          {/* Refer CTA */}
          <div style={{
            background: `linear-gradient(135deg, ${green}18, ${green}08)`,
            border: `1px solid ${green}25`, borderRadius: 14, padding: '14px 16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: text1 }}>Refer a new customer</div>
            <div style={{ fontSize: 10, color: text2, margin: '4px 0 10px' }}>
              Earn {commissionRate}% commission on every job
            </div>
            <div style={{
              display: 'inline-block', background: green, color: '#fff',
              padding: '8px 18px', borderRadius: 10, fontSize: 11, fontWeight: 700,
            }}>
              Share My Referral Link
            </div>
          </div>
        </div>
      </div>

      {/* Open full portal */}
      {agent.portal_token && (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <a
            href={`/portal/sales-agent/${agent.portal_token}`}
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
      )}
    </div>
  )
}
