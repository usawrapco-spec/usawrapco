'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Plus, FileText, Send, CheckCircle2, Clock, XCircle,
  DollarSign, TrendingUp, Filter, ChevronRight, AlertTriangle,
} from 'lucide-react'
import type { Profile, Estimate, EstimateStatus } from '@/types'
import { isAdminRole } from '@/types'
import { hasPermission } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'

// ─── Demo data when DB tables don't exist yet ────────────────────────────────
const DEMO_ESTIMATES: Estimate[] = [
  {
    id: 'demo-est-1', org_id: '', estimate_number: 1001, title: 'Ford F-150 Full Wrap',
    customer_id: null, status: 'draft', sales_rep_id: null, production_manager_id: null,
    project_manager_id: null, quote_date: '2026-02-18', due_date: '2026-03-01',
    subtotal: 3200, discount: 0, tax_rate: 0.0825, tax_amount: 264, total: 3464,
    notes: 'Matte black full wrap with chrome delete', customer_note: null,
    division: 'wraps', form_data: {}, created_at: '2026-02-18T10:00:00Z',
    updated_at: '2026-02-18T10:00:00Z',
    customer: { id: 'c1', name: 'Mike Johnson', email: 'mike@example.com' },
    sales_rep: { id: 's1', name: 'Tyler Reid' },
  },
  {
    id: 'demo-est-2', org_id: '', estimate_number: 1002, title: 'Tesla Model 3 PPF + Tint',
    customer_id: null, status: 'sent', sales_rep_id: null, production_manager_id: null,
    project_manager_id: null, quote_date: '2026-02-15', due_date: '2026-02-25',
    subtotal: 4800, discount: 200, tax_rate: 0.0825, tax_amount: 379.50, total: 4979.50,
    notes: 'Full front PPF, ceramic tint all around', customer_note: 'Please schedule ASAP',
    division: 'wraps', form_data: {}, created_at: '2026-02-15T14:00:00Z',
    updated_at: '2026-02-16T09:00:00Z',
    customer: { id: 'c2', name: 'Sarah Chen', email: 'sarah@example.com' },
    sales_rep: { id: 's1', name: 'Tyler Reid' },
  },
  {
    id: 'demo-est-3', org_id: '', estimate_number: 1003, title: 'Sprinter Van Commercial Wrap',
    customer_id: null, status: 'accepted', sales_rep_id: null, production_manager_id: null,
    project_manager_id: null, quote_date: '2026-02-10', due_date: '2026-02-20',
    subtotal: 5600, discount: 300, tax_rate: 0.0825, tax_amount: 437.25, total: 5737.25,
    notes: 'Full commercial wrap with logos and contact info', customer_note: null,
    division: 'wraps', form_data: {}, created_at: '2026-02-10T11:00:00Z',
    updated_at: '2026-02-14T16:00:00Z',
    customer: { id: 'c3', name: 'ABC Plumbing LLC', email: 'info@abcplumbing.com' },
    sales_rep: { id: 's2', name: 'Amanda Cross' },
  },
  {
    id: 'demo-est-4', org_id: '', estimate_number: 1004, title: 'BMW M4 Color Change',
    customer_id: null, status: 'expired', sales_rep_id: null, production_manager_id: null,
    project_manager_id: null, quote_date: '2026-01-20', due_date: '2026-02-01',
    subtotal: 4200, discount: 0, tax_rate: 0.0825, tax_amount: 346.50, total: 4546.50,
    notes: 'Gloss racing green color change', customer_note: null,
    division: 'wraps', form_data: {}, created_at: '2026-01-20T09:00:00Z',
    updated_at: '2026-02-02T00:00:00Z',
    customer: { id: 'c4', name: 'David Park', email: 'david@example.com' },
    sales_rep: { id: 's1', name: 'Tyler Reid' },
  },
  {
    id: 'demo-est-5', org_id: '', estimate_number: 1005, title: 'Fleet Wraps - 3 Trucks',
    customer_id: null, status: 'sent', sales_rep_id: null, production_manager_id: null,
    project_manager_id: null, quote_date: '2026-02-19', due_date: '2026-03-05',
    subtotal: 9600, discount: 500, tax_rate: 0.0825, tax_amount: 750.75, total: 9850.75,
    notes: 'Fleet branding for 3 box trucks', customer_note: 'Need all done within 2 weeks',
    division: 'wraps', form_data: {}, created_at: '2026-02-19T08:30:00Z',
    updated_at: '2026-02-19T08:30:00Z',
    customer: { id: 'c5', name: 'Quick Move Co', email: 'ops@quickmove.com' },
    sales_rep: { id: 's2', name: 'Amanda Cross' },
  },
  {
    id: 'demo-est-6', org_id: '', estimate_number: 1006, title: 'Composite Deck Install',
    customer_id: null, status: 'draft', sales_rep_id: null, production_manager_id: null,
    project_manager_id: null, quote_date: '2026-02-20', due_date: '2026-03-10',
    subtotal: 12400, discount: 0, tax_rate: 0.0825, tax_amount: 1023, total: 13423,
    notes: '400 sq ft composite deck with railing', customer_note: null,
    division: 'decking', form_data: {}, created_at: '2026-02-20T15:00:00Z',
    updated_at: '2026-02-20T15:00:00Z',
    customer: { id: 'c6', name: 'Jennifer Adams', email: 'jen@example.com' },
    sales_rep: { id: 's1', name: 'Tyler Reid' },
  },
]

const STATUS_CONFIG: Record<EstimateStatus, { label: string; color: string; bg: string }> = {
  draft:    { label: 'Draft',    color: 'var(--text3)',  bg: 'rgba(90,96,128,0.15)' },
  sent:     { label: 'Sent',     color: 'var(--accent)', bg: 'rgba(79,127,255,0.15)' },
  accepted: { label: 'Accepted', color: 'var(--green)',  bg: 'rgba(34,192,122,0.15)' },
  expired:  { label: 'Expired',  color: 'var(--amber)',  bg: 'rgba(245,158,11,0.15)' },
  rejected: { label: 'Rejected', color: 'var(--red)',    bg: 'rgba(242,90,90,0.15)' },
  void:     { label: 'Void',     color: 'var(--text3)',  bg: 'rgba(90,96,128,0.10)' },
}

type TabFilter = 'all' | 'draft' | 'sent' | 'accepted'

interface Props {
  profile: Profile
  initialEstimates: Estimate[]
}

export default function EstimatesClient({ profile, initialEstimates }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const usingDemo = initialEstimates.length === 0
  const allEstimates = usingDemo ? DEMO_ESTIMATES : initialEstimates

  const [estimates, setEstimates] = useState<Estimate[]>(allEstimates)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabFilter>('all')
  const [creating, setCreating] = useState(false)

  const canWrite = isAdminRole(profile.role) || hasPermission(profile.role, 'sales.write')

  // Filter logic
  const filtered = useMemo(() => {
    let list = estimates
    if (tab !== 'all') list = list.filter(e => e.status === tab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.customer?.name?.toLowerCase().includes(q) ||
        e.customer?.email?.toLowerCase().includes(q) ||
        String(e.estimate_number).includes(q)
      )
    }
    return list
  }, [estimates, tab, search])

  // Stats
  const stats = useMemo(() => {
    const draft = estimates.filter(e => e.status === 'draft').length
    const sent = estimates.filter(e => e.status === 'sent').length
    const accepted = estimates.filter(e => e.status === 'accepted').length
    const totalValue = estimates.reduce((s, e) => s + (e.total || 0), 0)
    const acceptedValue = estimates.filter(e => e.status === 'accepted').reduce((s, e) => s + (e.total || 0), 0)
    return { draft, sent, accepted, totalValue, acceptedValue, total: estimates.length }
  }, [estimates])

  async function handleCreate() {
    if (!canWrite) return
    setCreating(true)
    try {
      const { data, error } = await supabase.from('estimates').insert({
        org_id: profile.org_id,
        title: 'New Estimate',
        status: 'draft',
        sales_rep_id: profile.id,
        division: 'wraps',
        quote_date: new Date().toISOString().split('T')[0],
      }).select().single()

      if (error) throw error
      if (data) router.push(`/estimates/${data.id}`)
    } catch (err) {
      console.error('Create estimate error:', err)
      // If table doesn't exist, navigate to demo detail
      router.push(`/estimates/demo-est-1`)
    }
    setCreating(false)
  }

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const fmtDate = (d: string | null) => {
    if (!d) return '--'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const TABS: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: estimates.length },
    { key: 'draft', label: 'Drafts', count: stats.draft },
    { key: 'sent', label: 'Sent', count: stats.sent },
    { key: 'accepted', label: 'Accepted', count: stats.accepted },
  ]

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
          <span>Showing demo data. Run the v6 migration SQL to enable live estimates.</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontSize: 24, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
            color: 'var(--text1)', marginBottom: 4,
          }}>
            Estimates
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            {stats.total} estimate{stats.total !== 1 ? 's' : ''} total
          </p>
        </div>
        {canWrite && (
          <button
            onClick={handleCreate}
            disabled={creating}
            className="btn-primary"
          >
            <Plus size={14} /> New Estimate
          </button>
        )}
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard icon={<FileText size={16} />} label="Draft" value={stats.draft} color="var(--text3)" />
        <StatCard icon={<Send size={16} />} label="Sent" value={stats.sent} color="var(--accent)" />
        <StatCard icon={<CheckCircle2 size={16} />} label="Accepted" value={stats.accepted} color="var(--green)" />
        <StatCard icon={<DollarSign size={16} />} label="Pipeline Value" value={fmtCurrency(stats.totalValue)} color="var(--amber)" isMono />
        <StatCard icon={<TrendingUp size={16} />} label="Won Value" value={fmtCurrency(stats.acceptedValue)} color="var(--green)" isMono />
      </div>

      {/* Filter tabs + search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: tab === t.key ? 'var(--accent)' : 'var(--surface2)',
                color: tab === t.key ? '#fff' : 'var(--text2)',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
              <span style={{
                marginLeft: 6, fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                opacity: 0.7,
              }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', width: 300 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search estimates..."
            className="field"
            style={{ paddingLeft: 32 }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>#</th>
              <th>Title</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Rep</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th>Date</th>
              <th>Due</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                  {search ? 'No estimates match your search' : 'No estimates yet'}
                </td>
              </tr>
            ) : (
              filtered.map(est => {
                const sc = STATUS_CONFIG[est.status]
                return (
                  <tr
                    key={est.id}
                    onClick={() => router.push(`/estimates/${est.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span className="mono" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                        EST-{est.estimate_number}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 13 }}>
                      {est.title}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {est.customer?.name || '--'}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
                        borderRadius: 6, fontSize: 11, fontWeight: 700,
                        color: sc.color, background: sc.bg,
                      }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {est.sales_rep?.name || '--'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="mono" style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>
                        {fmtCurrency(est.total)}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {fmtDate(est.quote_date)}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {fmtDate(est.due_date)}
                    </td>
                    <td>
                      <ChevronRight size={14} style={{ color: 'var(--text3)' }} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, color, isMono,
}: {
  icon: React.ReactNode; label: string; value: string | number; color: string; isMono?: boolean
}) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: `${color}15`, color,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>
        <div style={{
          fontSize: 18, fontWeight: 800, color: 'var(--text1)',
          fontFamily: isMono ? 'JetBrains Mono, monospace' : 'Barlow Condensed, sans-serif',
        }}>
          {value}
        </div>
      </div>
    </div>
  )
}
