'use client'
import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, X, RefreshCw } from 'lucide-react'

interface PNWAlert {
  id: string
  alert_type: string
  headline: string
  severity: string
  area: string
  expires: string
  is_active: boolean
}

const REFRESH_MS = 30 * 60 * 1000 // 30 minutes

export default function EmergencyAlertBanner() {
  const [alerts, setAlerts] = useState<PNWAlert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pnw/alerts')
      if (!res.ok) return
      const data = await res.json()
      setAlerts(data.alerts || [])
    } catch {
      // silently fail — non-blocking UI
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
    intervalRef.current = setInterval(fetchAlerts, REFRESH_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id) && a.is_active)

  if (visibleAlerts.length === 0) return null

  const topAlert = visibleAlerts[0]
  const isEmergency = ['Gale Warning', 'Storm Warning', 'Hurricane Force Wind Warning', 'Special Marine Warning'].some(
    t => topAlert.alert_type?.includes(t)
  )
  const bgColor = isEmergency ? '#f25a5a' : '#f59e0b'
  const bgAlpha = isEmergency ? '22' : '18'

  return (
    <div style={{
      background: `${bgColor}${bgAlpha}`,
      borderBottom: `2px solid ${bgColor}`,
      padding: '8px 16px',
      display: 'flex', alignItems: 'flex-start', gap: 10,
      zIndex: 3000, position: 'relative'
    }}>
      <AlertTriangle size={16} color={bgColor} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700,
          fontSize: 12, letterSpacing: 1, color: bgColor, marginRight: 8
        }}>
          {topAlert.alert_type?.toUpperCase()}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text1)' }}>
          {topAlert.headline}
        </span>
        {topAlert.area && (
          <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 8 }}>
            — {topAlert.area}
          </span>
        )}
        {visibleAlerts.length > 1 && (
          <span style={{
            fontSize: 11, color: bgColor, marginLeft: 8,
            fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700
          }}>
            +{visibleAlerts.length - 1} more
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {loading && <RefreshCw size={12} color="var(--text3)" style={{ animation: 'spin 1s linear infinite' }} />}
        <button
          onClick={() => setDismissed(prev => new Set([...prev, topAlert.id]))}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text2)', display: 'flex', alignItems: 'center', padding: 2
          }}
          aria-label="Dismiss alert"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
