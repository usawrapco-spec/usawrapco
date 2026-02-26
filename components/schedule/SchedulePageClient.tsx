'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Phone,
  Mail,
  FileText,
  Check,
  XCircle,
  Edit3,
  Filter,
  Trash2,
  AlertTriangle,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────
interface Appointment {
  id: string
  org_id: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  appointment_type: string
  date: string
  time: string
  assigned_to?: string
  assigned_name?: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'no_show'
  notes?: string
  created_at: string
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

type ViewMode = 'month' | 'week' | 'day'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--amber)',
  confirmed: 'var(--green)',
  cancelled: 'var(--red)',
  no_show: 'var(--text3)',
}

const APPOINTMENT_TYPES = ['Estimate', 'Consultation', 'Install Drop-off', 'Design Review', 'Pick-up', 'Other']

// ── Helpers ────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekDates(date: Date) {
  const day = date.getDay()
  const start = new Date(date)
  start.setDate(start.getDate() - day)
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    days.push(d)
  }
  return days
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7) // 7am to 7pm

interface Props {
  profile: Profile
  initialAppointments: Appointment[]
  team: TeamMember[]
}

export default function SchedulePageClient({ profile, initialAppointments, team }: Props) {
  const [supabase] = useState(() => createClient())
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showNewModal, setShowNewModal] = useState(false)
  const [newApptPreset, setNewApptPreset] = useState<{ date?: string; time?: string } | null>(null)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterStaff, setFilterStaff] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const orgId = profile.org_id || ORG_ID
  const today = formatDate(new Date())

  // Filtered appointments
  const filtered = useMemo(() => {
    return appointments.filter(a => {
      if (filterType && a.appointment_type !== filterType) return false
      if (filterStaff && a.assigned_to !== filterStaff) return false
      if (filterStatus && a.status !== filterStatus) return false
      return true
    })
  }, [appointments, filterType, filterStaff, filterStatus])

  // Today's appointments for sidebar
  const todayAppts = useMemo(() => {
    return filtered
      .filter(a => a.date === today)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  }, [filtered, today])

  // Appointments by date lookup (sorted by time within each day)
  const apptsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    filtered.forEach(a => {
      if (!map[a.date]) map[a.date] = []
      map[a.date].push(a)
    })
    Object.values(map).forEach(arr => arr.sort((a, b) => (a.time || '').localeCompare(b.time || '')))
    return map
  }, [filtered])

  const navigate = (dir: number) => {
    const d = new Date(currentDate)
    if (viewMode === 'month') d.setMonth(d.getMonth() + dir)
    else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setDate(d.getDate() + dir)
    setCurrentDate(d)
  }

  const refreshAppointments = useCallback(async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('org_id', orgId)
      .order('date', { ascending: true })
    if (error) { console.error('Failed to load appointments:', error); return }
    if (data) setAppointments(data)
  }, [orgId, supabase])

  const updateStatus = async (id: string, status: Appointment['status']) => {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
    if (error) { console.error('Failed to update status:', error); return }
    await refreshAppointments()
    if (selectedAppt?.id === id) setSelectedAppt(prev => prev ? { ...prev, status } : null)
  }

  const deleteAppointment = async (id: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (error) { console.error('Failed to delete appointment:', error); return }
    setSelectedAppt(null)
    await refreshAppointments()
  }

  // ── Month View ───────────────────────────────────────
  const renderMonthView = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const cells: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    // Fill trailing cells to complete the grid row
    while (cells.length % 7 !== 0) cells.push(null)

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {DAYS.map(d => (
            <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} style={{ minHeight: 90 }} />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayAppts = apptsByDate[dateStr] || []
            const isToday = dateStr === today
            const dayOfWeek = (firstDay + day - 1) % 7
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

            return (
              <div
                key={dateStr}
                style={{
                  minHeight: 90,
                  background: isWeekend ? 'var(--surface2)' : 'var(--surface)',
                  borderRadius: 6,
                  padding: '4px 6px',
                  border: isToday ? '1px solid var(--accent)' : '1px solid transparent',
                  cursor: 'pointer',
                  opacity: isWeekend ? 0.75 : 1,
                }}
                onClick={() => { setCurrentDate(new Date(year, month, day)); setViewMode('day') }}
              >
                <div style={{
                  fontSize: 12,
                  fontWeight: isToday ? 800 : 500,
                  color: isToday ? 'var(--accent)' : 'var(--text2)',
                  fontFamily: 'JetBrains Mono, monospace',
                  marginBottom: 4,
                }}>
                  {day}
                </div>
                {dayAppts.slice(0, 3).map(a => (
                  <div
                    key={a.id}
                    onClick={e => { e.stopPropagation(); setSelectedAppt(a) }}
                    style={{
                      fontSize: 10,
                      padding: '2px 4px',
                      borderRadius: 3,
                      marginBottom: 2,
                      background: `${STATUS_COLORS[a.status]}15`,
                      borderLeft: `2px solid ${STATUS_COLORS[a.status]}`,
                      color: 'var(--text1)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                    }}
                  >
                    {a.time?.slice(0, 5)} {a.customer_name}
                  </div>
                ))}
                {dayAppts.length > 3 && (
                  <div style={{ fontSize: 9, color: 'var(--text3)', padding: '0 4px' }}>
                    +{dayAppts.length - 3} more
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Week View ────────────────────────────────────────
  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate)
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {weekDates.map(d => {
          const dateStr = formatDate(d)
          const dayAppts = (apptsByDate[dateStr] || []).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
          const isToday = dateStr === today
          return (
            <div key={dateStr} style={{
              background: 'var(--surface)',
              borderRadius: 8,
              padding: 8,
              minHeight: 300,
              border: isToday ? '1px solid var(--accent)' : '1px solid var(--border)',
            }}>
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>
                  {DAYS[d.getDay()]}
                </div>
                <div style={{
                  fontSize: 18,
                  fontWeight: isToday ? 800 : 500,
                  color: isToday ? 'var(--accent)' : 'var(--text1)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {d.getDate()}
                </div>
              </div>
              {dayAppts.map(a => (
                <div
                  key={a.id}
                  onClick={() => setSelectedAppt(a)}
                  style={{
                    fontSize: 11,
                    padding: '6px 8px',
                    borderRadius: 5,
                    marginBottom: 4,
                    background: `${STATUS_COLORS[a.status]}12`,
                    borderLeft: `3px solid ${STATUS_COLORS[a.status]}`,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--text1)' }}>{a.time?.slice(0, 5)}</div>
                  <div style={{ color: 'var(--text2)', marginTop: 2 }}>{a.customer_name}</div>
                  <div style={{ color: 'var(--text3)', fontSize: 10 }}>{a.appointment_type}</div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  // ── Day View ─────────────────────────────────────────
  const renderDayView = () => {
    const dateStr = formatDate(currentDate)
    const dayAppts = (apptsByDate[dateStr] || []).sort((a, b) => (a.time || '').localeCompare(b.time || ''))

    return (
      <div style={{ background: 'var(--surface)', borderRadius: 10, overflow: 'hidden' }}>
        {HOURS.map(hour => {
          const hourStr = String(hour).padStart(2, '0')
          const hourAppts = dayAppts.filter(a => a.time?.startsWith(hourStr))
          return (
            <div key={hour} style={{
              display: 'flex',
              borderBottom: '1px solid var(--border)',
              minHeight: 60,
            }}>
              <div style={{
                width: 60,
                padding: '8px 8px',
                fontSize: 12,
                color: 'var(--text3)',
                fontFamily: 'JetBrains Mono, monospace',
                textAlign: 'right',
                flexShrink: 0,
                borderRight: '1px solid var(--border)',
              }}>
                {hour > 12 ? hour - 12 : hour}{hour >= 12 ? 'pm' : 'am'}
              </div>
              <div
                style={{ flex: 1, padding: 4, display: 'flex', flexWrap: 'wrap', gap: 4, cursor: hourAppts.length === 0 ? 'pointer' : 'default', minHeight: 52 }}
                onClick={() => {
                  if (hourAppts.length === 0) {
                    setNewApptPreset({ date: formatDate(currentDate), time: `${hourStr}:00` })
                    setShowNewModal(true)
                  }
                }}
                title={hourAppts.length === 0 ? 'Click to create appointment' : undefined}
              >
                {hourAppts.map(a => (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAppt(a)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: `${STATUS_COLORS[a.status]}15`,
                      borderLeft: `3px solid ${STATUS_COLORS[a.status]}`,
                      cursor: 'pointer',
                      flex: '1 1 200px',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text1)' }}>
                      {a.customer_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                      {a.appointment_type} {a.assigned_name ? `- ${a.assigned_name}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const viewTitle = viewMode === 'month'
    ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : viewMode === 'week'
      ? (() => {
          const w = getWeekDates(currentDate)
          const m0 = w[0].getMonth(), m6 = w[6].getMonth()
          return m0 === m6
            ? `${MONTHS[m0]} ${w[0].getDate()} - ${w[6].getDate()}, ${w[6].getFullYear()}`
            : `${MONTHS[m0]} ${w[0].getDate()} - ${MONTHS[m6]} ${w[6].getDate()}, ${w[6].getFullYear()}`
        })()
      : `${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', margin: 0 }}>
            Schedule
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', margin: '4px 0 0' }}>
            {filtered.length} appointment{filtered.length !== 1 ? 's' : ''}{filtered.length !== appointments.length ? ` (${appointments.length} total)` : ''}
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: 'var(--accent)', color: '#fff',
            fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
          }}
        >
          <Plus size={14} /> New Appointment
        </button>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Main calendar area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Nav bar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 16, flexWrap: 'wrap', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => navigate(-1)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: 'var(--text2)', display: 'flex' }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', minWidth: 180, textAlign: 'center' }}>
                {viewTitle}
              </span>
              <button onClick={() => navigate(1)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: 'var(--text2)', display: 'flex' }}>
                <ChevronRight size={16} />
              </button>
              <button onClick={() => setCurrentDate(new Date())} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
                Today
              </button>
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              {(['month', 'week', 'day'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: viewMode === v ? 'var(--accent)' : 'var(--surface)',
                    color: viewMode === v ? '#fff' : 'var(--text2)',
                    border: viewMode === v ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer', textTransform: 'capitalize',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Filter size={14} style={{ color: 'var(--text3)' }} />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
                padding: '5px 8px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer',
              }}
            >
              <option value="">All Types</option>
              {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={filterStaff}
              onChange={e => setFilterStaff(e.target.value)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
                padding: '5px 8px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer',
              }}
            >
              <option value="">All Staff</option>
              {team.map(t => <option key={t.id} value={t.id}>{t.name || t.email}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
                padding: '5px 8px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer',
              }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
            {(filterType || filterStaff || filterStatus) && (
              <button
                onClick={() => { setFilterType(''); setFilterStaff(''); setFilterStatus('') }}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Calendar view */}
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
        </div>

        {/* Right sidebar — today's appointments */}
        <div className="hidden md:block" style={{ width: 280, flexShrink: 0 }}>
          <div style={{
            background: 'var(--surface)',
            borderRadius: 10,
            padding: 16,
            border: '1px solid var(--border)',
          }}>
            <h3 style={{
              fontSize: 14, fontWeight: 700, color: 'var(--text1)',
              fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <CalendarIcon size={14} style={{ color: 'var(--accent)' }} />
              Today&apos;s Schedule
            </h3>
            {todayAppts.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: 20 }}>
                No appointments today
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {todayAppts.map(a => (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAppt(a)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: `${STATUS_COLORS[a.status]}08`,
                      borderLeft: `3px solid ${STATUS_COLORS[a.status]}`,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {a.time?.slice(0, 5)}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: `${STATUS_COLORS[a.status]}20`,
                        color: STATUS_COLORS[a.status],
                        textTransform: 'uppercase',
                      }}>
                        {a.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginTop: 4 }}>
                      {a.customer_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {a.appointment_type}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Appointment Modal */}
      {showNewModal && (
        <NewAppointmentModal
          orgId={orgId}
          team={team}
          supabase={supabase}
          presetDate={newApptPreset?.date}
          presetTime={newApptPreset?.time}
          onClose={() => { setShowNewModal(false); setNewApptPreset(null) }}
          onCreated={() => { setShowNewModal(false); setNewApptPreset(null); refreshAppointments() }}
        />
      )}

      {/* Appointment Detail Modal */}
      {selectedAppt && (
        <AppointmentDetailModal
          appointment={selectedAppt}
          team={team}
          supabase={supabase}
          orgId={orgId}
          onClose={() => setSelectedAppt(null)}
          onUpdate={() => { refreshAppointments(); setSelectedAppt(null) }}
          onStatusChange={updateStatus}
          onDelete={deleteAppointment}
        />
      )}
    </div>
  )
}

// ── New Appointment Modal ──────────────────────────────
function NewAppointmentModal({ orgId, team, supabase, presetDate, presetTime, onClose, onCreated }: {
  orgId: string
  team: TeamMember[]
  supabase: ReturnType<typeof createClient>
  presetDate?: string
  presetTime?: string
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    appointment_type: 'Estimate',
    date: presetDate || formatDate(new Date()),
    time: presetTime || '09:00',
    assigned_to: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSave = async () => {
    if (!form.customer_name || !form.date) return
    if (saving) return
    setSaving(true)
    setError('')
    const assignedMember = team.find(t => t.id === form.assigned_to)
    const { error: err } = await supabase.from('appointments').insert({
      ...form,
      org_id: orgId,
      status: 'pending',
      assigned_name: assignedMember?.name || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onCreated()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{
        position: 'relative', background: 'var(--surface)', borderRadius: 12,
        padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
        border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', margin: 0 }}>
            New Appointment
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, display: 'block' }}>Customer Name *</label>
            <input
              value={form.customer_name}
              onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))}
              placeholder="Customer name"
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, display: 'block' }}>Email</label>
              <input
                value={form.customer_email}
                onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))}
                placeholder="email@example.com"
                type="email"
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, display: 'block' }}>Phone</label>
              <input
                value={form.customer_phone}
                onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))}
                placeholder="(555) 123-4567"
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13 }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, display: 'block' }}>Appointment Type</label>
            <select
              value={form.appointment_type}
              onChange={e => setForm(p => ({ ...p, appointment_type: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13, cursor: 'pointer' }}
            >
              {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, display: 'block' }}>Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, display: 'block' }}>Time</label>
              <input
                type="time"
                value={form.time}
                onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13 }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, display: 'block' }}>Assign To</label>
            <select
              value={form.assigned_to}
              onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13, cursor: 'pointer' }}
            >
              <option value="">Unassigned</option>
              {team.map(t => <option key={t.id} value={t.id}>{t.name || t.email}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, display: 'block' }}>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={3}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13, resize: 'vertical' }}
            />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: 'rgba(242,90,90,0.1)', color: 'var(--red)', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--surface2)', color: 'var(--text2)', fontSize: 13, border: 'none', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.customer_name}
            style={{
              padding: '8px 20px', borderRadius: 6,
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 600, border: 'none',
              cursor: saving ? 'wait' : 'pointer',
              opacity: !form.customer_name ? 0.5 : 1,
            }}
          >
            {saving ? 'Creating...' : 'Create Appointment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Appointment Detail Modal ───────────────────────────
function AppointmentDetailModal({ appointment, team, supabase, orgId, onClose, onUpdate, onStatusChange, onDelete }: {
  appointment: Appointment
  team: TeamMember[]
  supabase: ReturnType<typeof createClient>
  orgId: string
  onClose: () => void
  onUpdate: () => void
  onStatusChange: (id: string, status: Appointment['status']) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...appointment })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    setError('')
    const assignedMember = team.find(t => t.id === form.assigned_to)
    const { error: err } = await supabase.from('appointments').update({
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      customer_phone: form.customer_phone,
      appointment_type: form.appointment_type,
      date: form.date,
      time: form.time,
      assigned_to: form.assigned_to,
      assigned_name: assignedMember?.name || null,
      notes: form.notes,
    }).eq('id', appointment.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onUpdate()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{
        position: 'relative', background: 'var(--surface)', borderRadius: 12,
        padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
        border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', margin: 0 }}>
            Appointment Details
          </h2>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setEditing(!editing)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 4 }}>
              <Edit3 size={16} />
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Status badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 6,
          background: `${STATUS_COLORS[appointment.status]}15`,
          marginBottom: 16,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[appointment.status] }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLORS[appointment.status], textTransform: 'capitalize' }}>
            {appointment.status.replace('_', ' ')}
          </span>
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Customer name" style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13 }} />
            <input value={form.customer_email || ''} onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))} placeholder="Email" style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13 }} />
            <input value={form.customer_phone || ''} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} placeholder="Phone" style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13 }} />
            <select value={form.appointment_type} onChange={e => setForm(p => ({ ...p, appointment_type: e.target.value }))} style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13 }}>
              {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13 }} />
              <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13 }} />
            </div>
            <select value={form.assigned_to || ''} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13 }}>
              <option value="">Unassigned</option>
              {team.map(t => <option key={t.id} value={t.id}>{t.name || t.email}</option>)}
            </select>
            <textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Notes..." style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(false)} style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--surface2)', color: 'var(--text2)', fontSize: 13, border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 6, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={14} style={{ color: 'var(--text3)' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>{appointment.customer_name}</span>
            </div>
            {appointment.customer_email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={14} style={{ color: 'var(--text3)' }} />
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>{appointment.customer_email}</span>
              </div>
            )}
            {appointment.customer_phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={14} style={{ color: 'var(--text3)' }} />
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>{appointment.customer_phone}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={14} style={{ color: 'var(--text3)' }} />
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{appointment.appointment_type}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarIcon size={14} style={{ color: 'var(--text3)' }} />
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{appointment.date} at {appointment.time}</span>
            </div>
            {appointment.assigned_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={14} style={{ color: 'var(--text3)' }} />
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Assigned: {appointment.assigned_name}</span>
              </div>
            )}
            {appointment.notes && (
              <div style={{ fontSize: 13, color: 'var(--text2)', background: 'var(--bg)', padding: '8px 12px', borderRadius: 6, marginTop: 4 }}>
                {appointment.notes}
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: 'rgba(242,90,90,0.1)', color: 'var(--red)', fontSize: 12 }}>
            {error}
          </div>
        )}

        {/* Action buttons */}
        {!editing && (
          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            {appointment.status !== 'confirmed' && (
              <button
                onClick={() => onStatusChange(appointment.id, 'confirmed')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '7px 14px', borderRadius: 6,
                  background: 'rgba(34,192,122,0.1)', color: 'var(--green)',
                  fontSize: 12, fontWeight: 600, border: '1px solid rgba(34,192,122,0.2)', cursor: 'pointer',
                }}
              >
                <Check size={13} /> Confirm
              </button>
            )}
            {appointment.status !== 'cancelled' && (
              <button
                onClick={() => onStatusChange(appointment.id, 'cancelled')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '7px 14px', borderRadius: 6,
                  background: 'rgba(242,90,90,0.1)', color: 'var(--red)',
                  fontSize: 12, fontWeight: 600, border: '1px solid rgba(242,90,90,0.2)', cursor: 'pointer',
                }}
              >
                <XCircle size={13} /> Cancel
              </button>
            )}
            {appointment.status !== 'no_show' && (
              <button
                onClick={() => onStatusChange(appointment.id, 'no_show')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '7px 14px', borderRadius: 6,
                  background: 'rgba(90,96,128,0.1)', color: 'var(--text3)',
                  fontSize: 12, fontWeight: 600, border: '1px solid rgba(90,96,128,0.2)', cursor: 'pointer',
                }}
              >
                No Show
              </button>
            )}
            <div style={{ flex: 1 }} />
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '7px 14px', borderRadius: 6,
                  background: 'none', color: 'var(--text3)',
                  fontSize: 12, fontWeight: 600, border: '1px solid var(--border)', cursor: 'pointer',
                }}
              >
                <Trash2 size={13} /> Delete
              </button>
            ) : (
              <button
                onClick={() => onDelete(appointment.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '7px 14px', borderRadius: 6,
                  background: 'rgba(242,90,90,0.15)', color: 'var(--red)',
                  fontSize: 12, fontWeight: 700, border: '1px solid rgba(242,90,90,0.3)', cursor: 'pointer',
                }}
              >
                <AlertTriangle size={13} /> Confirm Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
