'use client'

import { useState } from 'react'
import { Shield, AlertTriangle, Navigation, Filter } from 'lucide-react'

interface BoatingZone {
  id: string
  name: string
  zone_type: string | null
  speed_limit_mph: number | null
  description: string | null
  enforcement_agency: string | null
  seasonal_start: string | null
  seasonal_end: string | null
  penalty_notes: string | null
  region: string | null
}

interface BoatingRegulation {
  id: string
  category: string | null
  title: string
  rule_text: string | null
  vessel_size_applies: string | null
  jurisdiction: string | null
  penalty_amount: number | null
  effective_date: string | null
}

interface Props {
  zones: BoatingZone[]
  regulations: BoatingRegulation[]
}

type TabKey = 'zones' | 'regulations'

function zoneTypeStyle(type: string | null): { color: string; bg: string; border: string } {
  switch (type) {
    case 'no-wake':
      return { color: 'var(--red)', bg: 'rgba(242,90,90,0.1)', border: 'rgba(242,90,90,0.3)' }
    case 'speed-limit':
      return { color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' }
    case 'restricted':
      return { color: 'var(--red)', bg: 'rgba(242,90,90,0.1)', border: 'rgba(242,90,90,0.3)' }
    case 'navigation':
      return { color: 'var(--cyan)', bg: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.3)' }
    default:
      return { color: 'var(--text2)', bg: 'var(--surface2)', border: '#2a2d3e' }
  }
}

function categoryStyle(cat: string | null): { color: string; bg: string; border: string } {
  switch ((cat ?? '').toLowerCase()) {
    case 'safety':
      return { color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' }
    case 'equipment':
      return { color: 'var(--cyan)', bg: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.3)' }
    case 'navigation':
      return { color: 'var(--accent)', bg: 'rgba(79,127,255,0.1)', border: 'rgba(79,127,255,0.3)' }
    case 'environmental':
      return { color: 'var(--green)', bg: 'rgba(34,192,122,0.1)', border: 'rgba(34,192,122,0.3)' }
    case 'registration':
      return { color: 'var(--purple)', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' }
    default:
      return { color: 'var(--text2)', bg: 'var(--surface2)', border: '#2a2d3e' }
  }
}

export function BoatingClient({ zones, regulations }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('zones')
  const [filterZoneType, setFilterZoneType] = useState('')

  const zoneTypes = [...new Set(zones.map(z => z.zone_type).filter((v): v is string => v !== null))]

  const filteredZones = zones.filter(z => {
    if (filterZoneType && z.zone_type !== filterZoneType) return false
    return true
  })

  const iStyle: React.CSSProperties = {
    background: 'var(--surface2)',
    border: '1px solid #2a2d3e',
    borderRadius: 6,
    padding: '7px 10px',
    color: 'var(--text1)',
    fontSize: 13,
    outline: 'none',
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Navigation size={24} color="var(--accent)" />
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--text1)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
            Boating
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 12, margin: 0 }}>
            {zones.length} zones &middot; {regulations.length} regulations
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {(['zones', 'regulations'] as TabKey[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px',
              borderRadius: 7,
              border: 'none',
              background: activeTab === tab ? 'var(--surface2)' : 'transparent',
              color: activeTab === tab ? 'var(--text1)' : 'var(--text2)',
              fontWeight: activeTab === tab ? 700 : 400,
              cursor: 'pointer',
              fontSize: 13,
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Zones Tab */}
      {activeTab === 'zones' && (
        <div>
          {/* Filter */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <Filter size={14} color="var(--text2)" />
            <select value={filterZoneType} onChange={e => setFilterZoneType(e.target.value)} style={iStyle}>
              <option value="">All zone types</option>
              {zoneTypes.map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
            </select>
            {filterZoneType && (
              <button
                onClick={() => setFilterZoneType('')}
                style={{ background: 'transparent', border: '1px solid var(--surface2)', borderRadius: 6, padding: '6px 12px', color: 'var(--text2)', cursor: 'pointer', fontSize: 12 }}
              >
                Clear
              </button>
            )}
            <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 4 }}>{filteredZones.length} results</span>
          </div>

          {filteredZones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text2)' }}>
              <Navigation size={40} color="var(--text3)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p>No zones match your filter.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {filteredZones.map(zone => {
                const zt = zoneTypeStyle(zone.zone_type)
                return (
                  <div
                    key={zone.id}
                    style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <h3 style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 15, margin: 0 }}>{zone.name}</h3>
                      {zone.zone_type && (
                        <span style={{ fontSize: 11, color: zt.color, background: zt.bg, border: `1px solid ${zt.border}`, borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap', fontWeight: 600, textTransform: 'capitalize' }}>
                          {zone.zone_type.replace('-', ' ')}
                        </span>
                      )}
                    </div>

                    {zone.speed_limit_mph != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={13} color="var(--amber)" />
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--amber)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {zone.speed_limit_mph} MPH
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>speed limit</span>
                      </div>
                    )}

                    {zone.description && (
                      <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>{zone.description}</p>
                    )}

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {zone.enforcement_agency && (
                        <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Shield size={10} /> {zone.enforcement_agency}
                        </span>
                      )}
                      {zone.region && (
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{zone.region}</span>
                      )}
                    </div>

                    {(zone.seasonal_start || zone.seasonal_end) && (
                      <div style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--surface2)', borderRadius: 5, padding: '4px 8px' }}>
                        Seasonal: {zone.seasonal_start || 'N/A'} &ndash; {zone.seasonal_end || 'N/A'}
                      </div>
                    )}

                    {zone.penalty_notes && (
                      <p style={{ fontSize: 11, color: 'var(--red)', margin: 0, lineHeight: 1.4 }}>
                        Penalty: {zone.penalty_notes}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Regulations Tab */}
      {activeTab === 'regulations' && (
        <div>
          {regulations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text2)' }}>
              <Shield size={40} color="var(--text3)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p>No regulations on file.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {regulations.map(reg => {
                const cs = categoryStyle(reg.category)
                return (
                  <div
                    key={reg.id}
                    style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, padding: '16px 18px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          {reg.category && (
                            <span style={{ fontSize: 11, color: cs.color, background: cs.bg, border: `1px solid ${cs.border}`, borderRadius: 4, padding: '2px 7px', fontWeight: 600, textTransform: 'capitalize' }}>
                              {reg.category}
                            </span>
                          )}
                          {reg.jurisdiction && (
                            <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', borderRadius: 4, padding: '2px 7px', border: '1px solid #2a2d3e' }}>
                              {reg.jurisdiction}
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 15, margin: 0 }}>{reg.title}</h3>
                      </div>

                      {reg.penalty_amount != null && (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)', fontFamily: 'JetBrains Mono, monospace' }}>
                            ${reg.penalty_amount.toLocaleString()}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>Max Fine</div>
                        </div>
                      )}
                    </div>

                    {reg.rule_text && (
                      <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 8px', lineHeight: 1.6 }}>{reg.rule_text}</p>
                    )}

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {reg.vessel_size_applies && (
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                          Applies to: {reg.vessel_size_applies}
                        </span>
                      )}
                      {reg.effective_date && (
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                          Effective: {reg.effective_date}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
