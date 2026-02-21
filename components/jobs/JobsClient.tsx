'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Briefcase, Factory, Hammer, CheckCircle2, DollarSign,
  AlertTriangle, ArrowUpDown, Filter, ChevronRight, Truck,
  type LucideIcon,
} from 'lucide-react'
import type { Profile, Project, PipeStage, ProjectType } from '@/types'
import { isAdminRole } from '@/types'

// ─── Demo data ──────────────────────────────────────────────────────────────
const DEMO_JOBS: Project[] = [
  {
    id: 'demo-1', org_id: '', type: 'wrap', title: 'Ford F-150 Matte Black Full Wrap',
    status: 'active', customer_id: null, agent_id: null, installer_id: null,
    current_step_id: null, priority: 'high', vehicle_desc: '2024 Ford F-150 XLT',
    install_date: '2026-03-05', due_date: '2026-03-03', revenue: 3800, profit: 1900,
    gpm: 50, commission: 380, division: 'wraps', pipe_stage: 'production',
    form_data: {}, fin_data: null, actuals: {}, checkout: {}, installer_bid: null,
    send_backs: [], referral: null, created_at: '2026-02-10T10:00:00Z',
    updated_at: '2026-02-18T14:00:00Z',
    agent: { id: 'a1', name: 'Tyler Reid', email: 'tyler@usawrapco.com' },
  },
  {
    id: 'demo-2', org_id: '', type: 'wrap', title: 'Tesla Model 3 Color Change - Satin Blue',
    status: 'install_scheduled', customer_id: null, agent_id: null, installer_id: null,
    current_step_id: null, priority: 'normal', vehicle_desc: '2025 Tesla Model 3',
    install_date: '2026-02-28', due_date: '2026-02-27', revenue: 4200, profit: 2100,
    gpm: 50, commission: 420, division: 'wraps', pipe_stage: 'install',
    form_data: {}, fin_data: null, actuals: {}, checkout: {}, installer_bid: null,
    send_backs: [], referral: null, created_at: '2026-02-05T09:00:00Z',
    updated_at: '2026-02-20T11:00:00Z',
    agent: { id: 'a2', name: 'Amanda Cross', email: 'amanda@usawrapco.com' },
    installer: { id: 'i1', name: 'Jake Martinez', email: 'jake@usawrapco.com' },
  },
  {
    id: 'demo-3', org_id: '', type: 'wrap', title: 'Sprinter Van Commercial Fleet Branding',
    status: 'active', customer_id: null, agent_id: null, installer_id: null,
    current_step_id: null, priority: 'urgent', vehicle_desc: '2024 Mercedes Sprinter',
    install_date: '2026-03-10', due_date: '2026-03-08', revenue: 5600, profit: 2800,
    gpm: 50, commission: 560, division: 'wraps', pipe_stage: 'sales_in',
    form_data: {}, fin_data: null, actuals: {}, checkout: {}, installer_bid: null,
    send_backs: [], referral: null, created_at: '2026-02-18T08:30:00Z',
    updated_at: '2026-02-19T16:00:00Z',
    agent: { id: 'a1', name: 'Tyler Reid', email: 'tyler@usawrapco.com' },
  },
  {
    id: 'demo-4', org_id: '', type: 'wrap', title: 'BMW M4 Gloss Racing Green',
    status: 'qc', customer_id: null, agent_id: null, installer_id: null,
    current_step_id: null, priority: 'normal', vehicle_desc: '2024 BMW M4 Competition',
    install_date: '2026-02-22', due_date: '2026-02-21', revenue: 4500, profit: 2250,
    gpm: 50, commission: 450, division: 'wraps', pipe_stage: 'prod_review',
    form_data: {}, fin_data: null, actuals: {}, checkout: {}, installer_bid: null,
    send_backs: [], referral: null, created_at: '2026-02-01T12:00:00Z',
    updated_at: '2026-02-21T09:00:00Z',
    agent: { id: 'a2', name: 'Amanda Cross', email: 'amanda@usawrapco.com' },
    installer: { id: 'i1', name: 'Jake Martinez', email: 'jake@usawrapco.com' },
  },
  {
    id: 'demo-5', org_id: '', type: 'decking', title: 'Composite Deck - 400 sqft',
    status: 'closing', customer_id: null, agent_id: null, installer_id: null,
    current_step_id: null, priority: 'low', vehicle_desc: null,
    install_date: '2026-02-15', due_date: '2026-02-14', revenue: 12400, profit: 4960,
    gpm: 40, commission: 1240, division: 'decking', pipe_stage: 'sales_close',
    form_data: {}, fin_data: null, actuals: {}, checkout: {}, installer_bid: null,
    send_backs: [], referral: null, created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-02-16T17:00:00Z',
    agent: { id: 'a1', name: 'Tyler Reid', email: 'tyler@usawrapco.com' },
  },
  {
    id: 'demo-6', org_id: '', type: 'wrap', title: 'Chevy Silverado Fleet - Unit 3',
    status: 'closed', customer_id: null, agent_id: null, installer_id: null,
    current_step_id: null, priority: 'normal', vehicle_desc: '2023 Chevy Silverado 1500',
    install_date: '2026-02-08', due_date: '2026-02-07', revenue: 3200, profit: 1600,
    gpm: 50, commission: 320, division: 'wraps', pipe_stage: 'done',
    form_data: {}, fin_data: null, actuals: {}, checkout: {}, installer_bid: null,
    send_backs: [], referral: null, created_at: '2026-01-15T14:00:00Z',
    updated_at: '2026-02-10T10:00:00Z',
    agent: { id: 'a2', name: 'Amanda Cross', email: 'amanda@usawrapco.com' },
    installer: { id: 'i1', name: 'Jake Martinez', email: 'jake@usawrapco.com' },
  },
]

// ─── Stage config ────────────────────────────────────────────────────────────
const STAGE_CONFIG: Record<PipeStage, { label: string; color: string; bg: string }> = {
  sales_in:    { label: 'Sales In',     color: 'var(--accent)', bg: 'rgba(79,127,255,0.15)' },
  production:  { label: 'Production',   color: 'var(--amber)',  bg: 'rgba(245,158,11,0.15)' },
  install:     { label: 'Install',      color: 'var(--purple)', bg: 'rgba(139,92,246,0.15)' },
  prod_review: { label: 'QC Review',    color: 'var(--cyan)',   bg: 'rgba(34,211,238,0.15)' },
  sales_close: { label: 'Sales Close',  color: 'var(--green)',  bg: 'rgba(34,192,122,0.15)' },
  done:        { label: 'Completed',    color: 'var(--text3)',  bg: 'rgba(90,96,128,0.15)' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low:    { label: 'Low',    color: 'var(--text3)',  bg: 'rgba(90,96,128,0.15)' },
  normal: { label: 'Normal', color: 'var(--accent)', bg: 'rgba(79,127,255,0.12)' },
  high:   { label: 'High',   color: 'var(--amber)',  bg: 'rgba(245,158,11,0.15)' },
  urgent: { label: 'Urgent', color: 'var(--red)',    bg: 'rgba(242,90,90,0.15)' },
}

type TabFilter = 'all' | 'design' | 'production' | 'install'
type DivisionFilter = 'all' | 'wraps' | 'decking'

interface Props {
  profile: Profile
  initialJobs: Project[]
}

export default function JobsClient({ profile, initialJobs }: Props) {
  const router = useRouter()
  const usingDemo = initialJobs.length === 0
  const allJobs = usingDemo ? DEMO_JOBS : initialJobs

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabFilter>('all')
  const [division, setDivision] = useState<DivisionFilter>('all')
  const [sortField, setSortField] = useState<'created_at' | 'install_date' | 'revenue' | 'priority'>('created_at')
  const [sortAsc, setSortAsc] = useState(false)

  // Priority sort order
  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }

  // Filter logic
  const filtered = useMemo(() => {
    let list = [...allJobs]

    // Division filter
    if (division !== 'all') list = list.filter(j => j.division === division)

    // Tab filter
    if (tab === 'design') list = list.filter(j => j.pipe_stage === 'sales_in')
    else if (tab === 'production') list = list.filter(j => j.pipe_stage === 'production' || j.pipe_stage === 'prod_review')
    else if (tab === 'install') list = list.filter(j => j.pipe_stage === 'install')

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(j =>
        j.title.toLowerCase().includes(q) ||
        (j.vehicle_desc || '').toLowerCase().includes(q) ||
        (j.agent as any)?.name?.toLowerCase().includes(q) ||
        (j.installer as any)?.name?.toLowerCase().includes(q)
      )
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0
      if (sortField === 'priority') {
        cmp = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
      } else if (sortField === 'revenue') {
        cmp = (a.revenue || 0) - (b.revenue || 0)
      } else if (sortField === 'install_date') {
        cmp = (a.install_date || '').localeCompare(b.install_date || '')
      } else {
        cmp = (a.created_at || '').localeCompare(b.created_at || '')
      }
      return sortAsc ? cmp : -cmp
    })

    return list
  }, [allJobs, tab, division, search, sortField, sortAsc])

  // Stats
  const stats = useMemo(() => {
    const inProd = allJobs.filter(j => j.pipe_stage === 'production').length
    const installing = allJobs.filter(j => j.pipe_stage === 'install').length
    const completed = allJobs.filter(j => j.pipe_stage === 'done').length
    const totalRevenue = allJobs.reduce((s, j) => s + (j.revenue || 0), 0)
    return { total: allJobs.length, inProd, installing, completed, totalRevenue }
  }, [allJobs])

  function handleSort(field: typeof sortField) {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(false) }
  }

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const fmtDate = (d: string | null) => {
    if (!d) return '--'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const TABS: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All Jobs', count: allJobs.length },
    { key: 'design', label: 'Design', count: allJobs.filter(j => j.pipe_stage === 'sales_in').length },
    { key: 'production', label: 'Production', count: allJobs.filter(j => j.pipe_stage === 'production' || j.pipe_stage === 'prod_review').length },
    { key: 'install', label: 'Install', count: allJobs.filter(j => j.pipe_stage === 'install').length },
  ]

  const DIVISION_TABS: { key: DivisionFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'wraps', label: 'Wraps' },
    { key: 'decking', label: 'Decking' },
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
          <span>Showing demo data. Real jobs will appear once projects are created.</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontSize: 24, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
            color: 'var(--text1)', marginBottom: 4,
          }}>
            Jobs
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            All jobs across the pipeline -- flat list view
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Jobs', value: String(stats.total), icon: Briefcase, color: 'var(--accent)' },
          { label: 'In Production', value: String(stats.inProd), icon: Factory, color: 'var(--amber)' },
          { label: 'Installing', value: String(stats.installing), icon: Hammer, color: 'var(--purple)' },
          { label: 'Completed', value: String(stats.completed), icon: CheckCircle2, color: 'var(--green)' },
          { label: 'Total Revenue', value: fmtCurrency(stats.totalRevenue), icon: DollarSign, color: 'var(--cyan)' },
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

      {/* Filters bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: tab === t.key ? 'var(--accent)' : 'var(--surface2)',
                color: tab === t.key ? '#fff' : 'var(--text2)',
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

        {/* Right side: division + search */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Division filter */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', borderRadius: 8, padding: 2 }}>
            {DIVISION_TABS.map(d => (
              <button
                key={d.key}
                onClick={() => setDivision(d.key)}
                style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: division === d.key ? 'var(--surface2)' : 'transparent',
                  color: division === d.key ? 'var(--text1)' : 'var(--text3)',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              className="field"
              placeholder="Search jobs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, width: 220, height: 34 }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '28%' }}>Job Title</th>
              <th>
                <button
                  onClick={() => handleSort('priority')}
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, font: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', fontWeight: 'inherit' }}
                >
                  Priority <ArrowUpDown size={10} />
                </button>
              </th>
              <th>Stage</th>
              <th>Type</th>
              <th>Agent</th>
              <th>
                <button
                  onClick={() => handleSort('install_date')}
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, font: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', fontWeight: 'inherit' }}
                >
                  Install Date <ArrowUpDown size={10} />
                </button>
              </th>
              <th style={{ textAlign: 'right' }}>
                <button
                  onClick={() => handleSort('revenue')}
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, font: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', fontWeight: 'inherit', marginLeft: 'auto' }}
                >
                  Revenue <ArrowUpDown size={10} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                  No jobs found matching your filters.
                </td>
              </tr>
            )}
            {filtered.map(job => {
              const stage = STAGE_CONFIG[job.pipe_stage] || STAGE_CONFIG.sales_in
              const prio = PRIORITY_CONFIG[job.priority] || PRIORITY_CONFIG.normal
              return (
                <tr
                  key={job.id}
                  onClick={() => router.push(`/projects/${job.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 13 }}>
                        {job.title}
                      </span>
                      {job.vehicle_desc && (
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {job.vehicle_desc}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
                      borderRadius: 6, fontSize: 11, fontWeight: 700,
                      color: prio.color, background: prio.bg,
                    }}>
                      {prio.label}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
                      borderRadius: 6, fontSize: 11, fontWeight: 700,
                      color: stage.color, background: stage.bg,
                    }}>
                      {stage.label}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'capitalize' }}>
                      {job.type}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {(job.agent as any)?.name || '--'}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {fmtDate(job.install_date)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>
                      {job.revenue ? fmtCurrency(job.revenue) : '--'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)', textAlign: 'right' }}>
        Showing {filtered.length} of {allJobs.length} jobs
      </div>
    </div>
  )
}
