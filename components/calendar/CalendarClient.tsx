'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import type { Profile, Project, PipeStage, ProjectStatus } from '@/types'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  X,
  Clock,
  Car,
  User,
  Filter,
  Circle,
} from 'lucide-react'

/* ── Props ─────────────────────────────────────────────────────────────── */
interface CalendarClientProps {
  profile: Profile
  projects: Project[]
  installers?: { id: string; name: string }[]
}

/* ── Constants ─────────────────────────────────────────────────────────── */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/* Stage -> color mapping */
const STAGE_COLORS: Record<PipeStage, string> = {
  sales_in: '#4f7fff',
  production: '#22c07a',
  install: '#22d3ee',
  prod_review: '#f59e0b',
  sales_close: '#8b5cf6',
  done: '#5a6080',
}

/* Status -> color mapping (fallback when stage is less useful) */
const STATUS_COLORS: Record<string, string> = {
  estimate: '#f59e0b',
  active: '#22c07a',
  in_production: '#4f7fff',
  install_scheduled: '#22d3ee',
  installed: '#8b5cf6',
  qc: '#f59e0b',
  closing: '#8b5cf6',
  closed: '#5a6080',
  cancelled: '#5a6080',
}

type AvailabilityStatus = 'available' | 'unavailable' | 'off'
type AvailabilityMap = Record<string, Record<string, AvailabilityStatus>>

function getProjectColor(p: Project): string {
  return STAGE_COLORS[p.pipe_stage] || STATUS_COLORS[p.status] || '#4f7fff'
}

function getProjectHours(p: Project): number {
  const fd = (p.form_data as any) || {}
  return (p.fin_data as any)?.hrs || fd.selectedVehicle?.hrs || 4
}

/* ── Component ─────────────────────────────────────────────────────────── */
export function CalendarClient({ profile, projects, installers = [] }: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'list'>('month')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [filterInstaller, setFilterInstaller] = useState<string>('all')
  const [availability, setAvailability] = useState<AvailabilityMap>({})
  const router = useRouter()

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const today = new Date().toISOString().split('T')[0]

  /* Load availability from localStorage */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`usawrap_availability_${profile.org_id}`)
      if (raw) setAvailability(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [profile.org_id])

  /* ── Filtered projects ─────────────────────────────────────────────── */
  const filteredProjects = useMemo(() => {
    if (filterInstaller === 'all') return projects
    return projects.filter(p => p.installer_id === filterInstaller)
  }, [projects, filterInstaller])

  const scheduledProjects = useMemo(() =>
    filteredProjects.filter(p => p.install_date),
    [filteredProjects]
  )

  const unscheduled = useMemo(() =>
    filteredProjects.filter(p => !p.install_date && ['active', 'in_production', 'install_scheduled'].includes(p.status)),
    [filteredProjects]
  )

  /* ── Calendar grid computation ─────────────────────────────────────── */
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: { date: number; inMonth: boolean; dateStr: string }[] = []

    const prevDays = new Date(year, month, 0).getDate()
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevDays - i
      const m = month === 0 ? 11 : month - 1
      const y = month === 0 ? year - 1 : year
      days.push({ date: d, inMonth: false, dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: d,
        inMonth: true,
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      })
    }
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1
      const y = month === 11 ? year + 1 : year
      days.push({ date: d, inMonth: false, dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
    }
    return days
  }, [year, month])

  const getProjectsForDate = useCallback((dateStr: string) => {
    return scheduledProjects.filter(p => p.install_date === dateStr)
  }, [scheduledProjects])

  /* ── Installer availability dots for a day ─────────────────────────── */
  function getInstallerAvailabilityDots(dateStr: string) {
    if (installers.length === 0) return null
    const dots: { color: string; name: string }[] = []
    for (const inst of installers) {
      const status = availability[inst.id]?.[dateStr]
      const dayProjects = projects.filter(p => p.install_date === dateStr && p.installer_id === inst.id)
      const bookedHours = dayProjects.reduce((s, p) => s + getProjectHours(p), 0)

      if (status === 'off') {
        dots.push({ color: '#5a6080', name: inst.name })
      } else if (status === 'unavailable' || bookedHours >= 8) {
        dots.push({ color: 'var(--red)', name: inst.name })
      } else {
        dots.push({ color: 'var(--green)', name: inst.name })
      }
    }
    return dots
  }

  /* ── Navigation ────────────────────────────────────────────────────── */
  function prevMonth() { setCurrentDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setCurrentDate(new Date(year, month + 1, 1)) }
  function goToday() { setCurrentDate(new Date()) }

  /* ── Upcoming 14 days ──────────────────────────────────────────────── */
  const upcoming = useMemo(() => {
    const now = new Date()
    const twoWeeks = new Date()
    twoWeeks.setDate(now.getDate() + 14)
    return scheduledProjects
      .filter(p => {
        const d = new Date(p.install_date!)
        return d >= now && d <= twoWeeks
      })
      .sort((a, b) => a.install_date!.localeCompare(b.install_date!))
  }, [scheduledProjects])

  /* ── Day detail panel data ─────────────────────────────────────────── */
  const selectedDayProjects = useMemo(() => {
    if (!selectedDay) return []
    return scheduledProjects.filter(p => p.install_date === selectedDay)
  }, [selectedDay, scheduledProjects])

  const selectedDayTotalHours = useMemo(() => {
    return selectedDayProjects.reduce((s, p) => s + getProjectHours(p), 0)
  }, [selectedDayProjects])

  /* ── Stage legend ──────────────────────────────────────────────────── */
  const stageLegend: { label: string; color: string }[] = [
    { label: 'Sales In', color: STAGE_COLORS.sales_in },
    { label: 'Production', color: STAGE_COLORS.production },
    { label: 'Install', color: STAGE_COLORS.install },
    { label: 'Review', color: STAGE_COLORS.prod_review },
    { label: 'Close', color: STAGE_COLORS.sales_close },
  ]

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth: 1200 }}>
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 900, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarDays size={26} style={{ color: 'var(--accent)' }} />
            Calendar
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            {scheduledProjects.length} scheduled &middot; {unscheduled.length} need dates
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Installer filter */}
          {installers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 8, padding: '4px 10px' }}>
              <Filter size={14} style={{ color: 'var(--text3)' }} />
              <select
                value={filterInstaller}
                onChange={e => setFilterInstaller(e.target.value)}
                style={{
                  background: 'transparent',
                  color: 'var(--text1)',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all" style={{ background: 'var(--surface)' }}>All Installers</option>
                {installers.map(inst => (
                  <option key={inst.id} value={inst.id} style={{ background: 'var(--surface)' }}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 8, padding: 3 }}>
            <button
              onClick={() => setView('month')}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: view === 'month' ? 'var(--accent)' : 'transparent',
                color: view === 'month' ? '#fff' : 'var(--text3)',
              }}
            >
              <CalendarDays size={13} /> Month
            </button>
            <button
              onClick={() => setView('list')}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: view === 'list' ? 'var(--accent)' : 'transparent',
                color: view === 'list' ? '#fff' : 'var(--text3)',
              }}
            >
              <List size={13} /> List
            </button>
          </div>
        </div>
      </div>

      {/* ─── Stage Legend ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {stageLegend.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: 'inline-block' }} />
            {s.label}
          </div>
        ))}
        {installers.length > 0 && (
          <>
            <span style={{ color: 'var(--text3)', fontSize: 11 }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)' }}>
              <Circle size={8} fill="var(--green)" stroke="none" /> Available
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)' }}>
              <Circle size={8} fill="var(--red)" stroke="none" /> Booked
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)' }}>
              <Circle size={8} fill="#5a6080" stroke="none" /> Off
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        {/* ─── Main Panel ────────────────────────────────────────────── */}
        <div>
          {view === 'month' ? (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Month navigation */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid var(--surface2)',
                background: 'var(--surface)',
              }}>
                <button onClick={prevMonth} className="btn-ghost" style={{ padding: '4px 8px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ChevronLeft size={16} /> Prev
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--text1)' }}>
                    {MONTHS[month]} {year}
                  </span>
                  <button onClick={goToday} className="btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}>Today</button>
                </div>
                <button onClick={nextMonth} className="btn-ghost" style={{ padding: '4px 8px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                  Next <ChevronRight size={16} />
                </button>
              </div>

              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--surface2)' }}>
                {DAYS.map(d => (
                  <div key={d} style={{
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text3)',
                    textTransform: 'uppercase',
                    padding: '8px 0',
                    background: 'rgba(26,29,39,0.5)',
                    letterSpacing: '0.05em',
                  }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {calendarDays.map((day, i) => {
                  const dayProjects = getProjectsForDate(day.dateStr)
                  const isToday = day.dateStr === today
                  const isSelected = day.dateStr === selectedDay
                  const dots = getInstallerAvailabilityDots(day.dateStr)

                  return (
                    <div
                      key={i}
                      onClick={() => { if (day.inMonth) setSelectedDay(day.dateStr === selectedDay ? null : day.dateStr) }}
                      style={{
                        minHeight: 100,
                        padding: 6,
                        borderBottom: '1px solid rgba(90,96,128,0.15)',
                        borderRight: '1px solid rgba(90,96,128,0.15)',
                        background: isSelected
                          ? 'rgba(79,127,255,0.1)'
                          : isToday
                            ? 'rgba(79,127,255,0.05)'
                            : !day.inMonth
                              ? 'rgba(26,29,39,0.3)'
                              : 'transparent',
                        cursor: day.inMonth ? 'pointer' : 'default',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => {
                        if (day.inMonth && !isSelected) {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(79,127,255,0.06)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          (e.currentTarget as HTMLElement).style.background = isToday
                            ? 'rgba(79,127,255,0.05)'
                            : !day.inMonth ? 'rgba(26,29,39,0.3)' : 'transparent'
                        }
                      }}
                    >
                      {/* Date number + availability dots */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: isToday ? '#fff' : day.inMonth ? 'var(--text2)' : 'rgba(90,96,128,0.4)',
                          ...(isToday ? {
                            background: 'var(--accent)',
                            borderRadius: '50%',
                            width: 22,
                            height: 22,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          } : {}),
                        }}>
                          {day.date}
                        </span>
                        {/* Installer availability dots */}
                        {dots && dots.length > 0 && (
                          <div style={{ display: 'flex', gap: 2 }} title={dots.map(d => d.name).join(', ')}>
                            {dots.slice(0, 4).map((d, idx) => (
                              <span key={idx} style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: d.color,
                                display: 'inline-block',
                              }} title={d.name} />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Jobs on this day */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {dayProjects.slice(0, 3).map(p => {
                          const color = getProjectColor(p)
                          return (
                            <div
                              key={p.id}
                              onClick={e => { e.stopPropagation(); router.push(`/projects/${p.id}`) }}
                              title={`${(p.customer as any)?.name || p.title} - ${p.vehicle_desc || ''} (${p.pipe_stage})`}
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: `${color}20`,
                                color: color,
                                borderLeft: `3px solid ${color}`,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${color}35` }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${color}20` }}
                            >
                              {(p.customer as any)?.name || p.title}
                            </div>
                          )
                        })}
                        {dayProjects.length > 3 && (
                          <div style={{ fontSize: 10, color: 'var(--text3)', paddingLeft: 6 }}>
                            +{dayProjects.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* ─── List View ──────────────────────────────────────────── */
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Install Date</th>
                    <th>Client</th>
                    <th>Vehicle</th>
                    <th>Installer</th>
                    <th>Stage</th>
                    <th>Hours</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledProjects.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)', fontSize: 13 }}>
                        No scheduled installs.
                      </td>
                    </tr>
                  ) : scheduledProjects.map(p => {
                    const isPast = p.install_date! < today
                    const isInstToday = p.install_date === today
                    const color = getProjectColor(p)
                    return (
                      <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/projects/${p.id}`)}>
                        <td>
                          <span style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 13,
                            fontWeight: 700,
                            color: isInstToday ? 'var(--accent)' : isPast ? 'var(--text3)' : 'var(--text1)',
                          }}>
                            {p.install_date}
                            {isInstToday && (
                              <span className="badge" style={{ background: 'var(--accent)', color: '#fff', marginLeft: 8, fontSize: 10 }}>TODAY</span>
                            )}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 13 }}>
                          {(p.customer as any)?.name || p.title}
                        </td>
                        <td style={{ color: 'var(--text3)', fontSize: 13 }}>{p.vehicle_desc || '\u2014'}</td>
                        <td style={{ color: 'var(--cyan)', fontSize: 13, fontWeight: 600 }}>
                          {(p.installer as any)?.name || '\u2014 Unassigned'}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            background: `${color}20`,
                            color: color,
                            textTransform: 'capitalize',
                          }}>
                            {p.pipe_stage.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text2)' }}>
                          {getProjectHours(p)}h
                        </td>
                        <td>
                          <button className="btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }}>Open</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Sidebar ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Day Detail Panel ─────────────────────────────────────── */}
          {selectedDay && (
            <div className="card" style={{ position: 'relative' }}>
              <button
                onClick={() => setSelectedDay(null)}
                style={{
                  position: 'absolute', top: 10, right: 10,
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)',
                }}
              >
                <X size={16} />
              </button>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 12, color: 'var(--text3)' }}>
                <span>{selectedDayProjects.length} job{selectedDayProjects.length !== 1 ? 's' : ''}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> {selectedDayTotalHours}h booked
                </span>
              </div>

              {selectedDayProjects.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: '16px 0' }}>
                  No jobs scheduled.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedDayProjects.map(p => {
                    const color = getProjectColor(p)
                    return (
                      <div
                        key={p.id}
                        onClick={() => router.push(`/projects/${p.id}`)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: `${color}10`,
                          borderLeft: `3px solid ${color}`,
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${color}20` }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${color}10` }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>
                          {(p.customer as any)?.name || p.title}
                        </div>
                        {p.vehicle_desc && (
                          <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                            <Car size={11} /> {p.vehicle_desc}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, fontSize: 11, marginTop: 4 }}>
                          <span style={{ color: color, fontWeight: 700, textTransform: 'capitalize' }}>
                            {p.pipe_stage.replace(/_/g, ' ')}
                          </span>
                          {(p.installer as any)?.name && (
                            <span style={{ color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <User size={10} /> {(p.installer as any).name}
                            </span>
                          )}
                          <span style={{ color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                            {getProjectHours(p)}h
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Installer availability for selected day */}
              {installers.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--surface2)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    Installer Availability
                  </div>
                  {installers.map(inst => {
                    const status = availability[inst.id]?.[selectedDay] || 'available'
                    const dayJobs = projects.filter(p => p.install_date === selectedDay && p.installer_id === inst.id)
                    const bookedHrs = dayJobs.reduce((s, p) => s + getProjectHours(p), 0)
                    const statusColor = status === 'off' ? '#5a6080' : status === 'unavailable' || bookedHrs >= 8 ? 'var(--red)' : 'var(--green)'
                    return (
                      <div key={inst.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 0',
                        fontSize: 12,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
                          <span style={{ color: 'var(--text1)', fontWeight: 600 }}>{inst.name}</span>
                        </div>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text3)' }}>
                          {bookedHrs}h booked
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Upcoming Installs ────────────────────────────────────── */}
          <div className="card">
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} style={{ color: 'var(--accent)' }} />
              Next 14 Days
            </div>
            {upcoming.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: '16px 0' }}>No upcoming installs.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcoming.map(p => {
                  const color = getProjectColor(p)
                  return (
                    <div
                      key={p.id}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: 'rgba(26,29,39,0.5)',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        borderLeft: `3px solid ${color}`,
                      }}
                      onClick={() => router.push(`/projects/${p.id}`)}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(26,29,39,0.5)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
                          {p.install_date}
                        </span>
                        {p.install_date === today && (
                          <span className="badge" style={{ background: 'var(--accent)', color: '#fff', fontSize: 9 }}>TODAY</span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(p.customer as any)?.name || p.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.vehicle_desc || '\u2014'}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Needs Scheduling ─────────────────────────────────────── */}
          {unscheduled.length > 0 && (
            <div className="card">
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarDays size={14} style={{ color: 'var(--amber)' }} />
                Needs Date
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {unscheduled.slice(0, 8).map(p => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: 'rgba(245,158,11,0.05)',
                      border: '1px solid rgba(245,158,11,0.2)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}
                    onClick={() => router.push(`/projects/${p.id}`)}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.4)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.2)' }}
                  >
                    <CalendarDays size={14} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(p.customer as any)?.name || p.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>No install date</div>
                    </div>
                  </div>
                ))}
                {unscheduled.length > 8 && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
                    +{unscheduled.length - 8} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
