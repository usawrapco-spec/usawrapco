'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Clock, Play, Pause, Square, Camera, CheckCircle2,
  ChevronRight, Calendar, Timer, Car, User,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface InstallerDashboardProps {
  profile: { id: string; name: string; role: string; org_id: string }
  jobs: Array<{
    id: string
    title: string
    customer_id: string | null
    vehicle_desc: string | null
    install_date: string | null
    status: string
    pipe_stage: string
    customer?: { id: string; name: string }
  }>
  timeEntries: Array<{
    id: string
    job_id: string
    started_at: string
    ended_at: string | null
    duration_minutes: number | null
    notes: string | null
  }>
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STAGE_PROGRESS: Record<string, number> = {
  sales_in: 20,
  production: 40,
  install: 60,
  prod_review: 80,
  sales_close: 90,
  done: 100,
}

const STAGE_LABELS: Record<string, string> = {
  sales_in: 'Sales',
  production: 'Production',
  install: 'Install',
  prod_review: 'QC Review',
  sales_close: 'Closing',
  done: 'Complete',
}

function getStageColor(stage: string): string {
  switch (stage) {
    case 'sales_in': return 'var(--accent)'
    case 'production': return 'var(--purple)'
    case 'install': return 'var(--cyan)'
    case 'prod_review': return 'var(--amber)'
    case 'sales_close': return 'var(--accent)'
    case 'done': return 'var(--green)'
    default: return 'var(--text3)'
  }
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTimeOnly(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
}

function isThisWeek(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)
  return d >= startOfWeek && d < endOfWeek
}

function getServiceType(title: string): string {
  const lower = title.toLowerCase()
  if (lower.includes('full wrap')) return 'Full Wrap'
  if (lower.includes('partial')) return 'Partial Wrap'
  if (lower.includes('decal')) return 'Decals'
  if (lower.includes('ppf')) return 'PPF'
  if (lower.includes('color change')) return 'Color Change'
  if (lower.includes('lettering')) return 'Lettering'
  return 'Wrap Install'
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function InstallerDashboardClient({
  profile,
  jobs: initialJobs,
  timeEntries: initialTimeEntries,
}: InstallerDashboardProps) {
  const supabase = createClient()
  const router = useRouter()

  // Data
  const [jobs, setJobs] = useState(initialJobs)
  const [timeEntries, setTimeEntries] = useState(initialTimeEntries)

  // Expanded job detail
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null)

  // Timer state
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [pauseOffset, setPauseOffset] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [activeTimerJobId, setActiveTimerJobId] = useState<string | null>(null)
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Photo upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoJobId, setPhotoJobId] = useState<string | null>(null)

  // Completing
  const [completingJobId, setCompletingJobId] = useState<string | null>(null)

  /* ---------------------------------------------------------------- */
  /*  Computed data                                                    */
  /* ---------------------------------------------------------------- */

  const todayJobs = jobs
    .filter(j => isToday(j.install_date))
    .sort((a, b) => {
      if (!a.install_date || !b.install_date) return 0
      return new Date(a.install_date).getTime() - new Date(b.install_date).getTime()
    })

  const weekJobs = jobs
    .filter(j => isThisWeek(j.install_date) && !isToday(j.install_date))
    .sort((a, b) => {
      if (!a.install_date || !b.install_date) return 0
      return new Date(a.install_date).getTime() - new Date(b.install_date).getTime()
    })

  const upcomingJobs = jobs
    .filter(j => !isToday(j.install_date) && !isThisWeek(j.install_date))
    .sort((a, b) => {
      if (!a.install_date || !b.install_date) return 0
      return new Date(a.install_date).getTime() - new Date(b.install_date).getTime()
    })

  // Calculate daily total hours from time entries for today
  const todayEntries = timeEntries.filter(te => isToday(te.started_at))
  const dailyTotalMinutes = todayEntries.reduce((sum, te) => {
    if (te.duration_minutes) return sum + te.duration_minutes
    if (te.ended_at) {
      const diff = (new Date(te.ended_at).getTime() - new Date(te.started_at).getTime()) / 60000
      return sum + diff
    }
    return sum
  }, 0)
  const dailyHours = Math.floor(dailyTotalMinutes / 60)
  const dailyMins = Math.round(dailyTotalMinutes % 60)

  /* ---------------------------------------------------------------- */
  /*  Timer logic                                                      */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (isRunning && !isPaused && startTime) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000) + pauseOffset)
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning, isPaused, startTime, pauseOffset])

  const handleStartTimer = useCallback(async (jobId: string) => {
    const now = Date.now()
    // Save to Supabase time_entries table
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        org_id: profile.org_id,
        employee_id: profile.id,
        clock_in: new Date(now).toISOString(),
        notes: `Job: ${jobId}`,
      })
      .select()
      .single()

    if (!error && data) {
      setActiveEntryId(data.id)
    }

    setStartTime(now)
    setElapsed(0)
    setPauseOffset(0)
    setIsRunning(true)
    setIsPaused(false)
    setActiveTimerJobId(jobId)
  }, [profile.id, profile.org_id, supabase])

  const handlePauseTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setPauseOffset(elapsed)
    setIsPaused(true)
  }, [elapsed])

  const handleResumeTimer = useCallback(() => {
    setStartTime(Date.now())
    setIsPaused(false)
  }, [])

  const handleStopTimer = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current)

    const totalHours = elapsed / 3600

    // Update time_entries with clock_out and total_hours
    if (activeEntryId) {
      await supabase
        .from('time_entries')
        .update({
          clock_out: new Date().toISOString(),
          total_hours: parseFloat(totalHours.toFixed(4)),
        })
        .eq('id', activeEntryId)

      // Add to local state
      const newEntry = {
        id: activeEntryId,
        job_id: activeTimerJobId || '',
        started_at: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
        ended_at: new Date().toISOString(),
        duration_minutes: Math.round(elapsed / 60),
        notes: `Job: ${activeTimerJobId}`,
      }
      setTimeEntries(prev => [newEntry, ...prev])
    }

    setIsRunning(false)
    setIsPaused(false)
    setStartTime(null)
    setElapsed(0)
    setPauseOffset(0)
    setActiveTimerJobId(null)
    setActiveEntryId(null)
  }, [elapsed, activeEntryId, activeTimerJobId, startTime, supabase])

  /* ---------------------------------------------------------------- */
  /*  Photo upload                                                     */
  /* ---------------------------------------------------------------- */

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !photoJobId) return

    setUploadingPhoto(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const ext = file.name.split('.').pop()
        const path = `${profile.org_id}/${photoJobId}/completion_${Date.now()}_${i}.${ext}`

        const { error: upErr } = await supabase.storage.from('project-files').upload(path, file)
        if (upErr) continue

        const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path)

        await supabase.from('job_images').insert({
          org_id: profile.org_id,
          project_id: photoJobId,
          user_id: profile.id,
          image_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          category: 'after',
        })
      }
    } catch (err) {
      // Silent fail
    }
    setUploadingPhoto(false)
    setPhotoJobId(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [photoJobId, profile.id, profile.org_id, supabase])

  /* ---------------------------------------------------------------- */
  /*  Mark job complete                                                */
  /* ---------------------------------------------------------------- */

  const handleMarkComplete = useCallback(async (jobId: string) => {
    setCompletingJobId(jobId)
    const { error } = await supabase
      .from('projects')
      .update({ pipe_stage: 'prod_review', status: 'qc' })
      .eq('id', jobId)

    if (!error) {
      setJobs(prev => prev.map(j =>
        j.id === jobId ? { ...j, pipe_stage: 'prod_review', status: 'qc' } : j
      ))
      setExpandedJobId(null)
    }
    setCompletingJobId(null)
  }, [supabase])

  /* ---------------------------------------------------------------- */
  /*  Render helpers                                                   */
  /* ---------------------------------------------------------------- */

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const renderProgressBar = (stage: string) => {
    const pct = STAGE_PROGRESS[stage] || 0
    const color = getStageColor(stage)
    return (
      <div style={{
        width: '100%',
        height: 6,
        background: 'var(--surface)',
        borderRadius: 3,
        overflow: 'hidden',
        marginTop: 8,
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 3,
          transition: 'width 0.3s ease',
        }} />
      </div>
    )
  }

  const renderJobCard = (job: typeof initialJobs[0]) => {
    const isExpanded = expandedJobId === job.id
    const isTimerActive = activeTimerJobId === job.id
    const progress = STAGE_PROGRESS[job.pipe_stage] || 0
    const stageColor = getStageColor(job.pipe_stage)
    const serviceType = getServiceType(job.title)

    return (
      <div key={job.id} style={{
        background: 'var(--surface)',
        borderRadius: 10,
        border: isTimerActive ? '1px solid var(--green)' : '1px solid var(--border)',
        marginBottom: 12,
        overflow: 'hidden',
        transition: 'border-color 0.2s ease',
      }}>
        {/* Card header - tappable */}
        <div
          onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
          style={{
            padding: '14px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          {/* Left content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Customer name */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
            }}>
              <User size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <span style={{
                color: 'var(--text1)',
                fontSize: 15,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {job.customer?.name || 'No Customer'}
              </span>
            </div>

            {/* Vehicle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
            }}>
              <Car size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <span style={{
                color: 'var(--text2)',
                fontSize: 13,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {job.vehicle_desc || 'No vehicle info'}
              </span>
            </div>

            {/* Service type + Time */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 2,
            }}>
              <span style={{
                fontSize: 12,
                color: 'var(--cyan)',
                fontWeight: 500,
              }}>
                {serviceType}
              </span>
              {job.install_date && (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: 'var(--text3)',
                }}>
                  <Clock size={11} />
                  {formatTimeOnly(job.install_date)}
                </span>
              )}
            </div>

            {/* Stage badge + progress */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 6,
            }}>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: stageColor,
                background: `${stageColor}18`,
                padding: '2px 8px',
                borderRadius: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {STAGE_LABELS[job.pipe_stage] || job.pipe_stage}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                {progress}%
              </span>
            </div>

            {renderProgressBar(job.pipe_stage)}
          </div>

          {/* Right chevron */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            paddingTop: 4,
          }}>
            <ChevronRight
              size={18}
              style={{
                color: 'var(--text3)',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </div>
        </div>

        {/* Timer indicator */}
        {isTimerActive && (
          <div style={{
            padding: '6px 16px',
            background: 'rgba(34, 192, 122, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderTop: '1px solid rgba(34, 192, 122, 0.15)',
          }}>
            <Timer size={14} style={{ color: 'var(--green)' }} />
            <span style={{
              color: 'var(--green)',
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
            }}>
              {formatTime(elapsed)}
            </span>
          </div>
        )}

        {/* Expanded detail */}
        {isExpanded && (
          <div style={{
            padding: '0 16px 16px',
            borderTop: '1px solid var(--border)',
          }}>
            {/* Job title */}
            <div style={{
              padding: '12px 0 8px',
              fontSize: 13,
              color: 'var(--text2)',
            }}>
              {job.title}
            </div>

            {/* Action buttons */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginTop: 4,
            }}>
              {/* Vehicle Check-In */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/jobs/${job.id}/vehicle-checkin`)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  minHeight: 48,
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <Car size={18} />
                Start Vehicle Check-In
              </button>

              {/* Timer controls */}
              {!isTimerActive ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStartTimer(job.id)
                  }}
                  disabled={isRunning && activeTimerJobId !== job.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    minHeight: 48,
                    background: isRunning ? 'var(--surface2)' : 'var(--green)',
                    color: isRunning ? 'var(--text3)' : '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    width: '100%',
                    opacity: isRunning && activeTimerJobId !== job.id ? 0.5 : 1,
                  }}
                >
                  <Play size={18} />
                  {isRunning ? 'Timer Active on Another Job' : 'Start Timer'}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  {!isPaused ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePauseTimer()
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        minHeight: 48,
                        background: 'var(--amber)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: 'pointer',
                        flex: 1,
                      }}
                    >
                      <Pause size={18} />
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleResumeTimer()
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        minHeight: 48,
                        background: 'var(--green)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: 'pointer',
                        flex: 1,
                      }}
                    >
                      <Play size={18} />
                      Resume
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStopTimer()
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      minHeight: 48,
                      background: 'var(--red)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    <Square size={18} />
                    Stop
                  </button>
                </div>
              )}

              {/* Upload Completion Photos */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setPhotoJobId(job.id)
                  fileInputRef.current?.click()
                }}
                disabled={uploadingPhoto}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  minHeight: 48,
                  background: 'var(--surface2)',
                  color: 'var(--cyan)',
                  border: '1px solid var(--cyan)',
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: uploadingPhoto ? 'wait' : 'pointer',
                  width: '100%',
                }}
              >
                <Camera size={18} />
                {uploadingPhoto && photoJobId === job.id ? 'Uploading...' : 'Upload Completion Photos'}
              </button>

              {/* Mark Job Complete */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleMarkComplete(job.id)
                }}
                disabled={completingJobId === job.id || job.pipe_stage === 'done' || job.pipe_stage === 'prod_review'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  minHeight: 48,
                  background: job.pipe_stage === 'done' || job.pipe_stage === 'prod_review'
                    ? 'var(--surface2)' : 'transparent',
                  color: job.pipe_stage === 'done' || job.pipe_stage === 'prod_review'
                    ? 'var(--text3)' : 'var(--green)',
                  border: job.pipe_stage === 'done' || job.pipe_stage === 'prod_review'
                    ? '1px solid var(--border)' : '1px solid var(--green)',
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: job.pipe_stage === 'done' || job.pipe_stage === 'prod_review'
                    ? 'not-allowed' : 'pointer',
                  width: '100%',
                  opacity: job.pipe_stage === 'done' || job.pipe_stage === 'prod_review' ? 0.5 : 1,
                }}
              >
                <CheckCircle2 size={18} />
                {completingJobId === job.id
                  ? 'Completing...'
                  : job.pipe_stage === 'done'
                    ? 'Job Complete'
                    : job.pipe_stage === 'prod_review'
                      ? 'Sent to QC'
                      : 'Mark Job Complete'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderSection = (title: string, sectionJobs: typeof initialJobs) => {
    if (sectionJobs.length === 0) return null
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--text3)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: 10,
          paddingLeft: 2,
        }}>
          {title}
        </div>
        {sectionJobs.map(renderJobCard)}
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Main render                                                      */
  /* ---------------------------------------------------------------- */

  return (
    <div style={{
      maxWidth: 430,
      margin: '0 auto',
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePhotoUpload}
        style={{ display: 'none' }}
      />

      {/* Header */}
      <div style={{
        padding: '20px 20px 0',
        position: 'sticky',
        top: 0,
        background: 'var(--bg)',
        zIndex: 10,
        paddingBottom: 16,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}>
          <h1 style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--text1)',
            margin: 0,
            fontFamily: "'Barlow Condensed', sans-serif",
          }}>
            My Jobs
          </h1>

          {/* Daily total hours */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--surface)',
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
          }}>
            <Timer size={14} style={{ color: 'var(--green)' }} />
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text1)',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {dailyHours}h {dailyMins}m
            </span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>today</span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <Calendar size={13} style={{ color: 'var(--text3)' }} />
          <span style={{
            fontSize: 13,
            color: 'var(--text3)',
          }}>
            {todayStr}
          </span>
        </div>
      </div>

      {/* Active timer banner */}
      {isRunning && (
        <div style={{
          margin: '12px 20px 0',
          padding: '12px 16px',
          background: 'rgba(34, 192, 122, 0.08)',
          border: '1px solid rgba(34, 192, 122, 0.25)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isPaused ? 'var(--amber)' : 'var(--green)',
              animation: isPaused ? 'none' : undefined,
            }} />
            <div>
              <div style={{
                fontSize: 12,
                color: 'var(--text3)',
                marginBottom: 2,
              }}>
                {isPaused ? 'Timer Paused' : 'Timer Running'}
              </div>
              <div style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--green)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {formatTime(elapsed)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isPaused ? (
              <button
                onClick={handleResumeTimer}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  background: 'var(--green)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                <Play size={18} />
              </button>
            ) : (
              <button
                onClick={handlePauseTimer}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  background: 'var(--amber)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                <Pause size={18} />
              </button>
            )}
            <button
              onClick={handleStopTimer}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                background: 'var(--red)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <Square size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Job list content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        paddingBottom: 40,
      }}>
        {jobs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
          }}>
            <Car size={48} style={{ color: 'var(--text3)', marginBottom: 16, opacity: 0.4 }} />
            <div style={{
              fontSize: 16,
              color: 'var(--text2)',
              marginBottom: 8,
            }}>
              No jobs assigned
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--text3)',
            }}>
              Jobs assigned to you will appear here
            </div>
          </div>
        ) : (
          <>
            {renderSection('Today', todayJobs)}
            {renderSection('This Week', weekJobs)}
            {renderSection('Upcoming', upcomingJobs)}

            {/* If no jobs match date filters, show all */}
            {todayJobs.length === 0 && weekJobs.length === 0 && upcomingJobs.length === 0 && (
              renderSection('All Jobs', jobs)
            )}
          </>
        )}
      </div>
    </div>
  )
}
