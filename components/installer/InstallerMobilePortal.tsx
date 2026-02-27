'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ORG_ID } from '@/lib/org'
import {
  Home, Briefcase, Star, DollarSign, Clock, Package,
  Play, Square, Pause, Camera, Plus, X,
  MapPin, Calendar, ChevronRight, ChevronLeft,
  Hammer, CheckCircle2,
} from 'lucide-react'
import type { Profile } from '@/types'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Props {
  profile: Profile
  todayJobs: any[]
  upcomingJobs: any[]
  myJobs: any[]
  activeEntry: any | null
  availableJobs: any[]
  myBids: any[]
  weekEntries: any[]
  supplyRequests: any[]
}

type JobFilter = 'today' | 'week' | 'completed' | 'all'
type EarningsPeriod = 'week' | 'month' | 'all'

interface SupplyItem { name: string; qty: string; unit: string }
interface TimerState {
  jobId: string | null
  sessionId: string | null
  startMs: number | null
  elapsed: number
  paused: boolean
  pausedAt: number | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function fmt(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function fmtDuration(seconds: number) {
  if (!seconds) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtTime(ts: string | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function stageBadge(stage: string) {
  const map: Record<string, { label: string; color: string }> = {
    install:      { label: 'Install',     color: 'var(--cyan)' },
    prod_review:  { label: 'QC Review',   color: 'var(--amber)' },
    sales_close:  { label: 'Closing',     color: 'var(--purple)' },
    done:         { label: 'Done',        color: 'var(--green)' },
    production:   { label: 'Production',  color: 'var(--accent)' },
    sales_in:     { label: 'Sales',       color: 'var(--text2)' },
  }
  const s = map[stage] || { label: stage, color: 'var(--text2)' }
  return (
    <span style={{
      background: s.color + '22', color: s.color,
      fontSize: 11, fontWeight: 700, borderRadius: 6,
      padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>{s.label}</span>
  )
}

function urgencyColor(u: string) {
  if (u === 'emergency') return 'var(--red)'
  if (u === 'urgent') return 'var(--amber)'
  return 'var(--green)'
}

function supplyStatusColor(s: string) {
  if (s === 'delivered') return 'var(--green)'
  if (s === 'ordered') return 'var(--cyan)'
  if (s === 'cancelled') return 'var(--red)'
  return 'var(--amber)'
}

/* ------------------------------------------------------------------ */
/*  Mini job card — module-level so React identity is stable           */
/* ------------------------------------------------------------------ */

function MiniJobCard({ job, onTap }: { job: any; onTap: () => void }) {
  return (
    <div onClick={onTap} style={{
      background: 'var(--surface)', border: '1px solid #ffffff10', borderRadius: 12,
      padding: '14px 16px', marginBottom: 10,
      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)' }}>{job.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
          {job.vehicle_desc || job.form_data?.vehicle || '—'}
          {job.install_date && ` · ${fmtDate(job.install_date)}`}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {stageBadge(job.pipe_stage)}
        <ChevronRight size={16} style={{ color: 'var(--text2)' }} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab bar config — module-level (never changes)                      */
/* ------------------------------------------------------------------ */

type Tab = 'home' | 'jobs' | 'available' | 'earnings' | 'timeclock' | 'supplies'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'home',      label: 'Home',    icon: Home },
  { id: 'jobs',      label: 'My Jobs', icon: Briefcase },
  { id: 'available', label: 'Bid',     icon: Star },
  { id: 'earnings',  label: 'Pay',     icon: DollarSign },
  { id: 'timeclock', label: 'Clock',   icon: Clock },
  { id: 'supplies',  label: 'Supply',  icon: Package },
]

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function InstallerMobilePortal({
  profile,
  todayJobs,
  upcomingJobs,
  myJobs,
  activeEntry,
  availableJobs,
  myBids,
  weekEntries,
  supplyRequests: initialSupplyReqs,
}: Props) {
  const supabase = createClient()

  /* ---- Global state ---- */
  const [tab, setTab] = useState<Tab>('home')
  const [jobFilter, setJobFilter] = useState<JobFilter>('all')
  const [selectedJob, setSelectedJob] = useState<any | null>(null)
  const [earningsPeriod, setEarningsPeriod] = useState<EarningsPeriod>('week')
  const [supplyRequests, setSupplyRequests] = useState<any[]>(initialSupplyReqs)

  /* ---- Timer (job-specific) ---- */
  const [timer, setTimer] = useState<TimerState>({
    jobId: null, sessionId: null, startMs: null, elapsed: 0, paused: false, pausedAt: null,
  })
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  /* ---- Time clock ---- */
  const [clockEntry, setClockEntry] = useState<any | null>(activeEntry)
  const [clockElapsed, setClockElapsed] = useState(0)
  const clockRef = useRef<NodeJS.Timeout | null>(null)
  const [clockCategory, setClockCategory] = useState('install')
  const [clockJobId, setClockJobId] = useState('')
  const [clockLocation, setClockLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [todayClockEntries, setTodayClockEntries] = useState<any[]>(weekEntries)
  const [clockingIn, setClockingIn] = useState(false)

  /* ---- Photo upload ---- */
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoPhase, setPhotoPhase] = useState<'before' | 'during' | 'after'>('before')
  const [uploading, setUploading] = useState(false)
  const [photoMsg, setPhotoMsg] = useState('')

  /* ---- Notes ---- */
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  /* ---- Bid modal ---- */
  const [bidJob, setBidJob] = useState<any | null>(null)
  const [bidPrice, setBidPrice] = useState('')
  const [bidHours, setBidHours] = useState('')
  const [bidAvail, setBidAvail] = useState('')
  const [submittingBid, setSubmittingBid] = useState(false)
  const [bidMsg, setBidMsg] = useState('')
  const [approvalMsg, setApprovalMsg] = useState('')

  /* ---- Supply request form ---- */
  const [showSupplyForm, setShowSupplyForm] = useState(false)
  const [supplyProject, setSupplyProject] = useState('')
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([{ name: '', qty: '1', unit: 'ea' }])
  const [supplyUrgency, setSupplyUrgency] = useState<'normal' | 'urgent' | 'emergency'>('normal')
  const [supplyNeededBy, setSupplyNeededBy] = useState('')
  const [supplyNotes, setSupplyNotes] = useState('')
  const [submittingSupply, setSubmittingSupply] = useState(false)

  /* ---- Earnings ---- */
  const acceptedBids = myBids.filter(b => ['accepted', 'completed'].includes(b.status))

  /* ================================================================ */
  /*  Timer tick                                                        */
  /* ================================================================ */

  useEffect(() => {
    if (timer.startMs && !timer.paused) {
      timerRef.current = setInterval(() => {
        setTimer(prev => ({
          ...prev,
          elapsed: Math.floor((Date.now() - (prev.startMs || Date.now())) / 1000),
        }))
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timer.startMs, timer.paused])

  /* ================================================================ */
  /*  Clock elapsed tick                                               */
  /* ================================================================ */

  useEffect(() => {
    if (clockEntry?.clock_in) {
      const start = new Date(clockEntry.clock_in).getTime()
      clockRef.current = setInterval(() => {
        setClockElapsed(Math.floor((Date.now() - start) / 1000))
      }, 1000)
    }
    return () => { if (clockRef.current) clearInterval(clockRef.current) }
  }, [clockEntry?.clock_in])

  /* ================================================================ */
  /*  Job timer actions                                                */
  /* ================================================================ */

  const startJobTimer = async (job: any) => {
    const now = Date.now()
    const { data } = await supabase.from('install_sessions').insert({
      org_id: profile.org_id || ORG_ID,
      project_id: job.id,
      installer_id: profile.id,
      started_at: new Date(now).toISOString(),
    }).select().single()

    setTimer({ jobId: job.id, sessionId: data?.id || null, startMs: now, elapsed: 0, paused: false, pausedAt: null })
    setSelectedJob(job)
  }

  const pauseJobTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimer(prev => ({ ...prev, paused: true, pausedAt: Date.now() }))
  }

  const resumeJobTimer = () => {
    const adj = timer.pausedAt ? Date.now() - timer.pausedAt : 0
    setTimer(prev => ({ ...prev, paused: false, pausedAt: null, startMs: (prev.startMs || Date.now()) + adj }))
  }

  const stopJobTimer = async () => {
    if (timer.sessionId) {
      const sec = timer.elapsed
      await supabase.from('install_sessions').update({
        ended_at: new Date().toISOString(),
        duration_seconds: sec,
      }).eq('id', timer.sessionId)
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setTimer({ jobId: null, sessionId: null, startMs: null, elapsed: 0, paused: false, pausedAt: null })
  }

  /* ================================================================ */
  /*  Time clock actions                                               */
  /* ================================================================ */

  const captureLocation = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise(resolve => {
      if (!navigator.geolocation) { resolve(null); return }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 }
      )
    })

  const handleClockIn = async () => {
    setClockingIn(true)
    const loc = await captureLocation()
    setClockLocation(loc)

    const payload: any = {
      org_id: profile.org_id || ORG_ID,
      user_id: profile.id,
      clock_in: new Date().toISOString(),
      category: clockCategory,
      status: 'active',
    }
    if (clockJobId) payload.job_id = clockJobId
    if (loc) { payload.location_lat = loc.lat; payload.location_lng = loc.lng }

    const { data, error } = await supabase.from('time_clock_entries').insert(payload).select().single()
    if (!error && data) setClockEntry(data)
    setClockingIn(false)
  }

  const handleClockOut = async () => {
    if (!clockEntry) return
    setClockingIn(true)
    const sec = clockElapsed
    const { data, error } = await supabase.from('time_clock_entries').update({
      clock_out: new Date().toISOString(),
      duration_seconds: sec,
      status: 'completed',
    }).eq('id', clockEntry.id).select().single()

    if (!error && data) {
      setClockEntry(null)
      setClockElapsed(0)
      if (clockRef.current) clearInterval(clockRef.current)
      setTodayClockEntries(prev => [data, ...prev.filter(e => e.id !== data.id)])
    }
    setClockingIn(false)
  }

  /* ================================================================ */
  /*  Photo upload                                                     */
  /* ================================================================ */

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !selectedJob) return
    setUploading(true)
    const file = e.target.files[0]
    const ext = file.name.split('.').pop()
    const path = `${selectedJob.id}/${photoPhase}_${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage.from('project-files').upload(path, file, { contentType: file.type })
    if (!upErr) {
      const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path)
      await supabase.from('job_images').insert({
        org_id: profile.org_id || ORG_ID,
        project_id: selectedJob.id,
        user_id: profile.id,
        image_url: urlData.publicUrl,
        category: photoPhase,
        file_name: file.name,
        file_size: file.size,
      })
      setPhotoMsg('Photo uploaded')
      setTimeout(() => setPhotoMsg(''), 3000)
    } else {
      setPhotoMsg('Upload failed. Please try again.')
      setTimeout(() => setPhotoMsg(''), 4000)
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /* ================================================================ */
  /*  Add note                                                         */
  /* ================================================================ */

  const addNote = async () => {
    if (!noteText.trim() || !selectedJob) return
    setSavingNote(true)
    await supabase.from('job_comments').insert({
      org_id: profile.org_id || ORG_ID,
      project_id: selectedJob.id,
      user_id: profile.id,
      author_id: profile.id,
      body: noteText.trim(),
      channel: 'install',
    })
    setNoteText('')
    setSavingNote(false)
  }

  /* ================================================================ */
  /*  Send for approval                                                */
  /* ================================================================ */

  const sendForApproval = async (job: any) => {
    await supabase.from('projects').update({ pipe_stage: 'prod_review' }).eq('id', job.id)
    setApprovalMsg('Job sent for QC review.')
    setTimeout(() => { setApprovalMsg(''); setSelectedJob(null) }, 2000)
  }

  /* ================================================================ */
  /*  Submit bid                                                       */
  /* ================================================================ */

  const submitBid = async () => {
    if (!bidJob || !bidPrice) return
    setSubmittingBid(true)
    const { error } = await supabase.from('installer_bids').insert({
      org_id: profile.org_id || ORG_ID,
      project_id: bidJob.id,
      installer_id: profile.id,
      status: 'pending',
      pay_amount: parseFloat(bidPrice),
      hours_budget: bidHours ? parseFloat(bidHours) : null,
      bid_expires_at: bidAvail || null,
    })
    if (!error) {
      setBidMsg('Bid submitted!')
      setTimeout(() => { setBidJob(null); setBidMsg(''); setBidPrice(''); setBidHours(''); setBidAvail('') }, 2000)
    } else {
      setBidMsg('Error submitting bid.')
    }
    setSubmittingBid(false)
  }

  /* ================================================================ */
  /*  Submit supply request                                            */
  /* ================================================================ */

  const submitSupply = async () => {
    const validItems = supplyItems.filter(i => i.name.trim())
    if (!validItems.length) return
    setSubmittingSupply(true)
    const { data, error } = await supabase.from('supply_requests').insert({
      org_id: profile.org_id || ORG_ID,
      project_id: supplyProject || null,
      requested_by: profile.id,
      items: validItems,
      urgency: supplyUrgency,
      needed_by: supplyNeededBy || null,
      notes: supplyNotes || null,
    }).select().single()
    if (!error && data) {
      setSupplyRequests(prev => [data, ...prev])
      setShowSupplyForm(false)
      setSupplyItems([{ name: '', qty: '1', unit: 'ea' }])
      setSupplyUrgency('normal')
      setSupplyNeededBy('')
      setSupplyNotes('')
      setSupplyProject('')
    }
    setSubmittingSupply(false)
  }

  /* ================================================================ */
  /*  Filtered job list                                                */
  /* ================================================================ */

  const today = new Date().toISOString().split('T')[0]
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const filteredJobs = myJobs.filter(j => {
    if (jobFilter === 'today') return j.install_date === today
    if (jobFilter === 'week') return j.install_date >= today && j.install_date <= weekEnd
    if (jobFilter === 'completed') return j.pipe_stage === 'done'
    return true
  })

  /* ================================================================ */
  /*  Earnings calc                                                    */
  /* ================================================================ */

  const now = new Date()
  const _dow = now.getDay()
  const _diffMon = _dow === 0 ? -6 : 1 - _dow
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + _diffMon)
  weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const filteredEarnings = acceptedBids.filter(b => {
    const date = new Date(b.accepted_at || b.created_at)
    if (earningsPeriod === 'week') return date >= weekStart
    if (earningsPeriod === 'month') return date >= monthStart
    return true
  })

  const totalEarnings = filteredEarnings.reduce((s: number, b: any) => s + (b.pay_amount || 0), 0)

  /* ================================================================ */
  /*  Weekly hours                                                     */
  /* ================================================================ */

  const weeklySeconds = todayClockEntries
    .filter(e => new Date(e.clock_in) >= weekStart)
    .reduce((s: number, e: any) => s + (e.duration_seconds || 0), 0)

  // Today-only entries for the Time Clock tab display
  const todayEntryList = todayClockEntries.filter(e => e.clock_in?.startsWith(today))

  /* ================================================================ */
  /*  Shared styles                                                    */
  /* ================================================================ */

  const card: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid #ffffff10',
    borderRadius: 12,
    padding: '14px 16px',
    marginBottom: 10,
  }

  const bigBtn = (color: string): React.CSSProperties => ({
    width: '100%',
    padding: '16px 0',
    borderRadius: 12,
    border: 'none',
    background: color,
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.02em',
  })

  const sm: React.CSSProperties = { fontSize: 12, color: 'var(--text2)' }
  const label: React.CSSProperties = { fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }
  const input: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #ffffff15', background: 'var(--surface2)',
    color: 'var(--text1)', fontSize: 15, boxSizing: 'border-box',
  }

  /* ================================================================ */
  /*  Tab: HOME                                                        */
  /* ================================================================ */

  const renderHome = () => (
    <div style={{ padding: '0 16px 24px' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 20, marginTop: 4 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)' }}>
          {greet()}, {profile.name?.split(' ')[0] || 'Installer'}
        </div>
        <div style={{ ...sm, marginTop: 2 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Active clock-in banner */}
      {clockEntry && (
        <div style={{ background: '#22c07a22', border: '1px solid #22c07a55', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
            <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 14 }}>Clocked In</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color: 'var(--text1)' }}>
              {fmt(clockElapsed)}
            </span>
          </div>
          <button onClick={handleClockOut} disabled={clockingIn} style={bigBtn('var(--red)')}>
            Clock Out
          </button>
        </div>
      )}

      {/* Clock In button (when not clocked in) */}
      {!clockEntry && (
        <button onClick={() => setTab('timeclock')} style={{ ...bigBtn('var(--green)'), marginBottom: 16 }}>
          Clock In for Work
        </button>
      )}

      {/* This Week's Earnings */}
      <div style={{ ...card, background: 'var(--surface2)', marginBottom: 16 }}>
        <div style={{ ...sm, marginBottom: 4 }}>This Week's Earnings</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
          ${acceptedBids.filter(b => new Date(b.accepted_at || b.created_at) >= weekStart).reduce((s: number, b: any) => s + (b.pay_amount || 0), 0).toFixed(2)}
        </div>
        <div style={{ ...sm, marginTop: 4 }}>{fmtDuration(weeklySeconds)} logged this week</div>
      </div>

      {/* Active timer */}
      {timer.jobId && (
        <div style={{ ...card, background: '#4f7fff15', border: '1px solid #4f7fff44', marginBottom: 16 }}>
          <div style={{ ...sm, marginBottom: 4 }}>Active Job Timer</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>{fmt(timer.elapsed)}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {!timer.paused
              ? <button onClick={pauseJobTimer} style={{ ...bigBtn('var(--amber)'), width: 'auto', flex: 1, padding: '10px 0' }}>Pause</button>
              : <button onClick={resumeJobTimer} style={{ ...bigBtn('var(--accent)'), width: 'auto', flex: 1, padding: '10px 0' }}>Resume</button>
            }
            <button onClick={stopJobTimer} style={{ ...bigBtn('var(--red)'), width: 'auto', flex: 1, padding: '10px 0' }}>Stop</button>
          </div>
        </div>
      )}

      {/* Today's Jobs */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Today's Jobs ({todayJobs.length})
        </div>
        {todayJobs.length === 0
          ? <div style={{ ...sm, textAlign: 'center', padding: '16px 0' }}>No jobs scheduled today</div>
          : todayJobs.map(j => <MiniJobCard key={j.id} job={j} onTap={() => { setSelectedJob(j); setTab('jobs') }} />)
        }
      </div>

      {/* Coming Up */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Coming Up ({upcomingJobs.length})
        </div>
        {upcomingJobs.length === 0
          ? <div style={{ ...sm, textAlign: 'center', padding: '16px 0' }}>No upcoming jobs</div>
          : upcomingJobs.map(j => <MiniJobCard key={j.id} job={j} onTap={() => { setSelectedJob(j); setTab('jobs') }} />)
        }
      </div>
    </div>
  )

  /* ================================================================ */
  /*  Tab: MY JOBS                                                     */
  /* ================================================================ */

  const renderJobs = () => {
    if (selectedJob) return renderJobDetail()

    return (
      <div style={{ padding: '0 16px 24px' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)', marginBottom: 14 }}>My Jobs</div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {(['today', 'week', 'completed', 'all'] as JobFilter[]).map(f => (
            <button key={f} onClick={() => setJobFilter(f)} style={{
              padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              fontWeight: 600, fontSize: 13,
              background: jobFilter === f ? 'var(--accent)' : 'var(--surface2)',
              color: jobFilter === f ? '#fff' : 'var(--text2)',
            }}>
              {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : f === 'completed' ? 'Completed' : 'All'}
            </button>
          ))}
        </div>

        {filteredJobs.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>No jobs found</div>
          : filteredJobs.map(j => (
            <div key={j.id} onClick={() => setSelectedJob(j)} style={{ ...card, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)', flex: 1 }}>{j.title}</div>
                {stageBadge(j.pipe_stage)}
              </div>
              <div style={{ ...sm }}>{j.vehicle_desc || j.form_data?.vehicle || '—'}</div>
              {j.install_date && <div style={{ display: 'flex', alignItems: 'center', gap: 5, ...sm }}>
                <Calendar size={12} /> {fmtDate(j.install_date)}
              </div>}
              {j.install_address && <div style={{ display: 'flex', alignItems: 'center', gap: 5, ...sm }}>
                <MapPin size={12} /> {j.install_address}
              </div>}
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
                View Details <ChevronRight size={14} style={{ marginLeft: 2 }} />
              </div>
            </div>
          ))}
      </div>
    )
  }

  const renderJobDetail = () => {
    const j = selectedJob
    const isTimerActive = timer.jobId === j.id
    return (
      <div style={{ padding: '0 16px 24px' }}>
        <button onClick={() => setSelectedJob(null)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '0 0 14px 0', fontSize: 14, fontWeight: 600 }}>
          <ChevronLeft size={16} /> Back to Jobs
        </button>

        {/* Job header */}
        <div style={{ ...card }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text1)', flex: 1 }}>{j.title}</div>
            {stageBadge(j.pipe_stage)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
            <div>
              <div style={label}>Vehicle</div>
              <div style={{ fontSize: 14, color: 'var(--text1)' }}>{j.vehicle_desc || j.form_data?.vehicle || '—'}</div>
            </div>
            <div>
              <div style={label}>Install Date</div>
              <div style={{ fontSize: 14, color: 'var(--text1)' }}>{fmtDate(j.install_date)}</div>
            </div>
          </div>
          {j.install_address && (
            <div style={{ marginTop: 10 }}>
              <div style={label}>Address</div>
              <div style={{ fontSize: 14, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <MapPin size={13} /> {j.install_address}
              </div>
            </div>
          )}
        </div>

        {/* Timer */}
        <div style={{ ...card }}>
          <div style={{ ...label, marginBottom: 10 }}>Job Timer</div>
          {isTimerActive
            ? <>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 800, color: timer.paused ? 'var(--amber)' : 'var(--green)', textAlign: 'center', marginBottom: 12 }}>
                  {fmt(timer.elapsed)}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!timer.paused
                    ? <button onClick={pauseJobTimer} style={{ ...bigBtn('var(--amber)'), flex: 1, width: 'auto', padding: '12px 0', fontSize: 14 }}><Pause size={16} style={{ display: 'inline', marginRight: 6 }} />Pause</button>
                    : <button onClick={resumeJobTimer} style={{ ...bigBtn('var(--accent)'), flex: 1, width: 'auto', padding: '12px 0', fontSize: 14 }}><Play size={16} style={{ display: 'inline', marginRight: 6 }} />Resume</button>
                  }
                  <button onClick={stopJobTimer} style={{ ...bigBtn('var(--red)'), flex: 1, width: 'auto', padding: '12px 0', fontSize: 14 }}><Square size={16} style={{ display: 'inline', marginRight: 6 }} />Complete</button>
                </div>
              </>
            : <button onClick={() => startJobTimer(j)} style={bigBtn('var(--green)')}>
                <Play size={16} style={{ display: 'inline', marginRight: 8 }} /> Start Timer
              </button>
          }
        </div>

        {/* Photo upload */}
        <div style={{ ...card }}>
          <div style={{ ...label, marginBottom: 10 }}>Upload Photo</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {(['before', 'during', 'after'] as const).map(p => (
              <button key={p} onClick={() => setPhotoPhase(p)} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 13,
                background: photoPhase === p ? 'var(--accent)' : 'var(--surface2)',
                color: photoPhase === p ? '#fff' : 'var(--text2)',
              }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <input type="file" ref={fileInputRef} accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={bigBtn('var(--surface2)')}>
            <Camera size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            {uploading ? 'Uploading...' : `Take ${photoPhase.charAt(0).toUpperCase() + photoPhase.slice(1)} Photo`}
          </button>
          {photoMsg && <div style={{ color: 'var(--green)', fontSize: 13, textAlign: 'center', marginTop: 8 }}>{photoMsg}</div>}
        </div>

        {/* Add note */}
        <div style={{ ...card }}>
          <div style={{ ...label, marginBottom: 10 }}>Add Note</div>
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add a job note..."
            rows={3}
            style={{ ...input, resize: 'vertical', marginBottom: 8 }}
          />
          <button onClick={addNote} disabled={savingNote || !noteText.trim()} style={bigBtn('var(--accent)')}>
            {savingNote ? 'Saving...' : 'Add Note'}
          </button>
        </div>

        {/* Send for approval */}
        {j.pipe_stage === 'install' && (
          <button onClick={() => sendForApproval(j)} style={{ ...bigBtn('#22c07a33'), color: 'var(--green)', border: '2px solid var(--green)', background: 'transparent' }}>
            <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            Send for QC Approval
          </button>
        )}
        {approvalMsg && (
          <div style={{ color: 'var(--green)', fontSize: 14, textAlign: 'center', padding: '12px 0', fontWeight: 600 }}>
            {approvalMsg}
          </div>
        )}
      </div>
    )
  }

  /* ================================================================ */
  /*  Tab: AVAILABLE JOBS                                              */
  /* ================================================================ */

  const renderAvailable = () => (
    <div style={{ padding: '0 16px 24px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)', marginBottom: 4 }}>Available Jobs</div>
      <div style={{ ...sm, marginBottom: 16 }}>Jobs looking for an installer</div>

      {availableJobs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>
          <Hammer size={32} style={{ marginBottom: 10, opacity: 0.4 }} />
          <div>No available jobs right now</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Check back soon</div>
        </div>
      )}

      {availableJobs.map(j => (
        <div key={j.id} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)', flex: 1 }}>{j.title}</div>
            {stageBadge(j.pipe_stage)}
          </div>
          <div style={{ ...sm, marginBottom: 6 }}>{j.vehicle_desc || j.form_data?.vehicle || '—'}</div>
          {j.install_date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, ...sm, marginBottom: 6 }}>
              <Calendar size={12} /> Target: {fmtDate(j.install_date)}
            </div>
          )}
          {j.fin_data?.wrap_type && (
            <div style={{ ...sm, marginBottom: 6 }}>Type: {j.fin_data.wrap_type}</div>
          )}
          <button onClick={() => setBidJob(j)} style={{ ...bigBtn('var(--accent)'), padding: '10px 0', fontSize: 14 }}>
            Submit Bid
          </button>
        </div>
      ))}

      {/* My submitted bids */}
      {myBids.filter(b => b.status === 'pending').length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            My Pending Bids
          </div>
          {myBids.filter(b => b.status === 'pending').map((b: any) => (
            <div key={b.id} style={card}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)', marginBottom: 4 }}>
                {b.project?.title || 'Unknown Job'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={sm}>My bid: <strong style={{ color: 'var(--green)' }}>${b.pay_amount?.toFixed(2)}</strong></span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber)' }}>Pending Review</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bid modal */}
      {bidJob && (
        <div style={{
          position: 'fixed', inset: 0, background: '#000000cc', zIndex: 1000,
          display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text1)' }}>Submit Bid</div>
              <button onClick={() => setBidJob(null)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ ...sm, marginBottom: 16 }}>{bidJob.title} — {bidJob.vehicle_desc || '—'}</div>

            <div style={{ marginBottom: 12 }}>
              <div style={label}>Your Price ($) *</div>
              <input type="number" value={bidPrice} onChange={e => setBidPrice(e.target.value)} placeholder="0.00" style={input} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={label}>Estimated Hours</div>
              <input type="number" value={bidHours} onChange={e => setBidHours(e.target.value)} placeholder="e.g. 8" style={input} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={label}>Available From</div>
              <input type="date" value={bidAvail} onChange={e => setBidAvail(e.target.value)} style={input} />
            </div>

            {bidMsg && (
              <div style={{ padding: '10px', borderRadius: 8, background: bidMsg.includes('Error') ? '#f25a5a22' : '#22c07a22', color: bidMsg.includes('Error') ? 'var(--red)' : 'var(--green)', marginBottom: 12, textAlign: 'center', fontWeight: 600 }}>
                {bidMsg}
              </div>
            )}

            <button onClick={submitBid} disabled={submittingBid || !bidPrice} style={bigBtn('var(--accent)')}>
              {submittingBid ? 'Submitting...' : 'Submit Bid'}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  /* ================================================================ */
  /*  Tab: EARNINGS                                                    */
  /* ================================================================ */

  const renderEarnings = () => {
    const maxPay = Math.max(...filteredEarnings.map((b: any) => b.pay_amount || 0), 1)

    return (
      <div style={{ padding: '0 16px 24px' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)', marginBottom: 14 }}>Earnings</div>

        {/* Period toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {(['week', 'month', 'all'] as EarningsPeriod[]).map(p => (
            <button key={p} onClick={() => setEarningsPeriod(p)} style={{
              flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
              background: earningsPeriod === p ? 'var(--accent)' : 'var(--surface2)',
              color: earningsPeriod === p ? '#fff' : 'var(--text2)',
            }}>
              {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>

        {/* Total */}
        <div style={{ ...card, textAlign: 'center', padding: '24px 16px', marginBottom: 16, background: 'var(--surface2)' }}>
          <div style={{ ...sm, marginBottom: 4 }}>Total Earned</div>
          <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
            ${totalEarnings.toFixed(2)}
          </div>
          <div style={{ ...sm, marginTop: 4 }}>{filteredEarnings.length} job{filteredEarnings.length !== 1 ? 's' : ''}</div>
        </div>

        {/* Bar chart */}
        {filteredEarnings.length > 0 && (
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ ...label, marginBottom: 10 }}>Breakdown</div>
            {filteredEarnings.slice(0, 8).map((b: any) => (
              <div key={b.id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>{b.project?.title || 'Job'}</span>
                  <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>${(b.pay_amount || 0).toFixed(2)}</span>
                </div>
                <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3 }}>
                  <div style={{ height: 6, background: 'var(--green)', borderRadius: 3, width: `${((b.pay_amount || 0) / maxPay) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Job list */}
        {filteredEarnings.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>No earnings in this period</div>
          : filteredEarnings.map((b: any) => (
            <div key={b.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)', flex: 1 }}>{b.project?.title || 'Job'}</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
                  ${(b.pay_amount || 0).toFixed(2)}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={sm}>{b.project?.install_date ? fmtDate(b.project.install_date) : '—'}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: b.status === 'completed' ? 'var(--green)' : b.status === 'accepted' ? 'var(--cyan)' : 'var(--amber)' }}>
                  {b.status === 'completed' ? 'Paid' : b.status === 'accepted' ? 'Approved' : 'Pending'}
                </span>
              </div>
            </div>
          ))}
      </div>
    )
  }

  /* ================================================================ */
  /*  Tab: TIME CLOCK                                                  */
  /* ================================================================ */

  const renderTimeClock = () => (
    <div style={{ padding: '0 16px 24px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)', marginBottom: 14 }}>Time Clock</div>

      {/* Big clock display */}
      <div style={{ textAlign: 'center', padding: '24px 16px', marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 52, fontWeight: 900, color: clockEntry ? 'var(--green)' : 'var(--text2)', letterSpacing: '0.05em' }}>
          {clockEntry ? fmt(clockElapsed) : '00:00:00'}
        </div>
        {clockEntry && (
          <div style={{ ...sm, marginTop: 6 }}>Since {fmtTime(clockEntry.clock_in)} · {clockEntry.category || '—'}</div>
        )}
      </div>

      {/* Clock In form */}
      {!clockEntry && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ ...label, marginBottom: 10 }}>Clock In</div>

          <div style={{ marginBottom: 10 }}>
            <div style={label}>Category</div>
            <select value={clockCategory} onChange={e => setClockCategory(e.target.value)} style={{ ...input }}>
              <option value="install">Install</option>
              <option value="travel">Travel</option>
              <option value="shop">Shop Work</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={label}>Link to Job (optional)</div>
            <select value={clockJobId} onChange={e => setClockJobId(e.target.value)} style={{ ...input }}>
              <option value="">— None —</option>
              {myJobs.filter(j => j.pipe_stage === 'install').map(j => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>

          <div style={{ ...sm, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={12} />
            {clockLocation ? `Location captured (${clockLocation.lat.toFixed(4)}, ${clockLocation.lng.toFixed(4)})` : 'Location will be captured on clock-in'}
          </div>

          <button onClick={handleClockIn} disabled={clockingIn} style={bigBtn('var(--green)')}>
            {clockingIn ? 'Clocking in...' : 'Clock In'}
          </button>
        </div>
      )}

      {/* Clock Out */}
      {clockEntry && (
        <div style={{ ...card, marginBottom: 16, background: '#22c07a15', border: '1px solid #22c07a44' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)' }} />
            <span style={{ fontWeight: 700, color: 'var(--green)' }}>Currently Clocked In</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div><div style={label}>Since</div><div style={{ fontSize: 14, color: 'var(--text1)' }}>{fmtTime(clockEntry.clock_in)}</div></div>
            <div><div style={label}>Category</div><div style={{ fontSize: 14, color: 'var(--text1)' }}>{clockEntry.category}</div></div>
          </div>
          <button onClick={handleClockOut} disabled={clockingIn} style={bigBtn('var(--red)')}>
            {clockingIn ? 'Clocking out...' : 'Clock Out'}
          </button>
        </div>
      )}

      {/* This week hours */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: 'var(--text1)' }}>This Week's Hours</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>
            {fmtDuration(weeklySeconds)}
          </span>
        </div>
      </div>

      {/* Today's entries */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Today's Entries ({todayEntryList.length})
        </div>
        {todayEntryList.length === 0
          ? <div style={{ ...sm, textAlign: 'center', padding: '16px 0' }}>No entries today</div>
          : todayEntryList.map(e => (
            <div key={e.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text1)', textTransform: 'capitalize' }}>{e.category || '—'}</div>
                  <div style={{ ...sm, marginTop: 2 }}>{fmtTime(e.clock_in)} → {e.clock_out ? fmtTime(e.clock_out) : 'Active'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>
                    {e.clock_out ? fmtDuration(e.duration_seconds ?? 0) : fmtDuration(clockElapsed)}
                  </div>
                  <div style={{ fontSize: 11, color: e.clock_out ? 'var(--text2)' : 'var(--green)', fontWeight: 600 }}>
                    {e.clock_out ? 'Done' : 'Active'}
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )

  /* ================================================================ */
  /*  Tab: SUPPLY REQUESTS                                             */
  /* ================================================================ */

  const renderSupplies = () => (
    <div style={{ padding: '0 16px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)' }}>Supply Requests</div>
        <button onClick={() => setShowSupplyForm(true)} style={{
          background: 'var(--accent)', color: '#fff', border: 'none',
          padding: '9px 16px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Plus size={15} /> New
        </button>
      </div>

      {supplyRequests.length === 0
        ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>
            <Package size={32} style={{ marginBottom: 10, opacity: 0.4 }} />
            <div>No supply requests yet</div>
          </div>
        : supplyRequests.map(r => (
          <div key={r.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)' }}>
                {r.project?.title || 'General Request'}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, background: supplyStatusColor(r.status) + '22', color: supplyStatusColor(r.status), padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase' }}>
                {r.status}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: urgencyColor(r.urgency), fontWeight: 700, textTransform: 'uppercase' }}>
                {r.urgency}
              </span>
              {r.needed_by && <span style={{ ...sm }}>Needed by {fmtDate(r.needed_by)}</span>}
            </div>
            <div style={{ ...sm }}>
              {Array.isArray(r.items) && r.items.map((item: SupplyItem, i: number) => (
                <span key={i} style={{ display: 'inline-block', marginRight: 8 }}>
                  {item.qty} {item.unit} {item.name}
                </span>
              ))}
            </div>
          </div>
        ))}

      {/* New Request Modal */}
      {showSupplyForm && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000cc', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text1)' }}>New Supply Request</div>
              <button onClick={() => setShowSupplyForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Link to job */}
            <div style={{ marginBottom: 12 }}>
              <div style={label}>Link to Job (optional)</div>
              <select value={supplyProject} onChange={e => setSupplyProject(e.target.value)} style={input}>
                <option value="">— None —</option>
                {myJobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>

            {/* Items */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={label}>Items Needed</div>
                <button onClick={() => setSupplyItems(prev => [...prev, { name: '', qty: '1', unit: 'ea' }])} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                  + Add Row
                </button>
              </div>
              {supplyItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                  <input
                    placeholder="Item name"
                    value={item.name}
                    onChange={e => setSupplyItems(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    style={{ ...input, flex: 2 }}
                  />
                  <input
                    placeholder="Qty"
                    type="number"
                    value={item.qty}
                    onChange={e => setSupplyItems(prev => prev.map((x, j) => j === i ? { ...x, qty: e.target.value } : x))}
                    style={{ ...input, flex: 0.6 }}
                  />
                  <select
                    value={item.unit}
                    onChange={e => setSupplyItems(prev => prev.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))}
                    style={{ ...input, flex: 0.8 }}
                  >
                    <option>ea</option>
                    <option>ft</option>
                    <option>yd</option>
                    <option>roll</option>
                    <option>box</option>
                  </select>
                  {supplyItems.length > 1 && (
                    <button onClick={() => setSupplyItems(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Urgency */}
            <div style={{ marginBottom: 12 }}>
              <div style={label}>Urgency</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['normal', 'urgent', 'emergency'] as const).map(u => (
                  <button key={u} onClick={() => setSupplyUrgency(u)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 8, border: `2px solid ${supplyUrgency === u ? urgencyColor(u) : 'transparent'}`,
                    background: supplyUrgency === u ? urgencyColor(u) + '22' : 'var(--surface2)',
                    color: supplyUrgency === u ? urgencyColor(u) : 'var(--text2)',
                    fontWeight: 700, fontSize: 12, cursor: 'pointer', textTransform: 'capitalize',
                  }}>
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Needed by */}
            <div style={{ marginBottom: 12 }}>
              <div style={label}>Needed By</div>
              <input type="date" value={supplyNeededBy} onChange={e => setSupplyNeededBy(e.target.value)} style={input} />
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 16 }}>
              <div style={label}>Notes</div>
              <textarea value={supplyNotes} onChange={e => setSupplyNotes(e.target.value)} placeholder="Any additional details..." rows={3} style={{ ...input, resize: 'vertical' }} />
            </div>

            <button onClick={submitSupply} disabled={submittingSupply || supplyItems.every(i => !i.name.trim())} style={bigBtn('var(--accent)')}>
              {submittingSupply ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Main content area */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 16 }}>
        {tab === 'home'      && renderHome()}
        {tab === 'jobs'      && renderJobs()}
        {tab === 'available' && renderAvailable()}
        {tab === 'earnings'  && renderEarnings()}
        {tab === 'timeclock' && renderTimeClock()}
        {tab === 'supplies'  && renderSupplies()}
      </div>

      {/* Bottom tab bar */}
      <div style={{
        display: 'flex',
        borderTop: '1px solid #ffffff10',
        background: 'var(--surface)',
        position: 'sticky',
        bottom: 0,
        zIndex: 50,
      }}>
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => { setTab(t.id); if (t.id !== 'jobs') setSelectedJob(null) }} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '10px 4px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: active ? 'var(--accent)' : 'var(--text3)',
              borderTop: active ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
              <Icon size={20} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{t.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Greeting helper (module-level, pure)                               */
/* ------------------------------------------------------------------ */
function greet() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
