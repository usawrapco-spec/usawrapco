'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })

interface TrackingEvent {
  id: string
  event_type: 'call' | 'qr_scan' | 'job_logged'
  lat: number | null
  lng: number | null
  location_city: string | null
  event_at: string
  caller_number?: string
  job_value?: number
  call_duration_seconds?: number
}

const MARKER_COLORS: Record<string, string> = {
  call: '#22c07a',
  qr_scan: '#8b5cf6',
  job_logged: '#f59e0b',
}

const MARKER_LABELS: Record<string, string> = {
  call: 'Phone Call',
  qr_scan: 'QR Scan',
  job_logged: 'Job Logged',
}

interface LeadOriginMapProps {
  campaignId: string
  initialEvents?: TrackingEvent[]
  height?: number
}

export default function LeadOriginMap({ campaignId, initialEvents = [], height = 500 }: LeadOriginMapProps) {
  const [events, setEvents] = useState<TrackingEvent[]>(initialEvents)
  const [mapReady, setMapReady] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        document.head.appendChild(link)
      }
      setMapReady(true)
    }
  }, [])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`tracking-${campaignId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'wrap_tracking_events',
        filter: `campaign_id=eq.${campaignId}`,
      }, (payload: any) => {
        setEvents(prev => [payload.new as TrackingEvent, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [campaignId])

  const geoEvents = events.filter(e => e.lat && e.lng)
  const center = geoEvents.length > 0
    ? [geoEvents[0].lat!, geoEvents[0].lng!] as [number, number]
    : [39.8283, -98.5795] as [number, number]
  const zoom = geoEvents.length > 0 ? 10 : 4

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
        {Object.entries(MARKER_COLORS).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>{MARKER_LABELS[type]}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
          {geoEvents.length} events mapped
        </span>
      </div>

      {mapReady && (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <MapContainer
            center={center}
            zoom={zoom}
            style={{ height, width: '100%' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            {geoEvents.map((event, i) => {
              const color = MARKER_COLORS[event.event_type] || '#4f7fff'
              const radius = event.event_type === 'job_logged' ? 10
                : event.event_type === 'call' ? Math.min(8 + (event.call_duration_seconds || 0) / 60, 16)
                : 7
              const isNew = i === 0 && (Date.now() - new Date(event.event_at).getTime()) < 60000

              return (
                <CircleMarker
                  key={event.id}
                  center={[event.lat!, event.lng!]}
                  radius={radius}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: isNew ? 0.9 : 0.5,
                    weight: isNew ? 3 : 2,
                  }}
                >
                  <Popup>
                    <div style={{ color: '#000', fontSize: 12, minWidth: 140 }}>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{MARKER_LABELS[event.event_type]}</div>
                      {event.location_city && <div>{event.location_city}</div>}
                      <div style={{ color: '#666', marginTop: 2 }}>{timeAgo(event.event_at)}</div>
                      {event.caller_number && <div>From: {event.caller_number}</div>}
                      {event.job_value && <div>Value: ${Number(event.job_value).toLocaleString()}</div>}
                      {event.call_duration_seconds && <div>Duration: {Math.round(event.call_duration_seconds / 60)}min</div>}
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>
        </div>
      )}
    </div>
  )
}
