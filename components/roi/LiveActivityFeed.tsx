'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Phone, QrCode, Briefcase, MapPin, Clock } from 'lucide-react'

interface TrackingEvent {
  id: string
  event_type: 'call' | 'qr_scan' | 'job_logged'
  location_city: string | null
  location_state: string | null
  event_at: string
  caller_number?: string
  job_value?: number
  call_duration_seconds?: number
  job_notes?: string
}

const EVENT_CONFIG: Record<string, { icon: typeof Phone; color: string; label: string }> = {
  call: { icon: Phone, color: 'var(--green)', label: 'Incoming Call' },
  qr_scan: { icon: QrCode, color: 'var(--purple)', label: 'QR Scan' },
  job_logged: { icon: Briefcase, color: 'var(--amber)', label: 'Job Logged' },
}

interface LiveActivityFeedProps {
  campaignId: string
  initialEvents?: TrackingEvent[]
}

export default function LiveActivityFeed({ campaignId, initialEvents = [] }: LiveActivityFeedProps) {
  const [events, setEvents] = useState<TrackingEvent[]>(initialEvents)

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`activity-${campaignId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'wrap_tracking_events',
        filter: `campaign_id=eq.${campaignId}`,
      }, (payload: any) => {
        setEvents(prev => [payload.new as TrackingEvent, ...prev].slice(0, 50))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [campaignId])

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
          Live Activity
        </span>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--green)',
          animation: 'pulse 2s ease infinite',
        }} />
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {events.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            No activity yet. Events will appear here in real time.
          </div>
        ) : (
          events.map((event, i) => {
            const config = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.call
            const Icon = config.icon
            const isNew = i === 0 && (Date.now() - new Date(event.event_at).getTime()) < 60000

            return (
              <div
                key={event.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border)',
                  background: isNew ? 'rgba(34,192,122,0.04)' : 'transparent',
                  transition: 'background 0.3s',
                }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: `${config.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}>
                  <Icon size={15} style={{ color: config.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
                      {config.label}
                    </span>
                    {event.job_value && (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: 'JetBrains Mono, monospace',
                        color: 'var(--green)',
                        background: 'rgba(34,192,122,0.1)',
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}>
                        ${Number(event.job_value).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    {event.location_city && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text3)' }}>
                        <MapPin size={10} />
                        {event.location_city}
                      </span>
                    )}
                    {event.call_duration_seconds && (
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {Math.round(event.call_duration_seconds / 60)}m call
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text3)' }}>
                      <Clock size={10} />
                      {timeAgo(event.event_at)}
                    </span>
                  </div>
                  {event.job_notes && (
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
                      {event.job_notes}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
