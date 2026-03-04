'use client'
import { useState } from 'react'
import {
  Anchor, Fuel, Wrench, Phone, MapPin, Clock, Ship, Fish,
  Star, ChevronDown, ChevronRight, Users, Youtube, Instagram,
  Facebook, ExternalLink, Award, Shield, Navigation, Wind,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// DATA — from gigharbormarina.com
// ─────────────────────────────────────────────────────────────────────────────

const SERVICES = [
  { label: 'Haul-Out & Repair', detail: '60-ton travel lift • Bottom paint • Full hull work', icon: Ship, color: '#22d3ee' },
  { label: 'Fuel Dock', detail: 'Gas & Diesel — call for current prices', icon: Fuel, color: '#f59e0b' },
  { label: 'Electrical Systems', detail: 'Diagnostics & repair — Lawrence on staff', icon: Wrench, color: '#8b5cf6' },
  { label: 'Engine Service', detail: 'Diesel auxiliary • Raw water hose • Transmission', icon: Wrench, color: '#22c07a' },
  { label: 'Propeller Work', detail: 'Repair & service • Zinc replacement', icon: Ship, color: '#4f7fff' },
  { label: 'Thru-Hull Work', detail: 'Installation & replacement — Kevin specialist', icon: Wrench, color: '#f25a5a' },
  { label: 'Moorage', detail: 'Covered & uncovered slips • Transient guest slips', icon: Anchor, color: '#22d3ee' },
  { label: 'Dry Storage', detail: 'Secure on-site storage during repairs', icon: Shield, color: '#9299b5' },
]

const ACCOMMODATIONS = [
  { name: 'The Guest House @ the Boatyard', type: 'VRBO Rental', detail: '1,700 sq ft private house on the property', link: 'https://gigharbormarina.com', icon: '🏠' },
  { name: 'Fleet Suites @ the Boatyard', type: 'Nightly Yacht Rental', detail: 'Sleep aboard — unique PNW experience', link: 'https://gigharbormarina.com', icon: '⛵' },
  { name: 'Suite Dreams', type: 'Monthly Rental', detail: 'Month-long yacht accommodation', link: 'https://gigharbormarina.com', icon: '🌙' },
]

const EVENTS = [
  { name: 'The Club @ the Boatyard', capacity: '50–200 guests', detail: 'Private events, corporate gatherings, celebrations. Downtown Gig Harbor location.', icon: Users },
  { name: 'The Academy @ the Boatyard', capacity: 'Small groups', detail: 'Study groups, tutoring, school events, community gatherings.', icon: Star },
]

const TEAM = [
  { name: 'Patrick', role: 'Yard Manager', note: 'Navy veteran, 20+ years service' },
  { name: 'Kevin', role: 'Thru-Hull Specialist', note: '' },
  { name: 'Lawrence', role: 'Electrical Systems', note: '' },
  { name: 'Mark', role: 'Lift Operations', note: '' },
  { name: 'Cheryl H.', role: 'Hospitality', note: '' },
  { name: 'Michael, Justin, Mia, Nicco, Mike, David', role: 'Crew', note: '' },
]

const BRANDS = [
  'Pettit', 'Raymarine', 'Fisheries Supply', 'Northern Lights',
  'FLIR', 'Dometic', 'Tacoma Propeller', 'Pacific Power Group',
  'Land & Sea', 'Gemeco', 'SeaMar', 'Harbor Marine',
]

const AWARDS = [
  { year: '2024', award: 'Gold — Best Boatyard', source: 'Best of the PNW' },
  { year: '2024', award: 'Silver — Best Marina', source: 'Best of the PNW' },
  { year: '2023', award: 'Silver — Best Boatyard', source: 'Best in the PNW' },
]

const CERTS = [
  { label: 'ABYC Certified', color: '#22d3ee' },
  { label: 'Clean Marina Washington', color: '#22c07a' },
  { label: 'Clean Boating Foundation', color: '#22c07a' },
  { label: 'NWMTA Member', color: '#4f7fff' },
]

const WATERFRONT_DINING = [
  { name: 'Tides Tavern', rating: 4.4, type: 'Restaurant & Bar', note: 'Iconic since 1973. Guest dock. Burgers & seafood.' },
  { name: 'Brix 25°', rating: 4.6, type: 'Wine Bar & Bistro', note: 'Elevated Pacific Northwest cuisine.' },
  { name: "Anthony's at Gig Harbor", rating: 4.2, type: 'Seafood', note: 'Fresh PNW seafood, harbor views.' },
  { name: 'The Tides Bar & Grill', rating: 4.1, type: 'Waterfront Bar', note: 'Happy hour, live music weekends.' },
  { name: 'Harbor Lights Bistro', rating: 4.5, type: 'Breakfast/Lunch', note: 'Opens early for boaters.' },
  { name: 'Java & Clay Cafe', rating: 4.7, type: 'Coffee', note: 'Best coffee on the waterfront.' },
  { name: 'The Trolley @ the Boatyard', rating: 4.3, type: 'Food Truck', note: 'Fish & chips — right at the marina.' },
]

const NEARBY_FUEL = [
  { name: "Arabella's Landing", dist: '0.1 nm', fuel: 'Gas', vhf: '66A', phone: '(253) 851-1793' },
  { name: 'Dock Street Marina, Tacoma', dist: '6 nm SE', fuel: 'Gas & Diesel', phone: '(253) 383-5841' },
  { name: 'Port Orchard Marina', dist: '15 nm NE', fuel: 'Gas & Diesel', phone: '(360) 876-5535' },
  { name: 'Bremerton Marina', dist: '18 nm NE', fuel: 'Diesel', phone: '(360) 373-1035' },
  { name: 'Poulsbo Marina', dist: '24 nm NE', fuel: 'Gas & Diesel', phone: '(360) 779-3505' },
  { name: 'Port Townsend Boat Haven', dist: '50 nm N', fuel: 'Gas & Diesel', phone: '(360) 385-2355' },
]

const FISHING_SPOTS = [
  { spot: 'Gig Harbor Entrance', dist: '0.5 nm', species: 'Coho Salmon', season: 'Aug–Oct', tip: 'Dawn/dusk, small spoons.' },
  { spot: 'Tacoma Narrows', dist: '4 nm SE', species: 'Chinook, Lingcod', season: 'May–Sept', tip: 'Fish tidal rips at ebb, 40–80 ft.' },
  { spot: 'Point Defiance', dist: '5 nm SE', species: 'Chinook Salmon', season: 'Jun–Sept', tip: 'Downriggers, 60–90 ft.' },
  { spot: 'Henderson Bay', dist: '5 nm SW', species: 'Dungeness Crab', season: 'Jul–Sept', tip: 'Pots at 30–50 ft on muddy bottom.' },
  { spot: 'Commencement Bay', dist: '7 nm SE', species: 'Coho, Chum', season: 'Aug–Nov', tip: 'Coho stage late summer, spoons.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// SECTION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function Sec({ id, title, icon: Icon, color = '#22d3ee', open: defaultOpen = false, children }: {
  id: string; title: string; icon: React.ElementType; color?: string; open?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          background: open ? `${color}10` : 'rgba(255,255,255,0.03)',
          border: `1px solid ${open ? `${color}30` : 'rgba(255,255,255,0.07)'}`,
          borderRadius: 10, padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        <Icon size={13} color={open ? color : '#5a6080'} />
        <span style={{ flex: 1, textAlign: 'left', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: open ? '#e8eaed' : '#9299b5' }}>
          {title}
        </span>
        {open ? <ChevronDown size={12} color="#5a6080" /> : <ChevronRight size={12} color="#5a6080" />}
      </button>
      {open && <div style={{ marginTop: 8, paddingLeft: 2 }}>{children}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function GigHarborMarina() {
  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(34,211,238,0.1) 0%, rgba(79,127,255,0.06) 100%)',
        border: '1px solid rgba(34,211,238,0.2)', borderRadius: 14, padding: '16px 14px', marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(79,127,255,0.2))',
            border: '1px solid rgba(34,211,238,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Anchor size={22} color="#22d3ee" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 17, fontWeight: 800, letterSpacing: 1, color: '#e8eaed', lineHeight: 1.1 }}>
              GIG HARBOR MARINA
            </div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, color: '#22d3ee', letterSpacing: 0.5 }}>
              & BOATYARD
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#5a6080', textAlign: 'right' }}>Gig Harbor's</div>
            <div style={{ fontSize: 11, color: '#22d3ee', textAlign: 'right', fontWeight: 700 }}>LARGEST MARINA</div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#9299b5', lineHeight: 1.5, marginBottom: 12 }}>
          Full-service boatyard at the harbor entrance — just inside on the left. Gold winner for Best Boatyard 2024. ABYC certified with a dedicated, Navy-veteran-led team.
        </div>

        {/* Quick contact */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <a href="tel:2538583535" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)',
              borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Phone size={13} color="#22d3ee" />
              <div>
                <div style={{ fontSize: 9, color: '#5a6080' }}>CALL / TEXT</div>
                <div style={{ fontSize: 12, color: '#22d3ee', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>253-858-3535</div>
              </div>
            </div>
          </a>
          <a href="https://gigharbormarina.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'rgba(79,127,255,0.1)', border: '1px solid rgba(79,127,255,0.25)',
              borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <ExternalLink size={13} color="#4f7fff" />
              <div>
                <div style={{ fontSize: 9, color: '#5a6080' }}>BOOK SERVICE</div>
                <div style={{ fontSize: 12, color: '#4f7fff', fontWeight: 700 }}>gigharbormarina.com</div>
              </div>
            </div>
          </a>
        </div>

        {/* Awards & certs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {AWARDS.map(a => (
            <div key={a.award} style={{
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Award size={10} color="#f59e0b" />
              <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700 }}>{a.year} {a.award}</span>
            </div>
          ))}
          {CERTS.map(c => (
            <div key={c.label} style={{
              background: `${c.color}12`, border: `1px solid ${c.color}30`,
              borderRadius: 6, padding: '3px 8px',
            }}>
              <span style={{ fontSize: 9, color: c.color, fontWeight: 600 }}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
        {[
          { label: 'Est.', value: '1990s', color: '#22d3ee' },
          { label: 'Lift', value: '60-ton', color: '#f59e0b' },
          { label: 'Slips', value: 'Full', color: '#22c07a' },
          { label: 'VHF', value: 'CH 16', color: '#4f7fff' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${s.color}20`, borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: '#5a6080', marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Location */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 12px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <MapPin size={14} color="#22d3ee" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e8eaed', marginBottom: 2 }}>3220 Harborview Drive, Gig Harbor WA 98332</div>
          <div style={{ fontSize: 10, color: '#9299b5' }}>Just inside the harbor entrance — largest marina, left side. Near Skansie Brothers Park & historic Netshed.</div>
        </div>
      </div>

      {/* Services */}
      <Sec id="services" title="BOATYARD SERVICES" icon={Wrench} color="#22d3ee" open={true}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {SERVICES.map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '9px 10px', border: `1px solid ${s.color}22` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <Icon size={12} color={s.color} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: 0.3 }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 10, color: '#9299b5', lineHeight: 1.4 }}>{s.detail}</div>
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(34,211,238,0.07)', borderRadius: 8, border: '1px solid rgba(34,211,238,0.15)' }}>
          <div style={{ fontSize: 10, color: '#9299b5' }}>
            Also: Retrofit services, subcontractor network for specialized work. Request a service appointment at{' '}
            <a href="https://gigharbormarina.com" target="_blank" rel="noopener noreferrer" style={{ color: '#22d3ee' }}>gigharbormarina.com</a>
          </div>
        </div>
      </Sec>

      {/* Accommodations */}
      <Sec id="stay" title="STAY AT THE BOATYARD" icon={Star} color="#8b5cf6">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {ACCOMMODATIONS.map(a => (
            <a key={a.name} href={a.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <div style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 9, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{a.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e8eaed', marginBottom: 2 }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: '#8b5cf6', fontWeight: 600, marginBottom: 2 }}>{a.type}</div>
                  <div style={{ fontSize: 10, color: '#9299b5' }}>{a.detail}</div>
                </div>
                <ExternalLink size={11} color="#5a6080" style={{ flexShrink: 0, marginTop: 2 }} />
              </div>
            </a>
          ))}
        </div>
      </Sec>

      {/* Events */}
      <Sec id="events" title="EVENT VENUES" icon={Users} color="#f59e0b">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {EVENTS.map(ev => {
            const Icon = ev.icon
            return (
              <div key={ev.name} style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 9, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <Icon size={12} color="#f59e0b" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif' }}>{ev.name}</span>
                  <span style={{ fontSize: 9, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace', marginLeft: 'auto' }}>{ev.capacity}</span>
                </div>
                <div style={{ fontSize: 10, color: '#9299b5' }}>{ev.detail}</div>
              </div>
            )
          })}
          <div style={{ fontSize: 10, color: '#5a6080', padding: '4px 2px' }}>
            Book events: call 253-858-3535 or visit gigharbormarina.com
          </div>
        </div>
      </Sec>

      {/* Waterfront Dining */}
      <Sec id="dining" title="WATERFRONT DINING" icon={Star} color="#22c07a">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {WATERFRONT_DINING.map(r => (
            <div key={r.name} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif' }}>{r.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                  <Star size={9} color="#f59e0b" />
                  <span style={{ fontSize: 10, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>{r.rating}</span>
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#22c07a', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 2 }}>{r.type}</div>
              <div style={{ fontSize: 10, color: '#9299b5' }}>{r.note}</div>
            </div>
          ))}
        </div>
      </Sec>

      {/* Fishing from Harbor */}
      <Sec id="fishing" title="FISHING FROM GIG HARBOR" icon={Fish} color="#22d3ee">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {FISHING_SPOTS.map(f => (
            <div key={f.spot} style={{ background: 'rgba(34,211,238,0.05)', borderRadius: 7, padding: '8px 10px', border: '1px solid rgba(34,211,238,0.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif' }}>{f.spot}</span>
                <span style={{ fontSize: 10, color: '#22d3ee', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0, marginLeft: 8 }}>{f.dist}</span>
              </div>
              <div style={{ fontSize: 10, color: '#22d3ee', marginBottom: 1 }}>{f.species} · {f.season}</div>
              <div style={{ fontSize: 10, color: '#9299b5' }}>{f.tip}</div>
            </div>
          ))}
        </div>
      </Sec>

      {/* Nearby Fuel */}
      <Sec id="fuel" title="NEARBY FUEL DOCKS" icon={Fuel} color="#f59e0b">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {NEARBY_FUEL.map(f => (
            <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 7, border: '1px solid rgba(255,255,255,0.05)' }}>
              <Fuel size={11} color="#f59e0b" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif' }}>{f.name}</div>
                <div style={{ fontSize: 9, color: '#9299b5' }}>{f.fuel}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: '#22d3ee', fontFamily: 'JetBrains Mono, monospace' }}>{f.dist}</div>
                <div style={{ fontSize: 9, color: '#5a6080' }}>{f.phone}</div>
              </div>
            </div>
          ))}
        </div>
      </Sec>

      {/* Team */}
      <Sec id="team" title="OUR TEAM" icon={Users} color="#4f7fff">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {TEAM.filter(t => t.name.split(',').length === 1).map(t => (
            <div key={t.name} style={{ background: 'rgba(79,127,255,0.07)', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(79,127,255,0.15)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#e8eaed', marginBottom: 1 }}>{t.name}</div>
              <div style={{ fontSize: 10, color: '#4f7fff' }}>{t.role}</div>
              {t.note && <div style={{ fontSize: 9, color: '#5a6080', marginTop: 2 }}>{t.note}</div>}
            </div>
          ))}
        </div>
      </Sec>

      {/* Partner Brands */}
      <Sec id="brands" title="AUTHORIZED BRANDS & PARTNERS" icon={Shield} color="#9299b5">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {BRANDS.map(b => (
            <span key={b} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 10, color: '#9299b5' }}>
              {b}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 10, color: '#5a6080' }}>
          Also partners with TowBoat US Puget Sound for vessel assistance referrals.
        </div>
      </Sec>

      {/* Social */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <a href="https://facebook.com/gigharbormarina" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', flex: 1 }}>
          <div style={{ background: 'rgba(59,89,152,0.15)', border: '1px solid rgba(59,89,152,0.3)', borderRadius: 8, padding: '8px', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Facebook size={13} color="#4f7fff" />
            <span style={{ fontSize: 10, color: '#4f7fff', fontWeight: 700 }}>Facebook</span>
          </div>
        </a>
        <a href="https://instagram.com/gigharbormarina" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', flex: 1 }}>
          <div style={{ background: 'rgba(225,48,108,0.1)', border: '1px solid rgba(225,48,108,0.25)', borderRadius: 8, padding: '8px', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Instagram size={13} color="#e1306c" />
            <span style={{ fontSize: 10, color: '#e1306c', fontWeight: 700 }}>Instagram</span>
          </div>
        </a>
        <a href="https://youtube.com/@boatyardboys" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', flex: 1 }}>
          <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.2)', borderRadius: 8, padding: '8px', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Youtube size={13} color="#ff4444" />
            <span style={{ fontSize: 10, color: '#ff4444', fontWeight: 700 }}>Boatyard Boys</span>
          </div>
        </a>
      </div>

      <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(34,211,238,0.06)', borderRadius: 8, border: '1px solid rgba(34,211,238,0.15)' }}>
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, color: '#22d3ee', letterSpacing: 0.8, marginBottom: 4 }}>PRO TIP</div>
        <div style={{ fontSize: 10, color: '#9299b5', lineHeight: 1.5 }}>
          Tie up at Jerisich Dock (4hr free city dock) for lunch, then motor around to Gig Harbor Marina for fuel or repairs. Watch for the "BOATYARD" sign just inside the harbor entrance on the left.
        </div>
      </div>
    </div>
  )
}
