'use client'
import { useState } from 'react'
import {
  Anchor, Fuel, Wrench, Phone, MapPin, Clock, Ship, Fish,
  Star, ChevronDown, ChevronRight, Waves, Users, Camera,
  Navigation, Wind,
} from 'lucide-react'

// ── Gig Harbor Marina & Boatyard ─────────────────────────────────────────────

const MARINA_SERVICES = [
  { icon: Fuel,    label: 'Fuel Dock',        detail: 'Gas & Diesel · Open daily', color: '#f59e0b' },
  { icon: Ship,    label: 'Travel Lift',       detail: '60-ton haul-out available', color: '#22d3ee' },
  { icon: Wrench,  label: 'Full Service',      detail: 'Engine, fiberglass, electrical, rigging', color: '#8b5cf6' },
  { icon: Anchor,  label: 'Moorage',          detail: 'Transient & long-term slips', color: '#4f7fff' },
  { icon: Ship,    label: 'Dry Storage',       detail: 'Year-round covered storage', color: '#22c07a' },
  { icon: Star,    label: 'Marine Store',      detail: 'Parts, supplies, accessories', color: '#f59e0b' },
]

const WATERFRONT_DINING = [
  { name: "Tides Tavern", type: 'Restaurant & Bar', access: 'Guest dock available', rating: 4.4, note: 'Iconic Gig Harbor institution since 1973. Burgers, seafood, great views.' },
  { name: 'Brix 25°', type: 'Upscale Dining', access: 'Walk from dock', rating: 4.6, note: 'Wine bar & bistro. Elevated Pacific Northwest cuisine.' },
  { name: 'Anthony\'s at Gig Harbor', type: 'Seafood', access: 'Harborview Dr', rating: 4.2, note: 'Fresh PNW seafood. Beautiful harbor views. Family-friendly.' },
  { name: 'The Tides Bar & Grill', type: 'Waterfront Bar', access: 'Walk from marina', rating: 4.1, note: 'Casual dock bar. Great happy hour. Live music weekends.' },
  { name: 'Harbor Lights Bistro', type: 'Breakfast/Lunch', access: 'Downtown', rating: 4.5, note: 'Best breakfast in Gig Harbor. Opens early for boaters.' },
  { name: 'Java & Clay Cafe', type: 'Coffee & Art', access: 'Harborview Dr', rating: 4.7, note: 'Coffee + pottery painting. Unique PNW experience.' },
  { name: 'Kitana Sushi', type: 'Japanese', access: 'Walk from harbor', rating: 4.4, note: 'Fresh sushi with local salmon when in season.' },
]

const ATTRACTIONS = [
  { name: 'Harbor History Museum', desc: 'Maritime history of Gig Harbor, boat-building heritage, local artifacts. Free admission.', icon: Ship },
  { name: 'Gig Harbor Farmer\'s Market', desc: 'Every Saturday May–October at Skansie Park. Local produce, seafood, crafts.', icon: Users },
  { name: 'Kopachuck State Park', desc: '3 miles by boat. Day use, sandy beach, clamming. Anchor in the bay.', icon: Anchor },
  { name: 'Jerisich Public Dock', desc: 'Free city dock for short-term tie-up. Heart of the waterfront. Public restrooms nearby.', icon: Navigation },
  { name: 'Heritage Distilling', desc: 'Award-winning craft spirits. Tours available. Tasting room downtown.', icon: Star },
  { name: 'Gig Harbor Brewing', desc: 'Craft brewery with harbor views. Great selection of PNW ales and lagers.', icon: Star },
]

const MARINA_CONTACTS = [
  { label: 'Gig Harbor Marina & Boatyard', phone: '(253) 858-4439', address: '3220 Harborview Dr', vhf: '16 → 68' },
  { label: "Arabella's Landing", phone: '(253) 851-1793', address: '3323 Harborview Dr', vhf: '16 → 66A' },
  { label: 'Peninsula Yacht Basin', phone: '(253) 858-2236', address: '3628 Harborview Dr', vhf: '16' },
  { label: 'Jerisich Public Dock', phone: '(253) 851-6170', address: 'City of Gig Harbor', vhf: '—' },
]

const FUEL_PRICES_NOTE = 'Call ahead for current fuel prices — Gig Harbor Marina & Boatyard (253) 858-4439'

// ── Other Marinas Nearby ──────────────────────────────────────────────────────

const NEARBY_MARINAS = [
  { name: 'Port of Tacoma / Dock Street', dist: '6 nm SE', fuel: 'Diesel', phone: '(253) 383-5841' },
  { name: 'Percival Landing, Olympia', dist: '40 nm S', fuel: 'Gas & Diesel', phone: '(360) 753-8380' },
  { name: 'Port Orchard Marina', dist: '15 nm NE', fuel: 'Gas & Diesel', phone: '(360) 876-5535' },
  { name: 'Bremerton Marina', dist: '18 nm NE', fuel: 'Diesel', phone: '(360) 373-1035' },
  { name: 'Poulsbo Marina', dist: '24 nm NE', fuel: 'Gas & Diesel', phone: '(360) 779-3505' },
  { name: 'Quartermaster Harbor (Vashon)', dist: '12 nm N', fuel: 'None — anchorage', phone: '—' },
]

// ── Harbor Conditions ─────────────────────────────────────────────────────────

function HarborMap() {
  return (
    <div style={{
      background: 'rgba(13,15,20,0.8)', border: '1px solid rgba(34,211,238,0.2)',
      borderRadius: 10, padding: 12, marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <MapPin size={13} color="#22d3ee" />
        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: 0.8, color: '#22d3ee' }}>
          GIG HARBOR — MARINA LOCATIONS
        </span>
      </div>
      {/* Simple marina location guide */}
      <div style={{ position: 'relative', background: 'rgba(34,211,238,0.04)', borderRadius: 8, padding: 10, height: 160, overflow: 'hidden' }}>
        {/* Water representation */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(34,211,238,0.06) 0%, rgba(79,127,255,0.04) 100%)', borderRadius: 8 }} />
        {/* Harbor entrance indicator */}
        <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: '#5a6080', fontFamily: 'Barlow Condensed, sans-serif' }}>
          HARBOR ENTRANCE ↓ (Puget Sound)
        </div>
        {/* Marina markers positioned roughly as they appear in the harbor */}
        {[
          { name: 'Gig Harbor Marina & Boatyard', x: '72%', y: '28%', color: '#f59e0b', fuel: true },
          { name: "Arabella's Landing", x: '42%', y: '38%', color: '#22d3ee', fuel: true },
          { name: 'Peninsula Yacht Basin', x: '28%', y: '22%', color: '#4f7fff', fuel: false },
          { name: 'Jerisich Dock', x: '48%', y: '52%', color: '#22c07a', fuel: false },
          { name: "Tides Tavern Dock", x: '38%', y: '60%', color: '#8b5cf6', fuel: false },
        ].map(m => (
          <div key={m.name} style={{ position: 'absolute', left: m.x, top: m.y, transform: 'translate(-50%, -50%)' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: m.color,
              border: '2px solid rgba(255,255,255,0.8)',
              boxShadow: `0 0 8px ${m.color}`,
            }} title={m.name} />
            {m.fuel && (
              <div style={{
                position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                fontSize: 7, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, whiteSpace: 'nowrap',
              }}>FUEL</div>
            )}
          </div>
        ))}
        {/* Legend */}
        <div style={{ position: 'absolute', top: 6, left: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[
            { color: '#f59e0b', label: 'Full Service + Fuel' },
            { color: '#22d3ee', label: 'Fuel + Moorage' },
            { color: '#22c07a', label: 'Public Dock' },
            { color: '#4f7fff', label: 'Moorage' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: l.color }} />
              <span style={{ fontSize: 8, color: '#9299b5' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 9, color: '#5a6080', textAlign: 'center' }}>
        Harbor layout approximate — call ahead for slip availability
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function GigHarborMarina() {
  const [expandedSection, setExpandedSection] = useState<string | null>('marinas')

  function Section({ id, title, icon: Icon, children }: { id: string; title: string; icon: React.ElementType; children: React.ReactNode }) {
    const open = expandedSection === id
    return (
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => setExpandedSection(open ? null : id)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            background: open ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${open ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
          }}
        >
          <Icon size={13} color={open ? '#22d3ee' : '#5a6080'} />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: open ? '#e8eaed' : '#9299b5', flex: 1, textAlign: 'left' }}>
            {title}
          </span>
          {open ? <ChevronDown size={12} color="#5a6080" /> : <ChevronRight size={12} color="#5a6080" />}
        </button>
        {open && (
          <div style={{ marginTop: 8, padding: '2px 4px' }}>
            {children}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Hero header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(34,211,238,0.1), rgba(79,127,255,0.1))',
        border: '1px solid rgba(34,211,238,0.2)', borderRadius: 12, padding: '14px 14px', marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(79,127,255,0.2))',
            border: '1px solid rgba(34,211,238,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Anchor size={20} color="#22d3ee" />
          </div>
          <div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800, letterSpacing: 1, color: '#e8eaed' }}>
              GIG HARBOR
            </div>
            <div style={{ fontSize: 10, color: '#22d3ee', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: 0.5 }}>
              THE MARITIME GEM OF PUGET SOUND
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#9299b5' }}>47.3325°N</div>
            <div style={{ fontSize: 11, color: '#9299b5' }}>122.5749°W</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#9299b5', lineHeight: 1.5 }}>
          Gig Harbor is one of Puget Sound's most beloved boat-in communities. The protected harbor offers excellent transient moorage, full-service facilities, and a thriving waterfront with restaurants, shops, and maritime history.
        </div>
      </div>

      {/* Harbor map */}
      <HarborMap />

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
        {[
          { label: 'Fuel Docks', value: '2', sub: 'Gas & Diesel', color: '#f59e0b' },
          { label: 'Marinas', value: '4+', sub: 'Transient slips', color: '#22d3ee' },
          { label: 'Restaurants', value: '15+', sub: 'Waterfront access', color: '#22c07a' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 6px', textAlign: 'center', border: `1px solid ${s.color}22` }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: '#5a6080', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: 0.3 }}>{s.label}</div>
            <div style={{ fontSize: 9, color: '#5a6080' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Marinas & Fuel */}
      <Section id="marinas" title="MARINAS & FUEL DOCKS" icon={Anchor}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MARINA_CONTACTS.map(m => (
            <div key={m.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color: '#e8eaed', marginBottom: 4 }}>{m.label}</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={10} color="#5a6080" />
                  <span style={{ fontSize: 10, color: '#9299b5', fontFamily: 'JetBrains Mono, monospace' }}>{m.phone}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={10} color="#5a6080" />
                  <span style={{ fontSize: 10, color: '#9299b5' }}>{m.address}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Wind size={10} color="#5a6080" />
                  <span style={{ fontSize: 10, color: '#4f7fff', fontFamily: 'JetBrains Mono, monospace' }}>VHF {m.vhf}</span>
                </div>
              </div>
            </div>
          ))}
          <div style={{ padding: '8px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: 7, border: '1px solid rgba(245,158,11,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Fuel size={11} color="#f59e0b" />
              <span style={{ fontSize: 10, color: '#f59e0b' }}>{FUEL_PRICES_NOTE}</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Full Service Boatyard */}
      <Section id="boatyard" title="GIG HARBOR MARINA & BOATYARD" icon={Wrench}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
          {MARINA_SERVICES.map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '9px 10px', border: `1px solid ${s.color}22` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <Icon size={12} color={s.color} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: 0.3 }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 10, color: '#9299b5' }}>{s.detail}</div>
              </div>
            )
          })}
        </div>
        <div style={{ padding: '8px 10px', background: 'rgba(34,211,238,0.06)', borderRadius: 7, border: '1px solid rgba(34,211,238,0.15)' }}>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, color: '#22d3ee', marginBottom: 4 }}>QUICK CONTACT</div>
          <div style={{ fontSize: 11, color: '#9299b5' }}>3220 Harborview Dr, Gig Harbor WA 98332</div>
          <div style={{ fontSize: 11, color: '#22d3ee', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>(253) 858-4439</div>
        </div>
      </Section>

      {/* Waterfront Dining */}
      <Section id="dining" title="WATERFRONT DINING" icon={Star}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {WATERFRONT_DINING.map(r => (
            <div key={r.name} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '9px 11px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 3 }}>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color: '#e8eaed' }}>{r.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                  <Star size={10} color="#f59e0b" />
                  <span style={{ fontSize: 10, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{r.rating}</span>
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#22d3ee', marginBottom: 3, fontFamily: 'Barlow Condensed, sans-serif' }}>{r.type} · {r.access}</div>
              <div style={{ fontSize: 10, color: '#9299b5', lineHeight: 1.4 }}>{r.note}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Attractions */}
      <Section id="attractions" title="ATTRACTIONS & ACTIVITIES" icon={Camera}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {ATTRACTIONS.map(a => {
            const Icon = a.icon
            return (
              <div key={a.name} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <Icon size={13} color="#8b5cf6" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color: '#e8eaed', marginBottom: 2 }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: '#9299b5', lineHeight: 1.4 }}>{a.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* Nearby Marinas */}
      <Section id="nearby" title="NEARBY FUEL & MARINAS" icon={Navigation}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {NEARBY_MARINAS.map(m => (
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 7, border: '1px solid rgba(255,255,255,0.05)' }}>
              <Fuel size={11} color={m.fuel !== 'None — anchorage' ? '#f59e0b' : '#5a6080'} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif' }}>{m.name}</div>
                <div style={{ fontSize: 10, color: '#9299b5' }}>{m.fuel}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: '#22d3ee', fontFamily: 'JetBrains Mono, monospace' }}>{m.dist}</div>
                <div style={{ fontSize: 9, color: '#5a6080' }}>{m.phone}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Fishing from Gig Harbor */}
      <Section id="fishing" title="FISHING FROM GIG HARBOR" icon={Fish}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { spot: 'Gig Harbor Entrance', nm: '0.5 nm', species: 'Coho Salmon (Aug–Oct)', detail: 'Fish the mouth at dawn and dusk. Small spoons work well.' },
            { spot: 'Tacoma Narrows', nm: '4 nm SE', species: 'Chinook, Lingcod, Rockfish', detail: 'Fish tidal rips on ebb. 40–80 ft depth near structure.' },
            { spot: 'Point Defiance', nm: '5 nm SE', species: 'Chinook Salmon, Lingcod', detail: 'Classic Puget Sound salmon fishery. Best June–September.' },
            { spot: 'Henderson Bay', nm: '5 nm SW', species: 'Dungeness Crab, Flounder', detail: 'Protected bay good for crabbing. Muddy bottom 30–50 ft.' },
            { spot: 'Commencement Bay', nm: '7 nm SE', species: 'Chinook, Coho, Chum', detail: 'Salmon stage here in late summer. Good for casting spoons.' },
          ].map(f => (
            <div key={f.spot} style={{ padding: '8px 10px', background: 'rgba(34,211,238,0.05)', borderRadius: 7, border: '1px solid rgba(34,211,238,0.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color: '#e8eaed' }}>{f.spot}</span>
                <span style={{ fontSize: 10, color: '#22d3ee', fontFamily: 'JetBrains Mono, monospace' }}>{f.nm}</span>
              </div>
              <div style={{ fontSize: 10, color: '#22d3ee', marginBottom: 2, fontFamily: 'Barlow Condensed, sans-serif' }}>{f.species}</div>
              <div style={{ fontSize: 10, color: '#9299b5' }}>{f.detail}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Pro tip */}
      <div style={{ padding: '10px 12px', background: 'rgba(79,127,255,0.06)', borderRadius: 8, border: '1px solid rgba(79,127,255,0.15)', marginTop: 4 }}>
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: '#4f7fff', marginBottom: 4 }}>LOCAL PRO TIP</div>
        <div style={{ fontSize: 11, color: '#9299b5', lineHeight: 1.5 }}>
          Tie up at Jerisich Dock (free, 4-hour limit) for a quick lunch or explore downtown. For dinner, call ahead to Tides Tavern and ask about their guest dock — parking by boat beats parking by car every time.
        </div>
      </div>
    </div>
  )
}
