'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import {
  Map as MapIcon, Navigation, Truck, Plus, RefreshCw, ZoomIn, ZoomOut,
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

// ── Detailed road network (700×600 canvas coords, Seattle/Tacoma/Gig Harbor) ─
const INTERSTATES = [
  // I-5 main (Seattle → Tacoma)
  { coords: [[540,70],[530,110],[520,155],[510,200],[495,260],[475,310],[458,355],[445,400],[430,445],[415,490]] as [number,number][], width: 5, color: 'rgba(255,200,50,0.35)', label: 'I-5' },
  // I-405 (Bellevue/Renton)
  { coords: [[590,110],[580,160],[570,220],[560,280],[550,340]] as [number,number][], width: 4, color: 'rgba(255,200,50,0.28)', label: 'I-405' },
  // I-90 (east-west, Seattle to Eastside)
  { coords: [[440,195],[490,190],[540,185],[590,182],[640,180]] as [number,number][], width: 4, color: 'rgba(255,200,50,0.28)', label: 'I-90' },
]

const STATE_HWYS = [
  // SR-99 (parallel to I-5)
  { coords: [[510,75],[500,130],[488,200],[474,270],[460,330],[445,390],[430,450]] as [number,number][], width: 3, color: 'rgba(255,255,255,0.18)', label: 'SR-99' },
  // SR-167 (Valley Freeway)
  { coords: [[470,290],[463,340],[455,395],[448,450],[442,510]] as [number,number][], width: 3, color: 'rgba(255,255,255,0.16)', label: 'SR-167' },
  // SR-16 (Gig Harbor / Tacoma Narrows)
  { coords: [[430,420],[390,390],[340,365],[280,345],[230,330],[175,318],[130,305]] as [number,number][], width: 3, color: 'rgba(255,255,255,0.18)', label: 'SR-16' },
  // SR-512 (east-west Puyallup)
  { coords: [[442,460],[400,456],[360,452],[320,448],[280,445]] as [number,number][], width: 3, color: 'rgba(255,255,255,0.15)', label: 'SR-512' },
  // SR-18 (Auburn to Covington)
  { coords: [[450,475],[480,480],[510,478],[540,472],[570,462]] as [number,number][], width: 3, color: 'rgba(255,255,255,0.15)', label: 'SR-18' },
  // SR-3 (Bremerton corridor)
  { coords: [[95,190],[90,240],[88,290],[92,340],[98,380]] as [number,number][], width: 2.5, color: 'rgba(255,255,255,0.14)', label: 'SR-3' },
  // SR-302 (Gig Harbor → Purdy)
  { coords: [[175,310],[155,330],[135,350],[115,360],[90,370]] as [number,number][], width: 2, color: 'rgba(255,255,255,0.12)', label: 'SR-302' },
]

const ARTERIALS = [
  // Tacoma area
  { coords: [[430,420],[420,430],[415,450],[410,470]] as [number,number][], width: 2, color: 'rgba(255,255,255,0.10)', label: 'Pacific Ave' },
  { coords: [[455,400],[480,405],[500,400],[520,390]] as [number,number][], width: 2, color: 'rgba(255,255,255,0.09)', label: 'E 72nd St' },
  { coords: [[445,375],[465,370],[490,368],[510,368]] as [number,number][], width: 2, color: 'rgba(255,255,255,0.09)', label: 'S 38th St' },
  // Gig Harbor main
  { coords: [[195,325],[185,340],[178,360],[172,380],[175,400]] as [number,number][], width: 2, color: 'rgba(255,255,255,0.10)', label: 'Harborview Dr' },
  { coords: [[200,315],[220,320],[245,325],[265,330]] as [number,number][], width: 1.5, color: 'rgba(255,255,255,0.08)', label: 'Stinson Ave' },
  // Auburn
  { coords: [[450,465],[460,485],[468,505],[472,525]] as [number,number][], width: 2, color: 'rgba(255,255,255,0.09)', label: 'Auburn Way' },
  // Renton
  { coords: [[545,335],[555,320],[565,305],[575,290]] as [number,number][], width: 1.5, color: 'rgba(255,255,255,0.08)', label: 'Rainier Ave' },
  // Federal Way
  { coords: [[420,370],[435,368],[455,366],[470,365]] as [number,number][], width: 2, color: 'rgba(255,255,255,0.09)', label: 'S 320th' },
  // South Seattle
  { coords: [[490,220],[500,230],[510,240],[520,245]] as [number,number][], width: 2, color: 'rgba(255,255,255,0.09)', label: 'Rainier Ave N' },
  // Puyallup
  { coords: [[365,445],[370,460],[375,480],[378,500]] as [number,number][], width: 1.5, color: 'rgba(255,255,255,0.08)', label: 'Meridian' },
]

const LOCAL_STREETS = [
  // Tacoma streets grid
  { coords: [[440,390],[440,420],[440,450],[440,480]] as [number,number][], width: 1, color: 'rgba(255,255,255,0.05)' },
  { coords: [[460,385],[460,415],[460,445],[460,475]] as [number,number][], width: 1, color: 'rgba(255,255,255,0.05)' },
  { coords: [[415,400],[430,400],[450,400],[470,400]] as [number,number][], width: 1, color: 'rgba(255,255,255,0.05)' },
  { coords: [[415,415],[430,415],[450,415],[470,415]] as [number,number][], width: 1, color: 'rgba(255,255,255,0.05)' },
  { coords: [[415,430],[430,430],[450,430],[470,430]] as [number,number][], width: 1, color: 'rgba(255,255,255,0.05)' },
  // Gig Harbor local
  { coords: [[180,325],[185,345],[190,365],[192,385]] as [number,number][], width: 1, color: 'rgba(255,255,255,0.04)' },
  { coords: [[200,320],[205,340],[208,360],[210,380]] as [number,number][], width: 1, color: 'rgba(255,255,255,0.04)' },
  // Auburn/Kent grid
  { coords: [[445,455],[455,455],[465,455],[475,455]] as [number,number][], width: 1, color: 'rgba(255,255,255,0.05)' },
  { coords: [[448,470],[458,470],[468,470],[478,470]] as [number,number][], width: 1, color: 'rgba(255,255,255,0.05)' },
]

const CITIES = [
  { label: 'SEATTLE',    x: 528, y: 140, size: 11, weight: 700, color: 'rgba(255,255,255,0.35)' },
  { label: 'TACOMA',     x: 450, y: 408, size: 10, weight: 700, color: 'rgba(255,255,255,0.32)' },
  { label: 'BELLEVUE',   x: 592, y: 185, size: 9, weight: 600, color: 'rgba(255,255,255,0.22)' },
  { label: 'RENTON',     x: 558, y: 310, size: 8, weight: 600, color: 'rgba(255,255,255,0.18)' },
  { label: 'KENT',       x: 488, y: 355, size: 8, weight: 600, color: 'rgba(255,255,255,0.18)' },
  { label: 'AUBURN',     x: 460, y: 480, size: 8, weight: 600, color: 'rgba(255,255,255,0.18)' },
  { label: 'FEDERAL WAY',x: 435, y: 363, size: 8, weight: 600, color: 'rgba(255,255,255,0.16)' },
  { label: 'PUYALLUP',   x: 365, y: 440, size: 8, weight: 600, color: 'rgba(255,255,255,0.18)' },
  { label: 'GIG HARBOR', x: 193, y: 328, size: 8, weight: 600, color: 'rgba(34,192,122,0.6)' },
  { label: 'BREMERTON',  x: 92,  y: 210, size: 8, weight: 600, color: 'rgba(255,255,255,0.18)' },
  { label: 'TACOMA NARROWS', x: 310, y: 355, size: 7, weight: 400, color: 'rgba(0,130,255,0.35)' },
  { label: 'PORT OF TACOMA', x: 500, y: 445, size: 7, weight: 400, color: 'rgba(150,150,180,0.3)' },
  { label: 'JBLM',       x: 400, y: 530, size: 7, weight: 400, color: 'rgba(150,150,180,0.3)' },
]

// ── Water polygons ────────────────────────────────────────────────────────────
// Puget Sound main body (left side)
const WATER_MAIN = [0,30, 80,0, 130,50, 155,110, 165,170, 170,230, 165,290, 155,340, 140,380, 120,420, 90,460, 60,500, 30,540, 0,580, 0,600, 0,600]
// Commencement Bay
const WATER_COMMENCEMENT = [430,420, 450,440, 470,460, 490,448, 505,435, 490,418, 465,410, 445,412]
// Narrows / Gig Harbor area
const WATER_NARROWS = [240,310, 260,300, 310,295, 335,310, 345,330, 330,350, 300,360, 270,355, 245,340, 235,325]
// Vashon Island
const VASHON = [275,150, 295,120, 320,110, 340,125, 348,160, 342,200, 330,240, 310,275, 285,290, 265,280, 255,255, 260,210, 268,180]
// Bainbridge Island
const BAINBRIDGE = [175,50, 195,30, 220,25, 240,40, 248,70, 242,110, 230,145, 210,170, 188,175, 172,160, 168,130, 170,90]
// Lake Washington
const LAKE_WASH = [600,80, 630,90, 648,120, 650,160, 645,200, 635,240, 618,270, 600,270, 590,240, 586,200, 590,160, 596,120]

// ── Gas Stations ──────────────────────────────────────────────────────────────
const GAS_STATIONS = [
  // I-5 corridor
  { id: 'g1', x: 525, y: 130, name: 'Shell', address: 'Aurora Ave N, Seattle', regular: 3.89, premium: 4.29 },
  { id: 'g2', x: 516, y: 175, name: 'Arco', address: 'S Jackson St, Seattle', regular: 3.75, premium: 4.15 },
  { id: 'g3', x: 505, y: 225, name: 'Chevron', address: 'Rainier Ave S', regular: 3.92, premium: 4.32 },
  { id: 'g4', x: 494, y: 275, name: 'Shell', address: 'MLK Jr Way, Tukwila', regular: 3.88, premium: 4.28 },
  { id: 'g5', x: 483, y: 320, name: 'Arco', address: 'International Blvd, SeaTac', regular: 3.74, premium: 4.14 },
  { id: 'g6', x: 472, y: 365, name: 'Chevron', address: 'Pacific Hwy S, Federal Way', regular: 3.91, premium: 4.31 },
  { id: 'g7', x: 463, y: 405, name: 'Shell', address: 'S Tacoma Way', regular: 3.87, premium: 4.27 },
  { id: 'g8', x: 452, y: 445, name: 'Arco', address: 'Portland Ave, Tacoma', regular: 3.73, premium: 4.13 },
  { id: 'g9', x: 440, y: 485, name: 'Chevron', address: 'Pacific Ave S, Tacoma', regular: 3.90, premium: 4.30 },
  { id: 'g10', x: 428, y: 525, name: 'Shell', address: '41st Division Dr, Lakewood', regular: 3.86, premium: 4.26 },
  // East side (I-405)
  { id: 'g11', x: 580, y: 150, name: 'BP', address: 'Bel-Red Rd, Bellevue', regular: 3.95, premium: 4.35 },
  { id: 'g12', x: 570, y: 220, name: 'Chevron', address: 'Lind Ave SW, Renton', regular: 3.93, premium: 4.33 },
  { id: 'g13', x: 555, y: 300, name: 'Shell', address: 'S Grady Way, Renton', regular: 3.89, premium: 4.29 },
  { id: 'g14', x: 540, y: 350, name: 'Arco', address: '84th Ave S, Kent', regular: 3.76, premium: 4.16 },
  // Gig Harbor / Peninsula
  { id: 'g15', x: 190, y: 310, name: 'Shell', address: 'Pt Fosdick Dr, Gig Harbor', regular: 3.94, premium: 4.34 },
  { id: 'g16', x: 215, y: 325, name: 'Chevron', address: 'Olympic Dr, Gig Harbor', regular: 3.92, premium: 4.32 },
  { id: 'g17', x: 155, y: 340, name: 'Arco', address: 'Burnham Dr NW, Gig Harbor', regular: 3.78, premium: 4.18 },
  { id: 'g18', x: 240, y: 335, name: 'Shell', address: 'Purdy Dr NW', regular: 3.88, premium: 4.28 },
  { id: 'g19', x: 120, y: 355, name: 'Chevron', address: 'SR-302, Gig Harbor North', regular: 3.91, premium: 4.31 },
  // Bremerton
  { id: 'g20', x: 95, y: 195, name: 'Shell', address: 'Wheaton Way, Bremerton', regular: 3.90, premium: 4.30 },
  { id: 'g21', x: 78, y: 225, name: 'Arco', address: 'Kitsap Way, Bremerton', regular: 3.77, premium: 4.17 },
  { id: 'g22', x: 108, y: 260, name: 'Chevron', address: 'Sylvan Way, Bremerton', regular: 3.92, premium: 4.32 },
  // SR-16 corridor
  { id: 'g23', x: 330, y: 365, name: 'Shell', address: 'SR-16 & Jackson Ave', regular: 3.87, premium: 4.27 },
  { id: 'g24', x: 278, y: 348, name: 'Arco', address: 'SR-16 & Wollochet Dr', regular: 3.75, premium: 4.15 },
  { id: 'g25', x: 385, y: 390, name: 'Chevron', address: 'N Pearl St, Tacoma', regular: 3.91, premium: 4.31 },
]

// ── Truck Parking ─────────────────────────────────────────────────────────────
const TRUCK_PARKING = [
  { id: 'tp1', x: 488, y: 430, name: 'Port of Tacoma Truck Lot', spaces: 45, overnight: true },
  { id: 'tp2', x: 467, y: 358, name: 'Federal Way Truck Stop', spaces: 28, overnight: true },
  { id: 'tp3', x: 476, y: 340, name: 'Petro Truck Stop - Auburn', spaces: 60, overnight: true },
  { id: 'tp4', x: 458, y: 310, name: 'Kent Valley Parking', spaces: 18, overnight: false },
  { id: 'tp5', x: 390, y: 536, name: 'JBLM Gate 3 Lot', spaces: 35, overnight: false },
]

// ── Vehicle Service ────────────────────────────────────────────────────────────
const VEHICLE_SERVICES = [
  { id: 'vs1', x: 460, y: 418, name: 'Tacoma Auto Works', specialty: 'Full Service', phone: '(253) 555-0182' },
  { id: 'vs2', x: 484, y: 340, name: 'Auburn Tire Center', specialty: 'Tires & Alignment', phone: '(253) 555-0241' },
  { id: 'vs3', x: 192, y: 315, name: 'Gig Harbor Auto', specialty: 'Full Service', phone: '(253) 555-0318' },
  { id: 'vs4', x: 88, y: 215, name: 'Bremerton Quick Lube', specialty: 'Oil Change', phone: '(360) 555-0142' },
  { id: 'vs5', x: 545, y: 330, name: 'Renton Service Center', specialty: 'Full Service', phone: '(425) 555-0284' },
]

// ── EV Charging ────────────────────────────────────────────────────────────────
const EV_CHARGING = [
  { id: 'ev1', x: 540, y: 155, name: 'Tesla Supercharger', address: 'South Lake Union, Seattle', stalls: 12, price: '$0.36/kWh', type: 'Tesla SC' },
  { id: 'ev2', x: 570, y: 200, name: 'Electrify America', address: 'Bellevue Square', stalls: 8, price: '$0.43/kWh', type: 'CCS/CHAdeMO' },
  { id: 'ev3', x: 490, y: 355, name: 'Tesla Supercharger', address: 'SeaTac Mall', stalls: 10, price: '$0.36/kWh', type: 'Tesla SC' },
  { id: 'ev4', x: 460, y: 420, name: 'Electrify America', address: 'Tacoma Mall', stalls: 6, price: '$0.43/kWh', type: 'CCS/CHAdeMO' },
  { id: 'ev5', x: 198, y: 320, name: 'ChargePoint', address: 'Uptown Gig Harbor', stalls: 4, price: '$0.35/kWh', type: 'Level 2' },
]

// ── Hospitals ─────────────────────────────────────────────────────────────────
const HOSPITALS = [
  { id: 'h1', x: 522, y: 160, name: 'Harborview Medical', city: 'Seattle' },
  { id: 'h2', x: 448, y: 402, name: 'Tacoma General', city: 'Tacoma' },
  { id: 'h3', x: 565, y: 195, name: 'Overlake Medical', city: 'Bellevue' },
  { id: 'h4', x: 178, y: 330, name: 'St. Anthony Hospital', city: 'Gig Harbor' },
]

// ── Industrial Zones ──────────────────────────────────────────────────────────
const INDUSTRIAL_ZONES = [
  // Port of Tacoma
  { points: [490,420, 530,415, 540,445, 520,460, 495,455, 480,440], label: 'PORT OF\nTACOMA', color: 'rgba(100,100,120,0.08)' },
  // Kent Valley Industrial
  { points: [470,330, 520,325, 530,360, 510,370, 470,365], label: 'KENT VALLEY\nINDUSTRIAL', color: 'rgba(100,100,120,0.07)' },
  // JBLM
  { points: [370,510, 440,505, 445,565, 365,565], label: 'JBLM', color: 'rgba(100,130,100,0.07)' },
]

// ── Highway shield positions ────────────────────────────────────────────────
const SHIELDS = [
  { label: 'I·5', x: 490, y: 280, interstate: true },
  { label: 'I·405', x: 573, y: 235, interstate: true },
  { label: 'I·90', x: 565, y: 188, interstate: true },
  { label: '16', x: 320, y: 362, interstate: false },
  { label: '99', x: 475, y: 305, interstate: false },
  { label: '167', x: 454, y: 440, interstate: false },
  { label: '512', x: 345, y: 450, interstate: false },
]

// ── Traffic congestion data (session-consistent, weighted to rush hour) ───────
function generateTrafficData(hour: number) {
  const isRush = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)
  return {
    i5_north: isRush ? 0.85 : 0.3,
    i5_south: isRush ? 0.9 : 0.25,
    i405: isRush ? 0.75 : 0.2,
    i90: isRush ? 0.8 : 0.3,
    sr16: isRush ? 0.55 : 0.15,
    sr99: isRush ? 0.65 : 0.2,
    sr167: isRush ? 0.7 : 0.18,
  }
}
const TRAFFIC_DATA = generateTrafficData(new Date().getHours())

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
  type TrailPoint = [number, number]
  const trailsRef = useRef<Map<string, TrailPoint[]>>(new Map())

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
  const [showTraffic, setShowTraffic] = useState(false)
  const [showGasStations, setShowGasStations] = useState(true)
  const [showTruckParking, setShowTruckParking] = useState(false)
  const [showVehicleServices, setShowVehicleServices] = useState(false)
  const [showEVCharging, setShowEVCharging] = useState(false)
  const [hoveredPOI, setHoveredPOI] = useState<{type: string; data: any; x: number; y: number} | null>(null)
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
    const ctxRaw = canvas.getContext('2d')
    if (!ctxRaw) return
    const ctx: CanvasRenderingContext2D = ctxRaw
    const W = canvas.width
    const H = canvas.height
    const scale = Math.min(W / 700, H / 600) * 0.92 * zoom
    const baseOX = (W - 700 * scale) / 2 + offset.x
    const baseOY = (H - 600 * scale) / 2 + offset.y
    const tx = (x: number) => baseOX + x * scale
    const ty = (y: number) => baseOY + y * scale
    const t = Date.now()

    // Background
    ctx.fillStyle = '#05070C'
    ctx.fillRect(0, 0, W, H)

    // Grid
    ctx.strokeStyle = 'rgba(0,212,255,0.025)'
    ctx.lineWidth = 0.5
    const gridSize = 50 * scale
    const gOX = baseOX % gridSize
    const gOY = baseOY % gridSize
    for (let x = gOX; x < W; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = gOY; y < H; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    // Helper: draw polygon from flat array
    const c = ctx
    function drawPoly(points: number[], fillStyle: string) {
      c.beginPath()
      for (let i = 0; i < points.length; i += 2) {
        i === 0 ? c.moveTo(tx(points[i]), ty(points[i+1])) : c.lineTo(tx(points[i]), ty(points[i+1]))
      }
      c.closePath()
      c.fillStyle = fillStyle
      c.fill()
    }

    // ── WATER ─────────────────────────────────────────────────────────────────
    drawPoly(WATER_MAIN, 'rgba(0,50,130,0.22)')
    drawPoly(WATER_NARROWS, 'rgba(0,55,140,0.25)')
    drawPoly(WATER_COMMENCEMENT, 'rgba(0,50,130,0.20)')
    // Vashon Island (land color on water)
    ctx.beginPath()
    for (let i = 0; i < VASHON.length; i += 2) {
      i === 0 ? ctx.moveTo(tx(VASHON[i]), ty(VASHON[i+1])) : ctx.lineTo(tx(VASHON[i]), ty(VASHON[i+1]))
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(10,14,22,0.8)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,70,160,0.3)'
    ctx.lineWidth = 1 * scale
    ctx.stroke()
    // Bainbridge Island
    ctx.beginPath()
    for (let i = 0; i < BAINBRIDGE.length; i += 2) {
      i === 0 ? ctx.moveTo(tx(BAINBRIDGE[i]), ty(BAINBRIDGE[i+1])) : ctx.lineTo(tx(BAINBRIDGE[i]), ty(BAINBRIDGE[i+1]))
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(10,14,22,0.8)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,70,160,0.3)'
    ctx.lineWidth = 1 * scale
    ctx.stroke()
    // Lake Washington (right side)
    ctx.beginPath()
    for (let i = 0; i < LAKE_WASH.length; i += 2) {
      i === 0 ? ctx.moveTo(tx(LAKE_WASH[i]), ty(LAKE_WASH[i+1])) : ctx.lineTo(tx(LAKE_WASH[i]), ty(LAKE_WASH[i+1]))
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(0,50,130,0.22)'
    ctx.fill()

    // Puget Sound label
    ctx.font = `italic ${8 * scale}px serif`
    ctx.fillStyle = 'rgba(100,160,255,0.35)'
    ctx.textAlign = 'center'
    ctx.fillText('Puget Sound', tx(70), ty(300))
    ctx.fillText('Commencement Bay', tx(472), ty(448))
    ctx.fillText('Narrows', tx(290), ty(330))
    ctx.fillText('Vashon Is.', tx(305), ty(195))
    ctx.fillText('Bainbridge Is.', tx(208), ty(100))
    ctx.fillText('Lake Washington', tx(620), ty(180))

    // ── INDUSTRIAL ZONES ──────────────────────────────────────────────────────
    INDUSTRIAL_ZONES.forEach(zone => {
      ctx.beginPath()
      for (let i = 0; i < zone.points.length; i += 2) {
        i === 0 ? ctx.moveTo(tx(zone.points[i]), ty(zone.points[i+1])) : ctx.lineTo(tx(zone.points[i]), ty(zone.points[i+1]))
      }
      ctx.closePath()
      ctx.fillStyle = zone.color
      ctx.fill()
      ctx.strokeStyle = 'rgba(150,150,180,0.15)'
      ctx.lineWidth = 0.5 * scale
      ctx.stroke()
      // Label
      const cx2 = zone.points.reduce((s, v, i) => i % 2 === 0 ? s + v : s, 0) / (zone.points.length / 2)
      const cy2 = zone.points.reduce((s, v, i) => i % 2 === 1 ? s + v : s, 0) / (zone.points.length / 2)
      ctx.font = `${6 * scale}px DM Mono, monospace`
      ctx.fillStyle = 'rgba(150,150,180,0.3)'
      ctx.textAlign = 'center'
      zone.label.split('\n').forEach((line: string, li: number) => ctx.fillText(line, tx(cx2), ty(cy2) + li * 7 * scale))
    })

    // ── ROADS (layered by type) ────────────────────────────────────────────────
    function drawRoads(roads: Array<{ coords: [number,number][]; width: number; color: string; label?: string }>) {
      roads.forEach(road => {
        ctx.beginPath()
        ctx.strokeStyle = road.color
        ctx.lineWidth = road.width * scale * 0.85
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        road.coords.forEach(([x, y]: [number, number], i: number) => {
          i === 0 ? ctx.moveTo(tx(x), ty(y)) : ctx.lineTo(tx(x), ty(y))
        })
        ctx.stroke()
      })
    }

    drawRoads(LOCAL_STREETS)
    drawRoads(ARTERIALS)
    drawRoads(STATE_HWYS)
    drawRoads(INTERSTATES)

    // ── TRAFFIC OVERLAY ───────────────────────────────────────────────────────
    if (showTraffic) {
      const trafficSegments = [
        { coords: INTERSTATES[0].coords, congestion: TRAFFIC_DATA.i5_north },
        { coords: INTERSTATES[1].coords, congestion: TRAFFIC_DATA.i405 },
        { coords: INTERSTATES[2].coords, congestion: TRAFFIC_DATA.i90 },
        { coords: STATE_HWYS[0].coords, congestion: TRAFFIC_DATA.sr99 },
        { coords: STATE_HWYS[2].coords, congestion: TRAFFIC_DATA.sr16 },
        { coords: STATE_HWYS[1].coords, congestion: TRAFFIC_DATA.sr167 },
      ]
      trafficSegments.forEach(seg => {
        const c = seg.congestion
        let color: string
        if (c < 0.35) color = 'rgba(0,255,100,0.35)'
        else if (c < 0.65) color = 'rgba(255,179,0,0.40)'
        else if (c < 0.85) color = 'rgba(255,61,90,0.40)'
        else {
          const pulse = 0.6 + 0.4 * Math.sin(t / 800)
          color = `rgba(180,0,0,${0.4 * pulse})`
        }
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = 5 * scale
        ctx.lineCap = 'round'
        seg.coords.forEach(([x, y]: [number, number], i: number) => {
          i === 0 ? ctx.moveTo(tx(x), ty(y)) : ctx.lineTo(tx(x), ty(y))
        })
        ctx.stroke()
      })
    }

    // ── ROAD LABELS ────────────────────────────────────────────────────────────
    ctx.save()
    // Draw shields for interstates/highways
    SHIELDS.forEach(s => {
      const sx = tx(s.x)
      const sy = ty(s.y)
      const isIntl = s.interstate
      const w = 20 * scale
      const h = 14 * scale
      ctx.fillStyle = isIntl ? 'rgba(30,60,150,0.7)' : 'rgba(50,100,50,0.7)'
      ctx.strokeStyle = isIntl ? 'rgba(100,150,255,0.6)' : 'rgba(100,200,100,0.6)'
      ctx.lineWidth = 0.8 * scale
      ctx.beginPath()
      ;(ctx as any).roundRect(sx - w/2, sy - h/2, w, h, 3 * scale)
      ctx.fill()
      ctx.stroke()
      ctx.font = `bold ${7 * scale}px DM Mono, monospace`
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(s.label, sx, sy)
    })
    ctx.restore()

    // Road name labels (at midpoints, small gray text)
    ctx.save()
    ctx.font = `${6 * scale}px DM Mono, monospace`
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ;[...STATE_HWYS, ...ARTERIALS.slice(0,4)].forEach(road => {
      if (!('label' in road) || !road.label) return
      const mid = Math.floor(road.coords.length / 2)
      const [x, y] = road.coords[mid] as [number, number]
      const [nx, ny] = mid + 1 < road.coords.length ? road.coords[mid + 1] as [number, number] : [x + 5, y]
      const angle = Math.atan2(ny - y, nx - x)
      ctx.save()
      ctx.translate(tx(x), ty(y))
      ctx.rotate(angle)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(road.label, 0, -2 * scale)
      ctx.restore()
    })
    ctx.restore()

    // ── CITY LABELS ────────────────────────────────────────────────────────────
    CITIES.forEach(c => {
      ctx.font = `${c.weight} ${c.size * scale}px Barlow Condensed, sans-serif`
      ctx.fillStyle = c.color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(c.label, tx(c.x), ty(c.y))
    })

    // ── HEATMAP ────────────────────────────────────────────────────────────────
    if (showHeatmap) {
      const hotspots = [
        { x: 495, y: 260, intensity: 0.9, label: 'HIGH EXPOSURE\nI-5 / Tukwila' },
        { x: 450, y: 415, intensity: 0.85, label: 'HIGH EXPOSURE\nTacoma Core' },
        { x: 530, y: 160, intensity: 0.8, label: 'HIGH EXPOSURE\nDowntown Seattle' },
        { x: 470, y: 360, intensity: 0.75, label: 'MEDIUM\nFederal Way' },
        { x: 193, y: 325, intensity: 0.6, label: 'MEDIUM\nGig Harbor' },
      ]
      hotspots.forEach(h => {
        const r = 55 * scale * h.intensity
        const grd = ctx.createRadialGradient(tx(h.x), ty(h.y), 0, tx(h.x), ty(h.y), r)
        grd.addColorStop(0, `rgba(255,30,100,${0.22 * h.intensity})`)
        grd.addColorStop(0.4, `rgba(255,120,0,${0.14 * h.intensity})`)
        grd.addColorStop(1, 'rgba(255,100,0,0)')
        ctx.fillStyle = grd
        ctx.beginPath()
        ctx.arc(tx(h.x), ty(h.y), r, 0, Math.PI * 2)
        ctx.fill()
      })
      vehicles.forEach(v => {
        if (!v.last_lat || !v.last_lng) return
        const [gx, gy] = geoToCanvas(v.last_lat, v.last_lng)
        const r = 35 * scale * (1 + (v.today_miles ?? 0) / 200)
        const grad = ctx.createRadialGradient(tx(gx), ty(gy), 0, tx(gx), ty(gy), r)
        grad.addColorStop(0, 'rgba(255,80,0,0.20)')
        grad.addColorStop(1, 'rgba(255,80,0,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(tx(gx), ty(gy), r, 0, Math.PI * 2)
        ctx.fill()
      })
      hotspots.filter(h => h.intensity > 0.7).forEach(h => {
        ctx.save()
        ctx.font = `bold ${7 * scale}px DM Mono, monospace`
        ctx.fillStyle = 'rgba(255,100,100,0.6)'
        ctx.textAlign = 'center'
        h.label.split('\n').forEach((line, i) => ctx.fillText(line, tx(h.x), ty(h.y) - 30 * scale + i * 9 * scale))
        ctx.restore()
      })
    }

    // ── VEHICLE TRAILS ────────────────────────────────────────────────────────
    if (showRoutes) {
      vehicles.forEach(v => {
        if (v.fleet_status !== 'moving') return
        const trail = trailsRef.current.get(v.id) || []
        if (trail.length < 2) return
        for (let i = 1; i < trail.length; i++) {
          const [lat0, lng0] = trail[i - 1]
          const [lat1, lng1] = trail[i]
          const [gx0, gy0] = geoToCanvas(lat0, lng0)
          const [gx1, gy1] = geoToCanvas(lat1, lng1)
          const alpha = (i / trail.length) * 0.7
          const color = v.accent_color ?? '#00D4FF'
          const speed = v.speed_mph ?? 30
          const speedColor = speed > 45 ? color : speed > 25 ? '#f59e0b' : '#f25a5a'
          ctx.beginPath()
          ctx.moveTo(tx(gx0), ty(gy0))
          ctx.lineTo(tx(gx1), ty(gy1))
          ctx.strokeStyle = speedColor + Math.round(alpha * 255).toString(16).padStart(2, '0')
          ctx.lineWidth = 1.5 * scale
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(tx(gx1), ty(gy1), 2 * scale, 0, Math.PI * 2)
          ctx.fillStyle = speedColor + Math.round(alpha * 255).toString(16).padStart(2, '0')
          ctx.fill()
        }
      })
    }

    // ── DISTANCE RINGS (selected vehicle) ────────────────────────────────────
    if (selected) {
      const sv2 = vehicles.find(v => v.id === selected)
      if (sv2?.last_lat && sv2?.last_lng) {
        const [gx, gy] = geoToCanvas(sv2.last_lat, sv2.last_lng)
        const miToPx = (600 / 0.75) / 69
        const ringColors = ['rgba(255,200,50,0.3)', 'rgba(255,200,50,0.2)', 'rgba(255,200,50,0.12)']
        const ringLabels = ['5 mi', '10 mi', '15 mi']
        ;[5, 10, 15].forEach((miles, ri) => {
          const r = miles * miToPx * scale
          ctx.save()
          ctx.setLineDash([4 * scale, 4 * scale])
          ctx.beginPath()
          ctx.arc(tx(gx), ty(gy), r, 0, Math.PI * 2)
          ctx.strokeStyle = ringColors[ri]
          ctx.lineWidth = 1 * scale
          ctx.stroke()
          ctx.restore()
          ctx.font = `${7 * scale}px DM Mono, monospace`
          ctx.fillStyle = ringColors[ri]
          ctx.textAlign = 'center'
          ctx.fillText(ringLabels[ri], tx(gx), ty(gy) - r - 3 * scale)
        })
      }
    }

    // ── GAS STATIONS ─────────────────────────────────────────────────────────
    if (showGasStations) {
      GAS_STATIONS.forEach(gs => {
        const gsx = tx(gs.x)
        const gsy = ty(gs.y)
        const r = 7 * scale
        ctx.beginPath()
        ctx.arc(gsx, gsy, r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,200,0,0.15)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,200,0,0.5)'
        ctx.lineWidth = 1 * scale
        ctx.stroke()
        ctx.font = `bold ${6 * scale}px DM Mono, monospace`
        ctx.fillStyle = 'rgba(255,200,0,0.8)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('G', gsx, gsy)
      })
    }

    // ── TRUCK PARKING ─────────────────────────────────────────────────────────
    if (showTruckParking) {
      TRUCK_PARKING.forEach(tp => {
        const px = tx(tp.x)
        const py = ty(tp.y)
        const r = 7 * scale
        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(34,211,238,0.15)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(34,211,238,0.5)'
        ctx.lineWidth = 1 * scale
        ctx.stroke()
        ctx.font = `bold ${6 * scale}px DM Mono, monospace`
        ctx.fillStyle = 'rgba(34,211,238,0.8)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('P', px, py)
      })
    }

    // ── VEHICLE SERVICES ──────────────────────────────────────────────────────
    if (showVehicleServices) {
      VEHICLE_SERVICES.forEach(vs => {
        const vsx = tx(vs.x)
        const vsy = ty(vs.y)
        const r = 7 * scale
        ctx.beginPath()
        ctx.arc(vsx, vsy, r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(249,115,22,0.15)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(249,115,22,0.5)'
        ctx.lineWidth = 1 * scale
        ctx.stroke()
        ctx.font = `bold ${6 * scale}px DM Mono, monospace`
        ctx.fillStyle = 'rgba(249,115,22,0.8)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('W', vsx, vsy)
      })
    }

    // ── EV CHARGING ────────────────────────────────────────────────────────────
    if (showEVCharging) {
      EV_CHARGING.forEach(ev => {
        const evx = tx(ev.x)
        const evy = ty(ev.y)
        const r = 7 * scale
        ctx.beginPath()
        ctx.arc(evx, evy, r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(139,92,246,0.15)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(139,92,246,0.5)'
        ctx.lineWidth = 1 * scale
        ctx.stroke()
        ctx.font = `bold ${6 * scale}px DM Mono, monospace`
        ctx.fillStyle = 'rgba(139,92,246,0.8)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('E', evx, evy)
      })
    }

    // ── HOSPITALS (always) ────────────────────────────────────────────────────
    HOSPITALS.forEach(h => {
      const hx = tx(h.x)
      const hy = ty(h.y)
      const r = 5 * scale
      ctx.fillStyle = 'rgba(242,90,90,0.6)'
      ctx.fillRect(hx - 1*scale, hy - r, 2*scale, r*2)
      ctx.fillRect(hx - r, hy - 1*scale, r*2, 2*scale)
    })

    // ── VEHICLE MARKERS ────────────────────────────────────────────────────────
    const R = 14 * scale
    vehicles.forEach(v => {
      if (!v.last_lat || !v.last_lng) return
      const [gx, gy] = geoToCanvas(v.last_lat, v.last_lng)
      const mx = tx(gx)
      const my = ty(gy)
      const color = v.accent_color ?? '#00D4FF'
      const isMoving = v.fleet_status === 'moving'
      const isSel = v.id === selected

      // Simulated fuel level (stable per vehicle)
      const fuelSeed = parseInt(v.id.replace(/-/g,'').slice(-4), 16) || 80
      const fuelLevel = (fuelSeed % 80) + 20 // 20-99%
      const fuelLow = fuelLevel < 25

      // Update trail
      if (isMoving && v.last_lat && v.last_lng) {
        const trail = trailsRef.current.get(v.id) || []
        const last = trail[trail.length - 1]
        if (!last || Math.abs(last[0] - v.last_lat) > 0.0001 || Math.abs(last[1] - v.last_lng) > 0.0001) {
          const newTrail = [...trail, [v.last_lat, v.last_lng] as [number,number]].slice(-20)
          trailsRef.current.set(v.id, newTrail)
        }
      }

      // Pulse ring for moving
      if (isMoving) {
        const pulse = 0.5 + 0.5 * Math.sin(t / 600)
        ctx.beginPath()
        ctx.arc(mx, my, R + 9 * scale * pulse, 0, Math.PI * 2)
        ctx.strokeStyle = color + '35'
        ctx.lineWidth = 2 * scale
        ctx.stroke()
      }

      // Selection ring
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
      ctx.shadowBlur = fuelLow ? 14 * scale : 8 * scale

      // Fill
      ctx.beginPath()
      ctx.arc(mx, my, R, 0, Math.PI * 2)
      ctx.fillStyle = fuelLow ? 'rgba(242,90,90,0.2)' : color + '35'
      ctx.fill()

      // Stroke
      ctx.beginPath()
      ctx.arc(mx, my, R, 0, Math.PI * 2)
      ctx.strokeStyle = fuelLow ? '#f25a5a' : color
      ctx.lineWidth = fuelLow ? 2 * scale : 1.5 * scale
      ctx.stroke()

      ctx.shadowBlur = 0

      // Emoji
      ctx.font = `${11 * scale}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fff'
      ctx.fillText(v.vehicle_emoji ?? '🚐', mx, my)

      // Direction arrow (only if moving and we have trail)
      if (isMoving) {
        const trail = trailsRef.current.get(v.id)
        if (trail && trail.length >= 2) {
          const [lat1, lng1] = trail[trail.length - 2]
          const [lat2, lng2] = trail[trail.length - 1]
          const [gx1, gy1] = geoToCanvas(lat1, lng1)
          const [gx2, gy2] = geoToCanvas(lat2, lng2)
          const angle = Math.atan2(gy2 - gy1, gx2 - gx1)
          const arrowDist = R + 4 * scale
          const ax = mx + Math.cos(angle) * arrowDist
          const ay = my + Math.sin(angle) * arrowDist
          ctx.save()
          ctx.translate(ax, ay)
          ctx.rotate(angle)
          ctx.beginPath()
          ctx.moveTo(4 * scale, 0)
          ctx.lineTo(-3 * scale, 3 * scale)
          ctx.lineTo(-3 * scale, -3 * scale)
          ctx.closePath()
          ctx.fillStyle = color
          ctx.fill()
          ctx.restore()
        }
      }

      // Name tag
      const tagY = my + R + 9 * scale
      const speedStr = isMoving ? ` · ${v.speed_mph ?? 0}mph` : ''
      const label = `${shortName(v.name)} · ${v.today_miles ?? 0}mi${speedStr}`
      ctx.font = `bold ${7 * scale}px DM Mono, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const textW = ctx.measureText(label).width
      const ph = 9 * scale
      const pw = textW + 10 * scale
      // Tag background
      ctx.fillStyle = 'rgba(5,7,12,0.88)'
      const rx2 = mx - pw / 2
      ctx.beginPath()
      ;(ctx as any).roundRect(rx2, tagY, pw, ph, 3 * scale)
      ctx.fill()
      ctx.strokeStyle = (fuelLow ? '#f25a5a' : color) + '50'
      ctx.lineWidth = 0.8 * scale
      ctx.stroke()
      ctx.fillStyle = fuelLow ? '#f25a5a' : color
      ctx.fillText(label, mx, tagY + 1 * scale)

      // Fuel bar below tag
      const barY = tagY + ph + 2 * scale
      const barW = pw * 0.8
      const barH = 3 * scale
      const barX = mx - barW / 2
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.fillRect(barX, barY, barW, barH)
      const fuelColor = fuelLevel > 60 ? '#22c07a' : fuelLevel > 30 ? '#f59e0b' : '#f25a5a'
      ctx.fillStyle = fuelColor
      ctx.fillRect(barX, barY, barW * (fuelLevel / 100), barH)

      // Fuel warning icon
      if (fuelLow) {
        ctx.font = `${9 * scale}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText('\u26FD', mx, barY + barH + 2 * scale)
      }

      ctx.textBaseline = 'alphabetic'
    })

    // ── SCALE BAR (bottom-left) ────────────────────────────────────────────────
    const sbX = 20
    const sbY = H - 30
    const miToCvs = (600 / 0.75) / 69 * scale
    const barMiles = 5
    const sbW = barMiles * miToCvs
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(sbX, sbY)
    ctx.lineTo(sbX + sbW, sbY)
    ctx.moveTo(sbX, sbY - 5)
    ctx.lineTo(sbX, sbY + 5)
    ctx.moveTo(sbX + sbW, sbY - 5)
    ctx.lineTo(sbX + sbW, sbY + 5)
    ctx.stroke()
    ctx.font = '9px DM Mono, monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.textAlign = 'center'
    ctx.fillText(`${barMiles} mi`, sbX + sbW / 2, sbY - 8)

    // ── COMPASS (N arrow, above scale bar) ────────────────────────────────────
    const cpX = sbX + 12
    const cpY = sbY - 30
    ctx.save()
    ctx.translate(cpX, cpY)
    ctx.beginPath()
    ctx.moveTo(0, -12)
    ctx.lineTo(4, 0)
    ctx.lineTo(0, -3)
    ctx.lineTo(-4, 0)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255,80,80,0.7)'
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(0, 12)
    ctx.lineTo(4, 0)
    ctx.lineTo(0, 3)
    ctx.lineTo(-4, 0)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fill()
    ctx.font = 'bold 8px DM Mono, monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('N', 0, -18)
    ctx.restore()

    // ── MINI-MAP (bottom-right) ────────────────────────────────────────────────
    const mmW = 120, mmH = 90
    const mmX = W - mmW - 10, mmY = H - mmH - 10
    ctx.save()
    ctx.fillStyle = 'rgba(5,7,12,0.88)'
    ctx.strokeStyle = 'rgba(0,212,255,0.2)'
    ctx.lineWidth = 1
    ctx.fillRect(mmX, mmY, mmW, mmH)
    ctx.strokeRect(mmX, mmY, mmW, mmH)
    // Mini water
    ctx.fillStyle = 'rgba(0,50,130,0.25)'
    ctx.beginPath()
    for (let i = 0; i < WATER_MAIN.length; i += 2) {
      const px = mmX + (WATER_MAIN[i] / 700) * mmW
      const py = mmY + (WATER_MAIN[i + 1] / 600) * mmH
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
    // Mini roads (I-5 only)
    ctx.strokeStyle = 'rgba(255,200,50,0.3)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    INTERSTATES[0].coords.forEach(([x, y]: [number, number], i: number) => {
      const px = mmX + (x / 700) * mmW
      const py = mmY + (y / 600) * mmH
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    })
    ctx.stroke()
    // Mini vehicle dots
    vehicles.forEach(v => {
      if (!v.last_lat || !v.last_lng) return
      const [gx, gy] = geoToCanvas(v.last_lat, v.last_lng)
      const pvx = mmX + (gx / 700) * mmW
      const pvy = mmY + (gy / 600) * mmH
      ctx.beginPath()
      ctx.arc(pvx, pvy, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = v.accent_color ?? '#00D4FF'
      ctx.fill()
    })
    // Viewport rectangle
    const vpX = mmX + (-offset.x / zoom / 700 + (1 - 1/zoom)/2) * mmW
    const vpY = mmY + (-offset.y / zoom / 600 + (1 - 1/zoom)/2) * mmH
    const vpW = mmW / zoom
    const vpH = mmH / zoom
    ctx.strokeStyle = 'rgba(0,212,255,0.5)'
    ctx.lineWidth = 1
    ctx.strokeRect(
      Math.max(mmX, Math.min(mmX + mmW - vpW, vpX)),
      Math.max(mmY, Math.min(mmY + mmH - vpH, vpY)),
      Math.min(vpW, mmW), Math.min(vpH, mmH)
    )
    // Mini-map label
    ctx.font = '7px DM Mono, monospace'
    ctx.fillStyle = 'rgba(0,212,255,0.4)'
    ctx.textAlign = 'left'
    ctx.fillText('OVERVIEW', mmX + 4, mmY + 10)
    ctx.restore()

    animRef.current = requestAnimationFrame(draw)
  }, [vehicles, selected, zoom, offset, showHeatmap, showRoutes, showTraffic, showGasStations, showTruckParking, showVehicleServices, showEVCharging])

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
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle dragging
    if (e.buttons === 1) {
      setDragging(true)
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
      return
    }

    // POI hover detection
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
    const hoverRadius = 12 * scale

    if (showGasStations) {
      for (const gs of GAS_STATIONS) {
        const dist = Math.hypot(cx - tx(gs.x), cy - ty(gs.y))
        if (dist < hoverRadius) {
          setHoveredPOI({ type: 'gas', data: gs, x: e.clientX, y: e.clientY })
          return
        }
      }
    }
    if (showTruckParking) {
      for (const tp of TRUCK_PARKING) {
        const dist = Math.hypot(cx - tx(tp.x), cy - ty(tp.y))
        if (dist < hoverRadius) {
          setHoveredPOI({ type: 'truck', data: tp, x: e.clientX, y: e.clientY })
          return
        }
      }
    }
    if (showVehicleServices) {
      for (const vs of VEHICLE_SERVICES) {
        const dist = Math.hypot(cx - tx(vs.x), cy - ty(vs.y))
        if (dist < hoverRadius) {
          setHoveredPOI({ type: 'service', data: vs, x: e.clientX, y: e.clientY })
          return
        }
      }
    }
    if (showEVCharging) {
      for (const ev of EV_CHARGING) {
        const dist = Math.hypot(cx - tx(ev.x), cy - ty(ev.y))
        if (dist < hoverRadius) {
          setHoveredPOI({ type: 'ev', data: ev, x: e.clientX, y: e.clientY })
          return
        }
      }
    }
    setHoveredPOI(null)
  }, [zoom, offset, showGasStations, showTruckParking, showVehicleServices, showEVCharging, dragStart])
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#05070C', overflow: 'hidden', position: 'relative' }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ height: 54, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0, background: 'var(--surface)' }}>
        <MapIcon size={18} color="var(--cyan)" />
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

      {/* ── POI Filter Bar ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, padding: '6px 16px', background: 'rgba(13,15,20,0.9)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
        {[
          { key: 'gasStations', label: 'Gas', state: showGasStations, setter: setShowGasStations, color: '#f59e0b' },
          { key: 'parking', label: 'Parking', state: showTruckParking, setter: setShowTruckParking, color: '#22d3ee' },
          { key: 'service', label: 'Service', state: showVehicleServices, setter: setShowVehicleServices, color: '#f97316' },
          { key: 'ev', label: 'Charging', state: showEVCharging, setter: setShowEVCharging, color: '#8b5cf6' },
          { key: 'heatmap', label: 'Heatmap', state: showHeatmap, setter: setShowHeatmap, color: '#ff3366' },
          { key: 'traffic', label: 'Traffic', state: showTraffic, setter: setShowTraffic, color: '#22c07a' },
          { key: 'routes', label: 'Routes', state: showRoutes, setter: setShowRoutes, color: '#4f7fff' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => f.setter(!f.state)}
            style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer',
              border: `1px solid ${f.state ? f.color : 'rgba(255,255,255,0.12)'}`,
              background: f.state ? `${f.color}20` : 'transparent',
              color: f.state ? f.color : 'var(--text3)',
              letterSpacing: '0.04em', whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
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
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setHoveredPOI(null)}
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
                        { label: 'View Map', icon: <MapIcon size={11} />, color: 'var(--cyan)' },
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

      {/* POI Tooltip */}
      {hoveredPOI && (
        <div style={{
          position: 'absolute',
          left: Math.min(hoveredPOI.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 220),
          top: Math.max(hoveredPOI.y - 120, 60),
          width: 200, padding: '10px 12px',
          background: 'rgba(7,9,14,0.96)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, zIndex: 50,
          backdropFilter: 'blur(12px)',
          pointerEvents: 'none',
        }}>
          {hoveredPOI.type === 'gas' && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', marginBottom: 4 }}>{hoveredPOI.data.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6 }}>{hoveredPOI.data.address}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--text2)' }}>Regular: <span style={{ color: 'var(--green)', fontWeight: 700 }}>${hoveredPOI.data.regular}</span></div>
                <div style={{ fontSize: 10, color: 'var(--text2)' }}>Premium: <span style={{ color: 'var(--amber)', fontWeight: 700 }}>${hoveredPOI.data.premium}</span></div>
              </div>
            </>
          )}
          {hoveredPOI.type === 'truck' && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', marginBottom: 4 }}>{hoveredPOI.data.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text2)' }}>{hoveredPOI.data.spaces} spaces · Overnight: {hoveredPOI.data.overnight ? 'Yes' : 'No'}</div>
            </>
          )}
          {hoveredPOI.type === 'service' && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#f97316', marginBottom: 4 }}>{hoveredPOI.data.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{hoveredPOI.data.specialty}</div>
              <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>{hoveredPOI.data.phone}</div>
            </>
          )}
          {hoveredPOI.type === 'ev' && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', marginBottom: 4 }}>{hoveredPOI.data.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{hoveredPOI.data.address}</div>
              <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>{hoveredPOI.data.stalls} stalls · {hoveredPOI.data.price}</div>
            </>
          )}
        </div>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}
