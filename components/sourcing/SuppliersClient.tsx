'use client'

import { useState, useMemo } from 'react'
import type { Profile } from '@/types'
import {
  Search, Building2, Globe, Star, MapPin, Phone, Mail, Package,
  ShieldCheck, Clock, DollarSign, Plus, ExternalLink, ChevronRight,
} from 'lucide-react'

const DEMO_SUPPLIERS = [
  { id: 's1', name: 'FELLERS', category: 'vinyl_distributor', rating: 4.8, location: 'Kansas City, MO', phone: '(800) 555-1234', email: 'orders@fellers.com', website: 'fellers.com', lead_time: '2-3 days', specialties: ['3M', 'Avery Dennison', 'Oracal'], orders_ytd: 24, total_spend: 18500, status: 'preferred' },
  { id: 's2', name: 'GRIMCO', category: 'vinyl_distributor', rating: 4.6, location: 'St. Louis, MO', phone: '(800) 555-2345', email: 'sales@grimco.com', website: 'grimco.com', lead_time: '3-5 days', specialties: ['HP Latex', '3M IJ35C', 'Laminates'], orders_ytd: 15, total_spend: 12200, status: 'active' },
  { id: 's3', name: 'APE Wraps', category: 'tools_accessories', rating: 4.9, location: 'Los Angeles, CA', phone: '(800) 555-3456', email: 'info@apewraps.com', website: 'apewraps.com', lead_time: '1-2 days', specialties: ['Squeegees', 'Knifeless tape', 'Heat guns'], orders_ytd: 8, total_spend: 3400, status: 'active' },
  { id: 's4', name: 'Alibaba - Guangzhou Vinyl Co', category: 'international', rating: 4.2, location: 'Guangzhou, China', phone: null, email: 'gzvinyl@alibaba.com', website: 'alibaba.com', lead_time: '14-21 days', specialties: ['Budget vinyl', 'PPF film', 'Color change film'], orders_ytd: 3, total_spend: 5800, status: 'new' },
  { id: 's5', name: 'USCutter', category: 'equipment', rating: 4.4, location: 'Memphis, TN', phone: '(800) 555-5678', email: 'support@uscutter.com', website: 'uscutter.com', lead_time: '3-7 days', specialties: ['Plotters', 'Vinyl cutters', 'Blades'], orders_ytd: 2, total_spend: 4200, status: 'active' },
]

const STATUS_COLORS: Record<string, string> = {
  preferred: '#22c07a',
  active: '#4f7fff',
  new: '#f59e0b',
  inactive: '#5a6080',
}

interface Props { profile: Profile }

export default function SuppliersClient({ profile }: Props) {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')

  const filtered = useMemo(() => {
    let list = [...DEMO_SUPPLIERS]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.specialties.some(sp => sp.toLowerCase().includes(q)))
    }
    if (catFilter !== 'all') list = list.filter(s => s.category === catFilter)
    return list
  }, [search, catFilter])

  const c = {
    bg: '#0d0f14', surface: '#161920', surface2: '#1a1d27',
    border: '#1e2330', accent: '#4f7fff', green: '#22c07a',
    amber: '#f59e0b', red: '#f25a5a', cyan: '#22d3ee',
    text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={20} style={{ color: c.cyan }} />
          <h1 style={{ fontSize: 22, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.text1, margin: 0 }}>Suppliers</h1>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: c.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} /> Add Supplier
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.text3 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text1, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {['all', 'vinyl_distributor', 'tools_accessories', 'equipment', 'international'].map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)}
            style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${catFilter === cat ? c.accent : c.border}`, background: catFilter === cat ? `${c.accent}15` : c.surface, color: catFilter === cat ? c.accent : c.text2, fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
            {cat === 'all' ? 'All' : cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(sup => {
          const stColor = STATUS_COLORS[sup.status] || c.text3
          return (
            <div key={sup.id} style={{ background: c.surface, borderRadius: 12, border: `1px solid ${c.border}`, padding: 16, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 44, height: 44, minWidth: 44, borderRadius: 10, background: `${stColor}12`, border: `1px solid ${stColor}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stColor, fontSize: 16, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif' }}>
                {sup.name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: c.text1 }}>{sup.name}</span>
                  <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', background: `${stColor}15`, color: stColor, border: `1px solid ${stColor}30` }}>{sup.status}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, color: c.amber }}><Star size={10} fill="currentColor" /> {sup.rating}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap', fontSize: 11, color: c.text2 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={10} />{sup.location}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} />{sup.lead_time}</span>
                  {sup.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={10} />{sup.phone}</span>}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {sup.specialties.map(sp => (
                    <span key={sp} style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, background: `${c.accent}10`, color: c.accent, border: `1px solid ${c.accent}20` }}>{sp}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 80 }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600, color: c.green }}>${sup.total_spend.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: c.text3 }}>YTD spend</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: c.text2, marginTop: 4 }}>{sup.orders_ytd} orders</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
