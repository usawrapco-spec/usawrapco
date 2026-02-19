'use client'

import { useState, useMemo } from 'react'
import type { Profile, Project } from '@/types'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'

interface CalendarClientProps {
  profile: Profile
  projects: Project[]
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export function CalendarClient({ profile, projects }: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'list'>('month')
  const router = useRouter()

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Projects with dates
  const scheduledProjects = useMemo(() =>
    projects.filter(p => p.install_date),
    [projects]
  )

  const unscheduled = useMemo(() =>
    projects.filter(p => !p.install_date && ['active', 'in_production', 'install_scheduled'].includes(p.status)),
    [projects]
  )

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: { date: number; inMonth: boolean; dateStr: string }[] = []

    // Previous month padding
    const prevDays = new Date(year, month, 0).getDate()
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevDays - i
      const m = month === 0 ? 11 : month - 1
      const y = month === 0 ? year - 1 : year
      days.push({ date: d, inMonth: false, dateStr: `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: d,
        inMonth: true,
        dateStr: `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      })
    }

    // Next month padding
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1
      const y = month === 11 ? year + 1 : year
      days.push({ date: d, inMonth: false, dateStr: `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
    }

    return days
  }, [year, month])

  function getProjectsForDate(dateStr: string) {
    return scheduledProjects.filter(p => p.install_date === dateStr)
  }

  const today = new Date().toISOString().split('T')[0]

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
  }
  function goToday() {
    setCurrentDate(new Date())
  }

  // Upcoming installs (next 14 days)
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

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-900 text-text1"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            📅 Calendar
          </h1>
          <p className="text-sm text-text3 mt-1">
            {scheduledProjects.length} scheduled · {unscheduled.length} need dates
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
            <button
              onClick={() => setView('month')}
              className={clsx('px-3 py-1.5 text-xs font-700 rounded-md', view === 'month' ? 'bg-accent text-white' : 'text-text3')}
            >
              Month
            </button>
            <button
              onClick={() => setView('list')}
              className={clsx('px-3 py-1.5 text-xs font-700 rounded-md', view === 'list' ? 'bg-accent text-white' : 'text-text3')}
            >
              List
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Calendar */}
        <div className="col-span-3">
          {view === 'month' ? (
            <div className="card p-0 overflow-hidden">
              {/* Month nav */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
                <button onClick={prevMonth} className="btn-ghost btn-sm">← Prev</button>
                <div className="flex items-center gap-3">
                  <span className="font-display text-xl font-900 text-text1"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {MONTHS[month]} {year}
                  </span>
                  <button onClick={goToday} className="btn-ghost btn-xs">Today</button>
                </div>
                <button onClick={nextMonth} className="btn-ghost btn-sm">Next →</button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-border">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs font-700 text-text3 uppercase py-2 bg-surface2/50">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                  const dayProjects = getProjectsForDate(day.dateStr)
                  const isToday = day.dateStr === today
                  return (
                    <div
                      key={i}
                      className={clsx(
                        'min-h-[90px] p-1.5 border-b border-r border-border/30 transition-colors',
                        !day.inMonth && 'bg-surface2/30',
                        isToday && 'bg-accent/5'
                      )}
                    >
                      <div className={clsx(
                        'text-xs font-700 mb-1',
                        isToday ? 'text-accent' : day.inMonth ? 'text-text2' : 'text-text3/50'
                      )}>
                        {isToday && <span className="inline-block w-5 h-5 rounded-full bg-accent text-white text-center leading-5 mr-0.5">{day.date}</span>}
                        {!isToday && day.date}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {dayProjects.slice(0, 3).map(p => (
                          <div
                            key={p.id}
                            className="text-xs font-600 px-1.5 py-0.5 rounded bg-accent/15 text-accent truncate cursor-pointer hover:bg-accent/25 transition-colors"
                            onClick={() => router.push(`/projects/${p.id}`)}
                            title={`${(p.customer as any)?.name || p.title} — ${p.vehicle_desc || ''}`}
                          >
                            {(p.customer as any)?.name || p.title}
                          </div>
                        ))}
                        {dayProjects.length > 3 && (
                          <div className="text-xs text-text3 pl-1.5">+{dayProjects.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* List view */
            <div className="card p-0 overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Install Date</th>
                    <th>Client</th>
                    <th>Vehicle</th>
                    <th>Installer</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledProjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-text3 text-sm">
                        No scheduled installs.
                      </td>
                    </tr>
                  ) : scheduledProjects.map(p => {
                    const isPast = p.install_date! < today
                    const isToday = p.install_date === today
                    return (
                      <tr key={p.id} className="cursor-pointer" onClick={() => router.push(`/projects/${p.id}`)}>
                        <td>
                          <span className={clsx(
                            'mono text-sm font-700',
                            isToday ? 'text-accent' : isPast ? 'text-text3' : 'text-text1'
                          )}>
                            {p.install_date}
                            {isToday && <span className="badge badge-accent ml-2">TODAY</span>}
                          </span>
                        </td>
                        <td className="font-700 text-text1 text-sm">
                          {(p.customer as any)?.name || p.title}
                        </td>
                        <td className="text-text3 text-sm">{p.vehicle_desc || '—'}</td>
                        <td className="text-cyan text-sm font-600">
                          {(p.installer as any)?.name || '— Unassigned'}
                        </td>
                        <td>
                          <span className="badge badge-accent capitalize">
                            {p.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          <button className="btn-ghost btn-xs">Open →</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Upcoming */}
          <div className="card">
            <div className="section-label mb-3">⏰ Next 14 Days</div>
            {upcoming.length === 0 ? (
              <div className="text-sm text-text3 text-center py-4">No upcoming installs.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {upcoming.map(p => (
                  <div
                    key={p.id}
                    className="p-2 rounded-lg bg-surface2/50 cursor-pointer hover:bg-surface2 transition-colors"
                    onClick={() => router.push(`/projects/${p.id}`)}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-700 text-accent mono">{p.install_date}</span>
                      {p.install_date === today && <span className="badge badge-accent text-xs">TODAY</span>}
                    </div>
                    <div className="text-sm font-700 text-text1 truncate">
                      {(p.customer as any)?.name || p.title}
                    </div>
                    <div className="text-xs text-text3 truncate">{p.vehicle_desc || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Needs Scheduling */}
          {unscheduled.length > 0 && (
            <div className="card">
              <div className="section-label mb-3">📋 Needs Date</div>
              <div className="flex flex-col gap-2">
                {unscheduled.slice(0, 8).map(p => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-amber/5 border border-amber/20 cursor-pointer hover:border-amber/40 transition-colors"
                    onClick={() => router.push(`/projects/${p.id}`)}
                  >
                    <span className="text-amber text-sm">⚠</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-700 text-text1 truncate">
                        {(p.customer as any)?.name || p.title}
                      </div>
                      <div className="text-xs text-text3">No install date</div>
                    </div>
                  </div>
                ))}
                {unscheduled.length > 8 && (
                  <div className="text-xs text-text3 text-center">+{unscheduled.length - 8} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
