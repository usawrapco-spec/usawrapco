'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'
import {
  Search, Radio, Globe, MapPin, DollarSign, Clock, AlertCircle,
  Star, ChevronRight, Filter, Plus, ExternalLink, Building2, Tag,
  Zap, TrendingUp, Eye,
} from 'lucide-react'

// Demo RFQs
const DEMO_RFQS = [
  {
    id: 'rfq-1', source: 'MFG.com', title: 'Fleet Vehicle Graphics — 12 Units',
    description: 'Looking for vendor to produce and install fleet graphics for 12 Ford Transit vans. Full wraps with company branding.',
    category: 'vehicle_wraps', buyer: 'Pacific NW Logistics', buyer_location: 'Seattle, WA',
    quantity: 12, estimated_value: 42000, deadline: '2026-03-15',
    status: 'matched', match_score: 94, specs: { vehicle_type: 'Ford Transit', wrap_type: 'Full Wrap' },
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'rfq-2', source: 'ThomasNet', title: 'Vinyl Decals for Construction Equipment',
    description: 'Need safety decals and branding graphics for excavators and loaders. UV-resistant vinyl required.',
    category: 'decals', buyer: 'Emerald City Construction', buyer_location: 'Tacoma, WA',
    quantity: 50, estimated_value: 8500, deadline: '2026-03-01',
    status: 'monitoring', match_score: 72, specs: { material: 'UV vinyl', type: 'decals' },
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'rfq-3', source: 'SAM.gov', title: 'Government Vehicle Marking — US Forest Service',
    description: 'Vehicle identification markings for 8 USFS trucks. Must meet federal reflective standards.',
    category: 'government', buyer: 'US Forest Service', buyer_location: 'Portland, OR',
    quantity: 8, estimated_value: 18000, deadline: '2026-04-01',
    status: 'new', match_score: 85, specs: { type: 'reflective marking', compliance: 'federal' },
    created_at: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: 'rfq-4', source: 'MFG.com', title: 'Restaurant Delivery Van Wraps',
    description: '3 delivery vans need full wraps. Looking for quick turnaround, design provided.',
    category: 'vehicle_wraps', buyer: 'Rainier Foods', buyer_location: 'Bellevue, WA',
    quantity: 3, estimated_value: 11400, deadline: '2026-02-28',
    status: 'matched', match_score: 97, specs: { vehicle_type: 'Sprinter Van', design: 'provided' },
    created_at: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: 'rfq-5', source: 'ThomasNet', title: 'Large Format Printing — Trade Show Displays',
    description: 'Need 20 pop-up banners and 5 large backdrop walls for annual trade show. Rush order.',
    category: 'signage', buyer: 'Northwest Events Co', buyer_location: 'Seattle, WA',
    quantity: 25, estimated_value: 6200, deadline: '2026-02-25',
    status: 'monitoring', match_score: 45, specs: { type: 'banners', rush: true },
    created_at: new Date(Date.now() - 345600000).toISOString(),
  },
]

const SOURCE_COLORS: Record<string, string> = {
  'MFG.com': '#4f7fff',
  'ThomasNet': '#22c07a',
  'SAM.gov': '#f59e0b',
}

interface Props {
  profile: Profile
  initialRfqs: any[]
}

export default function MonitorClient({ profile, initialRfqs }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [selectedRfq, setSelectedRfq] = useState<any>(null)

  const rfqs = initialRfqs.length > 0 ? initialRfqs : DEMO_RFQS

  const filteredRfqs = useMemo(() => {
    let list = [...rfqs]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r => r.title?.toLowerCase().includes(q) || r.buyer?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q))
    }
    if (sourceFilter !== 'all') list = list.filter(r => r.source === sourceFilter)
    return list.sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
  }, [rfqs, search, sourceFilter])

  const c = {
    bg: '#0d0f14', surface: '#161920', surface2: '#1a1d27',
    border: '#1e2330', accent: '#4f7fff', green: '#22c07a',
    amber: '#f59e0b', red: '#f25a5a', purple: '#8b5cf6',
    cyan: '#22d3ee', text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
  }

  const totalValue = filteredRfqs.reduce((sum, r) => sum + (r.estimated_value || 0), 0)
  const avgScore = filteredRfqs.length > 0 ? Math.round(filteredRfqs.reduce((sum, r) => sum + (r.match_score || 0), 0) / filteredRfqs.length) : 0

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Radio size={20} style={{ color: c.cyan }} />
          <h1 style={{ fontSize: 22, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.text1, margin: 0 }}>
            RFQ Monitor
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Active RFQs', value: filteredRfqs.length, color: c.accent },
            { label: 'Pipeline Value', value: `$${(totalValue / 1000).toFixed(0)}k`, color: c.green },
            { label: 'Avg Match', value: `${avgScore}%`, color: c.amber },
          ].map(s => (
            <div key={s.label} style={{ padding: '6px 12px', background: c.surface, borderRadius: 8, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 10, color: c.text3 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.text3 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search RFQs..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text1, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {['all', 'MFG.com', 'ThomasNet', 'SAM.gov'].map(src => (
          <button key={src} onClick={() => setSourceFilter(src)}
            style={{
              padding: '7px 14px', borderRadius: 8, border: `1px solid ${sourceFilter === src ? c.accent : c.border}`,
              background: sourceFilter === src ? `${c.accent}15` : c.surface,
              color: sourceFilter === src ? c.accent : c.text2,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
            {src === 'all' ? 'All Sources' : src}
          </button>
        ))}
      </div>

      {/* RFQ Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
        {filteredRfqs.map(rfq => {
          const srcColor = SOURCE_COLORS[rfq.source] || c.text3
          const scoreColor = rfq.match_score >= 80 ? c.green : rfq.match_score >= 60 ? c.amber : c.red
          const daysLeft = Math.max(0, Math.ceil((new Date(rfq.deadline).getTime() - Date.now()) / 86400000))

          return (
            <div key={rfq.id} onClick={() => setSelectedRfq(rfq.id === selectedRfq?.id ? null : rfq)}
              style={{
                background: c.surface, borderRadius: 12, border: `1px solid ${selectedRfq?.id === rfq.id ? c.accent : c.border}`,
                padding: 16, cursor: 'pointer', transition: 'all 200ms',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = c.accent + '60'}
              onMouseLeave={e => e.currentTarget.style.borderColor = selectedRfq?.id === rfq.id ? c.accent : c.border}
            >
              {/* Top Row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: c.text1, marginBottom: 4, lineHeight: 1.3 }}>{rfq.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: `${srcColor}15`, color: srcColor, border: `1px solid ${srcColor}30` }}>{rfq.source}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: c.text2 }}><Building2 size={10} />{rfq.buyer}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: c.text3 }}><MapPin size={10} />{rfq.buyer_location}</span>
                  </div>
                </div>
                {/* Match Score */}
                <div style={{ width: 48, height: 48, minWidth: 48, borderRadius: 10, background: `${scoreColor}10`, border: `2px solid ${scoreColor}30`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{rfq.match_score}</span>
                  <span style={{ fontSize: 7, fontWeight: 600, textTransform: 'uppercase', color: scoreColor, letterSpacing: '0.1em' }}>MATCH</span>
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.5, margin: '0 0 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
                {rfq.description}
              </p>

              {/* Bottom Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: c.text2 }}>
                  <Tag size={10} /> Qty: <strong>{rfq.quantity}</strong>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: c.green }}>
                  <DollarSign size={10} />${(rfq.estimated_value || 0).toLocaleString()}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: daysLeft <= 7 ? c.red : c.text3 }}>
                  <Clock size={10} /> {daysLeft}d left
                </span>
                {rfq.status === 'matched' && (
                  <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: `${c.green}15`, color: c.green, border: `1px solid ${c.green}30` }}>Matched</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filteredRfqs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Radio size={40} style={{ color: c.text3, opacity: 0.3, marginBottom: 12 }} />
          <div style={{ color: c.text3, fontSize: 14 }}>No RFQs matching your filters</div>
        </div>
      )}
    </div>
  )
}
