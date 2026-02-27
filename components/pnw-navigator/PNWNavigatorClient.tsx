'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard, MapPin, Fish, BookOpen, Radio, Waves, Navigation, Anchor,
  Plus, Trash2, X, ChevronDown, ChevronUp, ExternalLink, Copy, Check,
  Phone, AlertTriangle, Star, ArrowRight, Search, Filter,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { Profile } from '@/types'

// Leaflet map loaded only in Spots tab
const PNWMap = dynamic(() => import('./PNWMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1628' }}>
      <div style={{ textAlign: 'center', color: '#4b6a8a' }}>
        <Navigation size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
        <div style={{ fontSize: 12 }}>Loading chart…</div>
      </div>
    </div>
  ),
})

// ─── Types ────────────────────────────────────────────────────────────────────
interface FishingSpot {
  id: string; name: string; slug: string; region: string; water_type: string
  lat: number; lng: number; description: string; access_type: string
  difficulty: string; species_present: any[]; best_techniques: any[]
  best_tides: string; depth_range_ft: string; hazards: string
  regulations_notes: string; avg_rating: number
}
interface FishSpecies {
  id: string; common_name: string; scientific_name: string
  category: string; subcategory: string
  description: string; identification_notes: string; habitat: string; diet: string
  typical_size_lbs_min: number; typical_size_lbs_max: number
  best_season: string[]; best_tides: string
  preferred_depth_ft_min: number; preferred_depth_ft_max: number
  trophy_weight_lbs: number; state_record_weight_lbs: number
  state_record_year: number; state_record_location: string
}
interface VhfChannel {
  channel: string; name: string; use_category: string
  frequency_rx: string; description: string
  international_use: boolean; us_use: boolean; notes: string | null
}
interface TidePrediction { time: string; type: 'H' | 'L'; height_ft: number }
interface CatchEntry {
  id: string; species_name: string; weight_lbs: number; length_inches: number
  catch_date: string; location_name: string; technique: string; was_released: boolean
  bait_lure: string; notes: string
}
interface UserRoute {
  id: string; name: string; description: string; waypoints: any[]
  total_distance_nm: number; estimated_time_hours: number
  fuel_estimate_gallons: number; created_at: string
}
interface UserWaypoint {
  id: string; name: string; lat: number; lng: number
  waypoint_type: string; notes: string; created_at: string
}
interface Marina {
  id: string; name: string; city: string; region: string; lat: number; lng: number
  phone: string; vhf_channel: string; description: string
  has_launch_ramp: boolean; has_fuel_dock: boolean; has_transient_moorage: boolean
  has_pump_out: boolean; has_restrooms: boolean; has_showers: boolean
  has_wifi: boolean; has_power_30amp: boolean; has_power_50amp: boolean
  has_repair_yard: boolean; usa_wrapco_authorized: boolean
  wrap_company_nearby: string; transient_rate_per_ft_per_night: number
}

type Tab = 'dashboard' | 'spots' | 'catches' | 'species' | 'vhf' | 'tides' | 'routes' | 'marinas'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Home',     icon: LayoutDashboard },
  { id: 'spots',     label: 'Spots',    icon: MapPin },
  { id: 'catches',   label: 'Catches',  icon: Fish },
  { id: 'species',   label: 'Species',  icon: BookOpen },
  { id: 'vhf',       label: 'VHF',      icon: Radio },
  { id: 'tides',     label: 'Tides',    icon: Waves },
  { id: 'routes',    label: 'Routes',   icon: Navigation },
  { id: 'marinas',   label: 'Marinas',  icon: Anchor },
]

const NAVY = '#0a1628'
const CARD = '#0f1f35'
const BORDER = 'rgba(45,212,191,0.12)'
const TEAL = '#2dd4bf'
const TEAL_DIM = 'rgba(45,212,191,0.15)'
const TEAL_DIM2 = 'rgba(45,212,191,0.08)'

function hour12(d: Date) {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
}
function greet() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PNWNavigatorClient({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState<Tab>('dashboard')

  const [spots,    setSpots]    = useState<FishingSpot[]>([])
  const [species,  setSpecies]  = useState<FishSpecies[]>([])
  const [catches,  setCatches]  = useState<CatchEntry[]>([])
  const [vhf,      setVhf]      = useState<VhfChannel[]>([])
  const [tides,    setTides]    = useState<{ station: string; predictions: TidePrediction[] }>({ station: '', predictions: [] })
  const [routes,   setRoutes]   = useState<UserRoute[]>([])
  const [waypoints,setWaypoints]= useState<UserWaypoint[]>([])
  const [marinas,  setMarinas]  = useState<Marina[]>([])

  useEffect(() => {
    fetch('/api/pnw-navigator/spots').then(r => r.json()).then(d => setSpots(d.spots || [])).catch(() => {})
    fetch('/api/pnw-navigator/species').then(r => r.json()).then(d => setSpecies(d.species || [])).catch(() => {})
    fetch('/api/pnw-navigator/catch-log').then(r => r.json()).then(d => setCatches(d.catches || [])).catch(() => {})
    fetch('/api/pnw-navigator/marinas').then(r => r.json()).then(d => setMarinas(d.marinas || [])).catch(() => {})
    fetch('/api/pnw-navigator/tides?station=seattle').then(r => r.json()).then(d => setTides({ station: d.station || 'Seattle', predictions: d.predictions || [] })).catch(() => {})
    fetch('/api/pnw-navigator/waypoints').then(r => r.json()).then(d => setWaypoints(d.waypoints || [])).catch(() => {})
    fetch('/api/pnw-navigator/routes').then(r => r.json()).then(d => setRoutes(d.routes || [])).catch(() => {})
    loadVhf()
  }, [])

  const loadVhf = useCallback(() => {
    fetch('/api/pnw-navigator/vhf').then(r => r.json()).then(d => setVhf(d.channels || [])).catch(() => {})
  }, [])

  const refreshCatches   = useCallback(() => fetch('/api/pnw-navigator/catch-log').then(r => r.json()).then(d => setCatches(d.catches || [])).catch(() => {}), [])
  const refreshWaypoints = useCallback(() => {
    fetch('/api/pnw-navigator/waypoints').then(r => r.json()).then(d => setWaypoints(d.waypoints || [])).catch(() => {})
    fetch('/api/pnw-navigator/routes').then(r => r.json()).then(d => setRoutes(d.routes || [])).catch(() => {})
  }, [])

  const now = new Date()
  const nextTide = tides.predictions.find(p => new Date(p.time) > now)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: NAVY, color: '#e2eaf4', fontFamily: 'system-ui,sans-serif' }}>

      {/* ── App Header ───────────────────────────────────────────────────────── */}
      <div style={{ background: '#071020', borderBottom: '1px solid rgba(45,212,191,0.15)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#1a4e6e,#0e7490)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Anchor size={15} color={TEAL} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'Barlow Condensed,sans-serif', letterSpacing: '0.08em', color: '#e2eaf4' }}>PNW NAVIGATOR</div>
              <div style={{ fontSize: 9, color: '#4b7a9a', letterSpacing: '0.07em' }}>PUGET SOUND · SAN JUANS · PACIFIC COAST</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {nextTide && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: CARD, borderRadius: 7, padding: '4px 9px', fontSize: 10, border: BORDER }}>
                <Waves size={10} color={TEAL} />
                <span style={{ fontWeight: 700, color: nextTide.type === 'H' ? TEAL : '#f59e0b' }}>{nextTide.type === 'H' ? 'HI' : 'LO'}</span>
                <span style={{ color: '#4b7a9a' }}>{hour12(new Date(nextTide.time))}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', padding: '0 2px', marginTop: 6, overflowX: 'auto' }}>
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '7px 10px', border: 'none', background: 'none', cursor: 'pointer',
                borderBottom: active ? `2px solid ${TEAL}` : '2px solid transparent',
                color: active ? TEAL : '#4b7a9a', transition: 'color 0.15s',
                whiteSpace: 'nowrap',
              }}>
                <Icon size={15} />
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.04em' }}>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'dashboard' && <DashboardTab profile={profile} catches={catches} spots={spots} species={species} tides={tides} onNav={setTab} />}
        {tab === 'spots'     && <SpotsTab spots={spots} setSpots={setSpots} species={species} />}
        {tab === 'catches'   && <CatchesTab catches={catches} species={species} onRefresh={refreshCatches} />}
        {tab === 'species'   && <SpeciesTab species={species} spots={spots} />}
        {tab === 'vhf'       && <VhfTab channels={vhf} />}
        {tab === 'tides'     && <TidesTab tides={tides} />}
        {tab === 'routes'    && <RoutesTab routes={routes} waypoints={waypoints} onRefresh={refreshWaypoints} />}
        {tab === 'marinas'   && <MarinasTab marinas={marinas} />}
      </div>
    </div>
  )
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`, padding: '12px 14px',
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: '#071020', border: '1px solid rgba(45,212,191,0.18)',
  borderRadius: 8, padding: '8px 11px', color: '#e2eaf4', fontSize: 13, boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: 10, color: '#4b7a9a', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em',
}
const primaryBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8,
  background: TEAL, color: '#071020', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
  justifyContent: 'center',
}
const ghostBtn: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 8, background: TEAL_DIM2, border: `1px solid ${BORDER}`,
  color: TEAL, cursor: 'pointer', fontSize: 12, fontWeight: 600,
}

// ─── TAB 1: DASHBOARD ────────────────────────────────────────────────────────
function DashboardTab({ profile, catches, spots, species, tides, onNav }: {
  profile: Profile
  catches: CatchEntry[]
  spots: FishingSpot[]
  species: FishSpecies[]
  tides: { station: string; predictions: TidePrediction[] }
  onNav: (t: Tab) => void
}) {
  const now = new Date()
  const nextTide = tides.predictions.find(p => new Date(p.time) > now)
  const recentCatches = catches.slice(0, 5)
  const firstName = (profile.name || 'Captain').split(' ')[0]
  const biggestCatch = catches.reduce<CatchEntry | null>((best, c) => {
    if (!best || (c.weight_lbs && c.weight_lbs > (best.weight_lbs || 0))) return c
    return best
  }, null)

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '14px 12px' }}>
      {/* Welcome */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Barlow Condensed,sans-serif', letterSpacing: '0.03em', color: '#e2eaf4' }}>
          {greet()}, {firstName}
        </div>
        <div style={{ fontSize: 12, color: '#4b7a9a', marginTop: 1 }}>
          {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Species',     value: species.length,  sub: 'in guide' },
          { label: 'Saved Spots', value: spots.length,    sub: 'locations' },
          { label: 'My Catches',  value: catches.length,  sub: 'logged' },
        ].map(s => (
          <div key={s.label} style={{ ...cardStyle, textAlign: 'center', padding: '12px 8px' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: TEAL, fontFamily: 'JetBrains Mono,monospace', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#e2eaf4', fontWeight: 600, marginTop: 3 }}>{s.label}</div>
            <div style={{ fontSize: 9, color: '#4b7a9a' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Today's Conditions */}
      <div style={{ ...cardStyle, marginBottom: 14, background: 'linear-gradient(135deg,#0c1e34,#0e2840)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: TEAL, letterSpacing: '0.08em', marginBottom: 10 }}>TODAY'S CONDITIONS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: '#4b7a9a', marginBottom: 2 }}>NEXT TIDE</div>
            {nextTide ? (
              <div>
                <span style={{ fontSize: 18, fontWeight: 800, color: nextTide.type === 'H' ? TEAL : '#f59e0b', fontFamily: 'JetBrains Mono,monospace' }}>
                  {nextTide.type === 'H' ? 'HIGH' : 'LOW'}
                </span>
                <div style={{ fontSize: 12, color: '#e2eaf4' }}>{hour12(new Date(nextTide.time))}</div>
                <div style={{ fontSize: 11, color: '#4b7a9a' }}>{nextTide.height_ft}ft</div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#4b7a9a' }}>No tide data</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#4b7a9a', marginBottom: 2 }}>TIDES TODAY</div>
            <div style={{ fontSize: 12, color: '#4b7a9a' }}>
              {tides.predictions.length > 0
                ? `${tides.predictions.length} tide events`
                : 'Check tides tab'}
            </div>
            <button onClick={() => onNav('tides')} style={{ marginTop: 6, ...ghostBtn, padding: '4px 10px', fontSize: 10 }}>
              View chart
            </button>
          </div>
        </div>
        <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 7, background: 'rgba(0,0,0,0.2)', fontSize: 11, color: '#4b7a9a' }}>
          Weather: Connect your marina for live conditions · <a href="https://www.weather.gov/mtr/" target="_blank" rel="noopener noreferrer" style={{ color: TEAL, textDecoration: 'none' }}>NOAA Puget Sound Forecast</a>
        </div>
      </div>

      {/* Recent catches */}
      {recentCatches.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8fa8c0', letterSpacing: '0.06em' }}>RECENT CATCHES</div>
            <button onClick={() => onNav('catches')} style={{ background: 'none', border: 'none', color: TEAL, cursor: 'pointer', fontSize: 11 }}>View all →</button>
          </div>
          {recentCatches.map(c => (
            <div key={c.id} style={{ ...cardStyle, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: TEAL_DIM2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Fish size={16} color={TEAL} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{c.species_name}</div>
                <div style={{ fontSize: 11, color: '#4b7a9a' }}>
                  {c.catch_date}{c.weight_lbs ? ` · ${c.weight_lbs} lbs` : ''}{c.location_name ? ` · ${c.location_name}` : ''}
                  {c.was_released && <span style={{ color: '#22c07a', marginLeft: 4 }}>C&R</span>}
                </div>
              </div>
            </div>
          ))}
          {biggestCatch && biggestCatch.weight_lbs > 0 && (
            <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: TEAL_DIM2, border: `1px solid ${BORDER}`, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Star size={13} color={TEAL} />
              <span style={{ fontSize: 12, color: '#e2eaf4' }}>Personal best: <strong>{biggestCatch.species_name}</strong> · {biggestCatch.weight_lbs} lbs</span>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#8fa8c0', letterSpacing: '0.06em', marginBottom: 8 }}>QUICK ACTIONS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Log a Catch',  tab: 'catches' as Tab, icon: Fish },
            { label: 'Find a Spot',  tab: 'spots'   as Tab, icon: MapPin },
            { label: 'Check Tides',  tab: 'tides'   as Tab, icon: Waves },
            { label: 'VHF Guide',    tab: 'vhf'     as Tab, icon: Radio },
          ].map(a => {
            const Icon = a.icon
            return (
              <button key={a.label} onClick={() => onNav(a.tab)} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 8, border: 'none', cursor: 'pointer', padding: '12px 12px' }}>
                <Icon size={16} color={TEAL} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#e2eaf4' }}>{a.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── TAB 2: FISHING SPOTS ────────────────────────────────────────────────────
function SpotsTab({ spots, setSpots, species }: {
  spots: FishingSpot[]
  setSpots: (s: FishingSpot[]) => void
  species: FishSpecies[]
}) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState<FishingSpot | null>(null)
  const [showMap, setShowMap]        = useState(false)
  const [showAdd, setShowAdd]        = useState(false)
  const [saving, setSaving]          = useState(false)
  const [form, setForm] = useState({
    name: '', water_type: 'saltwater', lat: '', lng: '',
    description: '', difficulty: '2', notes: '', target_species: '',
  })

  const TYPES = ['all', 'saltwater', 'freshwater']
  const DIFF_LABEL: Record<string, string> = { beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert' }
  const DIFF_COLOR: Record<string, string> = { beginner: '#22c07a', intermediate: '#f59e0b', expert: '#f25a5a' }

  const filtered = spots.filter(s =>
    (typeFilter === 'all' || s.water_type === typeFilter) &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase()))
  )

  const saveSpot = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      const r = await fetch('/api/pnw-navigator/spots', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...form,
          lat: parseFloat(form.lat) || null,
          lng: parseFloat(form.lng) || null,
          difficulty: form.difficulty === '1' ? 'beginner' : form.difficulty === '3' ? 'expert' : 'intermediate',
        }),
      })
      if (r.ok) {
        const d = await r.json()
        if (d.spot) setSpots([d.spot, ...spots])
        setShowAdd(false)
        setForm({ name: '', water_type: 'saltwater', lat: '', lng: '', description: '', difficulty: '2', notes: '', target_species: '' })
      }
    } finally { setSaving(false) }
  }

  if (selected) return <SpotDetail spot={selected} onBack={() => setSelected(null)} />

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Filter bar */}
      <div style={{ flexShrink: 0, padding: '8px 12px', background: '#071020', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 7 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#4b7a9a' }} />
            <input type="text" placeholder="Search spots…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 28, margin: 0 }} />
          </div>
          <button onClick={() => setShowMap(v => !v)} style={{ ...ghostBtn, padding: '7px 12px', flexShrink: 0 }}>
            {showMap ? 'Cards' : 'Map'}
          </button>
          <button onClick={() => setShowAdd(v => !v)} style={{ ...primaryBtn, padding: '7px 12px', flexShrink: 0 }}>
            <Plus size={13} /> Add
          </button>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {TYPES.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: typeFilter === t ? TEAL : CARD, color: typeFilter === t ? '#071020' : '#8fa8c0',
            }}>{t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#4b7a9a', alignSelf: 'center' }}>{filtered.length} spots</span>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ flexShrink: 0, padding: 12, background: CARD, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, marginBottom: 10 }}>Add New Spot</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Spot Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Hood Canal" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.water_type} onChange={e => setForm(p => ({ ...p, water_type: e.target.value }))} style={{ ...inputStyle }}>
                <option value="saltwater">Saltwater</option>
                <option value="freshwater">Freshwater</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Difficulty (1–3)</label>
              <select value={form.difficulty} onChange={e => setForm(p => ({ ...p, difficulty: e.target.value }))} style={{ ...inputStyle }}>
                <option value="1">1 – Beginner</option>
                <option value="2">2 – Intermediate</option>
                <option value="3">3 – Expert</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Latitude</label>
              <input value={form.lat} onChange={e => setForm(p => ({ ...p, lat: e.target.value }))} placeholder="47.6500" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Longitude</label>
              <input value={form.lng} onChange={e => setForm(p => ({ ...p, lng: e.target.value }))} placeholder="-122.4500" style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Target Species</label>
              <input value={form.target_species} onChange={e => setForm(p => ({ ...p, target_species: e.target.value }))} placeholder="Chinook Salmon, Lingcod" style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Best techniques, hazards, timing…" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={saveSpot} disabled={saving || !form.name} style={{ ...primaryBtn, flex: 1 }}>{saving ? 'Saving…' : 'Save Spot'}</button>
            <button onClick={() => setShowAdd(false)} style={{ ...ghostBtn }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {showMap ? (
          <PNWMap spots={filtered} marinas={[]} onSpotClick={s => setSelected(s as FishingSpot)} onMarinaClick={() => {}} />
        ) : (
          <div style={{ height: '100%', overflowY: 'auto', padding: 10 }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, color: '#4b7a9a' }}>
                <MapPin size={32} style={{ opacity: 0.2, marginBottom: 10 }} />
                <div>No spots found</div>
              </div>
            )}
            {filtered.map(s => (
              <div key={s.id} onClick={() => setSelected(s)} style={{ ...cardStyle, marginBottom: 8, cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `rgba(45,212,191,0.35)`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#e2eaf4' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#4b7a9a' }}>
                      {s.water_type} · {s.depth_range_ft ? `${s.depth_range_ft}ft` : '—'}
                      {s.lat ? ` · ${parseFloat(String(s.lat)).toFixed(4)}°N` : ''}
                    </div>
                  </div>
                  {s.difficulty && (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: (DIFF_COLOR[s.difficulty] || '#4b7a9a') + '20', color: DIFF_COLOR[s.difficulty] || '#4b7a9a', fontWeight: 700, textTransform: 'uppercase', flexShrink: 0 }}>
                      {DIFF_LABEL[s.difficulty] || s.difficulty}
                    </span>
                  )}
                </div>
                {s.description && <p style={{ fontSize: 12, color: '#8fa8c0', margin: '0 0 7px', lineHeight: 1.5 }}>{s.description.slice(0, 120)}{s.description.length > 120 ? '…' : ''}</p>}
                {Array.isArray(s.species_present) && s.species_present.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {s.species_present.slice(0, 4).map((sp: any, i: number) => (
                      <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: TEAL_DIM2, color: TEAL, fontWeight: 600 }}>
                        {'★'.repeat(Math.min(sp.rating || 3, 5))} {(sp.species_id || '').replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
                {s.best_tides && <div style={{ fontSize: 10, color: '#4b7a9a', marginTop: 5 }}>Best tide: {s.best_tides}</div>}
                {s.hazards && (
                  <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                    <AlertTriangle size={11} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 11, color: '#f59e0b' }}>{s.hazards}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SpotDetail({ spot: s, onBack }: { spot: FishingSpot; onBack: () => void }) {
  const DIFF_COLOR: Record<string, string> = { beginner: '#22c07a', intermediate: '#f59e0b', expert: '#f25a5a' }
  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '10px 14px', background: '#071020', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, zIndex: 5 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: TEAL, cursor: 'pointer', fontSize: 13 }}>← Spots</button>
        <span style={{ color: '#4b7a9a' }}>·</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e2eaf4' }}>{s.name}</span>
      </div>
      <div style={{ padding: '14px 14px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          {s.difficulty && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: (DIFF_COLOR[s.difficulty] || '#4b7a9a') + '20', color: DIFF_COLOR[s.difficulty] || '#4b7a9a', fontWeight: 700 }}>{s.difficulty}</span>}
          <span style={{ fontSize: 11, color: '#4b7a9a' }}>{s.water_type}</span>
          {s.depth_range_ft && <span style={{ fontSize: 11, color: '#4b7a9a' }}>· {s.depth_range_ft}ft</span>}
        </div>
        {s.description && <p style={{ fontSize: 13, color: '#8fa8c0', lineHeight: 1.6, marginBottom: 14 }}>{s.description}</p>}
        {Array.isArray(s.species_present) && s.species_present.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Target Species</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {s.species_present.map((sp: any, i: number) => (
                <span key={i} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, background: TEAL_DIM2, color: TEAL, fontWeight: 600 }}>
                  {'★'.repeat(sp.rating || 3)} {(sp.species_id || '').replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
        {Array.isArray(s.best_techniques) && s.best_techniques.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Best Techniques</div>
            <div style={{ fontSize: 13, color: '#8fa8c0' }}>{s.best_techniques.map((t: any) => typeof t === 'string' ? t : (t?.name ?? String(t))).join(', ')}</div>
          </div>
        )}
        {s.best_tides && (
          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Best Tide</div>
            <div style={{ fontSize: 13, color: '#8fa8c0', textTransform: 'capitalize' }}>{s.best_tides}</div>
          </div>
        )}
        {s.hazards && (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <AlertTriangle size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: '#f59e0b' }}>{s.hazards}</span>
            </div>
          </div>
        )}
        {s.regulations_notes && (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: TEAL_DIM2, border: `1px solid ${BORDER}`, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, marginBottom: 3 }}>Regulations Note</div>
            <div style={{ fontSize: 12, color: '#8fa8c0' }}>{s.regulations_notes}</div>
          </div>
        )}
        {s.lat && s.lng && (
          <a href={`https://www.google.com/maps?q=${s.lat},${s.lng}`} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TEAL, textDecoration: 'none', marginBottom: 8 }}>
            <MapPin size={12} /> Open in Maps — {parseFloat(String(s.lat)).toFixed(4)}°N {Math.abs(parseFloat(String(s.lng))).toFixed(4)}°W
          </a>
        )}
      </div>
    </div>
  )
}

// ─── TAB 3: CATCH LOG ────────────────────────────────────────────────────────
function CatchesTab({ catches, species, onRefresh }: {
  catches: CatchEntry[]
  species: FishSpecies[]
  onRefresh: () => void
}) {
  const [showAdd, setShowAdd]         = useState(false)
  const [saving,  setSaving]          = useState(false)
  const [customSpecies, setCustomSpecies] = useState('')
  const [form, setForm] = useState({
    species_name: '', weight_lbs: '', length_inches: '',
    catch_date: new Date().toISOString().split('T')[0],
    location_name: '', bait_lure: '', notes: '', was_released: false,
  })

  const effectiveSpecies = form.species_name === '__other' ? customSpecies : form.species_name

  const saveCatch = async () => {
    if (!effectiveSpecies) return
    setSaving(true)
    try {
      const r = await fetch('/api/pnw-navigator/catch-log', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...form,
          species_name: effectiveSpecies,
          weight_lbs: parseFloat(form.weight_lbs) || null,
          length_inches: parseFloat(form.length_inches) || null,
        }),
      })
      if (r.ok) {
        setShowAdd(false)
        setCustomSpecies('')
        setForm({ species_name: '', weight_lbs: '', length_inches: '', catch_date: new Date().toISOString().split('T')[0], location_name: '', bait_lure: '', notes: '', was_released: false })
        onRefresh()
      }
    } finally { setSaving(false) }
  }

  const delCatch = async (id: string) => {
    await fetch(`/api/pnw-navigator/catch-log?id=${id}`, { method: 'DELETE' })
    onRefresh()
  }

  const biggest = catches.reduce<CatchEntry | null>((b, c) => (!b || (c.weight_lbs && c.weight_lbs > (b.weight_lbs || 0))) ? c : b, null)
  const speciesCounts = catches.reduce<Record<string, number>>((acc, c) => { acc[c.species_name] = (acc[c.species_name] || 0) + 1; return acc }, {})
  const favSpecies = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '12px 12px' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Total',     value: catches.length.toString() },
          { label: 'Species',   value: Object.keys(speciesCounts).length.toString() },
          { label: 'Biggest',   value: biggest?.weight_lbs ? `${biggest.weight_lbs}lbs` : '—' },
        ].map(s => (
          <div key={s.label} style={{ ...cardStyle, textAlign: 'center', padding: '10px 6px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: TEAL, fontFamily: 'JetBrains Mono,monospace' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#8fa8c0', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {favSpecies && (
        <div style={{ ...cardStyle, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <Star size={14} color={TEAL} />
          <span style={{ fontSize: 12, color: '#8fa8c0' }}>Favorite species: <strong style={{ color: '#e2eaf4' }}>{favSpecies[0]}</strong> ({favSpecies[1]} catches)</span>
        </div>
      )}

      {/* Log Catch button */}
      <button onClick={() => setShowAdd(v => !v)} style={{ ...primaryBtn, width: '100%', marginBottom: 12 }}>
        <Plus size={14} /> Log a Catch
      </button>

      {/* Add form */}
      {showAdd && (
        <div style={{ ...cardStyle, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, marginBottom: 10 }}>New Catch Entry</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Species *</label>
              <select value={form.species_name} onChange={e => setForm(p => ({ ...p, species_name: e.target.value }))} style={{ ...inputStyle }}>
                <option value="">Select species…</option>
                {species.map(s => <option key={s.id} value={s.common_name}>{s.common_name}</option>)}
                <option value="__other">Other (type below)</option>
              </select>
              {form.species_name === '__other' && (
                <input value={customSpecies} onChange={e => setCustomSpecies(e.target.value)} placeholder="Species name…" style={{ ...inputStyle, marginTop: 5 }} autoFocus />
              )}
            </div>
            {[
              { key: 'weight_lbs',   label: 'Weight (lbs)',  placeholder: '12.5',   type: 'number' },
              { key: 'length_inches',label: 'Length (in)',   placeholder: '28',     type: 'number' },
              { key: 'catch_date',   label: 'Date',         placeholder: '',       type: 'date',  full: false },
              { key: 'location_name',label: 'Location',     placeholder: 'Possession Bar', full: true },
              { key: 'bait_lure',    label: 'Bait / Lure',  placeholder: 'Green Flasher + Coyote', full: true },
            ].map((f: any) => (
              <div key={f.key} style={{ gridColumn: f.full ? '1/-1' : 'auto' }}>
                <label style={labelStyle}>{f.label}</label>
                <input type={f.type || 'text'} placeholder={f.placeholder}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={inputStyle} />
              </div>
            ))}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Conditions, depth, technique…" />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: 'pointer', fontSize: 12, color: '#8fa8c0' }}>
            <input type="checkbox" checked={form.was_released} onChange={e => setForm(p => ({ ...p, was_released: e.target.checked }))} />
            Catch &amp; Release
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={saveCatch} disabled={saving || !effectiveSpecies} style={{ ...primaryBtn, flex: 1 }}>{saving ? 'Saving…' : 'Save Catch'}</button>
            <button onClick={() => setShowAdd(false)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {catches.length === 0 && !showAdd && (
        <div style={{ textAlign: 'center', padding: 48, color: '#4b7a9a' }}>
          <Fish size={32} style={{ opacity: 0.2, marginBottom: 10 }} />
          <div>No catches logged yet.</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Start your fish journal!</div>
        </div>
      )}

      {catches.map(c => (
        <div key={c.id} style={{ ...cardStyle, marginBottom: 6, display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: TEAL_DIM2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Fish size={16} color={TEAL} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e2eaf4' }}>
              {c.species_name}
              {c.was_released && <span style={{ fontSize: 10, color: '#22c07a', marginLeft: 6 }}>C&R</span>}
            </div>
            <div style={{ fontSize: 11, color: '#4b7a9a' }}>
              {c.catch_date}
              {c.weight_lbs ? ` · ${c.weight_lbs} lbs` : ''}
              {c.length_inches ? ` · ${c.length_inches}"` : ''}
              {c.location_name ? ` · ${c.location_name}` : ''}
              {c.bait_lure ? ` · ${c.bait_lure}` : ''}
            </div>
            {c.notes && <div style={{ fontSize: 11, color: '#4b7a9a', marginTop: 2 }}>{c.notes}</div>}
          </div>
          <button onClick={() => delCatch(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b7a9a', padding: 4 }}><Trash2 size={13} /></button>
        </div>
      ))}
    </div>
  )
}

// ─── TAB 4: SPECIES GUIDE ────────────────────────────────────────────────────
function SpeciesTab({ species, spots }: { species: FishSpecies[]; spots: FishingSpot[] }) {
  const [cat,      setCat]      = useState('all')
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState<FishSpecies | null>(null)

  const CATS = [
    { id: 'all', label: 'All' }, { id: 'salmon', label: 'Salmon' },
    { id: 'bottomfish', label: 'Bottomfish' }, { id: 'shellfish', label: 'Shellfish' },
    { id: 'freshwater', label: 'Freshwater' }, { id: 'saltwater', label: 'Saltwater' },
  ]
  const CAT_ABBR: Record<string, string> = { salmon: 'SAL', bottomfish: 'BTM', shellfish: 'SHL', freshwater: 'FW', saltwater: 'SW' }

  const filtered = species.filter(s =>
    (cat === 'all' || s.category === cat) &&
    (!search || s.common_name.toLowerCase().includes(search.toLowerCase()))
  )

  if (selected) return <SpeciesDetail species={selected} spots={spots} onBack={() => setSelected(null)} />

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, padding: '8px 12px', background: '#071020', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ position: 'relative', marginBottom: 7 }}>
          <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#4b7a9a' }} />
          <input type="text" placeholder="Search species…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 28, margin: 0 }} />
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {CATS.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: cat === c.id ? TEAL : CARD, color: cat === c.id ? '#071020' : '#8fa8c0',
            }}>{c.label}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {filtered.map(s => (
          <div key={s.id} onClick={() => setSelected(s)} style={{ ...cardStyle, marginBottom: 6, display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(45,212,191,0.35)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>
            <div style={{ width: 42, height: 42, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              background: s.category === 'salmon' ? 'rgba(239,68,68,0.12)' : s.category === 'bottomfish' ? 'rgba(139,92,246,0.12)' : s.category === 'shellfish' ? 'rgba(245,158,11,0.12)' : TEAL_DIM2 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: TEAL, letterSpacing: '0.03em' }}>{CAT_ABBR[s.category] || 'FISH'}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2eaf4' }}>{s.common_name}</div>
              <div style={{ fontSize: 10, color: '#4b7a9a', fontStyle: 'italic' }}>{s.scientific_name}</div>
              <div style={{ fontSize: 11, color: '#8fa8c0', marginTop: 1 }}>
                {s.typical_size_lbs_min}–{s.typical_size_lbs_max} lbs
                {s.state_record_weight_lbs ? ` · Record: ${s.state_record_weight_lbs} lbs` : ''}
              </div>
              {s.best_season?.length > 0 && (
                <div style={{ fontSize: 10, color: '#4b7a9a', marginTop: 2 }}>
                  Best: {s.best_season.map((x: string) => x.replace('_', ' ')).join(', ')}
                </div>
              )}
            </div>
            <ArrowRight size={13} color="#4b7a9a" />
          </div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: '#4b7a9a', fontSize: 13 }}>No species found</div>}
      </div>
    </div>
  )
}

function SpeciesDetail({ species: s, spots, onBack }: { species: FishSpecies; spots: FishingSpot[]; onBack: () => void }) {
  const mySpots = spots
    .filter(sp => (Array.isArray(sp.species_present) ? sp.species_present : []).some((p: any) => p.species_id === s.id))
    .sort((a, b) => {
      const ra = (Array.isArray(a.species_present) ? a.species_present : []).find((p: any) => p.species_id === s.id)?.rating || 0
      const rb = (Array.isArray(b.species_present) ? b.species_present : []).find((p: any) => p.species_id === s.id)?.rating || 0
      return rb - ra
    })

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '10px 14px', background: '#071020', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, zIndex: 5 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: TEAL, cursor: 'pointer', fontSize: 13 }}>← Species</button>
        <span style={{ color: '#4b7a9a' }}>·</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e2eaf4' }}>{s.common_name}</span>
      </div>
      <div style={{ padding: '14px' }}>
        <div style={{ ...cardStyle, background: 'linear-gradient(135deg,#0c1e34,#0e2840)', marginBottom: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Barlow Condensed,sans-serif', color: '#e2eaf4', letterSpacing: '0.04em' }}>{s.common_name.toUpperCase()}</div>
          <div style={{ fontSize: 11, color: '#4b7a9a', fontStyle: 'italic', marginBottom: 8 }}>{s.scientific_name}</div>
          <p style={{ fontSize: 12, color: '#8fa8c0', lineHeight: 1.6, margin: 0 }}>{s.description}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Typical Size', value: `${s.typical_size_lbs_min}–${s.typical_size_lbs_max} lbs` },
            { label: 'WA Record',    value: s.state_record_weight_lbs ? `${s.state_record_weight_lbs} lbs` : 'N/A' },
            { label: 'Trophy',       value: s.trophy_weight_lbs ? `${s.trophy_weight_lbs}+ lbs` : 'N/A' },
            { label: 'Best Depth',   value: s.preferred_depth_ft_min != null ? `${s.preferred_depth_ft_min}–${s.preferred_depth_ft_max}ft` : 'Varies' },
          ].map(stat => (
            <div key={stat.label} style={{ ...cardStyle, padding: '10px 12px' }}>
              <div style={labelStyle}>{stat.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#e2eaf4', fontFamily: 'JetBrains Mono,monospace' }}>{stat.value}</div>
            </div>
          ))}
        </div>
        {s.identification_notes && <InfoBlock title="Identification"><p style={{ fontSize: 12, color: '#8fa8c0', lineHeight: 1.6, margin: 0 }}>{s.identification_notes}</p></InfoBlock>}
        {s.habitat && <InfoBlock title="Habitat"><p style={{ fontSize: 12, color: '#8fa8c0', lineHeight: 1.6, margin: 0 }}>{s.habitat}</p></InfoBlock>}
        {s.diet && <InfoBlock title="Diet"><p style={{ fontSize: 12, color: '#8fa8c0', lineHeight: 1.6, margin: 0 }}>{s.diet}</p></InfoBlock>}
        {s.best_season?.length > 0 && (
          <InfoBlock title="Best Seasons">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {s.best_season.map((season: string) => (
                <span key={season} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, background: TEAL_DIM2, color: TEAL, fontWeight: 600, textTransform: 'capitalize' }}>
                  {season.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </InfoBlock>
        )}
        {s.best_tides && <InfoBlock title="Best Tides"><span style={{ fontSize: 12, color: '#8fa8c0', textTransform: 'capitalize' }}>{s.best_tides}</span></InfoBlock>}
        {mySpots.length > 0 && (
          <InfoBlock title={`Top Spots (${mySpots.length})`}>
            {mySpots.slice(0, 5).map(sp => {
              const rating = (Array.isArray(sp.species_present) ? sp.species_present : []).find((p: any) => p.species_id === s.id)?.rating || 0
              return (
                <div key={sp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <MapPin size={11} color={TEAL} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#e2eaf4' }}>{sp.name}</span>
                  <span style={{ fontSize: 11, color: '#f59e0b' }}>{'★'.repeat(rating)}</span>
                </div>
              )
            })}
          </InfoBlock>
        )}
        <a href="https://wdfw.wa.gov/fishing/regulations" target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', padding: 12, borderRadius: 10, background: TEAL_DIM2, border: `1px solid ${BORDER}`, color: TEAL, textDecoration: 'none', fontSize: 12, fontWeight: 600, marginTop: 8 }}>
          <BookOpen size={13} /> WDFW Fishing Regulations <ExternalLink size={11} />
        </a>
      </div>
    </div>
  )
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4b7a9a', marginBottom: 6 }}>{title}</div>
      <div style={{ ...cardStyle }}>{children}</div>
    </div>
  )
}

// ─── TAB 5: VHF CHANNELS ─────────────────────────────────────────────────────
const VHF_FALLBACK: VhfChannel[] = [
  { channel: '16',  name: 'International Distress & Calling', use_category: 'calling',     frequency_rx: '156.800', description: 'MANDATORY MONITORING. Distress calls, Coast Guard. Always monitor Ch 16.',  international_use: true,  us_use: true,  notes: 'Never use for routine comms' },
  { channel: '9',   name: 'Boater Calling (US Recreational)', use_category: 'calling',     frequency_rx: '156.450', description: 'US recreational hailing channel. Hail then switch to working channel.',        international_use: false, us_use: true,  notes: null },
  { channel: '22A', name: 'Coast Guard Liaison',              use_category: 'coast_guard', frequency_rx: '157.100', description: 'US Coast Guard working channel. After contacting USCG on 16, switch here.', international_use: false, us_use: true,  notes: 'US only' },
  { channel: 'WX1', name: 'NOAA Weather Primary',            use_category: 'weather',     frequency_rx: '162.400', description: 'NOAA continuous weather forecasts — Seattle / NW WA.',                       international_use: false, us_use: true,  notes: 'NW WA primary' },
  { channel: 'WX2', name: 'NOAA Weather Alternate',          use_category: 'weather',     frequency_rx: '162.425', description: 'Alternate NOAA weather broadcast.',                                          international_use: false, us_use: true,  notes: null },
  { channel: '68',  name: 'Non-Commercial Working',          use_category: 'working',     frequency_rx: '156.425', description: 'Most popular recreational working channel in Puget Sound.',                  international_use: true,  us_use: true,  notes: 'Very common in Puget Sound' },
  { channel: '69',  name: 'Non-Commercial Working',          use_category: 'working',     frequency_rx: '156.475', description: 'Recreational working channel.',                                              international_use: true,  us_use: true,  notes: null },
  { channel: '72',  name: 'Non-Commercial Working',          use_category: 'working',     frequency_rx: '156.625', description: 'Ship-to-ship only in USA. Popular offshore.',                                international_use: true,  us_use: true,  notes: 'No coast station contact' },
  { channel: '6',   name: 'Safety / SAR Operations',         use_category: 'coast_guard', frequency_rx: '156.300', description: 'Search and rescue coordination with USCG.',                                 international_use: true,  us_use: true,  notes: null },
  { channel: '13',  name: 'Bridge-to-Bridge Navigation',     use_category: 'bridge',      frequency_rx: '156.650', description: 'Ships, bridges, vessel traffic. Monitor in shipping lanes.',                international_use: true,  us_use: true,  notes: null },
  { channel: '14',  name: 'Seattle Vessel Traffic Service',  use_category: 'port',        frequency_rx: '156.700', description: 'Seattle VTS. Monitor in main Sound channels.',                             international_use: false, us_use: true,  notes: 'REQUIRED in VTS area' },
  { channel: '67',  name: 'Bridge-to-Bridge Commercial',     use_category: 'bridge',      frequency_rx: '156.375', description: 'Commercial vessel bridge-to-bridge.',                                       international_use: true,  us_use: true,  notes: null },
]

const CAT_COLOR: Record<string, string> = {
  calling:     '#f25a5a',
  coast_guard: '#4f7fff',
  weather:     '#22d3ee',
  working:     '#22c07a',
  bridge:      '#8b5cf6',
  port:        '#8b5cf6',
}

function VhfTab({ channels }: { channels: VhfChannel[] }) {
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [copied, setCopied]       = useState<string | null>(null)

  const data = channels.length > 0 ? channels : VHF_FALLBACK
  const CATS = ['all', ...Array.from(new Set(data.map(c => c.use_category)))]

  const filtered = data.filter(c =>
    (catFilter === 'all' || c.use_category === catFilter) &&
    (!search || c.channel.toLowerCase().includes(search.toLowerCase()) ||
     c.name.toLowerCase().includes(search.toLowerCase()) ||
     c.description.toLowerCase().includes(search.toLowerCase()))
  )

  const groups = filtered.reduce<Record<string, VhfChannel[]>>((acc, c) => {
    const g = c.use_category || 'other'
    if (!acc[g]) acc[g] = []
    acc[g].push(c)
    return acc
  }, {})

  const copyChannel = (ch: string) => {
    navigator.clipboard.writeText(ch).catch(() => {})
    setCopied(ch)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, padding: '8px 12px', background: '#071020', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ position: 'relative', marginBottom: 7 }}>
          <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#4b7a9a' }} />
          <input type="text" placeholder="Search channels…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 28, margin: 0 }} />
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', textTransform: 'capitalize',
              background: catFilter === c ? TEAL : CARD, color: catFilter === c ? '#071020' : '#8fa8c0',
            }}>{c === 'all' ? 'All' : c.replace('_', ' ')}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {Object.entries(groups).map(([group, chans]) => (
          <div key={group} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: CAT_COLOR[group] || '#4b7a9a', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, padding: '0 2px' }}>
              {group.replace(/_/g, ' ')}
            </div>
            {chans.map(c => (
              <div key={c.channel} style={{ ...cardStyle, marginBottom: 6, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <button onClick={() => copyChannel(c.channel)} style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, background: (CAT_COLOR[c.use_category] || '#4b7a9a') + '20', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', gap: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: CAT_COLOR[c.use_category] || '#4b7a9a', fontFamily: 'JetBrains Mono,monospace', lineHeight: 1 }}>{c.channel}</span>
                  {copied === c.channel
                    ? <Check size={9} color="#22c07a" />
                    : <Copy size={9} color="#4b7a9a" />
                  }
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#e2eaf4' }}>{c.name}</span>
                    <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: (CAT_COLOR[c.use_category] || '#4b7a9a') + '20', color: CAT_COLOR[c.use_category] || '#4b7a9a', fontWeight: 700, textTransform: 'uppercase' }}>{c.use_category.replace(/_/g, ' ')}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#8fa8c0', lineHeight: 1.45, marginBottom: 3 }}>{c.description}</div>
                  <div style={{ fontSize: 10, color: '#4b7a9a' }}>{c.frequency_rx} MHz{c.notes ? ` · ${c.notes}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: '#4b7a9a' }}>No channels found</div>}
      </div>
    </div>
  )
}

// ─── TAB 6: TIDES & WEATHER ──────────────────────────────────────────────────
function TidesTab({ tides }: { tides: { station: string; predictions: TidePrediction[] } }) {
  const now = new Date()

  const chartData = tides.predictions.map(p => ({
    time: new Date(p.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
    height: p.height_ft,
    type: p.type,
  }))

  const nowStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })

  const today = tides.predictions.filter(p => {
    const d = new Date(p.time)
    return d.toDateString() === now.toDateString()
  })

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '12px 12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#e2eaf4' }}>Tides &amp; Weather</div>
          {tides.station && <div style={{ fontSize: 11, color: '#4b7a9a', marginTop: 1 }}>Station: {tides.station}</div>}
        </div>
        <a href="https://tidesandcurrents.noaa.gov/map/index.html?type=TidePredictions&region=Washington" target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: TEAL, textDecoration: 'none' }}>
          NOAA <ExternalLink size={11} />
        </a>
      </div>

      {/* Tide chart */}
      {chartData.length > 0 ? (
        <div style={{ ...cardStyle, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4b7a9a', marginBottom: 10, letterSpacing: '0.06em' }}>TIDE PREDICTIONS</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#4b7a9a' }} interval={Math.floor(chartData.length / 4)} />
              <YAxis tick={{ fontSize: 9, fill: '#4b7a9a' }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#8fa8c0' }}
                itemStyle={{ color: TEAL }}
              />
              <ReferenceLine x={nowStr} stroke="rgba(245,158,11,0.5)" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="height" stroke={TEAL} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ ...cardStyle, marginBottom: 14, textAlign: 'center', padding: 32 }}>
          <Waves size={28} color={TEAL} style={{ opacity: 0.3, marginBottom: 10 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2eaf4', marginBottom: 6 }}>No Tide Data Available</div>
          <div style={{ fontSize: 12, color: '#4b7a9a', marginBottom: 12 }}>Connect your marina or query NOAA to see live tide predictions.</div>
          <a href="https://tidesandcurrents.noaa.gov/map/index.html?type=TidePredictions&region=Washington" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: TEAL_DIM2, border: `1px solid ${BORDER}`, color: TEAL, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
            <ExternalLink size={12} /> NOAA Tides &amp; Currents
          </a>
        </div>
      )}

      {/* Today's tides list */}
      {today.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4b7a9a', letterSpacing: '0.08em', marginBottom: 8 }}>TODAY'S TIDES</div>
          {today.map((p, i) => {
            const isPast = new Date(p.time) < now
            return (
              <div key={i} style={{ ...cardStyle, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12, opacity: isPast ? 0.55 : 1 }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, background: p.type === 'H' ? 'rgba(45,212,191,0.15)' : 'rgba(245,158,11,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: p.type === 'H' ? TEAL : '#f59e0b', lineHeight: 1 }}>{p.type === 'H' ? 'HI' : 'LO'}</span>
                  <Waves size={9} color={p.type === 'H' ? TEAL : '#f59e0b'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e2eaf4', fontFamily: 'JetBrains Mono,monospace' }}>{p.height_ft} ft</div>
                  <div style={{ fontSize: 11, color: '#4b7a9a' }}>{hour12(new Date(p.time))}{isPast ? ' · past' : ''}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Weather placeholder */}
      <div style={{ ...cardStyle, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#4b7a9a', letterSpacing: '0.06em', marginBottom: 8 }}>MARINE WEATHER</div>
        <div style={{ fontSize: 12, color: '#4b7a9a', marginBottom: 10 }}>Real-time weather from your marina — coming soon.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: 'NOAA Puget Sound Forecast', url: 'https://www.weather.gov/mtr/' },
            { label: 'NOAA Marine Forecast (Zone)', url: 'https://marine.weather.gov/MapClick.php?CityName=Seattle&state=WA&site=SEW&textField1=47.6062&textField2=-122.3321' },
            { label: 'Windy — Marine Layer',        url: 'https://www.windy.com/?47.600,-122.330,9,i:pressure' },
          ].map(link => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, background: '#071020', border: `1px solid ${BORDER}`, textDecoration: 'none', color: '#8fa8c0', fontSize: 12 }}>
              <span>{link.label}</span>
              <ExternalLink size={11} color="#4b7a9a" />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── TAB 7: ROUTES & WAYPOINTS ───────────────────────────────────────────────
function RoutesTab({ routes, waypoints, onRefresh }: {
  routes: UserRoute[]
  waypoints: UserWaypoint[]
  onRefresh: () => void
}) {
  const [sub, setSub]           = useState<'routes' | 'waypoints'>('waypoints')
  const [showAddWp, setShowAddWp] = useState(false)
  const [showAddRt, setShowAddRt] = useState(false)
  const [savingWp, setSavingWp]   = useState(false)
  const [savingRt, setSavingRt]   = useState(false)
  const [wpForm, setWpForm] = useState({ name: '', lat: '', lng: '', waypoint_type: 'custom', notes: '' })
  const [rtForm, setRtForm] = useState({ name: '', description: '' })

  const WP_TYPES = ['custom', 'anchorage', 'fishing_spot', 'hazard', 'fuel', 'marina']
  const WP_ABBR: Record<string, string> = { custom: 'WPT', anchorage: 'ANC', fishing_spot: 'FISH', hazard: 'HAZ', fuel: 'FUEL', marina: 'DOCK' }

  const saveWaypoint = async () => {
    if (!wpForm.name || !wpForm.lat || !wpForm.lng) return
    setSavingWp(true)
    try {
      const r = await fetch('/api/pnw-navigator/waypoints', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(wpForm),
      })
      if (r.ok) { setShowAddWp(false); setWpForm({ name: '', lat: '', lng: '', waypoint_type: 'custom', notes: '' }); onRefresh() }
    } finally { setSavingWp(false) }
  }

  const saveRoute = async () => {
    if (!rtForm.name) return
    setSavingRt(true)
    try {
      const r = await fetch('/api/pnw-navigator/routes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(rtForm),
      })
      if (r.ok) { setShowAddRt(false); setRtForm({ name: '', description: '' }); onRefresh() }
    } finally { setSavingRt(false) }
  }

  const delWaypoint = async (id: string) => {
    await fetch(`/api/pnw-navigator/waypoints?id=${id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, display: 'flex', background: '#071020', borderBottom: `1px solid ${BORDER}` }}>
        {(['waypoints', 'routes'] as const).map(t => (
          <button key={t} onClick={() => setSub(t)} style={{
            flex: 1, padding: '10px 6px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.03em',
            borderBottom: sub === t ? `2px solid ${TEAL}` : '2px solid transparent',
            color: sub === t ? TEAL : '#4b7a9a',
          }}>
            {t === 'waypoints' ? `Waypoints (${waypoints.length})` : `Routes (${routes.length})`}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {sub === 'waypoints' && (
          <>
            <button onClick={() => setShowAddWp(v => !v)} style={{ ...primaryBtn, width: '100%', marginBottom: 12 }}>
              <Plus size={14} /> Add Waypoint
            </button>
            {showAddWp && (
              <div style={{ ...cardStyle, marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelStyle}>Name *</label>
                    <input value={wpForm.name} onChange={e => setWpForm(p => ({ ...p, name: e.target.value }))} placeholder="My Secret Spot" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Latitude *</label>
                    <input value={wpForm.lat} onChange={e => setWpForm(p => ({ ...p, lat: e.target.value }))} placeholder="47.6234" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Longitude *</label>
                    <input value={wpForm.lng} onChange={e => setWpForm(p => ({ ...p, lng: e.target.value }))} placeholder="-122.4567" style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelStyle}>Type</label>
                    <select value={wpForm.waypoint_type} onChange={e => setWpForm(p => ({ ...p, waypoint_type: e.target.value }))} style={{ ...inputStyle }}>
                      {WP_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelStyle}>Notes</label>
                    <input value={wpForm.notes} onChange={e => setWpForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes…" style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={saveWaypoint} disabled={savingWp || !wpForm.name || !wpForm.lat || !wpForm.lng} style={{ ...primaryBtn, flex: 1 }}>{savingWp ? 'Saving…' : 'Save Waypoint'}</button>
                  <button onClick={() => setShowAddWp(false)} style={ghostBtn}>Cancel</button>
                </div>
              </div>
            )}
            {waypoints.length === 0 && !showAddWp && (
              <div style={{ textAlign: 'center', padding: 48, color: '#4b7a9a' }}>
                <MapPin size={32} style={{ opacity: 0.2, marginBottom: 10 }} />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No waypoints yet</div>
                <div style={{ fontSize: 12 }}>Save fishing spots, anchorages, and hazards from your chart plotter.</div>
              </div>
            )}
            {waypoints.map(w => (
              <div key={w.id} style={{ ...cardStyle, marginBottom: 6, display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: TEAL_DIM2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: TEAL, letterSpacing: '0.03em' }}>{WP_ABBR[w.waypoint_type] || 'WPT'}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e2eaf4' }}>{w.name}</div>
                  <div style={{ fontSize: 11, color: '#4b7a9a' }}>
                    {w.waypoint_type.replace('_', ' ')} · {parseFloat(String(w.lat)).toFixed(4)}°N {Math.abs(parseFloat(String(w.lng))).toFixed(4)}°W
                  </div>
                  {w.notes && <div style={{ fontSize: 11, color: '#8fa8c0', marginTop: 2 }}>{w.notes}</div>}
                </div>
                <a href={`https://www.google.com/maps?q=${w.lat},${w.lng}`} target="_blank" rel="noopener noreferrer" style={{ color: '#4b7a9a', display: 'flex', padding: 4 }}><ExternalLink size={12} /></a>
                <button onClick={() => delWaypoint(w.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b7a9a', padding: 4 }}><Trash2 size={13} /></button>
              </div>
            ))}
          </>
        )}

        {sub === 'routes' && (
          <>
            <button onClick={() => setShowAddRt(v => !v)} style={{ ...primaryBtn, width: '100%', marginBottom: 12 }}>
              <Plus size={14} /> Add Route
            </button>
            {showAddRt && (
              <div style={{ ...cardStyle, marginBottom: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <label style={labelStyle}>Route Name *</label>
                  <input value={rtForm.name} onChange={e => setRtForm(p => ({ ...p, name: e.target.value }))} placeholder="Hood Canal Run" style={inputStyle} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={labelStyle}>Description</label>
                  <textarea value={rtForm.description} onChange={e => setRtForm(p => ({ ...p, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Route notes, waypoints, total distance…" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveRoute} disabled={savingRt || !rtForm.name} style={{ ...primaryBtn, flex: 1 }}>{savingRt ? 'Saving…' : 'Save Route'}</button>
                  <button onClick={() => setShowAddRt(false)} style={ghostBtn}>Cancel</button>
                </div>
              </div>
            )}
            {routes.length === 0 && !showAddRt && (
              <div style={{ textAlign: 'center', padding: 48, color: '#4b7a9a' }}>
                <Navigation size={32} style={{ opacity: 0.2, marginBottom: 10 }} />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No routes yet</div>
                <div style={{ fontSize: 12 }}>Plan and save your favorite cruising routes and fishing runs.</div>
              </div>
            )}
            {routes.map(r => (
              <div key={r.id} style={{ ...cardStyle, marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: TEAL_DIM2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Navigation size={15} color={TEAL} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2eaf4' }}>{r.name}</div>
                    {r.description && <div style={{ fontSize: 11, color: '#8fa8c0', marginTop: 2 }}>{r.description}</div>}
                    <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 10, color: '#4b7a9a' }}>
                      {r.total_distance_nm > 0 && <span>{r.total_distance_nm} nm</span>}
                      {r.estimated_time_hours > 0 && <span>· {r.estimated_time_hours}h</span>}
                      {r.fuel_estimate_gallons > 0 && <span>· {r.fuel_estimate_gallons} gal</span>}
                      {Array.isArray(r.waypoints) && r.waypoints.length > 0 && <span>· {r.waypoints.length} waypoints</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ─── MARINAS TAB ──────────────────────────────────────────────────────────────
function MarinasTab({ marinas }: { marinas: Marina[] }) {
  const [fuelOnly,      setFuelOnly]      = useState(false)
  const [launchOnly,    setLaunchOnly]    = useState(false)
  const [transientOnly, setTransientOnly] = useState(false)
  const [selected,      setSelected]      = useState<Marina | null>(null)

  const filtered = marinas.filter(m =>
    (!fuelOnly || m.has_fuel_dock) &&
    (!launchOnly || m.has_launch_ramp) &&
    (!transientOnly || m.has_transient_moorage)
  )

  const AMENITY_ICONS: { key: keyof Marina; label: string; color: string }[] = [
    { key: 'has_fuel_dock',        label: 'Fuel',      color: '#f59e0b' },
    { key: 'has_launch_ramp',      label: 'Launch',    color: '#22c07a' },
    { key: 'has_transient_moorage',label: 'Transient', color: TEAL },
    { key: 'has_pump_out',         label: 'Pump-Out',  color: '#22d3ee' },
    { key: 'has_showers',          label: 'Showers',   color: '#8fa8c0' },
    { key: 'has_wifi',             label: 'WiFi',      color: '#8fa8c0' },
    { key: 'has_repair_yard',      label: 'Repair',    color: '#8b5cf6' },
  ]

  if (selected) {
    return (
      <div style={{ height: '100%', overflowY: 'auto' }}>
        <div style={{ padding: '10px 14px', background: '#071020', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, zIndex: 5 }}>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: TEAL, cursor: 'pointer', fontSize: 13 }}>← Marinas</button>
          <span style={{ color: '#4b7a9a' }}>·</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e2eaf4' }}>{selected.name}</span>
        </div>
        <div style={{ padding: '14px' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <Anchor size={13} color={selected.usa_wrapco_authorized ? '#22c07a' : TEAL} />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#e2eaf4' }}>{selected.name}</span>
            {selected.usa_wrapco_authorized && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(34,192,122,0.15)', color: '#22c07a', fontWeight: 700 }}>USA WRAP CO</span>}
          </div>
          <div style={{ fontSize: 12, color: '#4b7a9a', marginBottom: 10 }}>
            {selected.city} · VHF {selected.vhf_channel}
            {selected.transient_rate_per_ft_per_night ? ` · $${selected.transient_rate_per_ft_per_night}/ft/night` : ''}
          </div>
          {selected.description && <p style={{ fontSize: 13, color: '#8fa8c0', lineHeight: 1.6, marginBottom: 14 }}>{selected.description}</p>}
          {selected.usa_wrapco_authorized && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(34,192,122,0.07)', border: '1px solid rgba(34,192,122,0.2)', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#22c07a', marginBottom: 2 }}>USA Wrap Co — Authorized Service Location</div>
              <div style={{ fontSize: 11, color: '#8fa8c0' }}>Hull wraps · DekWave non-slip decking · Marine vinyl graphics</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
            {AMENITY_ICONS.filter(a => selected[a.key]).map(a => (
              <span key={a.label} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 10, background: a.color + '20', color: a.color, fontWeight: 600 }}>{a.label}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {selected.phone && <a href={`tel:${selected.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: TEAL, textDecoration: 'none' }}><Phone size={12} /> Call</a>}
            <a href={`https://www.google.com/maps/search/${encodeURIComponent(selected.name + ' ' + selected.city)}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: TEAL, textDecoration: 'none' }}><MapPin size={12} /> Directions</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, padding: '8px 12px', background: '#071020', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { label: 'Fuel Dock',    active: fuelOnly,      set: setFuelOnly },
          { label: 'Launch Ramp',  active: launchOnly,    set: setLaunchOnly },
          { label: 'Transient',    active: transientOnly, set: setTransientOnly },
        ].map(f => (
          <button key={f.label} onClick={() => f.set(v => !v)} style={{
            padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
            background: f.active ? TEAL : CARD, color: f.active ? '#071020' : '#8fa8c0',
          }}>{f.label}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#4b7a9a' }}>{filtered.length} marinas</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#4b7a9a' }}>
            <Anchor size={32} style={{ opacity: 0.2, marginBottom: 10 }} />
            <div>No marinas added yet.</div>
          </div>
        )}
        {filtered.map(m => (
          <div key={m.id} onClick={() => setSelected(m)} style={{ ...cardStyle, marginBottom: 8, cursor: 'pointer', transition: 'border-color 0.15s', border: m.usa_wrapco_authorized ? '1px solid rgba(34,192,122,0.25)' : `1px solid ${BORDER}` }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(45,212,191,0.35)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = m.usa_wrapco_authorized ? 'rgba(34,192,122,0.25)' : BORDER)}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
              <Anchor size={13} color={m.usa_wrapco_authorized ? '#22c07a' : TEAL} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#e2eaf4' }}>{m.name}</span>
                  {m.usa_wrapco_authorized && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(34,192,122,0.15)', color: '#22c07a', fontWeight: 700 }}>USA WRAP CO</span>}
                </div>
                <div style={{ fontSize: 11, color: '#4b7a9a', marginTop: 1 }}>
                  {m.city} · VHF {m.vhf_channel}{m.phone ? ` · ${m.phone}` : ''}
                  {m.transient_rate_per_ft_per_night ? ` · $${m.transient_rate_per_ft_per_night}/ft/night` : ''}
                </div>
              </div>
              <ArrowRight size={13} color="#4b7a9a" style={{ flexShrink: 0 }} />
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {AMENITY_ICONS.filter(a => m[a.key]).map(a => (
                <span key={a.label} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: a.color + '18', color: a.color, fontWeight: 600 }}>{a.label}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
