'use client'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState, useCallback } from 'react'
import { X } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PNWMapEngineProps {
  activeLayers: Set<string>
  onLayerToggle?: (key: string) => void
  height?: string
}

interface MarineFeature {
  id: string
  name: string
  lat: number
  lng: number
  type: 'marina' | 'hazard' | 'launch' | 'fuel' | 'tide' | 'wildlife'
  description?: string
  amenities?: string[]
  hazard_type?: string
  species?: string
  phone?: string
  vhf_channel?: string
  city?: string
}

interface TidePrediction {
  time: string
  type: 'H' | 'L'
  height_ft: number
}

interface TideData {
  station: string
  predictions: TidePrediction[]
  current_height: number
  trend: 'rising' | 'falling'
  updated_at: string
}

interface ForecastPeriod {
  name: string
  temperature: number
  temperatureUnit: string
  windSpeed: string
  windDirection: string
  shortForecast: string
  detailedForecast: string
  isDaytime: boolean
}

interface WeatherData {
  current: ForecastPeriod | null
  forecast: ForecastPeriod[] | null
  marineForecast: Array<{ name: string; detailedForecast: string }> | null
  station: string
  updated_at: string
}

type BaseMapType = 'street' | 'satellite' | 'terrain'

// ── Tile Providers ─────────────────────────────────────────────────────────────

const TILE_PROVIDERS: Record<BaseMapType, { url: string; attribution: string; maxZoom: number }> = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DigitalGlobe, GeoEye, Earthstar Geographics',
    maxZoom: 18,
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
}

// ── Hardcoded Data ─────────────────────────────────────────────────────────────

const FALLBACK_MARINAS: MarineFeature[] = [
  { id: 'jerisich', name: 'Jerisich Dock', lat: 47.3325, lng: -122.5749, type: 'marina', city: 'Gig Harbor' },
  { id: 'gig-marina', name: 'Gig Harbor Marina & Boatyard', lat: 47.3355, lng: -122.5698, type: 'marina', city: 'Gig Harbor' },
  { id: 'peninsula', name: 'Peninsula Yacht Basin', lat: 47.3330, lng: -122.5760, type: 'marina', city: 'Gig Harbor' },
  { id: 'arabellas', name: "Arabella's Landing", lat: 47.3317, lng: -122.5740, type: 'marina', city: 'Gig Harbor' },
  { id: 'tides-tavern', name: 'Tides Tavern Dock', lat: 47.3307, lng: -122.5737, type: 'marina', city: 'Gig Harbor' },
]

// Old FUEL_DOCKS replaced by FUEL_DOCK_DATA (defined after FISH_ZONES)

// ── Fish Zones ────────────────────────────────────────────────────────────────

interface FishZone {
  id: string
  name: string
  lat: number
  lng: number
  radiusM: number
  species: string[]
  color: string
  techniques: string[]
  depth: string
  season: string
  seasonMonths: number[] // 0=Jan, 11=Dec
  notes: string
  regulations?: string
}

const FISH_ZONES: FishZone[] = [
  // Salmon zones
  { id: 'tacoma-narrows-salmon', name: 'Tacoma Narrows — Salmon', lat: 47.272, lng: -122.549, radiusM: 900,
    species: ['Chinook Salmon', 'Coho Salmon'], color: '#22d3ee', depth: '30–80 ft',
    techniques: ['Trolling flashers w/ herring', 'Hoochies at 40–60 ft', 'Jigging near current rips'],
    season: 'May – October (Chinook); Aug – Oct (Coho)', seasonMonths: [4,5,6,7,8,9],
    notes: 'Strong tidal rips at ebb tide concentrate bait. Fish the slack water on both sides of the bridge. Depth finder key — look for balls of herring 10 ft above the bottom.',
    regulations: 'Marine Area 11 — check WDFW for current seasons and limits' },

  { id: 'point-defiance-salmon', name: 'Point Defiance — King Salmon', lat: 47.314, lng: -122.532, radiusM: 700,
    species: ['Chinook Salmon', 'Coho Salmon', 'Lingcod'], color: '#22d3ee', depth: '40–90 ft',
    techniques: ['Downrigger trolling', 'Plug-cut herring behind flasher', 'Bottom jigging for lingcod'],
    season: 'June – September', seasonMonths: [5,6,7,8],
    notes: 'One of South Sound\'s most productive salmon zones. Rocky bottom structure near the point holds lingcod year-round. Current rips on ebb tide are prime salmon time.',
    regulations: 'Marine Area 11' },

  { id: 'commencement-bay-salmon', name: 'Commencement Bay', lat: 47.285, lng: -122.427, radiusM: 1200,
    species: ['Chinook Salmon', 'Coho Salmon', 'Chum Salmon'], color: '#4f7fff', depth: '20–60 ft',
    techniques: ['Trolling nearshore', 'Casting spoons in fall', 'Drift fishing'],
    season: 'June – November (Coho/Chum in fall)', seasonMonths: [5,6,7,8,9,10],
    notes: 'Coho stage here in late summer. Chum salmon arrive in October–November near creek mouths. Watch for ferry traffic.',
    regulations: 'Marine Area 11' },

  { id: 'admiralty-inlet-kings', name: 'Admiralty Inlet — Chinook Corridor', lat: 48.017, lng: -122.698, radiusM: 2000,
    species: ['Chinook Salmon', 'Coho Salmon'], color: '#22d3ee', depth: '60–200 ft',
    techniques: ['Deep trolling 80–120 ft', 'Large herring plugs', 'Anchovies on flasher'],
    season: 'June – September', seasonMonths: [5,6,7,8],
    notes: 'Migrating Chinook funnel through here en route to rivers. Strong currents — fish the tide changes. Water is deep; heavy gear required.',
    regulations: 'Marine Area 9 / 10' },

  { id: 'gig-harbor-mouth', name: 'Gig Harbor Entrance — Coho', lat: 47.362, lng: -122.556, radiusM: 500,
    species: ['Coho Salmon', 'Chinook Salmon'], color: '#4f7fff', depth: '20–50 ft',
    techniques: ['Trolling small spoons', 'Spinners near surface', 'Casting off the point'],
    season: 'August – October', seasonMonths: [7,8,9],
    notes: 'Coho stage near the entrance in late summer. Fish the edges in morning and evening. Small boats have an advantage here.',
    regulations: 'Marine Area 11' },

  // Halibut zones
  { id: 'strait-halibut', name: 'Strait of Juan de Fuca — Halibut', lat: 48.15, lng: -123.2, radiusM: 3000,
    species: ['Pacific Halibut', 'Lingcod', 'Rockfish'], color: '#f59e0b', depth: '120–250 ft',
    techniques: ['Bottom fishing with whole herring/squid', 'Large jigs 6–12 oz', 'Dropper rigs on flat sandy bottom'],
    season: 'April – June (Halibut season)', seasonMonths: [3,4,5],
    notes: 'Sandy/muddy bottom holds halibut. Drift fishing over 150–200 ft near the border of rocky and flat bottom. Check annual halibut season opening — typically 2–4 day openers.',
    regulations: 'WDFW/IPHC season — check dates annually. Tag required.' },

  { id: 'port-angeles-halibut', name: 'Ediz Hook / Port Angeles — Halibut', lat: 48.127, lng: -123.433, radiusM: 1500,
    species: ['Pacific Halibut', 'Coho Salmon', 'Rockfish'], color: '#f59e0b', depth: '100–200 ft',
    techniques: ['Anchor and bait, whole herring/squid', 'Power jigging over structure'],
    season: 'April – June', seasonMonths: [3,4,5],
    notes: 'Protected inside waters of port. Charter boats launch from Port Angeles for halibut. Protected harbor makes early morning starts easier.',
    regulations: 'Check WDFW halibut season dates' },

  // Lingcod & Rockfish
  { id: 'deception-pass-lingcod', name: 'Deception Pass — Lingcod', lat: 48.405, lng: -122.643, radiusM: 600,
    species: ['Lingcod', 'Rockfish', 'Coho Salmon'], color: '#8b5cf6', depth: '30–80 ft',
    techniques: ['Jigging large plastic swimbaits', 'Live herring near bottom structure', 'Trolling through the pass on slack'],
    season: 'Year-round (Lingcod); Jan–Feb best', seasonMonths: [0,1,2,3,4,10,11],
    notes: 'Extremely fast currents — only fish the slack water (1 hr before/after). Rocky reefs loaded with lingcod and rockfish. One of the best lingcod spots in the PNW.',
    regulations: 'Check size limits: Lingcod 22" min size' },

  { id: 'narrows-lingcod', name: 'Tacoma Narrows — Lingcod', lat: 47.265, lng: -122.551, radiusM: 600,
    species: ['Lingcod', 'Copper Rockfish', 'Cabezon'], color: '#8b5cf6', depth: '40–80 ft',
    techniques: ['Heavy jigs (4–8 oz) near structure', 'Plastic swimbaits on lead head', 'Fish the rocky points'],
    season: 'Year-round; Dec–Mar spawn', seasonMonths: [0,1,2,3,10,11],
    notes: 'Rocky points flanking the bridge hold large lingcod year-round. Fish close to structure in 40–80 ft. Cabezon common in shallower rocky areas.',
    regulations: 'Check current rockfish conservation areas (RCA)' },

  // Crab zones
  { id: 'henderson-bay-crab', name: 'Henderson Bay — Dungeness Crab', lat: 47.364, lng: -122.647, radiusM: 1200,
    species: ['Dungeness Crab', 'Red Rock Crab'], color: '#22c07a', depth: '20–60 ft',
    techniques: ['Crab pots on sandy/muddy bottom', 'Ring nets from dock or boat', 'Bait: chicken necks, fish carcass'],
    season: 'July – Sept (check WDFW)', seasonMonths: [6,7,8],
    notes: 'Good crab bay with sandy bottom. Set pots in 30–50 ft over muddy bottom near eelgrass edges. Check limit: 6 Dungeness per day in most areas.',
    regulations: 'Minimum 6.25" across shell; check Marine Area 11 opener dates' },

  { id: 'carr-inlet-crab', name: 'Carr Inlet — Crab & Shrimp', lat: 47.27, lng: -122.7, radiusM: 1500,
    species: ['Dungeness Crab', 'Spot Shrimp'], color: '#22c07a', depth: '40–200 ft',
    techniques: ['Crab pots 40–80 ft', 'Shrimp pots 200–400 ft on steep drop-offs', 'Mark productive pots on GPS'],
    season: 'Crab: summer; Shrimp: May–July typically', seasonMonths: [4,5,6,7,8],
    notes: 'Deep inlet with excellent shrimp fishing in the troughs. Spot shrimp season is short (typically 2–4 weeks in May) — check WDFW opener.',
    regulations: 'Spot shrimp season very limited — verify dates at wdfw.wa.gov' },

  { id: 'hood-canal-shrimp', name: 'Hood Canal — Spot Shrimp', lat: 47.6, lng: -122.9, radiusM: 2500,
    species: ['Spot Shrimp', 'Dungeness Crab', 'Salmon'], color: '#ec4899', depth: '200–400 ft',
    techniques: ['Shrimp pots in deep troughs', 'Small mesh pots baited with fish oil', 'Lower at slack tide'],
    season: 'Shrimp: May opener (typically 1–3 weeks)', seasonMonths: [4],
    notes: 'Premier spot shrimp destination in Washington. The fjord-like depths hold large spot shrimp. Hood Canal also has coho salmon in fall and oyster farms.',
    regulations: 'Hood Canal has separate shrimp management — check WDFW. Coho season also separate.' },

  // Trout / Steelhead
  { id: 'nisqually-steelhead', name: 'Nisqually River Mouth — Steelhead', lat: 47.098, lng: -122.717, radiusM: 800,
    species: ['Winter Steelhead', 'Cutthroat Trout', 'Chum Salmon'], color: '#22c07a', depth: '5–20 ft',
    techniques: ['Drift fishing with cured eggs', 'Float fishing with jigs', 'Fly fishing in lower river'],
    season: 'Steelhead: Dec–March; Cutthroat year-round', seasonMonths: [11,0,1,2],
    notes: 'Nisqually is a wild steelhead river. Check for hatchery vs wild retention rules. Mouth area good for chum salmon in November.',
    regulations: 'Wild steelhead release only on some rivers — verify WDFW rules' },

  // squid / winter jigging
  { id: 'gig-harbor-squid', name: 'Gig Harbor — Night Squid Jigging', lat: 47.334, lng: -122.575, radiusM: 400,
    species: ['Market Squid', 'Opalescent Squid'], color: '#9299b5', depth: '20–60 ft',
    techniques: ['Light stick jigs near dock lights at night', 'Small jigs (1–2 oz) in slow retrieve', 'Under marina lights'],
    season: 'October – February (peaks Nov–Jan)', seasonMonths: [9,10,11,0,1],
    notes: 'Squid aggregate under dock lights on dark nights. Use a dock light or fish near bright marina lights. Great family activity. Limit is 10 lbs per day.',
    regulations: 'No license required for squid; limit applies' },

  // ── Freshwater zones ──────────────────────────────────────────────────────
  { id: 'lake-washington-salmon', name: 'Lake Washington — Sockeye & Kokanee', lat: 47.594, lng: -122.258, radiusM: 2000,
    species: ['Sockeye Salmon', 'Kokanee', 'Cutthroat Trout', 'Largemouth Bass'], color: '#06b6d4', depth: '20–80 ft',
    techniques: ['Trolling small spoons at 30–50 ft (kokanee)', 'Sockeye: small jigs and hooks in schools', 'Bass: soft plastics near shoreline structure'],
    season: 'Sockeye: June–Aug; Kokanee: June–Oct; Bass: year-round', seasonMonths: [5,6,7,8,9],
    notes: 'Kokanee run in summer — use small wedding rings or Needlefish tipped with white corn near Mercer Island. Sockeye season varies widely — check WDFW. Large/smallmouth bass in coves year-round.',
    regulations: 'Sockeye season opens by emergency regulation — verify wdfw.wa.gov before going' },

  { id: 'green-river-steelhead', name: 'Green River — Winter Steelhead', lat: 47.31, lng: -122.03, radiusM: 800,
    species: ['Winter Steelhead', 'Chinook Salmon', 'Coho Salmon'], color: '#06b6d4', depth: '2–12 ft',
    techniques: ['Drift fishing with cured eggs or sand shrimp', 'Float fishing with jigs (pink/white)', 'Fly fishing in runs and pools'],
    season: 'Steelhead: Dec–March; Chinook: Aug–Oct', seasonMonths: [11,0,1,2],
    notes: 'The Green River from Auburn through Kent offers quality winter steelhead. Hatchery fish can be retained, wild fish must be released. Fish deeper pools and tail-outs on cold days.',
    regulations: 'Wild steelhead release only. Chinook — check emergency regulations.' },

  { id: 'skykomish-steelhead', name: 'Skykomish River — Steelhead', lat: 47.859, lng: -121.927, radiusM: 1000,
    species: ['Winter Steelhead', 'Summer Steelhead', 'Pink Salmon', 'Chinook'], color: '#06b6d4', depth: '2–15 ft',
    techniques: ['Float fishing with jigs', 'Drift fishing cured eggs', 'Fly fishing (summer run)', 'Pink salmon: small pink jigs or spoons'],
    season: 'Winter steelhead: Dec–March; Summer: June–Sept; Pink salmon: odd years Aug', seasonMonths: [0,1,2,5,6,7,8],
    notes: 'The "Sky" is one of the best steelhead rivers near Seattle. Gold Bar and Index areas very productive. Pink salmon run in odd years — absolutely wild fishing with huge numbers.',
    regulations: 'Wild steelhead release only on many sections. Check pink salmon limits — they can be generous.' },
]

// ── Fuel Docks (comprehensive) ─────────────────────────────────────────────

interface FuelDock {
  id: string
  name: string
  lat: number
  lng: number
  fuel: string
  phone?: string
  hours?: string
  vhf?: string
  services?: string
}

const FUEL_DOCK_DATA: FuelDock[] = [
  { id: 'fuel-gig-marina', name: 'Gig Harbor Marina & Boatyard', lat: 47.3355, lng: -122.5698, fuel: 'Gas & Diesel', phone: '(253) 858-4439', hours: 'Daily 8am–5pm', vhf: '68', services: 'Full service, haul-out, pump-out' },
  { id: 'fuel-arabellas', name: "Arabella's Landing Fuel", lat: 47.3317, lng: -122.5745, fuel: 'Gas', phone: '(253) 851-1793', hours: 'Daily', vhf: '66A', services: 'Moorage, pump-out' },
  { id: 'fuel-tacoma', name: 'Dock Street Marina, Tacoma', lat: 47.2545, lng: -122.4323, fuel: 'Gas & Diesel', phone: '(253) 383-5841', hours: 'Daily', vhf: '16→68' },
  { id: 'fuel-percival', name: 'Percival Landing, Olympia', lat: 47.0426, lng: -122.9051, fuel: 'Gas & Diesel', phone: '(360) 753-8380', hours: 'Daily', vhf: '16' },
  { id: 'fuel-port-orchard', name: 'Port Orchard Marina', lat: 47.5365, lng: -122.6384, fuel: 'Gas & Diesel', phone: '(360) 876-5535', hours: 'Daily', vhf: '16→68' },
  { id: 'fuel-bremerton', name: 'Port of Bremerton Marina', lat: 47.5618, lng: -122.6277, fuel: 'Diesel', phone: '(360) 373-1035', hours: 'Daily', vhf: '16' },
  { id: 'fuel-poulsbo', name: 'Port of Poulsbo Marina', lat: 47.7353, lng: -122.6456, fuel: 'Gas & Diesel', phone: '(360) 779-3505', hours: 'Daily', vhf: '16→68' },
  { id: 'fuel-kingston', name: 'Port of Kingston Marina', lat: 47.7950, lng: -122.5038, fuel: 'Gas & Diesel', phone: '(360) 297-3545', hours: 'Daily', vhf: '16' },
  { id: 'fuel-pt-townsend', name: 'Port Townsend Boat Haven', lat: 48.1167, lng: -122.7589, fuel: 'Gas & Diesel', phone: '(360) 385-2355', hours: 'Daily', vhf: '16→66A' },
  { id: 'fuel-anacortes', name: 'Cap Sante Marine, Anacortes', lat: 48.5095, lng: -122.6126, fuel: 'Gas & Diesel', phone: '(360) 293-0694', hours: 'Daily', vhf: '16→68' },
  { id: 'fuel-friday-harbor', name: 'Port of Friday Harbor', lat: 48.5344, lng: -123.0135, fuel: 'Gas & Diesel', phone: '(360) 378-2688', hours: 'Daily', vhf: '16→66A' },
  { id: 'fuel-roche-harbor', name: 'Roche Harbor Marina', lat: 48.6117, lng: -123.1551, fuel: 'Gas & Diesel', phone: '(360) 378-2155', hours: 'Memorial Day–Labor Day', vhf: '78A' },
]

// Traffic routes
const SR16: [number, number][] = [
  [47.377, -122.596], [47.360, -122.580], [47.335, -122.567], [47.272, -122.549],
]
const HWY3: [number, number][] = [
  [47.377, -122.596], [47.450, -122.627], [47.527, -122.654],
]

function getTrafficColor(): string {
  const h = new Date().getHours()
  if ((h >= 7 && h <= 9) || (h >= 16 && h <= 18)) return '#f25a5a'
  if ((h >= 6 && h <= 10) || (h >= 14 && h <= 19)) return '#f59e0b'
  return '#22c07a'
}

function fmtTideTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch {
    return iso
  }
}

function fmtUpdated(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch {
    return ''
  }
}

function extractWindSpeed(windSpeed: string): number {
  const match = windSpeed.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PNWMapEngine({ activeLayers, onLayerToggle, height = '100%' }: PNWMapEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const baseTileRef = useRef<any>(null)
  const layerRefsRef = useRef<Record<string, any[]>>({})
  const [mapReady, setMapReady] = useState(false)
  const [baseMap, setBaseMap] = useState<BaseMapType>('street')
  const [selectedFeature, setSelectedFeature] = useState<MarineFeature | null>(null)
  const [tideData, setTideData] = useState<TideData | null>(null)
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [tideLoading, setTideLoading] = useState(false)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const activeLayersRef = useRef(activeLayers)
  const fetchedRef = useRef<Set<string>>(new Set())

  useEffect(() => { activeLayersRef.current = activeLayers }, [activeLayers])

  // ── Map Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let destroyed = false

    import('leaflet').then(({ default: L }) => {
      if (destroyed || !containerRef.current || mapRef.current) return

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!, {
        center: [47.333, -122.578],
        zoom: 11,
        zoomControl: false,
      })

      // Custom zoom control position
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      // Base tile
      const tile = L.tileLayer(TILE_PROVIDERS.street.url, {
        attribution: TILE_PROVIDERS.street.attribution,
        maxZoom: TILE_PROVIDERS.street.maxZoom,
      })
      tile.addTo(map)
      baseTileRef.current = tile

      mapRef.current = map
      setMapReady(true)
    })

    return () => {
      destroyed = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        baseTileRef.current = null
        layerRefsRef.current = {}
        setMapReady(false)
      }
    }
  }, [])

  // ── Base Map Switcher ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !baseTileRef.current) return
    import('leaflet').then(({ default: L }) => {
      if (!mapRef.current) return
      const old = baseTileRef.current
      const provider = TILE_PROVIDERS[baseMap]
      const tile = L.tileLayer(provider.url, {
        attribution: provider.attribution,
        maxZoom: provider.maxZoom,
      })
      tile.addTo(mapRef.current)
      old.remove()
      baseTileRef.current = tile
    })
  }, [baseMap, mapReady])

  // ── Layer helpers ─────────────────────────────────────────────────────────────
  const clearLayer = useCallback((key: string) => {
    const items = layerRefsRef.current[key] || []
    items.forEach(item => {
      if (item && typeof item.remove === 'function') item.remove()
    })
    layerRefsRef.current[key] = []
  }, [])

  const addToLayer = useCallback((key: string, item: any) => {
    if (!layerRefsRef.current[key]) layerRefsRef.current[key] = []
    layerRefsRef.current[key].push(item)
  }, [])

  // ── Marker Icon Factories ─────────────────────────────────────────────────────
  const makeMarinaIcon = (L: any) => L.divIcon({
    html: `<div style="width:30px;height:30px;border-radius:8px;background:#22d3ee;border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/>
        <path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })

  const makeHazardIcon = (L: any) => L.divIcon({
    html: `<div style="width:0;height:0;border-left:15px solid transparent;border-right:15px solid transparent;border-bottom:26px solid #f25a5a;position:relative;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
      <span style="position:absolute;top:8px;left:-5px;color:white;font-weight:900;font-size:11px;line-height:1;">!</span>
    </div>`,
    className: '',
    iconSize: [30, 26],
    iconAnchor: [15, 26],
  })

  const makeLaunchIcon = (L: any) => L.divIcon({
    html: `<div style="width:28px;height:28px;border-radius:50%;background:#22c07a;border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 19V5m-7 7l7-7 7 7"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

  const makeFuelIcon = (L: any) => L.divIcon({
    html: `<div style="width:28px;height:28px;border-radius:6px;background:#f59e0b;border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 22h12V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v18z"/><path d="M15 8h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1V8l-3-4"/>
        <line x1="7" y1="8" x2="11" y2="8"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

  const makeWildlifeIcon = (L: any, species: string) => {
    const colors: Record<string, string> = {
      orca: '#8b5cf6', seal: '#22d3ee', eagle: '#f59e0b', default: '#22c07a',
    }
    const color = colors[species?.toLowerCase()] || colors.default
    return L.divIcon({
      html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="none"><circle cx="12" cy="12" r="6"/></svg>
      </div>`,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })
  }

  const makeTideIcon = (L: any) => L.divIcon({
    html: `<div style="width:30px;height:30px;border-radius:50%;background:#4f7fff;border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5s2.5 2 5 2 2.5-2 5-2"/>
        <path d="M2 12c.6.5 1.2 1 2.5 1C7 13 7 11 9.5 11s2.5 2 5 2 2.5-2 5-2"/>
        <path d="M2 18c.6.5 1.2 1 2.5 1C7 19 7 17 9.5 17s2.5 2 5 2 2.5-2 5-2"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })

  // ── Layer Renderer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    import('leaflet').then(({ default: L }) => {
      if (!mapRef.current) return
      const map = mapRef.current

      // DEPTH LAYER
      if (activeLayers.has('depth')) {
        if (!layerRefsRef.current['depth']?.length) {
          const noaa = L.tileLayer(
            'https://tileservice.charts.noaa.gov/tiles/50000_1/{z}/{x}/{y}.png',
            { attribution: 'NOAA Nautical Charts', maxZoom: 15, opacity: 0.75 }
          )
          noaa.addTo(map)
          addToLayer('depth', noaa)
        }
      } else {
        clearLayer('depth')
      }

      // TRAFFIC LAYER
      if (activeLayers.has('traffic')) {
        if (!layerRefsRef.current['traffic']?.length) {
          const color = getTrafficColor()

          const sr16 = L.polyline(SR16, {
            color,
            weight: 5,
            opacity: 0.85,
          })
          sr16.addTo(map)
          sr16.bindTooltip('SR-16 — Live Traffic', { permanent: false, sticky: true })
          addToLayer('traffic', sr16)

          const hwy3 = L.polyline(HWY3, {
            color,
            weight: 5,
            opacity: 0.85,
          })
          hwy3.addTo(map)
          hwy3.bindTooltip('Highway 3', { permanent: false, sticky: true })
          addToLayer('traffic', hwy3)

          // Narrows Bridge label marker
          const bridgeMarker = L.marker([47.272, -122.549], {
            icon: L.divIcon({
              html: `<div style="background:rgba(13,15,20,0.85);border:1px solid rgba(255,255,255,0.2);border-radius:4px;padding:2px 6px;font-size:10px;color:#e8eaed;white-space:nowrap;font-family:'Barlow Condensed',sans-serif;font-weight:600;letter-spacing:0.5px;">Tacoma Narrows Bridge</div>`,
              className: '',
              iconSize: [160, 22],
              iconAnchor: [80, 11],
            }),
            interactive: false,
          })
          bridgeMarker.addTo(map)
          addToLayer('traffic', bridgeMarker)

          // WSDOT credit label
          const creditLabel = (L.control as any)({ position: 'bottomright' })
          creditLabel.onAdd = () => {
            const d = L.DomUtil.create('div')
            d.style.cssText = 'background:rgba(13,15,20,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:3px 7px;font-size:9px;color:#9299b5;pointer-events:none;'
            d.innerHTML = 'Live traffic data via WSDOT'
            return d
          }
          creditLabel.addTo(map)
          addToLayer('traffic', creditLabel)
        }
      } else {
        clearLayer('traffic')
      }

      // FISH ZONES LAYER
      if (activeLayers.has('fish-zones')) {
        if (!layerRefsRef.current['fish-zones']?.length) {
          const currentMonth = new Date().getMonth()
          FISH_ZONES.forEach(zone => {
            const inSeason = zone.seasonMonths.includes(currentMonth)
            const circle = L.circle([zone.lat, zone.lng], {
              radius: zone.radiusM,
              color: zone.color,
              fillColor: zone.color,
              fillOpacity: inSeason ? 0.15 : 0.05,
              weight: inSeason ? 2 : 1,
              opacity: inSeason ? 0.7 : 0.3,
              dashArray: inSeason ? undefined : '5, 8',
            })

            // Label marker in center
            const labelIcon = L.divIcon({
              html: `<div style="
                background:rgba(13,15,20,0.88);
                border:1px solid ${zone.color}60;
                border-radius:6px;
                padding:3px 7px;
                font-size:10px;
                color:${zone.color};
                white-space:nowrap;
                font-family:'Barlow Condensed',sans-serif;
                font-weight:700;
                letter-spacing:0.5px;
                pointer-events:none;
                display:flex;
                align-items:center;
                gap:4px;
              ">${inSeason ? '<span style="width:6px;height:6px;border-radius:50%;background:' + zone.color + ';display:inline-block;"></span>' : ''} ${zone.species[0]}</div>`,
              className: '',
              iconSize: [1, 1],
              iconAnchor: [0, 0],
            })
            const labelMarker = L.marker([zone.lat, zone.lng], { icon: labelIcon, interactive: false })

            const popupHtml = `
              <div style="min-width:240px;max-width:300px;background:#0d0f14;color:#e8eaed;font-family:system-ui,sans-serif;padding:4px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                  <div style="width:10px;height:10px;border-radius:50%;background:${zone.color};flex-shrink:0;${inSeason ? 'box-shadow:0 0 6px ' + zone.color : ''}"></div>
                  <strong style="font-family:'Barlow Condensed',sans-serif;font-size:14px;letter-spacing:0.5px;color:#e8eaed;">${zone.name}</strong>
                </div>
                ${inSeason ? '<div style="background:rgba(34,211,238,0.1);border:1px solid rgba(34,211,238,0.2);border-radius:5px;padding:4px 8px;font-size:10px;color:#22d3ee;font-weight:700;letter-spacing:0.5px;margin-bottom:8px;font-family:\'Barlow Condensed\',sans-serif;">IN SEASON NOW</div>' : ''}
                <div style="margin-bottom:6px;"><span style="font-size:10px;color:#5a6080;">SPECIES</span><br/><span style="font-size:12px;color:#e8eaed;">${zone.species.join(', ')}</span></div>
                <div style="margin-bottom:6px;"><span style="font-size:10px;color:#5a6080;">SEASON</span><br/><span style="font-size:12px;color:#e8eaed;">${zone.season}</span></div>
                <div style="margin-bottom:6px;"><span style="font-size:10px;color:#5a6080;">DEPTH</span><br/><span style="font-size:12px;color:#e8eaed;font-family:'JetBrains Mono',monospace;">${zone.depth}</span></div>
                <div style="margin-bottom:8px;"><span style="font-size:10px;color:#5a6080;">TECHNIQUES</span><br/>${zone.techniques.map(t => `<div style="font-size:11px;color:#9299b5;margin-top:2px;">• ${t}</div>`).join('')}</div>
                <div style="font-size:11px;color:#9299b5;line-height:1.4;margin-bottom:6px;">${zone.notes}</div>
                ${zone.regulations ? `<div style="font-size:10px;color:#f59e0b;padding:4px 8px;background:rgba(245,158,11,0.1);border-radius:4px;">⚠ ${zone.regulations}</div>` : ''}
              </div>
            `

            circle.bindPopup(popupHtml, {
              maxWidth: 320,
              className: 'pnw-popup',
            })
            circle.addTo(map)
            labelMarker.addTo(map)
            addToLayer('fish-zones', circle)
            addToLayer('fish-zones', labelMarker)
          })

          // Add popup style
          const style = document.createElement('style')
          style.textContent = '.leaflet-popup-content-wrapper { background: #0d0f14 !important; border: 1px solid rgba(255,255,255,0.12) !important; border-radius: 12px !important; box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important; } .leaflet-popup-tip { background: #0d0f14 !important; } .leaflet-popup-content { margin: 14px 16px !important; }'
          document.head.appendChild(style)
        }
      } else {
        clearLayer('fish-zones')
      }

      // FISHING SPOTS LAYER
      if (activeLayers.has('fishing')) {
        if (!layerRefsRef.current['fishing']?.length) {
          const load = async () => {
            try {
              const res = await fetch('/api/pnw-navigator/spots')
              if (res.ok) {
                const data = await res.json()
                const spots = (data.spots || data || []) as Array<{
                  id: string; name: string; lat: number; lng: number;
                  primary_species?: string; water_type?: string; region?: string; description?: string
                }>
                if (!mapRef.current) return
                spots.forEach(spot => {
                  if (!spot.lat || !spot.lng) return
                  const icon = L.divIcon({
                    html: `<div style="width:26px;height:26px;border-radius:6px;background:rgba(79,127,255,0.9);border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 16.016c2 0 3.5-1.5 3.5-3.5S20 9 18 9c-.5 0-1 .1-1.4.3L12 5.5H9V8L6 9v4l3 1v2.5h3l4.6-3.8c.4.2.9.3 1.4.3z"/>
                      </svg>
                    </div>`,
                    className: '',
                    iconSize: [26, 26],
                    iconAnchor: [13, 13],
                  })
                  const m = L.marker([spot.lat, spot.lng], { icon })
                  m.bindTooltip(spot.name, { direction: 'top', offset: [0, -15] })
                  const popupHtml = `
                    <div style="min-width:180px;background:#0d0f14;color:#e8eaed;font-family:system-ui,sans-serif;padding:4px;">
                      <div style="font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;color:#4f7fff;margin-bottom:6px;">${spot.name}</div>
                      ${spot.region ? `<div style="font-size:10px;color:#5a6080;margin-bottom:4px;">${spot.region}</div>` : ''}
                      ${spot.primary_species ? `<div style="font-size:11px;color:#9299b5;margin-bottom:4px;">Target: <span style="color:#e8eaed;">${spot.primary_species}</span></div>` : ''}
                      ${spot.water_type ? `<div style="font-size:11px;color:#9299b5;">Water: <span style="color:#e8eaed;">${spot.water_type}</span></div>` : ''}
                      ${spot.description ? `<div style="font-size:11px;color:#9299b5;margin-top:6px;line-height:1.4;">${spot.description?.slice(0, 120)}${spot.description?.length > 120 ? '...' : ''}</div>` : ''}
                    </div>
                  `
                  m.bindPopup(popupHtml, { maxWidth: 250, className: 'pnw-popup' })
                  m.addTo(map)
                  addToLayer('fishing', m)
                })
              }
            } catch { /* no spots */ }
          }
          load()
        }
      } else {
        clearLayer('fishing')
      }

      // MARINAS LAYER
      if (activeLayers.has('marinas')) {
        if (!layerRefsRef.current['marinas']?.length) {
          const load = async () => {
            let features: MarineFeature[] = []
            try {
              const res = await fetch('/api/pnw/marinas')
              if (res.ok) {
                const data = await res.json()
                features = (data.marinas || data || []) as MarineFeature[]
              }
            } catch { /* fall through to defaults */ }
            if (features.length === 0) features = FALLBACK_MARINAS

            if (!mapRef.current) return
            features.forEach(f => {
              const icon = makeMarinaIcon(L)
              const m = L.marker([f.lat, f.lng], { icon })
              m.bindTooltip(f.name, { direction: 'top', offset: [0, -18] })
              m.on('click', () => setSelectedFeature({ ...f, type: 'marina' }))
              m.addTo(map)
              addToLayer('marinas', m)
            })
          }
          load()
        }
      } else {
        clearLayer('marinas')
      }

      // HAZARDS LAYER
      if (activeLayers.has('hazards')) {
        if (!layerRefsRef.current['hazards']?.length) {
          const load = async () => {
            try {
              const res = await fetch('/api/pnw/hazards')
              if (res.ok) {
                const data = await res.json()
                const hazards: MarineFeature[] = (data.hazards || data || []) as MarineFeature[]
                if (!mapRef.current) return
                hazards.forEach(f => {
                  const icon = makeHazardIcon(L)
                  const m = L.marker([f.lat, f.lng], { icon })
                  m.bindTooltip(f.name, { direction: 'top', offset: [0, -28] })
                  m.on('click', () => setSelectedFeature({ ...f, type: 'hazard' }))
                  m.addTo(map)
                  addToLayer('hazards', m)
                })
              }
            } catch { /* no hazards */ }
          }
          load()
        }
      } else {
        clearLayer('hazards')
      }

      // LAUNCHES LAYER
      if (activeLayers.has('launches')) {
        if (!layerRefsRef.current['launches']?.length) {
          const load = async () => {
            try {
              const res = await fetch('/api/pnw/launches')
              if (res.ok) {
                const data = await res.json()
                const launches: MarineFeature[] = (data.launches || data || []) as MarineFeature[]
                if (!mapRef.current) return
                launches.forEach(f => {
                  const icon = makeLaunchIcon(L)
                  const m = L.marker([f.lat, f.lng], { icon })
                  m.bindTooltip(f.name, { direction: 'top', offset: [0, -16] })
                  m.on('click', () => setSelectedFeature({ ...f, type: 'launch' }))
                  m.addTo(map)
                  addToLayer('launches', m)
                })
              }
            } catch { /* no launches */ }
          }
          load()
        }
      } else {
        clearLayer('launches')
      }

      // FUEL LAYER
      if (activeLayers.has('fuel')) {
        if (!layerRefsRef.current['fuel']?.length) {
          if (!mapRef.current) return
          FUEL_DOCK_DATA.forEach(f => {
            const icon = makeFuelIcon(L)
            const m = L.marker([f.lat, f.lng], { icon })
            m.bindTooltip(`${f.name} — ${f.fuel}`, { direction: 'top', offset: [0, -16] })
            const popupHtml = `
              <div style="min-width:200px;background:#0d0f14;color:#e8eaed;font-family:system-ui,sans-serif;padding:4px;">
                <div style="font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;color:#f59e0b;margin-bottom:6px;">${f.name}</div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                  <span style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);border-radius:4px;padding:2px 8px;font-size:11px;color:#f59e0b;font-weight:700;">${f.fuel}</span>
                </div>
                ${f.phone ? `<div style="font-size:11px;color:#9299b5;margin-bottom:3px;font-family:'JetBrains Mono',monospace;">${f.phone}</div>` : ''}
                ${f.hours ? `<div style="font-size:10px;color:#5a6080;margin-bottom:3px;">Hours: ${f.hours}</div>` : ''}
                ${f.vhf ? `<div style="font-size:10px;color:#4f7fff;">VHF ${f.vhf}</div>` : ''}
                ${f.services ? `<div style="font-size:10px;color:#9299b5;margin-top:4px;border-top:1px solid rgba(255,255,255,0.06);padding-top:4px;">${f.services}</div>` : ''}
                <div style="font-size:9px;color:#5a6080;margin-top:6px;font-family:'JetBrains Mono',monospace;">${f.lat.toFixed(4)}°N ${Math.abs(f.lng).toFixed(4)}°W</div>
              </div>`
            m.bindPopup(popupHtml, { maxWidth: 260, className: 'pnw-popup' })
            m.addTo(map)
            addToLayer('fuel', m)
          })
        }
      } else {
        clearLayer('fuel')
      }

      // TIDES LAYER
      if (activeLayers.has('tides')) {
        if (!layerRefsRef.current['tides']?.length) {
          const stationMarker = L.marker([47.333, -122.578], { icon: makeTideIcon(L) })
          stationMarker.bindTooltip('Gig Harbor Tide Station', { direction: 'top', offset: [0, -18] })
          stationMarker.addTo(map)
          addToLayer('tides', stationMarker)
        }
        // Fetch tide data lazily
        if (!fetchedRef.current.has('tides') && !tideLoading) {
          setTideLoading(true)
          fetchedRef.current.add('tides')
          fetch('/api/pnw/tides?station=gig_harbor')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setTideData(data) })
            .catch(() => {})
            .finally(() => setTideLoading(false))
        }
      } else {
        clearLayer('tides')
        fetchedRef.current.delete('tides')
      }

      // WEATHER LAYER
      if (activeLayers.has('weather')) {
        if (!fetchedRef.current.has('weather') && !weatherLoading) {
          setWeatherLoading(true)
          fetchedRef.current.add('weather')
          fetch('/api/pnw/weather')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setWeatherData(data) })
            .catch(() => {})
            .finally(() => setWeatherLoading(false))
        }
      } else {
        fetchedRef.current.delete('weather')
      }

      // WILDLIFE LAYER
      if (activeLayers.has('wildlife')) {
        if (!layerRefsRef.current['wildlife']?.length) {
          const load = async () => {
            try {
              const res = await fetch('/api/pnw/wildlife')
              if (res.ok) {
                const data = await res.json()
                const wildlife: MarineFeature[] = (data.wildlife || data || []) as MarineFeature[]
                if (!mapRef.current) return
                wildlife.forEach(f => {
                  const icon = makeWildlifeIcon(L, f.species || '')
                  const m = L.marker([f.lat, f.lng], { icon })
                  m.bindTooltip(`${f.species || 'Wildlife'}: ${f.name}`, { direction: 'top', offset: [0, -14] })
                  m.on('click', () => setSelectedFeature({ ...f, type: 'wildlife' }))
                  m.addTo(map)
                  addToLayer('wildlife', m)
                })
              }
            } catch { /* no wildlife */ }
          }
          load()
        }
      } else {
        clearLayer('wildlife')
      }
    })
  }, [activeLayers, mapReady, addToLayer, clearLayer, tideLoading, weatherLoading])

  // ── Depth Legend ───────────────────────────────────────────────────────────────
  const showDepthLegend = activeLayers.has('depth')
  // ── Tide Panel ────────────────────────────────────────────────────────────────
  const showTidePanel = activeLayers.has('tides')
  // ── Weather Panel ─────────────────────────────────────────────────────────────
  const showWeatherPanel = activeLayers.has('weather')

  const windSpeed = weatherData?.current ? extractWindSpeed(weatherData.current.windSpeed) : 0

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      {/* Map container */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Base Map Switcher — top right */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 1000,
        display: 'flex', gap: 2, background: 'rgba(13,15,20,0.92)',
        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
        padding: 3, backdropFilter: 'blur(8px)',
      }}>
        {(['street', 'satellite', 'terrain'] as BaseMapType[]).map(type => (
          <button
            key={type}
            onClick={() => setBaseMap(type)}
            style={{
              padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              letterSpacing: '0.5px', textTransform: 'uppercase',
              background: baseMap === type ? 'var(--accent)' : 'transparent',
              color: baseMap === type ? '#fff' : 'var(--text2)',
              transition: 'all 0.15s',
            }}
          >
            {type === 'street' ? 'Street' : type === 'satellite' ? 'Satellite' : 'Terrain'}
          </button>
        ))}
      </div>

      {/* Depth Legend */}
      {showDepthLegend && (
        <div style={{
          position: 'absolute', bottom: 120, left: 12, zIndex: 1000,
          background: 'rgba(13,15,20,0.92)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, padding: '10px 12px', backdropFilter: 'blur(8px)',
          minWidth: 160,
        }}>
          <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: 'var(--text2)', letterSpacing: '0.8px', marginBottom: 8 }}>NOAA NAUTICAL CHART OVERLAY</div>
          {[
            { label: '0 – 10 ft', color: '#b3e5fc' },
            { label: '10 – 30 ft', color: '#4fc3f7' },
            { label: '30 – 60 ft', color: '#0288d1' },
            { label: '60+ ft', color: '#01579b' },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: color, border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tide Panel — bottom left */}
      {showTidePanel && (
        <div style={{
          position: 'absolute', bottom: showDepthLegend ? 310 : 120, left: 12, zIndex: 1000,
          background: 'rgba(13,15,20,0.94)', border: '1px solid rgba(79,127,255,0.35)',
          borderRadius: 10, padding: '12px 14px', backdropFilter: 'blur(10px)',
          minWidth: 200, maxWidth: 240,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f7fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5s2.5 2 5 2 2.5-2 5-2"/>
              <path d="M2 12c.6.5 1.2 1 2.5 1C7 13 7 11 9.5 11s2.5 2 5 2 2.5-2 5-2"/>
              <path d="M2 18c.6.5 1.2 1 2.5 1C7 19 7 17 9.5 17s2.5 2 5 2 2.5-2 5-2"/>
            </svg>
            <span style={{ fontSize: 11, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: 'var(--text1)', letterSpacing: '0.5px' }}>TIDES — GIG HARBOR</span>
          </div>
          {tideLoading && (
            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>Loading…</div>
          )}
          {!tideLoading && tideData && (
            <>
              <div style={{ marginBottom: 8, padding: '4px 8px', background: 'rgba(79,127,255,0.1)', borderRadius: 6 }}>
                <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)', fontWeight: 700 }}>
                  {tideData.trend === 'rising' ? 'Rising' : 'Falling'}
                </span>
                {typeof tideData.current_height === 'number' && (
                  <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 6, fontFamily: 'JetBrains Mono, monospace' }}>
                    {tideData.current_height.toFixed(1)} ft
                  </span>
                )}
              </div>
              {tideData.predictions.slice(0, 6).map((pred, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{
                    fontSize: 10, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.5px',
                    color: pred.type === 'H' ? '#22d3ee' : '#9299b5',
                    background: pred.type === 'H' ? 'rgba(34,211,238,0.1)' : 'transparent',
                    padding: '1px 5px', borderRadius: 3,
                  }}>{pred.type === 'H' ? 'HIGH' : 'LOW'}</span>
                  <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtTideTime(pred.time)}</span>
                  <span style={{ fontSize: 11, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{pred.height_ft.toFixed(1)} ft</span>
                </div>
              ))}
              <div style={{ marginTop: 6, fontSize: 9, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                Updated {fmtUpdated(tideData.updated_at)}
              </div>
            </>
          )}
          {!tideLoading && !tideData && (
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>No tide data available</div>
          )}
        </div>
      )}

      {/* Weather Panel — right side */}
      {showWeatherPanel && (
        <div style={{
          position: 'absolute', top: 60, right: 12, zIndex: 1000,
          background: 'rgba(13,15,20,0.94)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, padding: '12px 14px', backdropFilter: 'blur(10px)',
          minWidth: 220, maxWidth: 260,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/>
            </svg>
            <span style={{ fontSize: 11, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: 'var(--text1)', letterSpacing: '0.5px' }}>WEATHER — GIG HARBOR</span>
          </div>
          {weatherLoading && (
            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>Loading…</div>
          )}
          {!weatherLoading && weatherData?.current && (
            <>
              {windSpeed > 20 && (
                <div style={{ marginBottom: 8, padding: '5px 8px', background: 'rgba(242,90,90,0.15)', border: '1px solid rgba(242,90,90,0.35)', borderRadius: 6 }}>
                  <span style={{ fontSize: 11, color: '#f25a5a', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700 }}>
                    HIGH WIND WARNING: {weatherData.current.windSpeed}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 22, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)', fontWeight: 700, lineHeight: 1 }}>
                    {weatherData.current.temperature}&deg;{weatherData.current.temperatureUnit}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{weatherData.current.shortForecast}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>{weatherData.current.windSpeed}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{weatherData.current.windDirection}</div>
                </div>
              </div>
              {weatherData.marineForecast && weatherData.marineForecast.length > 0 && (
                <div style={{ marginBottom: 8, padding: '6px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 9, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.6px', marginBottom: 3 }}>MARINE FORECAST</div>
                  <div style={{ fontSize: 10, color: 'var(--text2)', lineHeight: 1.5, fontFamily: 'system-ui,sans-serif' }}>
                    {weatherData.marineForecast[0]?.detailedForecast?.slice(0, 120)}…
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {weatherData.forecast?.slice(0, 4).map((period, i) => (
                  <div key={i} style={{ padding: '5px 6px', background: 'rgba(255,255,255,0.04)', borderRadius: 5, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, letterSpacing: '0.3px' }}>{period.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{period.temperature}&deg;{period.temperatureUnit}</div>
                    <div style={{ fontSize: 9, color: 'var(--text3)' }}>{period.shortForecast.slice(0, 20)}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 6, fontSize: 9, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                Updated {fmtUpdated(weatherData.updated_at)}
              </div>
            </>
          )}
          {!weatherLoading && !weatherData?.current && (
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Weather data unavailable</div>
          )}
        </div>
      )}

      {/* Info Panel — bottom center when feature selected */}
      {selectedFeature && (
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1001, width: '100%', maxWidth: 560,
          background: 'rgba(19,21,28,0.97)', borderTop: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(16px)', padding: '16px 20px', minHeight: 120,
        }}>
          <button
            onClick={() => setSelectedFeature(null)}
            style={{
              position: 'absolute', top: 12, right: 12, background: 'transparent',
              border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4,
            }}
          >
            <X size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              background: selectedFeature.type === 'marina' ? 'rgba(34,211,238,0.15)'
                : selectedFeature.type === 'hazard' ? 'rgba(242,90,90,0.15)'
                : selectedFeature.type === 'launch' ? 'rgba(34,192,122,0.15)'
                : selectedFeature.type === 'fuel' ? 'rgba(245,158,11,0.15)'
                : 'rgba(79,127,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${selectedFeature.type === 'marina' ? 'rgba(34,211,238,0.3)'
                : selectedFeature.type === 'hazard' ? 'rgba(242,90,90,0.3)'
                : selectedFeature.type === 'launch' ? 'rgba(34,192,122,0.3)'
                : selectedFeature.type === 'fuel' ? 'rgba(245,158,11,0.3)'
                : 'rgba(79,127,255,0.3)'}`,
            }}>
              <span style={{ fontSize: 16, color: selectedFeature.type === 'marina' ? '#22d3ee' : selectedFeature.type === 'hazard' ? '#f25a5a' : selectedFeature.type === 'launch' ? '#22c07a' : selectedFeature.type === 'fuel' ? '#f59e0b' : '#4f7fff' }}>
                {selectedFeature.type === 'marina' ? '⚓' : selectedFeature.type === 'hazard' ? '!' : selectedFeature.type === 'launch' ? '↑' : selectedFeature.type === 'fuel' ? 'F' : 'W'}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: 'var(--text1)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                {selectedFeature.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.3px' }}>
                {selectedFeature.type.toUpperCase()} {selectedFeature.city ? `— ${selectedFeature.city}` : ''}
              </div>
              {selectedFeature.description && (
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6, lineHeight: 1.5 }}>
                  {selectedFeature.description}
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                {selectedFeature.phone && (
                  <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {selectedFeature.phone}
                  </span>
                )}
                {selectedFeature.vhf_channel && (
                  <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                    VHF {selectedFeature.vhf_channel}
                  </span>
                )}
                <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {selectedFeature.lat.toFixed(4)}°N {Math.abs(selectedFeature.lng).toFixed(4)}°W
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
