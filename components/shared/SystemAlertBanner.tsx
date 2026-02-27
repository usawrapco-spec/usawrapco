'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, DollarSign, Clock, CalendarClock,
} from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────────
interface SystemAlert {
  id: string
  type: 'overdue_invoice' | 'stuck_job' | 'missing_time' | 'payroll_overdue'
  severity: 'red' | 'yellow' | 'orange'
  message: string
  href: string
  count?: number
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  red:    { bg: 'rgba(242,90,90,0.12)',  border: 'rgba(242,90,90,0.3)',  text: '#f87171', icon: '#f87171' },
  yellow: { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.3)', text: '#fbbf24', icon: '#fbbf24' },
  orange: { bg: 'rgba(251,146,60,0.10)', border: 'rgba(251,146,60,0.3)', text: '#fb923c', icon: '#fb923c' },
}

const ALERT_ICONS = {
  overdue_invoice: DollarSign,
  stuck_job: Clock,
  missing_time: CalendarClock,
  payroll_overdue: AlertTriangle,
}

// ── Main component — persistent, non-dismissible banners ────────────────
export default function SystemAlertBanner() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([])

  useEffect(() => {
    let cancelled = false

    async function fetchAlerts() {
      try {
        const res = await fetch('/api/alerts')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        setAlerts(data.alerts || [])
      } catch {
        // silent — don't block the app
      }
    }

    fetchAlerts()
    // Re-check every 5 minutes so banners disappear when issues are resolved
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  if (alerts.length === 0) return null

  return (
    <div style={{ position: 'relative', zIndex: 50 }}>
      {alerts.map((alert) => {
        const style = SEVERITY_STYLES[alert.severity]
        const Icon = ALERT_ICONS[alert.type]

        return (
          <div
            key={alert.id}
            style={{
              background: style.bg,
              borderBottom: `1px solid ${style.border}`,
              padding: '6px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
              color: style.text,
              minHeight: 36,
            }}
          >
            <Icon size={15} color={style.icon} style={{ flexShrink: 0 }} />

            <span style={{ flex: 1, fontWeight: 600 }}>
              {alert.message}
            </span>

            <Link
              href={alert.href}
              style={{
                color: style.text,
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              View &rarr;
            </Link>
          </div>
        )
      })}
    </div>
  )
}
