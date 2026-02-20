'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Printer, Calendar, Clock, ChevronLeft, ChevronRight, Plus, CheckCircle } from 'lucide-react'
import type { Profile } from '@/types'
import Link from 'next/link'
import { useToast } from '@/components/shared/Toast'

interface Job {
  id: string
  title: string
  vehicle_desc: string
  form_data: Record<string, unknown>
  fin_data: Record<string, unknown> | null
  install_date: string | null
  pipe_stage: string
  status: string
  revenue: number | null
}

interface PrintJob {
  id: string
  project_id: string
  project_title: string
  vehicle_desc: string
  scheduled_date: string
  start_hour: number   // 0–23
  print_hours: number
  dry_hours: number
  laminate_hours: number
  sqft: number
  status: 'queued' | 'printing' | 'drying' | 'laminating' | 'done' | 'failed'
  notes: string
}

interface Props {
  profile: Profile
  jobs: Job[]
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 7) // 7am–5pm
const STATUS_COLOR: Record<string, string> = {
  queued:     '#4f7fff',
  printing:   '#22d3ee',
  drying:     '#f59e0b',
  laminating: '#8b5cf6',
  done:       '#22c07a',
  failed:     '#f25a5a',
}
const STATUS_LABEL: Record<string, string> = {
  queued: 'Queued', printing: 'Printing', drying: 'Drying',
  laminating: 'Laminating', done: 'Done', failed: 'Failed',
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function PrintScheduleClient({ profile, jobs }: Props) {
  const supabase = createClient()
  const { xpToast } = useToast()
  const [viewDate, setViewDate]     = useState(todayStr())
  const [printJobs, setPrintJobs]   = useState<PrintJob[]>([])
  const [showSchedule, setShowSchedule] = useState(false)
  const [form, setForm]             = useState({
    project_id: '', scheduled_date: todayStr(), start_hour: 8,
    print_hours: 2.5, dry_hours: 0.5, laminate_hours: 0.75, notes: '',
  })
  const [saving, setSaving]         = useState(false)
  const [view, setView]             = useState<'day' | 'week'>('day')

  // Dates for week view
  const weekDates = useMemo(() => {
    const start = new Date(viewDate + 'T12:00:00')
    start.setDate(start.getDate() - start.getDay()) // Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d.toISOString().split('T')[0]
    })
  }, [viewDate])

  const visibleDates = view === 'day' ? [viewDate] : weekDates

  const jobsOnDate = (date: string) => printJobs.filter(j => j.scheduled_date === date)

  async function scheduleJob() {
    if (!form.project_id) return
    setSaving(true)
    const proj = jobs.find(j => j.id === form.project_id)
    const sqft = parseFloat((proj?.form_data?.sqft as string) || '0') || 0
    const newJob: PrintJob = {
      id:            Date.now().toString(),
      project_id:    form.project_id,
      project_title: proj?.title || 'Unknown',
      vehicle_desc:  proj?.vehicle_desc || '',
      scheduled_date: form.scheduled_date,
      start_hour:    form.start_hour,
      print_hours:   form.print_hours,
      dry_hours:     form.dry_hours,
      laminate_hours: form.laminate_hours,
      sqft,
      status:        'queued',
      notes:         form.notes,
    }

    // Try to save to DB (table may not exist yet — gracefully ignore)
    try {
      await supabase.from('print_jobs').insert({
        project_id:    form.project_id,
        org_id:        profile.org_id,
        scheduled_date: form.scheduled_date,
        scheduled_start_time: `${String(form.start_hour).padStart(2, '0')}:00:00`,
        estimated_print_minutes: Math.round(form.print_hours * 60),
        estimated_dry_minutes:   Math.round(form.dry_hours * 60),
        estimated_laminate_minutes: Math.round(form.laminate_hours * 60),
        sqft_printed:  sqft,
        status:        'queued',
        notes:         form.notes,
      })
    } catch {
      // Table may not exist in this DB setup — continue with local state
    }

    setPrintJobs(prev => [...prev, newJob])
    setShowSchedule(false)
    setSaving(false)
  }

  async function updateStatus(jobId: string, status: PrintJob['status']) {
    setPrintJobs(prev => prev.map(j => j.id === jobId ? { ...j, status } : j))
    // Award XP if completed
    if (status === 'done') {
      fetch('/api/xp/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'print_job_completed', sourceType: 'print_job', sourceId: jobId }),
      })
        .then(r => r.ok ? r.json() : null)
        .then((res: { amount?: number; leveledUp?: boolean; newLevel?: number } | null) => {
          if (res?.amount) xpToast(res.amount, 'Print job completed', res.leveledUp, res.newLevel)
        })
        .catch(() => {})
    }
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Link href="/production" style={{ color: 'var(--text3)', fontSize: 12, textDecoration: 'none' }}>Production</Link>
            <span style={{ color: 'var(--text3)', fontSize: 12 }}>/</span>
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>Print Schedule</span>
          </div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 900, color: 'var(--text1)' }}>
            Print Schedule
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>{jobs.length} jobs in queue</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {(['day', 'week'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: view === v ? 'var(--accent)' : 'transparent',
                color: view === v ? '#fff' : 'var(--text3)',
                textTransform: 'capitalize',
              }}>{v}</button>
            ))}
          </div>
          <button
            onClick={() => setShowSchedule(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            <Plus size={14} /> Schedule Print
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => setViewDate(d => addDays(d, view === 'day' ? -1 : -7))} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 7, background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text1)', minWidth: 180, textAlign: 'center' }}>
          {view === 'day' ? formatDate(viewDate) : `${formatDate(weekDates[0])} – ${formatDate(weekDates[6])}`}
        </div>
        <button onClick={() => setViewDate(d => addDays(d, view === 'day' ? 1 : 7))} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 7, background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>
          <ChevronRight size={16} />
        </button>
        <button onClick={() => setViewDate(todayStr())} style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 7, background: 'transparent', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Today
        </button>
      </div>

      {/* Schedule Grid */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Day headers (week view) */}
        {view === 'week' && (
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ padding: '10px 8px' }} />
            {weekDates.map(d => (
              <div key={d} onClick={() => { setView('day'); setViewDate(d) }} style={{
                padding: '10px 8px', textAlign: 'center', cursor: 'pointer',
                fontSize: 12, fontWeight: d === todayStr() ? 800 : 500,
                color: d === todayStr() ? 'var(--accent)' : 'var(--text2)',
                borderLeft: '1px solid var(--border)',
                background: d === todayStr() ? 'rgba(79,127,255,0.06)' : 'transparent',
              }}>
                {formatDate(d)}
              </div>
            ))}
          </div>
        )}

        {/* Time rows */}
        {HOURS.map(hour => (
          <div key={hour} style={{ display: 'grid', gridTemplateColumns: view === 'week' ? '60px repeat(7, 1fr)' : '60px 1fr', borderBottom: '1px solid var(--border)', minHeight: 60 }}>
            {/* Hour label */}
            <div style={{ padding: '8px', fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'right', paddingRight: 10, paddingTop: 10 }}>
              {hour % 12 || 12}{hour < 12 ? 'am' : 'pm'}
            </div>

            {/* Cells */}
            {visibleDates.map(date => {
              const cellJobs = jobsOnDate(date).filter(j =>
                hour >= j.start_hour && hour < j.start_hour + j.print_hours + j.dry_hours + j.laminate_hours
              )
              return (
                <div key={date} style={{ borderLeft: '1px solid var(--border)', padding: 4, position: 'relative', background: date === todayStr() ? 'rgba(79,127,255,0.03)' : 'transparent' }}>
                  {cellJobs.map(j => {
                    const phase = hour < j.start_hour + j.print_hours ? 'print'
                                : hour < j.start_hour + j.print_hours + j.dry_hours ? 'dry'
                                : 'laminate'
                    const phaseColor = phase === 'print' ? STATUS_COLOR.printing : phase === 'dry' ? STATUS_COLOR.drying : STATUS_COLOR.laminating
                    return (
                      <div key={j.id} style={{
                        padding: '4px 6px', borderRadius: 6, marginBottom: 2,
                        background: `${phaseColor}18`,
                        borderLeft: `3px solid ${phaseColor}`,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {j.project_title}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                          {phase === 'print' ? 'Printing' : phase === 'dry' ? 'Drying' : 'Laminating'} · {j.sqft.toFixed(0)} sqft
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Job Queue List */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 12 }}>
          Jobs in Production Queue
        </div>
        {jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text3)', fontSize: 13 }}>
            No jobs currently in production. Jobs will appear here when they advance to the Production stage.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {jobs.map(j => {
              const sqft = parseFloat((j.form_data?.sqft as string) || '0') || 0
              const estPrintHrs = sqft > 0 ? (sqft / 120).toFixed(1) : '—' // 120 sqft/hr estimate
              const printJob = printJobs.find(p => p.project_id === j.id)
              return (
                <div key={j.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{j.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{j.vehicle_desc || 'No vehicle'}</div>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, background: 'rgba(79,127,255,0.12)', color: 'var(--accent)', textTransform: 'capitalize' }}>
                      {j.pipe_stage}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                    <div style={{ background: 'var(--surface2)', borderRadius: 7, padding: '6px 8px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 1 }}>Est. Print Time</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: 'var(--cyan)' }}>{estPrintHrs}h</div>
                    </div>
                    <div style={{ background: 'var(--surface2)', borderRadius: 7, padding: '6px 8px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 1 }}>Install Date</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                        {j.install_date ? new Date(j.install_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </div>
                    </div>
                  </div>
                  {printJob ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                          Scheduled: {formatDate(printJob.scheduled_date)} @ {printJob.start_hour % 12 || 12}{printJob.start_hour < 12 ? 'am' : 'pm'}
                        </div>
                        <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, background: `${STATUS_COLOR[printJob.status]}18`, color: STATUS_COLOR[printJob.status] }}>
                          {STATUS_LABEL[printJob.status]}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(['queued', 'printing', 'drying', 'laminating', 'done'] as const).map(s => (
                          <button
                            key={s}
                            onClick={() => updateStatus(printJob.id, s)}
                            style={{
                              padding: '3px 8px', borderRadius: 5, border: 'none', cursor: 'pointer',
                              fontSize: 10, fontWeight: 600,
                              background: printJob.status === s ? `${STATUS_COLOR[s]}22` : 'var(--surface2)',
                              color: printJob.status === s ? STATUS_COLOR[s] : 'var(--text3)',
                            }}
                          >
                            {STATUS_LABEL[s]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setForm(f => ({ ...f, project_id: j.id, scheduled_date: j.install_date ? addDays(j.install_date, -2) : todayStr() })); setShowSchedule(true) }}
                      style={{ width: '100%', padding: '7px', border: '1px dashed var(--border)', borderRadius: 7, background: 'transparent', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <Calendar size={12} /> Schedule Print
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showSchedule && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 440, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Printer size={16} style={{ color: 'var(--accent)' }} /> Schedule Print Job
              </div>
              <button onClick={() => setShowSchedule(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>Job</label>
                <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} style={inp}>
                  <option value="">Select job...</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>Print Date</label>
                  <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Start Time</label>
                  <select value={form.start_hour} onChange={e => setForm(f => ({ ...f, start_hour: parseInt(e.target.value) }))} style={inp}>
                    {HOURS.map(h => <option key={h} value={h}>{h % 12 || 12}{h < 12 ? ':00 AM' : ':00 PM'}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={lbl}>Print (hrs)</label>
                  <input type="number" step="0.25" min="0.25" value={form.print_hours} onChange={e => setForm(f => ({ ...f, print_hours: parseFloat(e.target.value) || 0 }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Dry (hrs)</label>
                  <input type="number" step="0.25" min="0" value={form.dry_hours} onChange={e => setForm(f => ({ ...f, dry_hours: parseFloat(e.target.value) || 0 }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Laminate (hrs)</label>
                  <input type="number" step="0.25" min="0" value={form.laminate_hours} onChange={e => setForm(f => ({ ...f, laminate_hours: parseFloat(e.target.value) || 0 }))} style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Color flags, material roll, etc." style={inp} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowSchedule(false)} style={{ flex: 1, padding: 10, border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button onClick={scheduleJob} disabled={!form.project_id || saving} style={{ flex: 2, padding: 10, border: 'none', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  {saving ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text3)',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4,
}
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: 'var(--surface2)',
  border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
