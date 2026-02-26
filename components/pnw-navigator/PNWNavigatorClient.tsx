'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback } from 'react'
import {
  Map, Fish, Anchor, BookOpen, User, ChevronDown, ChevronUp,
  Fuel, Waves, Wifi, Zap, ShowerHead, Wind, AlertTriangle,
  Navigation, Phone, Radio, Plus, Trash2, ArrowRight, ExternalLink, MapPin,
  Star, Clock, Thermometer, Eye, FileText, X,
} from 'lucide-react'
import type { Profile } from '@/types'

// Dynamic import — Leaflet does not support SSR
const PNWMap = dynamic(() => import('./PNWMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
        <Navigation size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
        <div style={{ fontSize: 13 }}>Loading chart…</div>
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
  best_season: string[]; preferred_depth_ft_min: number; preferred_depth_ft_max: number
  trophy_weight_lbs: number; state_record_weight_lbs: number
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
interface TidePrediction { time: string; type: 'H' | 'L'; height_ft: number }
interface CatchEntry {
  id: string; species_name: string; weight_lbs: number; length_inches: number
  catch_date: string; location_name: string; technique: string; was_released: boolean
}
interface FishingReport {
  id: string; report_date: string; success_level: number; species_targeted: string
  technique_used: string[]; notes: string; tide_stage: string; weather: string
  water_clarity: string; depth_fished_ft: number
  species_caught: Array<{ species_id?: string; species_name?: string; count: number; biggest_lbs?: number; released?: boolean }>
  bait_lure: Array<{ name: string; worked: boolean }>
  spot: { name: string; region: string } | null
  custom_location_name: string | null
}
interface Waypoint {
  id: string; name: string; lat: number; lng: number
  waypoint_type: string; notes: string; created_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'map',     label: 'Map',      icon: Map },
  { id: 'fish',    label: 'Fish',     icon: Fish },
  { id: 'marinas', label: 'Marinas',  icon: Anchor },
  { id: 'mystuff', label: 'My Stuff', icon: User },
  { id: 'regs',    label: 'Regs',     icon: BookOpen },
]

const REGIONS: Record<string, string> = {
  puget_sound_north:      'North Puget Sound',
  puget_sound_central:    'Central Puget Sound',
  puget_sound_south:      'South Sound',
  san_juan_islands:       'San Juan Islands',
  strait_of_juan_de_fuca: 'Strait of JdF',
  hood_canal:             'Hood Canal',
  lake_washington:        'Lake Washington',
  snohomish_river:        'Snohomish / River',
  pacific_coast:          'Pacific Coast',
  freshwater:             'Freshwater',
}

const DIFF_COLOR: Record<string, string> = {
  beginner: 'var(--green)', intermediate: 'var(--amber)', expert: 'var(--red)',
}

const VHF_CHANNELS = [
  { ch: '16',  name: 'International Distress & Calling', cat: 'CRITICAL', color: 'var(--red)',    desc: 'ALWAYS monitor while underway. Distress calls, Coast Guard contact. Switch to working channel after hailing.' },
  { ch: '9',   name: 'Boater Calling (US)',              cat: 'CALLING',  color: 'var(--amber)',  desc: 'Recreational boater hailing channel. Call on 9, switch to working channel to chat.' },
  { ch: '22A', name: 'Coast Guard Liaison',              cat: 'USCG',     color: 'var(--accent)', desc: 'After contacting USCG on 16, switch here. US only — 157.100 MHz.' },
  { ch: '68',  name: 'Non-Commercial Working',           cat: 'WORKING',  color: 'var(--green)',  desc: 'Most popular recreational working channel in Puget Sound.' },
  { ch: '69',  name: 'Non-Commercial Working',           cat: 'WORKING',  color: 'var(--green)',  desc: 'Recreational working channel. Common in north Sound.' },
  { ch: '72',  name: 'Non-Commercial Working',           cat: 'WORKING',  color: 'var(--green)',  desc: 'Ship-to-ship only in USA. Popular offshore.' },
  { ch: 'WX1', name: 'NOAA Weather Primary',             cat: 'WEATHER',  color: 'var(--cyan)',   desc: 'Continuous NOAA weather forecasts. Seattle / NW WA. 162.400 MHz.' },
  { ch: 'WX2', name: 'NOAA Weather Alternate',           cat: 'WEATHER',  color: 'var(--cyan)',   desc: 'Alternate weather broadcast. 162.425 MHz.' },
  { ch: '13',  name: 'Bridge-to-Bridge Navigation',      cat: 'NAV',      color: 'var(--purple)', desc: 'Ships, bridges, vessel traffic. Monitor in shipping lanes.' },
  { ch: '14',  name: 'Seattle Vessel Traffic',           cat: 'VTS',      color: 'var(--purple)', desc: 'Seattle VTS. Monitor in main Sound channels.' },
  { ch: '6',   name: 'Safety / SAR Operations',          cat: 'SAFETY',   color: 'var(--amber)',  desc: 'Search and rescue coordination with USCG.' },
]

const REGS = [
  { id: 'pfd',    icon: '🦺', title: 'Life Jackets (PFDs)',                   critical: true,  penalty: 'Up to $500',             items: ['One USCG-approved PFD for every person aboard','Children under 13 MUST wear PFD while underway on vessels under 26ft','Must be readily accessible — not buried in a locker','Vessels 16ft+ must carry one Type IV throwable device'] },
  { id: 'orca',   icon: '🐋', title: 'Orca Be Whale Wise — Federal Law',       critical: true,  penalty: 'Up to $11,000',           items: ['Stay 300+ yards from Southern Resident Killer Whales (SRKWs)','Stay 400+ yards from resting or feeding SRKWs','Do NOT position vessel in whale travel path','Put engine in neutral if whales approach stopped vessel','Monitor VHF 16 for exclusion zone announcements','No drones within 300 yards without federal permit'] },
  { id: 'bui',    icon: '🍺', title: 'Boating Under the Influence (BUI)',       critical: true,  penalty: 'Up to $5,000 + jail',     items: ['BAC limit 0.08% — same as driving','First offense: gross misdemeanor, up to $5,000 fine, 364 days jail','1-year suspension of boating privileges','Prior DUI convictions enhance penalties'] },
  { id: 'reg',    icon: '📋', title: 'WA Vessel Registration',                  critical: false, penalty: '$120 minimum',            items: ['All motorized vessels in WA must be registered','Numbers 3" high on both sides of bow — block style','Current decal on starboard (right) side','Non-motorized boats under 16ft exempt'] },
  { id: 'fire',   icon: '🔥', title: 'Fire Extinguishers',                      critical: false, penalty: 'Up to $500',             items: ['Required if vessel has enclosed engine compartment, living space, or PFD storage','Under 26ft: minimum one B-1 USCG approved extinguisher','26-40ft: two B-1 or one B-2','Must be charged and immediately accessible'] },
  { id: 'lights', icon: '💡', title: 'Navigation Lights',                       critical: false, penalty: 'Up to $500',             items: ['Required sunset to sunrise AND in restricted visibility','Port (left): red · Starboard (right): green · Stern: white','Powerboats add white masthead (forward) light','Anchored vessels display white all-round anchor light'] },
  { id: 'sewage', icon: '🚰', title: 'No Discharge of Sewage',                  critical: false, penalty: 'Up to $25,000',          items: ['Puget Sound is a No-Discharge Zone — even treated sewage prohibited','Must use pump-out stations','Oil/fuel sheen also prohibited — use bilge pads','Report spills: 1-800-424-8802'] },
  { id: 'speed',  icon: '⚡', title: 'Speed & Wake Rules',                      critical: false, penalty: 'Traffic infraction',      items: ['No Wake = 5 mph or slower (minimal wake)','All of Gig Harbor channel is No Wake zone','Within 200ft of divers down flag: No Wake','Your wake = your liability for damage'] },
  { id: 'canada', icon: '🍁', title: 'Entering Canada by Vessel',               critical: false, penalty: 'Up to $25,000 CDN',      items: ['Must report to CBSA immediately upon entering Canadian waters','Call CBSA: 1-888-226-7277 (or use NEXUS)','Must land at designated port of entry FIRST','Declare all weapons, alcohol, and goods'] },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getBiteStatus(predictions: TidePrediction[]) {
  if (!predictions.length) return { label: '—', color: 'var(--text3)', detail: '' }
  const now = Date.now()
  let minDiff = Infinity
  for (const p of predictions) {
    const diff = Math.abs(new Date(p.time).getTime() - now) / 60000
    if (diff < minDiff) minDiff = diff
  }
  const nextFuture = predictions.find(p => new Date(p.time).getTime() > now)
  const nextMin = nextFuture ? Math.round((new Date(nextFuture.time).getTime() - now) / 60000) : null
  if (minDiff <= 45) return { label: 'ACTIVE BITE', color: 'var(--green)', detail: 'Peak feeding window now' }
  if (minDiff <= 90) return { label: 'GOOD BITE',   color: 'var(--amber)', detail: nextMin != null ? `Window: ${nextMin}min` : '' }
  return { label: 'SLOW',         color: 'var(--text3)', detail: nextMin != null ? `Next window: ${nextMin}min` : '' }
}

function successStars(n: number) {
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PNWNavigatorClient({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState('map')
  const [spots, setSpots] = useState<FishingSpot[]>([])
  const [species, setSpecies] = useState<FishSpecies[]>([])
  const [marinas, setMarinas] = useState<Marina[]>([])
  const [tides, setTides] = useState<{ station: string; predictions: TidePrediction[] }>({ station: 'Seattle', predictions: [] })
  const [catches, setCatches] = useState<CatchEntry[]>([])
  const [reports, setReports] = useState<FishingReport[]>([])
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])

  useEffect(() => {
    fetch('/api/pnw-navigator/spots').then(r => r.json()).then(d => setSpots(d.spots || [])).catch(() => {})
    fetch('/api/pnw-navigator/species').then(r => r.json()).then(d => setSpecies(d.species || [])).catch(() => {})
    fetch('/api/pnw-navigator/marinas').then(r => r.json()).then(d => setMarinas(d.marinas || [])).catch(() => {})
    fetch('/api/pnw-navigator/tides?station=seattle').then(r => r.json()).then(d => setTides({ station: d.station || 'Seattle', predictions: d.predictions || [] })).catch(() => {})
    fetch('/api/pnw-navigator/catch-log').then(r => r.json()).then(d => setCatches(d.catches || [])).catch(() => {})
    fetch('/api/pnw-navigator/reports').then(r => r.json()).then(d => setReports(d.reports || [])).catch(() => {})
    fetch('/api/pnw-navigator/waypoints').then(r => r.json()).then(d => setWaypoints(d.waypoints || [])).catch(() => {})
  }, [])

  const refreshCatches     = useCallback(() => fetch('/api/pnw-navigator/catch-log').then(r => r.json()).then(d => setCatches(d.catches || [])).catch(() => {}), [])
  const refreshReports     = useCallback(() => fetch('/api/pnw-navigator/reports').then(r => r.json()).then(d => setReports(d.reports || [])).catch(() => {}), [])
  const refreshWaypoints   = useCallback(() => fetch('/api/pnw-navigator/waypoints').then(r => r.json()).then(d => setWaypoints(d.waypoints || [])).catch(() => {}), [])

  const now = new Date()
  const nextTide = tides.predictions.find(p => new Date(p.time) > now)
  const biteStatus = getBiteStatus(tides.predictions)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text1)' }}>

      {/* ── App Header ─────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#1e40af,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Navigation size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'Barlow Condensed,sans-serif', letterSpacing: '0.06em' }}>PNW NAVIGATOR</div>
              <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '0.08em' }}>PUGET SOUND · SAN JUANS · PACIFIC COAST</div>
            </div>
          </div>
          {/* Tide + Bite chips */}
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--surface2)', borderRadius: 8, padding: '5px 9px', fontSize: 10 }}>
              <Waves size={11} color="var(--cyan)" />
              {nextTide ? (
                <span>
                  <span style={{ fontWeight: 700, color: nextTide.type === 'H' ? 'var(--cyan)' : 'var(--amber)' }}>
                    {nextTide.type === 'H' ? 'HI' : 'LO'}
                  </span>
                  <span style={{ color: 'var(--text3)', marginLeft: 3 }}>
                    {new Date(nextTide.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </span>
              ) : <span style={{ color: 'var(--text3)' }}>tides…</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface2)', borderRadius: 8, padding: '5px 9px', fontSize: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: biteStatus.color }} />
              <span style={{ fontWeight: 700, color: biteStatus.color }}>{biteStatus.label}</span>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', padding: '0 4px', marginTop: 6 }}>
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '7px 4px', border: 'none', background: 'none', cursor: 'pointer',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--accent)' : 'var(--text3)', transition: 'color 0.15s',
              }}>
                <Icon size={16} />
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }}>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'map'     && <MapTab spots={spots} marinas={marinas} biteStatus={biteStatus} tides={tides} />}
        {tab === 'fish'    && <FishTab species={species} spots={spots} reports={reports} onRefreshReports={refreshReports} profile={profile} />}
        {tab === 'marinas' && <MarinasTab marinas={marinas} />}
        {tab === 'mystuff' && <MyStuffTab catches={catches} waypoints={waypoints} profile={profile} onRefresh={refreshCatches} onRefreshWaypoints={refreshWaypoints} />}
        {tab === 'regs'    && <RegsTab />}
      </div>
    </div>
  )
}

// ─── MAP TAB ──────────────────────────────────────────────────────────────────
function MapTab({ spots, marinas, biteStatus, tides }: {
  spots: FishingSpot[]
  marinas: Marina[]
  biteStatus: { label: string; color: string; detail: string }
  tides: { station: string; predictions: TidePrediction[] }
}) {
  const [showSpots,   setShowSpots]   = useState(true)
  const [showMarinas, setShowMarinas] = useState(true)
  const [region,      setRegion]      = useState('all')
  const [selectedSpot,   setSelectedSpot]   = useState<FishingSpot | null>(null)
  const [selectedMarina, setSelectedMarina] = useState<Marina | null>(null)

  const filteredSpots   = spots.filter(s => showSpots   && (region === 'all' || s.region === region))
  const filteredMarinas = marinas.filter(() => showMarinas)

  const handleSpotClick   = useCallback((s: FishingSpot) => { setSelectedSpot(s); setSelectedMarina(null) }, [])
  const handleMarinaClick = useCallback((m: Marina) => { setSelectedMarina(m); setSelectedSpot(null) }, [])

  const btnStyle = (active: boolean, ac: string, ac2: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
    background: active ? `rgba(${ac2},0.12)` : 'var(--surface2)',
    color:      active ? `rgb(${ac2})`       : 'var(--text3)',
    outline: active ? `1px solid rgba(${ac2},0.3)` : '1px solid rgba(255,255,255,0.07)',
  })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Filter / conditions bar */}
      <div style={{ flexShrink: 0, padding: '7px 12px', background: 'var(--surface)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Solunar bite indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: 'var(--surface2)', fontSize: 11 }}>
          <Fish size={11} color={biteStatus.color} />
          <span style={{ fontWeight: 700, color: biteStatus.color }}>{biteStatus.label}</span>
          {biteStatus.detail && <span style={{ color: 'var(--text3)' }}>· {biteStatus.detail}</span>}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setShowSpots(v => !v)} style={btnStyle(showSpots, 'accent', '79,127,255')}>
            <Fish size={11} /> Spots ({filteredSpots.length})
          </button>
          <button onClick={() => setShowMarinas(v => !v)} style={btnStyle(showMarinas, 'amber', '245,158,11')}>
            <Anchor size={11} /> Marinas ({filteredMarinas.length})
          </button>
          <select value={region} onChange={e => setRegion(e.target.value)} style={{
            background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8,
            padding: '4px 8px', color: 'var(--text2)', fontSize: 11,
          }}>
            <option value="all">All Regions</option>
            {Object.entries(REGIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Map + slide panel */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <PNWMap
          spots={filteredSpots}
          marinas={filteredMarinas}
          onSpotClick={handleSpotClick}
          onMarinaClick={handleMarinaClick}
        />

        {/* Spot slide-up panel */}
        {selectedSpot && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1001,
            background: 'var(--surface)', borderTop: '2px solid rgba(79,127,255,0.35)',
            maxHeight: '55%', overflowY: 'auto',
          }}>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{selectedSpot.name}</span>
                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, background: DIFF_COLOR[selectedSpot.difficulty] + '25', color: DIFF_COLOR[selectedSpot.difficulty], fontWeight: 700, textTransform: 'uppercase' }}>{selectedSpot.difficulty}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {REGIONS[selectedSpot.region] || selectedSpot.region}
                    {selectedSpot.depth_range_ft && ` · ${selectedSpot.depth_range_ft}ft`}
                    {selectedSpot.best_tides && ` · ${selectedSpot.best_tides} tide`}
                  </div>
                </div>
                <button onClick={() => setSelectedSpot(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, lineHeight: 1 }}><X size={16} /></button>
              </div>
              {selectedSpot.description && <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55, margin: '0 0 10px' }}>{selectedSpot.description}</p>}
              {/* Species chips */}
              {Array.isArray(selectedSpot.species_present) && selectedSpot.species_present.length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                  {selectedSpot.species_present.slice(0, 6).map((sp: any, i: number) => (
                    <span key={i} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'rgba(79,127,255,0.1)', color: 'var(--accent)', fontWeight: 600 }}>
                      {'★'.repeat(Math.min(sp.rating || 3, 5))} {(sp.species_id || '').replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
              {/* Techniques */}
              {Array.isArray(selectedSpot.best_techniques) && selectedSpot.best_techniques.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>
                  <span style={{ color: 'var(--text3)' }}>Techniques: </span>
                  {selectedSpot.best_techniques.map((t: any) => typeof t === 'string' ? t : (t?.name ?? String(t))).join(', ')}
                </div>
              )}
              {selectedSpot.hazards && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <AlertTriangle size={12} color="var(--amber)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 11, color: 'var(--amber)' }}>{selectedSpot.hazards}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <a href={`https://www.google.com/maps?q=${selectedSpot.lat},${selectedSpot.lng}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
                  <MapPin size={11} /> Open in Maps
                </a>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {selectedSpot.lat.toFixed(4)}°N {Math.abs(selectedSpot.lng).toFixed(4)}°W
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Marina slide-up panel */}
        {selectedMarina && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1001,
            background: 'var(--surface)', borderTop: `2px solid ${selectedMarina.usa_wrapco_authorized ? 'rgba(34,192,122,0.4)' : 'rgba(245,158,11,0.3)'}`,
            maxHeight: '55%', overflowY: 'auto',
          }}>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Anchor size={13} color={selectedMarina.usa_wrapco_authorized ? 'var(--green)' : 'var(--amber)'} />
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{selectedMarina.name}</span>
                    {selectedMarina.usa_wrapco_authorized && (
                      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(34,192,122,0.15)', color: 'var(--green)', fontWeight: 700 }}>USA WRAP CO</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {selectedMarina.city} · VHF {selectedMarina.vhf_channel}
                    {selectedMarina.transient_rate_per_ft_per_night && ` · $${selectedMarina.transient_rate_per_ft_per_night}/ft/night`}
                  </div>
                </div>
                <button onClick={() => setSelectedMarina(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
              </div>
              {selectedMarina.description && <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, margin: '0 0 8px' }}>{selectedMarina.description}</p>}
              {selectedMarina.usa_wrapco_authorized && selectedMarina.wrap_company_nearby && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34,192,122,0.08)', border: '1px solid rgba(34,192,122,0.2)', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', marginBottom: 2 }}>USA Wrap Co — Authorized Here</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>Hull wraps · DekWave decking · Marine vinyl graphics</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 12 }}>
                {selectedMarina.phone && <a href={`tel:${selectedMarina.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}><Phone size={11} /> Call</a>}
                <a href={`https://www.google.com/maps/search/${encodeURIComponent(selectedMarina.name + ' ' + selectedMarina.city)}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}><MapPin size={11} /> Directions</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── FISH TAB ─────────────────────────────────────────────────────────────────
function FishTab({ species, spots, reports, onRefreshReports, profile }: {
  species: FishSpecies[]
  spots: FishingSpot[]
  reports: FishingReport[]
  onRefreshReports: () => void
  profile: Profile
}) {
  const [subTab, setSubTab] = useState<'species' | 'reports'>('species')
  const [cat, setCat] = useState('all')
  const [selected, setSelected] = useState<FishSpecies | null>(null)
  const [search, setSearch] = useState('')

  const CATS = [
    { id: 'all', label: 'All' }, { id: 'salmon', label: 'Salmon' },
    { id: 'bottomfish', label: 'Bottomfish' }, { id: 'shellfish', label: 'Shellfish' },
    { id: 'freshwater', label: 'Freshwater' },
  ]

  const filtered = species.filter(s =>
    (cat === 'all' || s.category === cat) &&
    (!search || s.common_name.toLowerCase().includes(search.toLowerCase()))
  )

  if (selected) return <SpeciesDetail species={selected} spots={spots} onBack={() => setSelected(null)} />

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        {(['species', 'reports'] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            flex: 1, padding: '10px 6px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.03em',
            borderBottom: subTab === t ? '2px solid var(--accent)' : '2px solid transparent',
            color: subTab === t ? 'var(--accent)' : 'var(--text3)',
          }}>
            {t === 'species' ? `Species (${species.length})` : `Reports (${reports.length})`}
          </button>
        ))}
      </div>

      {/* Species sub-tab */}
      {subTab === 'species' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '10px 12px', background: 'var(--surface)', borderBottom: '1px solid rgba(255,255,255,0.04)', position: 'sticky', top: 0, zIndex: 5 }}>
            <input type="text" placeholder="Search species…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 12px', color: 'var(--text1)', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {CATS.map(c => (
                <button key={c.id} onClick={() => setCat(c.id)} style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: cat === c.id ? 'var(--accent)' : 'var(--surface2)',
                  color: cat === c.id ? '#fff' : 'var(--text2)',
                }}>{c.label}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: '8px' }}>
            {filtered.map(s => (
              <div key={s.id} onClick={() => setSelected(s)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 4, background: 'var(--surface)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(79,127,255,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}>
                <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  background: s.category === 'salmon' ? 'rgba(242,90,90,0.12)' : s.category === 'bottomfish' ? 'rgba(139,92,246,0.12)' : s.category === 'shellfish' ? 'rgba(245,158,11,0.12)' : 'rgba(34,192,122,0.12)' }}>
                  {s.category === 'salmon' ? '🐟' : s.category === 'bottomfish' ? '🐠' : s.category === 'shellfish' ? '🦀' : '🎣'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{s.common_name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontStyle: 'italic' }}>{s.scientific_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>
                    {s.typical_size_lbs_min}–{s.typical_size_lbs_max} lbs
                    {s.state_record_weight_lbs ? ` · WA record: ${s.state_record_weight_lbs} lbs` : ''}
                  </div>
                </div>
                <ArrowRight size={14} color="var(--text3)" />
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No species found</div>}
          </div>
        </div>
      )}

      {/* Reports sub-tab */}
      {subTab === 'reports' && (
        <ReportsFeed reports={reports} spots={spots} profile={profile} onRefresh={onRefreshReports} />
      )}
    </div>
  )
}

// ─── REPORTS FEED ─────────────────────────────────────────────────────────────
function ReportsFeed({ reports, spots, profile, onRefresh }: {
  reports: FishingReport[]
  spots: FishingSpot[]
  profile: Profile
  onRefresh: () => void
}) {
  const [posting, setPosting] = useState(false)
  const [form, setForm] = useState({
    spot_id: '',
    custom_location_name: '',
    report_date: new Date().toISOString().split('T')[0],
    success_level: 3,
    species_targeted: '',
    technique_used: '',
    bait_name: '',
    tide_stage: '',
    water_clarity: '',
    depth_fished_ft: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const saveReport = async () => {
    setSaving(true)
    try {
      await fetch('/api/pnw-navigator/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          spot_id: form.spot_id || null,
          custom_location_name: form.custom_location_name || null,
          report_date: form.report_date,
          success_level: form.success_level,
          species_targeted: form.species_targeted,
          technique_used: form.technique_used ? [form.technique_used] : [],
          bait_lure: form.bait_name ? [{ name: form.bait_name, worked: true }] : [],
          tide_stage: form.tide_stage,
          water_clarity: form.water_clarity,
          depth_fished_ft: parseFloat(form.depth_fished_ft) || null,
          notes: form.notes,
          is_public: true,
        }),
      })
      setPosting(false)
      onRefresh()
    } finally { setSaving(false) }
  }

  const inp = (key: string): React.CSSProperties => ({
    width: '100%', background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 7, padding: '7px 10px', color: 'var(--text1)', fontSize: 12, boxSizing: 'border-box',
  })
  const lbl = (text: string) => (
    <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{text}</label>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '10px 12px', background: 'var(--surface)', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>Recent reports · Last 7 days</span>
        <button onClick={() => setPosting(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8,
          background: posting ? 'var(--surface2)' : 'rgba(34,192,122,0.12)', border: '1px solid rgba(34,192,122,0.25)',
          color: 'var(--green)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
        }}>
          <Plus size={12} /> Post Report
        </button>
      </div>

      {/* Post report form */}
      {posting && (
        <div style={{ padding: 12, background: 'var(--surface2)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: 'var(--text1)' }}>New Fishing Report</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ gridColumn: '1/-1' }}>
              {lbl('Fishing Spot')}
              <select value={form.spot_id} onChange={e => setForm(p => ({ ...p, spot_id: e.target.value }))} style={{ ...inp('spot_id') }}>
                <option value="">Select a spot or enter custom below…</option>
                {spots.map(s => <option key={s.id} value={s.id}>{s.name} — {REGIONS[s.region] || s.region}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              {lbl('Custom Location (if not in list)')}
              <input type="text" placeholder="e.g. North end of Quartermaster Harbor" value={form.custom_location_name} onChange={e => setForm(p => ({ ...p, custom_location_name: e.target.value }))} style={inp('custom_location_name')} />
            </div>
            <div>
              {lbl('Date')}
              <input type="date" value={form.report_date} onChange={e => setForm(p => ({ ...p, report_date: e.target.value }))} style={inp('report_date')} />
            </div>
            <div>
              {lbl('Success (1–5 stars)')}
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setForm(p => ({ ...p, success_level: n }))} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                    fontSize: 18, color: n <= form.success_level ? 'var(--amber)' : 'var(--text3)',
                  }}>★</button>
                ))}
              </div>
            </div>
            <div>
              {lbl('Target Species')}
              <input type="text" placeholder="Chinook Salmon" value={form.species_targeted} onChange={e => setForm(p => ({ ...p, species_targeted: e.target.value }))} style={inp('species_targeted')} />
            </div>
            <div>
              {lbl('Technique')}
              <input type="text" placeholder="Trolling at 80ft" value={form.technique_used} onChange={e => setForm(p => ({ ...p, technique_used: e.target.value }))} style={inp('technique_used')} />
            </div>
            <div>
              {lbl('Bait / Lure')}
              <input type="text" placeholder="Green flasher + Coyote spoon" value={form.bait_name} onChange={e => setForm(p => ({ ...p, bait_name: e.target.value }))} style={inp('bait_name')} />
            </div>
            <div>
              {lbl('Tide Stage')}
              <select value={form.tide_stage} onChange={e => setForm(p => ({ ...p, tide_stage: e.target.value }))} style={{ ...inp('tide_stage') }}>
                <option value="">—</option>
                <option value="high">High</option>
                <option value="incoming">Incoming</option>
                <option value="outgoing">Outgoing</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              {lbl('Water Clarity')}
              <select value={form.water_clarity} onChange={e => setForm(p => ({ ...p, water_clarity: e.target.value }))} style={{ ...inp('water_clarity') }}>
                <option value="">—</option>
                <option value="crystal">Crystal</option>
                <option value="clear">Clear</option>
                <option value="slight_stain">Slight stain</option>
                <option value="stained">Stained</option>
                <option value="dirty">Dirty</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              {lbl('Notes')}
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="What worked, time of day, conditions, tips for others…"
                rows={3} style={{ ...inp('notes'), resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={saveReport} disabled={saving} style={{
              flex: 1, padding: '9px 0', borderRadius: 8, background: 'var(--green)',
              color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            }}>{saving ? 'Saving…' : 'Post Report'}</button>
            <button onClick={() => setPosting(false)} style={{ padding: '9px 16px', borderRadius: 8, background: 'var(--surface)', color: 'var(--text2)', border: 'none', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Report cards */}
      <div style={{ padding: 8 }}>
        {reports.length === 0 && !posting && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            <Fish size={32} style={{ opacity: 0.2, marginBottom: 10 }} />
            <div>No reports in the last 7 days.</div>
            <div style={{ marginTop: 4, fontSize: 12 }}>Be the first — post a report after your trip!</div>
          </div>
        )}
        {reports.map(r => <ReportCard key={r.id} report={r} />)}
      </div>
    </div>
  )
}

function ReportCard({ report: r }: { report: FishingReport }) {
  const [open, setOpen] = useState(false)
  const locationName = r.spot?.name || r.custom_location_name || 'Unknown location'

  return (
    <div style={{ marginBottom: 6, background: 'var(--surface)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div onClick={() => setOpen(v => !v)} style={{ padding: '10px 12px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ color: 'var(--amber)', fontSize: 12 }}>{successStars(r.success_level || 0)}</span>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>{locationName}</span>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>{r.report_date}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text2)' }}>
          {r.species_targeted && <span>Target: {r.species_targeted}</span>}
          {r.technique_used?.length > 0 && <span>· {r.technique_used.join(', ')}</span>}
          {r.tide_stage && <span>· {r.tide_stage} tide</span>}
        </div>
        {r.notes && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.notes}</div>}
      </div>
      {open && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {r.notes && <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55, margin: '10px 0' }}>{r.notes}</p>}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--text3)' }}>
            {r.bait_lure?.length > 0 && <span><span style={{ color: 'var(--text2)' }}>Bait/Lure:</span> {r.bait_lure.map(b => b.name).join(', ')}</span>}
            {r.water_clarity && <span><span style={{ color: 'var(--text2)' }}>Clarity:</span> {r.water_clarity.replace('_', ' ')}</span>}
            {r.depth_fished_ft && <span><span style={{ color: 'var(--text2)' }}>Depth:</span> {r.depth_fished_ft}ft</span>}
          </div>
        </div>
      )}
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
      <div style={{ padding: '10px 14px', background: 'var(--surface)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, zIndex: 5 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13 }}>← Species</button>
        <span style={{ color: 'var(--text3)' }}>·</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{s.common_name}</span>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(79,127,255,0.08),rgba(8,145,178,0.08))', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid rgba(79,127,255,0.12)' }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Barlow Condensed,sans-serif', letterSpacing: '0.03em' }}>{s.common_name.toUpperCase()}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic', marginBottom: 8 }}>{s.scientific_name}</div>
          <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{s.description}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Typical Size',    value: `${s.typical_size_lbs_min}–${s.typical_size_lbs_max} lbs` },
            { label: 'WA State Record', value: s.state_record_weight_lbs ? `${s.state_record_weight_lbs} lbs` : 'N/A' },
            { label: 'Trophy Weight',   value: s.trophy_weight_lbs ? `${s.trophy_weight_lbs}+ lbs` : 'N/A' },
            { label: 'Best Depth',      value: s.preferred_depth_ft_min != null ? `${s.preferred_depth_ft_min}–${s.preferred_depth_ft_max}ft` : 'Varies' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{stat.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono,monospace' }}>{stat.value}</div>
            </div>
          ))}
        </div>
        {s.identification_notes && <InfoBlock title="Identification"><p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{s.identification_notes}</p></InfoBlock>}
        {s.habitat && <InfoBlock title="Habitat"><p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{s.habitat}</p></InfoBlock>}
        {s.best_season?.length > 0 && (
          <InfoBlock title="Best Seasons">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {s.best_season.map((season: string) => (
                <span key={season} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, background: 'rgba(34,192,122,0.12)', color: 'var(--green)', fontWeight: 600, textTransform: 'capitalize' }}>
                  {season.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </InfoBlock>
        )}
        {mySpots.length > 0 && (
          <InfoBlock title={`Top Spots for ${s.common_name} (${mySpots.length})`}>
            {mySpots.slice(0, 5).map(sp => {
              const rating = (Array.isArray(sp.species_present) ? sp.species_present : []).find((p: any) => p.species_id === s.id)?.rating || 0
              return (
                <div key={sp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <Fish size={12} color="var(--accent)" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{sp.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{REGIONS[sp.region] || sp.region}</span>
                  <span style={{ fontSize: 11, color: 'var(--amber)' }}>{'★'.repeat(rating)}</span>
                </div>
              )
            })}
          </InfoBlock>
        )}
        <a href="https://wdfw.wa.gov/fishing/regulations" target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', padding: 12, borderRadius: 10, background: 'rgba(34,192,122,0.08)', border: '1px solid rgba(34,192,122,0.18)', color: 'var(--green)', textDecoration: 'none', fontSize: 12, fontWeight: 600, marginTop: 8 }}>
          <BookOpen size={13} /> Check Current WDFW Regulations <ExternalLink size={11} />
        </a>
      </div>
    </div>
  )
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 6 }}>{title}</div>
      <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>{children}</div>
    </div>
  )
}

// ─── MARINAS TAB ──────────────────────────────────────────────────────────────
function MarinasTab({ marinas }: { marinas: Marina[] }) {
  const [fuel,      setFuel]      = useState(false)
  const [launch,    setLaunch]    = useState(false)
  const [transient, setTransient] = useState(false)
  const [selected,  setSelected]  = useState<Marina | null>(null)

  const filtered = marinas.filter(m => (!fuel || m.has_fuel_dock) && (!launch || m.has_launch_ramp) && (!transient || m.has_transient_moorage))

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '10px 12px', background: 'var(--surface)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6, flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 5 }}>
        {[
          { label: 'Fuel Dock', icon: Fuel,       state: fuel,      set: setFuel },
          { label: 'Launch Ramp', icon: Navigation, state: launch,   set: setLaunch },
          { label: 'Transient', icon: Anchor,      state: transient, set: setTransient },
        ].map(f => {
          const Icon = f.icon
          return <button key={f.label} onClick={() => f.set(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, background: f.state ? 'var(--accent)' : 'var(--surface2)', color: f.state ? '#fff' : 'var(--text2)' }}><Icon size={11} /> {f.label}</button>
        })}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)', alignSelf: 'center' }}>{filtered.length} marinas</span>
      </div>
      <div style={{ padding: '8px' }}>
        {filtered.map(m => <MarinaCard key={m.id} marina={m} selected={selected?.id === m.id} onClick={() => setSelected(prev => prev?.id === m.id ? null : m)} />)}
      </div>
    </div>
  )
}

function MarinaCard({ marina: m, selected, onClick }: { marina: Marina; selected: boolean; onClick: () => void }) {
  const amenities = [
    m.has_fuel_dock        && { icon: Fuel,       label: 'Fuel',      color: 'var(--amber)' },
    m.has_launch_ramp      && { icon: Navigation, label: 'Launch',    color: 'var(--green)' },
    m.has_transient_moorage && { icon: Anchor,    label: 'Transient', color: 'var(--accent)' },
    m.has_pump_out         && { icon: Wind,       label: 'Pump-Out',  color: 'var(--cyan)' },
    m.has_showers          && { icon: ShowerHead, label: 'Showers',   color: 'var(--text3)' },
    m.has_wifi             && { icon: Wifi,       label: 'WiFi',      color: 'var(--text3)' },
    m.has_repair_yard      && { icon: Zap,        label: 'Repair',    color: 'var(--purple)' },
  ].filter(Boolean) as any[]

  return (
    <div onClick={onClick} style={{ marginBottom: 6, background: selected ? 'rgba(79,127,255,0.05)' : 'var(--surface)', border: `1px solid ${selected ? 'rgba(79,127,255,0.25)' : m.usa_wrapco_authorized ? 'rgba(34,192,122,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, cursor: 'pointer', overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <Anchor size={12} color={m.usa_wrapco_authorized ? 'var(--green)' : 'var(--text3)'} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{m.name}</span>
          {m.usa_wrapco_authorized && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(34,192,122,0.12)', color: 'var(--green)', fontWeight: 700 }}>USA WRAP CO</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 7 }}>
          {m.city} · VHF {m.vhf_channel}{m.phone ? ` · ${m.phone}` : ''}
          {m.transient_rate_per_ft_per_night ? ` · $${m.transient_rate_per_ft_per_night}/ft/night` : ''}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {amenities.map((a: any) => { const Icon = a.icon; return <span key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: a.color }}><Icon size={10} /> {a.label}</span> })}
        </div>
      </div>
      {selected && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 12px', background: 'rgba(0,0,0,0.18)' }}>
          <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, margin: '0 0 8px' }}>{m.description}</p>
          {m.usa_wrapco_authorized && m.wrap_company_nearby && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34,192,122,0.07)', border: '1px solid rgba(34,192,122,0.18)', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', marginBottom: 2 }}>USA Wrap Co — Authorized Service Location</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Hull wraps · DekWave decking · Marine vinyl graphics</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            {m.phone && <a href={`tel:${m.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}><Phone size={11} /> Call</a>}
            <a href={`https://www.google.com/maps/search/${encodeURIComponent(m.name + ' ' + m.city)}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}><MapPin size={11} /> Directions</a>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MY STUFF TAB ─────────────────────────────────────────────────────────────
function MyStuffTab({ catches, waypoints, profile, onRefresh, onRefreshWaypoints }: {
  catches: CatchEntry[]
  waypoints: Waypoint[]
  profile: Profile
  onRefresh: () => void
  onRefreshWaypoints: () => void
}) {
  const [subTab, setSubTab] = useState<'catches' | 'waypoints' | 'boat' | 'quote'>('catches')
  const [adding,    setAdding]    = useState(false)
  const [form,      setForm]      = useState({ species_name: '', weight_lbs: '', length_inches: '', catch_date: new Date().toISOString().split('T')[0], location_name: '', technique: '', was_released: false })
  const [saving,    setSaving]    = useState(false)
  const [quoteForm, setQuoteForm] = useState({ boat: '', service: 'full_wrap', email: profile.email || '' })
  const [quoteSent, setQuoteSent] = useState(false)
  const [wpForm,    setWpForm]    = useState({ name: '', lat: '', lng: '', waypoint_type: 'custom', notes: '' })
  const [addingWp,  setAddingWp]  = useState(false)
  const [savingWp,  setSavingWp]  = useState(false)

  const saveCatch = async () => {
    if (!form.species_name) return
    setSaving(true)
    try {
      const r = await fetch('/api/pnw-navigator/catch-log', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, weight_lbs: parseFloat(form.weight_lbs) || null, length_inches: parseFloat(form.length_inches) || null }),
      })
      if (r.ok) { setAdding(false); setForm({ species_name: '', weight_lbs: '', length_inches: '', catch_date: new Date().toISOString().split('T')[0], location_name: '', technique: '', was_released: false }); onRefresh() }
    } finally { setSaving(false) }
  }

  const delCatch = async (id: string) => {
    const r = await fetch(`/api/pnw-navigator/catch-log?id=${id}`, { method: 'DELETE' })
    if (r.ok) onRefresh()
  }

  const saveWaypoint = async () => {
    if (!wpForm.name || !wpForm.lat || !wpForm.lng) return
    setSavingWp(true)
    try {
      const r = await fetch('/api/pnw-navigator/waypoints', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(wpForm),
      })
      if (r.ok) { setAddingWp(false); setWpForm({ name: '', lat: '', lng: '', waypoint_type: 'custom', notes: '' }); onRefreshWaypoints() }
    } finally { setSavingWp(false) }
  }

  const delWaypoint = async (id: string) => {
    await fetch(`/api/pnw-navigator/waypoints?id=${id}`, { method: 'DELETE' })
    onRefreshWaypoints()
  }

  const inp: React.CSSProperties = { width: '100%', background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '7px 10px', color: 'var(--text1)', fontSize: 12, boxSizing: 'border-box' }

  const WP_TYPES = ['custom', 'anchorage', 'fishing_spot', 'hazard', 'fuel', 'marina']

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 5 }}>
        {(['catches', 'waypoints', 'boat', 'quote'] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            flex: 1, padding: '11px 2px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 10, fontWeight: 600, letterSpacing: '0.02em',
            borderBottom: subTab === t ? '2px solid var(--accent)' : '2px solid transparent',
            color: subTab === t ? 'var(--accent)' : 'var(--text3)',
          }}>
            {t === 'catches' ? 'Catches' : t === 'waypoints' ? 'Waypoints' : t === 'boat' ? 'Boat' : 'Quote'}
          </button>
        ))}
      </div>

      {/* CATCHES */}
      {subTab === 'catches' && (
        <div style={{ padding: 12 }}>
          {catches.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'Total Catches', value: catches.length },
                { label: 'Species',       value: new Set(catches.map(c => c.species_name)).size },
                { label: 'Released',      value: catches.filter(c => c.was_released).length },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'var(--surface)', borderRadius: 8, padding: 10, border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', fontFamily: 'JetBrains Mono,monospace' }}>{stat.value}</div>
                  <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setAdding(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '10px 14px', borderRadius: 10, marginBottom: 12, background: 'rgba(34,192,122,0.08)', border: '1px solid rgba(34,192,122,0.22)', color: 'var(--green)', cursor: 'pointer', fontSize: 13, fontWeight: 600, justifyContent: 'center' }}>
            <Plus size={14} /> Log a Catch
          </button>
          {adding && (
            <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 12, marginBottom: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { key: 'species_name',  label: 'Species *',    placeholder: 'Chinook Salmon',  full: true },
                  { key: 'weight_lbs',    label: 'Weight (lbs)', placeholder: '12.5' },
                  { key: 'length_inches', label: 'Length (in)',  placeholder: '28' },
                  { key: 'catch_date',    label: 'Date',         type: 'date' },
                  { key: 'location_name', label: 'Location',     placeholder: 'Possession Bar',  full: true },
                  { key: 'technique',     label: 'Technique',    placeholder: 'Trolling, 80ft' },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn: (f as any).full ? '1/-1' : 'auto' }}>
                    <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</label>
                    <input type={(f as any).type || 'text'} placeholder={(f as any).placeholder || ''} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inp} />
                  </div>
                ))}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text2)' }}>
                <input type="checkbox" checked={form.was_released} onChange={e => setForm(p => ({ ...p, was_released: e.target.checked }))} />
                Catch & Release
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={saveCatch} disabled={saving || !form.species_name} style={{ flex: 1, padding: 8, borderRadius: 8, background: 'var(--green)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>{saving ? 'Saving…' : 'Save Catch'}</button>
                <button onClick={() => setAdding(false)} style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--surface2)', color: 'var(--text2)', border: 'none', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
              </div>
            </div>
          )}
          {catches.length === 0 && !adding && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No catches logged yet. Start your fish journal!</div>}
          {catches.map(c => (
            <div key={c.id} style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(79,127,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🐟</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                  {c.species_name}
                  {c.was_released && <span style={{ fontSize: 10, color: 'var(--green)', marginLeft: 6 }}>C&R</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {c.catch_date} · {c.location_name || 'Unknown'}
                  {c.weight_lbs ? ` · ${c.weight_lbs} lbs` : ''}{c.length_inches ? ` · ${c.length_inches}"` : ''}
                  {c.technique ? ` · ${c.technique}` : ''}
                </div>
              </div>
              <button onClick={() => delCatch(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {/* WAYPOINTS */}
      {subTab === 'waypoints' && (
        <div style={{ padding: 12 }}>
          <div style={{ background: 'linear-gradient(135deg,rgba(79,127,255,0.08),rgba(8,145,178,0.08))', borderRadius: 12, padding: 14, marginBottom: 14, border: '1px solid rgba(79,127,255,0.12)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>My Waypoints</div>
            <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }}>Save fishing spots, anchorages, hazards, and points of interest. Enter GPS coordinates from your chart plotter or phone.</p>
          </div>

          <button onClick={() => setAddingWp(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '10px 14px', borderRadius: 10, marginBottom: 12, background: 'rgba(79,127,255,0.08)', border: '1px solid rgba(79,127,255,0.2)', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600, justifyContent: 'center' }}>
            <Plus size={14} /> Add Waypoint
          </button>

          {addingWp && (
            <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 12, marginBottom: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Waypoint Name *</label>
                  <input type="text" placeholder="My Secret Spot" value={wpForm.name} onChange={e => setWpForm(p => ({ ...p, name: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Latitude *</label>
                  <input type="text" placeholder="47.6234" value={wpForm.lat} onChange={e => setWpForm(p => ({ ...p, lat: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Longitude *</label>
                  <input type="text" placeholder="-122.4567" value={wpForm.lng} onChange={e => setWpForm(p => ({ ...p, lng: e.target.value }))} style={inp} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type</label>
                  <select value={wpForm.waypoint_type} onChange={e => setWpForm(p => ({ ...p, waypoint_type: e.target.value }))} style={{ ...inp }}>
                    {WP_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</label>
                  <input type="text" placeholder="Optional notes…" value={wpForm.notes} onChange={e => setWpForm(p => ({ ...p, notes: e.target.value }))} style={inp} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={saveWaypoint} disabled={savingWp || !wpForm.name || !wpForm.lat || !wpForm.lng} style={{ flex: 1, padding: 8, borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>{savingWp ? 'Saving…' : 'Save Waypoint'}</button>
                <button onClick={() => setAddingWp(false)} style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--surface2)', color: 'var(--text2)', border: 'none', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
              </div>
            </div>
          )}

          {waypoints.length === 0 && !addingWp && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              <MapPin size={28} style={{ opacity: 0.2, marginBottom: 8 }} />
              <div>No waypoints saved yet.</div>
            </div>
          )}

          {waypoints.map(w => (
            <div key={w.id} style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(79,127,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin size={14} color="var(--accent)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{w.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {w.waypoint_type.replace('_', ' ')} · {parseFloat(String(w.lat)).toFixed(4)}°N {Math.abs(parseFloat(String(w.lng))).toFixed(4)}°W
                </div>
                {w.notes && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{w.notes}</div>}
              </div>
              <a href={`https://www.google.com/maps?q=${w.lat},${w.lng}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text3)', display: 'flex' }}><ExternalLink size={12} /></a>
              <button onClick={() => delWaypoint(w.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {/* BOAT MAINTENANCE */}
      {subTab === 'boat' && (
        <div style={{ padding: 12 }}>
          <div style={{ background: 'linear-gradient(135deg,rgba(8,145,178,0.08),rgba(79,127,255,0.08))', borderRadius: 12, padding: 16, marginBottom: 14, border: '1px solid rgba(8,145,178,0.18)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Boat Maintenance Tracker</div>
            <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>Track hull wrap, DekWave decking, and maintenance schedule.</p>
          </div>
          {[
            { item: 'Hull Wrap',              status: 'warn',  note: 'Wraps typically last 5–7 years. Consider refresh if over 4 years old.', cta: true },
            { item: 'DekWave Non-Slip Decking',status: 'ok',   note: 'EVA foam decking. Inspect annually for delamination and UV fading.', cta: true },
            { item: 'Bottom Paint',           status: 'alert', note: 'Antifouling paint: reapply every 1–2 years. Puget Sound growth is aggressive.',cta: false },
            { item: 'Engine Service',         status: 'ok',    note: 'Annual: impeller, belts, fluids, zincs. Winterize if leaving out.', cta: false },
            { item: 'Safety Gear Inspection', status: 'ok',    note: 'Check PFDs, flares (expiration date!), fire extinguisher charge, horn.', cta: false },
            { item: 'VHF Radio',              status: 'ok',    note: 'Test radio on low power to marina before every offshore trip.', cta: false },
          ].map(item => (
            <div key={item.item} style={{ padding: 12, background: 'var(--surface)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: item.status === 'ok' ? 'var(--green)' : item.status === 'warn' ? 'var(--amber)' : 'var(--red)' }} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{item.item}</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text2)', margin: '5px 0 0 18px', lineHeight: 1.5 }}>{item.note}</p>
              {item.cta && (
                <div style={{ marginTop: 8, marginLeft: 18 }}>
                  <button onClick={() => {}} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: 'rgba(34,192,122,0.08)', border: '1px solid rgba(34,192,122,0.22)', color: 'var(--green)', cursor: 'pointer' }}>
                    Free Estimate from USA Wrap Co <ArrowRight size={11} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* QUOTE */}
      {subTab === 'quote' && (
        <div style={{ padding: 12 }}>
          {quoteSent ? (
            <div style={{ padding: 40, textAlign: 'center', background: 'rgba(34,192,122,0.07)', borderRadius: 12, border: '1px solid rgba(34,192,122,0.18)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>Quote Request Sent!</div>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>USA Wrap Co will follow up within 1 business day to discuss your boat wrap or DekWave decking project.</p>
            </div>
          ) : (
            <>
              <div style={{ background: 'linear-gradient(135deg,rgba(34,192,122,0.08),rgba(79,127,255,0.08))', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid rgba(34,192,122,0.18)' }}>
                <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Barlow Condensed,sans-serif', marginBottom: 4 }}>GET A FREE QUOTE — USA WRAP CO</div>
                <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>Full hull wraps · Partial wraps · DekWave non-slip decking · Marine vinyl graphics</p>
              </div>
              {[
                { key: 'boat',  label: 'Your Boat (Year / Make / Model / Length)', placeholder: '2019 Bayliner 21ft' },
                { key: 'email', label: 'Email Address', placeholder: 'you@email.com', type: 'email' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</label>
                  <input type={(f as any).type || 'text'} placeholder={f.placeholder} value={(quoteForm as any)[f.key]} onChange={e => setQuoteForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ ...inp, width: '100%' }} />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Service Interested In</label>
                <select value={quoteForm.service} onChange={e => setQuoteForm(p => ({ ...p, service: e.target.value }))} style={{ ...inp, width: '100%' }}>
                  <option value="full_wrap">Full Hull Wrap</option>
                  <option value="partial_wrap">Partial Wrap</option>
                  <option value="dekwave">DekWave Non-Slip Decking</option>
                  <option value="graphics">Marine Vinyl Graphics</option>
                  <option value="both">Wrap + DekWave Package</option>
                </select>
              </div>
              <button onClick={() => setQuoteSent(true)} disabled={!quoteForm.boat || !quoteForm.email}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', cursor: quoteForm.boat && quoteForm.email ? 'pointer' : 'default', fontSize: 13, fontWeight: 700, background: quoteForm.boat && quoteForm.email ? 'var(--green)' : 'rgba(255,255,255,0.05)', color: quoteForm.boat && quoteForm.email ? '#fff' : 'var(--text3)' }}>
                Send to USA Wrap Co →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── REGS TAB ─────────────────────────────────────────────────────────────────
function RegsTab() {
  const [open,    setOpen]    = useState<string | null>(null)
  const [showVHF, setShowVHF] = useState(false)

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {/* Quick checklist */}
      <div style={{ padding: '10px 14px', background: 'rgba(242,90,90,0.06)', borderBottom: '1px solid rgba(242,90,90,0.1)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', marginBottom: 6, letterSpacing: '0.06em' }}>QUICK SAFETY CHECKLIST</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px' }}>
          {['1 PFD per person','Children under 13 wear PFD','Fire extinguisher (enclosed space)','Sound signal (horn/whistle)','Visual distress signals (offshore)','Navigation lights (dusk–dawn)','Registration on bow','VHF radio — monitor Channel 16'].map(item => (
            <div key={item} style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', gap: 5 }}>
              <span style={{ color: 'var(--green)' }}>✓</span>{item}
            </div>
          ))}
        </div>
      </div>

      {/* Orca banner */}
      <div style={{ margin: '8px 8px 0', padding: '10px 12px', background: 'rgba(79,127,255,0.07)', borderRadius: 10, border: '1px solid rgba(79,127,255,0.18)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 3 }}>🐋 ORCA BE WHALE WISE — FEDERAL LAW</div>
        <div style={{ fontSize: 11, color: 'var(--text2)' }}>Stay 300+ yards from Southern Resident Killer Whales at all times. Fines up to $11,000. Monitor VHF 16 for exclusion zone announcements.</div>
      </div>

      <div style={{ padding: 8 }}>
        {REGS.map(reg => (
          <div key={reg.id} style={{ marginBottom: 5 }}>
            <button onClick={() => setOpen(open === reg.id ? null : reg.id)} style={{ width: '100%', padding: '11px 12px', borderRadius: 10, background: reg.critical ? 'rgba(242,90,90,0.05)' : 'var(--surface)', border: `1px solid ${reg.critical ? 'rgba(242,90,90,0.13)' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
              <span style={{ fontSize: 16 }}>{reg.icon}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: reg.critical ? 'var(--red)' : 'var(--text1)' }}>{reg.title}</span>
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>{reg.penalty}</span>
              {open === reg.id ? <ChevronUp size={14} color="var(--text3)" /> : <ChevronDown size={14} color="var(--text3)" />}
            </button>
            {open === reg.id && (
              <div style={{ background: 'var(--surface2)', borderRadius: '0 0 10px 10px', padding: '10px 14px', marginTop: -3, border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none' }}>
                {reg.items.map(item => (
                  <div key={item} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span>
                    <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, padding: '5px 10px', borderRadius: 6, background: 'rgba(242,90,90,0.07)', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <AlertTriangle size={11} color="var(--red)" />
                  <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>Penalty: {reg.penalty}</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* VHF Guide */}
        <div style={{ marginBottom: 5 }}>
          <button onClick={() => setShowVHF(v => !v)} style={{ width: '100%', padding: '11px 12px', borderRadius: 10, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
            <Radio size={15} color="var(--cyan)" />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>VHF Radio Channel Guide</span>
            {showVHF ? <ChevronUp size={14} color="var(--text3)" /> : <ChevronDown size={14} color="var(--text3)" />}
          </button>
          {showVHF && (
            <div style={{ background: 'var(--surface2)', borderRadius: '0 0 10px 10px', padding: 8, marginTop: -3, border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none' }}>
              {VHF_CHANNELS.map(ch => (
                <div key={ch.ch} style={{ padding: '8px 10px', borderRadius: 8, marginBottom: 4, background: 'rgba(0,0,0,0.18)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: ch.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: ch.color, fontFamily: 'JetBrains Mono,monospace' }}>{ch.ch}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>{ch.name}</span>
                      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: ch.color + '20', color: ch.color, fontWeight: 700 }}>{ch.cat}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.4 }}>{ch.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Official resources */}
        <div style={{ padding: '10px 0 4px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Official Resources</div>
          {[
            { label: 'WDFW Fishing Regulations',       url: 'https://wdfw.wa.gov/fishing/regulations' },
            { label: 'NOAA Tides & Currents',          url: 'https://tidesandcurrents.noaa.gov' },
            { label: 'NOAA Marine Forecast — Puget Sound', url: 'https://www.weather.gov/mtr/' },
            { label: 'Orca Network — Be Whale Wise',   url: 'https://www.orcanetwork.org' },
            { label: 'USCG Boating Safety',            url: 'https://www.uscgboating.org' },
            { label: 'NOAA Nautical Charts',           url: 'https://charts.noaa.gov' },
          ].map(link => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, marginBottom: 4, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none', color: 'var(--text2)', fontSize: 12 }}>
              <span>{link.label}</span>
              <ExternalLink size={11} color="var(--text3)" />
            </a>
          ))}
        </div>
      </div>
      <div style={{ padding: '8px 14px 24px', fontSize: 10, color: 'var(--text3)', lineHeight: 1.5 }}>
        General guidance only. Always verify with WDFW, USCG, and NOAA. Regulations change frequently.
      </div>
    </div>
  )
}
