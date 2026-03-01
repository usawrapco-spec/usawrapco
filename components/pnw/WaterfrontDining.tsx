'use client'
import { useState } from 'react'
import { MapPin, Anchor, Phone, Clock, Star, Waves, ChevronDown, ChevronUp } from 'lucide-react'

interface DiningLocation {
  id: string
  name: string
  type: 'restaurant' | 'anchorage' | 'marina'
  address?: string
  phone?: string
  hours?: string
  description: string
  moorage?: string
  depth_ft?: number
  amenities: string[]
  lat: number
  lng: number
  rating?: number
  notes?: string
}

const LOCATIONS: DiningLocation[] = [
  {
    id: 'tides-tavern',
    name: 'Tides Tavern',
    type: 'restaurant',
    address: '2925 Harborview Dr, Gig Harbor, WA 98335',
    phone: '(253) 858-3982',
    hours: 'Mon–Thu 11am–10pm, Fri–Sat 11am–11pm, Sun 11am–10pm',
    description: 'Iconic waterfront bar and grill with guest dock. Arrive by boat for the full Gig Harbor experience. Burgers, fish & chips, and local beer on draft.',
    moorage: 'Guest dock available — call ahead for space. Limited to 2 hrs during peak season.',
    depth_ft: 12,
    amenities: ['Guest dock', 'Full bar', 'Food', 'Live music weekends'],
    lat: 47.3368, lng: -122.5826,
    rating: 4.3,
    notes: 'The most boat-accessible restaurant in Gig Harbor. VHF Ch 16.'
  },
  {
    id: 'jerisich-park',
    name: 'Jerisich Park Dock',
    type: 'anchorage',
    address: 'Harborview Dr, Gig Harbor, WA 98335',
    description: 'City of Gig Harbor public dock. Short-term moorage for restaurant access. Walking distance to Harbor Cafe, Gig Harbor Brewing, and downtown shops.',
    moorage: 'Public moorage — 4 hr max during summer. Free.',
    depth_ft: 10,
    amenities: ['Public dock', 'Restrooms', 'Walking distance to dining', 'Pump-out station'],
    lat: 47.3362, lng: -122.5831,
    notes: 'Free pump-out station available at the dock.'
  },
  {
    id: 'skansie-moorage',
    name: 'Skansie Brothers Park',
    type: 'anchorage',
    address: 'Harborview Dr, Gig Harbor, WA',
    description: 'Historic Croatian-built moorage in the heart of Gig Harbor. Netshed-lined waterfront with excellent lunch access to downtown.',
    moorage: 'Temporary moorage only. No overnight.',
    depth_ft: 8,
    amenities: ['Historic netshed area', 'Photo ops', 'Downtown access'],
    lat: 47.3355, lng: -122.5838,
    notes: 'Named for the Skansie family who built the original net sheds in the 1920s.'
  },
  {
    id: 'henderson-bay',
    name: 'Henderson Bay Anchorage',
    type: 'anchorage',
    description: 'Calm, protected anchorage in upper Henderson Bay. Good holding in mud bottom. Popular weekend anchorage for boaters from Tacoma and Olympia.',
    moorage: 'Anchor out — no facilities. Great crabbing and clamming at low tide.',
    depth_ft: 20,
    amenities: ['Excellent crabbing', 'Good clamming', 'Calm protected water', 'Room for 15+ boats'],
    lat: 47.3810, lng: -122.6115,
    notes: 'Best anchorage in South Puget Sound for calm overnight stays.'
  },
  {
    id: 'penrose-point',
    name: 'Penrose Point State Park',
    type: 'anchorage',
    description: 'State park with mooring buoys and anchorage in Mayo Cove. Excellent clam digging and hiking. One of the best family overnight destinations in South Sound.',
    moorage: '10 mooring buoys ($20/night). Anchoring permitted. Can get crowded in summer.',
    depth_ft: 18,
    amenities: ['Mooring buoys', 'Campsites', 'Clam digging', 'Hiking trails', 'Beach'],
    lat: 47.2604, lng: -122.7283,
    notes: 'Washington State Parks mooring buoys. Reserve in advance at recreation.gov.'
  },
  {
    id: 'jarrell-cove',
    name: 'Jarrell Cove State Park',
    type: 'anchorage',
    description: 'Sheltered cove on Harstine Island. 14 mooring buoys plus dock space. Great kayaking, crabbing, and peaceful overnight anchorage.',
    moorage: '14 mooring buoys, dock with water/power ($30/night). First-come basis.',
    depth_ft: 24,
    amenities: ['Mooring buoys', 'Shore power', 'Water hookup', 'Kayak launch', 'Crabbing'],
    lat: 47.2789, lng: -122.8812,
    notes: 'One of the best-equipped state park docks in South Puget Sound.'
  },
  {
    id: 'harbor-brewery',
    name: 'Gig Harbor Brewing Company',
    type: 'restaurant',
    address: '5812 Soundview Dr, Gig Harbor, WA 98335',
    phone: '(253) 649-6679',
    hours: 'Sun–Thu 11am–9pm, Fri–Sat 11am–10pm',
    description: 'Award-winning craft brewery with harbor views. No dock access — dinghy in or use Jerisich Park dock and walk. Excellent food and local beer selection.',
    amenities: ['Craft beer', 'Full menu', 'Patio', 'Harbor views'],
    lat: 47.3356, lng: -122.5793,
    rating: 4.5,
    notes: 'Walk or dinghy from Jerisich Park dock — about 3 blocks.'
  },
  {
    id: 'mcmicken-island',
    name: 'McMicken Island State Park',
    type: 'anchorage',
    description: 'Small island accessible only by boat. Tombolo beach appears at low tide connecting to Harstine Island. Excellent geoduck, oyster, and clam harvesting.',
    moorage: 'Anchor off west shore in 10–20 ft. No buoys — exposed to westerly swell.',
    depth_ft: 15,
    amenities: ['Beach camping', 'Shellfish harvesting', 'Tidepooling', 'Geoduck digging'],
    lat: 47.2456, lng: -122.8423,
    notes: 'Check biotoxin hotline before harvesting shellfish: 1-800-562-5632.'
  },
]

export default function WaterfrontDining() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>('All')

  const filters = ['All', 'Restaurants', 'Anchorages']
  const filtered = (locations: DiningLocation[]) => {
    if (activeFilter === 'Restaurants') return locations.filter(l => l.type === 'restaurant')
    if (activeFilter === 'Anchorages') return locations.filter(l => l.type === 'anchorage')
    return locations
  }

  const displayed = filtered(LOCATIONS)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: 0.5, fontWeight: 600,
              background: activeFilter === f ? 'rgba(34,211,238,0.15)' : 'transparent',
              border: `1px solid ${activeFilter === f ? '#22d3ee' : 'rgba(255,255,255,0.12)'}`,
              color: activeFilter === f ? '#22d3ee' : 'var(--text2)'
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {displayed.map(loc => {
          const isOpen = expanded === loc.id
          const typeColor = loc.type === 'restaurant' ? '#f59e0b' : loc.type === 'anchorage' ? '#22d3ee' : '#22c07a'
          const TypeIcon = loc.type === 'restaurant' ? Star : Anchor
          return (
            <div
              key={loc.id}
              style={{
                background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, overflow: 'hidden',
              }}
            >
              {/* Header row */}
              <button
                onClick={() => setExpanded(isOpen ? null : loc.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', background: 'transparent', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <TypeIcon size={15} color={typeColor} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: 'var(--text1)', letterSpacing: '0.3px' }}>
                    {loc.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                    {loc.type === 'restaurant' ? 'Restaurant' : loc.type === 'anchorage' ? 'Anchorage' : 'Marina'}
                    {loc.depth_ft ? ` · ${loc.depth_ft} ft depth` : ''}
                    {loc.rating ? ` · ${loc.rating} ★` : ''}
                  </div>
                </div>
                {isOpen ? <ChevronUp size={14} color="var(--text3)" /> : <ChevronDown size={14} color="var(--text3)" />}
              </button>

              {/* Expanded details */}
              {isOpen && (
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, margin: '10px 0 8px' }}>
                    {loc.description}
                  </p>
                  {loc.moorage && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                      <Anchor size={12} color="#22d3ee" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--text2)' }}>{loc.moorage}</span>
                    </div>
                  )}
                  {loc.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <MapPin size={12} color="var(--text3)" />
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{loc.address}</span>
                    </div>
                  )}
                  {loc.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Phone size={12} color="var(--text3)" />
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{loc.phone}</span>
                    </div>
                  )}
                  {loc.hours && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Clock size={12} color="var(--text3)" />
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{loc.hours}</span>
                    </div>
                  )}
                  {loc.amenities.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {loc.amenities.map(a => (
                        <span key={a} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'var(--text2)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                  {loc.notes && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <Waves size={12} color="#4f7fff" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--accent)', fontStyle: 'italic' }}>{loc.notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
