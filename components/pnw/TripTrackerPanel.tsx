'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Navigation, Play, Square, MapPin, Clock, Gauge, Fish, Plus } from 'lucide-react'
import CatchLoggerModal from './CatchLoggerModal'

interface TripTrackerPanelProps {
  onLogCatch?: (tripId: string | undefined, lat: number | undefined, lng: number | undefined) => void
}

interface TripPoint {
  lat: number
  lng: number
  timestamp: number
  speed?: number
}

type TripStatus = 'idle' | 'active' | 'paused' | 'ended'

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

function fmtCoord(n: number | undefined, dir: 'lat' | 'lng'): string {
  if (n === undefined) return '--'
  const abs = Math.abs(n).toFixed(4)
  const label = dir === 'lat' ? (n >= 0 ? 'N' : 'S') : (n >= 0 ? 'E' : 'W')
  return `${abs}° ${label}`
}

function calcDistance(pts: TripPoint[]): number {
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    const R = 3440.07 // nautical miles
    const lat1 = (pts[i - 1].lat * Math.PI) / 180
    const lat2 = (pts[i].lat * Math.PI) / 180
    const dLat = lat2 - lat1
    const dLng = ((pts[i].lng - pts[i - 1].lng) * Math.PI) / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
  return total
}

export default function TripTrackerPanel(_props: TripTrackerPanelProps = {}) {
  const [showCatchModal, setShowCatchModal] = useState(false)
  const [status, setStatus] = useState<TripStatus>('idle')
  const [points, setPoints] = useState<TripPoint[]>([])
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | undefined>()
  const [elapsed, setElapsed] = useState(0)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [tripId] = useState(() => `trip_${Date.now()}`)
  const startTimeRef = useRef<number>(0)
  const watchIdRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => () => { stopTracking() }, [stopTracking])

  function startTrip() {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported in this browser.')
      return
    }
    setGeoError(null)
    setPoints([])
    setStatus('active')
    startTimeRef.current = Date.now()

    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current)
    }, 1000)

    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const pt: TripPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
          speed: pos.coords.speed ?? undefined,
        }
        setCurrentPos({ lat: pt.lat, lng: pt.lng })
        setPoints(prev => [...prev, pt])
      },
      err => {
        setGeoError(`Location error: ${err.message}`)
        setStatus('idle')
        stopTracking()
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
  }

  function endTrip() {
    stopTracking()
    setStatus('ended')
  }

  const distanceNM = calcDistance(points)
  const avgSpeedKts = elapsed > 0 ? (distanceNM / (elapsed / 3600000)) : 0
  const lastSpeed = points.length > 0 ? (points[points.length - 1].speed ?? 0) * 1.944 : 0 // m/s → knots

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Status card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, padding: '20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Navigation size={18} color={status === 'active' ? '#22c07a' : 'var(--text3)'} />
            <span style={{ fontSize: 15, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: 'var(--text1)', letterSpacing: '0.5px' }}>
              GPS TRACKER
            </span>
          </div>
          <div style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 10,
            fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.5px',
            background: status === 'active' ? 'rgba(34,192,122,0.15)' : status === 'ended' ? 'rgba(79,127,255,0.15)' : 'rgba(255,255,255,0.06)',
            color: status === 'active' ? '#22c07a' : status === 'ended' ? '#4f7fff' : 'var(--text3)',
            border: `1px solid ${status === 'active' ? 'rgba(34,192,122,0.3)' : status === 'ended' ? 'rgba(79,127,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
          }}>
            {status === 'idle' ? 'READY' : status === 'active' ? 'TRACKING' : 'COMPLETED'}
          </div>
        </div>

        {/* Stat grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'ELAPSED', value: status !== 'idle' ? fmtDuration(elapsed) : '--', icon: Clock },
            { label: 'DISTANCE', value: status !== 'idle' ? `${distanceNM.toFixed(2)} nm` : '--', icon: MapPin },
            { label: 'SPEED', value: status === 'active' ? `${lastSpeed.toFixed(1)} kts` : '--', icon: Gauge },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} style={{
              padding: '10px 12px', background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, textAlign: 'center',
            }}>
              <Icon size={13} style={{ color: 'var(--text3)', marginBottom: 4, display: 'block', margin: '0 auto 4px' }} />
              <div style={{ fontSize: 14, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)', fontWeight: 700 }}>{value}</div>
              <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.5px', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Current position */}
        {currentPos && (
          <div style={{
            padding: '8px 12px', background: 'rgba(79,127,255,0.08)',
            border: '1px solid rgba(79,127,255,0.2)', borderRadius: 8, marginBottom: 14,
            display: 'flex', gap: 16,
          }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.5px' }}>LATITUDE</div>
              <div style={{ fontSize: 12, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtCoord(currentPos.lat, 'lat')}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.5px' }}>LONGITUDE</div>
              <div style={{ fontSize: 12, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtCoord(currentPos.lng, 'lng')}</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.5px' }}>POINTS</div>
              <div style={{ fontSize: 12, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{points.length}</div>
            </div>
          </div>
        )}

        {geoError && (
          <div style={{ padding: '8px 12px', background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)', borderRadius: 8, fontSize: 12, color: '#f25a5a', marginBottom: 14 }}>
            {geoError}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          {status === 'idle' && (
            <button
              onClick={startTrip}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 20px', background: '#22c07a', border: 'none', borderRadius: 8,
                color: '#fff', fontSize: 13, fontFamily: "'Barlow Condensed',sans-serif",
                fontWeight: 700, letterSpacing: '0.5px', cursor: 'pointer',
              }}
            >
              <Play size={15} fill="currentColor" /> START TRIP
            </button>
          )}
          {status === 'active' && (
            <>
              <button
                onClick={() => setShowCatchModal(true)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px 16px', background: 'rgba(34,192,122,0.15)',
                  border: '1px solid rgba(34,192,122,0.4)', borderRadius: 8,
                  color: '#22c07a', fontSize: 13, fontFamily: "'Barlow Condensed',sans-serif",
                  fontWeight: 700, letterSpacing: '0.5px', cursor: 'pointer',
                }}
              >
                <Fish size={14} /> LOG CATCH
              </button>
              <button
                onClick={endTrip}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px 16px', background: 'rgba(242,90,90,0.15)',
                  border: '1px solid rgba(242,90,90,0.4)', borderRadius: 8,
                  color: '#f25a5a', fontSize: 13, fontFamily: "'Barlow Condensed',sans-serif",
                  fontWeight: 700, letterSpacing: '0.5px', cursor: 'pointer',
                }}
              >
                <Square size={14} fill="currentColor" /> END
              </button>
            </>
          )}
          {status === 'ended' && (
            <button
              onClick={() => { setStatus('idle'); setPoints([]); setElapsed(0); setCurrentPos(undefined) }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 20px', background: 'rgba(79,127,255,0.15)',
                border: '1px solid rgba(79,127,255,0.3)', borderRadius: 8,
                color: 'var(--accent)', fontSize: 13, fontFamily: "'Barlow Condensed',sans-serif",
                fontWeight: 700, letterSpacing: '0.5px', cursor: 'pointer',
              }}
            >
              <Plus size={14} /> NEW TRIP
            </button>
          )}
        </div>
      </div>

      {/* Summary when ended */}
      {status === 'ended' && points.length > 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid rgba(79,127,255,0.2)',
          borderRadius: 12, padding: '16px 20px',
        }}>
          <div style={{ fontSize: 13, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: 'var(--text1)', letterSpacing: '0.5px', marginBottom: 10 }}>
            TRIP SUMMARY
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Duration', value: fmtDuration(elapsed) },
              { label: 'Distance', value: `${distanceNM.toFixed(2)} nm` },
              { label: 'Avg Speed', value: `${avgSpeedKts.toFixed(1)} kts` },
              { label: 'Track Points', value: String(points.length) },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.5px' }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: 14, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
      {showCatchModal && (
        <CatchLoggerModal
          tripId={tripId}
          currentLat={currentPos?.lat}
          currentLng={currentPos?.lng}
          onClose={() => setShowCatchModal(false)}
          onSaved={() => setShowCatchModal(false)}
        />
      )}
    </>
  )
}
