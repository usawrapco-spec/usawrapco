'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface Alert {
  id: string
  severity: 'error' | 'warning'
  title: string
  message: string
  fixPath?: string
}

interface HealthResponse {
  stripe: boolean
  anthropic: boolean
  twilio: boolean
  resend: boolean
  supabase: boolean
}

let cachedHealth: HealthResponse | null = null
let cacheExpiry = 0

async function fetchHealth(): Promise<HealthResponse | null> {
  const now = Date.now()
  if (cachedHealth && now < cacheExpiry) return cachedHealth
  try {
    const res = await fetch('/api/system/health')
    if (!res.ok) return null
    const data: HealthResponse = await res.json()
    cachedHealth = data
    cacheExpiry = now + 60_000 // 60s cache
    return data
  } catch {
    return null
  }
}

function healthToAlerts(h: HealthResponse): Alert[] {
  const alerts: Alert[] = []

  if (!h.supabase) {
    alerts.push({
      id: 'supabase',
      severity: 'error',
      title: 'Database Offline',
      message: 'SUPABASE_SERVICE_ROLE_KEY missing — all data features are unavailable.',
      fixPath: '/settings',
    })
  }

  if (!h.anthropic) {
    alerts.push({
      id: 'anthropic',
      severity: 'error',
      title: 'AI Features Offline',
      message: 'ANTHROPIC_API_KEY not configured — V.I.N.Y.L. and all AI features are disabled.',
      fixPath: '/settings/ai',
    })
  }

  if (!h.stripe) {
    alerts.push({
      id: 'stripe',
      severity: 'warning',
      title: 'Payments Disabled',
      message: 'STRIPE_SECRET_KEY not configured — invoice payment processing is offline.',
      fixPath: '/settings/payments',
    })
  }

  // Twilio and Resend are optional — only warn if neither email nor SMS is available
  // (avoids noise for shops that haven't set up those integrations yet)

  return alerts
}

export default function SystemAlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchHealth().then(health => {
      if (health) setAlerts(healthToAlerts(health))
    })
  }, [])

  const visible = alerts.filter(a => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
      {visible.map(alert => {
        const isError = alert.severity === 'error'
        return (
          <div
            key={alert.id}
            style={{
              background: isError
                ? 'linear-gradient(135deg, #7f1d1d, #991b1b)'
                : 'linear-gradient(135deg, #78350f, #92400e)',
              borderBottom: `1px solid ${isError ? '#f25a5a' : '#f59e0b'}`,
              padding: '9px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <AlertTriangle
              size={isError ? 15 : 14}
              color={isError ? '#fca5a5' : '#fcd34d'}
              style={{ flexShrink: 0 }}
            />
            <span style={{
              color: isError ? '#fca5a5' : '#fcd34d',
              fontWeight: 700,
              fontSize: 13,
            }}>
              {alert.title}:
            </span>
            <span style={{
              color: isError ? '#fecaca' : '#fde68a',
              fontSize: 13,
              flex: 1,
            }}>
              {alert.message}
            </span>
            {alert.fixPath && (
              <a
                href={alert.fixPath}
                style={{
                  color: isError ? '#fca5a5' : '#fcd34d',
                  fontSize: 12,
                  textDecoration: 'underline',
                  whiteSpace: 'nowrap',
                }}
              >
                Configure
              </a>
            )}
            <button
              onClick={() => setDismissed(d => new Set([...d, alert.id]))}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isError ? '#fca5a5' : '#fcd34d',
                padding: '2px 4px',
                lineHeight: 1,
              }}
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
