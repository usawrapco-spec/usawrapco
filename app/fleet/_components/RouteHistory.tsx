'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin, Navigation } from 'lucide-react'

interface Trip {
  id: string
  vehicle?: { id: string; year: string; make: string; model: string } | null
  driver?: { id: string; name: string } | null
  miles: number
  date: string
  trip_type: string
  simulated: boolean
  start_time: string | null
  end_time: string | null
  route_points: Array<{ lat: number; lng: number; ts: number }>
}

interface Props {
  trips: Trip[]
}

export default function RouteHistory({ trips }: Props) {
  const [selected, setSelected] = useState<Trip | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Draw route on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !selected) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const pts = selected.route_points || []
    const w = canvas.width
    const h = canvas.height
    const pad = 40

    // Clear
    ctx.fillStyle = '#13151c'
    ctx.fillRect(0, 0, w, h)

    if (pts.length < 2) {
      ctx.fillStyle = '#5a6080'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('No route data available', w / 2, h / 2)
      return
    }

    // Find bounds
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
    for (const p of pts) {
      if (p.lat < minLat) minLat = p.lat
      if (p.lat > maxLat) maxLat = p.lat
      if (p.lng < minLng) minLng = p.lng
      if (p.lng > maxLng) maxLng = p.lng
    }

    // Add some padding to bounds
    const latRange = maxLat - minLat || 0.01
    const lngRange = maxLng - minLng || 0.01
    const drawW = w - pad * 2
    const drawH = h - pad * 2

    function toX(lng: number) { return pad + ((lng - minLng) / lngRange) * drawW }
    function toY(lat: number) { return pad + drawH - ((lat - minLat) / latRange) * drawH }

    // Grid lines
    ctx.strokeStyle = '#1a1d27'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad + (drawH / 4) * i
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke()
      const x = pad + (drawW / 4) * i
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, h - pad); ctx.stroke()
    }

    // Route line
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (let i = 0; i < pts.length; i++) {
      const x = toX(pts[i].lng)
      const y = toY(pts[i].lat)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Waypoints
    for (let i = 1; i < pts.length - 1; i++) {
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.arc(toX(pts[i].lng), toY(pts[i].lat), 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // Start point (green)
    ctx.fillStyle = '#22c07a'
    ctx.beginPath()
    ctx.arc(toX(pts[0].lng), toY(pts[0].lat), 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#13151c'
    ctx.beginPath()
    ctx.arc(toX(pts[0].lng), toY(pts[0].lat), 3, 0, Math.PI * 2)
    ctx.fill()

    // End point (red)
    const last = pts[pts.length - 1]
    ctx.fillStyle = '#f25a5a'
    ctx.beginPath()
    ctx.arc(toX(last.lng), toY(last.lat), 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#13151c'
    ctx.beginPath()
    ctx.arc(toX(last.lng), toY(last.lat), 3, 0, Math.PI * 2)
    ctx.fill()

    // Stats overlay
    ctx.fillStyle = 'rgba(13,15,20,0.85)'
    ctx.fillRect(w - 180, 8, 172, 64)
    ctx.fillStyle = '#e8eaed'
    ctx.font = 'bold 13px "JetBrains Mono", monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`${Number(selected.miles).toFixed(2)} mi`, w - 16, 30)
    ctx.font = '11px sans-serif'
    ctx.fillStyle = '#9299b5'
    ctx.fillText(`${pts.length} points`, w - 16, 48)
    if (selected.start_time && selected.end_time) {
      const dur = Math.round((new Date(selected.end_time).getTime() - new Date(selected.start_time).getTime()) / 60000)
      ctx.fillText(`${dur} min`, w - 16, 64)
    }
  }, [selected])

  const tripsWithRoutes = trips.filter(t => (t.route_points?.length || 0) >= 2)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, minHeight: 400 }}>
      {/* Left: trip list */}
      <div style={{
        background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)',
        overflowY: 'auto', maxHeight: 500,
      }}>
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          fontSize: 13, fontWeight: 700, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif',
        }}>
          Trips with Route Data ({tripsWithRoutes.length})
        </div>
        {tripsWithRoutes.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            <Navigation size={24} style={{ margin: '0 auto 6px', display: 'block', opacity: 0.3 }} />
            No route data yet. Track a trip to see routes here.
          </div>
        )}
        {tripsWithRoutes.map(t => {
          const isSelected = selected?.id === t.id
          return (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                background: isSelected ? 'rgba(79,127,255,0.08)' : 'transparent',
                border: 'none', cursor: 'pointer',
                borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? 'var(--accent)' : 'var(--text1)' }}>
                {t.vehicle ? [t.vehicle.year, t.vehicle.make, t.vehicle.model].filter(Boolean).join(' ') : 'Unknown'}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{t.date}</span>
                <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--amber)', fontWeight: 600 }}>
                  {Number(t.miles).toFixed(2)} mi
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Right: canvas */}
      <div style={{
        background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 340,
      }}>
        {!selected ? (
          <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
            <MapPin size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <div style={{ fontSize: 14 }}>Select a trip to view its route</div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={600}
            height={340}
            style={{ width: '100%', height: 340, borderRadius: 12 }}
          />
        )}
      </div>
    </div>
  )
}
