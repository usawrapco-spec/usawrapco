'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Square, MapPin, Navigation, Loader2, Trash2, Zap } from 'lucide-react'

interface Vehicle {
  id: string
  year: string | null
  make: string | null
  model: string | null
}

interface Driver {
  id: string
  name: string
}

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
  route_points: any[]
}

interface Props {
  vehicles: Vehicle[]
  drivers: Driver[]
  trips: Trip[]
  onRefresh: () => void
}

type GeoPoint = { lat: number; lng: number; ts: number }

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLon = (b.lng - a.lng) * Math.PI / 180
  const la = a.lat * Math.PI / 180
  const lb = b.lat * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function routeMiles(pts: GeoPoint[]): number {
  return pts.reduce((sum, p, i) => i === 0 ? 0 : sum + haversine(pts[i - 1], p), 0)
}

export default function MileageTracker({ vehicles, drivers, trips, onRefresh }: Props) {
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [tripType, setTripType] = useState('business')
  const [tracking, setTracking] = useState(false)
  const [points, setPoints] = useState<GeoPoint[]>([])
  const [miles, setMiles] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState('00:00')
  const [saving, setSaving] = useState(false)
  const [geoError, setGeoError] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTrip = useCallback(() => {
    if (!vehicleId) return
    setPoints([])
    setMiles(0)
    setStartTime(new Date())
    setTracking(true)
    setGeoError(false)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point: GeoPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, ts: Date.now() }
        setPoints(prev => {
          const next = [...prev, point]
          setMiles(routeMiles(next))
          return next
        })
      },
      () => setGeoError(true),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }, [vehicleId])

  const stopTrip = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setTracking(false)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }

    if (points.length === 0 && miles === 0) return

    setSaving(true)
    try {
      await fetch('/api/fleet/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          driver_id: driverId || undefined,
          start_time: startTime?.toISOString(),
          end_time: new Date().toISOString(),
          miles: Number(miles.toFixed(2)),
          route_points: points,
          trip_type: tripType,
          simulated: false,
        }),
      })
      onRefresh()
    } catch (err) {
      console.error('Save trip error:', err)
    } finally {
      setSaving(false)
      setPoints([])
      setMiles(0)
      setStartTime(null)
    }
  }, [vehicleId, driverId, tripType, points, miles, startTime, onRefresh])

  const simulateTrip = async () => {
    if (!vehicleId) return
    setSaving(true)
    const BASE_LAT = 47.25, BASE_LNG = -122.44
    const simPoints: GeoPoint[] = []
    let lat = BASE_LAT, lng = BASE_LNG
    for (let i = 0; i < 12; i++) {
      lat += (Math.random() - 0.4) * 0.008
      lng += (Math.random() - 0.4) * 0.012
      simPoints.push({ lat, lng, ts: Date.now() + i * 120000 })
    }
    const simMiles = routeMiles(simPoints)
    try {
      await fetch('/api/fleet/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          driver_id: driverId || undefined,
          start_time: new Date(Date.now() - 1800000).toISOString(),
          end_time: new Date().toISOString(),
          miles: Number(simMiles.toFixed(2)),
          route_points: simPoints,
          trip_type: tripType,
          simulated: true,
        }),
      })
      onRefresh()
    } catch {} finally { setSaving(false) }
  }

  // Timer
  useEffect(() => {
    if (tracking && startTime) {
      timerRef.current = setInterval(() => {
        const diff = Math.floor((Date.now() - startTime.getTime()) / 1000)
        const m = Math.floor(diff / 60).toString().padStart(2, '0')
        const s = (diff % 60).toString().padStart(2, '0')
        setElapsed(`${m}:${s}`)
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [tracking, startTime])

  const deleteTrip = async (id: string) => {
    if (!confirm('Delete this trip?')) return
    await fetch(`/api/fleet/trips?id=${id}`, { method: 'DELETE' })
    onRefresh()
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    background: 'var(--surface2)', border: '1px solid var(--border)',
    color: 'var(--text1)', fontSize: 13, outline: 'none',
  }

  // Aggregate miles
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekMiles = trips.filter(t => new Date(t.date) >= weekAgo).reduce((s, t) => s + Number(t.miles), 0)
  const monthMiles = trips.filter(t => new Date(t.date) >= monthStart).reduce((s, t) => s + Number(t.miles), 0)
  const allMiles = trips.reduce((s, t) => s + Number(t.miles), 0)

  return (
    <div>
      {/* Controls */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Vehicle</label>
            <select style={fieldStyle} value={vehicleId} onChange={e => setVehicleId(e.target.value)} disabled={tracking}>
              <option value="">-- Select Vehicle --</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{[v.year, v.make, v.model].filter(Boolean).join(' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Driver</label>
            <select style={fieldStyle} value={driverId} onChange={e => setDriverId(e.target.value)} disabled={tracking}>
              <option value="">-- Select Driver --</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Trip Type</label>
            <select style={fieldStyle} value={tripType} onChange={e => setTripType(e.target.value)} disabled={tracking}>
              <option value="business">Business</option>
              <option value="personal">Personal</option>
              <option value="transit">Transit</option>
            </select>
          </div>
        </div>

        {/* Active trip display */}
        {tracking && (
          <div style={{
            background: 'rgba(34,192,122,0.08)', borderRadius: 12, padding: 20, marginBottom: 16,
            border: '1px solid rgba(34,192,122,0.2)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
              Trip Active
            </div>
            <div style={{ fontSize: 48, fontWeight: 900, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums' }}>
              {miles.toFixed(2)}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 4 }}>miles</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>Points</span>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{points.length}</div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>Elapsed</span>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{elapsed}</div>
              </div>
            </div>
          </div>
        )}

        {geoError && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', color: 'var(--amber)', fontSize: 13, marginBottom: 12 }}>
            GPS unavailable. Use the Simulate button to generate a test trip.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          {!tracking ? (
            <>
              <button
                onClick={startTrip}
                disabled={!vehicleId}
                style={{
                  padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                  background: vehicleId ? 'var(--green)' : 'var(--surface2)', color: vehicleId ? '#fff' : 'var(--text3)',
                  border: 'none', cursor: vehicleId ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <Play size={16} /> Start Trip
              </button>
              <button
                onClick={simulateTrip}
                disabled={!vehicleId || saving}
                style={{
                  padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: 'rgba(245,158,11,0.12)', color: 'var(--amber)',
                  border: '1px solid rgba(245,158,11,0.25)', cursor: vehicleId ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Zap size={14} /> Simulate Trip
              </button>
            </>
          ) : (
            <button
              onClick={stopTrip}
              disabled={saving}
              style={{
                padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: 'var(--red)', color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />}
              End Trip & Save
            </button>
          )}
        </div>
      </div>

      {/* Aggregates */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'This Week', value: weekMiles },
          { label: 'This Month', value: monthMiles },
          { label: 'All Time', value: allMiles },
        ].map(a => (
          <div key={a.label} className="stat-card" style={{ padding: '12px 16px', textAlign: 'center' }}>
            <div className="metric-label">{a.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
              {a.value.toFixed(1)} <span style={{ fontSize: 12, color: 'var(--text3)' }}>mi</span>
            </div>
          </div>
        ))}
      </div>

      {/* Trip log */}
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 10, fontFamily: 'Barlow Condensed, sans-serif' }}>
        Trip Log
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Vehicle', 'Driver', 'Miles', 'Date', 'Type', 'Source', ''].map(h => (
              <th key={h} style={{
                textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 600,
                color: 'var(--text3)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trips.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: 30, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                <Navigation size={24} style={{ margin: '0 auto 6px', display: 'block', opacity: 0.3 }} />
                No trips recorded yet.
              </td>
            </tr>
          )}
          {trips.map(t => (
            <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text1)' }}>
                {t.vehicle ? [t.vehicle.year, t.vehicle.make, t.vehicle.model].filter(Boolean).join(' ') : '--'}
              </td>
              <td style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text2)' }}>{t.driver?.name || '--'}</td>
              <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>
                {Number(t.miles).toFixed(2)}
              </td>
              <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text2)' }}>{t.date}</td>
              <td style={{ padding: '8px 10px' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                  background: t.trip_type === 'business' ? 'rgba(79,127,255,0.12)' : t.trip_type === 'personal' ? 'rgba(139,92,246,0.12)' : 'rgba(90,96,128,0.12)',
                  color: t.trip_type === 'business' ? 'var(--accent)' : t.trip_type === 'personal' ? 'var(--purple)' : 'var(--text3)',
                }}>
                  {t.trip_type}
                </span>
              </td>
              <td style={{ padding: '8px 10px' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                  background: t.simulated ? 'rgba(245,158,11,0.12)' : 'rgba(34,192,122,0.12)',
                  color: t.simulated ? 'var(--amber)' : 'var(--green)',
                }}>
                  {t.simulated ? 'Simulated' : 'GPS'}
                </span>
              </td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                <button onClick={() => deleteTrip(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
