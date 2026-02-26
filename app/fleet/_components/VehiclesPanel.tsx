'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, Truck } from 'lucide-react'
import AddVehicleForm from './AddVehicleForm'

interface Vehicle {
  id: string
  year: string | null
  make: string | null
  model: string | null
  vin: string | null
  color: string | null
  wrap_status: string
  mileage: number
  customer_id: string | null
  customer?: { id: string; name: string; business_name?: string } | null
  notes: string | null
  [key: string]: any
}

interface Customer {
  id: string
  name: string
  business_name?: string
}

interface Props {
  vehicles: Vehicle[]
  customers: Customer[]
  tripMiles: Record<string, number>
  onRefresh: () => void
}

const WRAP_COLORS: Record<string, { bg: string; text: string }> = {
  none: { bg: 'rgba(90,96,128,0.15)', text: 'var(--text3)' },
  quoted: { bg: 'rgba(245,158,11,0.15)', text: 'var(--amber)' },
  scheduled: { bg: 'rgba(79,127,255,0.15)', text: 'var(--accent)' },
  'in-progress': { bg: 'rgba(139,92,246,0.15)', text: 'var(--purple)' },
  wrapped: { bg: 'rgba(34,192,122,0.15)', text: 'var(--green)' },
}

export default function VehiclesPanel({ vehicles, customers, tripMiles, onRefresh }: Props) {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return vehicles
    const q = search.toLowerCase()
    return vehicles.filter(v =>
      `${v.year} ${v.make} ${v.model} ${v.vin} ${v.customer?.name || ''} ${v.customer?.business_name || ''}`.toLowerCase().includes(q)
    )
  }, [vehicles, search])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vehicle?')) return
    await fetch(`/api/fleet/vehicles?id=${id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px',
          border: '1px solid var(--border)',
        }}>
          <Search size={14} style={{ color: 'var(--text3)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search vehicles..."
            style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text1)', fontSize: 13, outline: 'none' }}
          />
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
          }}
        >
          <Plus size={14} /> Add Vehicle
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Vehicle', 'VIN', 'Customer', 'Wrap Status', 'Miles Tracked', ''].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600,
                  color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em',
                  borderBottom: '1px solid var(--border)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
                  <Truck size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                  No vehicles found. Add your first vehicle to get started.
                </td>
              </tr>
            )}
            {filtered.map(v => {
              const wc = WRAP_COLORS[v.wrap_status] || WRAP_COLORS.none
              const miles = tripMiles[v.id] || v.mileage || 0
              return (
                <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--text1)', fontSize: 13, fontWeight: 600 }}>
                    {[v.year, v.make, v.model].filter(Boolean).join(' ') || 'Unknown'}
                    {v.color && <span style={{ color: 'var(--text3)', fontWeight: 400, marginLeft: 6 }}>{v.color}</span>}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text2)' }}>
                    {v.vin ? `${v.vin.slice(0, 11)}...` : '--'}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text2)' }}>
                    {v.customer?.name || '--'}
                    {v.customer?.business_name && <span style={{ color: 'var(--text3)', fontSize: 11, display: 'block' }}>{v.customer.business_name}</span>}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: wc.bg, color: wc.text, textTransform: 'capitalize',
                    }}>
                      {v.wrap_status}
                    </span>
                  </td>
                  <td style={{
                    padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 13, color: 'var(--text1)', fontWeight: 600,
                  }}>
                    {miles.toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => { setEditing(v); setShowForm(true) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 4 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Slide-in form */}
      {showForm && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }}
            onClick={() => setShowForm(false)} />
          <AddVehicleForm
            customers={customers}
            initial={editing}
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); onRefresh() }}
          />
        </>
      )}
    </div>
  )
}
