'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile, Project } from '@/types'
import Link from 'next/link'
import {
  DollarSign, Briefcase, TrendingUp, Wrench, Calendar,
  FileText, Users, Package, ChevronRight, ArrowUpRight,
  Activity,
} from 'lucide-react'

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

  return (
    <div style={{ padding: '24px 28px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
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
