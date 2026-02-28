'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import {
  Map, Navigation, Truck, Plus, RefreshCw, ZoomIn, ZoomOut,
  AlertTriangle, Activity, MapPin, Gauge, Fuel, Wrench,
  TrendingUp, Clock, FileText, Route, ChevronRight, X,
  Copy, BarChart3, Layers, Eye,
} from 'lucide-react'
import { calcImpressions, calcAnnualCPM, fmtImpressions } from '@/lib/fleet-map/calculations'

// ── Types ────────────────────────────────────────────────────────────────────
interface FleetMaintenance {
  id: string
  item_name: string
  due_date: string | null
  status: string
  cost: number | null
}

interface FleetTrip {
  id: string
  trip_date: string | null
  from_location: string | null
  to_location: string | null
  distance_miles: number | null
  created_at: string
}

interface FleetMileageLog {
  id: string
  log_date: string
  miles: number
  odometer_reading: number | null
  purpose: string | null
}

interface FleetVehicle {
  id: string
  name: string | null
  make: string | null
  model: string | null
  year: number | null
  plate: string | null
  wrap_sqft: number | null
  wrap_date: string | null
  wrap_description: string | null
  fleet_status: string | null
  mileage: number | null
  today_miles: number | null
  speed_mph: number | null
  last_lat: number | null
  last_lng: number | null
  accent_color: string | null
  vehicle_emoji: string | null
  next_service_date: string | null
  fleet_trips: FleetTrip[]
  fleet_maintenance: FleetMaintenance[]
  fleet_mileage_logs: FleetMileageLog[]
}

interface Props {
  initialVehicles: FleetVehicle[]
}

// ── Canvas map geometry (Seattle/Tacoma area, 700×600 base coords) ─────────
const ROADS = [
  { coords: [[540,80],[520,155],[490,260],[450,360],[410,440]] as [number,number][], width: 3, color: 'rgba(255,255,255,0.18)', label: 'I-5' },
  { coords: [[500,100],[480,250],[455,340],[425,420]] as [number,number][], width: 2, color: 'rgba(255,255,255,0.10)', label: 'SR-99' },
  { coords: [[580,120],[560,220],[540,330]] as [number,number][], width: 2, color: 'rgba(255,255,255,0.10)', label: 'I-405' },
  { coords: [[430,400],[310,355],[215,310]] as [number,number][], width: 2, color: 'rgba(255,255,255,0.12)', label: 'SR-16' },
  { coords: [[470,310],[450,400],[430,480]] as [number,number][], width: 2, color: 'rgba(255,255,255,0.10)', label: 'SR-167' },
]
const CITIES = [
  { label: 'Seattle',    x: 530, y: 145 },
  { label: 'Tacoma',     x: 455, y: 415 },
  { label: 'Bellevue',   x: 590, y: 190 },
  { label: 'Auburn',     x: 455, y: 460 },
  { label: 'Puyallup',   x: 370, y: 445 },
  { label: 'Gig Harbor', x: 195, y: 340 },
  { label: 'Bremerton',  x: 95,  y: 215 },
]
const WATER = [
  [0,0, 160,0, 200,80, 180,200, 140,280, 100,320, 60,360, 0,400],
  [380,350, 340,380, 300,420, 260,450, 220,460, 180,450, 160,420, 190,380, 240,360, 300,350],
]

// Geo bbox for Seattle/Tacoma area
const GEO = { minLat: 47.0, maxLat: 47.75, minLng: -122.8, maxLng: -121.9 }

function geoToCanvas(lat: number, lng: number): [number, number] {
  const x = ((lng - GEO.minLng) / (GEO.maxLng - GEO.minLng)) * 700
  const y = ((GEO.maxLat - lat) / (GEO.maxLat - GEO.minLat)) * 600
  return [x, y]
}

// ── Status helpers ───────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  moving: '#22c07a',
  active: '#22c07a',
  parked: '#9299b5',
  maintenance: '#f59e0b',
  inactive: '#5a6080',
}
const STATUS_LABEL: Record<string, string> = {
  moving: 'MOVING',
  active: 'ACTIVE',
  parked: 'PARKED',
  maintenance: 'SERVICE',
  inactive: 'OFFLINE',
}

function shortName(name: string | null): string {
  if (!name) return '?'
  const parts = name.split(' ')
  return parts.slice(-2).join(' ')
}

function isOverdueMaintenance(v: FleetVehicle): boolean {
  const today = new Date().toISOString().split('T')[0]
  if (v.next_service_date && v.next_service_date < today) return true
  return v.fleet_maintenance.some(m => m.status === 'overdue')
}

function isDueSoon(v: FleetVehicle): boolean {
  const soon = new Date()
  soon.setDate(soon.getDate() + 30)
  const soonStr = soon.toISOString().split('T')[0]
  if (v.next_service_date && v.next_service_date <= soonStr) return true
  return false
}

// ── Tab types ────────────────────────────────────────────────────────────────
type RightTab = 'trips' | 'mileage' | 'exposure' | 'portal'

// ── Main Component ───────────────────────────────────────────────────────────
export default function FleetMapClient({ initialVehicles }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  // Vehicle state with live positions
  const [vehicles, setVehicles] = useState<FleetVehicle[]>(() =>
    initialVehicles.map(v => ({
      ...v,
      _px: v.last_lat ?? 47.4,
      _py: v.last_lng ?? -122.4,
    } as FleetVehicle & { _px: number; _py: number }))
  )

  const [selected, setSelected] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<RightTab>('trips')
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showRoutes, setShowRoutes] = useState(true)
  const [hudMiles, setHudMiles] = useState(0)
  const [hudImpressions, setHudImpressions] = useState(0)
  const [portalCopied, setPortalCopied] = useState(false)

  // Trip log form
  const [showTripForm, setShowTripForm] = useState(false)
  const [tripForm, setTripForm] = useState({ trip_date: '', from_location: '', to_location: '', distance_miles: '', notes: '' })
  const [tripSaving, setTripSaving] = useState(false)

  // Mileage log form
  const [showMileageForm, setShowMileageForm] = useState(false)
  const [mileageForm, setMileageForm] = useState({ log_date: '', miles: '', odometer_reading: '', purpose: '' })
  const [mileageSaving, setMileageSaving] = useState(false)

  const selectedVehicle = vehicles.find(v => v.id === selected) ?? null

  // ── Compute HUD totals ─────────────────────────────────────────────────────
  useEffect(() => {
    const totalMiles = vehicles.reduce((s, v) => s + (v.today_miles ?? 0), 0)
    const totalImpr = vehicles.reduce((s, v) => s + calcImpressions(v.today_miles ?? 0, v.wrap_sqft ?? 300), 0)
    setHudMiles(totalMiles)
    setHudImpressions(totalImpr)
  }, [vehicles])

  // ── Live simulation ────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setVehicles(prev => prev.map(v => {
        const status = v.fleet_status
        if (status !== 'moving') return v
        const dlat = (Math.random() - 0.5) * 0.003
        const dlng = (Math.random() - 0.5) * 0.004
        const newLat = Math.max(GEO.minLat, Math.min(GEO.maxLat, (v.last_lat ?? 47.4) + dlat))
        const newLng = Math.max(GEO.minLng, Math.min(GEO.maxLng, (v.last_lng ?? -122.4) + dlng))
        const newSpeed = Math.round(20 + Math.random() * 55)
        const addMiles = Math.round(Math.random() * 2)
        return {
          ...v,
          last_lat: newLat,
          last_lng: newLng,
          speed_mph: newSpeed,
          today_miles: (v.today_miles ?? 0) + addMiles,
        }
      }))
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  // ── Canvas render ──────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height

    const scale = Math.min(W / 700, H / 600) * 0.92 * zoom
    const baseOX = (W - 700 * scale) / 2 + offset.x
    const baseOY = (H - 600 * scale) / 2 + offset.y

    const tx = (x: number) => baseOX + x * scale
    const ty = (y: number) => baseOY + y * scale

    // Background
    ctx.fillStyle = '#05070C'
    ctx.fillRect(0, 0, W, H)

    // Grid
    ctx.strokeStyle = 'rgba(0,212,255,0.03)'
    ctx.lineWidth = 1
    const gridSize = 40 * scale
    const gOX = baseOX % gridSize
    const gOY = baseOY % gridSize
    for (let x = gOX; x < W; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = gOY; y < H; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    // Water
    ctx.fillStyle = 'rgba(0,80,160,0.15)'
    WATER.forEach(poly => {
      ctx.beginPath()
      for (let i = 0; i < poly.length; i += 2) {
        i === 0 ? ctx.moveTo(tx(poly[i]), ty(poly[i + 1])) : ctx.lineTo(tx(poly[i]), ty(poly[i + 1]))
      }
      ctx.closePath()
      ctx.fill()
    })

    // Roads
    if (showRoutes) {
      ROADS.forEach(road => {
        ctx.beginPath()
        ctx.strokeStyle = road.color
        ctx.lineWidth = road.width * scale * 0.8
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        road.coords.forEach(([x, y], i) => {
          i === 0 ? ctx.moveTo(tx(x), ty(y)) : ctx.lineTo(tx(x), ty(y))
        })
        ctx.stroke()
      })
    }

    // City labels
    ctx.font = `${9 * scale}px DM Mono, JetBrains Mono, monospace`
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.textAlign = 'center'
    CITIES.forEach(c => ctx.fillText(c.label, tx(c.x), ty(c.y)))

    // Heatmap overlay
    if (showHeatmap) {
      vehicles.forEach(v => {
        if (!v.last_lat || !v.last_lng) return
        const [cx, cy] = geoToCanvas(v.last_lat, v.last_lng)
        const r = 40 * scale * (1 + (v.today_miles ?? 0) / 200)
        const grad = ctx.createRadialGradient(tx(cx), ty(cy), 0, tx(cx), ty(cy), r)
        grad.addColorStop(0, 'rgba(255,100,0,0.25)')
        grad.addColorStop(1, 'rgba(255,100,0,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(tx(cx), ty(cy), r, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    // Vehicle markers
    const t = Date.now()
    const R = 14 * scale
    vehicles.forEach(v => {
      if (!v.last_lat || !v.last_lng) return
      const [gx, gy] = geoToCanvas(v.last_lat, v.last_lng)
      const mx = tx(gx)
      const my = ty(gy)
      const color = v.accent_color ?? '#00D4FF'
      const isMoving = v.fleet_status === 'moving'
      const isSel = v.id === selected

      // Pulse ring for moving vehicles
      if (isMoving) {
        const pulse = 0.5 + 0.5 * Math.sin(t / 600)
        ctx.beginPath()
        ctx.arc(mx, my, R + 8 * scale * pulse, 0, Math.PI * 2)
        ctx.strokeStyle = color + '40'
        ctx.lineWidth = 2 * scale
        ctx.stroke()
      }

      // Selected: dashed outer ring
      if (isSel) {
        ctx.save()
        ctx.setLineDash([4 * scale, 3 * scale])
        ctx.beginPath()
        ctx.arc(mx, my, R + 10 * scale, 0, Math.PI * 2)
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5 * scale
        ctx.stroke()
        ctx.restore()
      }

      // Glow
      ctx.shadowColor = color
      ctx.shadowBlur = 10 * scale

      // Fill
      ctx.beginPath()
      ctx.arc(mx, my, R, 0, Math.PI * 2)
      ctx.fillStyle = color + '38'
      ctx.fill()

      // Stroke
      ctx.beginPath()
      ctx.arc(mx, my, R, 0, Math.PI * 2)
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5 * scale
      ctx.stroke()

      ctx.shadowBlur = 0

      // Emoji
      ctx.font = `${12 * scale}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fff'
      ctx.fillText(v.vehicle_emoji ?? '🚐', mx, my)

      // Name tag pill
      const tagY = my + R + 9 * scale
      const label = `${shortName(v.name)} · ${v.today_miles ?? 0}mi`
      ctx.font = `bold ${7 * scale}px DM Mono, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const tw = ctx.measureText(label).width
      const ph = 9 * scale
      const pw = tw + 8 * scale
      ctx.fillStyle = 'rgba(5,7,12,0.85)'
      const rx = mx - pw / 2
      ctx.beginPath()
      ctx.roundRect(rx, tagY, pw, ph, 3 * scale)
      ctx.fill()
      ctx.strokeStyle = color + '60'
      ctx.lineWidth = 0.8 * scale
      ctx.stroke()
      ctx.fillStyle = color
      ctx.fillText(label, mx, tagY + 1 * scale)
      ctx.textBaseline = 'alphabetic'
    })

    animRef.current = requestAnimationFrame(draw)
  }, [vehicles, selected, zoom, offset, showHeatmap, showRoutes])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    animRef.current = requestAnimationFrame(draw)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(animRef.current)
    }
  }, [draw])

  // ── Canvas interaction ─────────────────────────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragging) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const W = canvas.width
    const H = canvas.height
    const scale = Math.min(W / 700, H / 600) * 0.92 * zoom
    const baseOX = (W - 700 * scale) / 2 + offset.x
    const baseOY = (H - 600 * scale) / 2 + offset.y
    const tx = (x: number) => baseOX + x * scale
    const ty = (y: number) => baseOY + y * scale
    const R = 14 * scale

    let hit: string | null = null
    vehicles.forEach(v => {
      if (!v.last_lat || !v.last_lng) return
      const [gx, gy] = geoToCanvas(v.last_lat, v.last_lng)
      const mx = tx(gx)
      const my = ty(gy)
      const dist = Math.hypot(cx - mx, cy - my)
      if (dist < R + 5) hit = v.id
    })
    setSelected(hit)
    if (hit) setRightTab('trips')
  }, [vehicles, zoom, offset, dragging])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDragging(false)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1) return
    setDragging(true)
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setZoom(z => Math.max(0.5, Math.min(4, z - e.deltaY * 0.001)))
  }

  const resetView = () => { setZoom(1); setOffset({ x: 0, y: 0 }) }

  // Pan to vehicle
  const panTo = useCallback((v: FleetVehicle) => {
    const canvas = canvasRef.current
    if (!canvas || !v.last_lat || !v.last_lng) return
    const W = canvas.width
    const H = canvas.height
    const scale = Math.min(W / 700, H / 600) * 0.92 * zoom
    const [gx, gy] = geoToCanvas(v.last_lat, v.last_lng)
    const baseOX = (W - 700 * scale) / 2
    const baseOY = (H - 600 * scale) / 2
    const mx = baseOX + gx * scale
    const my = baseOY + gy * scale
    setOffset({ x: W / 2 - mx, y: H / 2 - my })
  }, [zoom])

  // ── Maintenance alert ──────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const overdueVehicles = vehicles.filter(v => isOverdueMaintenance(v))
  const dueSoonVehicles = vehicles.filter(v => !isOverdueMaintenance(v) && isDueSoon(v))
  const alertCount = overdueVehicles.length + dueSoonVehicles.length

  // ── Stats ──────────────────────────────────────────────────────────────────
  const activeCount = vehicles.filter(v => v.fleet_status === 'moving' || v.fleet_status === 'active').length

  // ── Trip form submit ───────────────────────────────────────────────────────
  async function submitTrip() {
    if (!selected || !tripForm.from_location) return
    setTripSaving(true)
    try {
      await fetch('/api/fleet-map/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...tripForm, vehicle_id: selected, distance_miles: parseFloat(tripForm.distance_miles) || 0 }),
      })
      setShowTripForm(false)
      setTripForm({ trip_date: '', from_location: '', to_location: '', distance_miles: '', notes: '' })
    } finally {
      setTripSaving(false)
    }
  }

  // ── Mileage form submit ────────────────────────────────────────────────────
  async function submitMileage() {
    if (!selected || !mileageForm.miles) return
    setMileageSaving(true)
    try {
      await fetch('/api/fleet-map/mileage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...mileageForm, vehicle_id: selected, miles: parseFloat(mileageForm.miles), odometer_reading: mileageForm.odometer_reading ? parseInt(mileageForm.odometer_reading) : undefined }),
      })
      setShowMileageForm(false)
      setMileageForm({ log_date: '', miles: '', odometer_reading: '', purpose: '' })
    } finally {
      setMileageSaving(false)
    }
  }

  // ── Exposure calc ──────────────────────────────────────────────────────────
  const sv = selectedVehicle
  const svImprToday = sv ? calcImpressions(sv.today_miles ?? 0, sv.wrap_sqft ?? 300) : 0
  const svImprAnnual = svImprToday * 365
  const svCPM = sv ? calcAnnualCPM(sv.wrap_sqft ?? 300, svImprAnnual) : '0'

  // ── Right panel trips/mileage from DB ─────────────────────────────────────
  const svTrips = sv?.fleet_trips ?? []
  const svMileage = sv?.fleet_mileage_logs ?? []
  const maxTripMiles = Math.max(...svTrips.map(t => t.distance_miles ?? 0), 1)
  const mileageBars = svMileage.slice(0, 6)
  const maxBarMiles = Math.max(...mileageBars.map(m => Number(m.miles)), 1)

  // ── Portal copy ────────────────────────────────────────────────────────────
  const portalLink = typeof window !== 'undefined' ? `${window.location.origin}/fleet-map` : '/fleet-map'
  function copyPortal() {
    navigator.clipboard.writeText(portalLink).catch(() => {})
    setPortalCopied(true)
    setTimeout(() => setPortalCopied(false), 2000)
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const S = {
    panel: { background: 'var(--surface)', borderRight: '1px solid rgba(255,255,255,0.06)' } as React.CSSProperties,
    panelR: { background: 'var(--surface)', borderLeft: '1px solid rgba(255,255,255,0.06)' } as React.CSSProperties,
    pill: (c: string): React.CSSProperties => ({ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: c + '20', color: c, letterSpacing: '0.06em' }),
    input: { background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 10px', color: 'var(--text1)', fontSize: 12, width: '100%' } as React.CSSProperties,
    btn: (c: string): React.CSSProperties => ({ background: c + '20', border: `1px solid ${c}40`, borderRadius: 6, padding: '6px 12px', color: c, fontSize: 11, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em' }),
    hudCard: { background: 'rgba(5,7,12,0.88)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(8px)' } as React.CSSProperties,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#05070C', overflow: 'hidden' }}>

      {/* ── Maintenance Alert Banner ─────────────────────────────────────── */}
      {alertCount > 0 && (
        <div style={{ background: 'rgba(242,90,90,0.12)', borderBottom: '1px solid rgba(242,90,90,0.3)', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <AlertTriangle size={14} color="var(--red)" />
          <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>
            {alertCount} vehicle{alertCount > 1 ? 's' : ''} {overdueVehicles.length > 0 ? 'have overdue or due' : 'have upcoming'} maintenance — click to review
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>
            {overdueVehicles.map(v => v.name).join(', ')}
          </span>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ height: 54, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0, background: 'var(--surface)' }}>
        <Map size={18} color="var(--cyan)" />
        <div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 17, color: 'var(--text1)', letterSpacing: '0.02em', lineHeight: 1 }}>Fleet Live Map</div>
          <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '0.08em' }}>WRAPSHOP PRO · GPS TRACKING & ROI</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700, letterSpacing: '0.08em' }}>LIVE</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={S.btn('var(--cyan)')} onClick={() => {}}>
            <Route size={12} style={{ display: 'inline', marginRight: 4 }} />Routes
          </button>
          <button style={S.btn('var(--accent)')}>
            <Plus size={12} style={{ display: 'inline', marginRight: 4 }} />Add Vehicle
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Left Panel: Vehicle List ────────────────────────────────────── */}
        <div style={{ width: 280, flexShrink: 0, overflow: 'hidden auto', ...S.panel, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Fleet Vehicles · {vehicles.length}
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'hidden auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {vehicles.map(v => {
              const statusColor = STATUS_COLOR[v.fleet_status ?? 'inactive'] ?? '#5a6080'
              const isSel = v.id === selected
              const impressions = calcImpressions(v.today_miles ?? 0, v.wrap_sqft ?? 300)
              const overdue = isOverdueMaintenance(v)

              return (
                <div
                  key={v.id}
                  onClick={() => { setSelected(v.id); panTo(v); setRightTab('trips') }}
                  style={{
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: `1px solid ${isSel ? (v.accent_color ?? '#00D4FF') + '60' : 'rgba(255,255,255,0.06)'}`,
                    background: isSel ? (v.accent_color ?? '#00D4FF') + '08' : 'var(--surface2)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Accent bar */}
                  <div style={{ height: 2, background: `linear-gradient(90deg, ${v.accent_color ?? '#00D4FF'}, transparent)` }} />
                  <div style={{ padding: '8px 10px' }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>{v.vehicle_emoji ?? '🚐'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name ?? 'Unknown'}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{v.plate ?? '—'}</div>
                      </div>
                      <span style={S.pill(statusColor)}>{STATUS_LABEL[v.fleet_status ?? 'inactive'] ?? 'UNKNOWN'}</span>
                    </div>
                    {/* Stats row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 6 }}>
                      {[
                        { label: 'MI/DAY', value: (v.today_miles ?? 0).toString() },
                        { label: 'MPH', value: v.fleet_status === 'moving' ? (v.speed_mph ?? 0).toString() : '—' },
                        { label: 'IMPR', value: fmtImpressions(impressions) },
                      ].map(stat => (
                        <div key={stat.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '4px 6px', textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{stat.value}</div>
                          <div style={{ fontSize: 8, color: 'var(--text3)', letterSpacing: '0.06em' }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>
                    {/* Status line */}
                    {overdue ? (
                      <div style={{ fontSize: 10, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Wrench size={10} />{v.fleet_status === 'maintenance' ? 'In maintenance' : 'Service overdue'}
                      </div>
                    ) : v.fleet_status === 'moving' ? (
                      <div style={{ fontSize: 10, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Navigation size={10} />En route · {v.speed_mph ?? 0} mph
                      </div>
                    ) : (
                      <div style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={10} />{v.wrap_description ? v.wrap_description.split('—')[0].trim() : 'Parked'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Add vehicle card */}
            <div
              style={{
                borderRadius: 8,
                border: '1px dashed rgba(255,255,255,0.12)',
                padding: '14px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'pointer',
                color: 'var(--text3)',
                fontSize: 12,
                transition: 'all 0.15s',
              }}
            >
              <Plus size={13} />Add Vehicle
            </div>
          </div>
        </div>

        {/* ── Center: Canvas Map ──────────────────────────────────────────── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block', cursor: dragging ? 'grabbing' : 'crosshair' }}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setTimeout(() => setDragging(false), 50)}
            onWheel={handleWheel}
          />

          {/* ── HUD: Top Left Fleet Summary ─────────────────────────────── */}
          <div style={{ position: 'absolute', top: 12, left: 12, ...S.hudCard, minWidth: 200 }}>
            <div style={{ fontSize: 9, color: 'var(--cyan)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>FLEET SUMMARY</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Active', value: activeCount.toString(), color: 'var(--green)' },
                { label: 'Total mi/day', value: hudMiles.toString(), color: 'var(--cyan)' },
                { label: 'Impressions', value: fmtImpressions(hudImpressions), color: 'var(--accent)' },
                { label: 'Alerts', value: alertCount.toString(), color: alertCount > 0 ? 'var(--red)' : 'var(--text3)' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: 'var(--text3)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── HUD: Bottom Left Selected Vehicle ──────────────────────── */}
          {sv && (
            <div style={{ position: 'absolute', bottom: 12, left: 12, ...S.hudCard, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{sv.vehicle_emoji ?? '🚐'}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: sv.accent_color ?? 'var(--cyan)' }}>{sv.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{sv.plate}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0 }}>
                  <X size={12} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                {[
                  { label: 'STATUS', value: STATUS_LABEL[sv.fleet_status ?? 'inactive'], color: STATUS_COLOR[sv.fleet_status ?? 'inactive'] },
                  { label: 'TODAY MI', value: (sv.today_miles ?? 0).toString(), color: 'var(--text1)' },
                  { label: 'SPEED', value: sv.fleet_status === 'moving' ? `${sv.speed_mph ?? 0} mph` : '—', color: 'var(--text1)' },
                  { label: 'ODOMETER', value: ((sv.mileage ?? 0) / 1000).toFixed(0) + 'k', color: 'var(--text1)' },
                  { label: 'IMPRESSIONS', value: fmtImpressions(svImprToday), color: 'var(--accent)' },
                  { label: 'WRAP SQFT', value: (sv.wrap_sqft ?? 0).toString(), color: 'var(--text1)' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '4px 6px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                    <div style={{ fontSize: 8, color: 'var(--text3)', letterSpacing: '0.04em' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── HUD: Top Right Controls ─────────────────────────────────── */}
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { icon: <Activity size={13} />, label: 'Traffic', active: false, onClick: () => {} },
              { icon: <Layers size={13} />, label: 'Heatmap', active: showHeatmap, onClick: () => setShowHeatmap(h => !h) },
              { icon: <Route size={13} />, label: 'Routes', active: showRoutes, onClick: () => setShowRoutes(r => !r) },
              { icon: <RefreshCw size={13} />, label: 'Reset', active: false, onClick: resetView },
              { icon: <ZoomIn size={13} />, label: '+', active: false, onClick: () => setZoom(z => Math.min(4, z + 0.25)) },
              { icon: <ZoomOut size={13} />, label: '−', active: false, onClick: () => setZoom(z => Math.max(0.5, z - 0.25)) },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                title={btn.label}
                style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: btn.active ? 'rgba(0,212,255,0.2)' : 'rgba(5,7,12,0.88)',
                  border: `1px solid ${btn.active ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: btn.active ? 'var(--cyan)' : 'var(--text2)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {btn.icon}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right Panel: Data Tabs ──────────────────────────────────────── */}
        <div style={{ width: 270, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', ...S.panelR }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            {(['trips','mileage','exposure','portal'] as RightTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                style={{
                  flex: 1, height: 38, border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: rightTab === tab ? 'var(--cyan)' : 'var(--text3)',
                  borderBottom: rightTab === tab ? '2px solid var(--cyan)' : '2px solid transparent',
                  transition: 'all 0.12s',
                }}
              >
                {tab === 'trips' ? 'Trips' : tab === 'mileage' ? 'Miles' : tab === 'exposure' ? 'ROI' : 'Portal'}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'hidden auto', padding: 12 }}>

            {/* ── TRIPS TAB ─────────────────────────────────────────────── */}
            {rightTab === 'trips' && (
              <div>
                {!sv ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)', fontSize: 12 }}>Select a vehicle to view trips</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>{sv.name} · Trips</div>
                      <button style={S.btn('var(--green)')} onClick={() => setShowTripForm(t => !t)}>
                        <Plus size={10} style={{ display: 'inline', marginRight: 3 }} />Log
                      </button>
                    </div>

                    {showTripForm && (
                      <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 10, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input placeholder="Date (YYYY-MM-DD)" style={S.input} value={tripForm.trip_date} onChange={e => setTripForm(f => ({ ...f, trip_date: e.target.value }))} />
                        <input placeholder="From" style={S.input} value={tripForm.from_location} onChange={e => setTripForm(f => ({ ...f, from_location: e.target.value }))} />
                        <input placeholder="To" style={S.input} value={tripForm.to_location} onChange={e => setTripForm(f => ({ ...f, to_location: e.target.value }))} />
                        <input placeholder="Miles" type="number" style={S.input} value={tripForm.distance_miles} onChange={e => setTripForm(f => ({ ...f, distance_miles: e.target.value }))} />
                        <input placeholder="Notes (optional)" style={S.input} value={tripForm.notes} onChange={e => setTripForm(f => ({ ...f, notes: e.target.value }))} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={{ ...S.btn('var(--green)'), flex: 1 }} onClick={submitTrip} disabled={tripSaving}>{tripSaving ? 'Saving…' : 'Save Trip'}</button>
                          <button style={S.btn('var(--text3)')} onClick={() => setShowTripForm(false)}>Cancel</button>
                        </div>
                      </div>
                    )}

                    {svTrips.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 11 }}>No trips logged yet</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {svTrips.map(trip => {
                          const pct = Math.round(((trip.distance_miles ?? 0) / maxTripMiles) * 100)
                          return (
                            <div key={trip.id} style={{ background: 'var(--surface2)', borderRadius: 6, padding: '8px 10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text1)', fontWeight: 600 }}>
                                  {trip.from_location ?? 'Trip'}{trip.to_location ? ` → ${trip.to_location}` : ''}
                                </span>
                                <span style={{ fontSize: 10, color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace' }}>{trip.distance_miles ?? 0} mi</span>
                              </div>
                              <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 5 }}>{trip.trip_date ?? trip.created_at?.split('T')[0]}</div>
                              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--cyan)', borderRadius: 2 }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── MILEAGE TAB ───────────────────────────────────────────── */}
            {rightTab === 'mileage' && (
              <div>
                {!sv ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)', fontSize: 12 }}>Select a vehicle</div>
                ) : (
                  <>
                    {/* Odometer */}
                    <div style={{ textAlign: 'center', background: 'var(--surface2)', borderRadius: 8, padding: '14px 10px', marginBottom: 10 }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>ODOMETER</div>
                      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan)' }}>
                        {(sv.mileage ?? 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>miles</div>
                    </div>

                    {/* Service alert */}
                    {sv.next_service_date && sv.next_service_date <= new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] && (
                      <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 6, padding: '8px 10px', marginBottom: 10, fontSize: 11, color: 'var(--amber)' }}>
                        <Wrench size={11} style={{ display: 'inline', marginRight: 4 }} />
                        Service due: {sv.next_service_date}
                      </div>
                    )}

                    {/* Bar chart */}
                    {mileageBars.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.06em' }}>RECENT MILEAGE LOGS</div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 50 }}>
                          {mileageBars.map(log => {
                            const h = Math.max(4, (Number(log.miles) / maxBarMiles) * 46)
                            return (
                              <div key={log.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <div style={{ width: '100%', height: h, background: 'var(--accent)', borderRadius: '2px 2px 0 0', opacity: 0.7 }} />
                                <div style={{ fontSize: 7, color: 'var(--text3)' }}>{Number(log.miles).toFixed(0)}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Log mileage */}
                    <button style={{ ...S.btn('var(--green)'), width: '100%', marginBottom: 8 }} onClick={() => setShowMileageForm(m => !m)}>
                      <Plus size={10} style={{ display: 'inline', marginRight: 4 }} />Log Mileage
                    </button>
                    {showMileageForm && (
                      <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 10, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input placeholder="Date (YYYY-MM-DD)" style={S.input} value={mileageForm.log_date} onChange={e => setMileageForm(f => ({ ...f, log_date: e.target.value }))} />
                        <input placeholder="Miles driven" type="number" style={S.input} value={mileageForm.miles} onChange={e => setMileageForm(f => ({ ...f, miles: e.target.value }))} />
                        <input placeholder="Odometer reading" type="number" style={S.input} value={mileageForm.odometer_reading} onChange={e => setMileageForm(f => ({ ...f, odometer_reading: e.target.value }))} />
                        <input placeholder="Purpose" style={S.input} value={mileageForm.purpose} onChange={e => setMileageForm(f => ({ ...f, purpose: e.target.value }))} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={{ ...S.btn('var(--green)'), flex: 1 }} onClick={submitMileage} disabled={mileageSaving}>{mileageSaving ? 'Saving…' : 'Save'}</button>
                          <button style={S.btn('var(--text3)')} onClick={() => setShowMileageForm(false)}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── EXPOSURE (ROI) TAB ────────────────────────────────────── */}
            {rightTab === 'exposure' && (
              <div>
                {!sv ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)', fontSize: 12 }}>Select a vehicle to view ROI</div>
                ) : (
                  <>
                    {/* Big impression number */}
                    <div style={{ textAlign: 'center', background: 'var(--surface2)', borderRadius: 8, padding: '14px 10px', marginBottom: 10 }}>
                      <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 4, letterSpacing: '0.08em' }}>TODAY IMPRESSIONS</div>
                      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>
                        {fmtImpressions(svImprToday)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>from {sv.today_miles ?? 0} mi · {sv.wrap_sqft ?? 0} sqft</div>
                    </div>

                    {/* Annual projection */}
                    <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>Annual projection</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtImpressions(svImprAnnual)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>Effective CPM</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace' }}>${svCPM}</span>
                      </div>
                    </div>

                    {/* Comparison table */}
                    <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                      <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 8, letterSpacing: '0.06em' }}>VS TRADITIONAL MEDIA</div>
                      {[
                        { label: 'Billboard', cpm: 1.50 },
                        { label: 'Digital', cpm: 3.00 },
                        { label: 'Radio', cpm: 8.00 },
                        { label: 'Vehicle Wrap', cpm: parseFloat(svCPM) || 0 },
                      ].map(row => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ fontSize: 11, color: row.label === 'Vehicle Wrap' ? 'var(--green)' : 'var(--text2)' }}>{row.label}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: row.label === 'Vehicle Wrap' ? 'var(--green)' : 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>${row.cpm.toFixed(2)} CPM</span>
                        </div>
                      ))}
                    </div>

                    {/* Formula explainer */}
                    <div style={{ background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.15)', borderRadius: 6, padding: '8px 10px', fontSize: 10, color: 'var(--text3)', lineHeight: 1.5 }}>
                      <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 4, fontSize: 9, letterSpacing: '0.06em' }}>FORMULA</div>
                      Miles × 2,800 × sqft multiplier<br />
                      (&lt;350 sqft: ×1.0 · 350–500: ×1.15 · 500+: ×1.3)<br />
                      CPM = (sqft × $8.50) / (annual ÷ 1000)
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── PORTAL TAB ────────────────────────────────────────────── */}
            {rightTab === 'portal' && (
              <div>
                {/* Banner */}
                <div style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--purple)', letterSpacing: '0.1em' }}>CUSTOMER PORTAL VIEW</div>
                </div>

                {!sv ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 12 }}>Select a vehicle to view portal</div>
                ) : (
                  <>
                    {/* Impression counter */}
                    <div style={{ textAlign: 'center', background: 'var(--surface2)', borderRadius: 8, padding: '12px 10px', marginBottom: 10 }}>
                      <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 4 }}>CUSTOMER IMPRESSIONS</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--purple)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {fmtImpressions(svImprToday)}
                      </div>
                    </div>

                    {/* Location & status */}
                    <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>Vehicle</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text1)' }}>{sv.name}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>Status</span>
                        <span style={S.pill(STATUS_COLOR[sv.fleet_status ?? 'inactive'])}>{STATUS_LABEL[sv.fleet_status ?? 'inactive']}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>Wrap</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)', maxWidth: 120, textAlign: 'right' }}>{sv.wrap_description?.split('—')[0].trim() ?? '—'}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                      {[
                        { label: 'Full Report', icon: <FileText size={11} />, color: 'var(--accent)' },
                        { label: 'View Map', icon: <Map size={11} />, color: 'var(--cyan)' },
                        { label: 'Log Miles', icon: <Gauge size={11} />, color: 'var(--green)' },
                        { label: 'Request Svc', icon: <Wrench size={11} />, color: 'var(--amber)' },
                      ].map(action => (
                        <button key={action.label} style={{ ...S.btn(action.color), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          {action.icon}{action.label}
                        </button>
                      ))}
                    </div>

                    {/* Share link */}
                    <button
                      onClick={copyPortal}
                      style={{ ...S.btn('var(--purple)'), width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <Copy size={11} />
                      {portalCopied ? 'Copied!' : 'Share portal link →'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}
