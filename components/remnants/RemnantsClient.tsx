'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Package, ArrowLeft, X, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import type { Profile } from '@/types'

interface Remnant {
  id: string
  material_name: string
  material_type: string
  color: string
  finish: string
  width_inches: number
  length_inches: number
  sqft: number
  status: 'available' | 'reserved' | 'consumed'
  from_roll_id: string
  location: string
  notes: string
  created_at: string
}

interface Props { profile: Profile }

const fN = (n: number) => n?.toFixed(2) || '0.00'

export default function RemnantsClient({ profile }: Props) {
  const [remnants, setRemnants] = useState<Remnant[]>([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [filter, setFilter]     = useState<'all' | 'available' | 'reserved'>('all')
  const [form, setForm]         = useState({
    material_name: 'Avery MPI 1105', material_type: 'vinyl', color: 'White',
    finish: 'gloss', width_inches: '', length_inches: '', location: 'Main rack', notes: '',
  })
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('material_remnants')
      .select('*')
      .order('created_at', { ascending: false })
    setRemnants(data || [])
    setLoading(false)
  }

  async function save() {
    const w = parseFloat(form.width_inches)
    const l = parseFloat(form.length_inches)
    if (!form.material_name || !w || !l) return
    setSaving(true)
    const sqft = (w * l) / 144
    await supabase.from('material_remnants').insert({
      ...form, width_inches: w, length_inches: l, sqft, status: 'available',
    })
    await load()
    setShowAdd(false)
    setSaving(false)
  }

  async function markUsed(id: string) {
    await supabase.from('material_remnants').update({ status: 'consumed' }).eq('id', id)
    setRemnants(prev => prev.map(r => r.id === id ? { ...r, status: 'consumed' } : r))
  }

  const filtered = remnants.filter(r => filter === 'all' || r.status === filter)

  const statusColor = { available: '#22c07a', reserved: '#f59e0b', consumed: '#5a6080' }

  return (
    <div>
      <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/inventory" style={{ color: 'var(--text3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <ArrowLeft size={14} /> Inventory
        </Link>
      </div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', marginBottom: 4 }}>
            Material Remnants
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            {remnants.filter(r => r.status === 'available').length} usable pieces available
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={14} /> Add Remnant
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'available', 'reserved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: filter === f ? 'var(--accent)' : 'var(--surface)',
              color: filter === f ? '#fff' : 'var(--text3)',
              fontSize: 12, fontWeight: filter === f ? 700 : 400,
              border: filter === f ? 'none' : '1px solid var(--border)',
              textTransform: 'capitalize',
            } as React.CSSProperties}
          >
            {f === 'all' ? `All (${remnants.length})` : `${f} (${remnants.filter(r => r.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Package size={40} style={{ color: 'var(--text3)', opacity: 0.4, margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text3)', fontSize: 13 }}>No remnants {filter !== 'all' ? `with status "${filter}"` : 'yet'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(r => (
            <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{r.material_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{r.color} · {r.finish}</div>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, background: `${statusColor[r.status] || '#5a6080'}18`, color: statusColor[r.status] || '#5a6080', textTransform: 'capitalize' }}>
                  {r.status}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Width', val: `${r.width_inches}"` },
                  { label: 'Length', val: `${r.length_inches}"` },
                  { label: 'Sq Ft', val: fN(r.sqft) },
                ].map(d => (
                  <div key={d.label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{d.val}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{d.label}</div>
                  </div>
                ))}
              </div>
              {r.location && <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>Location: {r.location}</div>}
              {r.status === 'available' && (
                <button
                  onClick={() => markUsed(r.id)}
                  style={{ width: '100%', padding: '7px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <CheckCircle size={13} /> Mark Used
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Remnant Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 440, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>Add Remnant</div>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {[
                { key: 'material_name', label: 'Material Name', placeholder: 'e.g. Avery MPI 1105' },
                { key: 'color', label: 'Color', placeholder: 'e.g. White, Black, Carbon Fiber' },
                { key: 'finish', label: 'Finish', placeholder: 'gloss, matte, satin' },
                { key: 'location', label: 'Location', placeholder: 'e.g. Main rack, Shelf B3' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{f.label}</label>
                  <input value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Width (inches)</label>
                  <input type="number" value={form.width_inches} onChange={e => setForm(p => ({ ...p, width_inches: e.target.value }))} placeholder="60" style={{ width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Length (inches)</label>
                  <input type="number" value={form.length_inches} onChange={e => setForm(p => ({ ...p, length_inches: e.target.value }))} placeholder="120" style={{ width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={save} disabled={!form.material_name || !form.width_inches || !form.length_inches || saving} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving...' : 'Add Remnant'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
