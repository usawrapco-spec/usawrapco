'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
  Clock,
  Car,
  User,
  Filter,
  Gavel,
  Check,
  XCircle,
  DollarSign,
  CalendarClock,
} from 'lucide-react'

interface CalendarAppointment {
  id: string
  customer_name: string
  appointment_type: string
  date: string
  time: string
  assigned_name?: string
  status: string
}

interface CalendarPageProps {
  profile: any
  projects: any[]
  appointments?: CalendarAppointment[]
}

type PipeStage = 'sales_in' | 'production' | 'install' | 'prod_review' | 'sales_close' | 'done'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const STAGE_COLORS: Record<PipeStage, string> = {
  sales_in: '#f59e0b',
  production: '#4f7fff',
  install: '#22d3ee',
  prod_review: '#8b5cf6',
  sales_close: '#8b5cf6',
  done: '#22c07a',
}

function getProjectColor(p: any): string {
  return STAGE_COLORS[p.pipe_stage as PipeStage] || '#4f7fff'
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

interface InstallerBidRow {
  id: string
  project_id: string
  installer_id: string
  status: string
  offered_rate: number | null
  created_at: string
  installer?: { id: string; name: string } | null
  project?: { id: string; title: string; vehicle_desc: string | null } | null
}

export default function CalendarPage({ profile, projects, appointments = [] }: CalendarPageProps) {
  const router = useRouter()
  const supabase = createClient()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [filterInstaller, setFilterInstaller] = useState('all')
  const [installerBids, setInstallerBids] = useState<InstallerBidRow[]>([])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const today = new Date().toISOString().split('T')[0]

  // Extract unique installers from projects
  const installers = useMemo(() => {
    const map = new Map<string, string>()
    projects.forEach(p => {
      if (p.installer_id && p.installer?.name) {
        map.set(p.installer_id, p.installer.name)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [projects])

  // Load installer bids
  useEffect(() => {
    async function loadBids() {
      const { data } = await supabase
        .from('installer_bids')
        .select('*, installer:installer_id(id, name), project:project_id(id, title, vehicle_desc)')
        .eq('org_id', profile.org_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (data) setInstallerBids(data as InstallerBidRow[])
    }
    loadBids()
  }, [])

  // Filter projects
  const filteredProjects = useMemo(() => {
    if (filterInstaller === 'all') return projects
    return projects.filter(p => p.installer_id === filterInstaller)
  }, [projects, filterInstaller])

  // Appointments by date
  const getAppointmentsForDate = useCallback((dateStr: string) => {
    return appointments.filter(a => a.date === dateStr)
  }, [appointments])

  const scheduledProjects = useMemo(() =>
    filteredProjects.filter(p => p.install_date),
    [filteredProjects]
  )

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: { date: number; inMonth: boolean; dateStr: string }[] = []

    // Previous month
    const prevDays = new Date(year, month, 0).getDate()
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevDays - i
      const m = month === 0 ? 11 : month - 1
      const y = month === 0 ? year - 1 : year
      days.push({ date: d, inMonth: false, dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: d,
        inMonth: true,
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      })
    }

    // Next month
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

  // Nav
  function prevMonth() { setCurrentDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setCurrentDate(new Date(year, month + 1, 1)) }
  function goToday() { setCurrentDate(new Date()) }

  // Selected day projects
  const selectedDayProjects = useMemo(() => {
    if (!selectedDay) return []
    return scheduledProjects.filter(p => p.install_date === selectedDay)
  }, [selectedDay, scheduledProjects])

  // Stage legend
  const stageLegend = [
    { label: 'Sales', color: '#f59e0b' },
    { label: 'Production', color: '#4f7fff' },
    { label: 'Install', color: '#22d3ee' },
    { label: 'Done', color: '#22c07a' },
    { label: 'Appointments', color: '#f59e0b', dashed: true },
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
            <CalendarDays size={26} style={{ color: '#4f7fff' }} />
            Calendar
          </h1>
          <p style={{ fontSize: 13, color: '#5a6080', marginTop: 4 }}>
            {scheduledProjects.length} scheduled installs
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Installer Filter */}
          {installers.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#13151c',
              border: '1px solid #1a1d27',
              borderRadius: 8,
              padding: '6px 12px',
            }}>
              <Filter size={14} style={{ color: '#5a6080' }} />
              <select
                value={filterInstaller}
                onChange={e => setFilterInstaller(e.target.value)}
                style={{
                  background: 'transparent',
                  color: '#e8eaed',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all" style={{ background: '#13151c' }}>All Installers</option>
                {installers.map(inst => (
                  <option key={inst.id} value={inst.id} style={{ background: '#13151c' }}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Stage Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {stageLegend.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#5a6080' }}>
            <span style={{
              width: 10, height: 10, borderRadius: 3, display: 'inline-block',
              ...((s as any).dashed
                ? { border: `2px dashed ${s.color}`, background: 'transparent' }
                : { background: s.color }),
            }} />
            {s.label}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDay ? '1fr 320px' : '1fr', gap: 16 }}>
        {/* Calendar Grid */}
        <div style={{
          background: '#13151c',
          border: '1px solid #1a1d27',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {/* Month Navigation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #1a1d27',
          }}>
            <button onClick={prevMonth} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', fontSize: 13, fontWeight: 600, color: '#9299b5',
              background: 'transparent', border: '1px solid #1a1d27', borderRadius: 6, cursor: 'pointer',
            }}>
              <ChevronLeft size={16} /> Prev
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 900, color: '#e8eaed' }}>
                {MONTHS[month]} {year}
              </span>
              <button onClick={goToday} style={{
                padding: '3px 10px', fontSize: 11, fontWeight: 600, color: '#9299b5',
                background: 'transparent', border: '1px solid #1a1d27', borderRadius: 6, cursor: 'pointer',
              }}>
                Today
              </button>
            </div>
            <button onClick={nextMonth} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', fontSize: 13, fontWeight: 600, color: '#9299b5',
              background: 'transparent', border: '1px solid #1a1d27', borderRadius: 6, cursor: 'pointer',
            }}>
              Next <ChevronRight size={16} />
            </button>
          </div>

          {/* Day Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #1a1d27' }}>
            {DAYS.map(d => (
              <div key={d} style={{
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: '#5a6080',
                textTransform: 'uppercase',
                padding: '8px 0',
                background: 'rgba(26,29,39,0.5)',
                letterSpacing: '0.05em',
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {calendarDays.map((day, i) => {
              const dayProjects = getProjectsForDate(day.dateStr)
              const dayAppts = getAppointmentsForDate(day.dateStr)
              const isToday = day.dateStr === today
              const isSelected = day.dateStr === selectedDay

              return (
                <div
                  key={i}
                  onClick={() => { if (day.inMonth) setSelectedDay(day.dateStr === selectedDay ? null : day.dateStr) }}
                  style={{
                    minHeight: 90,
                    padding: 6,
                    borderBottom: '1px solid rgba(90,96,128,0.12)',
                    borderRight: '1px solid rgba(90,96,128,0.12)',
                    background: isSelected
                      ? 'rgba(79,127,255,0.08)'
                      : isToday
                        ? 'rgba(79,127,255,0.04)'
                        : !day.inMonth
                          ? 'rgba(26,29,39,0.3)'
                          : 'transparent',
                    cursor: day.inMonth ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (day.inMonth && !isSelected) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(79,127,255,0.05)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLElement).style.background = isToday
                        ? 'rgba(79,127,255,0.04)'
                        : !day.inMonth ? 'rgba(26,29,39,0.3)' : 'transparent'
                    }
                  }}
                >
                  {/* Date number */}
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isToday ? '#fff' : day.inMonth ? '#9299b5' : 'rgba(90,96,128,0.35)',
                    ...(isToday ? {
                      background: '#4f7fff',
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

                  {/* Job pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                    {dayProjects.slice(0, 3).map(p => {
                      const color = getProjectColor(p)
                      return (
                        <div
                          key={p.id}
                          title={`${p.customer?.name || p.title} - ${p.vehicle_desc || ''}`}
                          style={{
                            height: 6,
                            borderRadius: 3,
                            background: color,
                            opacity: 0.7,
                          }}
                        />
                      )
                    })}
                    {dayAppts.length > 0 && (
                      <div
                        title={`${dayAppts.length} appointment${dayAppts.length !== 1 ? 's' : ''}`}
                        style={{
                          height: 6, borderRadius: 3,
                          background: '#f59e0b', opacity: 0.7,
                          border: '1px dashed rgba(245,158,11,0.4)',
                        }}
                      />
                    )}
                    {dayProjects.length > 3 && (
                      <div style={{ fontSize: 9, color: '#5a6080', paddingLeft: 2 }}>
                        +{dayProjects.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Side Panel - Day Detail */}
        {selectedDay && (
          <div style={{
            background: '#13151c',
            border: '1px solid #1a1d27',
            borderRadius: 12,
            padding: 16,
            position: 'relative',
            alignSelf: 'flex-start',
          }}>
            <button
              onClick={() => setSelectedDay(null)}
              style={{
                position: 'absolute', top: 10, right: 10,
                background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080',
              }}
            >
              <X size={16} />
            </button>

            <div style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 16,
              fontWeight: 800,
              color: '#4f7fff',
              marginBottom: 4,
            }}>
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>

            {(() => {
              const dayAppts = getAppointmentsForDate(selectedDay)
              return (
                <div style={{ fontSize: 12, color: '#5a6080', marginBottom: 12 }}>
                  {selectedDayProjects.length} job{selectedDayProjects.length !== 1 ? 's' : ''}
                  {dayAppts.length > 0 && (
                    <span> &middot; {dayAppts.length} appointment{dayAppts.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              )
            })()}

            {selectedDayProjects.length === 0 && getAppointmentsForDate(selectedDay).length === 0 ? (
              <div style={{ fontSize: 13, color: '#5a6080', textAlign: 'center', padding: '24px 0' }}>
                Nothing scheduled.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Appointments */}
                {getAppointmentsForDate(selectedDay).map(appt => {
                  const statusColor = appt.status === 'confirmed' ? '#22c07a' : appt.status === 'no_show' ? '#5a6080' : '#f59e0b'
                  return (
                    <div
                      key={appt.id}
                      onClick={() => router.push('/schedule')}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: 'rgba(245,158,11,0.06)',
                        borderLeft: '3px solid #f59e0b',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.12)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.06)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <CalendarClock size={11} style={{ color: '#f59e0b' }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>
                          {appt.time}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: statusColor, textTransform: 'uppercase' }}>
                          {appt.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed' }}>
                        {appt.customer_name}
                      </div>
                      <div style={{ fontSize: 11, color: '#5a6080', marginTop: 2 }}>
                        {appt.appointment_type}{appt.assigned_name ? ` \u00B7 ${appt.assigned_name}` : ''}
                      </div>
                    </div>
                  )
                })}
                {/* Jobs */}
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
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed', marginBottom: 2 }}>
                        {p.customer?.name || p.title}
                      </div>
                      {p.vehicle_desc && (
                        <div style={{ fontSize: 11, color: '#5a6080', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                          <Car size={11} /> {p.vehicle_desc}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, fontSize: 11, marginTop: 4 }}>
                        <span style={{ color: color, fontWeight: 700, textTransform: 'capitalize' }}>
                          {(p.pipe_stage || '').replace(/_/g, ' ')}
                        </span>
                        {p.installer?.name && (
                          <span style={{ color: '#22d3ee', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <User size={10} /> {p.installer.name}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pending Installer Bids */}
      {installerBids.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 16,
            fontWeight: 800,
            color: '#e8eaed',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Gavel size={18} style={{ color: '#f59e0b' }} />
            Pending Installer Bids
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#f59e0b',
              background: 'rgba(245,158,11,0.12)',
              padding: '2px 8px',
              borderRadius: 10,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {installerBids.length}
            </span>
          </div>

          <div style={{
            background: '#13151c',
            border: '1px solid #1a1d27',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1a1d27' }}>
                  {['Installer', 'Job', 'Vehicle', 'Offered Rate', 'Status', 'Sent'].map(h => (
                    <th key={h} style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#5a6080',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontFamily: 'Barlow Condensed, sans-serif',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {installerBids.map(bid => (
                  <tr key={bid.id} style={{ borderBottom: '1px solid rgba(26,29,39,0.8)' }}>
                    <td style={{ padding: '10px 12px', color: '#22d3ee', fontSize: 13, fontWeight: 600 }}>
                      {bid.installer?.name || 'Unknown'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#e8eaed', fontSize: 13, fontWeight: 600 }}>
                      {bid.project?.title || '--'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#9299b5', fontSize: 13 }}>
                      {bid.project?.vehicle_desc || '--'}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#22c07a', fontWeight: 600 }}>
                      {bid.offered_rate ? fmtMoney(bid.offered_rate) : '--'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        background: 'rgba(245,158,11,0.12)',
                        color: '#f59e0b',
                        textTransform: 'capitalize',
                      }}>
                        <Clock size={10} />
                        {bid.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#5a6080' }}>
                      {new Date(bid.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
