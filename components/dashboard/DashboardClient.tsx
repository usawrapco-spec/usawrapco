'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import type { Profile, Project, ProjectStatus } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  format,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter,
  subWeeks,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from 'date-fns'
import { clsx } from 'clsx'
import { useToast } from '@/components/shared/Toast'
import { ActionMenu, type ActionItem } from '@/components/shared/ActionMenu'

interface DashboardClientProps {
  profile: Profile
  initialProjects: Project[]
  canSeeFinancials: boolean
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  estimate:          'Estimate',
  active:            'Active Order',
  in_production:     'In Production',
  install_scheduled: 'Install Sched.',
  installed:         'Installed',
  qc:                'QC Review',
  closing:           'Closing',
  closed:            'Closed',
  cancelled:         'Cancelled',
}

const STATUS_BADGE: Record<ProjectStatus, string> = {
  estimate:          'badge-gray',
  active:            'badge-accent',
  in_production:     'badge-green',
  install_scheduled: 'badge-cyan',
  installed:         'badge-green',
  qc:                'badge-amber',
  closing:           'badge-purple',
  closed:            'badge-gray',
  cancelled:         'badge-red',
}

const PIPE_LABELS: Record<string, string> = {
  sales_in: 'Sales Intake', production: 'Production', install: 'Install',
  prod_review: 'QC Review', sales_close: 'Sales Close', done: 'Done',
}

type FilterTab = 'all' | 'estimate' | 'active' | 'closed'
type ViewMode = 'table' | 'cards'
type PeriodKey = 'week' | 'month' | 'quarter' | 'custom'

interface SavedFilter {
  name: string
  tab: FilterTab
  agent: string
  type: string
  search: string
}

interface OverheadData {
  costs: Record<string, number>
  customRows: { label: string; amount: number }[]
  avgJobRev: number
}

export function DashboardClient({
  profile, initialProjects, canSeeFinancials,
}: DashboardClientProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [view, setView] = useState<ViewMode>('table')
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [filterName, setFilterName] = useState('')
  const [showSaveFilter, setShowSaveFilter] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  // --- Period selector state ---
  const [period, setPeriod] = useState<PeriodKey>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // --- Daily burn rate ---
  const [dailyBurn, setDailyBurn] = useState<number>(0)

  // Load saved filters from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('usawrap_filters')
      if (saved) setSavedFilters(JSON.parse(saved))
    } catch {}
  }, [])

  // Load overhead data for daily burn
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`usawrap_overhead_${profile.org_id}`)
      if (raw) {
        const data: OverheadData = JSON.parse(raw)
        const costTotal = Object.values(data.costs || {}).reduce((s, v) => s + (v || 0), 0)
        const customTotal = (data.customRows || []).reduce((s, r) => s + (r.amount || 0), 0)
        const monthlyOverhead = costTotal + customTotal
        setDailyBurn(monthlyOverhead / 30)
      }
    } catch {}
  }, [profile.org_id])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-projects')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'projects',
        filter: `org_id=eq.${profile.org_id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setProjects(prev => [payload.new as Project, ...prev])
          toast('New project added', 'info')
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

  // --- Period date range ---
  const periodRange = useMemo<{ start: Date; end: Date }>(() => {
    const now = new Date()
    switch (period) {
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'quarter':
        return { start: startOfQuarter(now), end: endOfQuarter(now) }
      case 'custom': {
        const s = customStart ? new Date(customStart) : startOfMonth(now)
        const e = customEnd ? new Date(customEnd) : endOfMonth(now)
        return { start: s, end: e }
      }
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) }
    }
  }, [period, customStart, customEnd])

  // Helper: does a project fall within the period?
  const isInPeriod = useCallback((p: Project) => {
    // Use updated_at for closed projects, created_at otherwise
    const dateStr = p.status === 'closed' ? (p.updated_at || p.created_at) : p.created_at
    if (!dateStr) return false
    const d = new Date(dateStr)
    return d >= periodRange.start && d <= periodRange.end
  }, [periodRange])

  // Filter logic
  const filtered = useMemo(() => {
    let list = [...projects]
    if (filterTab === 'estimate') list = list.filter(p => p.status === 'estimate')
    else if (filterTab === 'active') list = list.filter(p =>
      ['active','in_production','install_scheduled','installed','qc','closing'].includes(p.status)
    )
    else if (filterTab === 'closed') list = list.filter(p => p.status === 'closed' || p.status === 'cancelled')
    if (agentFilter !== 'all') list = list.filter(p => p.agent_id === agentFilter)
    if (typeFilter !== 'all') list = list.filter(p => p.type === typeFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.vehicle_desc?.toLowerCase().includes(q) ||
        (p.agent as any)?.name?.toLowerCase().includes(q) ||
        (p.customer as any)?.name?.toLowerCase().includes(q) ||
        (p.form_data as any)?.clientName?.toLowerCase().includes(q)
      )
    }
    return list
  }, [projects, filterTab, agentFilter, typeFilter, search])

  // --- Period-filtered stats ---
  const periodProjects = useMemo(() => projects.filter(isInPeriod), [projects, isInPeriod])
  const closedProjects = periodProjects.filter(p => p.status === 'closed')
  const activeOrders = periodProjects.filter(p =>
    ['active','in_production','install_scheduled'].includes(p.status)
  )
  const estimates = periodProjects.filter(p => p.status === 'estimate')
  const totalRevenue = closedProjects.reduce((s, p) => s + (p.revenue || 0), 0)
  const totalProfit = closedProjects.reduce((s, p) => s + (p.profit || 0), 0)
  const avgGpm = totalRevenue > 0 ? totalProfit / totalRevenue * 100 : 0
  const pipelineValue = activeOrders.reduce((s, p) => s + (p.revenue || 0), 0)

  // --- Revenue chart data ---
  const revenueChartData = useMemo(() => {
    const { start, end } = periodRange
    // Use weeks for week period, months for longer periods
    const useWeeks = period === 'week' || (end.getTime() - start.getTime() < 45 * 24 * 60 * 60 * 1000)

    if (useWeeks) {
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })
      return weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
        const rev = closedProjects
          .filter(p => {
            const d = new Date(p.updated_at || p.created_at)
            return d >= weekStart && d <= weekEnd
          })
          .reduce((s, p) => s + (p.revenue || 0), 0)
        return {
          label: format(weekStart, 'MMM d'),
          value: rev,
        }
      })
    } else {
      const months = eachMonthOfInterval({ start, end })
      return months.map(monthStart => {
        const monthEnd = endOfMonth(monthStart)
        const rev = closedProjects
          .filter(p => {
            const d = new Date(p.updated_at || p.created_at)
            return d >= monthStart && d <= monthEnd
          })
          .reduce((s, p) => s + (p.revenue || 0), 0)
        return {
          label: format(monthStart, 'MMM yyyy'),
          value: rev,
        }
      })
    }
  }, [periodRange, period, closedProjects])

  const chartMax = useMemo(() => Math.max(...revenueChartData.map(d => d.value), 1), [revenueChartData])

  // Unique agents
  const agents = useMemo(() => {
    const map = new Map<string, string>()
    projects.forEach(p => {
      if (p.agent_id && (p.agent as any)?.name) map.set(p.agent_id, (p.agent as any).name)
    })
    return Array.from(map.entries())
  }, [projects])

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  // --- Actions ---
  const duplicateProject = useCallback(async (project: Project) => {
    const { data, error } = await supabase.from('projects').insert({
      org_id: project.org_id,
      type: project.type,
      title: `${project.title} (Copy)`,
      status: 'estimate',
      agent_id: project.agent_id,
      division: project.division,
      pipe_stage: 'sales_in',
      vehicle_desc: project.vehicle_desc,
      form_data: project.form_data,
      fin_data: project.fin_data,
      actuals: {},
      checkout: {},
      send_backs: [],
      priority: project.priority,
      referral: project.referral,
    }).select().single()
    if (error) { toast(error.message, 'error'); return }
    toast('Project duplicated', 'success', {
      label: 'Open', onClick: () => router.push(`/projects/${data.id}`)
    })
  }, [supabase, toast, router])

  const updateStatus = useCallback(async (project: Project, status: ProjectStatus) => {
    const { error } = await supabase.from('projects')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', project.id)
    if (error) { toast(error.message, 'error'); return }
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status } : p))
    toast(`Status -> ${STATUS_LABELS[status]}`, 'success')
  }, [supabase, toast])

  const deleteProject = useCallback(async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    setProjects(prev => prev.filter(p => p.id !== id))
    toast('Project deleted', 'success')
    setConfirmDelete(null)
  }, [supabase, toast])

  const archiveProject = useCallback(async (project: Project) => {
    await updateStatus(project, 'cancelled')
  }, [updateStatus])

  const getActions = (project: Project): ActionItem[] => [
    { label: 'Open Project', icon: '📄', onClick: () => router.push(`/projects/${project.id}`) },
    { label: 'Duplicate', icon: '📋', onClick: () => duplicateProject(project) },
    { label: 'Mark as Active', icon: '🟢', onClick: () => updateStatus(project, 'active') },
    { label: 'Mark Estimate', icon: '📝', onClick: () => updateStatus(project, 'estimate') },
    { label: 'Schedule Install', icon: '📅', onClick: () => updateStatus(project, 'install_scheduled') },
    { label: 'Close Out', icon: '✅', onClick: () => updateStatus(project, 'closed'), divider: true },
    { label: 'Archive', icon: '📦', onClick: () => archiveProject(project), divider: true },
    { label: 'Delete', icon: '🗑', onClick: () => setConfirmDelete(project.id), danger: true },
  ]

  // Save filter
  function saveFilter() {
    if (!filterName.trim()) return
    const filter: SavedFilter = { name: filterName, tab: filterTab, agent: agentFilter, type: typeFilter, search }
    const updated = [...savedFilters, filter]
    setSavedFilters(updated)
    localStorage.setItem('usawrap_filters', JSON.stringify(updated))
    setFilterName('')
    setShowSaveFilter(false)
    toast(`Filter "${filterName}" saved`, 'success')
  }

  function loadFilter(f: SavedFilter) {
    setFilterTab(f.tab)
    setAgentFilter(f.agent)
    setTypeFilter(f.type)
    setSearch(f.search)
    toast(`Loaded "${f.name}"`, 'info')
  }

  function removeSavedFilter(name: string) {
    const updated = savedFilters.filter(f => f.name !== name)
    setSavedFilters(updated)
    localStorage.setItem('usawrap_filters', JSON.stringify(updated))
  }

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all',      label: 'All',          count: projects.length },
    { key: 'estimate', label: 'Estimates',     count: estimates.length },
    { key: 'active',   label: 'Active Orders', count: activeOrders.length },
    { key: 'closed',   label: 'Closed',        count: closedProjects.length },
  ]

  const periodButtons: { key: PeriodKey; label: string }[] = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'custom', label: 'Custom' },
  ]

  return (
    <div className="flex flex-col gap-5">

      {/* ====== Period Selector ====== */}
      {canSeeFinancials && (
        <div className="card flex items-center gap-3 py-2.5 px-4">
          <span style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>Period</span>
          <div style={{
            display: 'flex',
            border: '1px solid var(--surface2)',
            borderRadius: '0.5rem',
            overflow: 'hidden',
          }}>
            {periodButtons.map(pb => (
              <button
                key={pb.key}
                onClick={() => setPeriod(pb.key)}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: period === pb.key ? 'var(--accent)' : 'transparent',
                  color: period === pb.key ? '#fff' : 'var(--text3)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                {pb.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
              <input
                type="date"
                className="field"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', width: '140px' }}
              />
              <span style={{ color: 'var(--text3)', fontSize: '0.75rem' }}>to</span>
              <input
                type="date"
                className="field"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', width: '140px' }}
              />
            </div>
          )}
          <span style={{
            marginLeft: 'auto',
            fontSize: '0.7rem',
            color: 'var(--text3)',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {format(periodRange.start, 'MMM d')} - {format(periodRange.end, 'MMM d, yyyy')}
          </span>
        </div>
      )}

      {/* ====== Stats strip ====== */}
      {canSeeFinancials && (
        <div className="grid grid-cols-6 gap-3">
          {[
            { label: 'Revenue', value: fmtMoney(totalRevenue), color: 'text-green', sub: `${closedProjects.length} closed` },
            { label: 'Profit', value: fmtMoney(totalProfit), color: 'text-accent', sub: `${avgGpm.toFixed(0)}% GPM` },
            { label: 'Pipeline', value: fmtMoney(pipelineValue), color: 'text-cyan', sub: `${activeOrders.length} active` },
            { label: 'Estimates', value: estimates.length.toString(), color: 'text-amber', sub: 'open quotes' },
            { label: 'Total Jobs', value: periodProjects.length.toString(), color: 'text-purple', sub: 'in period' },
            { label: 'Daily Burn', value: fmtMoney(dailyBurn), color: 'text-red', sub: `${fmtMoney(dailyBurn * 30)}/mo overhead` },
          ].map(stat => (
            <div key={stat.label} className="card flex flex-col justify-between">
              <div className="text-xs font-700 text-text3 uppercase tracking-wider">{stat.label}</div>
              <div className={clsx('mono text-2xl font-800 mt-1', stat.color)}>{stat.value}</div>
              <div className="text-xs text-text3 mt-1">{stat.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ====== Revenue Bar Chart ====== */}
      {canSeeFinancials && (
        <div className="card">
          <div style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '1rem',
          }}>
            Revenue by {period === 'week' || (periodRange.end.getTime() - periodRange.start.getTime() < 45 * 24 * 60 * 60 * 1000) ? 'Week' : 'Month'}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '0.5rem',
            height: '200px',
            paddingBottom: '2rem',
            position: 'relative',
          }}>
            {revenueChartData.length === 0 ? (
              <div style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text3)',
                fontSize: '0.85rem',
              }}>
                No data for this period
              </div>
            ) : revenueChartData.map((bar, i) => {
              const heightPct = chartMax > 0 ? (bar.value / chartMax) * 100 : 0
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                    position: 'relative',
                  }}
                >
                  {/* Amount label on top */}
                  <span style={{
                    fontSize: '0.65rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    color: bar.value > 0 ? 'var(--green)' : 'var(--text3)',
                    marginBottom: '0.25rem',
                    whiteSpace: 'nowrap',
                  }}>
                    {bar.value > 0 ? fmtMoney(bar.value) : '$0'}
                  </span>
                  {/* Bar */}
                  <div style={{
                    width: '100%',
                    maxWidth: '80px',
                    height: `${Math.max(heightPct, 2)}%`,
                    background: bar.value > 0
                      ? 'linear-gradient(to top, var(--green), rgba(34,192,122,0.6))'
                      : 'var(--surface2)',
                    borderRadius: '0.35rem 0.35rem 0 0',
                    transition: 'height 0.3s ease',
                    minHeight: '3px',
                  }} />
                  {/* Label below */}
                  <span style={{
                    position: 'absolute',
                    bottom: '-1.6rem',
                    fontSize: '0.6rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--text3)',
                    whiteSpace: 'nowrap',
                  }}>
                    {bar.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ====== Projects panel ====== */}
      <div className="card p-0 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center border-b border-border flex-wrap gap-0">
          {/* Filter tabs */}
          <div className="flex">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setFilterTab(tab.key)}
                className={clsx(
                  'px-4 py-3 text-sm font-600 border-b-2 transition-colors whitespace-nowrap',
                  filterTab === tab.key ? 'border-accent text-accent' : 'border-transparent text-text3 hover:text-text1'
                )}>
                {tab.label}
                <span className={clsx(
                  'ml-2 text-xs px-1.5 py-0.5 rounded-full font-700',
                  filterTab === tab.key ? 'bg-accent/20 text-accent' : 'bg-surface2 text-text3'
                )}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="ml-auto flex items-center gap-2 px-4 py-2">
            {/* Saved filter chips */}
            {savedFilters.length > 0 && (
              <div className="flex gap-1.5">
                {savedFilters.map(f => (
                  <button key={f.name} onClick={() => loadFilter(f)}
                    className="group flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/10 text-accent text-xs font-600 hover:bg-accent/20 transition-colors">
                    {f.name}
                    <span onClick={e => { e.stopPropagation(); removeSavedFilter(f.name) }}
                      className="opacity-0 group-hover:opacity-100 text-red hover:text-red ml-0.5">✕</span>
                  </button>
                ))}
              </div>
            )}

            <select className="field text-xs py-1.5 w-28" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="wrap">Wrap</option>
              <option value="decking">Decking</option>
              <option value="ppf">PPF</option>
              <option value="design">Design</option>
            </select>

            {agents.length > 0 && (
              <select className="field text-xs py-1.5 w-32" value={agentFilter} onChange={e => setAgentFilter(e.target.value)}>
                <option value="all">All Agents</option>
                {agents.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            )}

            <div className="relative">
              <input type="text" className="field text-xs py-1.5 pl-7 w-48" placeholder="Search..."
                value={search} onChange={e => setSearch(e.target.value)} />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text3 text-xs">🔍</span>
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text3 hover:text-text1 text-xs">✕</button>
              )}
            </div>

            {/* Save filter button */}
            {(search || agentFilter !== 'all' || typeFilter !== 'all' || filterTab !== 'all') && (
              <div className="relative">
                <button onClick={() => setShowSaveFilter(!showSaveFilter)}
                  className="btn-ghost btn-xs">💾 Save</button>
                {showSaveFilter && (
                  <div className="absolute right-0 top-full mt-1 z-40 bg-surface border border-border rounded-xl p-3 shadow-2xl w-52">
                    <input className="field text-xs mb-2" placeholder="Filter name..."
                      value={filterName} onChange={e => setFilterName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveFilter()} autoFocus />
                    <button className="btn-primary btn-xs w-full" onClick={saveFilter}>Save Filter</button>
                  </div>
                )}
              </div>
            )}

            {/* View toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button onClick={() => setView('table')}
                className={clsx('px-2 py-1 text-xs', view === 'table' ? 'bg-accent/20 text-accent' : 'text-text3')}>☰</button>
              <button onClick={() => setView('cards')}
                className={clsx('px-2 py-1 text-xs', view === 'cards' ? 'bg-accent/20 text-accent' : 'text-text3')}>▦</button>
            </div>
          </div>
        </div>

        {/* CARDS VIEW */}
        {view === 'cards' ? (
          <div className="p-4 grid grid-cols-3 gap-3">
            {filtered.length === 0 ? (
              <div className="col-span-3 text-center py-16 text-text3 text-sm">
                {search ? 'No results matching your search.' : 'No projects yet.'}
              </div>
            ) : filtered.map(project => (
              <div key={project.id}
                className="card cursor-pointer hover:border-accent/40 transition-all hover:-translate-y-0.5 group relative"
                onClick={() => router.push(`/projects/${project.id}`)}>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={e => e.stopPropagation()}>
                  <ActionMenu items={getActions(project)} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={clsx('badge text-xs', STATUS_BADGE[project.status])}>{STATUS_LABELS[project.status]}</span>
                  <span className="badge badge-gray text-xs capitalize">{project.type}</span>
                </div>
                <div className="font-800 text-text1 text-base mb-0.5 pr-6">
                  {(project.customer as any)?.name || (project.form_data as any)?.clientName || project.title}
                </div>
                <div className="text-xs text-text3 mb-3 truncate">{project.vehicle_desc || '—'}</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text3">{(project.agent as any)?.name || '—'}</span>
                  {canSeeFinancials && project.revenue ? (
                    <span className="mono font-700 text-green">{fmtMoney(project.revenue)}</span>
                  ) : null}
                </div>
                {project.install_date && (
                  <div className="mt-2 pt-2 border-t border-border text-xs text-text3 flex items-center gap-1.5">
                    📅 {format(new Date(project.install_date), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client / Vehicle</th>
                  <th>Type</th>
                  <th>Agent</th>
                  {canSeeFinancials && <th>Revenue</th>}
                  {canSeeFinancials && <th>GPM</th>}
                  <th>Stage</th>
                  <th>Status</th>
                  <th>Install Date</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-text3 text-sm">
                      {search ? 'No results matching your search.' : 'No projects yet.'}
                    </td>
                  </tr>
                ) : filtered.map(project => (
                  <tr key={project.id} className="cursor-pointer group"
                    onClick={() => router.push(`/projects/${project.id}`)}>
                    <td>
                      <div className="font-700 text-text1 text-sm">
                        {(project.customer as any)?.name || (project.form_data as any)?.clientName || project.title}
                      </div>
                      <div className="text-xs text-text3 mt-0.5">{project.vehicle_desc || '—'}</div>
                    </td>
                    <td><span className="badge badge-gray capitalize">{project.type}</span></td>
                    <td className="text-text2">{(project.agent as any)?.name || '—'}</td>
                    {canSeeFinancials && (
                      <td className="mono font-600 text-green">
                        {project.revenue ? fmtMoney(project.revenue) : '—'}
                      </td>
                    )}
                    {canSeeFinancials && (
                      <td>
                        {project.gpm != null ? (
                          <span className={clsx('mono font-700 text-sm',
                            project.gpm >= 70 ? 'text-green' : project.gpm >= 55 ? 'text-amber' : 'text-red'
                          )}>{project.gpm.toFixed(0)}%</span>
                        ) : '—'}
                      </td>
                    )}
                    <td><span className="text-xs text-text3">{PIPE_LABELS[project.pipe_stage || 'sales_in'] || '—'}</span></td>
                    <td><span className={STATUS_BADGE[project.status] || 'badge-gray'}>{STATUS_LABELS[project.status]}</span></td>
                    <td className="text-text3 text-xs">
                      {project.install_date ? format(new Date(project.install_date), 'MMM d') : '—'}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionMenu items={getActions(project)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer stats */}
        <div className="px-4 py-2.5 border-t border-border flex items-center justify-between text-xs text-text3">
          <span>Showing {filtered.length} of {projects.length} projects</span>
          <span className="flex items-center gap-1.5">
            <span className="live-dot" />
            Live — updates automatically
          </span>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setConfirmDelete(null)}>
          <div className="card max-w-sm anim-pop-in" onClick={e => e.stopPropagation()}>
            <div className="text-lg font-800 text-text1 mb-2">Delete Project?</div>
            <div className="text-sm text-text3 mb-4">This action cannot be undone. All data for this project will be permanently removed.</div>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger flex-1" onClick={() => deleteProject(confirmDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
