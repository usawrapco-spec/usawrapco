'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Map, Fish, Anchor, BookOpen, User, ChevronDown, ChevronUp,
  Fuel, Waves, Wifi, Zap, ShowerHead, Wind, AlertTriangle,
  Navigation, Phone, Radio, Plus, Trash2, ArrowRight, ExternalLink, MapPin,
} from 'lucide-react'
import type { Profile } from '@/types'

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
  id: string; name: string; city: string; region: string; phone: string
  vhf_channel: string; description: string
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

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'map',     label: 'Map',      icon: Map },
  { id: 'fish',    label: 'Fish',     icon: Fish },
  { id: 'marinas', label: 'Marinas',  icon: Anchor },
  { id: 'mystuff', label: 'My Stuff', icon: User },
  { id: 'regs',    label: 'Regs',     icon: BookOpen },
]

const REGIONS: Record<string, string> = {
  puget_sound_north:   'North Puget Sound',
  puget_sound_central: 'Central Puget Sound',
  puget_sound_south:   'South Sound',
  san_juan_islands:    'San Juan Islands',
  strait_of_juan_de_fuca: 'Strait of JdF',
  hood_canal:          'Hood Canal',
  lake_washington:     'Lake Washington',
  snohomish_river:     'Snohomish / River',
  pacific_coast:       'Pacific Coast',
  freshwater:          'Freshwater',
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
  { id: 'pfd', icon: '🦺', title: 'Life Jackets (PFDs)', critical: true, penalty: 'Up to $500',
    items: ['One USCG-approved PFD for every person aboard', 'Children under 13 MUST wear PFD while underway on vessels under 26ft', 'Must be readily accessible — not buried in a locker', 'Vessels 16ft+ must carry one Type IV throwable device'] },
  { id: 'orca', icon: '🐋', title: 'Orca Be Whale Wise — Federal Law', critical: true, penalty: 'Up to $11,000',
    items: ['Stay 300+ yards from Southern Resident Killer Whales (SRKWs)', 'Stay 400+ yards from resting or feeding SRKWs', 'Do NOT position vessel in whale travel path', 'Put engine in neutral if whales approach stopped vessel', 'Monitor VHF 16 for exclusion zone announcements', 'No drones within 300 yards without federal permit'] },
  { id: 'bui', icon: '🍺', title: 'Boating Under the Influence (BUI)', critical: true, penalty: 'Up to $5,000 + jail',
    items: ['BAC limit 0.08% — same as driving', 'First offense: gross misdemeanor, up to $5,000 fine, 364 days jail', '1-year suspension of boating privileges', 'Prior DUI convictions enhance penalties'] },
  { id: 'reg', icon: '📋', title: 'WA Vessel Registration', penalty: '$120 minimum',
    items: ['All motorized vessels in WA must be registered', 'Numbers 3" high on both sides of bow — block style', 'Current decal on starboard (right) side', 'Non-motorized boats under 16ft exempt'] },
  { id: 'fire', icon: '🔥', title: 'Fire Extinguishers', penalty: 'Up to $500',
    items: ['Required if vessel has enclosed engine compartment, living space, or PFD storage', 'Under 26ft: minimum one B-1 USCG approved extinguisher', '26-40ft: two B-1 or one B-2', 'Must be charged and immediately accessible'] },
  { id: 'lights', icon: '💡', title: 'Navigation Lights', penalty: 'Up to $500',
    items: ['Required sunset to sunrise AND in restricted visibility', 'Port (left): red · Starboard (right): green · Stern: white', 'Powerboats add white masthead (forward) light', 'Anchored vessels display white all-round anchor light'] },
  { id: 'sewage', icon: '🚰', title: 'No Discharge of Sewage', penalty: 'Up to $2,000–$25,000',
    items: ['Puget Sound is a No-Discharge Zone — even treated sewage prohibited', 'Must use pump-out stations', 'Oil/fuel sheen also prohibited — use bilge pads', 'Report spills: 1-800-424-8802'] },
  { id: 'speed', icon: '⚡', title: 'Speed & Wake Rules', penalty: 'Traffic infraction',
    items: ['No Wake = 5 mph or slower (minimal wake)', 'All of Gig Harbor channel is No Wake zone', 'Within 200ft of divers down flag: No Wake', 'Your wake = your liability for damage'] },
  { id: 'canada', icon: '🍁', title: 'Entering Canada by Vessel', penalty: 'Up to $25,000 CDN',
    items: ['Must report to CBSA immediately upon entering Canadian waters', 'Call CBSA: 1-888-226-7277 (or use NEXUS)', 'Must land at designated port of entry FIRST', 'Declare all weapons, alcohol, and goods'] },
]

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PNWNavigatorClient({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState('map')
  const [spots, setSpots] = useState<FishingSpot[]>([])
  const [species, setSpecies] = useState<FishSpecies[]>([])
  const [marinas, setMarinas] = useState<Marina[]>([])
  const [tides, setTides] = useState<{ station: string; predictions: TidePrediction[] }>({ station: 'Seattle', predictions: [] })
  const [catches, setCatches] = useState<CatchEntry[]>([])

  useEffect(() => {
    fetch('/api/pnw-navigator/spots').then(r => r.json()).then(d => setSpots(d.spots || [])).catch(() => {})
    fetch('/api/pnw-navigator/species').then(r => r.json()).then(d => setSpecies(d.species || [])).catch(() => {})
    fetch('/api/pnw-navigator/marinas').then(r => r.json()).then(d => setMarinas(d.marinas || [])).catch(() => {})
    fetch('/api/pnw-navigator/tides?station=seattle').then(r => r.json()).then(d => setTides({ station: d.station || 'Seattle', predictions: d.predictions || [] })).catch(() => {})
    fetch('/api/pnw-navigator/catch-log').then(r => r.json()).then(d => setCatches(d.catches || [])).catch(() => {})
  }, [])

  const refreshCatches = useCallback(() => {
    fetch('/api/pnw-navigator/catch-log').then(r => r.json()).then(d => setCatches(d.catches || [])).catch(() => {})
  }, [])

  // Next tide
  const now = new Date()
  const nextTide = tides.predictions.find(p => new Date(p.time) > now)

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
          {/* Tide chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', borderRadius: 8, padding: '5px 10px', fontSize: 11 }}>
            <Waves size={12} color="var(--cyan)" />
            {nextTide ? (
              <span>
                <span style={{ color: 'var(--text3)' }}>{tides.station} </span>
                <span style={{ fontWeight: 700, color: nextTide.type === 'H' ? 'var(--cyan)' : 'var(--amber)' }}>
                  {nextTide.type === 'H' ? 'HIGH' : 'LOW'}
                </span>
                <span style={{ color: 'var(--text2)', marginLeft: 4 }}>
                  {new Date(nextTide.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({nextTide.height_ft.toFixed(1)}ft)
                </span>
              </span>
            ) : (
              <span style={{ color: 'var(--text3)' }}>Loading tides…</span>
            )}
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
        {tab === 'map'     && <MapTab spots={spots} marinas={marinas} />}
        {tab === 'fish'    && <FishTab species={species} spots={spots} />}
        {tab === 'marinas' && <MarinasTab marinas={marinas} />}
        {tab === 'mystuff' && <MyStuffTab catches={catches} profile={profile} onRefresh={refreshCatches} />}
        {tab === 'regs'    && <RegsTab />}
      </div>
    </div>
  )
}

// ─── MAP TAB ──────────────────────────────────────────────────────────────────
function MapTab({ spots, marinas }: { spots: FishingSpot[]; marinas: Marina[] }) {
  const [region, setRegion] = useState('all')
  const [selectedSpot, setSelectedSpot] = useState<FishingSpot | null>(null)
  const [selectedMarina, setSelectedMarina] = useState<Marina | null>(null)

  const filtered = spots.filter(s => region === 'all' || s.region === region)
  const byRegion = filtered.reduce((acc: Record<string, FishingSpot[]>, s) => {
    if (!acc[s.region]) acc[s.region] = []
    acc[s.region].push(s)
    return acc
  }, {})

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Filters + resource links */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '8px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={region} onChange={e => setRegion(e.target.value)} style={{ background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '5px 9px', color: 'var(--text1)', fontSize: 12 }}>
            <option value="all">All Regions</option>
            {Object.entries(REGIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{filtered.length} spots · {marinas.length} marinas</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            {[
              { label: 'NOAA Charts', url: 'https://charts.noaa.gov/OnLineViewer/PacificCoast.shtml' },
              { label: 'WDFW Regs', url: 'https://wdfw.wa.gov/fishing/regulations' },
              { label: 'Marine Forecast', url: 'https://www.weather.gov/mtr/' },
            ].map(l => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--cyan)', textDecoration: 'none' }}>
                {l.label} <ExternalLink size={10} />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Spot list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {Object.entries(byRegion).map(([reg, regSpots]) => (
          <div key={reg}>
            <div style={{ padding: '9px 14px 3px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text3)', textTransform: 'uppercase', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
              {REGIONS[reg] || reg} ({regSpots.length})
            </div>
            {regSpots.map(spot => <SpotCard key={spot.id} spot={spot} selected={selectedSpot?.id === spot.id} onClick={() => setSelectedSpot(prev => prev?.id === spot.id ? null : spot)} />)}
          </div>
        ))}

        {/* Marinas section */}
        <div>
          <div style={{ padding: '9px 14px 3px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text3)', textTransform: 'uppercase', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
            Marinas ({marinas.length})
          </div>
          {marinas.map(m => (
            <MarinaCard key={m.id} marina={m} selected={selectedMarina?.id === m.id} onClick={() => setSelectedMarina(prev => prev?.id === m.id ? null : m)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function SpotCard({ spot, selected, onClick }: { spot: FishingSpot; selected: boolean; onClick: () => void }) {
  const spp = Array.isArray(spot.species_present) ? spot.species_present : []
  const tech = Array.isArray(spot.best_techniques) ? spot.best_techniques : []

  return (
    <div onClick={onClick} style={{ margin: '0 8px 4px', background: selected ? 'rgba(79,127,255,0.06)' : 'var(--surface)', border: `1px solid ${selected ? 'rgba(79,127,255,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, cursor: 'pointer', overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{spot.name}</span>
          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: DIFF_COLOR[spot.difficulty] + '25', color: DIFF_COLOR[spot.difficulty], fontWeight: 700, textTransform: 'uppercase' }}>{spot.difficulty}</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text3)' }}>
            {spot.access_type === 'boat_only' ? '⛵ Boat only' : spot.access_type === 'shore' ? '🚶 Shore' : '⛵🚶 Both'}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
          {REGIONS[spot.region] || spot.region} · {spot.water_type === 'saltwater' ? 'Salt' : spot.water_type === 'freshwater' ? 'Fresh' : 'Estuary'}
          {spot.depth_range_ft && ` · ${spot.depth_range_ft}ft`}
          {spot.best_tides && ` · ${spot.best_tides} tide`}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {spp.slice(0, 5).map((sp: any, i: number) => (
            <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'var(--text2)' }}>
              {'★'.repeat(Math.min(sp.rating || 3, 5))} {sp.species_id?.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>
      {selected && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 12px', background: 'rgba(0,0,0,0.2)' }}>
          <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55, margin: '0 0 8px' }}>{spot.description}</p>
          {spot.hazards && <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}><AlertTriangle size={12} color="var(--amber)" style={{ flexShrink: 0, marginTop: 1 }} /><span style={{ fontSize: 11, color: 'var(--amber)' }}>{spot.hazards}</span></div>}
          {spot.regulations_notes && <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}><BookOpen size={12} color="var(--cyan)" style={{ flexShrink: 0, marginTop: 1 }} /><span style={{ fontSize: 11, color: 'var(--text2)' }}>{spot.regulations_notes}</span></div>}
          {tech.length > 0 && <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}><span style={{ color: 'var(--text3)' }}>Techniques: </span>{tech.map((t: any) => typeof t === 'string' ? t : (t?.name ?? String(t))).join(', ')}</div>}
          <a href={`https://www.google.com/maps?q=${spot.lat},${spot.lng}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
            <MapPin size={11} /> Open in Maps · {spot.lat.toFixed(4)}°N {Math.abs(spot.lng).toFixed(4)}°W
          </a>
        </div>
      )}
    </div>
  )
}

// ─── FISH TAB ─────────────────────────────────────────────────────────────────
function FishTab({ species, spots }: { species: FishSpecies[]; spots: FishingSpot[] }) {
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
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '10px 12px', background: 'var(--surface)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 5 }}>
        <input type="text" placeholder="Search species…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 12px', color: 'var(--text1)', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATS.map(c => <button key={c.id} onClick={() => setCat(c.id)} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: cat === c.id ? 'var(--accent)' : 'var(--surface2)', color: cat === c.id ? '#fff' : 'var(--text2)' }}>{c.label}</button>)}
        </div>
      </div>
      <div style={{ padding: '8px' }}>
        {filtered.map(s => (
          <div key={s.id} onClick={() => setSelected(s)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 4, background: 'var(--surface)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(79,127,255,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}>
            <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, background: s.category === 'salmon' ? 'rgba(242,90,90,0.15)' : s.category === 'bottomfish' ? 'rgba(139,92,246,0.15)' : s.category === 'shellfish' ? 'rgba(245,158,11,0.15)' : 'rgba(34,192,122,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {s.category === 'salmon' ? '🐟' : s.category === 'bottomfish' ? '🐠' : s.category === 'shellfish' ? '🦀' : '🎣'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{s.common_name}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontStyle: 'italic' }}>{s.scientific_name}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>
                {s.typical_size_lbs_min}–{s.typical_size_lbs_max} lbs{s.state_record_weight_lbs && ` · WA record: ${s.state_record_weight_lbs} lbs`}
              </div>
            </div>
            <ArrowRight size={14} color="var(--text3)" />
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No species found</div>}
      </div>
    </div>
  )
}

function SpeciesDetail({ species: s, spots, onBack }: { species: FishSpecies; spots: FishingSpot[]; onBack: () => void }) {
  const mySpots = spots.filter(sp => (Array.isArray(sp.species_present) ? sp.species_present : []).some((p: any) => p.species_id === s.id))
    .sort((a, b) => {
      const ra = (Array.isArray(a.species_present) ? a.species_present : []).find((p: any) => p.species_id === s.id)?.rating || 0
      const rb = (Array.isArray(b.species_present) ? b.species_present : []).find((p: any) => p.species_id === s.id)?.rating || 0
      return rb - ra
    })

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '10px 14px', background: 'var(--surface)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, zIndex: 5 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13 }}>← Fish</button>
        <span style={{ color: 'var(--text3)' }}>·</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{s.common_name}</span>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(79,127,255,0.1),rgba(8,145,178,0.1))', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid rgba(79,127,255,0.15)' }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Barlow Condensed,sans-serif', letterSpacing: '0.03em' }}>{s.common_name.toUpperCase()}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic', marginBottom: 8 }}>{s.scientific_name}</div>
          <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{s.description}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Typical Size', value: `${s.typical_size_lbs_min}–${s.typical_size_lbs_max} lbs` },
            { label: 'WA State Record', value: s.state_record_weight_lbs ? `${s.state_record_weight_lbs} lbs` : 'N/A' },
            { label: 'Trophy Weight', value: s.trophy_weight_lbs ? `${s.trophy_weight_lbs}+ lbs` : 'N/A' },
            { label: 'Best Depth', value: s.preferred_depth_ft_min != null ? `${s.preferred_depth_ft_min}–${s.preferred_depth_ft_max}ft` : 'Varies' },
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
              {s.best_season.map((season: string) => <span key={season} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, background: 'rgba(34,192,122,0.15)', color: 'var(--green)', fontWeight: 600, textTransform: 'capitalize' }}>{season.replace('_', ' ')}</span>)}
            </div>
          </InfoBlock>
        )}
        {mySpots.length > 0 && (
          <InfoBlock title={`Top Spots for ${s.common_name}`}>
            {mySpots.slice(0, 5).map(sp => {
              const rating = (Array.isArray(sp.species_present) ? sp.species_present : []).find((p: any) => p.species_id === s.id)?.rating || 0
              return (
                <div key={sp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <Fish size={12} color="var(--accent)" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--text1)' }}>{sp.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{REGIONS[sp.region] || sp.region}</span>
                  <span style={{ fontSize: 11, color: 'var(--amber)' }}>{'★'.repeat(rating)}</span>
                </div>
              )
            })}
          </InfoBlock>
        )}
        <a href="https://wdfw.wa.gov/fishing/regulations" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', padding: 12, borderRadius: 10, background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.2)', color: 'var(--green)', textDecoration: 'none', fontSize: 12, fontWeight: 600, marginTop: 8 }}>
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
  const [fuel, setFuel] = useState(false)
  const [launch, setLaunch] = useState(false)
  const [transient, setTransient] = useState(false)
  const [selected, setSelected] = useState<Marina | null>(null)

  const filtered = marinas.filter(m => (!fuel || m.has_fuel_dock) && (!launch || m.has_launch_ramp) && (!transient || m.has_transient_moorage))

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '10px 12px', background: 'var(--surface)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6, flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 5 }}>
        {[
          { label: 'Fuel Dock', icon: Fuel, state: fuel, set: setFuel },
          { label: 'Launch Ramp', icon: Navigation, state: launch, set: setLaunch },
          { label: 'Transient Moorage', icon: Anchor, state: transient, set: setTransient },
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
    m.has_fuel_dock && { icon: Fuel, label: 'Fuel', color: 'var(--amber)' },
    m.has_launch_ramp && { icon: Navigation, label: 'Launch', color: 'var(--green)' },
    m.has_transient_moorage && { icon: Anchor, label: 'Transient', color: 'var(--accent)' },
    m.has_pump_out && { icon: Wind, label: 'Pump-Out', color: 'var(--cyan)' },
    m.has_showers && { icon: ShowerHead, label: 'Showers', color: 'var(--text3)' },
    m.has_wifi && { icon: Wifi, label: 'WiFi', color: 'var(--text3)' },
    m.has_repair_yard && { icon: Zap, label: 'Repair', color: 'var(--purple)' },
  ].filter(Boolean) as any[]

  return (
    <div onClick={onClick} style={{ marginBottom: 6, background: selected ? 'rgba(79,127,255,0.06)' : 'var(--surface)', border: `1px solid ${selected ? 'rgba(79,127,255,0.3)' : m.usa_wrapco_authorized ? 'rgba(34,192,122,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, cursor: 'pointer', overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <Anchor size={12} color={m.usa_wrapco_authorized ? 'var(--green)' : 'var(--text3)'} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{m.name}</span>
          {m.usa_wrapco_authorized && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(34,192,122,0.15)', color: 'var(--green)', fontWeight: 700 }}>USA WRAP CO</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 7 }}>
          {m.city} · VHF {m.vhf_channel} · {m.phone}
          {m.transient_rate_per_ft_per_night && ` · $${m.transient_rate_per_ft_per_night}/ft/night`}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {amenities.map((a: any) => { const Icon = a.icon; return <span key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: a.color }}><Icon size={10} /> {a.label}</span> })}
        </div>
      </div>
      {selected && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 12px', background: 'rgba(0,0,0,0.2)' }}>
          <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, margin: '0 0 8px' }}>{m.description}</p>
          {m.usa_wrapco_authorized && m.wrap_company_nearby && (
            <div style={{ padding: '9px 12px', borderRadius: 8, background: 'rgba(34,192,122,0.08)', border: '1px solid rgba(34,192,122,0.2)', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', marginBottom: 2 }}>USA Wrap Co — Authorized Service Location</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{m.wrap_company_nearby}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Hull wraps · DekWave decking · Marine vinyl graphics</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <a href={`tel:${m.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}><Phone size={11} /> Call</a>
            <a href={`https://www.google.com/maps/search/${encodeURIComponent(m.name + ' ' + m.city)}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}><MapPin size={11} /> Directions</a>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MY STUFF TAB ─────────────────────────────────────────────────────────────
function MyStuffTab({ catches, profile, onRefresh }: { catches: CatchEntry[]; profile: Profile; onRefresh: () => void }) {
  const [subTab, setSubTab] = useState<'catches' | 'boat' | 'quote'>('catches')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ species_name: '', weight_lbs: '', length_inches: '', catch_date: new Date().toISOString().split('T')[0], location_name: '', technique: '', was_released: false })
  const [saving, setSaving] = useState(false)
  const [quoteForm, setQuoteForm] = useState({ boat: '', service: 'full_wrap', email: profile.email || '' })
  const [quoteSent, setQuoteSent] = useState(false)

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

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 5 }}>
        {(['catches', 'boat', 'quote'] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{ flex: 1, padding: '11px 6px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, borderBottom: subTab === t ? '2px solid var(--accent)' : '2px solid transparent', color: subTab === t ? 'var(--accent)' : 'var(--text3)' }}>
            {t === 'catches' ? 'My Catches' : t === 'boat' ? 'Boat Maintenance' : 'Get a Quote'}
          </button>
        ))}
      </div>

      {subTab === 'catches' && (
        <div style={{ padding: 12 }}>
          {catches.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
              {[{ label: 'Total Catches', value: catches.length }, { label: 'Species', value: new Set(catches.map(c => c.species_name)).size }, { label: 'Released', value: catches.filter(c => c.was_released).length }].map(stat => (
                <div key={stat.label} style={{ background: 'var(--surface)', borderRadius: 8, padding: 10, border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', fontFamily: 'JetBrains Mono,monospace' }}>{stat.value}</div>
                  <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setAdding(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '10px 14px', borderRadius: 10, marginBottom: 12, background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.25)', color: 'var(--green)', cursor: 'pointer', fontSize: 13, fontWeight: 600, justifyContent: 'center' }}>
            <Plus size={14} /> Log a Catch
          </button>
          {adding && (
            <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 12, marginBottom: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { key: 'species_name', label: 'Species *', placeholder: 'Chinook Salmon', full: true },
                  { key: 'weight_lbs', label: 'Weight (lbs)', placeholder: '12.5' },
                  { key: 'length_inches', label: 'Length (in)', placeholder: '28' },
                  { key: 'catch_date', label: 'Date', type: 'date' },
                  { key: 'location_name', label: 'Location', placeholder: 'Possession Bar', full: true },
                  { key: 'technique', label: 'Technique', placeholder: 'Trolling, 80ft' },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn: (f as any).full ? '1/-1' : 'auto' }}>
                    <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</label>
                    <input type={(f as any).type || 'text'} placeholder={(f as any).placeholder || ''} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '7px 10px', color: 'var(--text1)', fontSize: 12, boxSizing: 'border-box' }} />
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
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{c.species_name}{c.was_released && <span style={{ fontSize: 10, color: 'var(--green)', marginLeft: 6 }}>C&R</span>}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {c.catch_date} · {c.location_name || 'Unknown'}
                  {c.weight_lbs && ` · ${c.weight_lbs} lbs`}{c.length_inches && ` · ${c.length_inches}"`}
                  {c.technique && ` · ${c.technique}`}
                </div>
              </div>
              <button onClick={() => delCatch(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {subTab === 'boat' && (
        <div style={{ padding: 12 }}>
          <div style={{ background: 'linear-gradient(135deg,rgba(8,145,178,0.1),rgba(79,127,255,0.1))', borderRadius: 12, padding: 16, marginBottom: 14, border: '1px solid rgba(8,145,178,0.2)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Boat Maintenance Tracker</div>
            <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>Track hull wrap, DekWave decking, and maintenance schedule. Know when it's time for service.</p>
          </div>
          {[
            { item: 'Hull Wrap', status: 'warn', note: 'Wraps typically last 5–7 years. Consider refresh if over 4 years.', cta: true },
            { item: 'DekWave Decking', status: 'ok', note: 'Non-slip EVA foam decking. Inspect annually for delamination and UV fading.', cta: true },
            { item: 'Bottom Paint', status: 'alert', note: 'Antifouling paint should be applied every 1–2 years depending on your area.', cta: false },
            { item: 'Engine Service', status: 'ok', note: 'Annual service: impeller, belts, fluids, zincs. Winterize if leaving out.', cta: false },
            { item: 'Safety Gear Inspection', status: 'ok', note: 'Check PFDs, flares (expiration date!), fire extinguisher charge, horn.', cta: false },
            { item: 'VHF Radio', status: 'ok', note: 'Test radio on low power to marina before every offshore trip.', cta: false },
          ].map(item => (
            <div key={item.item} style={{ padding: 12, background: 'var(--surface)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: item.status === 'ok' ? 'var(--green)' : item.status === 'warn' ? 'var(--amber)' : 'var(--red)' }} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{item.item}</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text2)', margin: '5px 0 0 18px', lineHeight: 1.5 }}>{item.note}</p>
              {item.cta && (
                <div style={{ marginTop: 8, marginLeft: 18 }}>
                  <button onClick={() => {}} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.25)', color: 'var(--green)', cursor: 'pointer' }}>
                    Free Estimate from USA Wrap Co <ArrowRight size={11} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {subTab === 'quote' && (
        <div style={{ padding: 12 }}>
          {quoteSent ? (
            <div style={{ padding: 40, textAlign: 'center', background: 'rgba(34,192,122,0.08)', borderRadius: 12, border: '1px solid rgba(34,192,122,0.2)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>Quote Request Sent!</div>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>USA Wrap Co will follow up within 1 business day to discuss your boat wrap or DekWave decking project.</p>
            </div>
          ) : (
            <>
              <div style={{ background: 'linear-gradient(135deg,rgba(34,192,122,0.1),rgba(79,127,255,0.1))', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid rgba(34,192,122,0.2)' }}>
                <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Barlow Condensed,sans-serif', marginBottom: 4 }}>GET A FREE QUOTE FROM USA WRAP CO</div>
                <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>Full hull wraps · Partial wraps · DekWave non-slip decking · Marine vinyl graphics</p>
              </div>
              {[
                { key: 'boat', label: 'Your Boat (Year / Make / Model / Length)', placeholder: '2019 Bayliner 21ft' },
                { key: 'email', label: 'Email Address', placeholder: 'you@email.com', type: 'email' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</label>
                  <input type={(f as any).type || 'text'} placeholder={f.placeholder} value={(quoteForm as any)[f.key]} onChange={e => setQuoteForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: 'var(--text1)', fontSize: 12, boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Service Interested In</label>
                <select value={quoteForm.service} onChange={e => setQuoteForm(p => ({ ...p, service: e.target.value }))} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: 'var(--text1)', fontSize: 12 }}>
                  <option value="full_wrap">Full Hull Wrap</option>
                  <option value="partial_wrap">Partial Wrap</option>
                  <option value="dekwave">DekWave Non-Slip Decking</option>
                  <option value="graphics">Marine Vinyl Graphics</option>
                  <option value="both">Wrap + DekWave Package</option>
                </select>
              </div>
              <button onClick={() => setQuoteSent(true)} disabled={!quoteForm.boat || !quoteForm.email} style={{ width: '100%', padding: 12, borderRadius: 10, background: quoteForm.boat && quoteForm.email ? 'var(--green)' : 'rgba(255,255,255,0.05)', color: quoteForm.boat && quoteForm.email ? '#fff' : 'var(--text3)', border: 'none', cursor: quoteForm.boat && quoteForm.email ? 'pointer' : 'default', fontSize: 13, fontWeight: 700 }}>
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
  const [open, setOpen] = useState<string | null>(null)
  const [showVHF, setShowVHF] = useState(false)

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {/* Quick checklist */}
      <div style={{ padding: '10px 14px', background: 'rgba(242,90,90,0.07)', borderBottom: '1px solid rgba(242,90,90,0.12)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', marginBottom: 6, letterSpacing: '0.06em' }}>QUICK SAFETY CHECKLIST</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px' }}>
          {['1 PFD per person', 'Children under 13 wear PFD', 'Fire extinguisher (enclosed space)', 'Sound signal (horn/whistle)', 'Visual distress signals (offshore)', 'Navigation lights (dusk–dawn)', 'Registration on bow', 'VHF radio — monitor Channel 16'].map(item => (
            <div key={item} style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', gap: 5 }}><span style={{ color: 'var(--green)' }}>✓</span>{item}</div>
          ))}
        </div>
      </div>

      {/* Orca banner */}
      <div style={{ margin: '8px 8px 0', padding: '10px 12px', background: 'rgba(79,127,255,0.08)', borderRadius: 10, border: '1px solid rgba(79,127,255,0.2)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 3 }}>🐋 ORCA BE WHALE WISE — FEDERAL LAW</div>
        <div style={{ fontSize: 11, color: 'var(--text2)' }}>Stay 300+ yards from Southern Resident Killer Whales at all times. Fines up to $11,000. Monitor VHF 16 for exclusion zone announcements.</div>
      </div>

      <div style={{ padding: 8 }}>
        {REGS.map(reg => (
          <div key={reg.id} style={{ marginBottom: 5 }}>
            <button onClick={() => setOpen(open === reg.id ? null : reg.id)} style={{ width: '100%', padding: '11px 12px', borderRadius: 10, background: reg.critical ? 'rgba(242,90,90,0.06)' : 'var(--surface)', border: `1px solid ${reg.critical ? 'rgba(242,90,90,0.15)' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
              <span style={{ fontSize: 16 }}>{reg.icon}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: reg.critical ? 'var(--red)' : 'var(--text1)' }}>{reg.title}</span>
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>{reg.penalty}</span>
              {open === reg.id ? <ChevronUp size={14} color="var(--text3)" /> : <ChevronDown size={14} color="var(--text3)" />}
            </button>
            {open === reg.id && (
              <div style={{ background: 'var(--surface2)', borderRadius: '0 0 10px 10px', padding: '10px 14px', marginTop: -3, border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none' }}>
                {reg.items.map((item) => (
                  <div key={item} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span>
                    <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, padding: '5px 10px', borderRadius: 6, background: 'rgba(242,90,90,0.08)', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
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
                <div key={ch.ch} style={{ padding: '8px 10px', borderRadius: 8, marginBottom: 4, background: 'rgba(0,0,0,0.2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
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
            { label: 'WDFW Fishing Regulations', url: 'https://wdfw.wa.gov/fishing/regulations' },
            { label: 'NOAA Tides & Currents', url: 'https://tidesandcurrents.noaa.gov' },
            { label: 'NOAA Marine Forecast — Puget Sound', url: 'https://www.weather.gov/mtr/' },
            { label: 'Orca Network — Be Whale Wise', url: 'https://www.orcanetwork.org' },
            { label: 'USCG Boating Safety', url: 'https://www.uscgboating.org' },
            { label: 'NOAA Nautical Charts', url: 'https://charts.noaa.gov' },
          ].map(link => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, marginBottom: 4, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none', color: 'var(--text2)', fontSize: 12 }}>
              <span>{link.label}</span>
              <ExternalLink size={11} color="var(--text3)" />
            </a>
          ))}
        </div>
      </div>
      <div style={{ padding: '8px 14px 24px', fontSize: 10, color: 'var(--text3)', lineHeight: 1.5 }}>
        ⚠️ General guidance only. Always verify with WDFW, USCG, and NOAA before fishing or boating. Regulations change frequently.
      </div>
    </div>
  )
}
