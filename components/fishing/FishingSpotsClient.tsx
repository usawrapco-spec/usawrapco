'use client'

import { useState } from 'react'
import { MapPin, Navigation, Plus, X, Star, Filter, Anchor, Route } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FishingSpot {
  id: string
  name: string
  region: string
  water_type: string | null
  avg_rating: number | null
  description: string | null
  difficulty: string | null
  access_type: string | null
  lat: number | null
  lng: number | null
}

interface UserWaypoint {
  id: string
  name: string
  lat: number | null
  lng: number | null
  waypoint_type: string | null
  notes: string | null
  is_private: boolean | null
}

interface UserRoute {
  id: string
  name: string
  description: string | null
  total_distance_nm: number | null
  estimated_time_hours: number | null
}

interface Props {
  userId: string
  spots: FishingSpot[]
  waypoints: UserWaypoint[]
  routes: UserRoute[]
}

const WAYPOINT_TYPES = ['fishing', 'anchorage', 'hazard', 'fuel', 'other'] as const
type WaypointType = typeof WAYPOINT_TYPES[number]

const EMPTY_WAYPOINT = {
  name: '',
  lat: '',
  lng: '',
  waypoint_type: 'fishing' as WaypointType,
  notes: '',
  is_private: false,
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating == null) return <span style={{ color: 'var(--text3)', fontSize: 12 }}>No rating</span>
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={12}
          color={n <= Math.round(rating) ? 'var(--amber)' : 'var(--text3)'}
          fill={n <= Math.round(rating) ? 'var(--amber)' : 'none'}
        />
      ))}
      <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 4 }}>{rating.toFixed(1)}</span>
    </div>
  )
}

function waypointTypeColor(t: string | null): string {
  switch (t) {
    case 'fishing': return 'var(--green)'
    case 'anchorage': return 'var(--cyan)'
    case 'hazard': return 'var(--red)'
    case 'fuel': return 'var(--amber)'
    default: return 'var(--text2)'
  }
}

export function FishingSpotsClient({ userId, spots, waypoints: initialWaypoints, routes }: Props) {
  const supabase = createClient()
  const [waypoints, setWaypoints] = useState<UserWaypoint[]>(initialWaypoints)
  const [filterRegion, setFilterRegion] = useState('')
  const [filterWaterType, setFilterWaterType] = useState('')
  const [showWaypointForm, setShowWaypointForm] = useState(false)
  const [waypointForm, setWaypointForm] = useState(EMPTY_WAYPOINT)
  const [saving, setSaving] = useState(false)

  const regions = [...new Set(spots.map(s => s.region).filter(Boolean))]
  const waterTypes = [...new Set(spots.map(s => s.water_type).filter((w): w is string => w !== null))]

  const filteredSpots = spots.filter(s => {
    if (filterRegion && s.region !== filterRegion) return false
    if (filterWaterType && s.water_type !== filterWaterType) return false
    return true
  })

  async function handleSaveWaypoint() {
    if (!waypointForm.name) return
    setSaving(true)
    try {
      const payload = {
        user_id: userId,
        name: waypointForm.name,
        lat: waypointForm.lat ? parseFloat(waypointForm.lat) : null,
        lng: waypointForm.lng ? parseFloat(waypointForm.lng) : null,
        waypoint_type: waypointForm.waypoint_type,
        notes: waypointForm.notes || null,
        is_private: waypointForm.is_private,
      }
      const { data, error } = await supabase.from('user_waypoints').insert(payload).select().single()
      if (!error && data) {
        setWaypoints(prev => [data as UserWaypoint, ...prev])
        setWaypointForm(EMPTY_WAYPOINT)
        setShowWaypointForm(false)
      } else {
        alert('Error saving waypoint: ' + (error?.message ?? 'Unknown'))
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteWaypoint(id: string) {
    if (!confirm('Delete this waypoint?')) return
    await supabase.from('user_waypoints').delete().eq('id', id)
    setWaypoints(prev => prev.filter(w => w.id !== id))
  }

  const iLabel: React.CSSProperties = { fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }
  const iStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid #2a2d3e',
    borderRadius: 6,
    padding: '8px 10px',
    color: 'var(--text1)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MapPin size={24} color="var(--cyan)" />
          <div>
            <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--text1)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
              Fishing Spots
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: 12, margin: 0 }}>{spots.length} spots</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, padding: 14, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Filter size={14} color="var(--text2)" style={{ marginBottom: 2 }} />
        <div style={{ flex: '1 1 160px' }}>
          <label style={iLabel}>Region</label>
          <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} style={iStyle}>
            <option value="">All regions</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <label style={iLabel}>Water type</label>
          <select value={filterWaterType} onChange={e => setFilterWaterType(e.target.value)} style={iStyle}>
            <option value="">All types</option>
            {waterTypes.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <button
          onClick={() => { setFilterRegion(''); setFilterWaterType('') }}
          style={{ background: 'transparent', border: '1px solid var(--surface2)', borderRadius: 6, padding: '8px 12px', color: 'var(--text2)', cursor: 'pointer', fontSize: 12 }}
        >
          Clear
        </button>
      </div>

      {/* Spots Grid */}
      {filteredSpots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text2)' }}>
          <MapPin size={32} color="var(--text3)" style={{ margin: '0 auto 10px', display: 'block' }} />
          <p>No spots match your filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14, marginBottom: 36 }}>
          {filteredSpots.map(spot => (
            <div
              key={spot.id}
              style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <h3 style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 15, margin: 0 }}>{spot.name}</h3>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{spot.region}</span>
                </div>
                {spot.water_type && (
                  <span style={{ background: 'rgba(79,127,255,0.15)', border: '1px solid var(--accent)', borderRadius: 4, padding: '2px 7px', fontSize: 11, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                    {spot.water_type}
                  </span>
                )}
              </div>

              <StarRating rating={spot.avg_rating} />

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {spot.difficulty && (
                  <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', borderRadius: 4, padding: '2px 7px', border: '1px solid #2a2d3e' }}>
                    {spot.difficulty}
                  </span>
                )}
                {spot.access_type && (
                  <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', borderRadius: 4, padding: '2px 7px', border: '1px solid #2a2d3e' }}>
                    {spot.access_type}
                  </span>
                )}
              </div>

              {spot.description && (
                <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>{spot.description}</p>
              )}

              {(spot.lat != null && spot.lng != null) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Navigation size={11} color="var(--text3)" />
                  <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* User Waypoints Section */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Anchor size={18} color="var(--amber)" />
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              My Waypoints
            </h2>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>({waypoints.length})</span>
          </div>
          <button
            onClick={() => setShowWaypointForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--amber)', border: 'none', borderRadius: 8, padding: '7px 14px', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
          >
            <Plus size={14} /> Add Waypoint
          </button>
        </div>

        {waypoints.length === 0 ? (
          <p style={{ color: 'var(--text3)', fontSize: 13, padding: '20px 0' }}>No waypoints saved yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {waypoints.map(wp => (
              <div
                key={wp.id}
                style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Anchor size={16} color={waypointTypeColor(wp.waypoint_type)} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 14 }}>{wp.name}</span>
                    {wp.waypoint_type && (
                      <span style={{ fontSize: 11, color: waypointTypeColor(wp.waypoint_type), background: 'var(--surface2)', borderRadius: 4, padding: '1px 6px', border: '1px solid #2a2d3e', textTransform: 'capitalize' }}>
                        {wp.waypoint_type}
                      </span>
                    )}
                    {wp.is_private && (
                      <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', borderRadius: 4, padding: '1px 6px', border: '1px solid #2a2d3e' }}>
                        Private
                      </span>
                    )}
                  </div>
                  {(wp.lat != null && wp.lng != null) && (
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                    </span>
                  )}
                  {wp.notes && <p style={{ fontSize: 12, color: 'var(--text2)', margin: '2px 0 0' }}>{wp.notes}</p>}
                </div>
                <button
                  onClick={() => handleDeleteWaypoint(wp.id)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, flexShrink: 0 }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Routes Section */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Route size={18} color="var(--purple)" />
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
            My Routes
          </h2>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>({routes.length})</span>
        </div>

        {routes.length === 0 ? (
          <p style={{ color: 'var(--text3)', fontSize: 13, padding: '20px 0' }}>No routes saved yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {routes.map(route => (
              <div
                key={route.id}
                style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Route size={16} color="var(--purple)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 14 }}>{route.name}</span>
                  <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                    {route.total_distance_nm != null && (
                      <span style={{ fontSize: 12, color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {route.total_distance_nm} nm
                      </span>
                    )}
                    {route.estimated_time_hours != null && (
                      <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>
                        ~{route.estimated_time_hours}h
                      </span>
                    )}
                  </div>
                  {route.description && <p style={{ fontSize: 12, color: 'var(--text2)', margin: '4px 0 0' }}>{route.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Waypoint Modal */}
      {showWaypointForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: 'var(--text1)', fontSize: 18, fontWeight: 700, margin: 0 }}>Add Waypoint</h2>
              <button onClick={() => setShowWaypointForm(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={iLabel}>Name *</label>
                <input
                  placeholder="Waypoint name"
                  value={waypointForm.name}
                  onChange={e => setWaypointForm(f => ({ ...f, name: e.target.value }))}
                  style={iStyle}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={iLabel}>Latitude</label>
                  <input
                    type="number"
                    step="0.00001"
                    placeholder="47.6062"
                    value={waypointForm.lat}
                    onChange={e => setWaypointForm(f => ({ ...f, lat: e.target.value }))}
                    style={iStyle}
                  />
                </div>
                <div>
                  <label style={iLabel}>Longitude</label>
                  <input
                    type="number"
                    step="0.00001"
                    placeholder="-122.3321"
                    value={waypointForm.lng}
                    onChange={e => setWaypointForm(f => ({ ...f, lng: e.target.value }))}
                    style={iStyle}
                  />
                </div>
              </div>
              <div>
                <label style={iLabel}>Type</label>
                <select
                  value={waypointForm.waypoint_type}
                  onChange={e => setWaypointForm(f => ({ ...f, waypoint_type: e.target.value as WaypointType }))}
                  style={iStyle}
                >
                  {WAYPOINT_TYPES.map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={iLabel}>Notes</label>
                <textarea
                  rows={3}
                  placeholder="Any notes about this waypoint..."
                  value={waypointForm.notes}
                  onChange={e => setWaypointForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ ...iStyle, resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="wp-private"
                  checked={waypointForm.is_private}
                  onChange={e => setWaypointForm(f => ({ ...f, is_private: e.target.checked }))}
                />
                <label htmlFor="wp-private" style={{ color: 'var(--text1)', fontSize: 13, cursor: 'pointer' }}>Private waypoint</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowWaypointForm(false)}
                style={{ background: 'transparent', border: '1px solid var(--surface2)', borderRadius: 8, padding: '8px 16px', color: 'var(--text2)', cursor: 'pointer', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWaypoint}
                disabled={saving}
                style={{ background: 'var(--amber)', border: 'none', borderRadius: 8, padding: '8px 20px', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving...' : 'Save Waypoint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
