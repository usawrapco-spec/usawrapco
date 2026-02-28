'use client'
import { ORG_ID } from '@/lib/org'


import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Home, Briefcase, DollarSign, Calendar, MessageCircle,
  Camera, Play, Pause, FileText, ShoppingBag, ChevronRight,
  Clock, CheckCircle2, Circle, X, Send, Plus, Trash2,
  AlertTriangle, ChevronLeft, ChevronDown, Truck, Timer,
  Upload, Square, Loader2,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Assignment {
  id: string
  project_id: string
  installer_id: string
  role: string
  split_percentage: number
  status: string
  notes: string | null
  accepted_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  project?: {
    id: string
    title: string
    vehicle_desc: string | null
    status: string
    pipeline_stage: string | null
    pipe_stage: string | null
    customer_id: string | null
    form_data: Record<string, any> | null
    data: Record<string, any> | null
  }
}

interface ScheduleEntry {
  id: string
  installer_id: string
  project_id: string
  assignment_id: string | null
  scheduled_date: string
  start_time: string | null
  end_time: string | null
  status: string
  notes: string | null
  project?: {
    id: string
    title: string
    vehicle_desc: string | null
  }
}

interface Earning {
  id: string
  installer_id: string
  project_id: string
  assignment_id: string | null
  amount: number
  type: string
  status: string
  pay_period_start: string | null
  pay_period_end: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  project?: {
    id: string
    title: string
  }
}

interface InstallerMessage {
  id: string
  channel: string
  project_id: string | null
  sender_id: string
  recipient_id: string | null
  body: string
  attachments: any[] | null
  created_at: string
  sender?: {
    id: string
    name: string
    avatar_url: string | null
  }
}

interface InstallSession {
  id: string
  project_id: string
  installer_id: string
  start_time: string | null
  end_time: string | null
  started_at?: string | null
  ended_at?: string | null
  duration_hours: number | null
  duration_seconds?: number | null
  status: string
  notes: string | null
  created_at: string
}

type TabId = 'home' | 'jobs' | 'earnings' | 'schedule' | 'chat'

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
  { id: 'earnings', label: 'Earnings', icon: DollarSign },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTime(t: string | null): string {
  if (!t) return '--'
  // t might be HH:MM:SS or ISO string
  try {
    if (t.includes('T')) return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
  } catch { return t }
}

function fmtTimer(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function getWeekRange(): { start: Date; end: Date } {
  const now = new Date()
  const day = now.getDay()
  const start = new Date(now)
  start.setDate(now.getDate() - day)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function getMonthRange(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function statusColor(status: string): string {
  switch (status) {
    case 'pending': return 'var(--amber)'
    case 'approved': case 'accepted': return 'var(--green)'
    case 'paid': return 'var(--text2)'
    case 'in_progress': return 'var(--cyan)'
    case 'completed': case 'complete': return 'var(--green)'
    case 'declined': case 'rejected': return 'var(--red)'
    default: return 'var(--text3)'
  }
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function InstallerPortalPageClient({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const orgId = profile.org_id || ORG_ID

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('home')

  // Data state
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([])
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [messages, setMessages] = useState<InstallerMessage[]>([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [showSupplyModal, setShowSupplyModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const [showJobPicker, setShowJobPicker] = useState(false)
  const [earningsPeriod, setEarningsPeriod] = useState<'week' | 'month' | 'all'>('week')
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [uploading, setUploading] = useState(false)

  // Timer state (per-job)
  const [activeTimers, setActiveTimers] = useState<Record<string, { sessionId: string; startTime: number; elapsed: number }>>({})
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // ── Data loading ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [assignRes, schedRes, earnRes, msgRes] = await Promise.all([
        supabase
          .from('installer_assignments')
          .select('*, project:project_id(id, title, vehicle_desc, status, pipe_stage, customer_id, form_data)')
          .eq('org_id', orgId)
          .eq('installer_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('installer_schedule')
          .select('*, project:project_id(id, title, vehicle_desc)')
          .eq('org_id', orgId)
          .eq('installer_id', profile.id)
          .order('scheduled_date', { ascending: true }),
        supabase
          .from('installer_earnings')
          .select('*, project:project_id(id, title)')
          .eq('org_id', orgId)
          .eq('installer_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('installer_messages')
          .select('*, sender:sender_id(id, name, avatar_url)')
          .eq('org_id', orgId)
          .eq('channel', 'install-team')
          .order('created_at', { ascending: true })
          .limit(100),
      ])

      if (assignRes.data) setAssignments(assignRes.data)
      if (schedRes.data) setSchedule(schedRes.data)
      if (earnRes.data) setEarnings(earnRes.data)
      if (msgRes.data) setMessages(msgRes.data)

      // Load active install sessions for timers
      const { data: sessions } = await supabase
        .from('install_sessions')
        .select('*')
        .eq('org_id', orgId)
        .eq('installer_id', profile.id)
        .is('end_time', null)

      if (sessions && sessions.length > 0) {
        const timers: Record<string, { sessionId: string; startTime: number; elapsed: number }> = {}
        sessions.forEach((s: any) => {
          const st = s.start_time || s.started_at
          if (st) {
            const startMs = new Date(st).getTime()
            timers[s.project_id] = {
              sessionId: s.id,
              startTime: startMs,
              elapsed: Math.floor((Date.now() - startMs) / 1000),
            }
          }
        })
        setActiveTimers(timers)
      }
    } catch (err) {
      console.error('Failed to load installer data:', err)
    }
    setLoading(false)
  }, [orgId, profile.id])

  useEffect(() => { loadData() }, [loadData])

  // Timer tick
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      setActiveTimers(prev => {
        const next = { ...prev }
        for (const pid of Object.keys(next)) {
          next[pid] = { ...next[pid], elapsed: Math.floor((Date.now() - next[pid].startTime) / 1000) }
        }
        return next
      })
    }, 1000)
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current) }
  }, [])

  // Real-time chat subscription
  useEffect(() => {
    const channel = supabase
      .channel('installer-chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'installer_messages',
        filter: `channel=eq.install-team`,
      }, (payload: any) => {
        if (payload.new) {
          setMessages(prev => [...prev, payload.new as InstallerMessage])
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Actions ──────────────────────────────────────────────────────────────────
  const updateAssignmentStatus = async (id: string, status: string) => {
    const updates: Record<string, any> = { status }
    if (status === 'in_progress') updates.started_at = new Date().toISOString()
    if (status === 'completed') updates.completed_at = new Date().toISOString()
    if (status === 'accepted') updates.accepted_at = new Date().toISOString()

    await supabase.from('installer_assignments').update(updates).eq('id', id)
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status, ...updates } : a))
  }

  const startTimer = async (projectId: string) => {
    const now = new Date()
    const { data, error } = await supabase
      .from('install_sessions')
      .insert({
        org_id: orgId,
        project_id: projectId,
        installer_id: profile.id,
        start_time: now.toISOString(),
        status: 'active',
      })
      .select()
      .single()

    if (!error && data) {
      setActiveTimers(prev => ({
        ...prev,
        [projectId]: { sessionId: data.id, startTime: now.getTime(), elapsed: 0 },
      }))
    }
  }

  const stopTimer = async (projectId: string) => {
    const timer = activeTimers[projectId]
    if (!timer) return
    const durationSec = Math.floor((Date.now() - timer.startTime) / 1000)
    const durationHrs = Number((durationSec / 3600).toFixed(2))

    await supabase
      .from('install_sessions')
      .update({
        end_time: new Date().toISOString(),
        duration_hours: durationHrs,
        status: 'completed',
      })
      .eq('id', timer.sessionId)

    setActiveTimers(prev => {
      const next = { ...prev }
      delete next[projectId]
      return next
    })
  }

  const uploadPhoto = async (file: File, projectId: string, category: string = 'install') => {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${orgId}/${projectId}/install_${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('project-files').upload(path, file)
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path)

      await supabase.from('job_images').insert({
        org_id: orgId,
        project_id: projectId,
        user_id: profile.id,
        category,
        image_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
      })
    } catch (err) {
      console.error('Upload failed:', err)
    }
    setUploading(false)
  }

  const sendMessage = async () => {
    if (!chatInput.trim()) return
    const body = chatInput.trim()
    setChatInput('')

    await supabase.from('installer_messages').insert({
      org_id: orgId,
      channel: 'install-team',
      sender_id: profile.id,
      body,
    })
  }

  // ── Derived data ─────────────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0]
  const todayJobs = assignments.filter(a => {
    const sched = schedule.find(s => s.assignment_id === a.id || s.project_id === a.project_id)
    return sched?.scheduled_date === todayStr || a.status === 'in_progress'
  })
  if (todayJobs.length === 0) {
    // Show assigned jobs that are not completed
    const active = assignments.filter(a => a.status !== 'completed' && a.status !== 'declined')
    if (active.length > 0 && todayJobs.length === 0) {
      // Add first few active jobs as "today's" jobs
      active.slice(0, 3).forEach(a => {
        if (!todayJobs.find(tj => tj.id === a.id)) todayJobs.push(a)
      })
    }
  }

  const weekRange = getWeekRange()
  const monthRange = getMonthRange()

  const weekEarnings = earnings.filter(e => {
    const d = new Date(e.created_at)
    return d >= weekRange.start && d <= weekRange.end
  })
  const monthEarnings = earnings.filter(e => {
    const d = new Date(e.created_at)
    return d >= monthRange.start && d <= monthRange.end
  })

  const weekTotal = weekEarnings.reduce((s, e) => s + (e.amount || 0), 0)
  const monthTotal = monthEarnings.reduce((s, e) => s + (e.amount || 0), 0)
  const allTotal = earnings.reduce((s, e) => s + (e.amount || 0), 0)

  const filteredEarnings = earningsPeriod === 'week' ? weekEarnings : earningsPeriod === 'month' ? monthEarnings : earnings
  const displayTotal = earningsPeriod === 'week' ? weekTotal : earningsPeriod === 'month' ? monthTotal : allTotal

  // Calendar helpers
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)
  const scheduleDates = new Set(schedule.map(s => s.scheduled_date))
  const selectedDayJobs = selectedDate
    ? schedule.filter(s => s.scheduled_date === selectedDate)
    : []

  // ── Styles ───────────────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  }

  const btnPrimary: React.CSSProperties = {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '12px 20px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
  }

  const btnOutline: React.CSSProperties = {
    background: 'transparent',
    color: 'var(--text1)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 16px',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    color: 'var(--text1)',
    width: '100%',
    outline: 'none',
  }

  const modalOverlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  }

  const modalContent: React.CSSProperties = {
    background: 'var(--surface)',
    borderRadius: '18px 18px 0 0',
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85vh',
    overflowY: 'auto',
    animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  }

  const sectionTitle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 900,
    color: 'var(--text3)',
    textTransform: 'uppercase' as const,
    letterSpacing: '.08em',
    marginBottom: 10,
    fontFamily: 'Barlow Condensed, sans-serif',
  }

  // ── Render: Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text3)' }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // HOME TAB
  // ══════════════════════════════════════════════════════════════════════════════
  const renderHome = () => (
    <div style={{ padding: '20px 16px 120px' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 26,
          fontWeight: 800,
          color: 'var(--text1)',
          fontFamily: 'Barlow Condensed, sans-serif',
          margin: 0,
          lineHeight: 1.2,
        }}>
          {getGreeting()}, {profile.name?.split(' ')[0] || 'Installer'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', margin: '4px 0 0' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Earnings This Week */}
      <div style={{
        ...cardStyle,
        background: 'linear-gradient(135deg, rgba(79,127,255,0.12), rgba(34,208,238,0.08))',
        border: '1px solid rgba(79,127,255,0.25)',
        textAlign: 'center',
        padding: 24,
      }}>
        <div style={{ ...sectionTitle, marginBottom: 6 }}>Earnings This Week</div>
        <div style={{
          fontSize: 40,
          fontWeight: 800,
          color: 'var(--text1)',
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: -1,
        }}>
          {formatCurrency(weekTotal)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
          {weekEarnings.length} job{weekEarnings.length !== 1 ? 's' : ''} this week
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ ...sectionTitle, marginTop: 20 }}>Quick Actions</div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
        marginBottom: 24,
      }}>
        <QuickAction
          icon={Camera}
          label="Take Photos"
          color="var(--cyan)"
          onClick={() => setShowPhotoPicker(true)}
        />
        <QuickAction
          icon={Play}
          label="Start Job"
          color="var(--green)"
          onClick={() => setShowJobPicker(true)}
        />
        <QuickAction
          icon={FileText}
          label="Submit Report"
          color="var(--purple)"
          onClick={() => setShowReportModal(true)}
        />
        <QuickAction
          icon={ShoppingBag}
          label="Request Supply"
          color="var(--amber)"
          onClick={() => setShowSupplyModal(true)}
        />
      </div>

      {/* Today's Jobs */}
      <div style={{ ...sectionTitle, marginTop: 4 }}>
        {todayJobs.length > 0 ? "Today's Jobs" : 'Active Jobs'}
      </div>
      {todayJobs.length === 0 && (
        <div style={{
          ...cardStyle, textAlign: 'center', padding: 32, color: 'var(--text3)', fontSize: 14,
        }}>
          No jobs scheduled for today
        </div>
      )}
      {todayJobs.map(a => (
        <div key={a.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>
                {a.project?.title || 'Untitled Job'}
              </div>
              {a.project?.vehicle_desc && (
                <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Truck size={12} /> {a.project.vehicle_desc}
                </div>
              )}
            </div>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: statusColor(a.status),
              background: `${statusColor(a.status)}18`,
              padding: '3px 10px',
              borderRadius: 20,
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
            }}>
              {a.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Timer if running */}
          {activeTimers[a.project_id] && (
            <div style={{
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(34,192,122,0.08)',
              padding: '8px 12px',
              borderRadius: 8,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--green)',
                animation: 'pulse 2s infinite',
              }} />
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--green)',
              }}>
                {fmtTimer(activeTimers[a.project_id].elapsed)}
              </span>
              <button
                onClick={() => stopTimer(a.project_id)}
                style={{
                  marginLeft: 'auto',
                  background: 'var(--red)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Pause size={12} /> Stop
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════════════
  // JOBS TAB
  // ══════════════════════════════════════════════════════════════════════════════
  const renderJobs = () => (
    <div style={{ padding: '20px 16px 120px' }}>
      <h2 style={{
        fontSize: 22,
        fontWeight: 800,
        color: 'var(--text1)',
        fontFamily: 'Barlow Condensed, sans-serif',
        margin: '0 0 16px',
      }}>
        My Jobs
      </h2>

      {assignments.length === 0 && (
        <div style={{
          ...cardStyle, textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 14,
        }}>
          No assigned jobs yet
        </div>
      )}

      {assignments.map(a => {
        const isExpanded = expandedJob === a.id
        const sched = schedule.find(s => s.assignment_id === a.id || s.project_id === a.project_id)
        const timerActive = !!activeTimers[a.project_id]
        const bid = earnings.find(e => e.assignment_id === a.id)

        return (
          <div key={a.id} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            {/* Card header */}
            <button
              onClick={() => setExpandedJob(isExpanded ? null : a.id)}
              style={{
                width: '100%',
                padding: 16,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>
                    {a.project?.title || 'Untitled Job'}
                  </span>
                </div>
                {a.project?.vehicle_desc && (
                  <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <Truck size={12} /> {a.project.vehicle_desc}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {sched && (
                    <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Calendar size={11} /> {formatDate(sched.scheduled_date)}
                    </span>
                  )}
                  {a.split_percentage > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                      Split: {a.split_percentage}%
                    </span>
                  )}
                  {bid && (
                    <span style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                      {formatCurrency(bid.amount)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: statusColor(a.status),
                  background: `${statusColor(a.status)}18`,
                  padding: '3px 8px',
                  borderRadius: 20,
                  textTransform: 'capitalize',
                  whiteSpace: 'nowrap',
                }}>
                  {a.status.replace(/_/g, ' ')}
                </span>
                <ChevronDown
                  size={16}
                  style={{
                    color: 'var(--text3)',
                    transition: 'transform 0.2s',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                {/* Status actions */}
                <div style={{ display: 'flex', gap: 8, margin: '14px 0', flexWrap: 'wrap' }}>
                  {a.status === 'assigned' && (
                    <>
                      <button
                        onClick={() => updateAssignmentStatus(a.id, 'accepted')}
                        style={{ ...btnOutline, flex: 1, background: 'rgba(34,192,122,0.1)', borderColor: 'var(--green)', color: 'var(--green)' }}
                      >
                        <CheckCircle2 size={14} /> Accept
                      </button>
                      <button
                        onClick={() => updateAssignmentStatus(a.id, 'declined')}
                        style={{ ...btnOutline, flex: 1, borderColor: 'var(--red)', color: 'var(--red)' }}
                      >
                        <X size={14} /> Decline
                      </button>
                    </>
                  )}
                  {(a.status === 'accepted' || a.status === 'assigned') && (
                    <button
                      onClick={() => updateAssignmentStatus(a.id, 'in_progress')}
                      style={{ ...btnPrimary, background: 'var(--green)' }}
                    >
                      <Play size={14} /> Start Job
                    </button>
                  )}
                  {a.status === 'in_progress' && (
                    <button
                      onClick={() => updateAssignmentStatus(a.id, 'completed')}
                      style={{ ...btnPrimary, background: 'var(--green)' }}
                    >
                      <CheckCircle2 size={14} /> Mark Complete
                    </button>
                  )}
                </div>

                {/* Timer */}
                <div style={{
                  background: 'var(--surface2)',
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 14,
                  textAlign: 'center',
                }}>
                  <div style={{ ...sectionTitle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 8 }}>
                    <Timer size={12} /> Install Timer
                  </div>
                  {timerActive ? (
                    <>
                      <div style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 32,
                        fontWeight: 700,
                        color: 'var(--green)',
                        letterSpacing: 1,
                        marginBottom: 8,
                      }}>
                        {fmtTimer(activeTimers[a.project_id].elapsed)}
                      </div>
                      <button
                        onClick={() => stopTimer(a.project_id)}
                        style={{
                          background: 'var(--red)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '10px 28px',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <Square size={12} /> Stop Timer
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startTimer(a.project_id)}
                      style={{
                        background: 'var(--green)',
                        color: '#0d1a10',
                        border: 'none',
                        borderRadius: 8,
                        padding: '10px 28px',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <Play size={12} /> Start Timer
                    </button>
                  )}
                </div>

                {/* Notes */}
                {a.notes && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={sectionTitle}>Notes</div>
                    <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>{a.notes}</p>
                  </div>
                )}

                {/* Photo upload sections */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <PhotoUploadBtn
                    label="Before"
                    projectId={a.project_id}
                    category="before"
                    onUpload={uploadPhoto}
                    uploading={uploading}
                  />
                  <PhotoUploadBtn
                    label="After"
                    projectId={a.project_id}
                    category="after"
                    onUpload={uploadPhoto}
                    uploading={uploading}
                  />
                  <PhotoUploadBtn
                    label="Progress"
                    projectId={a.project_id}
                    category="install"
                    onUpload={uploadPhoto}
                    uploading={uploading}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════════════
  // EARNINGS TAB
  // ══════════════════════════════════════════════════════════════════════════════
  const renderEarnings = () => (
    <div style={{ padding: '20px 16px 120px' }}>
      <h2 style={{
        fontSize: 22,
        fontWeight: 800,
        color: 'var(--text1)',
        fontFamily: 'Barlow Condensed, sans-serif',
        margin: '0 0 16px',
      }}>
        Earnings
      </h2>

      {/* Period tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface)', borderRadius: 10, padding: 3, border: '1px solid var(--border)' }}>
        {(['week', 'month', 'all'] as const).map(p => (
          <button
            key={p}
            onClick={() => setEarningsPeriod(p)}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: earningsPeriod === p ? 700 : 500,
              color: earningsPeriod === p ? 'var(--text1)' : 'var(--text3)',
              background: earningsPeriod === p ? 'var(--surface2)' : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
          </button>
        ))}
      </div>

      {/* Total */}
      <div style={{
        ...cardStyle,
        textAlign: 'center',
        padding: 28,
        background: 'linear-gradient(135deg, rgba(34,192,122,0.1), rgba(79,127,255,0.06))',
        border: '1px solid rgba(34,192,122,0.2)',
      }}>
        <div style={{ ...sectionTitle, marginBottom: 4 }}>Total Earnings</div>
        <div style={{
          fontSize: 44,
          fontWeight: 800,
          color: 'var(--text1)',
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: -1,
        }}>
          {formatCurrency(displayTotal)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
          {filteredEarnings.length} earning{filteredEarnings.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Earnings list */}
      <div style={{ ...sectionTitle, marginTop: 20 }}>Breakdown</div>
      {filteredEarnings.length === 0 && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 28, color: 'var(--text3)', fontSize: 13 }}>
          No earnings for this period
        </div>
      )}
      {filteredEarnings.map(e => (
        <div key={e.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)', marginBottom: 2 }}>
              {e.project?.title || 'Payment'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              {formatDate(e.created_at)} {e.type && `- ${e.type}`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--text1)',
            }}>
              {formatCurrency(e.amount)}
            </div>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: statusColor(e.status),
              textTransform: 'capitalize',
            }}>
              {e.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════════════
  // SCHEDULE TAB
  // ══════════════════════════════════════════════════════════════════════════════
  const renderSchedule = () => {
    const monthName = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    return (
      <div style={{ padding: '20px 16px 120px' }}>
        <h2 style={{
          fontSize: 22,
          fontWeight: 800,
          color: 'var(--text1)',
          fontFamily: 'Barlow Condensed, sans-serif',
          margin: '0 0 16px',
        }}>
          Schedule
        </h2>

        {/* Calendar nav */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}>
          <button
            onClick={() => {
              if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
              else setCalMonth(m => m - 1)
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 8 }}
          >
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif' }}>
            {monthName}
          </span>
          <button
            onClick={() => {
              if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
              else setCalMonth(m => m + 1)
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 8 }}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Calendar grid */}
        <div style={{
          ...cardStyle,
          padding: 12,
        }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} style={{
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text3)',
                padding: '6px 0',
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const hasJob = scheduleDates.has(dateStr)
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: 10,
                    border: isSelected ? '2px solid var(--accent)' : isToday ? '2px solid var(--border)' : 'none',
                    background: isSelected ? 'rgba(79,127,255,0.15)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    position: 'relative',
                  }}
                >
                  <span style={{
                    fontSize: 13,
                    fontWeight: isToday ? 800 : 500,
                    color: isToday ? 'var(--accent)' : 'var(--text1)',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    {day}
                  </span>
                  {hasJob && (
                    <span style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: 'var(--green)',
                      position: 'absolute',
                      bottom: 4,
                    }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected day jobs */}
        {selectedDate && (
          <div style={{ marginTop: 16 }}>
            <div style={sectionTitle}>
              Jobs on {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
            {selectedDayJobs.length === 0 && (
              <div style={{ ...cardStyle, textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: 13 }}>
                No jobs scheduled
              </div>
            )}
            {selectedDayJobs.map(s => (
              <div key={s.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>
                      {s.project?.title || 'Job'}
                    </div>
                    {s.project?.vehicle_desc && (
                      <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Truck size={12} /> {s.project.vehicle_desc}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatTime(s.start_time)} {s.end_time ? `- ${formatTime(s.end_time)}` : ''}
                    </div>
                  </div>
                </div>
                {s.notes && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>{s.notes}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CHAT TAB
  // ══════════════════════════════════════════════════════════════════════════════
  const chatEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (activeTab === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeTab])

  const renderChat = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px - 68px)' }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(79,127,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageCircle size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif' }}>
              #install-team
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Team chat</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 16px',
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((m, idx) => {
          const isMe = m.sender_id === profile.id
          const showAvatar = idx === 0 || messages[idx - 1].sender_id !== m.sender_id
          return (
            <div key={m.id} style={{ marginBottom: showAvatar ? 12 : 3 }}>
              {showAvatar && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 4,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: isMe ? 'var(--accent)' : 'var(--surface2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    color: isMe ? '#fff' : 'var(--text2)',
                  }}>
                    {(m.sender?.name || 'U')[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: isMe ? 'var(--accent)' : 'var(--text2)' }}>
                    {isMe ? 'You' : (m.sender?.name || 'Unknown')}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                    {new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              )}
              <div style={{
                marginLeft: 30,
                fontSize: 14,
                color: 'var(--text1)',
                lineHeight: 1.5,
              }}>
                {m.body}
              </div>
            </div>
          )
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
        paddingBottom: 80,
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Type a message..."
            style={{
              ...inputStyle,
              flex: 1,
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!chatInput.trim()}
            style={{
              background: chatInput.trim() ? 'var(--accent)' : 'var(--surface2)',
              color: chatInput.trim() ? '#fff' : 'var(--text3)',
              border: 'none',
              borderRadius: 10,
              width: 44,
              height: 44,
              cursor: chatInput.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════════════
  // MODALS
  // ══════════════════════════════════════════════════════════════════════════════

  // ── Supply Request Modal ─────────────────────────────────────────────────────
  const renderSupplyModal = () => (
    <SupplyRequestModal
      orgId={orgId}
      profileId={profile.id}
      assignments={assignments}
      supabase={supabase}
      onClose={() => setShowSupplyModal(false)}
      inputStyle={inputStyle}
      btnPrimary={btnPrimary}
      sectionTitle={sectionTitle}
    />
  )

  // ── Report Modal ─────────────────────────────────────────────────────────────
  const renderReportModal = () => (
    <ReportModal
      orgId={orgId}
      profileId={profile.id}
      supabase={supabase}
      onClose={() => setShowReportModal(false)}
      inputStyle={inputStyle}
      btnPrimary={btnPrimary}
      sectionTitle={sectionTitle}
    />
  )

  // ── Photo Picker Modal ───────────────────────────────────────────────────────
  const renderPhotoPicker = () => (
    <PhotoPickerModal
      assignments={assignments}
      onSelect={(projectId: string) => {
        setShowPhotoPicker(false)
        const el = document.createElement('input')
        el.type = 'file'
        el.accept = 'image/*'
        el.multiple = true
        el.onchange = async (e: any) => {
          const files: FileList = e.target.files
          for (let i = 0; i < files.length; i++) {
            await uploadPhoto(files[i], projectId, 'install')
          }
        }
        el.click()
      }}
      onClose={() => setShowPhotoPicker(false)}
      sectionTitle={sectionTitle}
    />
  )

  // ── Job Picker Modal (Start Job) ─────────────────────────────────────────────
  const renderJobPicker = () => (
    <JobPickerModal
      assignments={assignments.filter(a => a.status !== 'completed' && a.status !== 'declined')}
      activeTimers={activeTimers}
      onStart={async (a: Assignment) => {
        setShowJobPicker(false)
        if (a.status === 'assigned' || a.status === 'accepted') {
          await updateAssignmentStatus(a.id, 'in_progress')
        }
        if (!activeTimers[a.project_id]) {
          await startTimer(a.project_id)
        }
      }}
      onClose={() => setShowJobPicker(false)}
      sectionTitle={sectionTitle}
    />
  )

  // ══════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }
        @keyframes slideUp {
          from { transform: translateY(100%) }
          to { transform: translateY(0) }
        }
        @keyframes fadeIn {
          from { opacity: 0 }
          to { opacity: 1 }
        }
      `}</style>

      {/* Tab content */}
      {activeTab === 'home' && renderHome()}
      {activeTab === 'jobs' && renderJobs()}
      {activeTab === 'earnings' && renderEarnings()}
      {activeTab === 'schedule' && renderSchedule()}
      {activeTab === 'chat' && renderChat()}

      {/* Modals */}
      {showSupplyModal && renderSupplyModal()}
      {showReportModal && renderReportModal()}
      {showPhotoPicker && renderPhotoPicker()}
      {showJobPicker && renderJobPicker()}

      {/* Bottom tab bar */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1001,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'stretch',
        height: 68,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                paddingBottom: 4,
                transition: 'all 0.15s',
              }}
            >
              <Icon
                size={22}
                style={{
                  color: active ? 'var(--accent)' : 'var(--text3)',
                  transition: 'color 0.15s',
                }}
              />
              <span style={{
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                color: active ? 'var(--accent)' : 'var(--text3)',
                fontFamily: 'Barlow Condensed, sans-serif',
                letterSpacing: '.02em',
              }}>
                {tab.label}
              </span>
              {active && (
                <span style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  marginTop: -1,
                }} />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

// ── Quick Action Button ────────────────────────────────────────────────────────
function QuickAction({ icon: Icon, label, color, onClick }: {
  icon: any; label: string; color: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 18,
        borderRadius: 14,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.background = `${color}10`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.background = 'var(--surface)'
      }}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: `${color}18`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={22} style={{ color }} />
      </div>
      <span style={{
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--text1)',
        fontFamily: 'Barlow Condensed, sans-serif',
      }}>
        {label}
      </span>
    </button>
  )
}

// ── Photo Upload Button ────────────────────────────────────────────────────────
function PhotoUploadBtn({ label, projectId, category, onUpload, uploading }: {
  label: string; projectId: string; category: string;
  onUpload: (file: File, projectId: string, category: string) => Promise<void>;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div style={{ flex: 1 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={async (e) => {
          const files = e.target.files
          if (!files) return
          for (let i = 0; i < files.length; i++) {
            await onUpload(files[i], projectId, category)
          }
          if (inputRef.current) inputRef.current.value = ''
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          width: '100%',
          padding: '10px 0',
          borderRadius: 8,
          border: '1px dashed var(--border)',
          background: 'var(--surface2)',
          cursor: uploading ? 'default' : 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          opacity: uploading ? 0.6 : 1,
        }}
      >
        {uploading ? (
          <Loader2 size={16} style={{ color: 'var(--text3)', animation: 'spin 1s linear infinite' }} />
        ) : (
          <Upload size={16} style={{ color: 'var(--text3)' }} />
        )}
        <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>{label}</span>
      </button>
    </div>
  )
}

// ── Supply Request Modal ───────────────────────────────────────────────────────
function SupplyRequestModal({ orgId, profileId, assignments, supabase, onClose, inputStyle, btnPrimary, sectionTitle }: any) {
  const [projectId, setProjectId] = useState('')
  const [items, setItems] = useState([{ name: '', qty: 1, notes: '' }])
  const [urgency, setUrgency] = useState('normal')
  const [neededBy, setNeededBy] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const addItem = () => setItems(prev => [...prev, { name: '', qty: 1, notes: '' }])
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))
  const updateItem = (idx: number, field: string, val: any) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item))
  }

  const submit = async () => {
    if (!projectId || items.some(i => !i.name.trim())) return
    setSubmitting(true)
    await supabase.from('supply_requests').insert({
      org_id: orgId,
      project_id: projectId,
      requested_by: profileId,
      status: 'pending',
      items: items.map(i => ({ name: i.name, quantity: i.qty, notes: i.notes })),
      urgency,
      needed_by: neededBy || null,
      notes: notes || null,
    })
    setSubmitting(false)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)', zIndex: 9999,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', borderRadius: '18px 18px 0 0',
        padding: 20, width: '100%', maxWidth: 500, maxHeight: '85vh', overflowY: 'auto',
        animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }} onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', margin: 0 }}>
            Supply Request
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Project */}
        <div style={{ marginBottom: 14 }}>
          <div style={sectionTitle}>Project</div>
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            style={{ ...inputStyle, appearance: 'auto' }}
          >
            <option value="">Select a project...</option>
            {assignments.map((a: any) => (
              <option key={a.id} value={a.project_id}>{a.project?.title || a.project_id}</option>
            ))}
          </select>
        </div>

        {/* Items */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...sectionTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Items</span>
            <button onClick={addItem} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700 }}>
              <Plus size={12} /> Add
            </button>
          </div>
          {items.map((item, idx) => (
            <div key={idx} style={{
              display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center',
            }}>
              <input
                value={item.name}
                onChange={e => updateItem(idx, 'name', e.target.value)}
                placeholder="Item name"
                style={{ ...inputStyle, flex: 3 }}
              />
              <input
                type="number"
                value={item.qty}
                onChange={e => updateItem(idx, 'qty', parseInt(e.target.value) || 1)}
                min={1}
                style={{ ...inputStyle, flex: 1, textAlign: 'center' }}
              />
              {items.length > 1 && (
                <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 4, flexShrink: 0 }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Urgency */}
        <div style={{ marginBottom: 14 }}>
          <div style={sectionTitle}>Urgency</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['normal', 'urgent', 'critical'].map(u => (
              <button
                key={u}
                onClick={() => setUrgency(u)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  border: urgency === u ? '2px solid' : '1px solid var(--border)',
                  borderColor: urgency === u
                    ? (u === 'critical' ? 'var(--red)' : u === 'urgent' ? 'var(--amber)' : 'var(--accent)')
                    : 'var(--border)',
                  background: urgency === u
                    ? (u === 'critical' ? 'rgba(242,90,90,0.1)' : u === 'urgent' ? 'rgba(245,158,11,0.1)' : 'rgba(79,127,255,0.1)')
                    : 'transparent',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  color: urgency === u
                    ? (u === 'critical' ? 'var(--red)' : u === 'urgent' ? 'var(--amber)' : 'var(--accent)')
                    : 'var(--text3)',
                  textTransform: 'capitalize',
                }}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Needed By */}
        <div style={{ marginBottom: 14 }}>
          <div style={sectionTitle}>Needed By</div>
          <input
            type="date"
            value={neededBy}
            onChange={e => setNeededBy(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <div style={sectionTitle}>Notes</div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Additional notes..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <button
          onClick={submit}
          disabled={submitting || !projectId || items.some(i => !i.name.trim())}
          style={{
            ...btnPrimary,
            opacity: submitting || !projectId ? 0.6 : 1,
            marginBottom: 20,
          }}
        >
          {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ShoppingBag size={16} />}
          Submit Request
        </button>
      </div>
    </div>
  )
}

// ── Report Modal ───────────────────────────────────────────────────────────────
function ReportModal({ orgId, profileId, supabase, onClose, inputStyle, btnPrimary, sectionTitle }: any) {
  const [reportType, setReportType] = useState('daily_summary')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!title.trim() || !content.trim()) return
    setSubmitting(true)
    await supabase.from('shop_reports').insert({
      org_id: orgId,
      created_by: profileId,
      type: reportType,
      title: title.trim(),
      content: content.trim(),
    })
    setSubmitting(false)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)', zIndex: 9999,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', borderRadius: '18px 18px 0 0',
        padding: 20, width: '100%', maxWidth: 500, maxHeight: '85vh', overflowY: 'auto',
        animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }} onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', margin: 0 }}>
            Submit Report
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Type */}
        <div style={{ marginBottom: 14 }}>
          <div style={sectionTitle}>Type</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { value: 'daily_summary', label: 'Daily Summary' },
              { value: 'maintenance', label: 'Maintenance' },
              { value: 'incident', label: 'Incident' },
            ].map(t => (
              <button
                key={t.value}
                onClick={() => setReportType(t.value)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  border: reportType === t.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: reportType === t.value ? 'rgba(79,127,255,0.1)' : 'transparent',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  color: reportType === t.value ? 'var(--accent)' : 'var(--text3)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 14 }}>
          <div style={sectionTitle}>Title</div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Report title..."
            style={inputStyle}
          />
        </div>

        {/* Content */}
        <div style={{ marginBottom: 20 }}>
          <div style={sectionTitle}>Details</div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Describe the report..."
            rows={5}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <button
          onClick={submit}
          disabled={submitting || !title.trim() || !content.trim()}
          style={{
            ...btnPrimary,
            opacity: submitting || !title.trim() || !content.trim() ? 0.6 : 1,
            marginBottom: 20,
          }}
        >
          {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={16} />}
          Submit Report
        </button>
      </div>
    </div>
  )
}

// ── Photo Picker Modal ─────────────────────────────────────────────────────────
function PhotoPickerModal({ assignments, onSelect, onClose, sectionTitle }: any) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)', zIndex: 9999,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', borderRadius: '18px 18px 0 0',
        padding: 20, width: '100%', maxWidth: 500, maxHeight: '70vh', overflowY: 'auto',
        animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }} onClick={(e: any) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', margin: 0 }}>
            Take Photos
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={sectionTitle}>Select a job</div>
        {assignments.filter((a: any) => a.status !== 'completed' && a.status !== 'declined').map((a: any) => (
          <button
            key={a.id}
            onClick={() => onSelect(a.project_id)}
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface2)',
              cursor: 'pointer',
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              textAlign: 'left',
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>
                {a.project?.title || 'Untitled'}
              </div>
              {a.project?.vehicle_desc && (
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                  {a.project.vehicle_desc}
                </div>
              )}
            </div>
            <Camera size={18} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
          </button>
        ))}

        {assignments.filter((a: any) => a.status !== 'completed' && a.status !== 'declined').length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: 13 }}>
            No active jobs to take photos for
          </div>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}

// ── Job Picker Modal ───────────────────────────────────────────────────────────
function JobPickerModal({ assignments, activeTimers, onStart, onClose, sectionTitle }: any) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)', zIndex: 9999,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', borderRadius: '18px 18px 0 0',
        padding: 20, width: '100%', maxWidth: 500, maxHeight: '70vh', overflowY: 'auto',
        animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }} onClick={(e: any) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', margin: 0 }}>
            Start a Job
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={sectionTitle}>Select a job to start</div>
        {assignments.map((a: any) => {
          const timerActive = !!activeTimers[a.project_id]
          return (
            <button
              key={a.id}
              onClick={() => onStart(a)}
              disabled={timerActive}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 10,
                border: timerActive ? '1px solid var(--green)' : '1px solid var(--border)',
                background: timerActive ? 'rgba(34,192,122,0.08)' : 'var(--surface2)',
                cursor: timerActive ? 'default' : 'pointer',
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                textAlign: 'left',
                opacity: timerActive ? 0.7 : 1,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>
                  {a.project?.title || 'Untitled'}
                </div>
                {a.project?.vehicle_desc && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                    {a.project.vehicle_desc}
                  </div>
                )}
              </div>
              {timerActive ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>Running</span>
              ) : (
                <Play size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
              )}
            </button>
          )
        })}

        {assignments.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: 13 }}>
            No available jobs to start
          </div>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}
