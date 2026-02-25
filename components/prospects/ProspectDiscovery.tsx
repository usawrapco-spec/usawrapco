'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search, MapPin, Building2, Loader2, Plus, Check, Star,
  Phone, Mail, Globe, Truck, Download, MessageCircle,
  X, Target, Zap, ChevronDown, Filter, Users
} from 'lucide-react'

interface DiscoveredBusiness {
  id: string
  name: string
  address: string
  phone: string
  website: string
  rating: number
  type: string
  estimated_fleet: number
  ai_score: number
  selected: boolean
}

const BUSINESS_TYPES = [
  'Food Trucks', 'Delivery Companies', 'Construction', 'Real Estate',
  'Plumbing', 'HVAC', 'Electricians', 'Landscaping', 'Roofing',
  'Moving Companies', 'Catering', 'Mobile Detailing', 'Pet Services',
  'Home Services', 'Transportation', 'Logistics', 'Medical Services',
  'Cleaning Services',
]

const SCORE_COLORS: Record<string, string> = {
  high: '#22c07a',
  medium: '#f59e0b',
  low: '#f25a5a',
}

interface Props {
  onClose: () => void
}

export default function ProspectDiscovery({ onClose }: Props) {
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [results, setResults] = useState<DiscoveredBusiness[]>([])
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [selectAll, setSelectAll] = useState(false)
  const supabase = createClient()

  const scoreLabel = (score: number) => {
    if (score >= 70) return { label: 'Hot', color: SCORE_COLORS.high }
    if (score >= 40) return { label: 'Warm', color: SCORE_COLORS.medium }
    return { label: 'Cold', color: SCORE_COLORS.low }
  }

  const calculateAIScore = (business: Partial<DiscoveredBusiness>) => {
    let score = 30 // Base score

    // Business type scoring
    const highValueTypes = ['food trucks', 'delivery', 'construction', 'moving', 'transportation', 'logistics']
    const medValueTypes = ['plumbing', 'hvac', 'electricians', 'landscaping', 'roofing', 'cleaning']

    const typeL = (business.type || '').toLowerCase()
    if (highValueTypes.some(t => typeL.includes(t))) score += 30
    else if (medValueTypes.some(t => typeL.includes(t))) score += 20
    else score += 10

    // Fleet size scoring
    if ((business.estimated_fleet || 0) > 10) score += 25
    else if ((business.estimated_fleet || 0) > 5) score += 15
    else if ((business.estimated_fleet || 0) > 1) score += 10

    // Rating scoring
    if ((business.rating || 0) >= 4.5) score += 10
    else if ((business.rating || 0) >= 4.0) score += 5

    // Website scoring - has online presence
    if (business.website) score += 5

    return Math.min(100, score)
  }

  const searchBusinesses = async () => {
    if (!city || !businessType) return
    setSearching(true)
    setResults([])

    // Google Places API integration required — no results without API key
    setResults([])
    setSearching(false)
  }

  const toggleSelect = (id: string) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r))
  }

  const toggleSelectAll = () => {
    const next = !selectAll
    setSelectAll(next)
    setResults(prev => prev.map(r => ({ ...r, selected: next })))
  }

  const importSelected = async () => {
    const selected = results.filter(r => r.selected)
    if (selected.length === 0) return

    setImporting(true)
    try {
      const prospects = selected.map(biz => ({
        name: biz.name,
        business_name: biz.name,
        company: biz.name,
        address: biz.address,
        phone: biz.phone,
        website: biz.website,
        google_rating: biz.rating,
        status: biz.ai_score >= 70 ? 'hot' : biz.ai_score >= 40 ? 'warm' : 'cold',
        source: 'google_places',
        score: biz.ai_score,
        fleet_size: biz.estimated_fleet,
        industry: biz.type,
        tags: [biz.type],
      }))

      await supabase.from('prospects').insert(prospects)
      setImported(true)
    } catch {}
    setImporting(false)
  }

  const selectedCount = results.filter(r => r.selected).length

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 800, maxHeight: '85vh', background: 'var(--surface)',
          borderRadius: 16, border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          animation: 'popIn 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--green), var(--cyan))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Target size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{
                fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: 20,
                color: 'var(--text1)', margin: 0,
              }}>Prospect Discovery</h3>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Find local businesses to pitch vehicle wraps</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Search Form */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="field-label">City</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text3)' }} />
                <input className="field" style={{ paddingLeft: 32 }} value={city} onChange={e => setCity(e.target.value)} placeholder="e.g., Seattle" />
              </div>
            </div>
            <div style={{ width: 100 }}>
              <label className="field-label">State</label>
              <input className="field" value={state} onChange={e => setState(e.target.value)} placeholder="WA" maxLength={2} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">Business Type</label>
              <select className="field" value={businessType} onChange={e => setBusinessType(e.target.value)}>
                <option value="">Select type...</option>
                {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="btn-primary"
                onClick={searchBusinesses}
                disabled={!city || !businessType || searching}
              >
                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          {searching ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text3)' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>Searching {city}, {state}...</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Finding {businessType.toLowerCase()} businesses</div>
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text3)' }}>
              <Building2 size={40} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
              <div style={{ fontSize: 14 }}>Enter a city and business type to discover prospects</div>
            </div>
          ) : (
            <>
              {/* Bulk Actions Bar */}
              <div style={{
                padding: '10px 20px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg)',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text2)' }}>
                  <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} style={{ accentColor: 'var(--accent)' }} />
                  Select All
                </label>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {selectedCount} of {results.length} selected
                </span>
                <div style={{ flex: 1 }} />
                {selectedCount > 0 && (
                  <>
                    <button className="btn-ghost btn-xs"><MessageCircle size={12} /> SMS Campaign</button>
                    <button className="btn-ghost btn-xs"><Download size={12} /> Export CSV</button>
                  </>
                )}
              </div>

              {/* Results List */}
              {results.map(biz => {
                const score = scoreLabel(biz.ai_score)
                return (
                  <div
                    key={biz.id}
                    style={{
                      padding: '12px 20px', borderBottom: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: biz.selected ? 'rgba(79,127,255,0.05)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={biz.selected}
                      onChange={() => toggleSelect(biz.id)}
                      style={{ accentColor: 'var(--accent)' }}
                    />

                    {/* AI Score */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                      background: `${score.color}15`,
                      border: `1px solid ${score.color}40`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'JetBrains Mono', color: score.color }}>
                        {biz.ai_score}
                      </span>
                    </div>

                    {/* Business Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{biz.name}</span>
                        <span style={{
                          padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                          background: `${score.color}20`, color: score.color,
                        }}>{score.label}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, display: 'flex', gap: 12 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <MapPin size={10} /> {biz.address}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                        {biz.phone && (
                          <span style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Phone size={10} /> {biz.phone}
                          </span>
                        )}
                        {biz.website && (
                          <span style={{ fontSize: 11, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Globe size={10} /> {biz.website}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fleet Size */}
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>Fleet</div>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--text1)' }}>
                        ~{biz.estimated_fleet}
                      </div>
                    </div>

                    {/* Rating */}
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>Rating</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Star size={12} fill="#f59e0b" color="#f59e0b" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{biz.rating}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer */}
        {selectedCount > 0 && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--surface)',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>
              {selectedCount} prospects selected
            </span>
            <button
              className="btn-primary"
              onClick={importSelected}
              disabled={importing}
            >
              {importing ? (
                <><Loader2 size={14} className="animate-spin" /> Importing...</>
              ) : imported ? (
                <><Check size={14} /> Imported!</>
              ) : (
                <><Plus size={14} /> Import as Prospects</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
