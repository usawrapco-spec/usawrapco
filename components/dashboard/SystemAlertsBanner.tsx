'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, X } from 'lucide-react'

interface SystemAlert {
  id: string
  service: string
  message: string
  detected_at: string
}

export function SystemAlertsBanner() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('system_alerts')
      .select('id, service, message, detected_at')
      .is('resolved_at', null)
      .order('detected_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setAlerts(data || []))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = alerts.filter(a => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div style={{ paddingBottom: 8 }}>
      {visible.map(alert => (
        <div
          key={alert.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(242,90,90,0.08)',
            border: '1px solid rgba(242,90,90,0.28)',
            borderRadius: 8,
            padding: '8px 14px',
            marginBottom: 6,
          }}
        >
          <AlertTriangle size={14} color="var(--red)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', marginRight: 8 }}>
              {alert.service.toUpperCase()} SERVICE DOWN
            </span>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{alert.message}</span>
          </div>
          <button
            onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
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
