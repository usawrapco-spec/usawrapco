'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isAdminRole } from '@/types'

const HEALTH_URL = 'https://uqfqkvslxoucxmxxrobt.supabase.co/functions/v1/health-check'
const POLL_INTERVAL = 5 * 60 * 1000   // 5 minutes
const DISMISS_DURATION = 10 * 60 * 1000 // 10 minutes

interface HealthResponse {
  ok: boolean
  issues?: string[]
}

export default function SystemHealthBanner() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [issues, setIssues] = useState<string[]>([])
  const [dismissed, setDismissed] = useState(false)

  // Gate: only render for admin/owner
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data && isAdminRole(data.role)) setIsAdmin(true)
        })
    })
  }, [])

  const check = useCallback(async () => {
    try {
      const res = await fetch(HEALTH_URL, { cache: 'no-store' })
      if (!res.ok) {
        setIssues([`Health check returned HTTP ${res.status}`])
        return
      }
      const data: HealthResponse = await res.json()
      if (data.ok) {
        setIssues([])
        setDismissed(false) // auto-show again once system is healthy
      } else {
        setIssues(data.issues && data.issues.length > 0 ? data.issues : ['System issue detected'])
      }
    } catch {
      // network error — surface it
      setIssues(['Unable to reach health endpoint'])
    }
  }, [])

  // Poll every 5 minutes
  useEffect(() => {
    check()
    const interval = setInterval(check, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [check])

  // Re-check on window focus
  useEffect(() => {
    const onFocus = () => check()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [check])

  function dismiss() {
    setDismissed(true)
    // After 10 minutes, un-dismiss and re-check
    setTimeout(() => {
      setDismissed(false)
      check()
    }, DISMISS_DURATION)
  }

  // Don't render for non-admin users, if healthy, or temporarily dismissed
  if (!isAdmin || issues.length === 0 || dismissed) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: '#dc2626', // red-600
      color: '#ffffff',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      boxShadow: '0 2px 12px rgba(220,38,38,0.5)',
    }}>
      <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: issues.length > 1 ? 4 : 0 }}>
          SYSTEM ALERT
        </div>
        {issues.length === 1 ? (
          <span style={{ fontSize: 13 }}>{issues[0]}</span>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
            {issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={dismiss}
        title="Dismiss for 10 minutes"
        style={{
          flexShrink: 0,
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: 6,
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 12,
          fontWeight: 600,
          padding: '4px 10px',
          whiteSpace: 'nowrap',
        }}
      >
        <X size={12} />
        Dismiss
      </button>
    </div>
  )
}
