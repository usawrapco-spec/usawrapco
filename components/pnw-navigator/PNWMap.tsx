'use client'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'

export interface FishingSpot {
  id: string; name: string; region: string; water_type: string
  lat: number; lng: number; difficulty: string; access_type: string
}
export interface Marina {
  id: string; name: string; city: string; lat: number; lng: number
  has_fuel_dock: boolean; usa_wrapco_authorized: boolean
}

interface Props {
  activeLayers?: string[]
  spots: FishingSpot[]
  marinas: Marina[]
  userPosition?: { lat: number; lng: number } | null
  gpsTrack?: Array<[number, number]>
  onSpotClick: (s: FishingSpot) => void
  onMarinaClick: (m: Marina) => void
}

const TIDE_STATIONS = [
  { name: 'Seattle',         lat: 47.6018, lng: -122.3389 },
  { name: 'Tacoma',          lat: 47.2667, lng: -122.4142 },
  { name: 'Eagle Harbor',    lat: 47.6236, lng: -122.5072 },
  { name: 'Port Townsend',   lat: 48.1131, lng: -122.7592 },
  { name: 'Olympia',         lat: 47.0506, lng: -122.9006 },
  { name: 'Tacoma Narrows',  lat: 47.2736, lng: -122.5419 },
  { name: 'Port Angeles',    lat: 48.1228, lng: -123.4406 },
  { name: 'Friday Harbor',   lat: 48.5350, lng: -123.0131 },
  { name: 'Edmonds',         lat: 47.8120, lng: -122.3850 },
  { name: 'Bainbridge Is.',  lat: 47.6251, lng: -122.5089 },
]

const ORCA_ZONES: any = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Haro Strait — SRKW Critical Habitat', restriction: '300–400 yd buffer when SRKWs present. Federal law. Fines up to $11,000.' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-123.35, 48.35], [-123.15, 48.78], [-122.82, 48.62], [-122.95, 48.28], [-123.35, 48.35],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'San Juan Channel — SRKW Zone', restriction: '300 yd buffer when SRKWs present. Hail VHF 16 for current exclusions.' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-122.88, 48.46], [-122.72, 48.62], [-122.52, 48.50], [-122.66, 48.33], [-122.88, 48.46],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Admiralty Inlet — SRKW Transit Zone', restriction: '300 yd buffer. SRKWs frequently transit this corridor.' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-122.72, 48.08], [-122.52, 48.22], [-122.38, 48.02], [-122.58, 47.88], [-122.72, 48.08],
        ]],
      },
    },
  ],
}

const SPEED_ZONES: any = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Gig Harbor Entrance — No Wake Zone', limit: '5 mph' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-122.588, 47.332], [-122.575, 47.338], [-122.568, 47.330], [-122.580, 47.325], [-122.588, 47.332],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Tacoma Narrows — Speed Zone', limit: '20 mph (within 200ft of shore)' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-122.555, 47.275], [-122.540, 47.295], [-122.525, 47.280], [-122.540, 47.260], [-122.555, 47.275],
        ]],
      },
    },
  ],
}

const DIFF_COLOR: Record<string, string> = {
  beginner: '#22c07a',
  intermediate: '#f59e0b',
  expert: '#f25a5a',
}

export default function PNWMap({ activeLayers = ['spots', 'marinas', 'fuel', 'launches'], spots, marinas, userPosition, gpsTrack, onSpotClick, onMarinaClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const LRef         = useRef<any>(null)
  const markersRef   = useRef<any[]>([])
  const layerRefs    = useRef<Record<string, any>>({})
  const userMarkerRef = useRef<any>(null)
  const trackLineRef  = useRef<any>(null)
  const cbRef        = useRef({ onSpotClick, onMarinaClick })
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => { cbRef.current = { onSpotClick, onMarinaClick } }, [onSpotClick, onMarinaClick])

  const activeLayersStr = [...activeLayers].sort().join(',')

  // ── Init map once ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let destroyed = false

    import('leaflet').then(({ default: L }) => {
      if (destroyed || !containerRef.current || mapRef.current) return
      LRef.current = L

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!, {
        center: [47.65, -122.55],
        zoom: 10,
        zoomControl: false,
      })

      // Default OSM base
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 19,
      })
      osmLayer.addTo(map)
      layerRefs.current.osm = osmLayer

      // Zoom controls bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      // Locate button
      const locateCtl = (L.control as any)({ position: 'bottomright' })
      locateCtl.onAdd = () => {
        const btn = L.DomUtil.create('button')
        btn.title = 'Find my location'
        btn.style.cssText = [
          'display:flex;align-items:center;justify-content:center',
          'width:34px;height:34px;border-radius:8px;border:none;cursor:pointer',
          'background:rgba(13,15,20,0.92);margin-bottom:6px',
          'backdrop-filter:blur(8px)',
        ].join(';')
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f7fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>`
        L.DomEvent.on(btn, 'click', (e: Event) => {
          L.DomEvent.stopPropagation(e)
          map.locate({ setView: true, maxZoom: 14 })
        })
        return btn
      }
      locateCtl.addTo(map)

      // User location marker on locate
      map.on('locationfound', (e: any) => {
        if (userMarkerRef.current) userMarkerRef.current.setLatLng(e.latlng)
        else {
          const icon = L.divIcon({
            html: `<div style="width:16px;height:16px;border-radius:50%;background:#4f7fff;border:3px solid #fff;box-shadow:0 0 0 4px rgba(79,127,255,0.3)"></div>`,
            className: '',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })
          userMarkerRef.current = L.marker(e.latlng, { icon }).addTo(map)
          userMarkerRef.current.bindTooltip('You are here', { direction: 'top', offset: [0, -12] })
        }
      })

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

  // ── Layer management ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !LRef.current) return
    const L   = LRef.current
    const map = mapRef.current

    const toggle = (id: string, active: boolean, factory: () => any) => {
      if (active) {
        if (!layerRefs.current[id]) layerRefs.current[id] = factory()
        if (!map.hasLayer(layerRefs.current[id])) layerRefs.current[id].addTo(map)
      } else {
        if (layerRefs.current[id] && map.hasLayer(layerRefs.current[id])) {
          map.removeLayer(layerRefs.current[id])
        }
      }
    }

    // Base: satellite vs OSM
    if (activeLayers.includes('satellite')) {
      toggle('satellite', true, () =>
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Esri World Imagery',
          maxZoom: 18,
        })
      )
      if (layerRefs.current.osm && map.hasLayer(layerRefs.current.osm)) map.removeLayer(layerRefs.current.osm)
      // Labels overlay on satellite
      toggle('satelliteLabels', true, () =>
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
          attribution: '', maxZoom: 18, opacity: 0.8,
        })
      )
    } else {
      toggle('satellite', false, () => null as any)
      toggle('satelliteLabels', false, () => null as any)
      if (layerRefs.current.osm && !map.hasLayer(layerRefs.current.osm)) {
        layerRefs.current.osm.addTo(map)
      }
    }

    // NOAA depth chart
    toggle('depth', activeLayers.includes('depth'), () =>
      L.tileLayer('https://tileservice.charts.noaa.gov/tiles/50000_1/{z}/{x}/{y}.png', {
        attribution: 'NOAA Nautical Charts',
        maxZoom: 15,
        opacity: 0.75,
      })
    )

    // OpenSeaMap hazards / seamarks
    toggle('hazards', activeLayers.includes('hazards'), () =>
      L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        attribution: '<a href="https://www.openseamap.org">OpenSeaMap</a>',
        maxZoom: 18,
        opacity: 0.88,
      })
    )

    // Wildlife — orca zones
    toggle('wildlife', activeLayers.includes('wildlife'), () =>
      L.geoJSON(ORCA_ZONES, {
        style: { color: '#4f7fff', weight: 2, fillColor: '#4f7fff', fillOpacity: 0.08, dashArray: '6 4' },
        onEachFeature: (feature: any, layer: any) => {
          layer.bindTooltip(
            `<b>${feature.properties.name}</b><br><small>${feature.properties.restriction}</small>`,
            { direction: 'center', maxWidth: 220 }
          )
        },
      })
    )

    // Speed zones
    toggle('speed', activeLayers.includes('speed'), () =>
      L.geoJSON(SPEED_ZONES, {
        style: { color: '#f25a5a', weight: 2, fillColor: '#f25a5a', fillOpacity: 0.06, dashArray: '4 4' },
        onEachFeature: (feature: any, layer: any) => {
          layer.bindTooltip(
            `<b>${feature.properties.name}</b><br>Limit: ${feature.properties.limit}`,
            { direction: 'center' }
          )
        },
      })
    )

    // Tide station markers
    if (activeLayers.includes('tides')) {
      if (!layerRefs.current.tideMarkers) {
        const group = L.layerGroup()
        TIDE_STATIONS.forEach(st => {
          const icon = L.divIcon({
            html: `<div style="width:14px;height:14px;border-radius:3px;background:#22d3ee;border:2px solid rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;color:#0d0f14;font-family:monospace">T</div>`,
            className: '',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          })
          const m = L.marker([st.lat, st.lng], { icon })
          m.bindTooltip(`Tide Station: ${st.name}`, { direction: 'top', offset: [0, -10] })
          group.addLayer(m)
        })
        layerRefs.current.tideMarkers = group
      }
      if (!map.hasLayer(layerRefs.current.tideMarkers)) layerRefs.current.tideMarkers.addTo(map)
    } else {
      if (layerRefs.current.tideMarkers && map.hasLayer(layerRefs.current.tideMarkers)) {
        map.removeLayer(layerRefs.current.tideMarkers)
      }
    }

  }, [mapReady, activeLayersStr]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Spot & marina markers ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !LRef.current) return
    const L   = LRef.current
    const map = mapRef.current

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const showSpots   = activeLayers.includes('spots')
    const showMarinas = activeLayers.includes('marinas')
    const showFuel    = activeLayers.includes('fuel')
    const showLaunch  = activeLayers.includes('launches')

    // Fishing spot markers
    if (showSpots) {
      spots.forEach(spot => {
        const color = DIFF_COLOR[spot.difficulty] || '#4f7fff'
        const icon  = L.divIcon({
          html: `<div style="width:11px;height:11px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.88);box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>`,
          className: '',
          iconSize: [11, 11],
          iconAnchor: [5, 5],
        })
        const m = L.marker([spot.lat, spot.lng], { icon })
        m.bindTooltip(spot.name, { direction: 'top', offset: [0, -8] })
        m.on('click', () => cbRef.current.onSpotClick(spot))
        m.addTo(map)
        markersRef.current.push(m)
      })
    }

    // Boat launch markers (from spots with access_type containing 'boat' or 'launch')
    if (showLaunch) {
      spots
        .filter(s => /boat|launch|ramp/i.test(s.access_type || ''))
        .forEach(spot => {
          const icon = L.divIcon({
            html: `<div style="width:14px;height:14px;border-radius:3px;background:#8b5cf6;border:2px solid rgba(255,255,255,0.9);box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>`,
            className: '',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          })
          const m = L.marker([spot.lat, spot.lng], { icon })
          m.bindTooltip(`Launch: ${spot.name}`, { direction: 'top', offset: [0, -10] })
          m.on('click', () => cbRef.current.onSpotClick(spot))
          m.addTo(map)
          markersRef.current.push(m)
        })
    }

    // Marina markers
    marinas.forEach(marina => {
      const showThis = showMarinas || (showFuel && marina.has_fuel_dock)
      if (!showThis) return
      const color = marina.usa_wrapco_authorized ? '#22c07a' : (marina.has_fuel_dock ? '#f59e0b' : '#9299b5')
      const icon  = L.divIcon({
        html: `<div style="width:13px;height:13px;border-radius:3px;background:${color};border:2px solid rgba(255,255,255,0.9);box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>`,
        className: '',
        iconSize: [13, 13],
        iconAnchor: [6, 6],
      })
      const m = L.marker([marina.lat, marina.lng], { icon })
      m.bindTooltip(`${marina.name} — ${marina.city}`, { direction: 'top', offset: [0, -10] })
      m.on('click', () => cbRef.current.onMarinaClick(marina))
      m.addTo(map)
      markersRef.current.push(m)
    })

  }, [mapReady, activeLayersStr, spots, marinas]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── User position marker ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !LRef.current) return
    const L = LRef.current
    const map = mapRef.current

    if (userPosition) {
      const latlng: [number, number] = [userPosition.lat, userPosition.lng]
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(latlng)
      } else {
        const icon = L.divIcon({
          html: `<div style="width:16px;height:16px;border-radius:50%;background:#4f7fff;border:3px solid #fff;box-shadow:0 0 0 4px rgba(79,127,255,0.3)"></div>`,
          className: '',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })
        userMarkerRef.current = L.marker(latlng, { icon }).addTo(map)
        userMarkerRef.current.bindTooltip('You are here', { direction: 'top', offset: [0, -12] })
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove()
      userMarkerRef.current = null
    }
  }, [mapReady, userPosition])

  // ── GPS track polyline ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !LRef.current) return
    const L = LRef.current
    const map = mapRef.current

    if (trackLineRef.current) {
      trackLineRef.current.remove()
      trackLineRef.current = null
    }
    if (gpsTrack && gpsTrack.length > 1) {
      trackLineRef.current = L.polyline(gpsTrack, {
        color: '#4f7fff',
        weight: 3,
        opacity: 0.75,
        dashArray: '6 4',
      }).addTo(map)
    }
  }, [mapReady, gpsTrack])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
  )
}
