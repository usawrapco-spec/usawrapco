'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface InstallTimerProps {
  projectId: string
  orgId: string
  installerId: string
}

export default function InstallTimer({ projectId, orgId, installerId }: InstallTimerProps) {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0) // seconds
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [previousSeconds, setPreviousSeconds] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const supabase = createClient()

  // Load existing sessions on mount
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('install_sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (data) {
        // Sum up completed sessions
        const completed = data.filter(s => s.ended_at && s.duration_seconds)
        const totalPrev = completed.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)
        setPreviousSeconds(totalPrev)

        // Check for active session
        const active = data.find(s => !s.ended_at)
        if (active) {
          setSessionId(active.id)
          setRunning(true)
          startTimeRef.current = new Date(active.started_at).getTime()
          const now = Date.now()
          const activeElapsed = Math.floor((now - startTimeRef.current) / 1000)
          setElapsed(totalPrev + activeElapsed)
        } else {
          setElapsed(totalPrev)
        }
      }
    }
    load()
  }, [projectId])

  // Tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        const now = Date.now()
        const activeElapsed = Math.floor((now - startTimeRef.current) / 1000)
        setElapsed(previousSeconds + activeElapsed)
      }, 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, previousSeconds])

  const startTimer = async () => {
    startTimeRef.current = Date.now()
    const { data, error } = await supabase
      .from('install_sessions')
      .insert({
        org_id: orgId,
        project_id: projectId,
        installer_id: installerId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (!error && data) {
      setSessionId(data.id)
      setRunning(true)
    }
  }

  const stopTimer = async () => {
    if (!sessionId) return
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)

    const activeElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)

    await supabase
      .from('install_sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: activeElapsed,
      })
      .eq('id', sessionId)

    setPreviousSeconds(prev => prev + activeElapsed)
    setSessionId(null)
  }

  const fmt = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
  }

  const totalHours = (elapsed / 3600).toFixed(1)

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 24,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>
        ⏱ Install Timer
      </div>

      {/* Timer display */}
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 48,
        fontWeight: 700,
        color: running ? 'var(--green)' : 'var(--text1)',
        letterSpacing: 2,
        marginBottom: 4,
        textShadow: running ? '0 0 20px rgba(34,197,94,0.3)' : 'none',
      }}>
        {fmt(elapsed)}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
        {totalHours} hours total
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {!running ? (
          <button
            onClick={startTimer}
            style={{
              padding: '12px 32px', borderRadius: 10, fontWeight: 800, fontSize: 14,
              cursor: 'pointer', border: 'none',
              background: 'var(--green)', color: '#0d1a10',
            }}
          >
            ▶ Start
          </button>
        ) : (
          <button
            onClick={stopTimer}
            style={{
              padding: '12px 32px', borderRadius: 10, fontWeight: 800, fontSize: 14,
              cursor: 'pointer', border: 'none',
              background: '#ef4444', color: '#fff',
              animation: 'pulse 2s infinite',
            }}
          >
            ⏸ Stop
          </button>
        )}
      </div>

      {running && (
        <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 8, fontWeight: 600 }}>
          🟢 Timer is running...
        </div>
      )}
    </div>
  )
}
