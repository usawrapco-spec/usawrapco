'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { GoogleMap, useJsApiLoader, OverlayViewF, OverlayView, useGoogleMap } from '@react-google-maps/api'
import type { Prospect } from './ProspectorApp'
import { MapPin } from 'lucide-react'

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1d27' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5a6080' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0f14' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2a2f3d' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#5a6080' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#7a82a0' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#5a6080' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a2418' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3a5a3a' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2a2f3d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1d27' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#333845' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1a1d27' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#3a4050' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#5a6080' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1520' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#2a3a5a' }] },
]

const STATUS_PIN_COLORS: Record<string, string> = {
  uncontacted: '#4f7fff',
  contacted: '#f59e0b',
  interested: '#22c07a',
  quoted: '#8b5cf6',
  won: '#ffd700',
  lost: '#505a6b',
  not_interested: '#505a6b',
  follow_up: '#22d3ee',
}

const PRIORITY_GLOW: Record<string, boolean> = {
  hot: true,
}

interface Props {
  prospects: Prospect[]
  selectedProspect: Prospect | null
  routeMode: boolean
  routeStops: string[]
  navigationMode: boolean
  currentNavStop: number
  center: { lat: number; lng: number }
  userLocation: { lat: number; lng: number } | null
  onSelectProspect: (p: Prospect) => void
  onToggleRouteStop: (id: string) => void
  onCenterChange: (c: { lat: number; lng: number }) => void
}

export function GoogleMapComponent({
  prospects, selectedProspect, routeMode, routeStops,
  navigationMode, currentNavStop, center, userLocation,
  onSelectProspect, onToggleRouteStop, onCenterChange,
}: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  const hasValidKey = apiKey && apiKey !== 'PLACEHOLDER_ADD_YOUR_KEY'

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: hasValidKey ? apiKey : '',
  })

  const mapRef = useRef<google.maps.Map | null>(null)

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.panTo(center)
    }
  }, [center])

  // Fallback map when no API key
  if (!hasValidKey) {
    return (
      <div style={{
        position: 'absolute', inset: 0, background: '#1a1d27',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Grid pattern background */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.1,
          backgroundImage: 'linear-gradient(rgba(79,127,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(79,127,255,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Prospect dots */}
        {prospects.filter(p => p.lat && p.lng).slice(0, 100).map((p, i) => {
          const x = ((Number(p.lng) + 180) / 360) * 100
          const y = ((90 - Number(p.lat)) / 180) * 100
          const color = routeStops.includes(p.id) ? '#ff6b00' : (STATUS_PIN_COLORS[p.status] || '#4f7fff')
          return (
            <div
              key={p.id}
              onClick={() => routeMode ? onToggleRouteStop(p.id) : onSelectProspect(p)}
              style={{
                position: 'absolute',
                left: `${30 + (x % 40)}%`,
                top: `${15 + (i * 3.2) % 70}%`,
                width: selectedProspect?.id === p.id ? 16 : 10,
                height: selectedProspect?.id === p.id ? 16 : 10,
                borderRadius: '50%',
                background: color,
                boxShadow: p.priority === 'hot' ? `0 0 12px ${color}` : `0 0 4px ${color}55`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                zIndex: selectedProspect?.id === p.id ? 5 : 1,
              }}
              title={p.business_name}
            />
          )
        })}

        <div style={{
          zIndex: 2, textAlign: 'center', padding: 30, borderRadius: 16,
          background: 'rgba(13,15,20,0.8)', backdropFilter: 'blur(10px)',
          border: '1px solid var(--border)',
        }}>
          <MapPin size={40} style={{ color: 'var(--accent)', marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>
            Google Maps API Key Required
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', maxWidth: 300, lineHeight: 1.5 }}>
            Add <code style={{ color: 'var(--accent)' }}>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your .env.local file to enable the interactive map with custom pins and routing.
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12 }}>
            {prospects.filter(p => p.lat && p.lng).length} prospects with coordinates shown above
          </div>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div style={{
        position: 'absolute', inset: 0, background: '#1a1d27',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text3)', fontSize: 14,
      }}>
        Loading map...
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={center}
      zoom={12}
      onLoad={onLoad}
      options={{
        styles: DARK_MAP_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: 6 }, // RIGHT_CENTER
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      }}
    >
      {/* Prospect Markers */}
      {prospects.filter(p => p.lat && p.lng).map(p => {
        const isInRoute = routeStops.includes(p.id)
        const routeIdx = routeStops.indexOf(p.id)
        const isSelected = selectedProspect?.id === p.id
        const isNavCurrent = navigationMode && routeStops[currentNavStop] === p.id
        const color = isInRoute ? '#ff6b00' : (STATUS_PIN_COLORS[p.status] || '#4f7fff')
        const isHot = p.priority === 'hot'

        return (
          <OverlayViewF
            key={p.id}
            position={{ lat: Number(p.lat), lng: Number(p.lng) }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div
              onClick={() => routeMode ? onToggleRouteStop(p.id) : onSelectProspect(p)}
              style={{
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                zIndex: isSelected || isNavCurrent ? 100 : isInRoute ? 50 : 10,
                position: 'relative',
              }}
            >
              {/* Glow for hot/selected */}
              {(isHot || isSelected || isNavCurrent) && (
                <div style={{
                  position: 'absolute',
                  inset: -6,
                  borderRadius: '50%',
                  background: `${color}33`,
                  animation: isHot ? 'pulse 2s ease-in-out infinite' : undefined,
                }} />
              )}

              <div style={{
                width: isSelected || isNavCurrent ? 36 : isInRoute ? 30 : 26,
                height: isSelected || isNavCurrent ? 36 : isInRoute ? 30 : 26,
                borderRadius: '50%',
                background: color,
                border: `2px solid ${isSelected ? '#fff' : color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isInRoute ? 12 : 9,
                fontWeight: 800,
                color: '#fff',
                boxShadow: `0 2px 8px ${color}66`,
                transition: 'all 0.2s',
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                {isInRoute ? routeIdx + 1 : p.business_name.substring(0, 2).toUpperCase()}
              </div>

              {/* Tooltip on hover */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginBottom: 4,
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'rgba(13,15,20,0.9)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}>
                  {p.business_name}
                </div>
              )}
            </div>
          </OverlayViewF>
        )
      })}

      {/* User location marker */}
      {userLocation && (
        <OverlayViewF
          position={userLocation}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div style={{
            transform: 'translate(-50%, -50%)',
            width: 16, height: 16, borderRadius: '50%',
            background: '#4f7fff', border: '3px solid #fff',
            boxShadow: '0 0 12px rgba(79,127,255,0.5)',
          }} />
        </OverlayViewF>
      )}

      {/* Route line (draw path between stops) */}
      {routeStops.length > 1 && <RouteLine prospects={prospects} routeStops={routeStops} />}
    </GoogleMap>
  )
}

// Route polyline between stops
function RouteLine({ prospects, routeStops }: { prospects: Prospect[]; routeStops: string[] }) {
  const map = useGoogleMap()
  const polylineRef = useRef<google.maps.Polyline | null>(null)

  useEffect(() => {
    if (!map) return

    const path = routeStops
      .map(id => prospects.find(p => p.id === id))
      .filter(p => p?.lat && p?.lng)
      .map(p => ({ lat: Number(p!.lat), lng: Number(p!.lng) }))

    if (polylineRef.current) {
      polylineRef.current.setMap(null)
    }

    if (path.length > 1 && window.google?.maps) {
      polylineRef.current = new google.maps.Polyline({
        path,
        strokeColor: '#ff6b00',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        geodesic: true,
        map,
        icons: [{
          icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3, strokeColor: '#ff6b00' },
          offset: '50%',
          repeat: '100px',
        }],
      })
    }

    return () => {
      if (polylineRef.current) polylineRef.current.setMap(null)
    }
  }, [map, prospects, routeStops])

  return null
}
