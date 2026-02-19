'use client'

import { useState, useMemo } from 'react'
import type { Profile, Project, ProjectStatus } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { clsx } from 'clsx'

interface DashboardClientProps {
  profile: Profile
  initialProjects: Project[]
  canSeeFinancials: boolean
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  estimate:           'Estimate',
  active:             'Active Order',
  in_production:      'In Production',
  install_scheduled:  'Install Sched.',
  installed:          'Installed',
  qc:                 'QC Review',
  closing:            'Closing',
  closed:             'Closed',
  cancelled:          'Cancelled',
}

const STATUS_BADGE: Record<ProjectStatus, string> = {
  estimate:           'badge-gray',
  active:             'badge-accent',
  in_production:      'badge-green',
  install_scheduled:  'badge-cyan',
  installed:          'badge-green',
  qc:                 'badge-amber',
  closing:            'badge-purple',
  closed:             'badge-gray',
  cancelled:          'badge-red',
}

const PIPE_STAGE_LABELS: Record<string, string> = {
  sales_in:    'Sales Intake',
  production:  'Production',
  install:     'Install',
  prod_review: 'QC Review',
  sales_close: 'Sales Close',
  done:        'Done',
}

type FilterTab = 'all' | 'estimate' | 'active' | 'closed'

export function DashboardClient({
  profile, initialProjects, canSeeFinancials,
}: DashboardClientProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const router = useRouter()

  // Filter logic
  const filtered = useMemo(() => {
    let list = [...projects]

    if (filterTab === 'estimate') list = list.filter(p => p.status === 'estimate')
    else if (filterTab === 'active') list = list.filter(p =>
      ['active','in_production','install_scheduled','installed','qc','closing'].includes(p.status)
    )
    else if (filterTab === 'closed') list = list.filter(p => p.status === 'closed')

    if (agentFilter !== 'all') list = list.filter(p => p.agent_id === agentFilter)

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.vehicle_desc?.toLowerCase().includes(q) ||
        (p.agent as any)?.name?.toLowerCase().includes(q) ||
        (p.customer as any)?.name?.toLowerCase().includes(q)
      )
    }

    return list
  }, [projects, filterTab, agentFilter, search])

  // Period stats
  const closedProjects = projects.filter(p => p.status === 'closed')
  const activeOrders = projects.filter(p =>
    ['active','in_production','install_scheduled'].includes(p.status)
  )
  const totalRevenue = closedProjects.reduce((s, p) => s + (p.revenue || 0), 0)
  const totalProfit  = closedProjects.reduce((s, p) => s + (p.profit  || 0), 0)
  const avgGpm       = closedProjects.length
    ? totalProfit / totalRevenue * 100 : 0

  // Unique agents for filter
  const agents = useMemo(() => {
    const map = new Map<string, string>()
    projects.forEach(p => {
      if (p.agent_id && (p.agent as any)?.name) {
        map.set(p.agent_id, (p.agent as any).name)
      }
    })
    return Array.from(map.entries())
  }, [projects])

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all',      label: 'All',          count: projects.length },
    { key: 'estimate', label: 'Estimates',     count: projects.filter(p => p.status === 'estimate').length },
    { key: 'active',   label: 'Active Orders', count: activeOrders.length },
    { key: 'closed',   label: 'Closed',        count: closedProjects.length },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Stats strip — only for roles with financials access */}
      {canSeeFinancials && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Revenue (Closed)', value: fmtMoney(totalRevenue), color: 'text-green' },
            { label: 'Profit',           value: fmtMoney(totalProfit),  color: 'text-accent' },
            { label: 'Avg GPM',          value: avgGpm.toFixed(1) + '%', color: avgGpm >= 70 ? 'text-green' : 'text-amber' },
            { label: 'Active Orders',    value: activeOrders.length.toString(), color: 'text-cyan' },
          ].map(stat => (
            <div key={stat.label} className="card">
              <div className="text-xs font-700 text-text3 uppercase tracking-wider mb-1">{stat.label}</div>
              <div className={clsx('mono text-2xl font-800', stat.color)}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Projects table */}
      <div className="card p-0 overflow-hidden">
        {/* Table header with filters */}
        <div className="flex items-center border-b border-border flex-wrap gap-0">
          {/* Filter tabs */}
          <div className="flex">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={clsx(
                  'px-4 py-3 text-sm font-600 border-b-2 transition-colors whitespace-nowrap',
                  filterTab === tab.key
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text3 hover:text-text1'
                )}
              >
                {tab.label}
                <span className={clsx(
                  'ml-2 text-xs px-1.5 py-0.5 rounded-full font-700',
                  filterTab === tab.key ? 'bg-accent/20 text-accent' : 'bg-surface2 text-text3'
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Spacer + right controls */}
          <div className="ml-auto flex items-center gap-2 px-4 py-2">
            {agents.length > 0 && (
              <select
                className="field text-xs py-1.5 w-36"
                value={agentFilter}
                onChange={e => setAgentFilter(e.target.value)}
              >
                <option value="all">All Agents</option>
                {agents.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            )}
            <div className="relative">
              <input
                type="text"
                className="field text-xs py-1.5 pl-7 w-52"
                placeholder="Search projects…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text3 text-xs">🔍</span>
            </div>
          </div>
        </div>

        {/* Table */}
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
                <th>Installer</th>
                <th></th>
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
                <tr
                  key={project.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <td>
                    <div className="font-700 text-text1 text-sm">
                      {(project.customer as any)?.name || '—'}
                    </div>
                    <div className="text-xs text-text3 mt-0.5">
                      {project.vehicle_desc || project.title || '—'}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-gray capitalize">{project.type}</span>
                  </td>
                  <td className="text-text2">
                    {(project.agent as any)?.name || '—'}
                  </td>
                  {canSeeFinancials && (
                    <td className="mono font-600 text-green">
                      {project.revenue ? fmtMoney(project.revenue) : '—'}
                    </td>
                  )}
                  {canSeeFinancials && (
                    <td>
                      {project.gpm != null ? (
                        <span className={clsx(
                          'mono font-700 text-sm',
                          project.gpm >= 70 ? 'text-green' : project.gpm >= 55 ? 'text-amber' : 'text-red'
                        )}>
                          {project.gpm.toFixed(0)}%
                        </span>
                      ) : '—'}
                    </td>
                  )}
                  <td>
                    <span className="text-xs text-text3">
                      {PIPE_STAGE_LABELS[project.pipe_stage || 'sales_in'] || '—'}
                    </span>
                  </td>
                  <td>
                    <span className={STATUS_BADGE[project.status] || 'badge-gray'}>
                      {STATUS_LABELS[project.status]}
                    </span>
                  </td>
                  <td className="text-text3 text-xs">
                    {project.install_date
                      ? format(new Date(project.install_date), 'MMM d, yyyy')
                      : '—'}
                  </td>
                  <td className="text-text3 text-xs">
                    {(project.installer as any)?.name || '—'}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button
                      className="btn-ghost btn-xs"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      Open →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
