'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile, Project } from '@/types'
import Link from 'next/link'
import {
  DollarSign, Briefcase, TrendingUp, Wrench, Calendar,
  FileText, Users, Package, ChevronRight, ArrowUpRight,
  Activity, Target, BarChart3, MapPin, AlertTriangle, CloudRain, Zap, Cloud, Sun,
} from 'lucide-react'
import AIBriefing from '@/components/dashboard/AIBriefing'
import GoalsTracker from '@/components/dashboard/GoalsTracker'

interface Props {
  profile: Profile
  projects: Project[]
  canSeeFinancials: boolean
}

// Animated counter hook
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const ref = useRef<number>(0)

  useEffect(() => {
    const start = ref.current
    const diff = target - start
    if (diff === 0) return

    const startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      const current = Math.round(start + diff * eased)
      setValue(current)
      ref.current = current
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])

  return value
}

function AnimatedMoney({ value, fontSize = 36, color = 'var(--text1)' }: { value: number; fontSize?: number; color?: string }) {
  const animated = useCountUp(value)
  return (
    <span style={{
      fontSize, fontWeight: 900, color,
      fontFamily: 'JetBrains Mono, monospace',
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.02em',
    }}>
      ${animated.toLocaleString()}
    </span>
  )
}

function AnimatedNumber({ value, fontSize = 28, color = 'var(--text1)' }: { value: number; fontSize?: number; color?: string }) {
  const animated = useCountUp(value, 800)
  return (
    <span style={{
      fontSize, fontWeight: 900, color,
      fontFamily: 'JetBrains Mono, monospace',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {animated.toLocaleString()}
    </span>
  )
}

const PIPE_STAGE_LABELS: Record<string, string> = {
  sales_in: 'Sales', production: 'Production', install: 'Install',
  prod_review: 'QC', sales_close: 'Closing', done: 'Done',
}
const PIPE_STAGE_COLORS: Record<string, string> = {
  sales_in: '#4f7fff', production: '#8b5cf6', install: '#22d3ee',
  prod_review: '#f59e0b', sales_close: '#22c07a', done: '#5a6080',
}

const SEV_COLORS = {
  good:    { border: '#22c07a', bg: 'rgba(34,192,122,0.07)',  label: '#22c07a' },
  caution: { border: '#f59e0b', bg: 'rgba(245,158,11,0.07)', label: '#f59e0b' },
  bad:     { border: '#f25a5a', bg: 'rgba(242,90,90,0.07)',  label: '#f25a5a' },
  danger:  { border: '#8b5cf6', bg: 'rgba(139,92,246,0.09)', label: '#8b5cf6' },
}

function wxSeverity(code: number, minT: number, maxT: number, precip: number, precipProb: number, wind: number): keyof typeof SEV_COLORS {
  if (code >= 95) return 'danger'
  if (precipProb > 40 || precip > 0.1) return 'bad'
  if (minT < 50 || maxT > 95) return 'bad'
  if (wind > 20) return 'bad'
  if (precipProb > 20 || minT < 55) return 'caution'
  return 'good'
}

function WxIcon({ code, size = 14 }: { code: number; size?: number }) {
  const color = code >= 95 ? '#8b5cf6' : code >= 51 ? '#4f7fff' : '#9299b5'
  if (code >= 95) return <Zap size={size} style={{ color }} />
  if (code >= 51) return <CloudRain size={size} style={{ color }} />
  if (code >= 1)  return <Cloud size={size} style={{ color }} />
  return <Sun size={size} style={{ color: '#f59e0b' }} />
}

export default function DashboardHero({ profile, projects, canSeeFinancials }: Props) {
  const router = useRouter()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())

  const activeJobs = projects.filter(p =>
    ['active', 'in_production', 'install_scheduled', 'installed', 'qc', 'closing'].includes(p.status)
  )
  const closedThisMonth = projects.filter(p =>
    p.status === 'closed' && p.updated_at && new Date(p.updated_at) >= monthStart
  )
  const revenueMTD = closedThisMonth.reduce((s, p) => s + (p.revenue || 0), 0)
  const avgJobValue = closedThisMonth.length > 0 ? Math.round(revenueMTD / closedThisMonth.length) : 0

  // Installs this week
  const installsThisWeek = projects.filter(p => {
    const fd = p.form_data as any
    if (!fd?.install_date) return false
    const d = new Date(fd.install_date)
    return d >= weekStart && d <= new Date(weekStart.getTime() + 7 * 86400000)
  })

  // Pipeline distribution
  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const stages = ['sales_in', 'production', 'install', 'prod_review', 'sales_close']
    stages.forEach(s => { counts[s] = 0 })
    activeJobs.forEach(p => {
      const stage = p.pipe_stage || 'sales_in'
      if (counts[stage] !== undefined) counts[stage]++
    })
    return counts
  }, [activeJobs])

  const totalPipeline = Object.values(pipelineCounts).reduce((s, v) => s + v, 0)

  // Quick actions
  const QUICK_ACTIONS = [
    { label: 'New Estimate', icon: FileText, href: '/estimates/new', color: '#4f7fff' },
    { label: 'New Customer', icon: Users, href: '/customers?new=true', color: '#22c07a' },
    { label: 'Schedule Install', icon: Calendar, href: '/calendar', color: '#22d3ee' },
    { label: 'Check Inventory', icon: Package, href: '/inventory', color: '#f59e0b' },
  ]

  // Upcoming installs (next 7 days)
  const upcomingInstalls = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekOut = new Date(today.getTime() + 7 * 86400000)

    return projects
      .filter(p => {
        const fd = p.form_data as any
        if (!fd?.install_date) return false
        const d = new Date(fd.install_date)
        return d >= today && d <= weekOut && p.status !== 'closed' && p.status !== 'cancelled'
      })
      .sort((a, b) => {
        const aDate = new Date((a.form_data as any)?.install_date || 0)
        const bDate = new Date((b.form_data as any)?.install_date || 0)
        return aDate.getTime() - bDate.getTime()
      })
      .slice(0, 5)
  }, [projects])

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const todayIdx = now.getDay()

  // Additional KPIs
  const pipelineValue = activeJobs.reduce((s, p) => s + (p.revenue || 0), 0)
  const gpMTD = closedThisMonth.reduce((s, p) => s + (p.profit || 0), 0)
  const gpmPct = revenueMTD > 0 ? Math.round((gpMTD / revenueMTD) * 100) : 0

  // Conversion funnel
  const estimatesOpen = projects.filter(p => p.status === 'estimate')

  // Unique customers from closed jobs this month (for goals tracker)
  const newCustomers = new Set(
    closedThisMonth.map(p => (p.customer as any)?.id).filter(Boolean)
  ).size
  const totalFunnelTop = estimatesOpen.length + closedThisMonth.length
  const conversionRate = totalFunnelTop > 0 ? Math.round((closedThisMonth.length / totalFunnelTop) * 100) : 0

  // ── Weather alerts for mobile installs ────────────────────────
  const [weatherAlerts, setWeatherAlerts] = useState<any[]>(() =>
    projects.flatMap(p => {
      return Array.isArray(p.weather_alerts) && p.weather_alerts.length > 0 ? p.weather_alerts : []
    })
  )

  const checkWeatherAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/weather/check-installs', { method: 'POST' })
      if (res.ok) {
        const { alerts } = await res.json()
        setWeatherAlerts(alerts || [])
      }
    } catch {}
  }, [])

  useEffect(() => {
    checkWeatherAlerts()
    const interval = setInterval(checkWeatherAlerts, 4 * 60 * 60 * 1000) // every 4 hrs
    return () => clearInterval(interval)
  }, [checkWeatherAlerts])

  // ── 7-day forecast for inline display ────────────────────────
  const [forecast, setForecast] = useState<any[]>([])
  useEffect(() => {
    fetch('/api/weather?lat=47.3318&lng=-122.5793')
      .then(r => r.json())
      .then(data => {
        if (!data.daily?.time) return
        setForecast(data.daily.time.map((date: string, i: number) => ({
          date,
          code: data.daily.weathercode[i],
          high: Math.round(data.daily.temperature_2m_max[i]),
          low: Math.round(data.daily.temperature_2m_min[i]),
          precip: data.daily.precipitation_sum[i],
          wind: Math.round(data.daily.windspeed_10m_max[i]),
          precipProb: data.daily.precipitation_probability_max[i],
        })))
      })
      .catch(() => {})
  }, [])

  // ── This week's jobs (Mon–Sun) ─────────────────────────────────
  const weekMonday = useMemo(() => {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    const day = d.getDay() // 0=Sun
    const offset = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + offset)
    return d
  }, [now])

  const thisWeekJobs = useMemo(() => {
    const weekEnd = new Date(weekMonday)
    weekEnd.setDate(weekMonday.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    return projects.filter(p => {
      const dateStr = p.install_date || (p.form_data as any)?.installDate
      if (!dateStr) return false
      const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00'))
      return d >= weekMonday && d <= weekEnd && p.status !== 'cancelled' && p.status !== 'closed'
    })
  }, [projects, weekMonday])

  // Top 5 customers this month by revenue
  const customerRevMap: Record<string, { name: string; revenue: number; jobs: number }> = {}
  closedThisMonth.forEach(p => {
    const cust = p.customer as any
    if (!cust?.id) return
    if (!customerRevMap[cust.id]) customerRevMap[cust.id] = { name: cust.name || 'Unknown', revenue: 0, jobs: 0 }
    customerRevMap[cust.id].revenue += p.revenue || 0
    customerRevMap[cust.id].jobs++
  })
  const topCustomers = Object.values(customerRevMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return (
    <div style={{ padding: '24px 28px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Weather Alerts */}
      {weatherAlerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {weatherAlerts.map((alert: any, idx: number) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px',
              borderRadius: 12,
              background: alert.severity === 'danger' ? 'rgba(139,92,246,0.1)' : 'rgba(242,90,90,0.08)',
              border: `1px solid ${alert.severity === 'danger' ? '#8b5cf6' : '#f25a5a'}`,
            }}>
              {alert.severity === 'danger'
                ? <Zap size={20} style={{ color: '#8b5cf6', flexShrink: 0, marginTop: 1 }} />
                : <CloudRain size={20} style={{ color: '#f25a5a', flexShrink: 0, marginTop: 1 }} />
              }
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text1)', marginBottom: 2 }}>
                  WEATHER ALERT — {alert.job_title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
                  Install{' '}
                  {alert.install_date
                    ? new Date(alert.install_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                    : ''}
                  {alert.install_address ? ` at ${alert.install_address}` : ''}
                </div>
                <div style={{ fontSize: 11, color: alert.severity === 'danger' ? '#c4b5fd' : '#f87171' }}>
                  {alert.issues?.join(' • ')}
                </div>
              </div>
              <Link
                href={`/projects/${alert.job_id}`}
                style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', flexShrink: 0, marginTop: 2 }}
              >
                View Job
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Unified 7-Day: Weather + Installs per column */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
          This Week — Weather &amp; Installs
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekMonday)
            d.setDate(weekMonday.getDate() + i)
            const dateStr = d.toISOString().split('T')[0]
            const todayStr = now.toISOString().split('T')[0]
            const isToday = dateStr === todayStr
            const dayJobs = thisWeekJobs.filter(p => {
              const ds = p.install_date || (p.form_data as any)?.installDate
              return ds && ds.startsWith(dateStr)
            })
            const wx = forecast.find(f => f.date === dateStr)
            const sev = wx ? wxSeverity(wx.code, wx.low, wx.high, wx.precip, wx.precipProb, wx.wind) : null
            const sc = sev ? SEV_COLORS[sev] : null

            return (
              <div key={i} style={{
                flex: '1 0 110px', minWidth: 104,
                display: 'flex', flexDirection: 'column', gap: 0,
                background: isToday && sc ? sc.bg : 'var(--surface)',
                border: `1px solid ${sc && (isToday || dayJobs.length > 0) ? sc.border + (isToday ? 'cc' : '66') : 'var(--border)'}`,
                borderTop: `3px solid ${sc ? sc.border : isToday ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10, overflow: 'hidden',
              }}>
                {/* Day header */}
                <div style={{ padding: '8px 10px 6px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: isToday ? 'var(--accent)' : 'var(--text3)' }}>
                      {isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                    </div>
                  </div>
                  {/* Weather row */}
                  {wx ? (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <WxIcon code={wx.code} size={13} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{wx.high}°</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{wx.low}°</span>
                        {wx.precipProb > 0 && (
                          <span style={{ fontSize: 9, color: wx.precipProb > 40 ? '#f25a5a' : 'var(--text3)', fontWeight: 700, marginLeft: 'auto' }}>
                            {wx.precipProb}%
                          </span>
                        )}
                      </div>
                      {sev && sev !== 'good' && sc && (
                        <div style={{ fontSize: 9, fontWeight: 700, color: sc.label, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>
                          {sev === 'danger' ? 'Danger' : sev === 'bad' ? 'Bad for vinyl' : 'Caution'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ height: 26, marginTop: 6 }} />
                  )}
                </div>

                {/* Jobs for this day */}
                <div style={{ padding: '6px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {dayJobs.length === 0 ? (
                    <div style={{ fontSize: 10, color: 'var(--text3)', opacity: 0.4, padding: '2px 0' }}>No installs</div>
                  ) : (
                    dayJobs.map(p => {
                      const isMobile = p.is_mobile_install
                      const jobAlerts: any[] = Array.isArray(p.weather_alerts) ? p.weather_alerts : []
                      const hasAlert = jobAlerts.length > 0
                      const stage = p.pipe_stage || 'sales_in'
                      const stageColor = PIPE_STAGE_COLORS[stage] || '#5a6080'
                      return (
                        <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                          <div style={{
                            padding: '5px 7px', borderRadius: 7,
                            background: hasAlert ? 'rgba(242,90,90,0.07)' : 'var(--surface2)',
                            border: `1px solid ${hasAlert ? '#f25a5a44' : 'var(--border)'}`,
                            borderLeft: `3px solid ${stageColor}`,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: hasAlert ? 3 : 0 }}>
                              {isMobile && <MapPin size={9} style={{ color: '#4f7fff', flexShrink: 0 }} />}
                              {hasAlert && !isMobile && <AlertTriangle size={9} style={{ color: '#f25a5a', flexShrink: 0 }} />}
                              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {p.title || p.vehicle_desc || 'Untitled'}
                              </span>
                            </div>
                            {hasAlert && jobAlerts[0]?.issues?.[0] && (
                              <div style={{ fontSize: 9, color: '#f87171', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {jobAlerts[0].issues[0]}
                              </div>
                            )}
                            <div style={{ fontSize: 9, fontWeight: 600, color: stageColor, marginTop: hasAlert ? 0 : 2, opacity: 0.85 }}>
                              {PIPE_STAGE_LABELS[stage]}
                            </div>
                          </div>
                        </Link>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {/* Severity legend */}
        <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
          {(Object.entries(SEV_COLORS) as [string, typeof SEV_COLORS[keyof typeof SEV_COLORS]][]).map(([key, c]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: 2, background: c.border }} />
              <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, textTransform: 'capitalize' }}>
                {key === 'good' ? 'Good for vinyl' : key === 'caution' ? 'Caution' : key === 'bad' ? 'Bad for vinyl' : 'Danger'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Briefing */}
      <AIBriefing orgId={profile.org_id} profileId={profile.id} projects={projects} />

      {/* Hero Revenue */}
      <div style={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, rgba(79,127,255,0.04) 100%)',
        border: '1px solid var(--card-border)',
        borderRadius: 20, padding: '28px 32px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle accent glow */}
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,127,255,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, position: 'relative' }}>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
            }}>
              Revenue This Month
            </div>
            {canSeeFinancials ? (
              <AnimatedMoney value={revenueMTD} fontSize={42} color="var(--text1)" />
            ) : (
              <span style={{ fontSize: 42, fontWeight: 900, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>
                --
              </span>
            )}
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
              {closedThisMonth.length} jobs closed &middot; {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* Mini week calendar strip */}
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: 7 }, (_, i) => {
              const dayDate = new Date(weekStart.getTime() + i * 86400000)
              const isToday = dayDate.toDateString() === now.toDateString()
              const hasInstall = upcomingInstalls.some(p => {
                const d = new Date((p.form_data as any)?.install_date)
                return d.toDateString() === dayDate.toDateString()
              })
              return (
                <div key={i} style={{
                  width: 40, textAlign: 'center', padding: '6px 0',
                  borderRadius: 8,
                  background: isToday ? 'rgba(79,127,255,0.12)' : 'transparent',
                  border: isToday ? '1px solid rgba(79,127,255,0.3)' : '1px solid transparent',
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: isToday ? 'var(--accent)' : 'var(--text3)', textTransform: 'uppercase' }}>
                    {dayNames[dayDate.getDay()]}
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 800, color: isToday ? 'var(--accent)' : 'var(--text2)',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    {dayDate.getDate()}
                  </div>
                  {hasInstall && (
                    <div style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: 'var(--green)', margin: '2px auto 0',
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="metric-label">Active Jobs</div>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(79,127,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={14} style={{ color: 'var(--accent)' }} />
            </div>
          </div>
          <AnimatedNumber value={activeJobs.length} color="var(--text1)" />
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="metric-label">Revenue MTD</div>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(34,192,122,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={14} style={{ color: 'var(--green)' }} />
            </div>
          </div>
          {canSeeFinancials ? (
            <AnimatedMoney value={revenueMTD} fontSize={28} color="var(--green)" />
          ) : (
            <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--text3)' }}>--</span>
          )}
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="metric-label">Avg Job Value</div>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={14} style={{ color: 'var(--purple)' }} />
            </div>
          </div>
          {canSeeFinancials ? (
            <AnimatedMoney value={avgJobValue} fontSize={28} color="var(--purple)" />
          ) : (
            <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--text3)' }}>--</span>
          )}
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="metric-label">Installs This Week</div>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(34,211,238,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={14} style={{ color: 'var(--cyan)' }} />
            </div>
          </div>
          <AnimatedNumber value={installsThisWeek.length} color="var(--cyan)" />
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="metric-label">Pipeline Value</div>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={14} style={{ color: 'var(--amber)' }} />
            </div>
          </div>
          {canSeeFinancials ? (
            <AnimatedMoney value={pipelineValue} fontSize={28} color="var(--amber)" />
          ) : (
            <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--text3)' }}>--</span>
          )}
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="metric-label">Gross Profit MTD</div>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(34,192,122,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={14} style={{ color: 'var(--green)' }} />
            </div>
          </div>
          {canSeeFinancials ? (
            <>
              <AnimatedMoney value={gpMTD} fontSize={28} color="var(--green)" />
              {revenueMTD > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  {gpmPct}% GPM
                </div>
              )}
            </>
          ) : (
            <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--text3)' }}>--</span>
          )}
        </div>
      </div>

      {/* Pipeline Health Bar + Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Pipeline Health */}
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: 16, padding: '20px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 800, color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Pipeline Health
              </span>
            </div>
            <Link href="/pipeline" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
              View All <ChevronRight size={12} />
            </Link>
          </div>

          {/* Segmented bar */}
          <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 10, marginBottom: 12 }}>
            {Object.entries(pipelineCounts).map(([stage, count]) => {
              const pct = totalPipeline > 0 ? (count / totalPipeline) * 100 : 0
              if (pct === 0) return null
              return (
                <div
                  key={stage}
                  style={{
                    width: `${pct}%`, minWidth: count > 0 ? 8 : 0,
                    background: PIPE_STAGE_COLORS[stage] || '#4f7fff',
                    transition: 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                  title={`${PIPE_STAGE_LABELS[stage]}: ${count}`}
                />
              )
            })}
            {totalPipeline === 0 && (
              <div style={{ width: '100%', background: 'var(--surface2)' }} />
            )}
          </div>

          {/* Stage labels */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {Object.entries(pipelineCounts).map(([stage, count]) => (
              <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, background: PIPE_STAGE_COLORS[stage], display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>{PIPE_STAGE_LABELS[stage]}</span>
                <span style={{ fontSize: 11, color: 'var(--text1)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: 16, padding: '20px 24px',
        }}>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 800, color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 14 }}>
            Quick Actions
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {QUICK_ACTIONS.map(action => {
              const Icon = action.icon
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10,
                    background: 'var(--surface2)', border: '1px solid var(--card-border)',
                    textDecoration: 'none', color: 'var(--text1)',
                    transition: 'all 0.15s', cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = action.color
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = `0 4px 12px ${action.color}20`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--card-border)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `${action.color}12`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={15} style={{ color: action.color }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{action.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Conversion Funnel + Top Customers */}
      {canSeeFinancials && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Conversion Funnel */}
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: 16, padding: '20px 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Target size={14} style={{ color: 'var(--purple)' }} />
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 800, color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Conversion Funnel
              </span>
            </div>
            {[
              { label: 'Open Estimates', count: estimatesOpen.length, color: '#9299b5', width: 100 },
              { label: 'Active Jobs', count: activeJobs.length, color: '#4f7fff', width: estimatesOpen.length > 0 ? Math.max(20, Math.round((activeJobs.length / Math.max(estimatesOpen.length, 1)) * 100)) : 60 },
              { label: 'Closed This Month', count: closedThisMonth.length, color: '#22c07a', width: estimatesOpen.length > 0 ? Math.max(10, Math.round((closedThisMonth.length / Math.max(estimatesOpen.length, 1)) * 100)) : 40 },
            ].map(row => (
              <div key={row.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: row.color, fontWeight: 700 }}>{row.count}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, background: row.color,
                    width: `${Math.min(row.width, 100)}%`,
                    transition: 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                  }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Close rate (MTD)</span>
              <span style={{ fontSize: 14, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: conversionRate >= 50 ? 'var(--green)' : conversionRate >= 25 ? 'var(--amber)' : 'var(--red)' }}>
                {conversionRate}%
              </span>
            </div>
          </div>

          {/* Top 5 Customers */}
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: 16, padding: '20px 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={14} style={{ color: 'var(--cyan)' }} />
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 800, color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Top Customers
                </span>
              </div>
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>this month</span>
            </div>
            {topCustomers.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '16px 0' }}>
                No closed jobs this month yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topCustomers.map((cust, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: idx === 0 ? 'rgba(245,158,11,0.15)' : idx === 1 ? 'rgba(147,153,181,0.15)' : 'rgba(90,96,128,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace',
                      color: idx === 0 ? 'var(--amber)' : idx === 1 ? 'var(--text2)' : 'var(--text3)',
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cust.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{cust.jobs} job{cust.jobs !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--green)', flexShrink: 0 }}>
                      ${cust.revenue.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Goals Tracker */}
      <GoalsTracker
        profileId={profile.id}
        actuals={{
          revenue: revenueMTD,
          jobs: closedThisMonth.length,
          gp: gpMTD,
          customers: newCustomers,
        }}
        canSeeFinancials={canSeeFinancials}
      />

      {/* Upcoming Installs Strip */}
      {upcomingInstalls.length > 0 && (
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: 16, padding: '16px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={14} style={{ color: 'var(--cyan)' }} />
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 800, color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Upcoming Installs
              </span>
            </div>
            <Link href="/calendar" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
              Calendar <ArrowUpRight size={11} />
            </Link>
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {upcomingInstalls.map(p => {
              const fd = p.form_data as any
              const installDate = new Date(fd?.install_date)
              const isToday = installDate.toDateString() === now.toDateString()
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  style={{
                    flexShrink: 0, minWidth: 160, padding: '10px 14px',
                    borderRadius: 10, textDecoration: 'none',
                    background: isToday ? 'rgba(34,211,238,0.06)' : 'var(--surface2)',
                    border: isToday ? '1px solid rgba(34,211,238,0.2)' : '1px solid var(--card-border)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = 'var(--cyan)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = isToday ? 'rgba(34,211,238,0.2)' : 'var(--card-border)' }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? 'var(--cyan)' : 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>
                    {isToday ? 'Today' : installDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.title || p.vehicle_desc || 'Untitled Job'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(p.customer as any)?.name || 'No customer'}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
