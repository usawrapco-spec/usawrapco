'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Project, PipeStage } from '@/types'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Briefcase, Printer, Wrench, Search, CheckCircle,
  LayoutGrid, List, ChevronRight, DollarSign,
  ArrowUpDown, Plus, Factory, Hammer, CheckCircle2,
  type LucideIcon,
} from 'lucide-react'
// OnboardingLinkPanel moved to Sales dropdown in TopNav
import NewJobModal from '@/components/modals/NewJobModal'
import SalesPipeline from './SalesPipeline'
import ProductionPipeline from './ProductionPipeline'
import InstallPipeline from './InstallPipeline'

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface UnifiedJobBoardProps {
  profile: Profile
  initialProjects: Project[]
  orgId: string
}

const STAGE_COLORS: Record<string, string> = {
  sales_in: '#4f7fff', production: '#22c07a', install: '#22d3ee',
  prod_review: '#f59e0b', sales_close: '#8b5cf6',
}

const STAGES: { key: PipeStage; label: string; icon: LucideIcon; color: string }[] = [
  { key: 'sales_in',    label: 'Sales Intake',  icon: Briefcase,   color: '#4f7fff' },
  { key: 'production',  label: 'Production',    icon: Printer,     color: '#22c07a' },
  { key: 'install',     label: 'Install',       icon: Wrench,      color: '#22d3ee' },
  { key: 'prod_review', label: 'QC Review',     icon: Search,      color: '#f59e0b' },
  { key: 'sales_close', label: 'Sales Close',   icon: CheckCircle, color: '#8b5cf6' },
]

const DEPT_STATUS_BADGES = [
  { key: 'sales_in',    short: 'SLS', color: '#4f7fff' },
  { key: 'production',  short: 'PRD', color: '#22c07a' },
  { key: 'install',     short: 'INS', color: '#22d3ee' },
  { key: 'prod_review', short: 'QC',  color: '#f59e0b' },
  { key: 'sales_close', short: 'CLO', color: '#8b5cf6' },
]

type ViewMode = 'kanban' | 'list'
type SortKey = 'customer' | 'vehicle' | 'value' | 'stage' | 'days'
type DeptView = 'all' | 'sales' | 'production' | 'install'

const DEPT_TABS: { key: DeptView; label: string; icon: LucideIcon; color: string }[] = [
  { key: 'all',        label: 'All Jobs',            icon: LayoutGrid, color: '#8b5cf6' },
  { key: 'sales',      label: 'Sales',               icon: Briefcase,  color: '#4f7fff' },
  { key: 'production', label: 'Production / Design', icon: Printer,    color: '#22c07a' },
  { key: 'install',    label: 'Install',             icon: Wrench,     color: '#22d3ee' },
]

const DEPT_STAGES: Record<DeptView, string[]> = {
  all:        ['sales_in', 'production', 'install', 'prod_review', 'sales_close'],
  sales:      ['sales_in', 'sales_close'],
  production: ['production', 'prod_review'],
  install:    ['install'],
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function getDefaultDept(role: string): DeptView {
  switch (role) {
    case 'installer': return 'install'
    case 'production':
    case 'designer': return 'production'
    case 'sales_agent': return 'sales'
    default: return 'all'
  }
}

function shouldShowDeptTab(tab: DeptView, role: string): boolean {
  if (['admin', 'owner'].includes(role)) return true
  if (tab === 'all') return true
  if (tab === 'sales' && role === 'sales_agent') return true
  if (tab === 'production' && ['production', 'designer'].includes(role)) return true
  if (tab === 'install' && ['installer', 'production'].includes(role)) return true
  return false
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const daysOpen = (p: Project) => {
  const created = p.created_at ? new Date(p.created_at).getTime() : Date.now()
  return Math.floor((Date.now() - created) / 86400000)
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function UnifiedJobBoard({ profile, initialProjects, orgId }: UnifiedJobBoardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [agentFilter, setAgentFilter] = useState('all')
  const [installerFilter, setInstallerFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [sortKey, setSortKey] = useState<SortKey>('stage')
  const [sortAsc, setSortAsc] = useState(true)
  const [deptView, setDeptView] = useState<DeptView>(getDefaultDept(profile.role))
  const [contentKey, setContentKey] = useState(0)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showNewJob, setShowNewJob] = useState(searchParams.get('new') === 'true')

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('pipeline-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'projects',
        filter: `org_id=eq.${profile.org_id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setProjects(prev => [...prev, payload.new as Project])
        } else if (payload.eventType === 'UPDATE') {
          setProjects(prev => prev.map(p =>
            p.id === (payload.new as Project).id ? { ...p, ...payload.new } : p
          ))
        } else if (payload.eventType === 'DELETE') {
          setProjects(prev => prev.filter(p => p.id !== (payload.old as any).id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile.org_id])

  // Active jobs (exclude done/cancelled)
  const activeJobs = useMemo(() =>
    projects.filter(p => p.pipe_stage !== 'done' && p.status !== 'cancelled'),
    [projects]
  )

  const filtered = useMemo(() => {
    let list = [...activeJobs]
    if (agentFilter !== 'all') list = list.filter(p => p.agent_id === agentFilter)
    if (installerFilter !== 'all') list = list.filter(p => p.installer_id === installerFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.vehicle_desc?.toLowerCase().includes(q) ||
        (p.customer as any)?.name?.toLowerCase().includes(q) ||
        (p.agent as any)?.name?.toLowerCase().includes(q) ||
        (p.form_data as any)?.clientName?.toLowerCase().includes(q)
      )
    }
    return list
  }, [activeJobs, agentFilter, installerFilter, searchQuery])

  const deptCounts = useMemo(() => ({
    all:        activeJobs.length,
    sales:      activeJobs.filter(p => DEPT_STAGES.sales.includes(p.pipe_stage || 'sales_in')).length,
    production: activeJobs.filter(p => DEPT_STAGES.production.includes(p.pipe_stage || 'sales_in')).length,
    install:    activeJobs.filter(p => DEPT_STAGES.install.includes(p.pipe_stage || 'sales_in')).length,
  }), [activeJobs])

  // Stats row
  const stats = useMemo(() => ({
    total: activeJobs.length,
    inProd: activeJobs.filter(j => j.pipe_stage === 'production').length,
    installing: activeJobs.filter(j => j.pipe_stage === 'install').length,
    completed: projects.filter(j => j.pipe_stage === 'done').length,
    totalRevenue: activeJobs.reduce((s, j) => s + (j.revenue || 0), 0),
  }), [activeJobs, projects])

  // Unique agents & installers for filters
  const agentMap = new Map<string, string>()
  projects.forEach(p => { if (p.agent_id && (p.agent as any)?.name) agentMap.set(p.agent_id, (p.agent as any).name) })
  const agents = Array.from(agentMap.entries())

  const installerMap = new Map<string, string>()
  projects.forEach(p => { if (p.installer_id && (p.installer as any)?.name) installerMap.set(p.installer_id, (p.installer as any).name) })
  const installers = Array.from(installerMap.entries())

  const totalPipelineValue = filtered.reduce((s, p) => s + (p.revenue || 0), 0)

  // Sorted list for table view
  const sortedList = useMemo(() => {
    const list = [...filtered]
    const stageOrder = STAGES.map(s => s.key)
    list.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'customer': cmp = ((a.customer as any)?.name || a.title || '').localeCompare((b.customer as any)?.name || b.title || ''); break
        case 'vehicle': cmp = (a.vehicle_desc || '').localeCompare(b.vehicle_desc || ''); break
        case 'value': cmp = (a.revenue || 0) - (b.revenue || 0); break
        case 'stage': cmp = stageOrder.indexOf(a.pipe_stage || 'sales_in') - stageOrder.indexOf(b.pipe_stage || 'sales_in'); break
        case 'days': cmp = daysOpen(a) - daysOpen(b); break
      }
      return sortAsc ? cmp : -cmp
    })
    return list
  }, [filtered, sortKey, sortAsc])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  const switchDept = (dept: DeptView) => {
    setDeptView(dept)
    setContentKey(k => k + 1)
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* ── GLASS PILL TAB BAR ─────────────────────────────────── */}
      <div style={{ overflowX: 'auto', marginBottom: 24, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <div style={{
          display: 'flex', gap: 6, padding: 6,
          background: 'rgba(19,21,28,0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.06)',
          minWidth: 'max-content',
        }}>
          {DEPT_TABS.filter(dept => shouldShowDeptTab(dept.key, profile.role)).map(dept => {
            const isActive = deptView === dept.key
            const count = deptCounts[dept.key]
            return (
              <button
                key={dept.key}
                onClick={() => switchDept(dept.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '11px 22px', borderRadius: 14,
                  border: 'none', cursor: 'pointer',
                  fontSize: 15, fontWeight: isActive ? 800 : 600,
                  fontFamily: 'Barlow Condensed, sans-serif',
                  letterSpacing: '0.03em', textTransform: 'uppercase',
                  background: isActive ? dept.color : 'transparent',
                  color: isActive ? '#fff' : 'var(--text3)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? `0 4px 20px ${dept.color}50` : 'none',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = `${dept.color}18`
                    e.currentTarget.style.color = dept.color
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text3)'
                  }
                }}
              >
                <dept.icon size={17} />
                {dept.label}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 24, height: 22, padding: '0 7px', borderRadius: 11,
                  fontSize: 12, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
                  background: isActive ? 'rgba(255,255,255,0.22)' : `${dept.color}25`,
                  color: isActive ? '#fff' : dept.color,
                }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── CONTENT AREA (animated fade) ────────────────────────── */}
      <div key={contentKey} style={{ animation: 'contentFadeIn 0.25s ease both' }}>
        {deptView === 'all' ? (
          <AllJobsView
            profile={profile}
            projects={projects}
            filtered={filtered}
            activeJobs={activeJobs}
            stats={stats}
            agents={agents}
            installers={installers}
            agentFilter={agentFilter}
            setAgentFilter={setAgentFilter}
            installerFilter={installerFilter}
            setInstallerFilter={setInstallerFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            viewMode={viewMode}
            setViewMode={setViewMode}
            sortKey={sortKey}
            sortAsc={sortAsc}
            handleSort={handleSort}
            sortedList={sortedList}
            totalPipelineValue={totalPipelineValue}
            showNewJob={showNewJob}
            setShowNewJob={setShowNewJob}
            orgId={orgId}
            router={router}
          />
        ) : deptView === 'sales' ? (
          <SalesPipeline orgId={orgId} profileId={profile.id} role={profile.role} />
        ) : deptView === 'production' ? (
          <ProductionPipeline orgId={orgId} profileId={profile.id} role={profile.role} />
        ) : (
          <InstallPipeline orgId={orgId} profileId={profile.id} role={profile.role} />
        )}
      </div>

      {/* Fade animation keyframes */}
      <style>{`
        @keyframes contentFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

/* ─── "All Jobs" View ─────────────────────────────────────────────────────── */

function AllJobsView({
  profile, projects, filtered, activeJobs, stats,
  agents, installers, agentFilter, setAgentFilter,
  installerFilter, setInstallerFilter,
  searchQuery, setSearchQuery, viewMode, setViewMode,
  sortKey, sortAsc, handleSort, sortedList,
  totalPipelineValue, showNewJob, setShowNewJob, orgId, router,
}: {
  profile: Profile
  projects: Project[]
  filtered: Project[]
  activeJobs: Project[]
  stats: { total: number; inProd: number; installing: number; completed: number; totalRevenue: number }
  agents: [string, string][]
  installers: [string, string][]
  agentFilter: string
  setAgentFilter: (v: string) => void
  installerFilter: string
  setInstallerFilter: (v: string) => void
  searchQuery: string
  setSearchQuery: (v: string) => void
  viewMode: ViewMode
  setViewMode: (v: ViewMode) => void
  sortKey: SortKey
  sortAsc: boolean
  handleSort: (k: SortKey) => void
  sortedList: Project[]
  totalPipelineValue: number
  showNewJob: boolean
  setShowNewJob: (v: boolean) => void
  orgId: string
  router: ReturnType<typeof useRouter>
}) {

  return (
    <>
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total Jobs',    value: String(stats.total),             icon: Briefcase,    color: 'var(--accent)' },
          { label: 'In Production', value: String(stats.inProd),            icon: Factory,      color: 'var(--amber)' },
          { label: 'Installing',    value: String(stats.installing),        icon: Hammer,       color: 'var(--purple)' },
          { label: 'Completed',     value: String(stats.completed),         icon: CheckCircle2, color: 'var(--green)' },
          { label: 'Revenue',       value: fmtMoney(stats.totalRevenue),    icon: DollarSign,   color: 'var(--cyan)' },
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

      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, fontWeight: 900,
            color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.03em',
          }}>
            Pipeline
          </h2>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 700, color: 'var(--green)',
            background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.2)',
            padding: '3px 10px', borderRadius: 20,
          }}>
            <span className="live-dot" />LIVE
          </span>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
            {filtered.length} jobs &middot; {fmtMoney(totalPipelineValue)}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search pipeline..."
              style={{
                padding: '6px 10px 6px 30px', borderRadius: 8,
                background: 'var(--surface2)', border: '1px solid var(--card-border)',
                color: 'var(--text1)', fontSize: 12, width: 180, outline: 'none',
                transition: 'all 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--card-border)'}
            />
          </div>

          {/* Filters */}
          {agents.length > 0 && (
            <select className="field text-xs py-1.5" style={{ width: 140 }} value={agentFilter} onChange={e => setAgentFilter(e.target.value)}>
              <option value="all">All Agents</option>
              {agents.map(([id, name]) => <option key={id!} value={id!}>{name}</option>)}
            </select>
          )}
          {installers.length > 0 && (
            <select className="field text-xs py-1.5" style={{ width: 140 }} value={installerFilter} onChange={e => setInstallerFilter(e.target.value)}>
              <option value="all">All Installers</option>
              {installers.map(([id, name]) => <option key={id!} value={id!}>{name}</option>)}
            </select>
          )}

          {/* View toggle */}
          <div style={{
            display: 'flex', gap: 2, padding: 3, background: 'var(--surface2)',
            borderRadius: 8, border: '1px solid var(--card-border)',
          }}>
            <button
              onClick={() => setViewMode('kanban')}
              style={{
                padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: viewMode === 'kanban' ? 'var(--card-bg)' : 'transparent',
                color: viewMode === 'kanban' ? 'var(--text1)' : 'var(--text3)',
                display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
                boxShadow: viewMode === 'kanban' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <LayoutGrid size={13} /> Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: viewMode === 'list' ? 'var(--card-bg)' : 'transparent',
                color: viewMode === 'list' ? 'var(--text1)' : 'var(--text3)',
                display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <List size={13} /> List
            </button>
          </div>

          {/* + Job button */}
          <button
            onClick={() => setShowNewJob(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(79,127,255,0.35)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <Plus size={14} />
            Add Job
          </button>
        </div>
      </div>

      {/* ── KANBAN VIEW ────────────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
          {STAGES.map(stage => {
            const stageJobs = filtered.filter(p => (p.pipe_stage || 'sales_in') === stage.key)
            const stageValue = stageJobs.reduce((s, p) => s + (p.revenue || 0), 0)
            const Icon = stage.icon
            return (
              <div key={stage.key} style={{
                flex: '1 0 260px', maxWidth: 320, minHeight: 200,
                background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                borderRadius: 16, padding: 14,
              }}>
                {/* Column header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 12, paddingBottom: 10,
                  borderBottom: `2px solid ${stage.color}20`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: `${stage.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={12} style={{ color: stage.color }} />
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 800, color: stage.color,
                      fontFamily: 'Barlow Condensed, sans-serif',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {stage.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {stageValue > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {fmtMoney(stageValue)}
                      </span>
                    )}
                    <span style={{
                      fontSize: 10, fontWeight: 800, color: stage.color,
                      background: `${stage.color}15`, padding: '2px 8px',
                      borderRadius: 10, fontFamily: 'JetBrains Mono, monospace',
                    }}>
                      {stageJobs.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {stageJobs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--text3)', opacity: 0.5 }}>No jobs</div>
                  ) : stageJobs.map((project, idx) => {
                    const customerName = (project.customer as any)?.name || (project.form_data as any)?.clientName || project.title || 'Untitled'
                    const vehicle = project.vehicle_desc || (project.form_data as any)?.vehicle || ''
                    const gpm = project.gpm || 0
                    const days = daysOpen(project)
                    const mockupUrl = (project.form_data as any)?.mockup_url || null
                    const initial = customerName.charAt(0).toUpperCase()
                    const sendBack = (project.send_backs as any[])?.some?.((sb: any) => !sb.resolved)
                    const installDate = project.install_date || (project.form_data as any)?.installDate
                    let urgency = ''; let urgencyColor = 'var(--text3)'
                    if (installDate) {
                      const daysUntil = Math.ceil((new Date(installDate).getTime() - Date.now()) / 86400000)
                      if (daysUntil < 0) { urgency = `${Math.abs(daysUntil)}d late`; urgencyColor = 'var(--red)' }
                      else if (daysUntil === 0) { urgency = 'TODAY'; urgencyColor = 'var(--red)' }
                      else if (daysUntil <= 3) { urgency = `${daysUntil}d`; urgencyColor = 'var(--amber)' }
                    }
                    return (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        style={{ textDecoration: 'none', display: 'block', animation: `staggerIn .3s ease ${idx * 0.04}s both` }}
                      >
                        <div
                          style={{
                            borderRadius: 10, padding: '9px 11px', cursor: 'pointer',
                            background: 'var(--surface)',
                            border: `1px solid ${sendBack ? '#f25a5a30' : 'var(--card-border)'}`,
                            borderLeft: `3px solid ${stage.color}`,
                            display: 'flex', gap: 9, alignItems: 'flex-start',
                            position: 'relative',
                            transition: 'all 0.18s ease',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = `${stage.color}60`
                            e.currentTarget.style.transform = 'translateY(-1px)'
                            e.currentTarget.style.boxShadow = `0 4px 14px ${stage.color}18`
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = sendBack ? '#f25a5a30' : 'var(--card-border)'
                            e.currentTarget.style.transform = 'none'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          {sendBack && (
                            <div style={{
                              position: 'absolute', top: -6, right: 8, fontSize: 8, fontWeight: 900,
                              background: 'var(--red)', color: '#fff', padding: '1px 5px', borderRadius: 4, letterSpacing: '.04em',
                            }}>SENT BACK</div>
                          )}

                          {/* Thumbnail / Initials */}
                          <div style={{
                            width: 40, height: 40, borderRadius: 7, flexShrink: 0, overflow: 'hidden',
                            background: `${stage.color}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {mockupUrl ? (
                              <img src={mockupUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: 15, fontWeight: 900, color: stage.color }}>{initial}</span>
                            )}
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Name + Revenue */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 4 }}>
                                {customerName}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                                {urgency && <span style={{ fontSize: 9, fontWeight: 800, color: urgencyColor }}>{urgency}</span>}
                                {project.revenue ? (
                                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
                                    {fmtMoney(project.revenue)}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            {/* Vehicle */}
                            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {vehicle || '\u2014'}
                            </div>

                            {/* Dept status badges */}
                            <div style={{ display: 'flex', gap: 3 }}>
                              {DEPT_STATUS_BADGES.map(d => {
                                const done = project.checkout?.[d.key]
                                const isCurrent = (project.pipe_stage || 'sales_in') === d.key
                                return (
                                  <span key={d.key} style={{
                                    fontSize: 7, fontWeight: 800, padding: '1px 4px', borderRadius: 3,
                                    letterSpacing: '0.04em',
                                    background: done ? 'rgba(34,192,122,0.12)' : isCurrent ? `${d.color}18` : 'transparent',
                                    color: done ? '#22c07a' : isCurrent ? d.color : 'var(--text3)',
                                    border: `1px solid ${done ? 'rgba(34,192,122,0.3)' : isCurrent ? `${d.color}40` : 'rgba(90,96,128,0.3)'}`,
                                  }}>
                                    {done ? '✓' : isCurrent ? '●' : '·'} {d.short}
                                  </span>
                                )
                              })}
                            </div>

                            {/* GPM + days */}
                            {(gpm > 0 || days > 0) && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                {gpm > 0 ? (
                                  <span style={{
                                    fontSize: 9, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                                    color: gpm >= 70 ? 'var(--green)' : gpm >= 55 ? 'var(--amber)' : 'var(--red)',
                                  }}>
                                    {gpm.toFixed(0)}% GPM
                                  </span>
                                ) : <span />}
                                {days > 0 && (
                                  <span style={{
                                    fontSize: 9, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
                                    color: days > 14 ? 'var(--red)' : days > 7 ? 'var(--amber)' : 'var(--text3)',
                                  }}>
                                    {days}d
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── LIST VIEW ──────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: 16, overflow: 'hidden',
        }}>
          <table className="data-table">
            <thead>
              <tr>
                {[
                  { key: 'customer' as SortKey, label: 'Customer' },
                  { key: 'vehicle' as SortKey, label: 'Vehicle' },
                  { key: 'value' as SortKey, label: 'Value' },
                  { key: 'stage' as SortKey, label: 'Stage' },
                  { key: 'days' as SortKey, label: 'Days Open' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {col.label}
                      {sortKey === col.key && (
                        <ArrowUpDown size={10} style={{ color: 'var(--accent)' }} />
                      )}
                    </span>
                  </th>
                ))}
                <th>Assigned</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {sortedList.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>No jobs found</td></tr>
              ) : sortedList.map((project, idx) => {
                const stage = STAGES.find(s => s.key === (project.pipe_stage || 'sales_in'))
                const days = daysOpen(project)
                return (
                  <tr
                    key={project.id}
                    onClick={() => router.push(`/projects/${project.id}`)}
                    style={{
                      cursor: 'pointer',
                      animation: `staggerIn .25s ease ${idx * 0.02}s both`,
                    }}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--text1)' }}>
                      {(project.customer as any)?.name || (project.form_data as any)?.clientName || project.title}
                    </td>
                    <td>{project.vehicle_desc || '\u2014'}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--green)' }}>
                      {project.revenue ? fmtMoney(project.revenue) : '\u2014'}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                        padding: '3px 8px', borderRadius: 6,
                        background: `${stage?.color || '#4f7fff'}15`,
                        color: stage?.color || '#4f7fff',
                      }}>
                        {stage?.label || 'Unknown'}
                      </span>
                    </td>
                    <td style={{
                      fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
                      color: days > 14 ? 'var(--red)' : days > 7 ? 'var(--amber)' : 'var(--text3)',
                    }}>
                      {days}d
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {(project.agent as any)?.name || '\u2014'}
                    </td>
                    <td>
                      <ChevronRight size={14} style={{ color: 'var(--text3)' }} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}


      {/* ── New Job Modal ──────────────────────────────────────────── */}
      {showNewJob && (
        <NewJobModal
          isOpen={showNewJob}
          onClose={() => setShowNewJob(false)}
          orgId={orgId}
          currentUserId={profile.id}
          onJobCreated={() => { setShowNewJob(false); router.refresh() }}
        />
      )}
    </>
  )
}
