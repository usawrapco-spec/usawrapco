'use client'

import { useState } from 'react'
import { BookOpen, Filter, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react'

interface Regulation {
  id: string
  species_id: string | null
  region: string | null
  water_type: string | null
  season_open: string | null
  season_close: string | null
  daily_limit: number | null
  size_limit_inches_min: number | null
  hatchery_only: boolean | null
  gear_restrictions: string[] | null
  last_verified: string | null
  source_url: string | null
  notes: string | null
}

interface Species {
  id: string
  common_name: string
  category: string
}

interface Props {
  regulations: Regulation[]
  species: Species[]
}

function isSeasonOpen(open: string | null, close: string | null, today: string): boolean | null {
  if (!open && !close) return null
  if (!open || !close) return null
  // Handle MM-DD ranges (e.g., "06-01" to "09-30")
  const todayMD = today.slice(5) // MM-DD
  if (open <= close) {
    return todayMD >= open && todayMD <= close
  }
  // Wraps year (e.g., Nov–Feb)
  return todayMD >= open || todayMD <= close
}

function SeasonBadge({ open, close, today }: { open: string | null; close: string | null; today: string }) {
  const status = isSeasonOpen(open, close, today)
  if (status === null) return null
  return status ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(34,192,122,0.12)', border: '1px solid var(--green)', borderRadius: 5, padding: '2px 8px', fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>
      <CheckCircle size={10} /> Open
    </span>
  ) : (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(242,90,90,0.12)', border: '1px solid var(--red)', borderRadius: 5, padding: '2px 8px', fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>
      <AlertCircle size={10} /> Closed
    </span>
  )
}

export function FishingRegulationsClient({ regulations, species }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [filterSpecies, setFilterSpecies] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterWaterType, setFilterWaterType] = useState('')

  const speciesMap = new Map(species.map(s => [s.id, s]))

  const regions = [...new Set(regulations.map(r => r.region).filter((v): v is string => v !== null))]
  const waterTypes = [...new Set(regulations.map(r => r.water_type).filter((v): v is string => v !== null))]

  const filtered = regulations.filter(r => {
    if (filterSpecies && r.species_id !== filterSpecies) return false
    if (filterRegion && r.region !== filterRegion) return false
    if (filterWaterType && r.water_type !== filterWaterType) return false
    return true
  })

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
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <BookOpen size={24} color="var(--amber)" />
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--text1)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
            Fishing Regulations
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 12, margin: 0 }}>{regulations.length} rules on file</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, padding: 14, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Filter size={14} color="var(--text2)" style={{ marginBottom: 2 }} />
        <div style={{ flex: '1 1 180px' }}>
          <label style={iLabel}>Species</label>
          <select value={filterSpecies} onChange={e => setFilterSpecies(e.target.value)} style={iStyle}>
            <option value="">All species</option>
            {species.map(s => <option key={s.id} value={s.id}>{s.common_name}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={iLabel}>Region</label>
          <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} style={iStyle}>
            <option value="">All regions</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={iLabel}>Water type</label>
          <select value={filterWaterType} onChange={e => setFilterWaterType(e.target.value)} style={iStyle}>
            <option value="">All types</option>
            {waterTypes.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <button
          onClick={() => { setFilterSpecies(''); setFilterRegion(''); setFilterWaterType('') }}
          style={{ background: 'transparent', border: '1px solid var(--surface2)', borderRadius: 6, padding: '8px 12px', color: 'var(--text2)', cursor: 'pointer', fontSize: 12 }}
        >
          Clear
        </button>
      </div>

      {/* Results count */}
      <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 12 }}>
        Showing {filtered.length} of {regulations.length} regulations
      </p>

      {/* Regulations List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text2)' }}>
          <BookOpen size={40} color="var(--text3)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p>No regulations match your filters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(reg => {
            const sp = reg.species_id ? speciesMap.get(reg.species_id) : null
            const gearRestrictions = Array.isArray(reg.gear_restrictions) ? reg.gear_restrictions : []

            return (
              <div
                key={reg.id}
                style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, padding: '16px 18px' }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 16 }}>
                        {sp ? sp.common_name : (reg.species_id ? 'Unknown species' : 'All species')}
                      </span>
                      {reg.region && (
                        <span style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--surface2)', borderRadius: 4, padding: '2px 7px', border: '1px solid #2a2d3e' }}>
                          {reg.region}
                        </span>
                      )}
                      {reg.water_type && (
                        <span style={{ fontSize: 12, color: 'var(--cyan)', background: 'rgba(34,211,238,0.08)', borderRadius: 4, padding: '2px 7px', border: '1px solid rgba(34,211,238,0.2)' }}>
                          {reg.water_type}
                        </span>
                      )}
                      {reg.hatchery_only && (
                        <span style={{ fontSize: 11, color: 'var(--amber)', background: 'rgba(245,158,11,0.1)', borderRadius: 4, padding: '2px 7px', border: '1px solid rgba(245,158,11,0.3)', fontWeight: 600 }}>
                          Hatchery Only
                        </span>
                      )}
                    </div>

                    {/* Season */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {(reg.season_open || reg.season_close) && (
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                          Season: {reg.season_open || '?'} &ndash; {reg.season_close || '?'}
                        </span>
                      )}
                      <SeasonBadge open={reg.season_open} close={reg.season_close} today={today} />
                    </div>
                  </div>

                  {/* Limits */}
                  <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                    {reg.daily_limit != null && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>{reg.daily_limit}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>Daily Limit</div>
                      </div>
                    )}
                    {reg.size_limit_inches_min != null && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>{reg.size_limit_inches_min}&quot;</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>Min Size</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Gear restrictions */}
                {gearRestrictions.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {gearRestrictions.map((g, i) => (
                      <span
                        key={i}
                        style={{ fontSize: 11, color: 'var(--red)', background: 'rgba(242,90,90,0.08)', borderRadius: 4, padding: '2px 7px', border: '1px solid rgba(242,90,90,0.25)' }}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {reg.notes && (
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: '6px 0', lineHeight: 1.5 }}>{reg.notes}</p>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
                  {reg.last_verified && (
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>Last verified: {reg.last_verified}</span>
                  )}
                  {reg.source_url && (
                    <a
                      href={reg.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}
                    >
                      Source <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
