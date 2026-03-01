'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Send, Clock, CheckCircle2, XCircle, DollarSign, Calendar,
  AlertTriangle, Search, X, ChevronRight, Users, TrendingUp, Plus,
} from 'lucide-react'
import type { Profile } from '@/types'
import { isAdminRole } from '@/types'
import { hasPermission } from '@/lib/permissions'
import CustomerSearchModal, { type CustomerRow } from '@/components/shared/CustomerSearchModal'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Bid {
  id: string
  org_id: string
  project_id: string
  installer_id: string
  status: 'pending' | 'accepted' | 'declined'
  offered_rate: number | null
  target_rate: number | null
  passive_margin: number | null
  sent_at: string | null
  response_at: string | null
  installer_name?: string
  created_at: string
  project?: {
    id: string
    title: string
    vehicle_desc: string | null
    install_date: string | null
  }
}

interface Installer {
  id: string
  name: string
  email: string
  role: string
}

// ─── Demo data ──────────────────────────────────────────────────────────────
const DEMO_BIDS: Bid[] = [
  {
    id: 'demo-bid-1', org_id: '', project_id: 'p1', installer_id: 'i1',
    status: 'pending', offered_rate: 850, target_rate: 750, passive_margin: 100,
    sent_at: '2026-02-20T10:00:00Z', response_at: null, installer_name: 'Jake Martinez',
    created_at: '2026-02-20T10:00:00Z',
    project: { id: 'p1', title: 'Ford F-150 Full Wrap', vehicle_desc: '2024 Ford F-150 XLT', install_date: '2026-03-05' },
  },
  {
    id: 'demo-bid-2', org_id: '', project_id: 'p2', installer_id: 'i2',
    status: 'accepted', offered_rate: 1200, target_rate: 1000, passive_margin: 200,
    sent_at: '2026-02-18T09:00:00Z', response_at: '2026-02-18T14:30:00Z', installer_name: 'Carlos Reyes',
    created_at: '2026-02-18T09:00:00Z',
    project: { id: 'p2', title: 'Tesla Model 3 Color Change', vehicle_desc: '2025 Tesla Model 3', install_date: '2026-02-28' },
  },
  {
    id: 'demo-bid-3', org_id: '', project_id: 'p3', installer_id: 'i1',
    status: 'accepted', offered_rate: 1500, target_rate: 1300, passive_margin: 200,
    sent_at: '2026-02-15T08:00:00Z', response_at: '2026-02-15T11:00:00Z', installer_name: 'Jake Martinez',
    created_at: '2026-02-15T08:00:00Z',
    project: { id: 'p3', title: 'Sprinter Van Commercial', vehicle_desc: '2024 Mercedes Sprinter', install_date: '2026-03-10' },
  },
  {
    id: 'demo-bid-4', org_id: '', project_id: 'p4', installer_id: 'i3',
    status: 'declined', offered_rate: 700, target_rate: 600, passive_margin: 100,
    sent_at: '2026-02-14T10:00:00Z', response_at: '2026-02-14T18:00:00Z', installer_name: 'Mike Thompson',
    created_at: '2026-02-14T10:00:00Z',
    project: { id: 'p4', title: 'Civic Partial Wrap', vehicle_desc: '2023 Honda Civic', install_date: '2026-02-25' },
  },
  {
    id: 'demo-bid-5', org_id: '', project_id: 'p5', installer_id: 'i2',
    status: 'pending', offered_rate: 950, target_rate: 800, passive_margin: 150,
    sent_at: '2026-02-21T07:30:00Z', response_at: null, installer_name: 'Carlos Reyes',
    created_at: '2026-02-21T07:30:00Z',
    project: { id: 'p5', title: 'BMW M4 Gloss Green', vehicle_desc: '2024 BMW M4 Competition', install_date: '2026-03-01' },
  },
]

const DEMO_INSTALLERS: Installer[] = [
  { id: 'i1', name: 'Jake Martinez', email: 'jake@usawrapco.com', role: 'installer' },
  { id: 'i2', name: 'Carlos Reyes', email: 'carlos@usawrapco.com', role: 'installer' },
  { id: 'i3', name: 'Mike Thompson', email: 'mike@usawrapco.com', role: 'installer' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending',  color: 'var(--amber)',  bg: 'rgba(245,158,11,0.15)' },
  accepted: { label: 'Accepted', color: 'var(--green)',  bg: 'rgba(34,192,122,0.15)' },
  declined: { label: 'Declined', color: 'var(--red)',    bg: 'rgba(242,90,90,0.15)' },
}

interface Props {
  profile: Profile
  initialBids: any[]
  installers: any[]
}

export default function BidsClient({ profile, initialBids, installers: initialInstallers }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const usingDemo = false
  const allBids: Bid[] = initialBids
  const allInstallers: Installer[] = initialInstallers

  const canManage = isAdminRole(profile.role) || hasPermission(profile.role, 'bids.manage')

  const [bids, setBids] = useState<Bid[]>(allBids)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showSendModal, setShowSendModal] = useState(false)

  // Send Bid form state
  const [bidJobTitle, setBidJobTitle] = useState('')
  const [bidInstallerIds, setBidInstallerIds] = useState<string[]>([])
  const [bidOfferedRate, setBidOfferedRate] = useState('')
  const [bidTargetRate, setBidTargetRate] = useState('')
  const [sending, setSending] = useState(false)
  const [bidCustomer, setBidCustomer] = useState<CustomerRow | null>(null)
  const [bidCustomerModalOpen, setBidCustomerModalOpen] = useState(false)

  // Filter
  const filtered = useMemo(() => {
    let list = [...bids]
    if (statusFilter !== 'all') list = list.filter(b => b.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        (b.project?.title || '').toLowerCase().includes(q) ||
        (b.installer_name || '').toLowerCase().includes(q) ||
        (b.project?.vehicle_desc || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [bids, statusFilter, search])

  // Stats
  const stats = useMemo(() => {
    const pending = bids.filter(b => b.status === 'pending').length
    const accepted = bids.filter(b => b.status === 'accepted').length
    const declined = bids.filter(b => b.status === 'declined').length
    // Avg response time for bids that have a response
    const responded = bids.filter(b => b.sent_at && b.response_at)
    let avgResponseHrs = 0
    if (responded.length > 0) {
      const totalMs = responded.reduce((s, b) => {
        return s + (new Date(b.response_at!).getTime() - new Date(b.sent_at!).getTime())
      }, 0)
      avgResponseHrs = Math.round(totalMs / responded.length / (1000 * 60 * 60) * 10) / 10
    }
    const totalMargin = bids.reduce((s, b) => s + (b.passive_margin || 0), 0)
    return { pending, accepted, declined, avgResponseHrs, totalMargin }
  }, [bids])

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const fmtDate = (d: string | null) => {
    if (!d) return '--'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const fmtShortDate = (d: string | null) => {
    if (!d) return '--'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function toggleInstaller(id: string) {
    setBidInstallerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleSendBid() {
    if (!bidJobTitle.trim() || bidInstallerIds.length === 0 || !bidOfferedRate) return
    setSending(true)

    const offered = parseFloat(bidOfferedRate)
    const target = parseFloat(bidTargetRate) || 0
    const margin = offered - target

    // For each selected installer, create a bid
    for (const instId of bidInstallerIds) {
      const inst = allInstallers.find(i => i.id === instId)
      const now = new Date().toISOString()
      const newBid: Bid = {
        id: `bid-${Date.now()}-${instId}`,
        org_id: profile.org_id,
        project_id: '',
        installer_id: instId,
        status: 'pending',
        offered_rate: offered,
        target_rate: target || null,
        passive_margin: margin > 0 ? margin : null,
        sent_at: now,
        response_at: null,
        installer_name: inst?.name || '',
        created_at: now,
        project: { id: '', title: bidJobTitle, vehicle_desc: null, install_date: null },
      }

      // Try to insert into DB
      try {
        await supabase.from('installer_bids').insert({
          org_id: profile.org_id,
          project_id: newBid.project_id || null,
          installer_id: instId,
          status: 'pending',
          offered_rate: offered,
          target_rate: target || null,
          passive_margin: margin > 0 ? margin : null,
          sent_at: now,
          customer_id: bidCustomer?.id || null,
        })
      } catch {}

      setBids(prev => [newBid, ...prev])
    }

    // Reset modal
    setSending(false)
    setShowSendModal(false)
    setBidJobTitle('')
    setBidInstallerIds([])
    setBidOfferedRate('')
    setBidTargetRate('')
    setBidCustomer(null)
  }

  const STATUS_TABS: { key: string; label: string; count: number }[] = [
    { key: 'all', label: 'All Bids', count: bids.length },
    { key: 'pending', label: 'Pending', count: stats.pending },
    { key: 'accepted', label: 'Accepted', count: stats.accepted },
    { key: 'declined', label: 'Declined', count: stats.declined },
  ]

  const computedMargin = useMemo(() => {
    const offered = parseFloat(bidOfferedRate) || 0
    const target = parseFloat(bidTargetRate) || 0
    return offered - target
  }, [bidOfferedRate, bidTargetRate])

  return (
    <div>
      {/* Demo banner */}
      {usingDemo && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 10, marginBottom: 20, fontSize: 13, color: 'var(--amber)',
        }}>
          <AlertTriangle size={14} />
          <span>Showing demo data. Real bids will appear once installer bids are sent.</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontSize: 24, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
            color: 'var(--text1)', marginBottom: 4,
          }}>
            Installer Bids
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            Manage installer bids, track acceptance rates and passive margins
          </p>
        </div>
        {canManage && (
          <button
            className="btn-primary"
            onClick={() => setShowSendModal(true)}
          >
            <Send size={14} />
            Send New Bid
          </button>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Pending', value: String(stats.pending), icon: Clock, color: 'var(--amber)' },
          { label: 'Accepted', value: String(stats.accepted), icon: CheckCircle2, color: 'var(--green)' },
          { label: 'Declined', value: String(stats.declined), icon: XCircle, color: 'var(--red)' },
          { label: 'Avg Response', value: stats.avgResponseHrs > 0 ? `${stats.avgResponseHrs}h` : '--', icon: TrendingUp, color: 'var(--cyan)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${s.color}15`,
            }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {s.label}
              </div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Passive Margin Tracker */}
      <div className="card" style={{ marginBottom: 24, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <DollarSign size={18} style={{ color: 'var(--green)' }} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Passive Margin (Accepted)
            </div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>
              {fmtCurrency(bids.filter(b => b.status === 'accepted').reduce((s, b) => s + (b.passive_margin || 0), 0))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>Avg Offered</div>
            <div className="mono" style={{ fontSize: 14, color: 'var(--text1)', fontWeight: 600 }}>
              {bids.length > 0 ? fmtCurrency(bids.reduce((s, b) => s + (b.offered_rate || 0), 0) / bids.length) : '--'}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>Avg Target</div>
            <div className="mono" style={{ fontSize: 14, color: 'var(--text1)', fontWeight: 600 }}>
              {bids.filter(b => b.target_rate).length > 0
                ? fmtCurrency(bids.filter(b => b.target_rate).reduce((s, b) => s + (b.target_rate || 0), 0) / bids.filter(b => b.target_rate).length)
                : '--'}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>Avg Margin</div>
            <div className="mono" style={{ fontSize: 14, color: 'var(--green)', fontWeight: 600 }}>
              {bids.filter(b => b.passive_margin).length > 0
                ? fmtCurrency(bids.filter(b => b.passive_margin).reduce((s, b) => s + (b.passive_margin || 0), 0) / bids.filter(b => b.passive_margin).length)
                : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: statusFilter === t.key ? 'var(--accent)' : 'var(--surface2)',
                color: statusFilter === t.key ? '#fff' : 'var(--text2)',
              }}
            >
              {t.label}
              <span style={{
                marginLeft: 6, fontSize: 11, opacity: 0.7,
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            className="field"
            placeholder="Search bids..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32, width: 220, height: 34 }}
          />
        </div>
      </div>

      {/* Bids table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '24%' }}>Job</th>
              <th>Installer</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Offered Rate</th>
              <th style={{ textAlign: 'right' }}>Target Rate</th>
              <th style={{ textAlign: 'right' }}>Passive Margin</th>
              <th>Sent</th>
              <th>Response</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                  No bids found matching your filters.
                </td>
              </tr>
            )}
            {filtered.map(bid => {
              const st = STATUS_CONFIG[bid.status] || STATUS_CONFIG.pending
              return (
                <tr
                  key={bid.id}
                  onClick={() => bid.project?.id ? router.push(`/projects/${bid.project.id}`) : undefined}
                  style={{ cursor: bid.project?.id ? 'pointer' : 'default' }}
                >
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 13 }}>
                        {bid.project?.title || 'Unknown Job'}
                      </span>
                      {bid.project?.vehicle_desc && (
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {bid.project.vehicle_desc}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                      {bid.installer_name || '--'}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
                      borderRadius: 6, fontSize: 11, fontWeight: 700,
                      color: st.color, background: st.bg,
                    }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
                      {bid.offered_rate ? fmtCurrency(bid.offered_rate) : '--'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="mono" style={{ fontSize: 13, color: 'var(--text2)' }}>
                      {bid.target_rate ? fmtCurrency(bid.target_rate) : '--'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="mono" style={{
                      fontSize: 13, fontWeight: 600,
                      color: (bid.passive_margin || 0) > 0 ? 'var(--green)' : 'var(--text3)',
                    }}>
                      {bid.passive_margin ? fmtCurrency(bid.passive_margin) : '--'}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {fmtShortDate(bid.sent_at)}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {fmtShortDate(bid.response_at)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Calendar availability section */}
      <div className="card" style={{ marginTop: 24 }}>
        <h2 style={{
          fontSize: 16, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif',
          color: 'var(--text1)', marginBottom: 16,
        }}>
          Installer Availability
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {allInstallers.map(inst => {
            const instBids = bids.filter(b => b.installer_id === inst.id)
            const accepted = instBids.filter(b => b.status === 'accepted').length
            const pending = instBids.filter(b => b.status === 'pending').length
            const upcoming = instBids
              .filter(b => b.status === 'accepted' && b.project?.install_date)
              .sort((a, b) => (a.project?.install_date || '').localeCompare(b.project?.install_date || ''))
            const nextJob = upcoming[0]

            return (
              <div key={inst.id} style={{
                background: 'var(--surface2)', borderRadius: 10, padding: '14px 16px',
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                    {inst.name}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                    background: pending > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(34,192,122,0.15)',
                    color: pending > 0 ? 'var(--amber)' : 'var(--green)',
                  }}>
                    {pending > 0 ? `${pending} pending` : 'Available'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text3)' }}>
                  <span>{accepted} accepted</span>
                  <span>{pending} pending</span>
                </div>
                {nextJob && (
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={10} />
                    Next: {fmtShortDate(nextJob.project?.install_date || null)} -- {nextJob.project?.title}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer count */}
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)', textAlign: 'right' }}>
        Showing {filtered.length} of {bids.length} bids
      </div>

      {/* ─── Send Bid Modal ──────────────────────────────────────────────────── */}
      {showSendModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowSendModal(false)}
        >
          <div
            className="anim-pop-in"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 28, width: 480, maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{
                fontSize: 18, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
                color: 'var(--text1)',
              }}>
                Send New Bid
              </h2>
              <button
                onClick={() => setShowSendModal(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text3)', padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Customer */}
            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Customer (optional)</label>
              {bidCustomer ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{bidCustomer.name}</span>
                    {bidCustomer.company_name && <span style={{ fontSize: 11, color: 'var(--cyan)' }}>{bidCustomer.company_name}</span>}
                    {bidCustomer.phone && <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>{bidCustomer.phone}</span>}
                    {bidCustomer.email && <span style={{ fontSize: 11, color: 'var(--text2)' }}>{bidCustomer.email}</span>}
                  </div>
                  <button onClick={() => setBidCustomerModalOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 600 }}>Change</button>
                </div>
              ) : (
                <button
                  onClick={() => setBidCustomerModalOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(79,127,255,0.1)', border: '1px dashed rgba(79,127,255,0.3)', borderRadius: 6, padding: '8px 12px', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}
                >
                  <Plus size={12} /> Add Customer
                </button>
              )}
              <CustomerSearchModal
                open={bidCustomerModalOpen}
                onClose={() => setBidCustomerModalOpen(false)}
                orgId={profile.org_id}
                onSelect={(c) => { setBidCustomer(c); setBidCustomerModalOpen(false) }}
              />
            </div>

            {/* Job title */}
            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Job / Project Title</label>
              <input
                className="field"
                placeholder="e.g. Ford F-150 Full Wrap"
                value={bidJobTitle}
                onChange={e => setBidJobTitle(e.target.value)}
              />
            </div>

            {/* Select installers */}
            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Select Installers</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allInstallers.map(inst => (
                  <label
                    key={inst.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                      borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                      background: bidInstallerIds.includes(inst.id) ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                      border: `1px solid ${bidInstallerIds.includes(inst.id) ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={bidInstallerIds.includes(inst.id)}
                      onChange={() => toggleInstaller(inst.id)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{inst.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{inst.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Rates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="field-label">Offered Rate ($)</label>
                <input
                  className="field mono"
                  type="number"
                  placeholder="0"
                  value={bidOfferedRate}
                  onChange={e => setBidOfferedRate(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Target Rate ($)</label>
                <input
                  className="field mono"
                  type="number"
                  placeholder="0"
                  value={bidTargetRate}
                  onChange={e => setBidTargetRate(e.target.value)}
                />
              </div>
            </div>

            {/* Passive margin preview */}
            <div style={{
              background: 'var(--surface2)', borderRadius: 10, padding: '12px 16px',
              marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              border: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>
                Passive Margin
              </span>
              <span className="mono" style={{
                fontSize: 16, fontWeight: 700,
                color: computedMargin > 0 ? 'var(--green)' : computedMargin < 0 ? 'var(--red)' : 'var(--text3)',
              }}>
                {computedMargin !== 0 ? fmtCurrency(computedMargin) : '$0'}
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowSendModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={!bidJobTitle.trim() || bidInstallerIds.length === 0 || !bidOfferedRate || sending}
                onClick={handleSendBid}
              >
                <Send size={14} />
                {sending ? 'Sending...' : `Send to ${bidInstallerIds.length} Installer${bidInstallerIds.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
