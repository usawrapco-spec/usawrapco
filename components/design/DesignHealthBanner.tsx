'use client'

import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ServiceStatus {
  ok: boolean
  latency?: number
  error?: string
}

interface HealthData {
  ok: boolean
  services: {
    replicate?: ServiceStatus
    claude?: ServiceStatus
    stripe?: ServiceStatus
  }
}

export function DesignHealthBanner() {
  const [downServices, setDownServices] = useState<string[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function checkHealth() {
    try {
      const res = await fetch('/api/health/design-services', { cache: 'no-store' })
      if (!res.ok) return
      const data: HealthData = await res.json()
      const down = Object.entries(data.services)
        .filter(([, s]) => !s?.ok)
        .map(([name]) => name)
      setDownServices(down)
      // Auto-un-dismiss services that came back up
      setDismissed(prev => {
        const next = new Set(prev)
        for (const name of prev) {
          if (!down.includes(name)) next.delete(name)
        }
        return next
      })
    } catch {
      /* network error — skip silently */
    }
  }

  useEffect(() => {
    checkHealth()
    intervalRef.current = setInterval(checkHealth, 60000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = downServices.filter(s => !dismissed.has(s))
  if (visible.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
      {visible.map(service => (
        <div
          key={service}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(242,90,90,0.10)',
            border: '1px solid rgba(242,90,90,0.30)',
            borderRadius: 8,
            padding: '8px 14px',
          }}
        >
          <AlertTriangle size={14} color="var(--red)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)', flex: 1 }}>
            ⚠ {service.charAt(0).toUpperCase() + service.slice(1)} is currently unavailable — design generation
            may be affected. Our team has been alerted.
          </span>
          <button
            onClick={() => setDismissed(prev => new Set([...prev, service]))}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text3)',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
            }}
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
