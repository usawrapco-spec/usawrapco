'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Calendar, ChevronLeft, ChevronRight, Plus, X, Clock, ArrowLeft, User,
} from 'lucide-react'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

const INSTALLER_COLORS = [
  '#4f7fff', '#22c07a', '#f59e0b', '#8b5cf6', '#22d3ee',
  '#f25a5a', '#ec4899', '#10b981', '#f97316', '#6366f1',
  '#14b8a6', '#e879f9', '#84cc16', '#fb923c', '#38bdf8',
]

interface ScheduleEvent {
  id: string
  installer_id: string
  project_id: string
  assignment_id: string | null
  scheduled_date: string
  start_time: string | null
  end_time: string | null
  status: string
  notes: string | null
  installer?: { id: string; name: string }
  project?: { id: string; title: string; vehicle_desc: string | null }
}

interface DayCell {
  date: Date
  dateStr: string
  isCurrentMonth: boolean
  isToday: boolean
  events: ScheduleEvent[]
}

export default function InstallScheduleClient({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [installers, setInstallers] = useState<{ id: string; name: string }[]>([])
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([])
  const [installerColorMap, setInstallerColorMap] = useState<Record<string, string>>({})

  // Form state
  const [formJob, setFormJob] = useState('')
  const [formInstaller, setFormInstaller] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formStart, setFormStart] = useState('08:00')
  const [formEnd, setFormEnd] = useState('17:00')
  const [saving, setSaving] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const calendarDays = useMemo((): DayCell[] => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPad = firstDay.getDay()
    const days: DayCell[] = []
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    // Padding from previous month
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      days.push({ date: d, dateStr: ds, isCurrentMonth: false, isToday: ds === todayStr, events: [] })
    }

    // Current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day)
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      days.push({ date: d, dateStr: ds, isCurrentMonth: true, isToday: ds === todayStr, events: [] })
    }

    // Padding to fill 6 rows
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      days.push({ date: d, dateStr: ds, isCurrentMonth: false, isToday: ds === todayStr, events: [] })
    }

    // Assign events to days
    for (const day of days) {
      day.events = events.filter(e => e.scheduled_date === day.dateStr)
    }

    return days
  }, [year, month, events])

  const loadData = useCallback(async () => {
    setLoading(true)
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startStr = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-01`
    const endStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

    const [schedRes, instRes, jobRes] = await Promise.all([
      supabase.from('installer_schedule').select('id, installer_id, project_id, assignment_id, scheduled_date, start_time, end_time, status, notes').eq('org_id', ORG_ID).gte('scheduled_date', startStr).lte('scheduled_date', endStr).order('start_time', { ascending: true }),
      supabase.from('profiles').select('id, name').eq('org_id', ORG_ID).eq('role', 'installer'),
      supabase.from('projects').select('id, title, vehicle_desc').eq('org_id', ORG_ID).eq('pipe_stage', 'install'),
    ])

    const allInstallers = instRes.data || []
    setInstallers(allInstallers)
    setJobs(jobRes.data || [])

    // Build color map
    const colorMap: Record<string, string> = {}
    allInstallers.forEach((inst, i) => { colorMap[inst.id] = INSTALLER_COLORS[i % INSTALLER_COLORS.length] })
    setInstallerColorMap(colorMap)

    // Join schedule with profiles & projects
    const rows = schedRes.data || []
    if (rows.length > 0) {
      const projIds = [...new Set(rows.map(r => r.project_id))]
      const instIds = [...new Set(rows.map(r => r.installer_id))]
      const [pRes, iRes] = await Promise.all([
        supabase.from('projects').select('id, title, vehicle_desc').in('id', projIds),
        supabase.from('profiles').select('id, name').in('id', instIds),
      ])
      const pMap = Object.fromEntries((pRes.data || []).map(p => [p.id, p]))
      const iMap = Object.fromEntries((iRes.data || []).map(i => [i.id, i]))
      setEvents(rows.map(r => ({ ...r, project: pMap[r.project_id], installer: iMap[r.installer_id] })))
    } else {
      setEvents([])
    }

    setLoading(false)
  }, [supabase, year, month])

  useEffect(() => { loadData() }, [loadData])

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToday = () => setCurrentDate(new Date())

  const selectedDayEvents = selectedDay ? events.filter(e => e.scheduled_date === selectedDay) : []

  const handleSchedule = async () => {
    if (!formJob || !formInstaller || !formDate) return
    setSaving(true)
    await supabase.from('installer_schedule').insert({
      org_id: ORG_ID,
      installer_id: formInstaller,
      project_id: formJob,
      scheduled_date: formDate,
      start_time: formStart,
      end_time: formEnd,
      status: 'scheduled',
    })
    setSaving(false)
    setShowModal(false)
    setFormJob('')
    setFormInstaller('')
    setFormDate('')
    setFormStart('08:00')
    setFormEnd('17:00')
    loadData()
  }

  const formatTime = (t: string | null) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${ampm}`
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/install" style={{ color: 'var(--text3)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text1)', margin: 0 }}>
              <Calendar size={22} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--cyan)' }} />
              Install Schedule
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: 13, margin: '2px 0 0' }}>Calendar view of all installer schedules</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: '8px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Schedule Job
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDay ? '1fr 320px' : '1fr', gap: 20 }}>
        {/* Calendar */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button onClick={prevMonth} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: 6, cursor: 'pointer', color: 'var(--text1)', display: 'flex' }}>
              <ChevronLeft size={18} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text1)', margin: 0 }}>
                {monthNames[month]} {year}
              </h2>
              <button onClick={goToday} style={{ padding: '4px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', color: 'var(--text2)', fontSize: 11, fontWeight: 600 }}>
                Today
              </button>
            </div>
            <button onClick={nextMonth} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: 6, cursor: 'pointer', color: 'var(--text1)', display: 'flex' }}>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
            {daysOfWeek.map(d => (
              <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
            {calendarDays.map((day, i) => (
              <div key={i} onClick={() => setSelectedDay(day.dateStr)} style={{
                minHeight: 80,
                padding: 6,
                background: day.isToday ? 'rgba(79,127,255,0.08)' : selectedDay === day.dateStr ? 'rgba(79,127,255,0.05)' : 'transparent',
                border: day.isToday ? '1px solid var(--accent)' : selectedDay === day.dateStr ? '1px solid var(--border)' : '1px solid transparent',
                borderRadius: 6,
                cursor: 'pointer',
                opacity: day.isCurrentMonth ? 1 : 0.35,
                transition: 'background 0.1s',
              }}>
                <div style={{ fontSize: 12, fontWeight: day.isToday ? 700 : 400, color: day.isToday ? 'var(--accent)' : 'var(--text2)', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                  {day.date.getDate()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {day.events.slice(0, 3).map(evt => (
                    <div key={evt.id} style={{
                      background: installerColorMap[evt.installer_id] || 'var(--accent)',
                      borderRadius: 3,
                      padding: '2px 5px',
                      fontSize: 10,
                      color: '#fff',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {evt.installer?.name?.split(' ')[0] || 'Inst'}
                    </div>
                  ))}
                  {day.events.length > 3 && (
                    <div style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'center' }}>+{day.events.length - 3} more</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Installer Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            {installers.map(inst => (
              <div key={inst.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: installerColorMap[inst.id] || 'var(--accent)' }} />
                {inst.name}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel: day detail */}
        {selectedDay && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 17, fontWeight: 600, color: 'var(--text1)', margin: 0 }}>
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </h3>
              <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            {selectedDayEvents.length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 20 }}>No events scheduled</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedDayEvents.map(evt => (
                  <div key={evt.id} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px', borderLeft: `3px solid ${installerColorMap[evt.installer_id] || 'var(--accent)'}` }}>
                    <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 13 }}>{evt.project?.title || 'Unknown Job'}</div>
                    <div style={{ color: 'var(--text2)', fontSize: 11, marginTop: 2 }}>{evt.project?.vehicle_desc || ''}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text2)' }}>
                        <User size={11} /> {evt.installer?.name || 'Unknown'}
                      </div>
                      {(evt.start_time || evt.end_time) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                          <Clock size={11} /> {formatTime(evt.start_time)} - {formatTime(evt.end_time)}
                        </div>
                      )}
                    </div>
                    {evt.notes && <div style={{ color: 'var(--text3)', fontSize: 11, marginTop: 6, fontStyle: 'italic' }}>{evt.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, width: 440, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text1)', margin: 0 }}>Schedule Job</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Job</label>
                <select value={formJob} onChange={e => setFormJob(e.target.value)} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text1)', fontSize: 13 }}>
                  <option value="">Select job...</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Installer</label>
                <select value={formInstaller} onChange={e => setFormInstaller(e.target.value)} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text1)', fontSize: 13 }}>
                  <option value="">Select installer...</option>
                  {installers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Date</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Start Time</label>
                  <input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 4 }}>End Time</label>
                  <input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 20px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleSchedule} disabled={saving || !formJob || !formInstaller || !formDate} style={{ padding: '8px 20px', background: (!formJob || !formInstaller || !formDate) ? 'var(--surface2)' : 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
