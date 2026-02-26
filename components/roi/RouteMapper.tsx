'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { MapPin, Play, RotateCcw, Loader2, Navigation } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic import of map (no SSR for Leaflet)
const MapContainer = dynamic(
  () => import('react-leaflet').then(m => m.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then(m => m.TileLayer),
  { ssr: false }
)
const CircleMarker = dynamic(
  () => import('react-leaflet').then(m => m.CircleMarker),
  { ssr: false }
)
const Polyline = dynamic(
  () => import('react-leaflet').then(m => m.Polyline),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then(m => m.Popup),
  { ssr: false }
)
const useMapEvents = dynamic(
  () => import('react-leaflet').then(m => ({ default: m.useMapEvents }) as any),
  { ssr: false }
) as any

interface Waypoint {
  lat: number
  lng: number
}

interface Segment {
  name: string
  lat: number
  lng: number
  traffic: number
  impressions: number
  color: string
}

interface RouteMapperProps {
  campaignId?: string
  onImpressionEstimate?: (impressions: number) => void
  onSkip?: () => void
  height?: number
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  // We'll use a different approach since useMapEvents can't be dynamically imported
  return null
}

export default function RouteMapper({ campaignId, onImpressionEstimate, onSkip, height = 400 }: RouteMapperProps) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [driveTime, setDriveTime] = useState(4)
  const [peakHourPct, setPeakHourPct] = useState(40)
  const [vehicleType, setVehicleType] = useState('van')
  const [city, setCity] = useState('')
  const [mapReady, setMapReady] = useState(false)
  const mapRef = useRef<any>(null)

  // Load leaflet CSS
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
      setMapReady(true)
    }
  }, [])

  const handleMapClick = useCallback((e: any) => {
    const { lat, lng } = e.latlng
    setWaypoints(prev => [...prev, { lat, lng }])
    setResult(null)
  }, [])

  const clearRoute = () => {
    setWaypoints([])
    setResult(null)
  }

  const analyzeRoute = async () => {
    if (waypoints.length === 0) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/roi/route-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waypoints,
          driveTimeHours: driveTime,
          peakHourPct,
          vehicleType,
          city: city || undefined,
          campaignId,
        }),
      })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      console.error('Route analysis failed:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Navigation size={20} style={{ color: 'var(--purple)' }} />
        <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)' }}>
          Route Mapper
        </span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
        Click on the map to add waypoints for your daily driving route. AI will calculate your actual impressions.
      </p>

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>City</label>
          <input
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="e.g. Dallas"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Drive Time (hrs)</label>
          <input
            type="number"
            value={driveTime}
            min={1}
            max={12}
            onChange={e => setDriveTime(Number(e.target.value))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Peak Hour %</label>
          <input
            type="number"
            value={peakHourPct}
            min={0}
            max={100}
            onChange={e => setPeakHourPct(Number(e.target.value))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Vehicle Type</label>
          <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} style={inputStyle}>
            <option value="van">Van</option>
            <option value="truck">Truck</option>
            <option value="box_truck">Box Truck</option>
            <option value="suv">SUV</option>
            <option value="car">Car</option>
            <option value="trailer">Trailer</option>
          </select>
        </div>
      </div>

      {/* Map */}
      {mapReady && (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 16 }}>
          <MapContainer
            center={[39.8283, -98.5795]}
            zoom={4}
            style={{ height, width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            <ClickHandler onMapClick={handleMapClick} />
            {/* Waypoint markers */}
            {waypoints.map((wp, i) => (
              <CircleMarker
                key={i}
                center={[wp.lat, wp.lng]}
                radius={8}
                pathOptions={{
                  color: 'var(--accent)',
                  fillColor: '#4f7fff',
                  fillOpacity: 0.9,
                  weight: 2,
                }}
              >
                <Popup>
                  <span style={{ color: '#000', fontSize: 12 }}>
                    Waypoint {i + 1}<br />
                    {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                  </span>
                </Popup>
              </CircleMarker>
            ))}
            {/* Connecting line */}
            {waypoints.length > 1 && (
              <Polyline
                positions={waypoints.map(wp => [wp.lat, wp.lng])}
                pathOptions={{ color: '#4f7fff', weight: 3, opacity: 0.7, dashArray: '8 4' }}
              />
            )}
            {/* Analysis segments */}
            {result?.segments?.map((seg: Segment, i: number) => (
              <CircleMarker
                key={`seg-${i}`}
                center={[seg.lat, seg.lng]}
                radius={12}
                pathOptions={{
                  color: seg.color,
                  fillColor: seg.color,
                  fillOpacity: 0.3,
                  weight: 2,
                }}
              >
                <Popup>
                  <span style={{ color: '#000', fontSize: 12 }}>
                    {seg.name}<br />
                    Traffic: {seg.traffic.toLocaleString()}/hr<br />
                    Impressions: {seg.impressions.toLocaleString()}
                  </span>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          onClick={analyzeRoute}
          disabled={waypoints.length === 0 || analyzing}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 20px',
            borderRadius: 10,
            background: waypoints.length > 0 ? 'var(--green)' : 'var(--surface2)',
            color: waypoints.length > 0 ? '#fff' : 'var(--text3)',
            fontSize: 14,
            fontWeight: 700,
            border: 'none',
            cursor: waypoints.length > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          {analyzing ? 'Analyzing...' : 'Analyze Traffic'}
        </button>
        <button onClick={clearRoute} style={secondaryBtnStyle}>
          <RotateCcw size={14} />
          Clear
        </button>
        {onSkip && (
          <button onClick={onSkip} style={secondaryBtnStyle}>
            Skip
          </button>
        )}
      </div>

      {/* Waypoint count */}
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
        <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
        {waypoints.length} waypoint{waypoints.length !== 1 ? 's' : ''} placed
      </div>

      {/* Results */}
      {result && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 20,
        }}>
          {/* Total impressions */}
          <div style={{ textAlign: 'center', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Estimated Daily Impressions
            </div>
            <div style={{
              fontSize: 36,
              fontWeight: 900,
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--green)',
              lineHeight: 1.1,
              marginTop: 4,
            }}>
              {result.totalImpressions?.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
              ~{result.monthlyImpressions?.toLocaleString()} / month &middot; ~{result.yearlyImpressions?.toLocaleString()} / year
            </div>
            {!result.usedApi && (
              <div style={{ fontSize: 10, color: 'var(--amber)', marginTop: 4 }}>
                Algorithmic estimate (configure TOMTOM_API_KEY for real traffic data)
              </div>
            )}
          </div>

          {/* Segment breakdown */}
          {result.segments?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>
                Segment Breakdown
              </div>
              {result.segments.map((seg: Segment, i: number) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 0',
                  borderBottom: i < result.segments.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: seg.color,
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1 }}>{seg.name}</span>
                  <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)' }}>
                    {seg.traffic.toLocaleString()}/hr
                  </span>
                  <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: seg.color }}>
                    {seg.impressions.toLocaleString()} imp
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* AI Suggestion */}
          {result.suggestion && (
            <div style={{
              background: 'rgba(139,92,246,0.08)',
              border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple)', marginBottom: 4 }}>
                AI Suggestion
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                {result.suggestion}
              </div>
            </div>
          )}

          {/* Use in calculator button */}
          {onImpressionEstimate && (
            <button
              onClick={() => onImpressionEstimate(result.totalImpressions)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 10,
                background: 'var(--accent)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Use This in Calculator
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Inner component that uses leaflet map events
function ClickHandler({ onMapClick }: { onMapClick: (e: any) => void }) {
  useEffect(() => {
    // Access the map through Leaflet's global
    const handleClick = (e: any) => onMapClick(e)
    const maps = document.querySelectorAll('.leaflet-container')
    maps.forEach(map => {
      const instance = (map as any)._leaflet_map
      if (instance) instance.on('click', handleClick)
    })
    return () => {
      maps.forEach(map => {
        const instance = (map as any)._leaflet_map
        if (instance) instance.off('click', handleClick)
      })
    }
  }, [onMapClick])
  return null
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text3)',
  marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface2)',
  color: 'var(--text1)',
  fontSize: 13,
  outline: 'none',
}

const secondaryBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '12px 16px',
  borderRadius: 10,
  background: 'var(--surface2)',
  color: 'var(--text2)',
  fontSize: 13,
  fontWeight: 600,
  border: '1px solid var(--border)',
  cursor: 'pointer',
}
