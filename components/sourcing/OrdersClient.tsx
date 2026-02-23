'use client'

import { useState, useMemo } from 'react'
import type { Profile } from '@/types'
import {
  Package, Search, Truck, Clock, DollarSign, MapPin, CheckCircle,
  AlertCircle, ArrowRight, ShoppingBag,
} from 'lucide-react'

const DEMO_ORDERS = [
  { id: 'so-1', title: '3M IJ180Cv3 — 54" x 150yd', supplier: 'FELLERS', status: 'shipped', tracking: '1Z999AA10123456784', quantity: 4, total: 3200, ordered_at: '2026-02-18', eta: '2026-02-22', category: 'vinyl' },
  { id: 'so-2', title: 'Avery Dennison SW900 Supreme — Satin Black', supplier: 'GRIMCO', status: 'processing', tracking: null, quantity: 2, total: 1400, ordered_at: '2026-02-20', eta: '2026-02-26', category: 'vinyl' },
  { id: 'so-3', title: 'Knifeless Tape — Design Line 50m', supplier: 'APE Wraps', status: 'delivered', tracking: 'FEDEX123456', quantity: 10, total: 320, ordered_at: '2026-02-14', eta: '2026-02-16', category: 'tools' },
  { id: 'so-4', title: 'XPEL Ultimate Plus PPF — 60" x 100ft', supplier: 'FELLERS', status: 'ordered', tracking: null, quantity: 1, total: 2800, ordered_at: '2026-02-21', eta: '2026-03-01', category: 'ppf' },
  { id: 'so-5', title: 'Budget Cast Vinyl — White Gloss 60" x 50yd', supplier: 'Alibaba - Guangzhou', status: 'in_transit', tracking: 'SHIP001234', quantity: 6, total: 900, ordered_at: '2026-02-05', eta: '2026-02-28', category: 'vinyl' },
]

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  ordered: { label: 'Ordered', color: '#4f7fff' },
  processing: { label: 'Processing', color: '#f59e0b' },
  shipped: { label: 'Shipped', color: '#8b5cf6' },
  in_transit: { label: 'In Transit', color: '#22d3ee' },
  delivered: { label: 'Delivered', color: '#22c07a' },
  cancelled: { label: 'Cancelled', color: '#f25a5a' },
}

interface Props { profile: Profile; initialOrders: any[] }

export default function OrdersClient({ profile, initialOrders }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const orders = initialOrders.length > 0 ? initialOrders : DEMO_ORDERS

  const filtered = useMemo(() => {
    let list = [...orders]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(o => o.title?.toLowerCase().includes(q) || o.supplier?.toLowerCase().includes(q))
    }
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter)
    return list
  }, [orders, search, statusFilter])

  const c = {
    bg: '#0d0f14', surface: '#161920', border: '#1e2330', accent: '#4f7fff',
    green: '#22c07a', amber: '#f59e0b', red: '#f25a5a', cyan: '#22d3ee',
    text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <ShoppingBag size={20} style={{ color: c.cyan }} />
        <h1 style={{ fontSize: 22, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.text1, margin: 0 }}>Sourcing Orders</h1>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.text3 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text1, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {['all', 'ordered', 'processing', 'shipped', 'in_transit', 'delivered'].map(st => (
          <button key={st} onClick={() => setStatusFilter(st)}
            style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${statusFilter === st ? c.accent : c.border}`, background: statusFilter === st ? `${c.accent}15` : c.surface, color: statusFilter === st ? c.accent : c.text2, fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
            {st === 'all' ? 'All' : (STATUS_MAP[st]?.label || st)}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(order => {
          const st = STATUS_MAP[order.status] || { label: order.status, color: c.text3 }
          const daysToEta = Math.max(0, Math.ceil((new Date(order.eta).getTime() - Date.now()) / 86400000))

          return (
            <div key={order.id} style={{ background: c.surface, borderRadius: 12, border: `1px solid ${c.border}`, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: c.text1, marginBottom: 4 }}>{order.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 11, color: c.text2 }}>
                    <span>Supplier: <strong>{order.supplier}</strong></span>
                    <span>Qty: <strong>{order.quantity}</strong></span>
                    <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', background: `${st.color}15`, color: st.color, border: `1px solid ${st.color}30` }}>{st.label}</span>
                    {order.tracking && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: c.text3 }}>{order.tracking}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 600, color: c.green }}>${order.total.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: daysToEta <= 2 && order.status !== 'delivered' ? c.amber : c.text3, display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end', marginTop: 2 }}>
                    <Clock size={10} /> {order.status === 'delivered' ? 'Delivered' : `ETA ${daysToEta}d`}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
