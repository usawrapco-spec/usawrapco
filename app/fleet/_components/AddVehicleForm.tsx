'use client'

import { useState } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { VehicleMeasurementPicker } from '@/components/VehicleMeasurementPicker'

interface Customer {
  id: string
  name: string
  business_name?: string
}

interface Props {
  customers: Customer[]
  onClose: () => void
  onSaved: () => void
  initial?: any
}

export default function AddVehicleForm({ customers, onClose, onSaved, initial }: Props) {
  const [form, setForm] = useState({
    year: initial?.year || '',
    make: initial?.make || '',
    model: initial?.model || '',
    trim: initial?.trim || '',
    color: initial?.color || '',
    vin: initial?.vin || '',
    body_class: initial?.body_class || '',
    engine: initial?.engine || '',
    fuel_type: initial?.fuel_type || '',
    drive_type: initial?.drive_type || '',
    customer_id: initial?.customer_id || '',
    wrap_status: initial?.wrap_status || 'none',
    notes: initial?.notes || '',
    source: initial?.source || 'manual',
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const method = initial?.id ? 'PATCH' : 'POST'
      const body = initial?.id ? { id: initial.id, ...form } : form
      const res = await fetch('/api/fleet/vehicles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) onSaved()
    } catch (err) {
      console.error('Save vehicle error:', err)
    } finally {
      setSaving(false)
    }
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    background: 'var(--surface2)', border: '1px solid var(--border)',
    color: 'var(--text1)', fontSize: 13, outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--text3)',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block',
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, maxWidth: '100vw',
      background: 'var(--surface)', borderLeft: '1px solid var(--border)',
      zIndex: 1000, display: 'flex', flexDirection: 'column',
      animation: 'slideInRight 0.2s ease',
    }}>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif' }}>
          {initial?.id ? 'Edit Vehicle' : 'Add Vehicle'}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
          <X size={18} />
        </button>
      </div>

      {/* Form */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Vehicle Measurement Picker (Year / Make / Model) */}
        <div style={{ padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <VehicleMeasurementPicker
            compact={true}
            showDetailedBreakdown={false}
            initialYear={form.year ? Number(form.year) : undefined}
            initialMake={form.make || undefined}
            initialModel={form.model || undefined}
            onVehicleChange={(yr, mk, mdl) => {
              setForm(f => ({ ...f, year: String(yr), make: mk, model: mdl }))
            }}
            onMeasurementFound={(m) => {
              setForm(f => ({
                ...f,
                body_class: m.body_style || f.body_class,
              }))
            }}
          />
        </div>
        <div>
          <label style={labelStyle}>Trim</label>
          <input style={fieldStyle} value={form.trim} onChange={e => setForm(f => ({ ...f, trim: e.target.value }))} placeholder="XLT" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Color</label>
            <input style={fieldStyle} value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="White" />
          </div>
          <div>
            <label style={labelStyle}>Body Type</label>
            <input style={fieldStyle} value={form.body_class} onChange={e => setForm(f => ({ ...f, body_class: e.target.value }))} placeholder="Van" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>VIN</label>
          <input style={{ ...fieldStyle, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}
            value={form.vin} onChange={e => setForm(f => ({ ...f, vin: e.target.value.toUpperCase() }))}
            placeholder="1FTBW2CM5MKA12345" maxLength={17} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Engine</label>
            <input style={fieldStyle} value={form.engine} onChange={e => setForm(f => ({ ...f, engine: e.target.value }))} placeholder="3.5L V6" />
          </div>
          <div>
            <label style={labelStyle}>Fuel Type</label>
            <input style={fieldStyle} value={form.fuel_type} onChange={e => setForm(f => ({ ...f, fuel_type: e.target.value }))} placeholder="Gasoline" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Drive Type</label>
          <input style={fieldStyle} value={form.drive_type} onChange={e => setForm(f => ({ ...f, drive_type: e.target.value }))} placeholder="AWD" />
        </div>
        <div>
          <label style={labelStyle}>Customer</label>
          <select style={fieldStyle} value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
            <option value="">-- No Customer --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.business_name ? ` (${c.business_name})` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Wrap Status</label>
          <select style={fieldStyle} value={form.wrap_status} onChange={e => setForm(f => ({ ...f, wrap_status: e.target.value }))}>
            <option value="none">None</option>
            <option value="quoted">Quoted</option>
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In Progress</option>
            <option value="wrapped">Wrapped</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Notes</label>
          <textarea style={{ ...fieldStyle, minHeight: 60, resize: 'vertical' }}
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Any notes about this vehicle..." />
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} className="btn-ghost" style={{
          padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer',
        }}>
          Cancel
        </button>
        <button onClick={save} disabled={saving} style={{
          padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
          opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {initial?.id ? 'Update' : 'Add Vehicle'}
        </button>
      </div>
    </div>
  )
}
