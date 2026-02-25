'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Wrench, Check, X, Clock, DollarSign, Calendar, Bell,
  Camera, Upload, Play, Square, Pause, CheckCircle2,
  ChevronRight, Star, TrendingUp, Timer, FileText,
  AlertCircle, Image, Pen, RotateCcw,
} from 'lucide-react'
import type { Profile } from '@/types'
import { useToast } from '@/components/shared/Toast'
import InstallerBidCard from './InstallerBidCard'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface InstallerPortalClientProps {
  profile: Profile
  bids: any[]
  openBids?: any[]
  activeJobs?: any[]
  installSessions?: any[]
}

type MainTab = 'dashboard' | 'bids' | 'schedule' | 'earnings'

interface ChecklistItem {
  id: string
  label: string
  phase: 'pre' | 'during' | 'post'
  checked: boolean
}

interface TimerState {
  jobId: string | null
  sessionId: string | null
  startTime: number | null
  elapsed: number
  paused: boolean
  pausedAt: number | null
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  // Pre-install
  { id: 'pre_1', label: 'Inspect vehicle for existing damage', phase: 'pre', checked: false },
  { id: 'pre_2', label: 'Photograph vehicle (all sides, close-ups)', phase: 'pre', checked: false },
  { id: 'pre_3', label: 'Verify materials match work order', phase: 'pre', checked: false },
  { id: 'pre_4', label: 'Clean vehicle surface thoroughly', phase: 'pre', checked: false },
  { id: 'pre_5', label: 'Remove trim/handles as needed', phase: 'pre', checked: false },
  { id: 'pre_6', label: 'Check environment (temp, dust, humidity)', phase: 'pre', checked: false },
  // During install
  { id: 'dur_1', label: 'Apply wrap panels per design layout', phase: 'during', checked: false },
  { id: 'dur_2', label: 'Post-heat all edges and tucks', phase: 'during', checked: false },
  { id: 'dur_3', label: 'Check alignment on all seams', phase: 'during', checked: false },
  { id: 'dur_4', label: 'Window perf installed (if applicable)', phase: 'during', checked: false },
  { id: 'dur_5', label: 'No bubbles, wrinkles, or lifting', phase: 'during', checked: false },
  // Post-install
  { id: 'post_1', label: 'Reinstall all removed trim/hardware', phase: 'post', checked: false },
  { id: 'post_2', label: 'Final heat pass on all edges', phase: 'post', checked: false },
  { id: 'post_3', label: 'Photograph completed wrap (all sides)', phase: 'post', checked: false },
  { id: 'post_4', label: 'Clean up workspace and vehicle interior', phase: 'post', checked: false },
  { id: 'post_5', label: 'Customer walk-around inspection', phase: 'post', checked: false },
  { id: 'post_6', label: 'Obtain customer signature', phase: 'post', checked: false },
]

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function InstallerPortalClient({
  profile,
  bids: initialBids,
  openBids: initialOpenBids = [],
  activeJobs: initialActiveJobs = [],
  installSessions: initialSessions = [],
}: InstallerPortalClientProps) {
  const supabase = createClient()
  const { xpToast, badgeToast } = useToast()

  // Data state
  const [bids, setBids] = useState<any[]>(initialBids)
  const [openBids, setOpenBids] = useState<any[]>(initialOpenBids)
  const [activeJobs, setActiveJobs] = useState<any[]>(initialActiveJobs)
  const [newBidAlert, setNewBidAlert] = useState(false)

  // UI state
  const [mainTab, setMainTab] = useState<MainTab>('dashboard')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  // Time clock
  const [timer, setTimer] = useState<TimerState>({
    jobId: null, sessionId: null, startTime: null, elapsed: 0, paused: false, pausedAt: null,
  })
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Checklists keyed by job ID
  const [checklists, setChecklists] = useState<Record<string, ChecklistItem[]>>({})

  // Photo upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [jobPhotos, setJobPhotos] = useState<Record<string, any[]>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoPhase, setPhotoPhase] = useState<'before' | 'during' | 'after'>('before')

  // Signature
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [signatureSubmitting, setSignatureSubmitting] = useState(false)

  // Earnings data
  const [earningsPeriod, setEarningsPeriod] = useState<'week' | 'month' | 'all'>('week')

  // Categorize bids
  const pendingBids = bids.filter(b => b.status === 'pending')
  const acceptedBids = bids.filter(b => b.status === 'accepted')
  const historyBids = bids.filter(b => b.status === 'declined' || b.status === 'completed')

  /* ---------------------------------------------------------------- */
  /*  Realtime subscriptions                                           */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const channel = supabase
      .channel('installer-portal-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'installer_bids',
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Record<string, unknown>
          if (updated.installer_id === profile.id) {
            setBids(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b))
          }
          if (updated.status !== 'open') {
            setOpenBids(prev => prev.filter(b => b.id !== updated.id))
          }
        } else if (payload.eventType === 'INSERT') {
          const newBid = payload.new as Record<string, unknown>
          if (newBid.status === 'open') {
            setNewBidAlert(true)
            setTimeout(() => setNewBidAlert(false), 5000)
          }
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile.id])

  /* ---------------------------------------------------------------- */
  /*  Load active jobs                                                  */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const loadJobs = async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, title, vehicle_desc, form_data, fin_data, install_date, pipe_stage, status, checkout')
        .eq('installer_id', profile.id)
        .in('pipe_stage', ['install', 'prod_review', 'sales_close', 'done'])
        .order('install_date', { ascending: true, nullsFirst: false })
      if (data) setActiveJobs(data)
    }
    if (initialActiveJobs.length === 0) loadJobs()
  }, [profile.id])

  /* ---------------------------------------------------------------- */
  /*  Load photos for selected job                                      */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!selectedJobId) return
    const loadPhotos = async () => {
      const { data } = await supabase
        .from('job_images')
        .select('*')
        .eq('project_id', selectedJobId)
        .order('created_at', { ascending: false })
      if (data) setJobPhotos(prev => ({ ...prev, [selectedJobId]: data }))
    }
    loadPhotos()
  }, [selectedJobId])

  /* ---------------------------------------------------------------- */
  /*  Timer logic                                                       */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (timer.startTime && !timer.paused) {
      timerRef.current = setInterval(() => {
        setTimer(prev => ({
          ...prev,
          elapsed: Math.floor((Date.now() - (prev.startTime || Date.now())) / 1000),
        }))
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [timer.startTime, timer.paused])

  const startTimer = async (jobId: string) => {
    const now = Date.now()
    const { data } = await supabase.from('install_sessions').insert({
      org_id: profile.org_id,
      project_id: jobId,
      installer_id: profile.id,
      start_time: new Date(now).toISOString(),
      status: 'active',
    }).select().single()

    setTimer({
      jobId,
      sessionId: data?.id || null,
      startTime: now,
      elapsed: 0,
      paused: false,
      pausedAt: null,
    })
    setSelectedJobId(jobId)
  }

  const pauseTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimer(prev => ({ ...prev, paused: true, pausedAt: Date.now() }))
  }

  const resumeTimer = () => {
    const pauseDuration = timer.pausedAt ? Date.now() - timer.pausedAt : 0
    setTimer(prev => ({
      ...prev,
      paused: false,
      pausedAt: null,
      startTime: (prev.startTime || Date.now()) + pauseDuration,
    }))
  }

  const stopTimer = async () => {
    if (timer.sessionId) {
      const hours = timer.elapsed / 3600
      await supabase.from('install_sessions').update({
        end_time: new Date().toISOString(),
        duration_hours: parseFloat(hours.toFixed(2)),
        status: 'completed',
      }).eq('id', timer.sessionId)
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setTimer({ jobId: null, sessionId: null, startTime: null, elapsed: 0, paused: false, pausedAt: null })
  }

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  /* ---------------------------------------------------------------- */
  /*  Checklist logic                                                   */
  /* ---------------------------------------------------------------- */

  const getChecklist = (jobId: string): ChecklistItem[] => {
    if (!checklists[jobId]) {
      setChecklists(prev => ({ ...prev, [jobId]: DEFAULT_CHECKLIST.map(c => ({ ...c })) }))
      return DEFAULT_CHECKLIST
    }
    return checklists[jobId]
  }

  const toggleChecklistItem = (jobId: string, itemId: string) => {
    setChecklists(prev => ({
      ...prev,
      [jobId]: (prev[jobId] || DEFAULT_CHECKLIST).map(c =>
        c.id === itemId ? { ...c, checked: !c.checked } : c
      ),
    }))
  }

  /* ---------------------------------------------------------------- */
  /*  Photo upload                                                      */
  /* ---------------------------------------------------------------- */

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !selectedJobId) return
    setUploadingPhoto(true)

    const file = e.target.files[0]
    const ext = file.name.split('.').pop()
    const fileName = `${selectedJobId}/${photoPhase}_${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(fileName, file, { contentType: file.type })

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(fileName)

      await supabase.from('job_images').insert({
        project_id: selectedJobId,
        org_id: profile.org_id,
        uploaded_by: profile.id,
        image_url: urlData.publicUrl,
        storage_path: fileName,
        category: photoPhase,
        file_name: file.name,
        mime_type: file.type,
      })

      // Reload photos
      const { data: photos } = await supabase
        .from('job_images')
        .select('*')
        .eq('project_id', selectedJobId)
        .order('created_at', { ascending: false })
      if (photos) setJobPhotos(prev => ({ ...prev, [selectedJobId]: photos }))

      // XP award
      fetch('/api/xp/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install_photo', sourceType: 'job_image', sourceId: selectedJobId }),
      })
        .then(r => r.ok ? r.json() : null)
        .then((res: { amount?: number; leveledUp?: boolean; newLevel?: number; newBadges?: string[] } | null) => {
          if (res?.amount) xpToast(res.amount, 'Photo uploaded', res.leveledUp, res.newLevel)
          if (res?.newBadges?.length) badgeToast(res.newBadges)
        })
        .catch(() => {})
    }

    setUploadingPhoto(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /* ---------------------------------------------------------------- */
  /*  Signature pad                                                     */
  /* ---------------------------------------------------------------- */

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#e8eaed'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  useEffect(() => {
    initCanvas()
  }, [initCanvas, mainTab, selectedJobId])

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    }
  }

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDrawing(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getCanvasCoords(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getCanvasCoords(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const endDraw = () => {
    setIsDrawing(false)
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL('image/png'))
    }
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureData(null)
    initCanvas()
  }

  const submitSignature = async () => {
    if (!signatureData || !selectedJobId) return
    setSignatureSubmitting(true)

    // Convert data URL to blob
    const res = await fetch(signatureData)
    const blob = await res.blob()
    const fileName = `${selectedJobId}/signature_${Date.now()}.png`

    await supabase.storage.from('project-files').upload(fileName, blob, { contentType: 'image/png' })

    const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(fileName)

    await supabase.from('job_images').insert({
      project_id: selectedJobId,
      org_id: profile.org_id,
      uploaded_by: profile.id,
      url: urlData.publicUrl,
      bucket_path: fileName,
      phase: 'signature',
      file_name: 'customer_signature.png',
      file_type: 'image/png',
    })

    // Update project checkout
    await supabase.from('projects').update({
      checkout: { customer_signed: true, signed_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }).eq('id', selectedJobId)

    setSignatureSubmitting(false)
    clearSignature()

    // XP award
    fetch('/api/xp/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'customer_signoff', sourceType: 'project', sourceId: selectedJobId }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((xpRes: { amount?: number; leveledUp?: boolean; newLevel?: number; newBadges?: string[] } | null) => {
        if (xpRes?.amount) xpToast(xpRes.amount, 'Customer signed off', xpRes.leveledUp, xpRes.newLevel)
        if (xpRes?.newBadges?.length) badgeToast(xpRes.newBadges)
      })
      .catch(() => {})
  }

  /* ---------------------------------------------------------------- */
  /*  Bid handlers                                                      */
  /* ---------------------------------------------------------------- */

  const handleBidAccept = async (bidId: string, amount: number, date: string) => {
    const { error } = await supabase.from('installer_bids').update({
      status: 'accepted',
      bid_amount: amount,
      available_date: date,
      updated_at: new Date().toISOString(),
    }).eq('id', bidId)

    if (!error) {
      setBids(prev => prev.map(b =>
        b.id === bidId ? { ...b, status: 'accepted', bid_amount: amount, available_date: date } : b
      ))
      setOpenBids(prev => prev.filter(b => b.id !== bidId))

      fetch('/api/xp/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'installer_bid', sourceType: 'installer_bid', sourceId: bidId }),
      })
        .then(r => r.ok ? r.json() : null)
        .then((res: { amount?: number; leveledUp?: boolean; newLevel?: number; newBadges?: string[] } | null) => {
          if (res?.amount) xpToast(res.amount, 'Bid accepted', res.leveledUp, res.newLevel)
          if (res?.newBadges?.length) badgeToast(res.newBadges)
        })
        .catch(() => {})
    }
  }

  const handleBidDecline = async (bidId: string, reason: string) => {
    const { error } = await supabase.from('installer_bids').update({
      status: 'declined',
      notes: reason,
      updated_at: new Date().toISOString(),
    }).eq('id', bidId)

    if (!error) {
      setBids(prev => prev.map(b =>
        b.id === bidId ? { ...b, status: 'declined', notes: reason } : b
      ))
      setOpenBids(prev => prev.filter(b => b.id !== bidId))
    }
  }

  const handleBidCounter = async (bidId: string, amount: number, note: string) => {
    const { error } = await supabase.from('installer_bids').update({
      status: 'counter',
      bid_amount: amount,
      notes: note || null,
      updated_at: new Date().toISOString(),
    }).eq('id', bidId)

    if (!error) {
      setBids(prev => prev.map(b =>
        b.id === bidId ? { ...b, status: 'counter', bid_amount: amount, notes: note } : b
      ))
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Earnings calculations                                             */
  /* ---------------------------------------------------------------- */

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3600000)

  const completedJobs = activeJobs.filter(j => j.pipe_stage === 'done' || j.pipe_stage === 'sales_close' || j.pipe_stage === 'prod_review')

  const getEarnings = (jobs: any[]) => {
    return jobs.reduce((sum, j) => {
      const fin = (j.fin_data || {}) as Record<string, number>
      return sum + (fin.labor || fin.install_pay || 0)
    }, 0)
  }

  const getHours = (jobs: any[]) => {
    return jobs.reduce((sum, j) => {
      const fin = (j.fin_data || {}) as Record<string, number>
      return sum + (fin.laborHrs || fin.hours || 0)
    }, 0)
  }

  const totalEarnings = getEarnings(completedJobs)
  const totalHours = getHours(completedJobs)
  const installStageJobs = activeJobs.filter(j => j.pipe_stage === 'install')
  const pendingPay = getEarnings(installStageJobs)

  // Today's schedule
  const today = new Date().toISOString().split('T')[0]
  const todayJobs = activeJobs.filter(j => {
    if (!j.install_date) return false
    return j.install_date.startsWith(today)
  })

  /* ---------------------------------------------------------------- */
  /*  Format helpers                                                    */
  /* ---------------------------------------------------------------- */

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'TBD'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatDateShort = (dateStr: string | null) => {
    if (!dateStr) return 'TBD'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const fMoney = (n: number) => `$${Math.round(n).toLocaleString()}`

  /* ---------------------------------------------------------------- */
  /*  Main tab config                                                   */
  /* ---------------------------------------------------------------- */

  const mainTabs: { key: MainTab; label: string; count?: number }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'bids', label: 'Bids', count: openBids.length + pendingBids.length },
    { key: 'schedule', label: 'Jobs', count: installStageJobs.length },
    { key: 'earnings', label: 'Earnings' },
  ]

  /* ---------------------------------------------------------------- */
  /*  Selected job helper                                               */
  /* ---------------------------------------------------------------- */

  const selectedJob = selectedJobId ? activeJobs.find(j => j.id === selectedJobId) : null
  const selectedJobFd = selectedJob ? ((selectedJob.form_data || {}) as Record<string, string>) : {}
  const selectedJobFin = selectedJob ? ((selectedJob.fin_data || {}) as Record<string, number>) : {}
  const selectedJobChecklist = selectedJobId ? getChecklist(selectedJobId) : []
  const selectedJobPhotos = selectedJobId ? (jobPhotos[selectedJobId] || []) : []

  /* ---------------------------------------------------------------- */
  /*  RENDER                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div>
      {/* New bid alert */}
      {newBidAlert && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', marginBottom: 16,
          background: 'rgba(34,192,122,0.12)', border: '1px solid rgba(34,192,122,0.3)',
          borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#22c07a',
        }}>
          <Bell size={15} />
          New bid opportunity available!
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(79,127,255,0.15), rgba(34,211,238,0.15))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Wrench size={22} color="var(--accent)" />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 26, fontWeight: 900, color: 'var(--text1)', margin: 0,
          }}>
            Installer Portal
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            {profile.name} -- {todayJobs.length > 0 ? `${todayJobs.length} job${todayJobs.length > 1 ? 's' : ''} today` : 'No jobs today'}
          </div>
        </div>

        {/* Active timer indicator */}
        {timer.startTime && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 10,
            background: timer.paused ? 'rgba(245,158,11,0.12)' : 'rgba(34,192,122,0.12)',
            border: `1px solid ${timer.paused ? 'rgba(245,158,11,0.3)' : 'rgba(34,192,122,0.3)'}`,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: timer.paused ? 'var(--amber)' : 'var(--green)',
              animation: timer.paused ? 'none' : 'pulse 2s infinite',
            }} />
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 15, fontWeight: 700,
              color: timer.paused ? 'var(--amber)' : 'var(--green)',
            }}>
              {formatTimer(timer.elapsed)}
            </span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard label="Active Jobs" value={installStageJobs.length.toString()} color="var(--cyan)" icon={<Wrench size={14} />} />
        <StatCard label="Pending Bids" value={(openBids.length + pendingBids.length).toString()} color="var(--amber)" icon={<Clock size={14} />} />
        <StatCard label="Completed" value={completedJobs.length.toString()} color="var(--green)" icon={<CheckCircle2 size={14} />} />
        <StatCard label="Total Earned" value={fMoney(totalEarnings)} color="var(--green)" icon={<DollarSign size={14} />} />
      </div>

      {/* Main Tab Bar */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20, padding: 4,
        background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)',
      }}>
        {mainTabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setMainTab(t.key); setSelectedJobId(null) }}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: mainTab === t.key ? 800 : 600,
              background: mainTab === t.key ? 'rgba(79,127,255,0.1)' : 'transparent',
              color: mainTab === t.key ? 'var(--accent)' : 'var(--text3)',
              fontFamily: 'Barlow Condensed, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                background: mainTab === t.key ? 'var(--accent)' : 'var(--surface2)',
                color: mainTab === t.key ? '#fff' : 'var(--text3)',
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  DASHBOARD TAB                                                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {mainTab === 'dashboard' && !selectedJobId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Today's Schedule */}
          <SectionHeader icon={<Calendar size={15} />} title="Today's Schedule" color="var(--accent)" />
          {todayJobs.length === 0 ? (
            <EmptyState icon={<Calendar size={28} />} message="No jobs scheduled for today." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayJobs.map(job => {
                const jfd = (job.form_data || {}) as Record<string, string>
                const jfin = (job.fin_data || {}) as Record<string, number>
                const isTimerActive = timer.jobId === job.id
                return (
                  <div key={job.id} style={{
                    background: isTimerActive ? 'rgba(34,192,122,0.06)' : 'var(--surface)',
                    border: `1px solid ${isTimerActive ? 'rgba(34,192,122,0.25)' : 'var(--border)'}`,
                    borderRadius: 12, padding: '14px 18px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer',
                  }} onClick={() => setSelectedJobId(job.id)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif' }}>
                        {jfd.client || job.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                        {jfd.vehicle || job.vehicle_desc || '--'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>
                          ${jfin.labor || 0}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{jfin.laborHrs || 0}h est</div>
                      </div>
                      <ChevronRight size={16} color="var(--text3)" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Active Jobs */}
          {installStageJobs.length > 0 && (
            <>
              <SectionHeader icon={<Wrench size={15} />} title={`Active Jobs (${installStageJobs.length})`} color="var(--cyan)" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {installStageJobs.map(job => {
                  const jfd = (job.form_data || {}) as Record<string, string>
                  const jfin = (job.fin_data || {}) as Record<string, number>
                  return (
                    <div key={job.id} style={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '12px 16px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer',
                    }} onClick={() => setSelectedJobId(job.id)}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                          {jfd.client || job.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {jfd.vehicle || job.vehicle_desc} -- {formatDateShort(job.install_date)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                          ${jfin.labor || 0}
                        </span>
                        <ChevronRight size={14} color="var(--text3)" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Quick Bid Summary */}
          {(openBids.length > 0 || pendingBids.length > 0) && (
            <>
              <SectionHeader icon={<Bell size={15} />} title="Pending Bids" color="var(--amber)" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...openBids.slice(0, 3), ...pendingBids.slice(0, 3)].map(bid => {
                  const proj = bid.project as any
                  const bfd = (proj?.form_data || {}) as Record<string, string>
                  return (
                    <div key={bid.id} style={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '12px 16px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer',
                    }} onClick={() => setMainTab('bids')}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                          {bfd.client || proj?.title || 'Open Job'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {bfd.vehicle || proj?.vehicle_desc}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 6,
                        background: bid.status === 'open' ? 'rgba(34,211,238,0.12)' : 'rgba(245,158,11,0.12)',
                        color: bid.status === 'open' ? 'var(--cyan)' : 'var(--amber)',
                      }}>
                        {bid.status === 'open' ? 'Open' : 'Pending'}
                      </span>
                    </div>
                  )
                })}
                {(openBids.length + pendingBids.length > 6) && (
                  <button onClick={() => setMainTab('bids')} style={{
                    padding: '8px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--accent)', fontSize: 12,
                    fontWeight: 700, cursor: 'pointer', textAlign: 'center',
                  }}>
                    View all bids
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  JOB DETAIL VIEW (from dashboard click)                         */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {(mainTab === 'dashboard' || mainTab === 'schedule') && selectedJobId && selectedJob && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Back button */}
          <button onClick={() => setSelectedJobId(null)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: 'var(--accent)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0,
          }}>
            <RotateCcw size={13} /> Back to list
          </button>

          {/* Job Header Card */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '18px 22px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontSize: 22, fontWeight: 900, color: 'var(--text1)',
                }}>
                  {selectedJobFd.client || selectedJob.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
                  {selectedJobFd.vehicle || selectedJob.vehicle_desc}
                </div>
              </div>
              <StagePill stage={selectedJob.pipe_stage} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <MiniStat label="Pay" value={`$${selectedJobFin.labor || 0}`} color="var(--green)" />
              <MiniStat label="Est Hours" value={`${selectedJobFin.laborHrs || selectedJobFin.hours || 0}h`} color="var(--cyan)" />
              <MiniStat label="Install Date" value={formatDateShort(selectedJob.install_date)} color="var(--accent)" />
              <MiniStat label="Type" value={selectedJobFd.wrapDetail || selectedJobFd.wrap_type || 'Wrap'} color="var(--purple)" />
            </div>
          </div>

          {/* Time Clock */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '18px 22px',
          }}>
            <SectionHeader icon={<Timer size={15} />} title="Time Clock" color="var(--cyan)" />
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 20, padding: '20px 0',
            }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 40, fontWeight: 900,
                color: timer.jobId === selectedJobId
                  ? timer.paused ? 'var(--amber)' : 'var(--green)'
                  : 'var(--text3)',
                letterSpacing: '0.05em',
              }}>
                {timer.jobId === selectedJobId ? formatTimer(timer.elapsed) : '00:00:00'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              {!timer.startTime || timer.jobId !== selectedJobId ? (
                <button onClick={() => startTimer(selectedJobId)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 32px', borderRadius: 10, border: 'none',
                  background: 'var(--green)', color: '#0d1a10',
                  fontSize: 14, fontWeight: 800, cursor: 'pointer',
                }}>
                  <Play size={16} /> Start Clock
                </button>
              ) : (
                <>
                  {!timer.paused ? (
                    <button onClick={pauseTimer} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '12px 24px', borderRadius: 10, border: 'none',
                      background: 'var(--amber)', color: '#1a1400',
                      fontSize: 14, fontWeight: 800, cursor: 'pointer',
                    }}>
                      <Pause size={16} /> Pause
                    </button>
                  ) : (
                    <button onClick={resumeTimer} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '12px 24px', borderRadius: 10, border: 'none',
                      background: 'var(--green)', color: '#0d1a10',
                      fontSize: 14, fontWeight: 800, cursor: 'pointer',
                    }}>
                      <Play size={16} /> Resume
                    </button>
                  )}
                  <button onClick={stopTimer} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '12px 24px', borderRadius: 10, border: 'none',
                    background: 'var(--red)', color: '#fff',
                    fontSize: 14, fontWeight: 800, cursor: 'pointer',
                  }}>
                    <Square size={16} /> Stop
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Install Checklist */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '18px 22px',
          }}>
            <SectionHeader icon={<CheckCircle2 size={15} />} title="Install Checklist" color="var(--green)" />
            {(['pre', 'during', 'post'] as const).map(phase => {
              const items = selectedJobChecklist.filter(c => c.phase === phase)
              const completed = items.filter(c => c.checked).length
              const phaseLabels = { pre: 'Pre-Install', during: 'During Install', post: 'Post-Install' }
              const phaseColors = { pre: 'var(--accent)', during: 'var(--cyan)', post: 'var(--green)' }

              return (
                <div key={phase} style={{ marginTop: 14 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 8,
                  }}>
                    <span style={{
                      fontSize: 11, fontWeight: 900, color: phaseColors[phase],
                      textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                    }}>
                      {phaseLabels[phase]}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: 'var(--text3)',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>
                      {completed}/{items.length}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{
                    height: 4, background: 'var(--surface2)', borderRadius: 2,
                    marginBottom: 8, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${items.length > 0 ? (completed / items.length) * 100 : 0}%`,
                      background: phaseColors[phase],
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {items.map(item => (
                      <label key={item.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderRadius: 8,
                        background: item.checked ? 'rgba(34,192,122,0.06)' : 'var(--surface2)',
                        border: `1px solid ${item.checked ? 'rgba(34,192,122,0.15)' : 'transparent'}`,
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}>
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleChecklistItem(selectedJobId, item.id)}
                          style={{ width: 18, height: 18, accentColor: '#22c07a', cursor: 'pointer' }}
                        />
                        <span style={{
                          fontSize: 13, fontWeight: item.checked ? 600 : 500,
                          color: item.checked ? 'var(--green)' : 'var(--text2)',
                          textDecoration: item.checked ? 'line-through' : 'none',
                        }}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Photo Capture */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '18px 22px',
          }}>
            <SectionHeader icon={<Camera size={15} />} title="Job Photos" color="var(--purple)" />

            {/* Phase selector */}
            <div style={{ display: 'flex', gap: 6, marginTop: 12, marginBottom: 14 }}>
              {(['before', 'during', 'after'] as const).map(p => (
                <button key={p} onClick={() => setPhotoPhase(p)} style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: photoPhase === p ? 800 : 600,
                  background: photoPhase === p ? 'rgba(139,92,246,0.12)' : 'var(--surface2)',
                  color: photoPhase === p ? 'var(--purple)' : 'var(--text3)',
                  textTransform: 'capitalize' as const,
                }}>
                  {p}
                </button>
              ))}
            </div>

            {/* Upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '14px', borderRadius: 10,
              border: '2px dashed var(--border)', background: 'var(--surface2)',
              color: 'var(--text2)', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', marginBottom: 14,
            }}>
              {uploadingPhoto ? (
                <><Upload size={16} /> Uploading...</>
              ) : (
                <><Camera size={16} /> Capture {photoPhase} Photo</>
              )}
            </button>

            {/* Photo grid */}
            {selectedJobPhotos.length > 0 && (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
              }}>
                {selectedJobPhotos.map((photo: any) => (
                  <div key={photo.id} style={{
                    position: 'relative', paddingBottom: '100%',
                    borderRadius: 8, overflow: 'hidden',
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                  }}>
                    {photo.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.url}
                        alt={photo.file_name || 'Job photo'}
                        style={{
                          position: 'absolute', inset: 0,
                          width: '100%', height: '100%', objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Image size={20} color="var(--text3)" />
                      </div>
                    )}
                    {photo.phase && (
                      <span style={{
                        position: 'absolute', bottom: 4, left: 4,
                        fontSize: 9, fontWeight: 800, padding: '2px 6px',
                        borderRadius: 4, background: 'rgba(0,0,0,0.7)', color: '#fff',
                        textTransform: 'capitalize' as const,
                      }}>
                        {photo.phase}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedJobPhotos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12, color: 'var(--text3)' }}>
                No photos uploaded yet for this job.
              </div>
            )}
          </div>

          {/* Digital Signature Pad */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '18px 22px',
          }}>
            <SectionHeader icon={<Pen size={15} />} title="Customer Sign-Off" color="var(--accent)" />
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8, marginBottom: 14 }}>
              Have the customer sign below to confirm they approve the completed wrap installation.
            </div>

            <div style={{
              border: '2px solid var(--border)', borderRadius: 10,
              background: 'var(--surface2)', overflow: 'hidden', marginBottom: 12,
              position: 'relative',
            }}>
              <canvas
                ref={canvasRef}
                width={500}
                height={180}
                style={{
                  width: '100%', height: 180, cursor: 'crosshair',
                  touchAction: 'none',
                }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              {!signatureData && (
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: 'var(--text3)', fontSize: 13, pointerEvents: 'none',
                  opacity: 0.5,
                }}>
                  Sign here
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={clearSignature} style={{
                padding: '10px 20px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text3)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <RotateCcw size={13} /> Clear
              </button>
              <button onClick={submitSignature} disabled={!signatureData || signatureSubmitting} style={{
                flex: 1, padding: '10px 20px', borderRadius: 8, border: 'none',
                background: signatureData ? 'var(--green)' : 'var(--surface2)',
                color: signatureData ? '#0d1a10' : 'var(--text3)',
                fontSize: 13, fontWeight: 800, cursor: signatureData ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Check size={14} />
                {signatureSubmitting ? 'Submitting...' : 'Submit Customer Signature'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  BIDS TAB                                                       */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {mainTab === 'bids' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Open Bids */}
          {openBids.length > 0 && (
            <>
              <SectionHeader icon={<Bell size={15} />} title={`Open Bids (${openBids.length})`} color="var(--cyan)" />
              {openBids.map(bid => (
                <InstallerBidCard
                  key={bid.id}
                  bid={bid}
                  profileId={profile.id}
                  onAccept={handleBidAccept}
                  onDecline={handleBidDecline}
                  onCounterOffer={handleBidCounter}
                />
              ))}
            </>
          )}

          {/* Pending Bids */}
          {pendingBids.length > 0 && (
            <>
              <SectionHeader icon={<Clock size={15} />} title={`Pending (${pendingBids.length})`} color="var(--amber)" />
              {pendingBids.map(bid => (
                <InstallerBidCard
                  key={bid.id}
                  bid={bid}
                  profileId={profile.id}
                  onAccept={handleBidAccept}
                  onDecline={handleBidDecline}
                  onCounterOffer={handleBidCounter}
                />
              ))}
            </>
          )}

          {/* Accepted Bids */}
          {acceptedBids.length > 0 && (
            <>
              <SectionHeader icon={<CheckCircle2 size={15} />} title={`Accepted (${acceptedBids.length})`} color="var(--green)" />
              {acceptedBids.map(bid => (
                <InstallerBidCard key={bid.id} bid={bid} profileId={profile.id} />
              ))}
            </>
          )}

          {/* History */}
          {historyBids.length > 0 && (
            <>
              <SectionHeader icon={<FileText size={15} />} title={`History (${historyBids.length})`} color="var(--text3)" />
              {historyBids.map(bid => (
                <InstallerBidCard key={bid.id} bid={bid} profileId={profile.id} compact />
              ))}
            </>
          )}

          {/* Empty state */}
          {openBids.length === 0 && pendingBids.length === 0 && acceptedBids.length === 0 && historyBids.length === 0 && (
            <EmptyState icon={<Wrench size={28} />} message="No bids yet. Bids will appear here when jobs become available." />
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  SCHEDULE / JOBS TAB                                            */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {mainTab === 'schedule' && !selectedJobId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Active (install stage) */}
          {installStageJobs.length > 0 && (
            <>
              <SectionHeader icon={<Wrench size={15} />} title={`In Progress (${installStageJobs.length})`} color="var(--cyan)" />
              {installStageJobs.map(job => {
                const jfd = (job.form_data || {}) as Record<string, string>
                const jfin = (job.fin_data || {}) as Record<string, number>
                const isTimerActive = timer.jobId === job.id
                return (
                  <div key={job.id} onClick={() => setSelectedJobId(job.id)} style={{
                    background: isTimerActive ? 'rgba(34,192,122,0.06)' : 'var(--surface)',
                    border: `1px solid ${isTimerActive ? 'rgba(34,192,122,0.25)' : 'var(--border)'}`,
                    borderRadius: 12, padding: '14px 18px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer',
                  }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif' }}>
                        {jfd.client || job.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                        {jfd.vehicle || job.vehicle_desc} -- {formatDateShort(job.install_date)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {isTimerActive && (
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700,
                          color: timer.paused ? 'var(--amber)' : 'var(--green)',
                        }}>
                          {formatTimer(timer.elapsed)}
                        </span>
                      )}
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                        ${jfin.labor || 0}
                      </span>
                      <ChevronRight size={14} color="var(--text3)" />
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* Completed Jobs */}
          {completedJobs.length > 0 && (
            <>
              <SectionHeader icon={<CheckCircle2 size={15} />} title={`Completed (${completedJobs.length})`} color="var(--green)" />
              {completedJobs.map(job => {
                const jfd = (job.form_data || {}) as Record<string, string>
                const jfin = (job.fin_data || {}) as Record<string, number>
                return (
                  <div key={job.id} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '12px 16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                        {jfd.client || job.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {jfd.vehicle || job.vehicle_desc}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                        ${jfin.labor || 0}
                      </span>
                      <StagePill stage={job.pipe_stage} />
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {activeJobs.length === 0 && (
            <EmptyState icon={<Wrench size={28} />} message="No jobs assigned yet. Accept a bid to get started." />
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  EARNINGS TAB                                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {mainTab === 'earnings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Period selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            {(['week', 'month', 'all'] as const).map(p => (
              <button key={p} onClick={() => setEarningsPeriod(p)} style={{
                padding: '6px 16px', borderRadius: 8, cursor: 'pointer',
                fontSize: 12, fontWeight: earningsPeriod === p ? 800 : 600,
                border: earningsPeriod === p ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: earningsPeriod === p ? 'rgba(79,127,255,0.12)' : 'transparent',
                color: earningsPeriod === p ? 'var(--accent)' : 'var(--text3)',
                fontFamily: 'Barlow Condensed, sans-serif',
                textTransform: 'uppercase' as const, letterSpacing: '0.04em',
              }}>
                {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Earnings Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(34,192,122,0.1), rgba(34,192,122,0.05))',
              border: '1px solid rgba(34,192,122,0.25)', borderRadius: 14, padding: '18px 20px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>
                Total Earned
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 900,
                color: 'var(--green)', marginTop: 4,
              }}>
                {fMoney(totalEarnings)}
              </div>
            </div>
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '18px 20px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>
                Total Hours
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 900,
                color: 'var(--cyan)', marginTop: 4,
              }}>
                {Math.round(totalHours)}h
              </div>
            </div>
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '18px 20px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>
                Avg $/Hr
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 900,
                color: 'var(--text1)', marginTop: 4,
              }}>
                ${totalHours > 0 ? Math.round(totalEarnings / totalHours) : 0}
              </div>
            </div>
          </div>

          {/* Additional stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <StatCard label="Jobs Completed" value={completedJobs.length.toString()} color="var(--green)" icon={<CheckCircle2 size={14} />} />
            <StatCard label="Pending Pay" value={fMoney(pendingPay)} color="var(--amber)" icon={<Clock size={14} />} />
            <StatCard label="Avg Per Job" value={completedJobs.length > 0 ? fMoney(totalEarnings / completedJobs.length) : '$0'} color="var(--accent)" icon={<TrendingUp size={14} />} />
          </div>

          {/* Completed Jobs List */}
          <SectionHeader icon={<DollarSign size={15} />} title="Completed Jobs" color="var(--green)" />
          {completedJobs.length === 0 ? (
            <EmptyState icon={<DollarSign size={28} />} message="No completed jobs yet. Earnings will show here after jobs are done." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {completedJobs.map(job => {
                const jfd = (job.form_data || {}) as Record<string, string>
                const jfin = (job.fin_data || {}) as Record<string, number>
                return (
                  <div key={job.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', background: 'var(--surface)',
                    border: '1px solid var(--border)', borderRadius: 10,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                        {jfd.client || job.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {jfd.vehicle || job.vehicle_desc} -- {formatDateShort(job.install_date)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>
                          ${jfin.labor || 0}
                        </div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text3)' }}>
                          {jfin.laborHrs || jfin.hours || 0}h
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '14px 16px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
        fontSize: 10, fontWeight: 900, color: 'var(--text3)',
        textTransform: 'uppercase' as const, letterSpacing: '.06em',
      }}>
        {icon && <span style={{ color }}>{icon}</span>}
        {label}
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 20, fontWeight: 800, color,
      }}>
        {value}
      </div>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{
        fontSize: 9, fontWeight: 900, color: 'var(--text3)',
        textTransform: 'uppercase' as const, letterSpacing: '.06em',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 14, fontWeight: 700, color, marginTop: 2,
      }}>
        {value}
      </div>
    </div>
  )
}

function SectionHeader({ icon, title, color }: { icon: React.ReactNode; title: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <span style={{ color }}>{icon}</span>
      <span style={{
        fontSize: 13, fontWeight: 900, color: 'var(--text1)',
        fontFamily: 'Barlow Condensed, sans-serif',
        letterSpacing: '.02em',
      }}>
        {title}
      </span>
    </div>
  )
}

function StagePill({ stage }: { stage: string }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    install:     { bg: 'rgba(34,211,238,0.12)',  color: '#22d3ee', label: 'Install' },
    prod_review: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'QC' },
    sales_close: { bg: 'rgba(139,92,246,0.12)',  color: '#8b5cf6', label: 'Closing' },
    done:        { bg: 'rgba(34,192,122,0.12)',   color: '#22c07a', label: 'Done' },
  }
  const c = config[stage] || { bg: 'var(--surface2)', color: 'var(--text3)', label: stage }
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: '3px 10px',
      borderRadius: 6, background: c.bg, color: c.color,
    }}>
      {c.label}
    </span>
  )
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div style={{
      padding: 40, textAlign: 'center',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12,
    }}>
      <div style={{ color: 'var(--text3)', opacity: 0.5, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 13, color: 'var(--text3)' }}>{message}</div>
    </div>
  )
}
