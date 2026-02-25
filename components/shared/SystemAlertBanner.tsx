'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, X, ExternalLink } from 'lucide-react'

interface Alert {
  id: string
  severity: 'error' | 'warning' | 'info'
  title: string
  message: string
  fixPath?: string
}

// Check which env vars are missing (only NEXT_PUBLIC_ vars are accessible client-side)
function getClientAlerts(): Alert[] {
  const alerts: Alert[] = []

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('PLACEHOLDER')) {
    alerts.push({
      id: 'missing-supabase-url',
      severity: 'error',
      title: 'Supabase Not Connected',
      message: 'NEXT_PUBLIC_SUPABASE_URL is missing. Database features are offline.',
      fixPath: '/settings',
    })
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes('PLACEHOLDER')) {
    alerts.push({
      id: 'missing-stripe',
      severity: 'warning',
      title: 'Stripe Not Configured',
      message: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY missing — payment processing disabled.',
      fixPath: '/settings/payments',
    })
  }

  return alerts
}

export default function SystemAlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [serverAlerts, setServerAlerts] = useState<Alert[]>([])

  useEffect(() => {
    // Client-side env checks
    setAlerts(getClientAlerts())

    // Fetch server-side integration status
    fetch('/api/system/alerts')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.alerts) setServerAlerts(data.alerts)
      })
      .catch(() => {})
  }, [])

  const allAlerts = [...alerts, ...serverAlerts].filter(a => !dismissed.has(a.id))

  if (allAlerts.length === 0) return null

  const errors = allAlerts.filter(a => a.severity === 'error')
  const warnings = allAlerts.filter(a => a.severity === 'warning')

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
      {errors.map(alert => (
        <div
          key={alert.id}
          style={{
            background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
            borderBottom: '2px solid #f25a5a',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'pulse 2s infinite',
          }}
        >
          <AlertTriangle size={16} color="#fca5a5" style={{ flexShrink: 0 }} />
          <span style={{ color: '#fca5a5', fontWeight: 700, fontSize: 13 }}>{alert.title}:</span>
          <span style={{ color: '#fecaca', fontSize: 13, flex: 1 }}>{alert.message}</span>
          {alert.fixPath && (
            <a
              href={alert.fixPath}
              style={{ color: '#fca5a5', fontSize: 12, textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Fix <ExternalLink size={12} />
            </a>
          )}
          <button
            onClick={() => setDismissed(d => new Set([...d, alert.id]))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', padding: '2px 4px' }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
      {warnings.map(alert => (
        <div
          key={alert.id}
          style={{
            background: 'linear-gradient(135deg, #78350f, #92400e)',
            borderBottom: '1px solid #f59e0b',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <AlertTriangle size={14} color="#fcd34d" style={{ flexShrink: 0 }} />
          <span style={{ color: '#fcd34d', fontWeight: 600, fontSize: 12 }}>{alert.title}:</span>
          <span style={{ color: '#fde68a', fontSize: 12, flex: 1 }}>{alert.message}</span>
          {alert.fixPath && (
            <a
              href={alert.fixPath}
              style={{ color: '#fcd34d', fontSize: 11, textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 3 }}
            >
              Configure <ExternalLink size={11} />
            </a>
          )}
          <button
            onClick={() => setDismissed(d => new Set([...d, alert.id]))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fcd34d', padding: '2px 4px' }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </div>
  )
}
