'use client'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState, useCallback } from 'react'

interface FishingSpot {
  id: string; name: string; region: string; water_type: string
  lat: number; lng: number; difficulty: string
}
interface Marina {
  id: string; name: string; city: string
  lat: number; lng: number; usa_wrapco_authorized: boolean
}
interface Props {
  spots: FishingSpot[]
  marinas: Marina[]
  onSpotClick: (s: FishingSpot) => void
  onMarinaClick: (m: Marina) => void
}

const DIFF_COLOR: Record<string, string> = {
  beginner: '#22c07a', intermediate: '#f59e0b', expert: '#f25a5a',
}

export default function PNWMap({ spots, marinas, onSpotClick, onMarinaClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [mapReady, setMapReady] = useState(false)
  const cbRef = useRef({ onSpotClick, onMarinaClick })
  useEffect(() => { cbRef.current = { onSpotClick, onMarinaClick } }, [onSpotClick, onMarinaClick])

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let destroyed = false

    import('leaflet').then(({ default: L }) => {
      if (destroyed || !containerRef.current || mapRef.current) return

      // Fix default icon URLs (broken in webpack builds)
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!, {
        center: [47.65, -122.55],
        zoom: 9,
        zoomControl: true,
      })

      // OSM base
      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 19,
      })
      osm.addTo(map)

      // NOAA nautical charts overlay
      const noaa = L.tileLayer(
        'https://tileservice.charts.noaa.gov/tiles/50000_1/{z}/{x}/{y}.png',
        { attribution: 'NOAA Nautical Charts', maxZoom: 15, opacity: 0.88 }
      )

      L.control.layers({}, { 'NOAA Nautical Charts': noaa }, { position: 'topright', collapsed: false }).addTo(map)

      // Legend
      const legend = (L.control as any)({ position: 'bottomleft' })
      legend.onAdd = () => {
        const d = L.DomUtil.create('div')
        d.style.cssText = [
          'background:rgba(13,15,20,0.92)',
          'border:1px solid rgba(255,255,255,0.1)',
          'border-radius:8px',
          'padding:8px 10px',
          'font-family:system-ui,sans-serif',
          'font-size:10px',
          'color:#9299b5',
          'line-height:1.9',
          'pointer-events:none',
          'min-width:100px',
        ].join(';')
        const dot = (c: string, r = '50%') => `<span style="display:inline-block;width:9px;height:9px;border-radius:${r};background:${c};border:1.5px solid rgba(255,255,255,0.8);margin-right:5px;vertical-align:middle"></span>`
        d.innerHTML = `
          <div style="font-weight:700;color:#e8eaed;margin-bottom:2px">FISHING SPOTS</div>
          <div>${dot('#22c07a')}Beginner</div>
          <div>${dot('#f59e0b')}Intermediate</div>
          <div>${dot('#f25a5a')}Expert</div>
          <div style="font-weight:700;color:#e8eaed;margin-top:5px;margin-bottom:2px">MARINAS</div>
          <div>${dot('#f59e0b', '3px')}Marina</div>
          <div>${dot('#22c07a', '3px')}USA Wrap Co ✓</div>
        `
        return d
      }
      legend.addTo(map)

      mapRef.current = map
      setMapReady(true)
    })

    return () => {
      destroyed = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markersRef.current = []
        setMapReady(false)
      }
    }
  }, [])

  // Update markers when map ready or data changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    import('leaflet').then(({ default: L }) => {
      if (!mapRef.current) return

      // Clear old markers
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      // Fishing spot markers
      spots.forEach(spot => {
        const color = DIFF_COLOR[spot.difficulty] || '#4f7fff'
        const icon = L.divIcon({
          html: `<div style="width:13px;height:13px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.9);box-shadow:0 1px 5px rgba(0,0,0,0.55)"></div>`,
          className: '',
          iconSize: [13, 13],
          iconAnchor: [6, 6],
        })
        const m = L.marker([spot.lat, spot.lng], { icon })
        m.bindTooltip(spot.name, { direction: 'top', offset: [0, -10] })
        m.on('click', () => cbRef.current.onSpotClick(spot))
        m.addTo(mapRef.current)
        markersRef.current.push(m)
      })

      // Marina markers
      marinas.forEach(marina => {
        const bg = marina.usa_wrapco_authorized ? '#22c07a' : '#f59e0b'
        const icon = L.divIcon({
          html: `<div style="width:13px;height:13px;border-radius:3px;background:${bg};border:2px solid rgba(255,255,255,0.9);box-shadow:0 1px 5px rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;font-size:8px;line-height:1">⚓</div>`,
          className: '',
          iconSize: [13, 13],
          iconAnchor: [6, 6],
        })
        const m = L.marker([marina.lat, marina.lng], { icon })
        m.bindTooltip(`${marina.name} — ${marina.city}`, { direction: 'top', offset: [0, -10] })
        m.on('click', () => cbRef.current.onMarinaClick(marina))
        m.addTo(mapRef.current)
        markersRef.current.push(m)
      })
    })
  }, [mapReady, spots, marinas])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
