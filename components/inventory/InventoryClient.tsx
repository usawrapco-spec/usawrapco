'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { Package, Plus, AlertTriangle, Scissors, Trash2, X, CheckCircle } from 'lucide-react'

interface VinylItem {
  id: string
  brand: string
  color: string
  finish: string
  sku: string
  rollWidth: number   // inches
  totalLength: number // feet (original)
  sqftAvailable: number // remaining sqft
  costPerFoot: number
  location: string
  status: 'in_stock' | 'low' | 'out' | 'on_order' | 'consumed'
  notes: string
  wasteSqft: number
}

function dbToItem(row: Record<string, unknown>): VinylItem {
  const widthInches = Number(row.width_inches) || 60
  const totalLenFt  = Number(row.length_ft) || 150
  const sqftTotal   = (widthInches / 12) * totalLenFt
  const sqftAvail   = Number(row.sqft_available) ?? sqftTotal
  const pct         = sqftTotal > 0 ? sqftAvail / sqftTotal : 1
  let status: VinylItem['status'] = (row.status as VinylItem['status']) || 'in_stock'
  // Auto-compute status if DB doesn't have it right
  if (status !== 'consumed' && status !== 'on_order') {
    if (sqftAvail <= 0) status = 'out'
    else if (pct < 0.2) status = 'low'
    else status = 'in_stock'
  }
  return {
    id:           String(row.id),
    brand:        String(row.brand || ''),
    color:        String(row.color || ''),
    finish:       String(row.finish || ''),
    sku:          String(row.sku || ''),
    rollWidth:    widthInches,
    totalLength:  totalLenFt,
    sqftAvailable: sqftAvail,
    costPerFoot:  Number(row.cost_per_foot) || 0,
    location:     String(row.location || ''),
    status,
    notes:        String(row.notes || ''),
    wasteSqft:    Number(row.waste_sqft) || 0,
  }
}

interface InventoryClientProps {
  profile: Profile
}

export function InventoryClient({ profile }: InventoryClientProps) {
  const supabase = createClient()
  const [inventory, setInventory] = useState<VinylItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [brandFilter, setBrandFilter]   = useState<string>('all')
  const [showAddModal, setShowAddModal]  = useState(false)
  const [wasteModal, setWasteModal]     = useState<VinylItem | null>(null)
  const [remnantModal, setRemnantModal] = useState<VinylItem | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('vinyl_inventory')
      .select('*')
      .eq('org_id', profile.org_id)
      .neq('status', 'consumed')
      .order('created_at', { ascending: false })
    setInventory((data || []).map(dbToItem))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let list = [...inventory]
    if (statusFilter !== 'all') list = list.filter(v => v.status === statusFilter)
    if (brandFilter !== 'all') list = list.filter(v => v.brand === brandFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(v =>
        v.color.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.sku.toLowerCase().includes(q) ||
        v.finish.toLowerCase().includes(q)
      )
    }
    return list
  }, [inventory, statusFilter, brandFilter, search])

  const brands       = Array.from(new Set(inventory.map(v => v.brand)))
  const totalValue   = inventory.reduce((s, v) => s + (v.sqftAvailable * v.costPerFoot), 0)
  const lowItems     = inventory.filter(v => v.status === 'low' || v.status === 'out')
  const totalRolls   = inventory.length
  const inStockRolls = inventory.filter(v => v.status === 'in_stock').length

  const statusBadgeColor: Record<string, string> = {
    in_stock: 'var(--green)',
    low:      'var(--amber)',
    out:      'var(--red)',
    on_order: 'var(--accent)',
  }
  const statusLabel: Record<string, string> = {
    in_stock: 'In Stock',
    low:      'Low',
    out:      'Out',
    on_order: 'On Order',
  }

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  async function handleMarkConsumed(item: VinylItem) {
    if (!confirm(`Mark "${item.brand} ${item.color}" as fully consumed?`)) return
    await fetch('/api/inventory/consume-roll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollId: item.id }),
    })
    setInventory(prev => prev.filter(v => v.id !== item.id))
  }

  async function handleLogWaste(item: VinylItem, wasteSqft: number, reason: string) {
    const { error } = await supabase
      .from('vinyl_inventory')
      .update({ waste_sqft: (item.wasteSqft || 0) + wasteSqft, notes: reason || item.notes })
      .eq('id', item.id)
    if (!error) {
      setInventory(prev => prev.map(v =>
        v.id === item.id ? { ...v, wasteSqft: (v.wasteSqft || 0) + wasteSqft } : v
      ))
    }
    setWasteModal(null)
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 30, fontWeight: 900, color: 'var(--text1)', marginBottom: 4 }}>
            Vinyl Inventory
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>Track rolls, materials, and stock levels</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          <Plus size={15} /> Add Roll
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Rolls', val: totalRolls, sub: `${inStockRolls} in stock`, color: 'var(--text1)' },
          { label: 'Inventory Value', val: fmtMoney(totalValue), sub: 'Remaining material', color: 'var(--green)' },
          { label: 'Low / Out', val: lowItems.length, sub: 'Need reorder', color: lowItems.length > 0 ? 'var(--red)' : 'var(--green)' },
          { label: 'Brands', val: brands.length, sub: '', color: 'var(--purple)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
            {s.sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Alerts */}
      {lowItems.length > 0 && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.35)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle size={16} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Reorder Alert</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {lowItems.map(v => (
                <span key={v.id} style={{ padding: '2px 8px', background: 'rgba(242,90,90,0.12)', color: 'var(--red)', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>
                  {v.brand} {v.color} — {v.status === 'out' ? 'OUT' : 'LOW'}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input
          type="text"
          placeholder="Search — color, brand, SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none' }}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', fontSize: 13, outline: 'none', minWidth: 120 }}
        >
          <option value="all">All Status</option>
          <option value="in_stock">In Stock</option>
          <option value="low">Low</option>
          <option value="out">Out</option>
          <option value="on_order">On Order</option>
        </select>
        <select
          value={brandFilter}
          onChange={e => setBrandFilter(e.target.value)}
          style={{ padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', fontSize: 13, outline: 'none', minWidth: 110 }}
        >
          <option value="all">All Brands</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>Loading inventory...</div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Material', 'SKU', 'Width', 'Remaining', 'Cost/ft', 'Value', 'Location', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 13 }}>
                    {loading ? 'Loading...' : search ? 'No materials matching search.' : 'No inventory items. Add a roll to get started.'}
                  </td>
                </tr>
              ) : filtered.map((v, i) => {
                const sqftTotal  = (v.rollWidth / 12) * v.totalLength
                const pct        = sqftTotal > 0 ? Math.min(100, (v.sqftAvailable / sqftTotal) * 100) : 0
                const value      = v.sqftAvailable * v.costPerFoot
                const barColor   = pct > 50 ? 'var(--green)' : pct > 20 ? 'var(--amber)' : 'var(--red)'
                const bColor     = statusBadgeColor[v.status] || 'var(--text3)'
                return (
                  <tr key={v.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', background: 'transparent' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{v.brand} {v.color}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{v.finish}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text2)' }}>{v.sku || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text2)' }}>{v.rollWidth}"</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 6, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>
                          {v.sqftAvailable.toFixed(0)} sqft
                        </span>
                      </div>
                      {v.wasteSqft > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Waste: {v.wasteSqft.toFixed(1)} sqft</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text2)' }}>
                      ${v.costPerFoot.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                      {fmtMoney(value)}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text3)' }}>{v.location || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${bColor}18`, color: bColor }}>
                        {statusLabel[v.status] || v.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => setWasteModal(v)}
                          title="Log Waste"
                          style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--amber)', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}
                        >
                          Waste
                        </button>
                        <button
                          onClick={() => setRemnantModal(v)}
                          title="Cut Remnant"
                          style={{ padding: '4px 6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Scissors size={12} />
                        </button>
                        <button
                          onClick={() => handleMarkConsumed(v)}
                          title="Mark Consumed"
                          style={{ padding: '4px 6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
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

      {/* Add Roll Modal */}
      {showAddModal && (
        <AddRollModal
          orgId={profile.org_id}
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); load() }}
        />
      )}

      {/* Log Waste Modal */}
      {wasteModal && (
        <LogWasteModal
          item={wasteModal}
          onClose={() => setWasteModal(null)}
          onSave={(sqft, reason) => handleLogWaste(wasteModal, sqft, reason)}
        />
      )}

      {/* Cut Remnant Modal */}
      {remnantModal && (
        <CutRemnantModal
          item={remnantModal}
          onClose={() => setRemnantModal(null)}
          onSaved={() => { setRemnantModal(null) }}
        />
      )}
    </div>
  )
}

// ─── Add Roll Modal ───────────────────────────────────────────────────────────
function AddRollModal({ orgId, onClose, onAdded }: { orgId: string; onClose: () => void; onAdded: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    brand: '', color: '', finish: 'Gloss', sku: '',
    width_inches: '60', length_ft: '150', cost_per_foot: '4.50', location: '', notes: '',
  })

  async function save() {
    if (!form.brand || !form.color) return
    setSaving(true)
    const widthIn  = parseFloat(form.width_inches) || 60
    const lenFt    = parseFloat(form.length_ft) || 150
    const sqftAvailable = (widthIn / 12) * lenFt
    await supabase.from('vinyl_inventory').insert({
      ...form,
      width_inches: widthIn,
      length_ft: lenFt,
      sqft_available: sqftAvailable,
      cost_per_foot: parseFloat(form.cost_per_foot) || 0,
      status: 'in_stock',
      org_id: orgId,
    })
    setSaving(false)
    onAdded()
  }

  const f = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 440, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif' }}>Add Material Roll</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Fld label="Brand"><input style={inp} placeholder="3M, Avery, XPEL…" value={form.brand} onChange={e => f('brand', e.target.value)} /></Fld>
            <Fld label="Color"><input style={inp} placeholder="Gloss Black" value={form.color} onChange={e => f('color', e.target.value)} /></Fld>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Fld label="Finish">
              <select style={inp} value={form.finish} onChange={e => f('finish', e.target.value)}>
                {['Gloss', 'Matte', 'Satin', 'Metallic', 'Textured', 'Clear', 'Chrome'].map(x => <option key={x}>{x}</option>)}
              </select>
            </Fld>
            <Fld label="SKU"><input style={inp} placeholder="3M-1080-G12" value={form.sku} onChange={e => f('sku', e.target.value)} /></Fld>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Fld label="Width (in)"><input type="number" style={inp} value={form.width_inches} onChange={e => f('width_inches', e.target.value)} /></Fld>
            <Fld label="Length (ft)"><input type="number" style={inp} value={form.length_ft} onChange={e => f('length_ft', e.target.value)} /></Fld>
            <Fld label="Cost/ft ($)"><input type="number" step="0.01" style={inp} value={form.cost_per_foot} onChange={e => f('cost_per_foot', e.target.value)} /></Fld>
          </div>
          <Fld label="Location"><input style={inp} placeholder="Rack A1" value={form.location} onChange={e => f('location', e.target.value)} /></Fld>
          <Fld label="Notes"><input style={inp} placeholder="Optional" value={form.notes} onChange={e => f('notes', e.target.value)} /></Fld>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={save} disabled={!form.brand || !form.color || saving} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              {saving ? 'Adding...' : 'Add Roll'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Log Waste Modal ──────────────────────────────────────────────────────────
function LogWasteModal({ item, onClose, onSave }: { item: VinylItem; onClose: () => void; onSave: (sqft: number, reason: string) => void }) {
  const [sqft, setSqft]     = useState('')
  const [reason, setReason] = useState('')

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, width: 360, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>Log Waste — {item.brand} {item.color}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Fld label="Waste (sqft)"><input type="number" style={inp} placeholder="e.g. 3.5" value={sqft} onChange={e => setSqft(e.target.value)} /></Fld>
          <Fld label="Reason"><input style={inp} placeholder="Trim, mistake, defect..." value={reason} onChange={e => setReason(e.target.value)} /></Fld>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 10, border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={() => onSave(parseFloat(sqft) || 0, reason)} disabled={!sqft} style={{ flex: 1, padding: 10, border: 'none', borderRadius: 8, background: 'var(--amber)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              Log Waste
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Cut Remnant Modal ────────────────────────────────────────────────────────
function CutRemnantModal({ item, onClose, onSaved }: { item: VinylItem; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm]     = useState({ width_inches: '', length_inches: '', location: 'Remnant bin', notes: '' })

  async function save() {
    const w = parseFloat(form.width_inches)
    const l = parseFloat(form.length_inches)
    if (!w || !l) return
    setSaving(true)
    const sqft = (w * l) / 144
    await supabase.from('material_remnants').insert({
      material_name: `${item.brand} ${item.color}`,
      material_type: 'vinyl',
      color:         item.color,
      finish:        item.finish,
      width_inches:  w,
      length_inches: l,
      sqft,
      status:        'available',
      from_roll_id:  item.id,
      location:      form.location,
      notes:         form.notes,
    })
    setSaving(false)
    onSaved()
  }

  const f = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

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
            <button onClick={save} disabled={!form.width_inches || !form.length_inches || saving} style={{ flex: 1, padding: 10, border: 'none', borderRadius: 8, background: 'var(--cyan)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              {saving ? 'Saving...' : 'Save Remnant'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text1)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}
