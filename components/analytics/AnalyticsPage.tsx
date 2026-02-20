'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Award,
  Percent,
  Layers,
  Calendar,
  Target,
  Briefcase,
} from 'lucide-react'

interface AnalyticsPageProps {
  profile: any
  projects: any[]
}

type PeriodKey = 'week' | 'month' | 'quarter' | 'custom'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export default function AnalyticsPage({ profile, projects }: AnalyticsPageProps) {
  const [period, setPeriod] = useState<PeriodKey>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Filter projects by period
  const filtered = useMemo(() => {
    const now = new Date()
    let startDate: Date

    if (period === 'week') {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
      startDate.setHours(0, 0, 0, 0)
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (period === 'quarter') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3
      startDate = new Date(now.getFullYear(), quarterMonth, 1)
    } else if (period === 'custom' && customStart) {
      startDate = new Date(customStart)
    } else {
      return projects
    }

    const endDate = period === 'custom' && customEnd ? new Date(customEnd + 'T23:59:59') : now

    return projects.filter(p => {
      const created = new Date(p.created_at)
      return created >= startDate && created <= endDate
    })
  }, [projects, period, customStart, customEnd])

  const closed = useMemo(() => filtered.filter(p => p.status === 'closed'), [filtered])
  const active = useMemo(() => filtered.filter(p =>
    ['active', 'in_production', 'install_scheduled', 'installed', 'qc', 'closing'].includes(p.status)
  ), [filtered])

  // Revenue metrics
  const totalRevenue = closed.reduce((s, p) => s + (p.revenue || 0), 0)
  const totalProfit = closed.reduce((s, p) => s + (p.profit || 0), 0)
  const avgGpm = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0
  const jobsClosed = closed.length

  // Revenue bar chart (last 6 periods based on selection)
  const revenueBarData = useMemo(() => {
    const now = new Date()
    const data: { label: string; revenue: number; count: number }[] = []

    if (period === 'week' || period === 'month') {
      // Show last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        const monthProjects = closed.filter(p => {
          const cd = new Date(p.updated_at || p.created_at)
          return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear()
        })
        data.push({
          label: `${MONTHS[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`,
          revenue: monthProjects.reduce((s, p) => s + (p.revenue || 0), 0),
          count: monthProjects.length,
        })
      }
    } else {
      // Show last 4 quarters
      for (let i = 3; i >= 0; i--) {
        const qMonth = Math.floor(now.getMonth() / 3) * 3 - (i * 3)
        const qDate = new Date(now.getFullYear(), qMonth, 1)
        const qEnd = new Date(qDate.getFullYear(), qDate.getMonth() + 3, 0)
        const qProjects = closed.filter(p => {
          const cd = new Date(p.updated_at || p.created_at)
          return cd >= qDate && cd <= qEnd
        })
        const qNum = Math.floor(qDate.getMonth() / 3) + 1
        data.push({
          label: `Q${qNum} ${qDate.getFullYear().toString().slice(2)}`,
          revenue: qProjects.reduce((s, p) => s + (p.revenue || 0), 0),
          count: qProjects.length,
        })
      }
    }
    return data
  }, [closed, period])

  const maxRevenue = Math.max(...revenueBarData.map(d => d.revenue), 1)

  // GPM trend bars
  const gpmBarData = useMemo(() => {
    const now = new Date()
    const data: { label: string; gpm: number }[] = []

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthClosed = closed.filter(p => {
        const cd = new Date(p.updated_at || p.created_at)
        return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear()
      })
      const rev = monthClosed.reduce((s, p) => s + (p.revenue || 0), 0)
      const prof = monthClosed.reduce((s, p) => s + (p.profit || 0), 0)
      const gpm = rev > 0 ? (prof / rev * 100) : 0
      data.push({
        label: MONTHS[d.getMonth()],
        gpm,
      })
    }
    return data
  }, [closed])

  const maxGpm = Math.max(...gpmBarData.map(d => d.gpm), 1)

  // Commission payouts by agent
  const commissionData = useMemo(() => {
    const map = new Map<string, { name: string; commission: number; deals: number }>()
    closed.forEach(p => {
      const agentName = p.agent?.name
      const agentId = p.agent_id
      if (!agentId || !agentName) return
      if (!map.has(agentId)) map.set(agentId, { name: agentName, commission: 0, deals: 0 })
      const entry = map.get(agentId)!
      entry.commission += p.commission || 0
      entry.deals++
    })
    return Array.from(map.values()).sort((a, b) => b.commission - a.commission)
  }, [closed])

  // Material usage
  const materialUsage = useMemo(() => {
    let totalSqft = 0
    let totalLinft = 0
    let bufferPcts: number[] = []

    closed.forEach(p => {
      const actuals = p.actuals || {}
      if (actuals.sqft_used) totalSqft += Number(actuals.sqft_used) || 0
      if (actuals.linft_used) totalLinft += Number(actuals.linft_used) || 0
      if (actuals.buffer_pct) bufferPcts.push(Number(actuals.buffer_pct) || 0)
    })

    const avgBuffer = bufferPcts.length > 0
      ? bufferPcts.reduce((s, b) => s + b, 0) / bufferPcts.length
      : 0

    return { totalSqft, totalLinft, avgBuffer }
  }, [closed])

  // Top performers by revenue and GPM
  const topPerformers = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; profit: number; deals: number }>()
    closed.forEach(p => {
      const agentName = p.agent?.name
      const agentId = p.agent_id
      if (!agentId || !agentName) return
      if (!map.has(agentId)) map.set(agentId, { name: agentName, revenue: 0, profit: 0, deals: 0 })
      const entry = map.get(agentId)!
      entry.revenue += p.revenue || 0
      entry.profit += p.profit || 0
      entry.deals++
    })
    const all = Array.from(map.values())
    const byRevenue = [...all].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
    const byGpm = [...all]
      .map(a => ({ ...a, gpm: a.revenue > 0 ? (a.profit / a.revenue * 100) : 0 }))
      .sort((a, b) => b.gpm - a.gpm)
      .slice(0, 5)
    return { byRevenue, byGpm }
  }, [closed])

  const periodOptions: { key: PeriodKey; label: string }[] = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'custom', label: 'Custom' },
  ]

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 28,
            fontWeight: 900,
            color: '#e8eaed',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <BarChart3 size={26} style={{ color: '#4f7fff' }} />
            Analytics
          </h1>
          <p style={{ fontSize: 13, color: '#5a6080', marginTop: 4 }}>
            {filtered.length} projects -- {closed.length} closed
          </p>
        </div>

        {/* Period Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{
            display: 'flex',
            gap: 2,
            background: '#13151c',
            border: '1px solid #1a1d27',
            borderRadius: 8,
            padding: 3,
          }}>
            {periodOptions.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: period === p.key ? '#4f7fff' : 'transparent',
                  color: period === p.key ? '#fff' : '#5a6080',
                  transition: 'all 0.15s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ padding: '6px 8px', background: '#13151c', border: '1px solid #1a1d27', borderRadius: 6, color: '#e8eaed', fontSize: 12, outline: 'none' }} />
              <span style={{ color: '#5a6080', fontSize: 12 }}>to</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ padding: '6px 8px', background: '#13151c', border: '1px solid #1a1d27', borderRadius: 6, color: '#e8eaed', fontSize: 12, outline: 'none' }} />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Revenue', value: fmtMoney(totalRevenue), color: '#22c07a', icon: <DollarSign size={16} />, sub: `${jobsClosed} closed deals` },
          { label: 'Total Profit', value: fmtMoney(totalProfit), color: '#4f7fff', icon: <TrendingUp size={16} />, sub: `GPM: ${avgGpm.toFixed(1)}%` },
          { label: 'Jobs Closed', value: String(jobsClosed), color: '#8b5cf6', icon: <Target size={16} />, sub: `${active.length} still active` },
          { label: 'Avg GPM', value: `${avgGpm.toFixed(1)}%`, color: avgGpm >= 40 ? '#22c07a' : avgGpm >= 25 ? '#f59e0b' : '#f25a5a', icon: <Percent size={16} />, sub: totalRevenue > 0 ? `${fmtMoney(totalRevenue / (jobsClosed || 1))} avg deal` : '--' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#13151c',
            border: '1px solid #1a1d27',
            borderRadius: 12,
            padding: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ color: stat.color }}>{stat.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Barlow Condensed, sans-serif' }}>
                {stat.label}
              </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: stat.color, fontFamily: "'JetBrains Mono', monospace" }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 11, color: '#5a6080', marginTop: 4 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Revenue Bar Chart + GPM Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Revenue Bar Chart */}
        <div style={{
          background: '#13151c',
          border: '1px solid #1a1d27',
          borderRadius: 12,
          padding: 20,
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#5a6080',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: 'Barlow Condensed, sans-serif',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <BarChart3 size={14} style={{ color: '#22c07a' }} />
            Revenue (Closed Deals)
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
            {revenueBarData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                {d.revenue > 0 && (
                  <div style={{ fontSize: 10, color: '#5a6080', fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmtMoney(d.revenue)}
                  </div>
                )}
                <div
                  style={{
                    width: '100%',
                    maxWidth: 48,
                    borderRadius: '4px 4px 0 0',
                    background: '#22c07a',
                    opacity: 0.7,
                    minHeight: 2,
                    height: `${(d.revenue / maxRevenue) * 100}%`,
                    transition: 'height 0.3s ease',
                  }}
                  title={`${d.label}: ${fmtMoney(d.revenue)} (${d.count} deals)`}
                />
                <div style={{ fontSize: 10, color: '#5a6080', whiteSpace: 'nowrap' }}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* GPM Trend */}
        <div style={{
          background: '#13151c',
          border: '1px solid #1a1d27',
          borderRadius: 12,
          padding: 20,
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#5a6080',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: 'Barlow Condensed, sans-serif',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <Percent size={14} style={{ color: '#f59e0b' }} />
            GPM Trend
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160 }}>
            {gpmBarData.map((d, i) => {
              const color = d.gpm >= 40 ? '#22c07a' : d.gpm >= 25 ? '#f59e0b' : '#f25a5a'
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {d.gpm > 0 && (
                    <div style={{ fontSize: 10, color: '#5a6080', fontFamily: "'JetBrains Mono', monospace" }}>
                      {d.gpm.toFixed(0)}%
                    </div>
                  )}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 36,
                      borderRadius: '4px 4px 0 0',
                      background: color,
                      opacity: 0.7,
                      minHeight: 2,
                      height: `${(d.gpm / Math.max(maxGpm, 60)) * 100}%`,
                      transition: 'height 0.3s ease',
                    }}
                    title={`${d.label}: ${d.gpm.toFixed(1)}% GPM`}
                  />
                  <div style={{ fontSize: 10, color: '#5a6080' }}>{d.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Commission Payouts + Material Usage */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Commission Payouts */}
        <div style={{
          background: '#13151c',
          border: '1px solid #1a1d27',
          borderRadius: 12,
          padding: 20,
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#5a6080',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: 'Barlow Condensed, sans-serif',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <Briefcase size={14} style={{ color: '#8b5cf6' }} />
            Commission Payouts
          </div>

          {commissionData.length === 0 ? (
            <div style={{ fontSize: 13, color: '#5a6080', textAlign: 'center', padding: '24px 0' }}>
              No commission data for this period.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {commissionData.map((agent, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(26,29,39,0.5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: i === 0 ? 'rgba(245,158,11,0.15)' : '#1a1d27',
                      color: i === 0 ? '#f59e0b' : '#5a6080',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                    }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed' }}>{agent.name}</div>
                      <div style={{ fontSize: 11, color: '#5a6080' }}>{agent.deals} deals</div>
                    </div>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: '#22c07a' }}>
                    {fmtMoney(agent.commission)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Material Usage Summary */}
        <div style={{
          background: '#13151c',
          border: '1px solid #1a1d27',
          borderRadius: 12,
          padding: 20,
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#5a6080',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: 'Barlow Condensed, sans-serif',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <Layers size={14} style={{ color: '#22d3ee' }} />
            Material Usage Summary
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontFamily: 'Barlow Condensed, sans-serif' }}>
                Total SQFT
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#e8eaed', fontFamily: "'JetBrains Mono', monospace" }}>
                {materialUsage.totalSqft.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontFamily: 'Barlow Condensed, sans-serif' }}>
                Total LINFT
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#22d3ee', fontFamily: "'JetBrains Mono', monospace" }}>
                {materialUsage.totalLinft.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontFamily: 'Barlow Condensed, sans-serif' }}>
                Avg Buffer %
              </div>
              <div style={{
                fontSize: 22,
                fontWeight: 700,
                color: materialUsage.avgBuffer > 20 ? '#f25a5a' : materialUsage.avgBuffer > 10 ? '#f59e0b' : '#22c07a',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {materialUsage.avgBuffer.toFixed(1)}%
              </div>
            </div>
          </div>

          {materialUsage.totalSqft === 0 && materialUsage.totalLinft === 0 && (
            <div style={{ fontSize: 12, color: '#5a6080', textAlign: 'center', marginTop: 16 }}>
              No material tracking data for this period.
            </div>
          )}
        </div>
      </div>

      {/* Top Performers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Top by Revenue */}
        <div style={{
          background: '#13151c',
          border: '1px solid #1a1d27',
          borderRadius: 12,
          padding: 20,
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#5a6080',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: 'Barlow Condensed, sans-serif',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <Award size={14} style={{ color: '#f59e0b' }} />
            Top Agents by Revenue
          </div>

          {topPerformers.byRevenue.length === 0 ? (
            <div style={{ fontSize: 13, color: '#5a6080', textAlign: 'center', padding: '24px 0' }}>
              No agent data for this period.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topPerformers.byRevenue.map((agent, i) => {
                const barWidth = topPerformers.byRevenue[0].revenue > 0
                  ? (agent.revenue / topPerformers.byRevenue[0].revenue * 100)
                  : 0
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: i === 0 ? 'rgba(245,158,11,0.15)' : i === 1 ? 'rgba(192,192,192,0.1)' : '#1a1d27',
                          color: i === 0 ? '#f59e0b' : i === 1 ? '#9299b5' : '#5a6080',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 800,
                        }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed' }}>{agent.name}</span>
                        <span style={{ fontSize: 11, color: '#5a6080' }}>{agent.deals} deals</span>
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: '#22c07a' }}>
                        {fmtMoney(agent.revenue)}
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: '#1a1d27', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barWidth}%`, background: '#22c07a', borderRadius: 2, transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top by GPM */}
        <div style={{
          background: '#13151c',
          border: '1px solid #1a1d27',
          borderRadius: 12,
          padding: 20,
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#5a6080',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: 'Barlow Condensed, sans-serif',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <Percent size={14} style={{ color: '#22c07a' }} />
            Top Agents by GPM
          </div>

          {topPerformers.byGpm.length === 0 ? (
            <div style={{ fontSize: 13, color: '#5a6080', textAlign: 'center', padding: '24px 0' }}>
              No agent data for this period.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topPerformers.byGpm.map((agent, i) => {
                const color = agent.gpm >= 40 ? '#22c07a' : agent.gpm >= 25 ? '#f59e0b' : '#f25a5a'
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: i === 0 ? 'rgba(34,192,122,0.15)' : '#1a1d27',
                          color: i === 0 ? '#22c07a' : '#5a6080',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 800,
                        }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed' }}>{agent.name}</span>
                        <span style={{ fontSize: 11, color: '#5a6080' }}>{fmtMoney(agent.revenue)}</span>
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color }}>
                        {agent.gpm.toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: '#1a1d27', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(agent.gpm / 60 * 100, 100)}%`, background: color, borderRadius: 2, transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
