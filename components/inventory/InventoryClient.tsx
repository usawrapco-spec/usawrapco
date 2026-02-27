'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Package, Plus, AlertTriangle, Scissors, Trash2, X,
  Download, BarChart2, ClipboardList, Edit2, Check, Search,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
interface VinylRoll {
  id: string
  org_id: string
  name: string
  brand: string
  sku: string
  color: string
  finish: string
  type: string
  width_in: number
  roll_length_ft: number
  qty_rolls: number
  qty_sqft: number
  cost_per_sqft: number
  cost_per_roll: number
  low_stock_threshold: number
  location: string
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'on_order' | 'consumed'
  notes: string
  created_at: string
  updated_at: string
}

interface UsageRow {
  id: string
  vinyl_id: string
  project_id: string | null
  recorded_by: string | null
  sqft_used: number
  linft_used: number
  notes: string
  created_at: string
  vinyl_inventory: { brand: string; color: string; finish: string } | null
  projects: { title: string } | null
  profiles: { name: string } | null
}

interface InventoryClientProps {
  profile: Profile
}

// ─── Color Swatch ─────────────────────────────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  black: '#1a1a1a', white: '#f5f5f5', silver: '#c0c0c0', gray: '#808080',
  grey: '#808080', red: '#cc2222', blue: '#2255cc', green: '#22aa55',
  yellow: '#f0c020', orange: '#f07020', purple: '#8833cc', pink: '#e060a0',
  gold: '#cfaa20', bronze: '#cd7f32', copper: '#b87333', chrome: '#e0e8f0',
  gunmetal: '#454a50', midnight: '#0d0d1a', charcoal: '#3c3c3c',
  titanium: '#878681', navy: '#001f5b', teal: '#008080', maroon: '#800000',
  brown: '#7a4020', tan: '#d2b48c', beige: '#f5f0dc', rose: '#ff007f',
  lime: '#aad400', forest: '#228b22', sky: '#87ceeb', coral: '#ff6b6b',
}

function colorSwatch(colorName: string): string {
  if (!colorName) return '#444'
  const lower = colorName.toLowerCase()
  for (const [key, hex] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return hex
  }
  return '#5a6080'
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  in_stock: 'var(--green)', low_stock: 'var(--amber)', out_of_stock: 'var(--red)',
  on_order: 'var(--accent)', consumed: 'var(--text3)',
}
const STATUS_LABEL: Record<string, string> = {
  in_stock: 'In Stock', low_stock: 'Low', out_of_stock: 'Out', on_order: 'On Order', consumed: 'Consumed',
}
const BRANDS = ['3M', 'Avery', 'Oracal', 'Arlon', 'Hexis', 'XPEL', 'Llumar', 'SunTek', 'Other']
const FINISHES = ['Gloss', 'Matte', 'Satin', 'Metallic', 'Textured', 'Clear', 'Chrome', 'Carbon Fiber', 'Brushed']

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const selStyle: React.CSSProperties = {
  padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text2)', fontSize: 13, outline: 'none',
}
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text1)', fontSize: 13,
  outline: 'none', boxSizing: 'border-box',
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function InventoryClient({ profile }: InventoryClientProps) {
  const supabase = createClient()
  const [tab, setTab] = useState<'stock' | 'usage' | 'reports'>('stock')
  const [rolls, setRolls] = useState<VinylRoll[]>([])
  const [usageLog, setUsageLog] = useState<UsageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [usageLoading, setUsageLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [brandFilter, setBrandFilter] = useState<string>('all')
  const [finishFilter, setFinishFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'brand' | 'color' | 'qty_sqft'>('brand')

  const [usageDateFrom, setUsageDateFrom] = useState('')
  const [usageDateTo, setUsageDateTo] = useState('')
  const [usageEmployeeFilter, setUsageEmployeeFilter] = useState('all')

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSqft, setEditSqft] = useState('')
  const [showUsageModal, setShowUsageModal] = useState(false)
  const [remnantModal, setRemnantModal] = useState<VinylRoll | null>(null)

  const loadRolls = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('vinyl_inventory')
      .select('*')
      .eq('org_id', profile.org_id)
      .neq('status', 'consumed')
      .order('brand', { ascending: true })
    setRolls((data || []) as VinylRoll[])
    setLoading(false)
  }, [supabase, profile.org_id])

  const loadUsage = useCallback(async () => {
    setUsageLoading(true)
    let q = supabase
      .from('vinyl_usage')
      .select('*, vinyl_inventory(brand, color, finish), projects(title), profiles:recorded_by(name)')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .limit(200)
    if (usageDateFrom) q = q.gte('created_at', usageDateFrom)
    if (usageDateTo) q = q.lte('created_at', usageDateTo + 'T23:59:59')
    const { data } = await q
    setUsageLog((data || []) as unknown as UsageRow[])
    setUsageLoading(false)
  }, [supabase, profile.org_id, usageDateFrom, usageDateTo])

  useEffect(() => { loadRolls() }, [loadRolls])
  useEffect(() => { if (tab === 'usage' || tab === 'reports') loadUsage() }, [tab, loadUsage])

  const thisMonthUsage = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    return usageLog.filter(u => u.created_at >= start).reduce((s, u) => s + (u.sqft_used || 0), 0)
  }, [usageLog])

  const totalValue = rolls.reduce((s, r) => s + (r.qty_sqft * (r.cost_per_sqft || 0)), 0)
  const lowItems = rolls.filter(r => r.status === 'low_stock' || r.status === 'out_of_stock')

  const filtered = useMemo(() => {
    let list = [...rolls]
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter)
    if (brandFilter !== 'all') list = list.filter(r => r.brand === brandFilter)
    if (finishFilter !== 'all') list = list.filter(r => r.finish === finishFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.color?.toLowerCase().includes(q) ||
        r.brand?.toLowerCase().includes(q) ||
        r.sku?.toLowerCase().includes(q) ||
        r.finish?.toLowerCase().includes(q) ||
        r.name?.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      if (sortBy === 'qty_sqft') return a.qty_sqft - b.qty_sqft
      if (sortBy === 'color') return (a.color || '').localeCompare(b.color || '')
      return (a.brand || '').localeCompare(b.brand || '')
    })
    return list
  }, [rolls, statusFilter, brandFilter, finishFilter, search, sortBy])

  const brands = Array.from(new Set(rolls.map(r => r.brand).filter(Boolean)))
  const finishes = Array.from(new Set(rolls.map(r => r.finish).filter(Boolean)))

  const filteredUsage = useMemo(() => {
    if (usageEmployeeFilter === 'all') return usageLog
    return usageLog.filter(u => u.profiles?.name === usageEmployeeFilter)
  }, [usageLog, usageEmployeeFilter])
  const employees = Array.from(new Set(usageLog.map(u => u.profiles?.name).filter(Boolean))) as string[]

  const brandUsageData = useMemo(() => {
    const map: Record<string, number> = {}
    usageLog.forEach(u => {
      const brand = u.vinyl_inventory?.brand || 'Unknown'
      map[brand] = (map[brand] || 0) + (u.sqft_used || 0)
    })
    return Object.entries(map).map(([brand, sqft]) => ({ brand, sqft: Math.round(sqft) })).sort((a, b) => b.sqft - a.sqft)
  }, [usageLog])

  const colorUsageData = useMemo(() => {
    const map: Record<string, number> = {}
    usageLog.forEach(u => {
      const key = u.vinyl_inventory ? `${u.vinyl_inventory.brand} ${u.vinyl_inventory.color}` : 'Unknown'
      map[key] = (map[key] || 0) + (u.sqft_used || 0)
    })
    return Object.entries(map).map(([label, sqft]) => ({ label, sqft: Math.round(sqft) })).sort((a, b) => b.sqft - a.sqft).slice(0, 10)
  }, [usageLog])

  async function saveInlineEdit(roll: VinylRoll) {
    const newSqft = parseFloat(editSqft)
    if (isNaN(newSqft) || newSqft < 0) { setEditingId(null); return }
    const threshold = roll.low_stock_threshold || 0
    const newStatus = newSqft <= 0 ? 'out_of_stock' : (threshold > 0 && newSqft <= threshold) ? 'low_stock' : 'in_stock'
    await supabase.from('vinyl_inventory').update({ qty_sqft: newSqft, status: newStatus }).eq('id', roll.id)
    setRolls(prev => prev.map(r => r.id === roll.id ? { ...r, qty_sqft: newSqft, status: newStatus as VinylRoll['status'] } : r))
    setEditingId(null)
  }

  async function handleReorder(roll: VinylRoll) {
    await supabase.from('sourcing_orders').insert({
      org_id: profile.org_id, supplier_name: roll.brand,
      material_name: `${roll.brand} ${roll.color} ${roll.finish}`,
      sku: roll.sku || '', quantity: roll.qty_rolls || 1, unit: 'roll',
      unit_cost: roll.cost_per_roll || 0, total_cost: roll.cost_per_roll || 0, status: 'pending',
    })
    alert(`Reorder created for ${roll.brand} ${roll.color}`)
  }

  async function handleMarkConsumed(roll: VinylRoll) {
    if (!confirm(`Mark "${roll.brand} ${roll.color}" as fully consumed?`)) return
    await supabase.from('vinyl_inventory').update({ status: 'consumed', qty_sqft: 0 }).eq('id', roll.id)
    setRolls(prev => prev.filter(r => r.id !== roll.id))
  }

  function exportCSV() {
    const headers = ['Brand', 'Color', 'Finish', 'SKU', 'Width (in)', 'Roll Length (ft)', 'Qty Rolls', 'Sqft Remaining', 'Cost/sqft', 'Value', 'Location', 'Status']
    const rows = rolls.map(r => [r.brand, r.color, r.finish, r.sku, r.width_in, r.roll_length_ft, r.qty_rolls, r.qty_sqft.toFixed(1), r.cost_per_sqft?.toFixed(2) || '0', (r.qty_sqft * (r.cost_per_sqft || 0)).toFixed(2), r.location || '', r.status])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `vinyl-inventory-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function exportUsageCSV() {
    const headers = ['Date', 'Material', 'Project', 'Sqft Used', 'Employee', 'Notes']
    const rows = filteredUsage.map(u => [fmtDate(u.created_at), u.vinyl_inventory ? `${u.vinyl_inventory.brand} ${u.vinyl_inventory.color}` : '', u.projects?.title || '', u.sqft_used?.toFixed(1) || '0', u.profiles?.name || '', u.notes || ''])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `vinyl-usage-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 30, fontWeight: 900, color: 'var(--text1)', marginBottom: 4 }}>Vinyl Inventory</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>Track rolls, materials, usage, and stock levels</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <Download size={13} /> Export
          </button>
          <button onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={15} /> Add Roll
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Rolls', val: rolls.length, sub: `${rolls.filter(r => r.status === 'in_stock').length} in stock`, color: 'var(--text1)' },
          { label: 'Low Stock Alerts', val: lowItems.length, sub: lowItems.length > 0 ? 'Needs reorder' : 'All good', color: lowItems.length > 0 ? 'var(--red)' : 'var(--green)' },
          { label: 'Inventory Value', val: fmtMoney(totalValue), sub: 'Remaining material', color: 'var(--green)' },
          { label: 'Used This Month', val: usageLog.length > 0 ? `${thisMonthUsage.toFixed(0)} sqft` : '—', sub: 'From usage log', color: 'var(--cyan)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {lowItems.length > 0 && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.35)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle size={16} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Reorder Alert</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {lowItems.map(r => (
                <span key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', background: 'rgba(242,90,90,0.12)', borderRadius: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)' }}>{r.brand} {r.color} — {r.status === 'out_of_stock' ? 'OUT' : 'LOW'}</span>
                  <button onClick={() => handleReorder(r)} style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Reorder</button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {([
          { id: 'stock' as const, label: 'Stock', icon: Package },
          { id: 'usage' as const, label: 'Usage Log', icon: ClipboardList },
          { id: 'reports' as const, label: 'Reports', icon: BarChart2 },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            background: 'none', border: 'none',
            borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            color: tab === t.id ? 'var(--accent)' : 'var(--text3)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: -1,
          }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
              <input type="text" placeholder="Search — color, brand, SKU..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 30px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selStyle}>
              <option value="all">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low</option>
              <option value="out_of_stock">Out</option>
              <option value="on_order">On Order</option>
            </select>
            <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} style={selStyle}>
              <option value="all">All Brands</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={finishFilter} onChange={e => setFinishFilter(e.target.value)} style={selStyle}>
              <option value="all">All Finishes</option>
              {finishes.map(fi => <option key={fi} value={fi}>{fi}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as 'brand' | 'color' | 'qty_sqft')} style={selStyle}>
              <option value="brand">Sort: Brand</option>
              <option value="color">Sort: Color</option>
              <option value="qty_sqft">Sort: Stock Level</option>
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>Loading inventory...</div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                    {['', 'Material', 'SKU', 'Width', 'Remaining', 'Cost/sqft', 'Value', 'Location', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 13 }}>
                      {search ? 'No materials matching search.' : 'No inventory items. Add a roll to get started.'}
                    </td></tr>
                  ) : filtered.map((r, i) => {
                    const fullSqft = r.roll_length_ft > 0 ? (r.width_in / 12) * r.roll_length_ft * (r.qty_rolls || 1) : 0
                    const pct = fullSqft > 0 ? Math.min(100, (r.qty_sqft / fullSqft) * 100) : 0
                    const value = r.qty_sqft * (r.cost_per_sqft || 0)
                    const barColor = pct > 50 ? 'var(--green)' : pct > 20 ? 'var(--amber)' : 'var(--red)'
                    const bColor = STATUS_COLOR[r.status] || 'var(--text3)'
                    const swatch = colorSwatch(r.color)
                    return (
                      <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '10px 10px 10px 14px' }}>
                          <div style={{ width: 20, height: 20, borderRadius: 4, background: swatch, border: '1px solid rgba(255,255,255,0.1)' }} title={r.color} />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{r.brand} {r.color}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.finish}</div>
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{r.sku || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{r.width_in ? `${r.width_in}"` : '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {editingId === r.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <input type="number" value={editSqft} onChange={e => setEditSqft(e.target.value)} autoFocus
                                style={{ width: 70, padding: '4px 6px', background: 'var(--surface2)', border: '1px solid var(--accent)', borderRadius: 5, color: 'var(--text1)', fontSize: 12, outline: 'none' }}
                                onKeyDown={e => { if (e.key === 'Enter') saveInlineEdit(r); if (e.key === 'Escape') setEditingId(null) }} />
                              <button onClick={() => saveInlineEdit(r)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)' }}><Check size={14} /></button>
                              <button onClick={() => setEditingId(null)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={12} /></button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 55, height: 5, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4 }} />
                              </div>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>{r.qty_sqft.toFixed(0)} sqft</span>
                              <button onClick={() => { setEditingId(r.id); setEditSqft(r.qty_sqft.toString()) }}
                                style={{ padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', opacity: 0.6 }} title="Edit remaining sqft">
                                <Edit2 size={11} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                          {r.cost_per_sqft ? `$${r.cost_per_sqft.toFixed(2)}` : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--green)', whiteSpace: 'nowrap' }}>
                          {fmtMoney(value)}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text3)' }}>{r.location || '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${bColor}18`, color: bColor, whiteSpace: 'nowrap' }}>
                            {STATUS_LABEL[r.status] || r.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => setShowUsageModal(true)} title="Log Usage"
                              style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--cyan)', cursor: 'pointer', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
                              Use
                            </button>
                            <button onClick={() => setRemnantModal(r)} title="Cut Remnant"
                              style={{ padding: '4px 6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Scissors size={12} />
                            </button>
                            <button onClick={() => handleMarkConsumed(r)} title="Mark Consumed"
                              style={{ padding: '4px 6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'usage' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input type="date" value={usageDateFrom} onChange={e => setUsageDateFrom(e.target.value)} style={selStyle} />
              <input type="date" value={usageDateTo} onChange={e => setUsageDateTo(e.target.value)} style={selStyle} />
              <select value={usageEmployeeFilter} onChange={e => setUsageEmployeeFilter(e.target.value)} style={selStyle}>
                <option value="all">All Employees</option>
                {employees.map(em => <option key={em} value={em}>{em}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={exportUsageCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <Download size={13} /> Export CSV
              </button>
              <button onClick={() => setShowUsageModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={13} /> Log Usage
              </button>
            </div>
          </div>
          {usageLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Loading...</div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                    {['Date', 'Material', 'Project', 'Sqft Used', 'Applied By', 'Notes'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsage.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 13 }}>No usage entries found.</td></tr>
                  ) : filteredUsage.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom: i < filteredUsage.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{fmtDate(u.created_at)}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{u.vinyl_inventory ? `${u.vinyl_inventory.brand} ${u.vinyl_inventory.color}` : '—'}</div>
                        {u.vinyl_inventory?.finish && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{u.vinyl_inventory.finish}</div>}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--text2)' }}>{u.projects?.title || '—'}</td>
                      <td style={{ padding: '11px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--cyan)' }}>{u.sqft_used?.toFixed(1)} sqft</td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--text2)' }}>{u.profiles?.name || '—'}</td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text3)' }}>{u.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 16, fontFamily: 'Barlow Condensed, sans-serif' }}>Usage by Brand (sqft)</div>
            {brandUsageData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>No usage data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={brandUsageData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="brand" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'var(--text1)', fontWeight: 700 }} formatter={(v: number) => [`${v} sqft`, 'Used']} />
                  <Bar dataKey="sqft" radius={[4, 4, 0, 0]}>
                    {brandUsageData.map((_, idx) => (
                      <Cell key={idx} fill={['var(--accent)', 'var(--cyan)', 'var(--green)', 'var(--purple)', 'var(--amber)'][idx % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 16, fontFamily: 'Barlow Condensed, sans-serif' }}>Top 10 Most Used Materials</div>
            {colorUsageData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>No usage data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={colorUsageData} layout="vertical" margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" tick={{ fill: 'var(--text2)', fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'var(--text1)', fontWeight: 700 }} formatter={(v: number) => [`${v} sqft`, 'Used']} />
                  <Bar dataKey="sqft" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 4, fontFamily: 'Barlow Condensed, sans-serif' }}>Material Cost per Job</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>Based on cost_per_sqft x sqft_used from usage log</div>
            {usageLog.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>No usage data yet.</div>
            ) : (() => {
              const jobCostMap: Record<string, { title: string; cost: number }> = {}
              usageLog.forEach(u => {
                if (!u.project_id) return
                const vinyl = rolls.find(r => r.id === u.vinyl_id)
                const cost = (u.sqft_used || 0) * (vinyl?.cost_per_sqft || 0)
                if (!jobCostMap[u.project_id]) jobCostMap[u.project_id] = { title: u.projects?.title || u.project_id.slice(0, 8), cost: 0 }
                jobCostMap[u.project_id].cost += cost
              })
              const jobData = Object.values(jobCostMap).sort((a, b) => b.cost - a.cost).slice(0, 10)
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {jobData.map((j, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--text2)', width: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</div>
                      <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (j.cost / (jobData[0]?.cost || 1)) * 100)}%`, background: 'var(--purple)', borderRadius: 4 }} />
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: 'var(--green)', width: 60, textAlign: 'right' }}>
                        {fmtMoney(j.cost)}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {showAddModal && <AddRollModal orgId={profile.org_id} onClose={() => setShowAddModal(false)} onAdded={() => { setShowAddModal(false); loadRolls() }} />}
      {showUsageModal && <LogUsageModal orgId={profile.org_id} rolls={rolls} profileId={profile.id} onClose={() => setShowUsageModal(false)} onSaved={() => { setShowUsageModal(false); loadRolls(); loadUsage() }} />}
      {remnantModal && <CutRemnantModal item={remnantModal} onClose={() => setRemnantModal(null)} onSaved={() => setRemnantModal(null)} />}
    </div>
  )
}

// ─── Add Roll Modal ───────────────────────────────────────────────────────────
function AddRollModal({ orgId, onClose, onAdded }: { orgId: string; onClose: () => void; onAdded: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    brand: '', color: '', finish: 'Gloss', sku: '', type: 'vinyl',
    width_in: '60', roll_length_ft: '150', qty_rolls: '1',
    cost_per_sqft: '0.85', cost_per_roll: '', location: '', low_stock_threshold: '50', notes: '',
  })
  const f = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  async function save() {
    if (!form.brand || !form.color) return
    setSaving(true)
    const widthIn = parseFloat(form.width_in) || 60
    const lenFt = parseFloat(form.roll_length_ft) || 150
    const qtyRolls = parseFloat(form.qty_rolls) || 1
    await supabase.from('vinyl_inventory').insert({
      org_id: orgId, name: `${form.brand} ${form.color} ${form.finish}`,
      brand: form.brand, color: form.color, finish: form.finish, sku: form.sku, type: form.type,
      width_in: widthIn, roll_length_ft: lenFt, qty_rolls: qtyRolls,
      qty_sqft: (widthIn / 12) * lenFt * qtyRolls,
      cost_per_sqft: parseFloat(form.cost_per_sqft) || 0,
      cost_per_roll: parseFloat(form.cost_per_roll) || 0,
      low_stock_threshold: parseFloat(form.low_stock_threshold) || 0,
      location: form.location, notes: form.notes, status: 'in_stock',
    })
    setSaving(false)
    onAdded()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif' }}>Add Material Roll</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Fld label="Brand *">
              <select style={inp} value={form.brand} onChange={e => f('brand', e.target.value)}>
                <option value="">Select brand</option>
                {BRANDS.map(b => <option key={b}>{b}</option>)}
              </select>
            </Fld>
            <Fld label="Color Name *"><input style={inp} placeholder="Gloss Black" value={form.color} onChange={e => f('color', e.target.value)} /></Fld>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Fld label="Finish">
              <select style={inp} value={form.finish} onChange={e => f('finish', e.target.value)}>
                {FINISHES.map(x => <option key={x}>{x}</option>)}
              </select>
            </Fld>
            <Fld label="SKU / Part #"><input style={inp} placeholder="3M-1080-G12" value={form.sku} onChange={e => f('sku', e.target.value)} /></Fld>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Fld label="Width (in)"><input type="number" style={inp} value={form.width_in} onChange={e => f('width_in', e.target.value)} /></Fld>
            <Fld label="Roll Length (ft)"><input type="number" style={inp} value={form.roll_length_ft} onChange={e => f('roll_length_ft', e.target.value)} /></Fld>
            <Fld label="# of Rolls"><input type="number" style={inp} value={form.qty_rolls} onChange={e => f('qty_rolls', e.target.value)} /></Fld>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Fld label="Cost / sqft ($)"><input type="number" step="0.01" style={inp} value={form.cost_per_sqft} onChange={e => f('cost_per_sqft', e.target.value)} /></Fld>
            <Fld label="Cost / Roll ($)"><input type="number" step="0.01" style={inp} placeholder="Optional" value={form.cost_per_roll} onChange={e => f('cost_per_roll', e.target.value)} /></Fld>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Fld label="Location / Bin"><input style={inp} placeholder="Rack A1" value={form.location} onChange={e => f('location', e.target.value)} /></Fld>
            <Fld label="Reorder Threshold (sqft)"><input type="number" style={inp} placeholder="50" value={form.low_stock_threshold} onChange={e => f('low_stock_threshold', e.target.value)} /></Fld>
          </div>
          <Fld label="Notes"><input style={inp} placeholder="Optional" value={form.notes} onChange={e => f('notes', e.target.value)} /></Fld>
          {form.width_in && form.roll_length_ft && (
            <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, fontSize: 12, color: 'var(--cyan)' }}>
              Total sqft: {((parseFloat(form.width_in) / 12) * parseFloat(form.roll_length_ft) * (parseFloat(form.qty_rolls) || 1)).toFixed(1)} sqft
              {form.cost_per_sqft && ` · Est. value: ${fmtMoney((parseFloat(form.width_in) / 12) * parseFloat(form.roll_length_ft) * (parseFloat(form.qty_rolls) || 1) * parseFloat(form.cost_per_sqft))}`}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={save} disabled={!form.brand || !form.color || saving}
              style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: (!form.brand || !form.color) ? 0.5 : 1 }}>
              {saving ? 'Adding...' : 'Add Roll'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Log Usage Modal ──────────────────────────────────────────────────────────
function LogUsageModal({ orgId, rolls, profileId, onClose, onSaved }: {
  orgId: string; rolls: VinylRoll[]; profileId: string; onClose: () => void; onSaved: () => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([])
  const [form, setForm] = useState({ vinyl_id: '', project_id: '', sqft_used: '', notes: '' })
  const f = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  useEffect(() => {
    supabase.from('projects').select('id, title').eq('org_id', orgId)
      .order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => setProjects(data || []))
  }, [supabase, orgId])

  const selectedRoll = rolls.find(r => r.id === form.vinyl_id)

  async function save() {
    if (!form.vinyl_id || !form.sqft_used) return
    setSaving(true)
    const sqft = parseFloat(form.sqft_used)
    const linft = selectedRoll ? sqft / (selectedRoll.width_in / 12) : 0
    await supabase.from('vinyl_usage').insert({
      org_id: orgId, vinyl_id: form.vinyl_id, project_id: form.project_id || null,
      recorded_by: profileId, sqft_used: sqft, linft_used: linft, notes: form.notes,
    })
    if (selectedRoll) {
      const newQty = Math.max(0, selectedRoll.qty_sqft - sqft)
      const threshold = selectedRoll.low_stock_threshold || 0
      const newStatus = newQty <= 0 ? 'out_of_stock' : (threshold > 0 && newQty <= threshold) ? 'low_stock' : 'in_stock'
      await supabase.from('vinyl_inventory').update({ qty_sqft: newQty, status: newStatus }).eq('id', form.vinyl_id)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif' }}>Log Material Usage</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Fld label="Vinyl Roll *">
            <select style={inp} value={form.vinyl_id} onChange={e => f('vinyl_id', e.target.value)}>
              <option value="">Select roll...</option>
              {rolls.map(r => (
                <option key={r.id} value={r.id}>{r.brand} {r.color} {r.finish} — {r.qty_sqft.toFixed(0)} sqft remaining</option>
              ))}
            </select>
          </Fld>
          <Fld label="Project">
            <select style={inp} value={form.project_id} onChange={e => f('project_id', e.target.value)}>
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </Fld>
          <Fld label="Sqft Used *">
            <input type="number" step="0.5" style={inp} placeholder="e.g. 45.0" value={form.sqft_used} onChange={e => f('sqft_used', e.target.value)} />
          </Fld>
          {selectedRoll && form.sqft_used && (
            <div style={{ padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, fontSize: 12, color: 'var(--text3)' }}>
              Remaining after: <strong style={{ color: 'var(--cyan)' }}>{Math.max(0, selectedRoll.qty_sqft - (parseFloat(form.sqft_used) || 0)).toFixed(1)} sqft</strong>
              {selectedRoll.cost_per_sqft > 0 && <> · Material cost: <strong style={{ color: 'var(--green)' }}>{fmtMoney((parseFloat(form.sqft_used) || 0) * selectedRoll.cost_per_sqft)}</strong></>}
            </div>
          )}
          <Fld label="Notes"><input style={inp} placeholder="Job section, installer notes..." value={form.notes} onChange={e => f('notes', e.target.value)} /></Fld>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={save} disabled={!form.vinyl_id || !form.sqft_used || saving}
              style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 8, background: 'var(--cyan)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: (!form.vinyl_id || !form.sqft_used) ? 0.5 : 1 }}>
              {saving ? 'Logging...' : 'Log Usage'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Cut Remnant Modal ────────────────────────────────────────────────────────
function CutRemnantModal({ item, onClose, onSaved }: { item: VinylRoll; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ width_inches: '', length_inches: '', location: 'Remnant bin', notes: '' })
  const f = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  async function save() {
    const w = parseFloat(form.width_inches)
    const l = parseFloat(form.length_inches)
    if (!w || !l) return
    setSaving(true)
    await supabase.from('material_remnants').insert({
      material_name: `${item.brand} ${item.color}`, material_type: 'vinyl',
      color: item.color, finish: item.finish, width_inches: w, length_inches: l,
      sqft: (w * l) / 144, status: 'available', from_roll_id: item.id,
      location: form.location, notes: form.notes,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, width: 380, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Scissors size={15} style={{ color: 'var(--cyan)' }} /> Cut Remnant
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{item.brand} {item.color}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Fld label="Width (in)"><input type="number" style={inp} placeholder="e.g. 36" value={form.width_inches} onChange={e => f('width_inches', e.target.value)} /></Fld>
            <Fld label="Length (in)"><input type="number" style={inp} placeholder="e.g. 60" value={form.length_inches} onChange={e => f('length_inches', e.target.value)} /></Fld>
          </div>
          {form.width_inches && form.length_inches && (
            <div style={{ fontSize: 12, color: 'var(--cyan)', fontWeight: 600 }}>
              {((parseFloat(form.width_inches) * parseFloat(form.length_inches)) / 144).toFixed(2)} sqft
            </div>
          )}
          <Fld label="Location"><input style={inp} placeholder="Remnant bin" value={form.location} onChange={e => f('location', e.target.value)} /></Fld>
          <Fld label="Notes"><input style={inp} placeholder="Optional" value={form.notes} onChange={e => f('notes', e.target.value)} /></Fld>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 10, border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={save} disabled={!form.width_inches || !form.length_inches || saving}
              style={{ flex: 1, padding: 10, border: 'none', borderRadius: 8, background: 'var(--cyan)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              {saving ? 'Saving...' : 'Save Remnant'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
