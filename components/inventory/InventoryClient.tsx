'use client'

import { useState, useMemo } from 'react'
import type { Profile } from '@/types'
import { clsx } from 'clsx'

interface VinylItem {
  id: string
  brand: string
  color: string
  finish: string
  sku: string
  rollWidth: number   // inches
  totalLength: number // feet
  usedLength: number  // feet
  costPerFoot: number
  location: string
  status: 'in_stock' | 'low' | 'out' | 'on_order'
  notes: string
}

// Default inventory items for demo — in production these come from Supabase
const DEFAULT_INVENTORY: VinylItem[] = [
  { id: '1', brand: '3M', color: 'Gloss Black', finish: 'Gloss', sku: '3M-1080-G12', rollWidth: 60, totalLength: 150, usedLength: 45, costPerFoot: 4.50, location: 'Rack A1', status: 'in_stock', notes: '' },
  { id: '2', brand: '3M', color: 'Satin White', finish: 'Satin', sku: '3M-1080-S10', rollWidth: 60, totalLength: 150, usedLength: 120, costPerFoot: 4.50, location: 'Rack A2', status: 'low', notes: 'Reorder soon' },
  { id: '3', brand: 'Avery', color: 'Matte Military Green', finish: 'Matte', sku: 'AV-SW900-MG', rollWidth: 60, totalLength: 75, usedLength: 75, costPerFoot: 5.00, location: 'Rack B1', status: 'out', notes: '' },
  { id: '4', brand: '3M', color: 'Gloss Hot Rod Red', finish: 'Gloss', sku: '3M-1080-G13', rollWidth: 60, totalLength: 150, usedLength: 30, costPerFoot: 4.50, location: 'Rack A3', status: 'in_stock', notes: '' },
  { id: '5', brand: 'XPEL', color: 'Clear PPF', finish: 'Clear', sku: 'XPEL-ULT-60', rollWidth: 60, totalLength: 100, usedLength: 55, costPerFoot: 8.00, location: 'Rack C1', status: 'in_stock', notes: 'Premium PPF' },
  { id: '6', brand: 'Avery', color: 'Gloss Metallic Blue', finish: 'Metallic', sku: 'AV-SW900-MB', rollWidth: 60, totalLength: 75, usedLength: 10, costPerFoot: 5.50, location: 'Rack B2', status: 'in_stock', notes: '' },
  { id: '7', brand: '3M', color: 'Carbon Fiber Black', finish: 'Textured', sku: '3M-1080-CF12', rollWidth: 60, totalLength: 50, usedLength: 42, costPerFoot: 6.00, location: 'Rack A4', status: 'low', notes: '' },
  { id: '8', brand: 'Hexis', color: 'Gloss Nardo Gray', finish: 'Gloss', sku: 'HX-30G-NG', rollWidth: 54, totalLength: 75, usedLength: 0, costPerFoot: 4.00, location: 'Rack D1', status: 'on_order', notes: 'Arriving next week' },
]

interface InventoryClientProps {
  profile: Profile
}

export function InventoryClient({ profile }: InventoryClientProps) {
  const [inventory, setInventory] = useState<VinylItem[]>(DEFAULT_INVENTORY)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [brandFilter, setBrandFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

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

  const brands = [...new Set(inventory.map(v => v.brand))]
  const totalValue = inventory.reduce((s, v) => s + ((v.totalLength - v.usedLength) * v.costPerFoot), 0)
  const lowItems = inventory.filter(v => v.status === 'low' || v.status === 'out')
  const totalRolls = inventory.length
  const inStockRolls = inventory.filter(v => v.status === 'in_stock').length

  const statusBadge: Record<string, string> = {
    in_stock: 'badge-green',
    low: 'badge-amber',
    out: 'badge-red',
    on_order: 'badge-accent',
  }
  const statusLabel: Record<string, string> = {
    in_stock: 'In Stock',
    low: 'Low',
    out: 'Out',
    on_order: 'On Order',
  }

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  function updateUsed(id: string, amount: number) {
    setInventory(prev => prev.map(v => {
      if (v.id !== id) return v
      const newUsed = Math.min(Math.max(0, v.usedLength + amount), v.totalLength)
      const remaining = v.totalLength - newUsed
      const pct = remaining / v.totalLength
      let status: VinylItem['status'] = 'in_stock'
      if (remaining <= 0) status = 'out'
      else if (pct < 0.2) status = 'low'
      return { ...v, usedLength: newUsed, status }
    }))
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-900 text-text1"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            🎨 Vinyl Inventory
          </h1>
          <p className="text-sm text-text3 mt-1">
            Track rolls, materials, and stock levels
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          ＋ Add Material
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="text-xs font-700 text-text3 uppercase tracking-wider mb-1">Total Rolls</div>
          <div className="mono text-2xl font-800 text-text1">{totalRolls}</div>
          <div className="text-xs text-text3 mt-0.5">{inStockRolls} in stock</div>
        </div>
        <div className="card">
          <div className="text-xs font-700 text-text3 uppercase tracking-wider mb-1">Inventory Value</div>
          <div className="mono text-2xl font-800 text-green">{fmtMoney(totalValue)}</div>
          <div className="text-xs text-text3 mt-0.5">Remaining material</div>
        </div>
        <div className="card">
          <div className="text-xs font-700 text-text3 uppercase tracking-wider mb-1">Low / Out</div>
          <div className={clsx('mono text-2xl font-800', lowItems.length > 0 ? 'text-red' : 'text-green')}>
            {lowItems.length}
          </div>
          <div className="text-xs text-text3 mt-0.5">Need reorder</div>
        </div>
        <div className="card">
          <div className="text-xs font-700 text-text3 uppercase tracking-wider mb-1">Brands</div>
          <div className="mono text-2xl font-800 text-purple">{brands.length}</div>
        </div>
      </div>

      {/* Alerts */}
      {lowItems.length > 0 && (
        <div className="mb-5 p-4 bg-red/8 border-2 border-red/40 rounded-xl">
          <div className="text-xs font-900 text-red uppercase tracking-wider mb-2">⚠️ Reorder Alert</div>
          <div className="flex flex-wrap gap-2">
            {lowItems.map(v => (
              <span key={v.id} className="badge badge-red">
                {v.brand} {v.color} — {v.status === 'out' ? 'OUT' : 'LOW'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            className="field pl-8"
            placeholder="Search vinyl — color, brand, SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text3">🔍</span>
        </div>
        <select className="field w-32" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="in_stock">In Stock</option>
          <option value="low">Low</option>
          <option value="out">Out</option>
          <option value="on_order">On Order</option>
        </select>
        <select className="field w-28" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
          <option value="all">All Brands</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Inventory Table */}
      <div className="card p-0 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>SKU</th>
              <th>Width</th>
              <th>Remaining</th>
              <th>Cost/ft</th>
              <th>Value</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-text3 text-sm">
                  {search ? 'No materials matching search.' : 'No inventory items.'}
                </td>
              </tr>
            ) : filtered.map(v => {
              const remaining = v.totalLength - v.usedLength
              const pct = (remaining / v.totalLength) * 100
              const value = remaining * v.costPerFoot
              return (
                <tr key={v.id}>
                  <td>
                    <div className="font-700 text-text1 text-sm">{v.brand} {v.color}</div>
                    <div className="text-xs text-text3">{v.finish}</div>
                  </td>
                  <td className="mono text-xs text-text2">{v.sku}</td>
                  <td className="text-text2 text-sm">{v.rollWidth}"</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-surface2 rounded-full overflow-hidden">
                        <div
                          className={clsx('h-full rounded-full',
                            pct > 50 ? 'bg-green' : pct > 20 ? 'bg-amber' : 'bg-red'
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="mono text-xs font-600 text-text2">
                        {remaining.toFixed(0)}ft / {v.totalLength}ft
                      </span>
                    </div>
                  </td>
                  <td className="mono text-sm text-text2">${v.costPerFoot.toFixed(2)}</td>
                  <td className="mono text-sm font-600 text-green">{fmtMoney(value)}</td>
                  <td className="text-xs text-text3">{v.location}</td>
                  <td>
                    <span className={statusBadge[v.status]}>{statusLabel[v.status]}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        className="btn-ghost btn-xs"
                        onClick={() => updateUsed(v.id, 10)}
                        title="Use 10ft"
                      >
                        -10ft
                      </button>
                      <button
                        className="btn-ghost btn-xs"
                        onClick={() => updateUsed(v.id, -10)}
                        title="Add 10ft"
                      >
                        +10ft
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add Material Modal */}
      {showAddModal && (
        <AddMaterialModal
          onClose={() => setShowAddModal(false)}
          onAdd={(item) => {
            setInventory(prev => [...prev, { ...item, id: Date.now().toString() }])
            setShowAddModal(false)
          }}
        />
      )}
    </div>
  )
}

function AddMaterialModal({ onClose, onAdd }: {
  onClose: () => void
  onAdd: (item: Omit<VinylItem, 'id'>) => void
}) {
  const [brand, setBrand] = useState('')
  const [color, setColor] = useState('')
  const [finish, setFinish] = useState('Gloss')
  const [sku, setSku] = useState('')
  const [rollWidth, setRollWidth] = useState('60')
  const [totalLength, setTotalLength] = useState('150')
  const [costPerFoot, setCostPerFoot] = useState('4.50')
  const [location, setLocation] = useState('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="card anim-pop-in w-full max-w-md" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="font-display text-xl font-900" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            ＋ Add Material
          </div>
          <button onClick={onClose} className="text-text3 hover:text-text1 text-lg">✕</button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Brand</label>
              <input className="field" placeholder="3M, Avery, XPEL…" value={brand} onChange={e => setBrand(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Color</label>
              <input className="field" placeholder="Gloss Black" value={color} onChange={e => setColor(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Finish</label>
              <select className="field" value={finish} onChange={e => setFinish(e.target.value)}>
                {['Gloss','Matte','Satin','Metallic','Textured','Clear','Chrome'].map(f =>
                  <option key={f} value={f}>{f}</option>
                )}
              </select>
            </div>
            <div>
              <label className="field-label">SKU</label>
              <input className="field" placeholder="3M-1080-G12" value={sku} onChange={e => setSku(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="field-label">Width (in)</label>
              <input type="number" className="field" value={rollWidth} onChange={e => setRollWidth(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Length (ft)</label>
              <input type="number" className="field" value={totalLength} onChange={e => setTotalLength(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Cost/ft ($)</label>
              <input type="number" step="0.01" className="field" value={costPerFoot} onChange={e => setCostPerFoot(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="field-label">Location</label>
            <input className="field" placeholder="Rack A1" value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <button
            className="btn-primary mt-2"
            disabled={!brand || !color}
            onClick={() => onAdd({
              brand, color, finish, sku,
              rollWidth: parseFloat(rollWidth) || 60,
              totalLength: parseFloat(totalLength) || 150,
              usedLength: 0,
              costPerFoot: parseFloat(costPerFoot) || 0,
              location,
              status: 'in_stock',
              notes: '',
            })}
          >
            Add Material →
          </button>
        </div>
      </div>
    </div>
  )
}
