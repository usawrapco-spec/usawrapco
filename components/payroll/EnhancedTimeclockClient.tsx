'use client'
import { ORG_ID } from '@/lib/org'


import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Clock, Play, Square, Coffee, MapPin, AlertTriangle,
  ChevronRight, Calendar, Briefcase, StickyNote, Send,
  CheckCircle2, Timer, Sun, Moon, Loader2, ArrowRightLeft,
  PalmtreeIcon, Thermometer, Umbrella, Plus, X
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface TimeClockEntry {
  id: string
  user_id: string
  org_id: string
  job_id: string | null
  clock_in: string
  clock_out: string | null
  duration_minutes: number | null
  entry_type: string
  project_notes: string | null
  ai_summary: string | null
  location_lat: number | null
  location_lng: number | null
  location_name: string | null
  approved_by: string | null
  approved_at: string | null
  status: string
  created_at: string
  updated_at: string
}

interface ScheduledJob {
  id: string
  title: string
  vehicle_desc: string | null
  customer_name?: string
}

interface TimeOffRequest {
  id: string
  type: string
  start_date: string
  end_date: string
  hours: number
  reason: string | null
  status: string
  created_at: string
}

interface Props {
  profile: Profile
  todayEntries: any[]
  weekEntries: any[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function calcElapsedSeconds(start: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 1000))
}

function formatElapsed(totalSeconds: number): { hours: string; minutes: string; seconds: string } {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return {
    hours: h.toString().padStart(2, '0'),
    minutes: m.toString().padStart(2, '0'),
    seconds: s.toString().padStart(2, '0'),
  }
}

const HOURLY_RATE = 20

type TabId = 'clock' | 'timesheet' | 'time-off'

export default function EnhancedTimeclockClient({ profile, todayEntries, weekEntries }: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState<TabId>('clock')
  const [entries, setEntries] = useState<TimeClockEntry[]>([])
  const [legacyEntries] = useState(todayEntries)
  const [weekData] = useState(weekEntries)
  const [now, setNow] = useState(new Date())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Clock-in state
  const [selectedJob, setSelectedJob] = useState<string>('')
  const [startNote, setStartNote] = useState('')
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([])

  // Clock-out state
  const [showClockOutModal, setShowClockOutModal] = useState(false)
  const [clockOutNotes, setClockOutNotes] = useState('')
  const [generatingAI, setGeneratingAI] = useState(false)

  // Switch job state
  const [showSwitchJob, setShowSwitchJob] = useState(false)
  const [switchJobId, setSwitchJobId] = useState('')

  // Add note state
  const [showAddNote, setShowAddNote] = useState(false)
  const [noteText, setNoteText] = useState('')

  // Time Off state
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([])
  const [showTimeOffForm, setShowTimeOffForm] = useState(false)
  const [timeOffType, setTimeOffType] = useState('pto')
  const [timeOffStart, setTimeOffStart] = useState('')
  const [timeOffEnd, setTimeOffEnd] = useState('')
  const [timeOffHours, setTimeOffHours] = useState('')
  const [timeOffNotes, setTimeOffNotes] = useState('')
  const [showTimeOffNotes, setShowTimeOffNotes] = useState(false)
  const [ptoBalance, setPtoBalance] = useState(0)
  const [sickBalance, setSickBalance] = useState(0)

  // Location
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Timer tick
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Load data
  useEffect(() => {
    loadTimeClockEntries()
    loadScheduledJobs()
    loadTimeOffRequests()
    loadPaySettings()
  }, [])

  // Clear success after 3s
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000)
      return () => clearTimeout(t)
    }
  }, [success])

  const loadTimeClockEntries = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('time_clock_entries')
        .select('*')
        .eq('user_id', profile.id)
        .gte('clock_in', today + 'T00:00:00')
        .order('clock_in', { ascending: false })
      if (data) setEntries(data)
    } catch {
      // Fallback: use legacy time_entries if new table doesn't exist yet
    }
  }

  const loadScheduledJobs = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('id, title, vehicle_desc')
        .or(`installer_id.eq.${profile.id},agent_id.eq.${profile.id}`)
        .in('pipe_stage', ['production', 'install'])
        .order('updated_at', { ascending: false })
        .limit(20)
      if (data) setScheduledJobs(data)
    } catch {}
  }

  const loadTimeOffRequests = async () => {
    try {
      const { data } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) setTimeOffRequests(data)
    } catch {}
  }

  const loadPaySettings = async () => {
    try {
      const { data } = await supabase
        .from('employee_pay_settings')
        .select('pto_balance, sick_balance')
        .eq('user_id', profile.id)
        .single()
      if (data) {
        setPtoBalance(data.pto_balance || 0)
        setSickBalance(data.sick_balance || 0)
      }
    } catch {}
  }

  // Active entry from new table
  const activeEntry = entries.find(e => !e.clock_out && e.status === 'active')
  // Also check legacy
  const legacyActive = legacyEntries.find((e: any) => !e.clock_out)
  const isClockedIn = !!activeEntry || !!legacyActive
  const currentActive = activeEntry || (legacyActive ? {
    id: legacyActive.id,
    clock_in: legacyActive.clock_in,
    clock_out: null,
    job_id: null,
    project_notes: legacyActive.notes,
    status: 'active',
  } as any : null)

  const elapsedSeconds = currentActive ? calcElapsedSeconds(currentActive.clock_in) : 0
  const elapsed = formatElapsed(elapsedSeconds)

  // Today's total hours
  const todayHours = entries.reduce((sum, e) => {
    if (!e.clock_out) {
      return sum + (elapsedSeconds / 3600)
    }
    return sum + ((e.duration_minutes || 0) / 60)
  }, 0) + legacyEntries.reduce((s: number, e: any) => s + (e.total_hours || 0), 0)

  // Week totals
  const weekTotal = weekData.reduce((s: number, e: any) => s + (e.total_hours || 0), 0)
  const weekRegular = Math.min(weekTotal, 40)
  const weekOvertime = Math.max(0, weekTotal - 40)

  // Capture location
  const captureLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // silent fail
      )
    }
  }, [])

  // ─── Clock In ──────────────────────────────────────────────────────────────
  const clockIn = async () => {
    setSaving(true)
    setError('')
    captureLocation()
    try {
      const { data, error: err } = await supabase
        .from('time_clock_entries')
        .insert({
          user_id: profile.id,
          org_id: profile.org_id || ORG_ID,
          job_id: selectedJob || null,
          clock_in: new Date().toISOString(),
          entry_type: 'regular',
          project_notes: startNote || null,
          location_lat: location?.lat || null,
          location_lng: location?.lng || null,
          status: 'active',
        })
        .select()
        .single()
      if (err) throw err
      setEntries(prev => [data as TimeClockEntry, ...prev])
      setStartNote('')
      setSuccess('Clocked in successfully!')
      // Award XP for clock-in (fire-and-forget)
      fetch('/api/xp/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clock_in', sourceType: 'timeclock', sourceId: (data as { id: string }).id }),
      }).catch(() => {})
    } catch (e: any) {
      setError(e.message || 'Failed to clock in')
    } finally {
      setSaving(false)
    }
  }

  // ─── Clock Out (show modal) ─────────────────────────────────────────────────
  const initiateClockOut = () => {
    setShowClockOutModal(true)
    setClockOutNotes('')
  }

  const confirmClockOut = async () => {
    if (!currentActive) return
    if (!clockOutNotes.trim()) {
      setError('Please describe what you worked on')
      return
    }
    setSaving(true)
    setError('')
    try {
      const clockOutTime = new Date().toISOString()
      const diffMs = new Date(clockOutTime).getTime() - new Date(currentActive.clock_in).getTime()
      const durationMinutes = Math.round(diffMs / 60000)

      const { data, error: err } = await supabase
        .from('time_clock_entries')
        .update({
          clock_out: clockOutTime,
          duration_minutes: durationMinutes,
          project_notes: clockOutNotes.trim(),
          status: 'pending',
        })
        .eq('id', currentActive.id)
        .select()
        .single()
      if (err) throw err
      setEntries(prev => prev.map(e => e.id === currentActive.id ? data as TimeClockEntry : e))
      setShowClockOutModal(false)

      // Generate AI summary in background
      generateAISummary(data as TimeClockEntry)

      const hrs = Math.floor(durationMinutes / 60)
      const mins = durationMinutes % 60
      const jobName = scheduledJobs.find(j => j.id === currentActive.job_id)?.title || 'Shop/Admin'
      setSuccess(`Great work! You logged ${hrs}h ${mins}m on ${jobName}`)
    } catch (e: any) {
      setError(e.message || 'Failed to clock out')
    } finally {
      setSaving(false)
    }
  }

  // ─── AI Summary ─────────────────────────────────────────────────────────────
  const generateAISummary = async (entry: TimeClockEntry) => {
    try {
      const res = await fetch('/api/ai/work-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: entry.id,
          notes: entry.project_notes,
          jobId: entry.job_id,
          durationMinutes: entry.duration_minutes,
        }),
      })
      if (res.ok) {
        const { summary } = await res.json()
        await supabase
          .from('time_clock_entries')
          .update({ ai_summary: summary })
          .eq('id', entry.id)
      }
    } catch {} // non-blocking
  }

  // ─── Switch Job ─────────────────────────────────────────────────────────────
  const switchJob = async () => {
    if (!currentActive || !switchJobId) return
    setSaving(true)
    try {
      await supabase
        .from('time_clock_entries')
        .update({ job_id: switchJobId })
        .eq('id', currentActive.id)
      setEntries(prev => prev.map(e =>
        e.id === currentActive.id ? { ...e, job_id: switchJobId } : e
      ))
      setShowSwitchJob(false)
      setSwitchJobId('')
      setSuccess('Job switched!')
    } catch {} finally {
      setSaving(false)
    }
  }

  // ─── Add Note ───────────────────────────────────────────────────────────────
  const addNote = async () => {
    if (!currentActive || !noteText.trim()) return
    setSaving(true)
    try {
      const existing = currentActive.project_notes || ''
      const timestamp = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      const updated = existing ? `${existing}\n[${timestamp}] ${noteText.trim()}` : `[${timestamp}] ${noteText.trim()}`
      await supabase
        .from('time_clock_entries')
        .update({ project_notes: updated })
        .eq('id', currentActive.id)
      setEntries(prev => prev.map(e =>
        e.id === currentActive.id ? { ...e, project_notes: updated } : e
      ))
      setNoteText('')
      setShowAddNote(false)
    } catch {} finally {
      setSaving(false)
    }
  }

  // ─── Time Off Request ──────────────────────────────────────────────────────
  const submitTimeOff = async () => {
    if (!timeOffStart || !timeOffEnd || !timeOffHours) {
      setError('Please fill in all fields')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('time_off_requests')
        .insert({
          org_id: profile.org_id || ORG_ID,
          user_id: profile.id,
          type: timeOffType,
          start_date: timeOffStart,
          end_date: timeOffEnd,
          hours: parseFloat(timeOffHours),
          reason: timeOffNotes || null,
        })
        .select()
        .single()
      if (err) throw err
      setTimeOffRequests(prev => [data as TimeOffRequest, ...prev])
      setShowTimeOffForm(false)
      setTimeOffStart('')
      setTimeOffEnd('')
      setTimeOffHours('')
      setTimeOffNotes('')
      setSuccess('Time off request submitted!')
    } catch (e: any) {
      setError(e.message || 'Failed to submit request')
    } finally {
      setSaving(false)
    }
  }

  // Week days for timesheet
  const monday = new Date(now)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const dayEntries = weekData.filter((e: any) => e.clock_in?.startsWith(dateStr))
    const totalH = dayEntries.reduce((s: number, e: any) => s + (e.total_hours || 0), 0)
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
      date: dateStr,
      isToday: dateStr === now.toISOString().split('T')[0],
      totalH,
      entries: dayEntries,
    }
  })

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'clock', label: 'Clock', icon: Clock },
    { id: 'timesheet', label: 'Timesheet', icon: Calendar },
    { id: 'time-off', label: 'Time Off', icon: Umbrella },
  ]

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <h1 style={{
        fontSize: 22, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
        color: 'var(--text1)', marginBottom: 16, textAlign: 'center',
      }}>
        Time Clock
      </h1>

      {/* Alerts */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)',
          borderRadius: 8, marginBottom: 12, fontSize: 13, color: 'var(--red)',
        }}>
          <AlertTriangle size={14} /> {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}
      {success && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.3)',
          borderRadius: 8, marginBottom: 12, fontSize: 13, color: 'var(--green)',
        }}>
          <CheckCircle2 size={14} /> {success}
        </div>
      )}

      {/* ── Tab Bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: tab === t.id ? 'var(--accent)' : 'var(--surface)',
              color: tab === t.id ? '#fff' : 'var(--text2)',
              border: tab === t.id ? 'none' : '1px solid var(--border)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
           CLOCK TAB
         ══════════════════════════════════════════════════════ */}
      {tab === 'clock' && (
        <>
          {/* Big Clock Display */}
          <div className="card" style={{ marginBottom: 16, padding: '24px 20px', textAlign: 'center' }}>
            <div style={{
              fontSize: 40, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--text1)', letterSpacing: 2, marginBottom: 4,
            }}>
              {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          {/* Clocked In / Out State */}
          {!isClockedIn ? (
            <div className="card" style={{ marginBottom: 16, padding: '20px' }}>
              {/* Job Selector */}
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                What are you working on?
              </label>
              <select
                value={selectedJob}
                onChange={e => setSelectedJob(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text1)', fontSize: 14, marginBottom: 12,
                  outline: 'none',
                }}
              >
                <option value="">Shop / Admin</option>
                {scheduledJobs.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.title} {j.vehicle_desc ? `— ${j.vehicle_desc}` : ''}
                  </option>
                ))}
              </select>

              {/* Quick Note */}
              <input
                value={startNote}
                onChange={e => setStartNote(e.target.value)}
                placeholder="Starting on... (optional)"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text1)', fontSize: 13, marginBottom: 16,
                  outline: 'none',
                }}
              />

              {/* CLOCK IN Button */}
              <button
                onClick={clockIn}
                disabled={saving}
                style={{
                  width: '100%', padding: '16px 20px', borderRadius: 12,
                  background: 'var(--green)', color: '#fff',
                  fontSize: 18, fontWeight: 900, border: 'none', cursor: 'pointer',
                  fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: 1,
                  opacity: saving ? 0.6 : 1,
                  boxShadow: '0 0 20px rgba(34,192,122,0.3)',
                  animation: 'pulse 2s infinite',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}
              >
                <Play size={20} /> CLOCK IN
              </button>
              <style>{`@keyframes pulse { 0%,100% { box-shadow: 0 0 20px rgba(34,192,122,0.3); } 50% { box-shadow: 0 0 30px rgba(34,192,122,0.5); } }`}</style>
            </div>
          ) : (
            <div className="card" style={{ marginBottom: 16, padding: '20px' }}>
              {/* Running Timer */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  <Timer size={12} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
                  Clocked In
                </div>
                <div style={{
                  fontSize: 48, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--green)', letterSpacing: 4,
                }}>
                  {elapsed.hours}:{elapsed.minutes}:{elapsed.seconds}
                </div>
                {currentActive?.job_id && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8,
                    padding: '4px 12px', borderRadius: 20, background: 'rgba(79,127,255,0.1)',
                    border: '1px solid rgba(79,127,255,0.3)', fontSize: 12, fontWeight: 600,
                    color: 'var(--accent)',
                  }}>
                    <Briefcase size={12} />
                    {scheduledJobs.find(j => j.id === currentActive.job_id)?.title || 'Job'}
                  </div>
                )}
              </div>

              {/* CLOCK OUT Button */}
              <button
                onClick={initiateClockOut}
                disabled={saving}
                style={{
                  width: '100%', padding: '16px 20px', borderRadius: 12,
                  background: 'var(--red)', color: '#fff',
                  fontSize: 18, fontWeight: 900, border: 'none', cursor: 'pointer',
                  fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: 1,
                  opacity: saving ? 0.6 : 1, marginBottom: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}
              >
                <Square size={18} /> CLOCK OUT
              </button>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowSwitchJob(true)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '10px', borderRadius: 8,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    color: 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <ArrowRightLeft size={13} /> Switch Job
                </button>
                <button
                  onClick={() => setShowAddNote(true)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '10px', borderRadius: 8,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    color: 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <StickyNote size={13} /> Add Note
                </button>
              </div>
            </div>
          )}

          {/* ── Daily Summary ──────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', margin: 0 }}>Today&apos;s Entries</h3>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)' }}>
                {todayHours.toFixed(1)}h
              </div>
            </div>

            {entries.length === 0 && legacyEntries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)', fontSize: 13 }}>
                No entries today
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {entries.map(entry => (
                  <div key={entry.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8, background: 'var(--surface2)',
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: entry.clock_out ? 'var(--text3)' : 'var(--green)',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                        {fmtTime(entry.clock_in)} — {entry.clock_out ? fmtTime(entry.clock_out) : 'In Progress'}
                      </div>
                      {entry.project_notes && (
                        <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                          {entry.project_notes.split('\n')[0]}
                        </div>
                      )}
                    </div>
                    <div style={{
                      fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                      color: entry.clock_out ? 'var(--text1)' : 'var(--green)',
                    }}>
                      {entry.duration_minutes ? fmtDuration(entry.duration_minutes) : formatElapsed(calcElapsedSeconds(entry.clock_in)).hours + ':' + formatElapsed(calcElapsedSeconds(entry.clock_in)).minutes}
                    </div>
                  </div>
                ))}
                {/* Legacy entries */}
                {legacyEntries.map((entry: any) => (
                  <div key={entry.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8, background: 'var(--surface2)',
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: entry.clock_out ? 'var(--text3)' : 'var(--green)',
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                        {fmtTime(entry.clock_in)} — {entry.clock_out ? fmtTime(entry.clock_out) : 'In Progress'}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)' }}>
                      {entry.total_hours ? `${entry.total_hours.toFixed(1)}h` : '...'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Week totals bar */}
            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase' }}>Week Total</div>
                <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)' }}>
                  {weekTotal.toFixed(1)}h
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase' }}>Est. Pay</div>
                <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--green)' }}>
                  ${(weekRegular * HOURLY_RATE + weekOvertime * HOURLY_RATE * 1.5).toFixed(0)}
                </div>
              </div>
              {weekOvertime > 0 && (
                <div style={{
                  padding: '3px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.3)', fontSize: 11, fontWeight: 700,
                  color: 'var(--amber)',
                }}>
                  OT: {weekOvertime.toFixed(1)}h
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════
           TIMESHEET TAB
         ══════════════════════════════════════════════════════ */}
      {tab === 'timesheet' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>
            Weekly Timesheet
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Day', 'Hours', 'Reg', 'OT'].map(h => (
                    <th key={h} style={{
                      padding: '7px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700,
                      color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekDays.map(({ label, date, isToday, totalH }) => {
                  const regH = Math.min(totalH, 8)
                  const otH = Math.max(0, totalH - 8)
                  return (
                    <tr key={date} style={{ background: isToday ? 'rgba(79,127,255,0.05)' : 'transparent' }}>
                      <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--accent)' : 'var(--text2)', borderBottom: '1px solid var(--border)' }}>
                        {label}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 600, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace', borderBottom: '1px solid var(--border)' }}>
                        {totalH > 0 ? `${totalH.toFixed(2)}h` : '--'}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', borderBottom: '1px solid var(--border)' }}>
                        {regH > 0 ? `${regH.toFixed(1)}` : '--'}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 12, color: otH > 0 ? 'var(--amber)' : 'var(--text3)', fontWeight: otH > 0 ? 700 : 400, fontFamily: 'JetBrains Mono, monospace', borderBottom: '1px solid var(--border)' }}>
                        {otH > 0 ? `${otH.toFixed(1)}` : '--'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--surface2)' }}>
                  <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>Total</td>
                  <td style={{ padding: '8px 10px', fontSize: 14, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{weekTotal.toFixed(2)}h</td>
                  <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 700, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>{weekRegular.toFixed(1)}</td>
                  <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 700, color: weekOvertime > 0 ? 'var(--amber)' : 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{weekOvertime.toFixed(1)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pay Summary */}
          <div style={{
            marginTop: 16, padding: '14px 16px', borderRadius: 10,
            background: 'var(--surface2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase' }}>Regular</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>
                ${(weekRegular * HOURLY_RATE).toFixed(2)}
              </div>
            </div>
            {weekOvertime > 0 && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 700, textTransform: 'uppercase' }}>OT (1.5x)</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--amber)', fontFamily: 'JetBrains Mono, monospace' }}>
                  ${(weekOvertime * HOURLY_RATE * 1.5).toFixed(2)}
                </div>
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase' }}>Est. Pay</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
                ${(weekRegular * HOURLY_RATE + weekOvertime * HOURLY_RATE * 1.5).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
           TIME OFF TAB
         ══════════════════════════════════════════════════════ */}
      {tab === 'time-off' && (
        <>
          {/* Balances */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div className="card" style={{ flex: 1, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>PTO Balance</div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>
                {ptoBalance.toFixed(1)}h
              </div>
            </div>
            <div className="card" style={{ flex: 1, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Sick Balance</div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan)' }}>
                {sickBalance.toFixed(1)}h
              </div>
            </div>
          </div>

          {!showTimeOffForm ? (
            <button
              onClick={() => setShowTimeOffForm(true)}
              style={{
                width: '100%', padding: '12px', borderRadius: 10,
                background: 'var(--accent)', color: '#fff',
                fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
                marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Plus size={16} /> Request Time Off
            </button>
          ) : (
            <div className="card" style={{ marginBottom: 16, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', margin: 0 }}>Request Time Off</h3>
                <button onClick={() => setShowTimeOffForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Type</label>
              <select
                value={timeOffType}
                onChange={e => setTimeOffType(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text1)', fontSize: 13, marginBottom: 10, outline: 'none',
                }}
              >
                <option value="pto">PTO (Paid Time Off)</option>
                <option value="sick">Sick Leave</option>
                <option value="holiday">Holiday</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Start</label>
                  <input type="date" value={timeOffStart} onChange={e => setTimeOffStart(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text1)', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>End</label>
                  <input type="date" value={timeOffEnd} onChange={e => setTimeOffEnd(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text1)', fontSize: 13, outline: 'none' }}
                  />
                </div>
              </div>

              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Hours</label>
              <input type="number" value={timeOffHours} onChange={e => setTimeOffHours(e.target.value)}
                placeholder="8"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text1)', fontSize: 13, marginBottom: 10, outline: 'none' }}
              />

              {!showTimeOffNotes ? (
                <button onClick={() => setShowTimeOffNotes(true)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0', display: 'block', marginBottom: 12 }}>
                  + Add Notes
                </button>
              ) : (
                <>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Notes (optional)</label>
                  <textarea value={timeOffNotes} onChange={e => setTimeOffNotes(e.target.value)}
                    placeholder="Reason for time off..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text1)', fontSize: 13, marginBottom: 12, outline: 'none', resize: 'none', minHeight: 60, fontFamily: 'inherit' }}
                  />
                </>
              )}

              <button onClick={submitTimeOff} disabled={saving}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10,
                  background: 'var(--accent)', color: '#fff',
                  fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          )}

          {/* Time Off History */}
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>Request History</h3>
            {timeOffRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)', fontSize: 13 }}>
                No time off requests
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {timeOffRequests.map(req => (
                  <div key={req.id} style={{
                    padding: '10px 12px', borderRadius: 8, background: 'var(--surface2)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', textTransform: 'capitalize' }}>
                        {req.type?.replace('_', ' ')} — {req.hours}h
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        {new Date(req.start_date).toLocaleDateString()} — {new Date(req.end_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      textTransform: 'capitalize',
                      background: req.status === 'approved' ? 'rgba(34,192,122,0.15)' :
                        req.status === 'denied' ? 'rgba(242,90,90,0.15)' : 'rgba(245,158,11,0.15)',
                      color: req.status === 'approved' ? 'var(--green)' :
                        req.status === 'denied' ? 'var(--red)' : 'var(--amber)',
                    }}>
                      {req.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════
           CLOCK OUT MODAL
         ══════════════════════════════════════════════════════ */}
      {showClockOutModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 16, padding: 24,
            width: '100%', maxWidth: 400, border: '1px solid var(--border)',
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', marginBottom: 4 }}>
              Clock Out
            </h3>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>
              Total time: <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)' }}>
                {elapsed.hours}:{elapsed.minutes}
              </span>
            </div>
            {currentActive?.job_id && (
              <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 12 }}>
                Job: {scheduledJobs.find(j => j.id === currentActive.job_id)?.title || 'Unknown'}
              </div>
            )}

            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
              What did you work on? <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <textarea
              value={clockOutNotes}
              onChange={e => setClockOutNotes(e.target.value)}
              placeholder="Describe what you did..."
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text1)', fontSize: 14, outline: 'none', resize: 'none',
                minHeight: 100, fontFamily: 'inherit', marginBottom: 16,
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowClockOutModal(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text2)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmClockOut}
                disabled={saving || !clockOutNotes.trim()}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  background: 'var(--red)', color: '#fff',
                  fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
                  opacity: saving || !clockOutNotes.trim() ? 0.5 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Submit & Clock Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Switch Job Modal ─────────────────────────────────── */}
      {showSwitchJob && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 16, padding: 24,
            width: '100%', maxWidth: 400, border: '1px solid var(--border)',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>Switch Job</h3>
            <select
              value={switchJobId}
              onChange={e => setSwitchJobId(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text1)', fontSize: 14, marginBottom: 16, outline: 'none',
              }}
            >
              <option value="">Select a job...</option>
              <option value="">Shop / Admin</option>
              {scheduledJobs.map(j => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowSwitchJob(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button onClick={switchJob} disabled={saving}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Note Modal ───────────────────────────────────── */}
      {showAddNote && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 16, padding: 24,
            width: '100%', maxWidth: 400, border: '1px solid var(--border)',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>Add Note</h3>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="What are you working on now?"
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text1)', fontSize: 13, outline: 'none', resize: 'none',
                minHeight: 80, fontFamily: 'inherit', marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAddNote(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button onClick={addNote} disabled={saving || !noteText.trim()}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', opacity: !noteText.trim() ? 0.5 : 1 }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
