'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, Briefcase, Factory, Hammer, CheckCircle2, DollarSign,
  AlertTriangle, ArrowUpDown, Filter, ChevronRight, Truck,
  LayoutGrid, List, Plus, Calendar, User,
  type LucideIcon,
} from 'lucide-react'
import type { Profile, Project, PipeStage, ProjectType } from '@/types'
import { isAdminRole } from '@/types'
import NewJobModal from '@/components/modals/NewJobModal'

// ─── Demo data ────────────────────────────────────────────────────────────────
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
  {
    id: 'demo-7', org_id: '', type: 'wrap', title: 'Ram 1500 Partial Wrap - Sides Only',
    status: 'active', customer_id: null, agent_id: null, installer_id: null,
    current_step_id: null, priority: 'normal', vehicle_desc: '2022 Ram 1500 Tradesman',
    install_date: '2026-03-12', due_date: '2026-03-10', revenue: 2100, profit: 1050,
    gpm: 50, commission: 210, division: 'wraps', pipe_stage: 'sales_in',
    form_data: {}, fin_data: null, actuals: {}, checkout: {}, installer_bid: null,
    send_backs: [], referral: null, created_at: '2026-02-19T14:00:00Z',
    updated_at: '2026-02-20T09:00:00Z',
    agent: { id: 'a2', name: 'Amanda Cross', email: 'amanda@usawrapco.com' },
  },
  {
    id: 'demo-8', org_id: '', type: 'wrap', title: 'Transit 350 - Full White Gloss',
    status: 'active', customer_id: null, agent_id: null, installer_id: null,
    current_step_id: null, priority: 'high', vehicle_desc: '2024 Ford Transit 350',
    install_date: '2026-03-07', due_date: '2026-03-05', revenue: 4800, profit: 2400,
    gpm: 50, commission: 480, division: 'wraps', pipe_stage: 'production',
    form_data: {}, fin_data: null, actuals: {}, checkout: {}, installer_bid: null,
    send_backs: [], referral: null, created_at: '2026-02-14T10:00:00Z',
    updated_at: '2026-02-20T16:00:00Z',
    agent: { id: 'a1', name: 'Tyler Reid', email: 'tyler@usawrapco.com' },
  },
]

// ─── Stage config ─────────────────────────────────────────────────────────────
const STAGES: { key: PipeStage; label: string; color: string; bg: string }[] = [
  { key: 'sales_in',    label: 'Sales Intake',  color: 'var(--accent)', bg: 'rgba(79,127,255,0.15)' },
  { key: 'production',  label: 'Production',    color: 'var(--amber)',  bg: 'rgba(245,158,11,0.15)' },
  { key: 'install',     label: 'Install',       color: 'var(--purple)', bg: 'rgba(139,92,246,0.15)' },
  { key: 'prod_review', label: 'QC Review',     color: 'var(--cyan)',   bg: 'rgba(34,211,238,0.15)' },
  { key: 'sales_close', label: 'Closing',       color: 'var(--green)',  bg: 'rgba(34,192,122,0.15)' },
  { key: 'done',        label: 'Done',          color: 'var(--text3)',  bg: 'rgba(90,96,128,0.15)' },
]

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]))

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low:    { label: 'Low',    color: 'var(--text3)' },
  normal: { label: 'Normal', color: 'var(--accent)' },
  high:   { label: 'High',   color: 'var(--amber)' },
  urgent: { label: 'Urgent', color: 'var(--red)' },
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const fmtDate = (d: string | null) => {
  if (!d) return '--'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type ViewMode = 'board' | 'list'
type TabFilter = 'all' | 'design' | 'production' | 'install'
type DivisionFilter = 'all' | 'wraps' | 'decking'

interface Props {
  profile: Profile
  initialJobs: Project[]
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function KanbanCard({ job, onClick }: { job: Project; onClick: () => void }) {
  const prio = PRIORITY_CONFIG[job.priority] || PRIORITY_CONFIG.normal
  const agentName = (job.agent as any)?.name

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.15s',
        marginBottom: 8,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'none'
      }}
    >
      {/* Priority dot + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: prio.color, flexShrink: 0, marginTop: 5,
        }} />
        <span style={{
          fontSize: 12, fontWeight: 700, color: 'var(--text1)', lineHeight: 1.4,
        }}>
          {job.title}
        </span>
      </div>

      {/* Vehicle */}
      {job.vehicle_desc && (
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, paddingLeft: 12 }}>
          {job.vehicle_desc}
        </div>
      )}

      {/* Bottom row: price + date + agent */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 12 }}>
        <span style={{
          fontSize: 12, fontWeight: 700, color: 'var(--green)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {job.revenue ? fmtCurrency(job.revenue) : '--'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {job.install_date && (
            <span style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Calendar size={9} />
              {fmtDate(job.install_date)}
            </span>
          )}
          {agentName && (
            <span title={agentName} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: '50%',
              background: 'rgba(79,127,255,0.15)',
              fontSize: 9, fontWeight: 800, color: 'var(--accent)',
            }}>
              {agentName.charAt(0)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────
function KanbanBoard({ jobs, onJobClick }: { jobs: Project[]; onJobClick: (id: string) => void }) {
  return (
    <div style={{
      display: 'flex', gap: 12, overflowX: 'auto',
      paddingBottom: 16, minHeight: 'calc(100vh - 260px)',
    }}>
      {STAGES.map(stage => {
        const stageJobs = jobs.filter(j => j.pipe_stage === stage.key)
        return (
          <div
            key={stage.key}
            style={{
              minWidth: 240, maxWidth: 280, flex: '1 0 240px',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Column header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', marginBottom: 8,
              borderRadius: 8,
              background: stage.bg,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 800, color: stage.color,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {stage.label}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, color: stage.color,
                fontFamily: 'JetBrains Mono, monospace',
                background: 'rgba(0,0,0,0.2)', borderRadius: 10,
                padding: '1px 6px',
              }}>
                {stageJobs.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {stageJobs.map(job => (
                <KanbanCard
                  key={job.id}
                  job={job}
                  onClick={() => onJobClick(job.id)}
                />
              ))}
              {stageJobs.length === 0 && (
                <div style={{
                  padding: '20px 12px', textAlign: 'center',
                  color: 'var(--text3)', fontSize: 11,
                  border: '1px dashed var(--border)', borderRadius: 10,
                }}>
                  No jobs
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function JobsClient({ profile, initialJobs }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const usingDemo = initialJobs.length === 0
  const allJobs = usingDemo ? DEMO_JOBS : initialJobs
  const [showNewJob, setShowNewJob] = useState(searchParams.get('new') === 'true')

  const [viewMode, setViewMode] = useState<ViewMode>('board')
  const [search, setSearch]     = useState('')
  const [tab, setTab]           = useState<TabFilter>('all')
  const [division, setDivision] = useState<DivisionFilter>('all')
  const [sortField, setSortField] = useState<'created_at' | 'install_date' | 'revenue' | 'priority'>('created_at')
  const [sortAsc, setSortAsc]   = useState(false)

  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }

  const filtered = useMemo(() => {
    let list = [...allJobs]
    if (division !== 'all') list = list.filter(j => j.division === division)
    if (tab === 'design') list = list.filter(j => j.pipe_stage === 'sales_in')
    else if (tab === 'production') list = list.filter(j => j.pipe_stage === 'production' || j.pipe_stage === 'prod_review')
    else if (tab === 'install') list = list.filter(j => j.pipe_stage === 'install')

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(j =>
        j.title.toLowerCase().includes(q) ||
        (j.vehicle_desc || '').toLowerCase().includes(q) ||
        (j.agent as any)?.name?.toLowerCase().includes(q) ||
        (j.installer as any)?.name?.toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      let cmp = 0
      if (sortField === 'priority') cmp = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
      else if (sortField === 'revenue') cmp = (a.revenue || 0) - (b.revenue || 0)
      else if (sortField === 'install_date') cmp = (a.install_date || '').localeCompare(b.install_date || '')
      else cmp = (a.created_at || '').localeCompare(b.created_at || '')
      return sortAsc ? cmp : -cmp
    })
    return list
  }, [allJobs, tab, division, search, sortField, sortAsc])

  const stats = useMemo(() => ({
    total: allJobs.length,
    inProd: allJobs.filter(j => j.pipe_stage === 'production').length,
    installing: allJobs.filter(j => j.pipe_stage === 'install').length,
    completed: allJobs.filter(j => j.pipe_stage === 'done').length,
    totalRevenue: allJobs.reduce((s, j) => s + (j.revenue || 0), 0),
  }), [allJobs])

  function handleSort(field: typeof sortField) {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(false) }
  }

  const TABS: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all',        label: 'All Jobs',   count: allJobs.length },
    { key: 'design',     label: 'Sales',      count: allJobs.filter(j => j.pipe_stage === 'sales_in').length },
    { key: 'production', label: 'Production', count: allJobs.filter(j => j.pipe_stage === 'production' || j.pipe_stage === 'prod_review').length },
    { key: 'install',    label: 'Install',    count: allJobs.filter(j => j.pipe_stage === 'install').length },
  ]

  return (
    <div>
      {usingDemo && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 10, marginBottom: 16, fontSize: 13, color: 'var(--amber)',
        }}>
          <AlertTriangle size={14} />
          <span>Showing demo data. Real jobs will appear once projects are created.</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{
            fontSize: 22, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
            color: 'var(--text1)', marginBottom: 2,
          }}>
            Job Board
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>
            {stats.total} jobs — {stats.totalRevenue > 0 ? fmtCurrency(stats.totalRevenue) + ' total revenue' : 'drag cards to update stage'}
          </p>
        </div>
        <button
          onClick={() => setShowNewJob(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', borderRadius: 8,
            background: 'var(--accent)', color: '#fff',
            fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
          }}
        >
          <Plus size={14} />
          Add Job
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total Jobs',   value: String(stats.total),                icon: Briefcase,   color: 'var(--accent)' },
          { label: 'In Production',value: String(stats.inProd),               icon: Factory,     color: 'var(--amber)' },
          { label: 'Installing',   value: String(stats.installing),           icon: Hammer,      color: 'var(--purple)' },
          { label: 'Completed',    value: String(stats.completed),            icon: CheckCircle2,color: 'var(--green)' },
          { label: 'Revenue',      value: fmtCurrency(stats.totalRevenue),    icon: DollarSign,  color: 'var(--cyan)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${s.color}15` }}>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {s.label}
              </div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>

        {/* Department tabs */}
        <div style={{ display: 'flex', gap: 3 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: tab === t.key ? 'var(--accent)' : 'var(--surface2)',
                color: tab === t.key ? '#fff' : 'var(--text2)',
              }}
            >
              {t.label}
              <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.7, fontFamily: 'JetBrains Mono, monospace' }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Division filter */}
          <div style={{ display: 'flex', gap: 1, background: 'var(--surface)', borderRadius: 7, padding: 2 }}>
            {(['all', 'wraps', 'decking'] as DivisionFilter[]).map(d => (
              <button
                key={d}
                onClick={() => setDivision(d)}
                style={{
                  padding: '4px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: division === d ? 'var(--surface2)' : 'transparent',
                  color: division === d ? 'var(--text1)' : 'var(--text3)',
                }}
              >
                {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              className="field"
              placeholder="Search jobs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 30, width: 190, height: 32, fontSize: 12 }}
            />
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 7, padding: 2, gap: 1 }}>
            <button
              onClick={() => setViewMode('board')}
              title="Board View"
              style={{
                padding: '5px 8px', borderRadius: 5, border: 'none', cursor: 'pointer',
                background: viewMode === 'board' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'board' ? '#fff' : 'var(--text3)',
                transition: 'all 0.15s',
              }}
            >
              <LayoutGrid size={13} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              style={{
                padding: '5px 8px', borderRadius: 5, border: 'none', cursor: 'pointer',
                background: viewMode === 'list' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'list' ? '#fff' : 'var(--text3)',
                transition: 'all 0.15s',
              }}
            >
              <List size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Board View ───────────────────────────────────────────────────── */}
      {viewMode === 'board' && (
        <KanbanBoard
          jobs={filtered}
          onJobClick={id => router.push(`/projects/${id}`)}
        />
      )}

      {/* ── List View ────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Job Title</th>
                  <th>
                    <button onClick={() => handleSort('priority')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, font: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', fontWeight: 'inherit' }}>
                      Priority <ArrowUpDown size={10} />
                    </button>
                  </th>
                  <th>Stage</th>
                  <th>Type</th>
                  <th>Agent</th>
                  <th>
                    <button onClick={() => handleSort('install_date')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, font: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', fontWeight: 'inherit' }}>
                      Install Date <ArrowUpDown size={10} />
                    </button>
                  </th>
                  <th style={{ textAlign: 'right' }}>
                    <button onClick={() => handleSort('revenue')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, font: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', fontWeight: 'inherit', marginLeft: 'auto' }}>
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
                  const stage = STAGE_MAP[job.pipe_stage] || STAGE_MAP.sales_in
                  const prio = PRIORITY_CONFIG[job.priority] || PRIORITY_CONFIG.normal
                  return (
                    <tr
                      key={job.id}
                      onClick={() => router.push(`/projects/${job.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 13 }}>{job.title}</span>
                          {job.vehicle_desc && (
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{job.vehicle_desc}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, color: prio.color }}>
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
                      <td><span style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'capitalize' }}>{job.type}</span></td>
                      <td><span style={{ fontSize: 12, color: 'var(--text2)' }}>{(job.agent as any)?.name || '--'}</span></td>
                      <td><span className="mono" style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtDate(job.install_date)}</span></td>
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
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)', textAlign: 'right' }}>
            Showing {filtered.length} of {allJobs.length} jobs
          </div>
        </>
      )}

      {showNewJob && (
        <NewJobModal
          isOpen={showNewJob}
          onClose={() => setShowNewJob(false)}
          orgId={profile.org_id}
          currentUserId={profile.id}
          onJobCreated={() => { setShowNewJob(false); router.refresh() }}
        />
      )}
    </div>
  )
}
