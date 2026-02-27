'use client'

import { useState } from 'react'
import { Radio, Search } from 'lucide-react'

interface VHFChannel {
  id: string
  channel_number: string
  name: string
  description: string | null
  frequency_rx: string | null
  frequency_tx: string | null
  use_category: string | null
  notes: string | null
}

interface Props {
  channels: VHFChannel[]
}

type CategoryKey = 'emergency' | 'distress' | 'safety' | 'commercial' | 'recreational' | 'bridge' | string

function categoryColor(cat: CategoryKey): { color: string; bg: string; border: string } {
  switch (cat) {
    case 'emergency':
    case 'distress':
      return { color: 'var(--red)', bg: 'rgba(242,90,90,0.1)', border: 'rgba(242,90,90,0.25)' }
    case 'safety':
      return { color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' }
    case 'commercial':
      return { color: 'var(--green)', bg: 'rgba(34,192,122,0.1)', border: 'rgba(34,192,122,0.25)' }
    case 'recreational':
      return { color: 'var(--cyan)', bg: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.25)' }
    case 'bridge':
      return { color: 'var(--purple)', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' }
    default:
      return { color: 'var(--text2)', bg: 'var(--surface2)', border: '#2a2d3e' }
  }
}

function channelCardBorderColor(cat: CategoryKey): string {
  switch (cat) {
    case 'emergency':
    case 'distress':
      return 'rgba(242,90,90,0.4)'
    case 'safety':
      return 'rgba(245,158,11,0.35)'
    case 'commercial':
      return 'rgba(34,192,122,0.25)'
    case 'recreational':
      return 'rgba(34,211,238,0.25)'
    case 'bridge':
      return 'rgba(139,92,246,0.3)'
    default:
      return 'var(--surface2)'
  }
}

export function VHFChannelsClient({ channels }: Props) {
  const [filterCategory, setFilterCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const categories = [...new Set(channels.map(c => c.use_category).filter((v): v is string => v !== null))]

  const filtered = channels.filter(c => {
    if (filterCategory && c.use_category !== filterCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!c.channel_number.toLowerCase().includes(q) && !(c.name ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  // Group by category
  const grouped = filtered.reduce<Record<string, VHFChannel[]>>((acc, ch) => {
    const cat = ch.use_category ?? 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ch)
    return acc
  }, {})

  // Category order: emergency/distress first
  const catOrder = ['emergency', 'distress', 'safety', 'commercial', 'recreational', 'bridge', 'other']
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const ai = catOrder.indexOf(a)
    const bi = catOrder.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const iStyle: React.CSSProperties = {
    background: 'var(--surface2)',
    border: '1px solid #2a2d3e',
    borderRadius: 6,
    padding: '8px 10px',
    color: 'var(--text1)',
    fontSize: 13,
    outline: 'none',
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Radio size={24} color="var(--accent)" />
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--text1)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
            VHF Channels
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 12, margin: 0 }}>{channels.length} channels</p>
        </div>
      </div>

      {/* Filter / Search bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={14} color="var(--text3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            placeholder="Search channel # or name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ ...iStyle, paddingLeft: 30, width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ ...iStyle, flex: '0 1 180px' }}>
          <option value="">All categories</option>
          {categories.map(c => (
            <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>
          ))}
        </select>
        {(filterCategory || searchQuery) && (
          <button
            onClick={() => { setFilterCategory(''); setSearchQuery('') }}
            style={{ background: 'transparent', border: '1px solid var(--surface2)', borderRadius: 6, padding: '8px 12px', color: 'var(--text2)', cursor: 'pointer', fontSize: 12 }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Category legend */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {catOrder.filter(c => categories.includes(c) || (c === 'other' && categories.some(x => !catOrder.slice(0, -1).includes(x)))).map(cat => {
          const cs = categoryColor(cat)
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: `1px solid ${filterCategory === cat ? cs.color : cs.border}`,
                background: filterCategory === cat ? cs.bg : 'transparent',
                color: cs.color,
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: filterCategory === cat ? 700 : 400,
                textTransform: 'capitalize',
              }}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text2)' }}>
          <Radio size={40} color="var(--text3)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p>No channels match your search.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {sortedCategories.map(cat => {
            const cs = categoryColor(cat)
            const catChannels = grouped[cat]
            return (
              <div key={cat}>
                {/* Category header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 3, height: 16, background: cs.color, borderRadius: 2 }} />
                  <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: cs.color, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                    {cat}
                  </h2>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>({catChannels.length})</span>
                </div>

                {/* Channel cards grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                  {catChannels.map(ch => (
                    <div
                      key={ch.id}
                      style={{
                        background: 'var(--surface)',
                        border: `1px solid ${channelCardBorderColor(cat)}`,
                        borderRadius: 10,
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      {/* Channel number — large & monospace */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 28,
                          fontWeight: 800,
                          color: cs.color,
                          lineHeight: 1,
                        }}>
                          {ch.channel_number}
                        </span>
                        <span style={{
                          fontSize: 11,
                          color: cs.color,
                          background: cs.bg,
                          border: `1px solid ${cs.border}`,
                          borderRadius: 4,
                          padding: '1px 6px',
                          textTransform: 'capitalize',
                        }}>
                          {cat}
                        </span>
                      </div>

                      {/* Channel name */}
                      <div style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 13 }}>{ch.name}</div>

                      {/* Description */}
                      {ch.description && (
                        <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.4 }}>{ch.description}</p>
                      )}

                      {/* Frequencies */}
                      {(ch.frequency_rx || ch.frequency_tx) && (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {ch.frequency_rx && (
                            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                              RX: {ch.frequency_rx} MHz
                            </span>
                          )}
                          {ch.frequency_tx && ch.frequency_tx !== ch.frequency_rx && (
                            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                              TX: {ch.frequency_tx} MHz
                            </span>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      {ch.notes && (
                        <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0, lineHeight: 1.4, borderTop: '1px solid var(--surface2)', paddingTop: 6 }}>
                          {ch.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
