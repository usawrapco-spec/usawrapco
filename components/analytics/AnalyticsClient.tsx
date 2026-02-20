'use client'

import { useMemo, useState } from 'react'
import type { Profile, Project, UserRole } from '@/types'
import { clsx } from 'clsx'
import { Briefcase, Printer, Wrench, Search, CheckCircle, Car, Anchor, Shield, Palette, BarChart2, Trophy, type LucideIcon } from 'lucide-react'

interface Teammate { id: string; name: string; role: UserRole }

interface AnalyticsClientProps {
  profile: Profile
  projects: Project[]
  teammates: Teammate[]
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function AnalyticsClient({ profile, projects, teammates }: AnalyticsClientProps) {
  const [period, setPeriod] = useState<'all' | 'ytd' | '30d' | '90d'>('all')

  const filtered = useMemo(() => {
    if (period === 'all') return projects
    const now = new Date()
    const cutoff = new Date()
    if (period === 'ytd') cutoff.setMonth(0, 1)
    else if (period === '30d') cutoff.setDate(now.getDate() - 30)
    else if (period === '90d') cutoff.setDate(now.getDate() - 90)
    return projects.filter(p => new Date(p.created_at) >= cutoff)
  }, [projects, period])

  // Key metrics
  const closed = filtered.filter(p => p.status === 'closed')
  const active = filtered.filter(p =>
    ['active','in_production','install_scheduled','installed','qc','closing'].includes(p.status)
  )
  const estimates = filtered.filter(p => p.status === 'estimate')
  const cancelled = filtered.filter(p => p.status === 'cancelled')

  const totalRevenue = closed.reduce((s, p) => s + (p.revenue || 0), 0)
  const totalProfit = closed.reduce((s, p) => s + (p.profit || 0), 0)
  const avgGpm = closed.length ? totalProfit / totalRevenue * 100 : 0
  const avgDealSize = closed.length ? totalRevenue / closed.length : 0
  const pipelineValue = active.reduce((s, p) => s + (p.revenue || 0), 0)
  const estimateValue = estimates.reduce((s, p) => s + (p.revenue || 0), 0)

  // Conversion rate
  const totalNonEstimate = filtered.filter(p => p.status !== 'estimate').length
  const conversionRate = filtered.length
    ? (totalNonEstimate / filtered.length * 100) : 0

  // Agent leaderboard
  const agentStats = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; profit: number; deals: number; active: number }>()
    filtered.forEach(p => {
      const agentName = (p.agent as any)?.name
      const agentId = p.agent_id
      if (!agentId || !agentName) return
      if (!map.has(agentId)) map.set(agentId, { name: agentName, revenue: 0, profit: 0, deals: 0, active: 0 })
      const entry = map.get(agentId)!
      if (p.status === 'closed') {
        entry.revenue += p.revenue || 0
        entry.profit += p.profit || 0
        entry.deals++
      }
      if (['active','in_production','install_scheduled'].includes(p.status)) {
        entry.active++
      }
    })
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
  }, [filtered])

  // Installer leaderboard
  const installerStats = useMemo(() => {
    const map = new Map<string, { name: string; jobs: number; active: number }>()
    filtered.forEach(p => {
      const name = (p.installer as any)?.name
      const id = p.installer_id
      if (!id || !name) return
      if (!map.has(id)) map.set(id, { name, jobs: 0, active: 0 })
      const entry = map.get(id)!
      if (p.status === 'closed') entry.jobs++
      if (['active','in_production','install_scheduled','installed'].includes(p.status)) entry.active++
    })
    return Array.from(map.values()).sort((a, b) => b.jobs - a.jobs)
  }, [filtered])

  // Pipeline stage breakdown
  const stageBreakdown = useMemo(() => {
    const stages: { key: string; label: string; icon: LucideIcon; color: string }[] = [
      { key: 'sales_in', label: 'Sales Intake', icon: Briefcase, color: 'bg-accent' },
      { key: 'production', label: 'Production', icon: Printer, color: 'bg-green' },
      { key: 'install', label: 'Install', icon: Wrench, color: 'bg-cyan' },
      { key: 'prod_review', label: 'QC Review', icon: Search, color: 'bg-amber' },
      { key: 'sales_close', label: 'Sales Close', icon: CheckCircle, color: 'bg-purple' },
    ]
    return stages.map(s => ({
      ...s,
      count: active.filter(p => (p.pipe_stage || 'sales_in') === s.key).length,
      value: active.filter(p => (p.pipe_stage || 'sales_in') === s.key)
        .reduce((sum, p) => sum + (p.revenue || 0), 0),
    }))
  }, [active])

  // Monthly revenue (last 12 months)
  const monthlyData = useMemo(() => {
    const now = new Date()
    const data: { month: string; revenue: number; count: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const month = MONTHS[d.getMonth()]
      const year = d.getFullYear()
      const monthProjects = closed.filter(p => {
        const cd = new Date(p.updated_at)
        return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear()
      })
      data.push({
        month: `${month} ${year.toString().slice(2)}`,
        revenue: monthProjects.reduce((s, p) => s + (p.revenue || 0), 0),
        count: monthProjects.length,
      })
    }
    return data
  }, [closed])

  const maxMonthlyRevenue = Math.max(...monthlyData.map(d => d.revenue), 1)

  // Type breakdown
  const typeBreakdown = useMemo(() => {
    const types: { key: string; label: string; icon: LucideIcon; color: string }[] = [
      { key: 'wrap', label: 'Wraps', icon: Car, color: 'text-accent' },
      { key: 'decking', label: 'Decking', icon: Anchor, color: 'text-cyan' },
      { key: 'ppf', label: 'PPF/Tint', icon: Shield, color: 'text-green' },
      { key: 'design', label: 'Design', icon: Palette, color: 'text-amber' },
    ]
    return types.map(t => ({
      ...t,
      count: filtered.filter(p => p.type === t.key).length,
      revenue: closed.filter(p => p.type === t.key).reduce((s, p) => s + (p.revenue || 0), 0),
    }))
  }, [filtered, closed])

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-900 text-text1"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Analytics
          </h1>
          <p className="text-sm text-text3 mt-1">
            {filtered.length} projects · {closed.length} closed
          </p>
        </div>
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {([
            { key: 'all', label: 'All Time' },
            { key: 'ytd', label: 'YTD' },
            { key: '90d', label: '90 Days' },
            { key: '30d', label: '30 Days' },
          ] as const).map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={clsx(
                'px-3 py-1.5 text-xs font-700 rounded-md transition-all',
                period === p.key ? 'bg-accent text-white' : 'text-text3 hover:text-text1'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue',  value: fmtMoney(totalRevenue),  color: 'text-green', sub: `${closed.length} closed deals` },
          { label: 'Total Profit',   value: fmtMoney(totalProfit),   color: 'text-accent', sub: `GPM: ${avgGpm.toFixed(1)}%` },
          { label: 'Pipeline Value', value: fmtMoney(pipelineValue), color: 'text-cyan', sub: `${active.length} active orders` },
          { label: 'Avg Deal Size',  value: fmtMoney(avgDealSize),   color: 'text-purple', sub: `Conv: ${conversionRate.toFixed(0)}%` },
        ].map(stat => (
          <div key={stat.label} className="card">
            <div className="text-xs font-700 text-text3 uppercase tracking-wider mb-1">{stat.label}</div>
            <div className={clsx('mono text-2xl font-800', stat.color)}>{stat.value}</div>
            <div className="text-xs text-text3 mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Revenue Chart + Pipeline Breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Monthly Revenue Bar Chart */}
        <div className="card col-span-2">
          <div className="section-label mb-4">Monthly Revenue (Closed)</div>
          <div className="flex items-end gap-1.5 h-40">
            {monthlyData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs mono text-text3 font-600">
                  {d.revenue > 0 ? fmtMoney(d.revenue).replace('$', '').replace(',', 'k') : ''}
                </div>
                <div
                  className="w-full rounded-t-md bg-green/60 hover:bg-green transition-all min-h-[2px]"
                  style={{ height: `${(d.revenue / maxMonthlyRevenue) * 100}%` }}
                  title={`${d.month}: ${fmtMoney(d.revenue)} (${d.count} deals)`}
                />
                <div className="text-xs text-text3 font-500 -rotate-45 origin-top-left whitespace-nowrap">
                  {d.month}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline Stages */}
        <div className="card">
          <div className="section-label mb-4">Pipeline Stages</div>
          <div className="flex flex-col gap-3">
            {stageBreakdown.map(stage => (
              <div key={stage.key} className="flex items-center gap-3">
                <stage.icon size={16} className="text-text3 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-700 text-text1">{stage.label}</span>
                    <span className="text-xs font-700 text-text2">{stage.count}</span>
                  </div>
                  <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all', stage.color)}
                      style={{ width: `${active.length ? (stage.count / active.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text3 font-600">Pipeline Total</span>
                <span className="text-green font-700 mono">{fmtMoney(pipelineValue)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboards + Type Breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Agent Leaderboard */}
        <div className="card">
          <div className="section-label mb-4 flex items-center gap-2"><Trophy size={13} /> Agent Leaderboard</div>
          {agentStats.length === 0 ? (
            <div className="text-sm text-text3 text-center py-6">No agent data yet.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {agentStats.map((agent, i) => {
                const gpm = agent.revenue > 0 ? (agent.profit / agent.revenue * 100) : 0
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className={clsx(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-900 shrink-0',
                      i === 0 ? 'bg-amber/20 text-amber' :
                      i === 1 ? 'bg-surface2 text-text2' :
                      'bg-surface2 text-text3'
                    )}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-700 text-text1 truncate">{agent.name}</div>
                      <div className="text-xs text-text3">
                        {agent.deals} closed · {agent.active} active · {gpm.toFixed(0)}% GPM
                      </div>
                    </div>
                    <div className="mono text-sm font-700 text-green shrink-0">
                      {fmtMoney(agent.revenue)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Installer Leaderboard */}
        <div className="card">
          <div className="section-label mb-4 flex items-center gap-2"><Wrench size={13} /> Installer Stats</div>
          {installerStats.length === 0 ? (
            <div className="text-sm text-text3 text-center py-6">No installer data yet.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {installerStats.map((inst, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={clsx(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-900 shrink-0',
                    i === 0 ? 'bg-cyan/20 text-cyan' : 'bg-surface2 text-text3'
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-700 text-text1 truncate">{inst.name}</div>
                    <div className="text-xs text-text3">
                      {inst.jobs} completed · {inst.active} in progress
                    </div>
                  </div>
                  <div className="mono text-sm font-700 text-cyan shrink-0">
                    {inst.jobs + inst.active}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Type Breakdown */}
        <div className="card">
          <div className="section-label mb-4 flex items-center gap-2"><BarChart2 size={13} /> By Service Type</div>
          <div className="flex flex-col gap-3">
            {typeBreakdown.map(t => (
              <div key={t.key} className="flex items-center gap-3 p-2 rounded-lg bg-surface2/50">
                <t.icon size={20} className={t.color} />
                <div className="flex-1">
                  <div className={clsx('text-sm font-700', t.color)}>{t.label}</div>
                  <div className="text-xs text-text3">{t.count} projects</div>
                </div>
                <div className="mono text-sm font-700 text-green">
                  {fmtMoney(t.revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick stats footer */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-xs font-700 text-text3 uppercase mb-1">Estimates Open</div>
          <div className="mono text-2xl font-800 text-amber">{estimates.length}</div>
          <div className="text-xs text-text3 mt-0.5">{fmtMoney(estimateValue)} potential</div>
        </div>
        <div className="card text-center">
          <div className="text-xs font-700 text-text3 uppercase mb-1">Active Orders</div>
          <div className="mono text-2xl font-800 text-cyan">{active.length}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs font-700 text-text3 uppercase mb-1">Cancelled</div>
          <div className="mono text-2xl font-800 text-red">{cancelled.length}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs font-700 text-text3 uppercase mb-1">Team Size</div>
          <div className="mono text-2xl font-800 text-purple">{teammates.length}</div>
        </div>
      </div>
    </div>
  )
}
