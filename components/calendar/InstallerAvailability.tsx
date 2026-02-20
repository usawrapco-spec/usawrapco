'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import type { Project } from '@/types'
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  CalendarDays,
} from 'lucide-react'

/* ── Props ─────────────────────────────────────────────────────────────── */
interface InstallerAvailabilityProps {
  orgId: string
  installers: { id: string; name: string }[]
  projects: Project[]
}

/* ── Types ─────────────────────────────────────────────────────────────── */
type AvailabilityStatus = 'available' | 'unavailable' | 'off'
type AvailabilityMap = Record<string, Record<string, AvailabilityStatus>>

const MAX_HOURS_PER_DAY = 8

const STATUS_CYCLE: AvailabilityStatus[] = ['available', 'unavailable', 'off']
const STATUS_CONFIG: Record<AvailabilityStatus, { bg: string; bgHover: string; color: string; label: string }> = {
  available: {
    bg: 'rgba(34,192,122,0.12)',
    bgHover: 'rgba(34,192,122,0.22)',
    color: 'var(--green)',
    label: 'Available',
  },
  unavailable: {
    bg: 'rgba(242,90,90,0.12)',
    bgHover: 'rgba(242,90,90,0.22)',
    color: 'var(--red)',
    label: 'Booked',
  },
  off: {
    bg: 'rgba(90,96,128,0.12)',
    bgHover: 'rgba(90,96,128,0.22)',
    color: '#5a6080',
    label: 'Off',
  },
}

function getProjectHours(p: Project): number {
  const fd = (p.form_data as any) || {}
  return (p.fin_data as any)?.hrs || fd.selectedVehicle?.hrs || 4
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/* ── Component ─────────────────────────────────────────────────────────── */
export function InstallerAvailability({ orgId, installers, projects }: InstallerAvailabilityProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const now = new Date()
    const day = now.getDay()
    const start = new Date(now)
    start.setDate(now.getDate() - day)
    start.setHours(0, 0, 0, 0)
    return start
  })

  const [availability, setAvailability] = useState<AvailabilityMap>({})

  const storageKey = `usawrap_availability_${orgId}`

  /* Load from localStorage */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setAvailability(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [storageKey])

  /* Save to localStorage */
  const saveAvailability = useCallback((next: AvailabilityMap) => {
    setAvailability(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch { /* ignore */ }
  }, [storageKey])

  /* 7 days in current week view */
  const weekDays = useMemo(() => {
    const days: { date: Date; dateStr: string; label: string; isToday: boolean }[] = []
    const todayStr = formatDateStr(new Date())
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      days.push({
        date: d,
        dateStr: formatDateStr(d),
        label: DAY_LABELS[d.getDay()],
        isToday: formatDateStr(d) === todayStr,
      })
    }
    return days
  }, [weekStart])

  /* Booked hours per installer per day */
  const bookedHoursMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const inst of installers) {
      map[inst.id] = {}
    }
    for (const p of projects) {
      if (!p.install_date || !p.installer_id) continue
      if (!map[p.installer_id]) map[p.installer_id] = {}
      const hrs = getProjectHours(p)
      map[p.installer_id][p.install_date] = (map[p.installer_id][p.install_date] || 0) + hrs
    }
    return map
  }, [projects, installers])

  /* Projects per installer per day */
  const projectsMap = useMemo(() => {
    const map: Record<string, Record<string, Project[]>> = {}
    for (const p of projects) {
      if (!p.install_date || !p.installer_id) continue
      if (!map[p.installer_id]) map[p.installer_id] = {}
      if (!map[p.installer_id][p.install_date]) map[p.installer_id][p.install_date] = []
      map[p.installer_id][p.install_date].push(p)
    }
    return map
  }, [projects])

  /* Toggle availability */
  function toggleCell(installerId: string, dateStr: string) {
    const current = availability[installerId]?.[dateStr] || 'available'
    const idx = STATUS_CYCLE.indexOf(current)
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]

    const updated = { ...availability }
    if (!updated[installerId]) updated[installerId] = {}
    updated[installerId] = { ...updated[installerId], [dateStr]: next }
    saveAvailability(updated)
  }

  /* Navigation */
  function prevWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }
  function nextWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }
  function goThisWeek() {
    const now = new Date()
    const day = now.getDay()
    const start = new Date(now)
    start.setDate(now.getDate() - day)
    start.setHours(0, 0, 0, 0)
    setWeekStart(start)
  }

  /* Week date range label */
  const weekLabel = useMemo(() => {
    const end = new Date(weekStart)
    end.setDate(weekStart.getDate() + 6)
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${weekStart.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
  }, [weekStart])

  if (installers.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text3)', fontSize: 13 }}>
        No installers found. Add installer profiles to use availability tracking.
      </div>
    )
  }

  return (
    <div>
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={20} style={{ color: 'var(--cyan)' }} />
            Installer Availability
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            Click cells to toggle: Available &rarr; Booked &rarr; Off
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={prevWeek}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--surface2)',
              borderRadius: 6,
              padding: '6px 8px',
              cursor: 'pointer',
              color: 'var(--text2)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 180 }}>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800, color: 'var(--text1)' }}>
              {weekLabel}
            </span>
          </div>
          <button
            onClick={nextWeek}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--surface2)',
              borderRadius: 6,
              padding: '6px 8px',
              cursor: 'pointer',
              color: 'var(--text2)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={goThisWeek}
            className="btn-ghost"
            style={{ fontSize: 11, padding: '4px 10px', marginLeft: 4 }}
          >
            This Week
          </button>
        </div>
      </div>

      {/* ─── Legend ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {STATUS_CYCLE.map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)' }}>
            <span style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: STATUS_CONFIG[s].bg,
              border: `1px solid ${STATUS_CONFIG[s].color}`,
              display: 'inline-block',
            }} />
            {STATUS_CONFIG[s].label}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)' }}>
          <AlertTriangle size={12} style={{ color: 'var(--amber)' }} />
          Over {MAX_HOURS_PER_DAY}h warning
        </div>
      </div>

      {/* ─── Grid ────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{
                textAlign: 'left',
                padding: '10px 14px',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text3)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: 'var(--surface)',
                borderBottom: '1px solid var(--surface2)',
                minWidth: 140,
              }}>
                Installer
              </th>
              {weekDays.map(d => (
                <th key={d.dateStr} style={{
                  textAlign: 'center',
                  padding: '10px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: d.isToday ? 'var(--accent)' : 'var(--text3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: d.isToday ? 'rgba(79,127,255,0.06)' : 'var(--surface)',
                  borderBottom: '1px solid var(--surface2)',
                  minWidth: 90,
                }}>
                  <div>{d.label}</div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 13,
                    fontWeight: 800,
                    color: d.isToday ? 'var(--accent)' : 'var(--text2)',
                    marginTop: 2,
                  }}>
                    {d.date.getDate()}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {installers.map(inst => (
              <tr key={inst.id}>
                <td style={{
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--text1)',
                  borderBottom: '1px solid var(--surface2)',
                  background: 'var(--surface)',
                  whiteSpace: 'nowrap',
                }}>
                  {inst.name}
                </td>
                {weekDays.map(d => {
                  const status: AvailabilityStatus = availability[inst.id]?.[d.dateStr] || 'available'
                  const bookedHrs = bookedHoursMap[inst.id]?.[d.dateStr] || 0
                  const dayProjects = projectsMap[inst.id]?.[d.dateStr] || []
                  const isOverbooked = bookedHrs > MAX_HOURS_PER_DAY
                  const conf = STATUS_CONFIG[status]

                  return (
                    <td
                      key={d.dateStr}
                      onClick={() => toggleCell(inst.id, d.dateStr)}
                      style={{
                        textAlign: 'center',
                        padding: 6,
                        borderBottom: '1px solid var(--surface2)',
                        borderLeft: '1px solid rgba(90,96,128,0.1)',
                        background: d.isToday ? `linear-gradient(135deg, ${conf.bg}, rgba(79,127,255,0.05))` : conf.bg,
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        verticalAlign: 'top',
                        position: 'relative',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = conf.bgHover }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = d.isToday ? `linear-gradient(135deg, ${conf.bg}, rgba(79,127,255,0.05))` : conf.bg }}
                      title={`${inst.name} - ${d.dateStr}\n${conf.label} | ${bookedHrs}h booked\n${dayProjects.map(p => (p.customer as any)?.name || p.title).join(', ')}`}
                    >
                      {/* Status label */}
                      <div style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: conf.color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginBottom: 4,
                      }}>
                        {conf.label}
                      </div>

                      {/* Booked hours */}
                      <div style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 16,
                        fontWeight: 800,
                        color: isOverbooked ? 'var(--amber)' : bookedHrs > 0 ? 'var(--text1)' : 'var(--text3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3,
                      }}>
                        {isOverbooked && <AlertTriangle size={12} style={{ color: 'var(--amber)' }} />}
                        <span>{bookedHrs}h</span>
                      </div>

                      {/* Job count */}
                      {dayProjects.length > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                          {dayProjects.length} job{dayProjects.length !== 1 ? 's' : ''}
                        </div>
                      )}

                      {/* Overbooked warning */}
                      {isOverbooked && (
                        <div style={{
                          fontSize: 9,
                          color: 'var(--amber)',
                          fontWeight: 700,
                          marginTop: 3,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                        }}>
                          <Clock size={9} />
                          Over {MAX_HOURS_PER_DAY}h
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Daily Breakdown ─────────────────────────────────────────── */}
      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
          Week Detail
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {weekDays.map(d => {
            const dayTotal = installers.reduce((sum, inst) => sum + (bookedHoursMap[inst.id]?.[d.dateStr] || 0), 0)
            const dayJobs = projects.filter(p => p.install_date === d.dateStr)
            return (
              <div key={d.dateStr} className="card" style={{
                padding: '10px 8px',
                background: d.isToday ? 'rgba(79,127,255,0.06)' : undefined,
                borderColor: d.isToday ? 'var(--accent)' : undefined,
              }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: d.isToday ? 'var(--accent)' : 'var(--text3)',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                  textAlign: 'center',
                }}>
                  {d.label} {d.date.getDate()}
                </div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 18,
                  fontWeight: 800,
                  color: dayTotal > 0 ? 'var(--text1)' : 'var(--text3)',
                  textAlign: 'center',
                  marginBottom: 4,
                }}>
                  {dayTotal}h
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center' }}>
                  {dayJobs.length} job{dayJobs.length !== 1 ? 's' : ''}
                </div>
                {/* Mini list of jobs */}
                {dayJobs.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayJobs.slice(0, 3).map(p => (
                      <div key={p.id} style={{
                        fontSize: 9,
                        color: 'var(--text2)',
                        padding: '2px 4px',
                        borderRadius: 3,
                        background: 'rgba(26,29,39,0.5)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {(p.customer as any)?.name || p.title}
                      </div>
                    ))}
                    {dayJobs.length > 3 && (
                      <div style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'center' }}>
                        +{dayJobs.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
