'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Clock,
  User,
  Briefcase,
  ChevronDown,
  ChevronUp,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Sparkles,
  BarChart3,
  Timer,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Props {
  projectId: string
  revenue: number
  materialCost: number
}

interface TimeEntry {
  id: string
  user_id: string
  clock_in: string
  clock_out: string | null
  duration_minutes: number | null
  entry_type: string
  project_notes: string | null
  ai_summary: string | null
  user?: { id: string; name: string }
}

/* ------------------------------------------------------------------ */
/*  Style Helpers                                                     */
/* ------------------------------------------------------------------ */

const mono: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontVariantNumeric: 'tabular-nums',
}

const headerFont: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
}

const card: React.CSSProperties = {
  background: '#161920',
  border: '1px solid #1e2330',
  borderRadius: 12,
}

const cardInner: React.CSSProperties = {
  background: '#13151c',
  border: '1px solid #1e2330',
  borderRadius: 8,
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n)
}

function fmtDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    })
  } catch {
    return d
  }
}

function fmtTime(d: string | null): string {
  if (!d) return '--'
  try {
    return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return d
  }
}

function fmtHours(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return `${h}h ${m}m`
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function TimeTrackingTab({ projectId, revenue, materialCost }: Props) {
  const supabase = createClient()

  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [generatingRecap, setGeneratingRecap] = useState<string | null>(null)
  const [recaps, setRecaps] = useState<Record<string, string>>({})

  // Default hourly rate for labor cost calculation
  const DEFAULT_HOURLY_RATE = 25

  // Fetch time entries for this project
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('time_clock_entries')
        .select('*, user:user_id(id, name)')
        .eq('job_id', projectId)
        .order('clock_in', { ascending: true })

      if (!error && data) {
        setEntries(data)
      }
      setLoading(false)
    }
    load()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Group entries by user
  const byUser = useMemo(() => {
    const map = new Map<string, { name: string; entries: TimeEntry[]; totalMinutes: number }>()
    for (const entry of entries) {
      const uid = entry.user_id
      const name = entry.user?.name || 'Unknown'
      if (!map.has(uid)) {
        map.set(uid, { name, entries: [], totalMinutes: 0 })
      }
      const group = map.get(uid)!
      group.entries.push(entry)
      group.totalMinutes += entry.duration_minutes || 0
    }
    return map
  }, [entries])

  // Calculate totals
  const grandTotalMinutes = useMemo(() => {
    return entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
  }, [entries])

  const grandTotalHours = grandTotalMinutes / 60
  const laborCost = grandTotalHours * DEFAULT_HOURLY_RATE
  const laborMargin = revenue > 0 ? ((revenue - materialCost - laborCost) / revenue * 100) : 0

  // Estimated hours (from project line items, fallback to 0)
  const [estimatedHours, setEstimatedHours] = useState<number>(0)

  useEffect(() => {
    async function loadEstimate() {
      const { data } = await supabase
        .from('line_items')
        .select('specs')
        .eq('parent_id', projectId)

      if (data) {
        const totalEst = data.reduce((sum: number, item: any) => {
          return sum + (item.specs?.estimatedHours || item.specs?.laborHours || 0)
        }, 0)
        setEstimatedHours(totalEst)
      }
    }
    loadEstimate()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleUser(uid: string) {
    setExpandedUsers((prev) => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
  }

  async function generateRecap(userId: string) {
    setGeneratingRecap(userId)
    try {
      const userEntries = byUser.get(userId)?.entries || []
      const notes = userEntries
        .map((e) => e.project_notes)
        .filter(Boolean)
        .join('; ')
      const totalMins = userEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0)

      const res = await fetch('/api/ai/work-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes || 'Various tasks on this job',
          jobId: projectId,
          durationMinutes: totalMins,
        }),
      })

      const data = await res.json()
      if (data.summary) {
        setRecaps((prev) => ({ ...prev, [userId]: data.summary }))
      }
    } catch (err) {
      console.error('Failed to generate recap:', err)
    }
    setGeneratingRecap(null)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--text3)' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} />
        Loading time entries...
      </div>
    )
  }

  const hoursVariance = estimatedHours > 0 ? grandTotalHours - estimatedHours : 0
  const hoursVariancePct = estimatedHours > 0 ? (hoursVariance / estimatedHours) * 100 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total Hours', value: grandTotalHours.toFixed(1), sub: `${entries.length} entries`, icon: Clock, color: '#4f7fff' },
          { label: 'Estimated Hours', value: estimatedHours > 0 ? estimatedHours.toFixed(1) : '--', sub: estimatedHours > 0 ? `${hoursVariance >= 0 ? '+' : ''}${hoursVariance.toFixed(1)}h variance` : 'Not set', icon: Timer, color: '#22d3ee' },
          { label: 'Labor Cost', value: fmt(laborCost), sub: `@ ${fmt(DEFAULT_HOURLY_RATE)}/hr`, icon: DollarSign, color: '#f59e0b' },
          { label: 'Labor Margin', value: `${laborMargin.toFixed(1)}%`, sub: `${fmt(revenue - materialCost - laborCost)} profit after labor`, icon: TrendingUp, color: laborMargin >= 50 ? '#22c07a' : laborMargin >= 30 ? '#f59e0b' : '#f25a5a' },
          { label: 'Employees', value: String(byUser.size), sub: 'worked on this job', icon: User, color: '#8b5cf6' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              ...card,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <stat.icon size={20} style={{ color: stat.color, flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stat.label}
              </div>
              <div style={{ ...mono, fontSize: 20, fontWeight: 700, color: 'var(--text1)', lineHeight: 1.2 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Estimated vs Actual Bar */}
      {estimatedHours > 0 && (
        <div style={{ ...card, padding: 16 }}>
          <div style={{ ...headerFont, fontSize: 13, color: 'var(--text1)', marginBottom: 10 }}>
            <BarChart3 size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Estimated vs Actual Hours
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>Estimated</span>
                <span style={{ ...mono, fontSize: 12, color: 'var(--text2)' }}>{estimatedHours.toFixed(1)}h</span>
              </div>
              <div style={{ height: 8, background: '#1e2330', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: '100%',
                  background: '#22d3ee',
                  borderRadius: 4,
                }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>Actual</span>
                <span style={{ ...mono, fontSize: 12, color: grandTotalHours > estimatedHours ? '#f25a5a' : '#22c07a' }}>
                  {grandTotalHours.toFixed(1)}h
                </span>
              </div>
              <div style={{ height: 8, background: '#1e2330', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((grandTotalHours / estimatedHours) * 100, 100)}%`,
                  background: grandTotalHours > estimatedHours ? '#f25a5a' : '#22c07a',
                  borderRadius: 4,
                }} />
              </div>
            </div>
          </div>
          {hoursVariance > 0 && (
            <div style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: '#f59e0b',
            }}>
              <AlertTriangle size={13} />
              Over estimate by {hoursVariance.toFixed(1)}h ({hoursVariancePct.toFixed(0)}%)
            </div>
          )}
        </div>
      )}

      {/* Entries by Employee */}
      {entries.length === 0 ? (
        <div style={{ ...card, padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
          <Clock size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>No time entries logged for this job yet.</div>
        </div>
      ) : (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ ...headerFont, fontSize: 14, color: 'var(--text1)', padding: '14px 16px', borderBottom: '1px solid #1e2330' }}>
            <User size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Time by Employee
          </div>

          {Array.from(byUser.entries()).map(([userId, group]) => {
            const isExpanded = expandedUsers.has(userId)
            const hours = group.totalMinutes / 60
            const userLaborCost = hours * DEFAULT_HOURLY_RATE

            return (
              <div key={userId}>
                {/* Employee Header Row */}
                <div
                  onClick={() => toggleUser(userId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: '1px solid #1e2330',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(79,127,255,0.04)' : 'transparent',
                    transition: 'background .15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {isExpanded ? <ChevronUp size={14} color="var(--text3)" /> : <ChevronDown size={14} color="var(--text3)" />}
                    <div>
                      <span style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 14 }}>{group.name}</span>
                      <span style={{ color: 'var(--text3)', fontSize: 12, marginLeft: 8 }}>
                        {group.entries.length} entries
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ ...mono, fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                        {hours.toFixed(1)}h
                      </div>
                      <div style={{ ...mono, fontSize: 11, color: 'var(--text3)' }}>
                        {fmt(userLaborCost)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded: Individual Entries */}
                {isExpanded && (
                  <div style={{ padding: '12px 16px 16px 40px', borderBottom: '1px solid #1e2330', background: 'rgba(79,127,255,0.02)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {group.entries.map((entry) => {
                        const duration = entry.duration_minutes ? fmtHours(entry.duration_minutes) : 'Active'
                        return (
                          <div
                            key={entry.id}
                            style={{
                              ...cardInner,
                              padding: '10px 14px',
                              fontSize: 12,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text1)', fontWeight: 600 }}>
                                {fmtDate(entry.clock_in)}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{
                                  ...mono,
                                  fontSize: 11,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  background: entry.entry_type === 'overtime'
                                    ? 'rgba(245,158,11,0.15)'
                                    : 'rgba(79,127,255,0.1)',
                                  color: entry.entry_type === 'overtime' ? '#f59e0b' : '#4f7fff',
                                }}>
                                  {entry.entry_type}
                                </span>
                                <span style={{ ...mono, color: 'var(--text1)', fontWeight: 600 }}>{duration}</span>
                              </div>
                            </div>
                            <div style={{ color: 'var(--text2)', marginTop: 4 }}>
                              {fmtTime(entry.clock_in)} - {entry.clock_out ? fmtTime(entry.clock_out) : 'Still clocked in'}
                            </div>
                            {entry.project_notes && (
                              <div style={{ color: 'var(--text2)', fontSize: 11, marginTop: 6, fontStyle: 'italic' }}>
                                {entry.project_notes}
                              </div>
                            )}
                            {entry.ai_summary && (
                              <div style={{
                                marginTop: 6,
                                padding: '6px 8px',
                                background: 'rgba(79,127,255,0.06)',
                                borderRadius: 6,
                                fontSize: 11,
                                color: 'var(--text2)',
                                borderLeft: '2px solid var(--accent)',
                              }}>
                                <Sparkles size={10} style={{ display: 'inline', marginRight: 4, color: 'var(--accent)' }} />
                                {entry.ai_summary}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* AI Work Recap Button */}
                    <button
                      onClick={() => generateRecap(userId)}
                      disabled={generatingRecap === userId}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 12,
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: '1px solid rgba(79,127,255,0.3)',
                        background: 'rgba(79,127,255,0.08)',
                        color: '#4f7fff',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: generatingRecap === userId ? 'not-allowed' : 'pointer',
                        opacity: generatingRecap === userId ? 0.6 : 1,
                        transition: 'opacity .15s',
                      }}
                    >
                      {generatingRecap === userId ? (
                        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Sparkles size={13} />
                      )}
                      AI Work Recap
                    </button>

                    {recaps[userId] && (
                      <div style={{
                        marginTop: 10,
                        padding: '12px 14px',
                        background: 'rgba(79,127,255,0.06)',
                        borderRadius: 8,
                        borderLeft: '3px solid #4f7fff',
                        fontSize: 12,
                        color: 'var(--text2)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}>
                        <div style={{ ...headerFont, fontSize: 11, color: '#4f7fff', marginBottom: 6 }}>
                          <Sparkles size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                          AI Recap for {group.name}
                        </div>
                        {recaps[userId]}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Grand Total Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            background: '#1a1d27',
            borderTop: '1px solid #1e2330',
          }}>
            <span style={{ ...headerFont, fontSize: 13, color: 'var(--text1)' }}>Grand Total</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...mono, fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>
                  {grandTotalHours.toFixed(1)}h
                </div>
                <div style={{ ...mono, fontSize: 12, color: 'var(--text3)' }}>
                  {fmt(laborCost)} labor cost
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
