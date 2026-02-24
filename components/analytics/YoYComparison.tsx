'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, Briefcase,
  BarChart3, Calendar, Users, Layers,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────────

interface YoYComparisonProps {
  projects: any[]
}

interface MonthData {
  month: string
  thisYear: number
  lastYear: number
}

// ── Constants ────────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const CHART_COLORS = {
  thisYear:  '#4f7fff',
  lastYear:  'rgba(79,127,255,0.3)',
  green:     '#22c07a',
  red:       '#f25a5a',
  cyan:      '#22d3ee',
  amber:     '#f59e0b',
  purple:    '#8b5cf6',
}

const PIE_COLORS = ['#4f7fff', '#22c07a', '#22d3ee', '#f59e0b', '#8b5cf6', '#f25a5a', '#ec4899', '#14b8a6']

// ── Styles ───────────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--surface)',
  borderRadius: 12,
  border: '1px solid var(--surface2)',
  padding: 24,
}

const mono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
}

const sectionTitle: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 16,
  fontWeight: 700,
  color: 'var(--text1)',
  margin: '0 0 16px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

// ── Tooltip ──────────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--surface2)',
      borderRadius: 8,
      padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 600,
        fontSize: 13,
        color: 'var(--text1)',
        marginBottom: 6,
      }}>
        {label}
      </div>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: 'var(--text2)',
          padding: '2px 0',
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            background: entry.color,
          }} />
          <span>{entry.name}:</span>
          <span style={{ ...mono, color: 'var(--text1)', fontWeight: 600 }}>
            {typeof entry.value === 'number' && entry.name?.toLowerCase().includes('revenue')
              ? `$${entry.value.toLocaleString()}`
              : typeof entry.value === 'number'
                ? entry.value.toLocaleString()
                : entry.value
            }
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function growthPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

// ── Component ────────────────────────────────────────────────────────────────────

export default function YoYComparison({ projects }: YoYComparisonProps) {
  const now = new Date()
  const thisYear = now.getFullYear()
  const lastYear = thisYear - 1

  // Filter projects by year
  const thisYearProjects = useMemo(() =>
    projects.filter(p => {
      const d = new Date(p.created_at)
      return d.getFullYear() === thisYear
    }),
    [projects, thisYear]
  )

  const lastYearProjects = useMemo(() =>
    projects.filter(p => {
      const d = new Date(p.created_at)
      return d.getFullYear() === lastYear
    }),
    [projects, lastYear]
  )

  // Only closed/completed for revenue calculations
  const thisYearClosed = useMemo(() =>
    thisYearProjects.filter(p => p.status === 'closed'),
    [thisYearProjects]
  )

  const lastYearClosed = useMemo(() =>
    lastYearProjects.filter(p => p.status === 'closed'),
    [lastYearProjects]
  )

  // ── 1. Monthly Revenue Comparison ──────────────────────────────────────────

  const monthlyRevenue = useMemo((): MonthData[] => {
    return MONTHS.map((month, idx) => {
      const ty = thisYearClosed
        .filter(p => new Date(p.created_at).getMonth() === idx)
        .reduce((s, p) => s + (p.revenue || 0), 0)
      const ly = lastYearClosed
        .filter(p => new Date(p.created_at).getMonth() === idx)
        .reduce((s, p) => s + (p.revenue || 0), 0)
      return { month, thisYear: ty, lastYear: ly }
    })
  }, [thisYearClosed, lastYearClosed])

  // ── 2. Monthly Job Count Comparison ────────────────────────────────────────

  const monthlyJobCount = useMemo(() => {
    return MONTHS.map((month, idx) => {
      const ty = thisYearProjects.filter(p => new Date(p.created_at).getMonth() === idx).length
      const ly = lastYearProjects.filter(p => new Date(p.created_at).getMonth() === idx).length
      return { month, thisYear: ty, lastYear: ly }
    })
  }, [thisYearProjects, lastYearProjects])

  // ── 3. Average Job Value Trend ─────────────────────────────────────────────

  const avgJobValue = useMemo(() => {
    return MONTHS.map((month, idx) => {
      const tyJobs = thisYearClosed.filter(p => new Date(p.created_at).getMonth() === idx)
      const lyJobs = lastYearClosed.filter(p => new Date(p.created_at).getMonth() === idx)
      const tyAvg = tyJobs.length > 0
        ? tyJobs.reduce((s, p) => s + (p.revenue || 0), 0) / tyJobs.length
        : 0
      const lyAvg = lyJobs.length > 0
        ? lyJobs.reduce((s, p) => s + (p.revenue || 0), 0) / lyJobs.length
        : 0
      return { month, thisYear: Math.round(tyAvg), lastYear: Math.round(lyAvg) }
    })
  }, [thisYearClosed, lastYearClosed])

  // ── 4. Top Services by Revenue ─────────────────────────────────────────────

  const topServices = useMemo(() => {
    const serviceMap = new Map<string, number>()
    thisYearClosed.forEach(p => {
      const type = p.type || 'wrap'
      const label = type.charAt(0).toUpperCase() + type.slice(1)
      serviceMap.set(label, (serviceMap.get(label) || 0) + (p.revenue || 0))
    })
    return Array.from(serviceMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [thisYearClosed])

  // ── 5. Revenue by Customer (Top 10) ────────────────────────────────────────

  const topCustomers = useMemo(() => {
    const custMap = new Map<string, { name: string; revenue: number; jobs: number }>()
    thisYearClosed.forEach(p => {
      const custName = (p.customer as any)?.name || p.title?.split(' - ')[0] || 'Unknown'
      const custId = p.customer_id || custName
      if (!custMap.has(custId)) {
        custMap.set(custId, { name: custName, revenue: 0, jobs: 0 })
      }
      const entry = custMap.get(custId)!
      entry.revenue += p.revenue || 0
      entry.jobs++
    })
    return Array.from(custMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
  }, [thisYearClosed])

  // ── 6. Seasonal Trends (quarterly) ─────────────────────────────────────────

  const seasonalTrends = useMemo(() => {
    const quarters = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)']
    return quarters.map((label, qi) => {
      const startMonth = qi * 3
      const endMonth = startMonth + 3
      const tyRev = thisYearClosed
        .filter(p => {
          const m = new Date(p.created_at).getMonth()
          return m >= startMonth && m < endMonth
        })
        .reduce((s, p) => s + (p.revenue || 0), 0)
      const lyRev = lastYearClosed
        .filter(p => {
          const m = new Date(p.created_at).getMonth()
          return m >= startMonth && m < endMonth
        })
        .reduce((s, p) => s + (p.revenue || 0), 0)
      return { quarter: label, thisYear: tyRev, lastYear: lyRev }
    })
  }, [thisYearClosed, lastYearClosed])

  // ── 7. YOY Growth Summary ─────────────────────────────────────────────────

  const totalRevTY = thisYearClosed.reduce((s, p) => s + (p.revenue || 0), 0)
  const totalRevLY = lastYearClosed.reduce((s, p) => s + (p.revenue || 0), 0)
  const revenueGrowth = growthPct(totalRevTY, totalRevLY)

  const jobCountTY = thisYearProjects.length
  const jobCountLY = lastYearProjects.length
  const jobGrowth = growthPct(jobCountTY, jobCountLY)

  const avgDealTY = thisYearClosed.length > 0 ? totalRevTY / thisYearClosed.length : 0
  const avgDealLY = lastYearClosed.length > 0 ? totalRevLY / lastYearClosed.length : 0
  const avgDealGrowth = growthPct(avgDealTY, avgDealLY)

  const profitTY = thisYearClosed.reduce((s, p) => s + (p.profit || 0), 0)
  const profitLY = lastYearClosed.reduce((s, p) => s + (p.profit || 0), 0)
  const profitGrowth = growthPct(profitTY, profitLY)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h2 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--text1)',
          margin: '0 0 4px',
        }}>
          Year-over-Year Comparison
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0 }}>
          {thisYear} vs {lastYear} performance analysis
        </p>
      </div>

      {/* ── KPI Cards with YOY Growth ─────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
      }}>
        {[
          {
            label: 'Revenue',
            icon: DollarSign,
            current: formatCurrency(totalRevTY),
            previous: formatCurrency(totalRevLY),
            growth: revenueGrowth,
          },
          {
            label: 'Job Count',
            icon: Briefcase,
            current: jobCountTY.toLocaleString(),
            previous: jobCountLY.toLocaleString(),
            growth: jobGrowth,
          },
          {
            label: 'Avg Job Value',
            icon: BarChart3,
            current: formatCurrency(avgDealTY),
            previous: formatCurrency(avgDealLY),
            growth: avgDealGrowth,
          },
          {
            label: 'Gross Profit',
            icon: TrendingUp,
            current: formatCurrency(profitTY),
            previous: formatCurrency(profitLY),
            growth: profitGrowth,
          },
        ].map(kpi => {
          const Icon = kpi.icon
          const isPositive = kpi.growth >= 0
          return (
            <div key={kpi.label} style={{
              ...card,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <Icon size={16} style={{ color: 'var(--accent)' }} />
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 600,
                    fontSize: 13,
                    color: 'var(--text2)',
                  }}>
                    {kpi.label}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: isPositive ? 'rgba(34,192,122,0.1)' : 'rgba(242,90,90,0.1)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: isPositive ? 'var(--green)' : 'var(--red)',
                  ...mono,
                }}>
                  {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {isPositive ? '+' : ''}{kpi.growth.toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{
                  ...mono,
                  fontSize: 28,
                  fontWeight: 700,
                  color: 'var(--text1)',
                  lineHeight: 1,
                }}>
                  {kpi.current}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                  vs {kpi.previous} in {lastYear}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Monthly Revenue Chart ─────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>
          <DollarSign size={18} style={{ color: 'var(--accent)' }} />
          Monthly Revenue: {thisYear} vs {lastYear}
        </div>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyRevenue} barGap={2}>
              <XAxis
                dataKey="month"
                tick={{ fill: '#9299b5', fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif" }}
                axisLine={{ stroke: '#1a1d27' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#5a6080', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="lastYear"
                name={`${lastYear} Revenue`}
                fill={CHART_COLORS.lastYear}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="thisYear"
                name={`${thisYear} Revenue`}
                fill={CHART_COLORS.thisYear}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          marginTop: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: CHART_COLORS.lastYear }} />
            {lastYear}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: CHART_COLORS.thisYear }} />
            {thisYear}
          </div>
        </div>
      </div>

      {/* ── Job Count + Avg Job Value (side by side) ──────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 16,
      }}>
        {/* Job Count */}
        <div style={card}>
          <div style={sectionTitle}>
            <Briefcase size={18} style={{ color: 'var(--cyan, #22d3ee)' }} />
            Job Count Comparison
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyJobCount} barGap={2}>
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#9299b5', fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif" }}
                  axisLine={{ stroke: '#1a1d27' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#5a6080', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="lastYear"
                  name={`${lastYear} Jobs`}
                  fill="rgba(34,211,238,0.25)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
                <Bar
                  dataKey="thisYear"
                  name={`${thisYear} Jobs`}
                  fill={CHART_COLORS.cyan}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Average Job Value Trend */}
        <div style={card}>
          <div style={sectionTitle}>
            <TrendingUp size={18} style={{ color: 'var(--green)' }} />
            Average Job Value Trend
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={avgJobValue}>
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#9299b5', fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif" }}
                  axisLine={{ stroke: '#1a1d27' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#5a6080', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="lastYear"
                  name={`${lastYear} Avg`}
                  stroke="rgba(34,192,122,0.35)"
                  strokeWidth={2}
                  dot={{ fill: 'rgba(34,192,122,0.35)', r: 3 }}
                  strokeDasharray="5 5"
                />
                <Line
                  type="monotone"
                  dataKey="thisYear"
                  name={`${thisYear} Avg`}
                  stroke={CHART_COLORS.green}
                  strokeWidth={2.5}
                  dot={{ fill: CHART_COLORS.green, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Top Services + Seasonal Trends (side by side) ─────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 16,
      }}>
        {/* Top Services by Revenue (Pie) */}
        <div style={card}>
          <div style={sectionTitle}>
            <Layers size={18} style={{ color: 'var(--purple, #8b5cf6)' }} />
            Top Services by Revenue ({thisYear})
          </div>
          {topServices.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ height: 240, flex: '0 0 200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topServices}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {topServices.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topServices.map((svc, idx) => (
                  <div key={svc.name} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    background: 'var(--bg)',
                    borderRadius: 6,
                  }}>
                    <div style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: PIE_COLORS[idx % PIE_COLORS.length],
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 13, color: 'var(--text1)', flex: 1 }}>{svc.name}</span>
                    <span style={{ ...mono, fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
                      {formatCurrency(svc.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 14 }}>
              No closed jobs this year yet.
            </div>
          )}
        </div>

        {/* Seasonal Trends (Quarterly) */}
        <div style={card}>
          <div style={sectionTitle}>
            <Calendar size={18} style={{ color: 'var(--amber, #f59e0b)' }} />
            Seasonal Trends (Quarterly)
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seasonalTrends} barGap={4}>
                <XAxis
                  dataKey="quarter"
                  tick={{ fill: '#9299b5', fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif" }}
                  axisLine={{ stroke: '#1a1d27' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#5a6080', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="lastYear"
                  name={`${lastYear} Revenue`}
                  fill="rgba(245,158,11,0.25)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
                <Bar
                  dataKey="thisYear"
                  name={`${thisYear} Revenue`}
                  fill={CHART_COLORS.amber}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Quarterly growth indicators */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            marginTop: 12,
          }}>
            {seasonalTrends.map(q => {
              const growth = growthPct(q.thisYear, q.lastYear)
              const isUp = growth >= 0
              return (
                <div key={q.quarter} style={{
                  textAlign: 'center',
                  padding: '6px 4px',
                  background: 'var(--bg)',
                  borderRadius: 6,
                }}>
                  <div style={{
                    ...mono,
                    fontSize: 12,
                    fontWeight: 700,
                    color: isUp ? 'var(--green)' : 'var(--red)',
                  }}>
                    {isUp ? '+' : ''}{growth.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                    {q.quarter.split(' ')[0]}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Revenue by Customer (Top 10) ──────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>
          <Users size={18} style={{ color: 'var(--accent)' }} />
          Revenue by Customer - Top 10 ({thisYear})
        </div>
        {topCustomers.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topCustomers.map((cust, idx) => {
              const maxRevenue = topCustomers[0]?.revenue || 1
              const barWidth = (cust.revenue / maxRevenue) * 100
              return (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 16px',
                  background: 'var(--bg)',
                  borderRadius: 8,
                  border: '1px solid var(--surface2)',
                }}>
                  <span style={{
                    ...mono,
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text3)',
                    width: 24,
                    textAlign: 'center',
                    flexShrink: 0,
                  }}>
                    {idx + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text1)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {cust.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {cust.jobs} job{cust.jobs !== 1 ? 's' : ''}
                        </span>
                        <span style={{
                          ...mono,
                          fontSize: 14,
                          fontWeight: 700,
                          color: 'var(--text1)',
                        }}>
                          {formatCurrency(cust.revenue)}
                        </span>
                      </div>
                    </div>
                    {/* Revenue bar */}
                    <div style={{
                      width: '100%',
                      height: 4,
                      background: 'var(--surface2)',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${barWidth}%`,
                        height: '100%',
                        background: PIE_COLORS[idx % PIE_COLORS.length],
                        borderRadius: 4,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 14 }}>
            No closed jobs this year yet.
          </div>
        )}
      </div>

      {/* ── YOY Growth Summary Table ──────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>
          <TrendingUp size={18} style={{ color: 'var(--green)' }} />
          Year-over-Year Growth Summary
        </div>
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--surface2)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Metric', `${lastYear}`, `${thisYear}`, 'Change', 'Growth %'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px',
                    textAlign: h === 'Metric' ? 'left' : 'right',
                    background: 'var(--surface2)',
                    color: 'var(--text2)',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 600,
                    fontSize: 13,
                    borderBottom: '1px solid var(--surface2)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  metric: 'Total Revenue',
                  ly: formatCurrency(totalRevLY),
                  ty: formatCurrency(totalRevTY),
                  change: formatCurrency(totalRevTY - totalRevLY),
                  growth: revenueGrowth,
                },
                {
                  metric: 'Gross Profit',
                  ly: formatCurrency(profitLY),
                  ty: formatCurrency(profitTY),
                  change: formatCurrency(profitTY - profitLY),
                  growth: profitGrowth,
                },
                {
                  metric: 'Total Jobs',
                  ly: jobCountLY.toLocaleString(),
                  ty: jobCountTY.toLocaleString(),
                  change: `${jobCountTY - jobCountLY >= 0 ? '+' : ''}${jobCountTY - jobCountLY}`,
                  growth: jobGrowth,
                },
                {
                  metric: 'Closed Jobs',
                  ly: lastYearClosed.length.toLocaleString(),
                  ty: thisYearClosed.length.toLocaleString(),
                  change: `${thisYearClosed.length - lastYearClosed.length >= 0 ? '+' : ''}${thisYearClosed.length - lastYearClosed.length}`,
                  growth: growthPct(thisYearClosed.length, lastYearClosed.length),
                },
                {
                  metric: 'Avg Deal Size',
                  ly: formatCurrency(avgDealLY),
                  ty: formatCurrency(avgDealTY),
                  change: formatCurrency(avgDealTY - avgDealLY),
                  growth: avgDealGrowth,
                },
              ].map((row, idx) => {
                const isUp = row.growth >= 0
                return (
                  <tr key={row.metric}>
                    <td style={{
                      padding: '12px 16px',
                      fontWeight: 600,
                      fontSize: 13,
                      color: 'var(--text1)',
                      borderBottom: '1px solid var(--surface2)',
                    }}>
                      {row.metric}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      ...mono,
                      fontSize: 13,
                      color: 'var(--text2)',
                      borderBottom: '1px solid var(--surface2)',
                    }}>
                      {row.ly}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      ...mono,
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text1)',
                      borderBottom: '1px solid var(--surface2)',
                    }}>
                      {row.ty}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      ...mono,
                      fontSize: 13,
                      color: isUp ? 'var(--green)' : 'var(--red)',
                      borderBottom: '1px solid var(--surface2)',
                    }}>
                      {row.change}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      borderBottom: '1px solid var(--surface2)',
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 10px',
                        borderRadius: 6,
                        background: isUp ? 'rgba(34,192,122,0.1)' : 'rgba(242,90,90,0.1)',
                        ...mono,
                        fontSize: 12,
                        fontWeight: 700,
                        color: isUp ? 'var(--green)' : 'var(--red)',
                      }}>
                        {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {isUp ? '+' : ''}{row.growth.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
