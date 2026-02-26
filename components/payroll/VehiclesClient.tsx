'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Car, Plus, AlertTriangle, Check, Wrench, Calendar, X,
  Upload, Edit2, Loader2, Truck, User, MapPin
} from 'lucide-react'

interface Vehicle {
  id: string
  make: string
  model: string
  year: number | null
  color: string | null
  plate: string | null
  vin: string | null
  assigned_to: string | null
  current_mileage: number
  insurance_expiry: string | null
  registration_expiry: string | null
  last_oil_change_miles: number | null
  next_oil_change_miles: number | null
  notes: string | null
  active: boolean
  assigned_employee?: { id: string; name: string; email: string; avatar_url: string | null } | null
}

interface MaintenanceRecord {
  id: string
  vehicle_id: string
  type: string
  description: string | null
  cost: number
  mileage_at_service: number | null
  next_service_due_miles: number | null
  next_service_due_date: string | null
  receipt_url: string | null
  performed_by: string | null
  created_at: string
  vehicle?: { make: string; model: string; year: number | null; plate: string | null } | null
}

const MAINTENANCE_TYPES = [
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'tires', label: 'Tires' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'repair', label: 'Repair' },
  { value: 'registration', label: 'Registration' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
]

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default function VehiclesClient({ profile, employees }: { profile: Profile; employees: any[] }) {
  const supabase = createClient()
  const isAdmin = profile.role === 'owner' || profile.role === 'admin'

  const [tab, setTab] = useState<'vehicles' | 'maintenance'>('vehicles')
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [showAddMaintenance, setShowAddMaintenance] = useState(false)

  // Vehicle form
  const [vForm, setVForm] = useState({
    make: '', model: '', year: '', color: '', plate: '', vin: '',
    assigned_to: '', current_mileage: '', insurance_expiry: '',
    registration_expiry: '', notes: ''
  })
  const [vSaving, setVSaving] = useState(false)
  const [vError, setVError] = useState('')

  // Maintenance form
  const [mForm, setMForm] = useState({
    vehicle_id: '', type: 'oil_change', description: '', cost: '',
    mileage_at_service: '', next_service_due_miles: '', next_service_due_date: '',
    performed_by: ''
  })
  const [mSaving, setMSaving] = useState(false)
  const [mError, setMError] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [vRes, mRes] = await Promise.all([
      fetch('/api/company-vehicles'),
      fetch('/api/vehicle-maintenance'),
    ])
    const [vData, mData] = await Promise.all([vRes.json(), mRes.json()])
    setVehicles(vData.vehicles || [])
    setMaintenance(mData.records || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    setVError('')
    if (!vForm.make || !vForm.model) { setVError('Make and model required'); return }
    setVSaving(true)
    const res = await fetch('/api/company-vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...vForm, year: vForm.year ? parseInt(vForm.year) : null, current_mileage: parseInt(vForm.current_mileage) || 0 }),
    })
    const data = await res.json()
    setVSaving(false)
    if (!res.ok) { setVError(data.error || 'Failed to add vehicle'); return }
    setShowAddVehicle(false)
    setVForm({ make: '', model: '', year: '', color: '', plate: '', vin: '', assigned_to: '', current_mileage: '', insurance_expiry: '', registration_expiry: '', notes: '' })
    fetchData()
  }

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault()
    setMError('')
    if (!mForm.vehicle_id || !mForm.type) { setMError('Vehicle and type required'); return }
    setMSaving(true)
    const res = await fetch('/api/vehicle-maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...mForm, cost: parseFloat(mForm.cost) || 0 }),
    })
    const data = await res.json()
    setMSaving(false)
    if (!res.ok) { setMError(data.error || 'Failed to save'); return }
    setShowAddMaintenance(false)
    setMForm({ vehicle_id: '', type: 'oil_change', description: '', cost: '', mileage_at_service: '', next_service_due_miles: '', next_service_due_date: '', performed_by: '' })
    fetchData()
  }

  const handleDeactivate = async (id: string) => {
    await fetch(`/api/company-vehicles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: false }),
    })
    fetchData()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--surface)', border: '1px solid #2a2d3a',
    borderRadius: 8, padding: '9px 12px', color: 'var(--text1)', fontSize: 14, outline: 'none'
  }
  const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }

  const expiryBadge = (dateStr: string | null, label: string) => {
    const days = daysUntil(dateStr)
    if (days === null) return null
    const color = days <= 30 ? 'var(--red)' : days <= 60 ? 'var(--amber)' : 'var(--text3)'
    return (
      <span style={{ fontSize: 11, color, display: 'flex', alignItems: 'center', gap: 3 }}>
        {days <= 60 && <AlertTriangle size={11} />}
        {label}: {days <= 0 ? 'EXPIRED' : `${days}d`}
      </span>
    )
  }

  const activeVehicles = vehicles.filter(v => v.active)

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-barlow)', color: 'var(--text1)', margin: 0 }}>
            Company Vehicles
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>
            {activeVehicles.length} active vehicle{activeVehicles.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowAddMaintenance(true)} style={{
              padding: '9px 16px', borderRadius: 8, border: '1px solid #2a2d3a', cursor: 'pointer',
              background: 'transparent', color: 'var(--text1)', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6
            }}>
              <Wrench size={15} /> Log Service
            </button>
            <button onClick={() => setShowAddVehicle(true)} style={{
              padding: '9px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6
            }}>
              <Plus size={15} /> Add Vehicle
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--surface)', borderRadius: 10, padding: 4 }}>
        {[['vehicles', 'Fleet'], ['maintenance', 'Maintenance Log']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)} style={{
            flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === key ? 'var(--accent)' : 'transparent',
            color: tab === key ? '#fff' : 'var(--text2)', fontWeight: 600, fontSize: 14
          }}>{label}</button>
        ))}
      </div>

      {/* ── FLEET TAB ──────────────────────────────────────────────────────── */}
      {tab === 'vehicles' && (
        loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {activeVehicles.map(v => {
              const insuranceDays = daysUntil(v.insurance_expiry)
              const regDays = daysUntil(v.registration_expiry)
              const hasAlert = (insuranceDays !== null && insuranceDays <= 60) || (regDays !== null && regDays <= 60)
              return (
                <div key={v.id} style={{
                  background: 'var(--surface)', borderRadius: 12, padding: 20,
                  border: `1px solid ${hasAlert ? 'var(--amber)44' : '#2a2d3a'}`, position: 'relative'
                }}>
                  {hasAlert && <AlertTriangle size={14} color="var(--amber)" style={{ position: 'absolute', top: 12, right: 12 }} />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--accent)22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Truck size={22} color="var(--accent)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 16 }}>
                        {v.year} {v.make} {v.model}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                        {v.color && `${v.color} · `}{v.plate && `Plate: ${v.plate}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                    <div style={{ fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={12} /> {v.current_mileage.toLocaleString()} mi
                    </div>
                    {v.assigned_employee && (
                      <div style={{ fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <User size={12} /> {v.assigned_employee.name}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                      {expiryBadge(v.insurance_expiry, 'Insurance')}
                      {expiryBadge(v.registration_expiry, 'Registration')}
                    </div>
                    {v.next_oil_change_miles && (
                      <div style={{ fontSize: 11, color: v.current_mileage >= (v.next_oil_change_miles - 500) ? 'var(--amber)' : 'var(--text3)' }}>
                        <Wrench size={11} style={{ display: 'inline' }} /> Oil change due at {v.next_oil_change_miles.toLocaleString()} mi
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setMForm(p => ({ ...p, vehicle_id: v.id })); setShowAddMaintenance(true) }} style={{
                        flex: 1, padding: '7px', borderRadius: 7, border: '1px solid #2a2d3a', cursor: 'pointer',
                        background: 'transparent', color: 'var(--text2)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                      }}>
                        <Wrench size={12} /> Log Service
                      </button>
                      <button onClick={() => handleDeactivate(v.id)} style={{
                        padding: '7px 10px', borderRadius: 7, border: '1px solid var(--red)44', cursor: 'pointer',
                        background: 'transparent', color: 'var(--red)', fontSize: 12
                      }}>
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            {activeVehicles.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
                No vehicles in fleet. Add the first one.
              </div>
            )}
          </div>
        )
      )}

      {/* ── MAINTENANCE LOG ────────────────────────────────────────────────── */}
      {tab === 'maintenance' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
          ) : maintenance.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>No maintenance records yet</div>
          ) : (
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                    {['Date', 'Vehicle', 'Type', 'Description', 'Mileage', 'Cost', 'Next Due'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {maintenance.map(rec => (
                    <tr key={rec.id} style={{ borderBottom: '1px solid #1a1d27' }}>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text1)' }}>{rec.created_at.split('T')[0]}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text1)' }}>
                        {rec.vehicle ? `${rec.vehicle.year} ${rec.vehicle.make} ${rec.vehicle.model}` : '—'}
                        {rec.vehicle?.plate && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{rec.vehicle.plate}</div>}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text2)' }}>
                        {MAINTENANCE_TYPES.find(t => t.value === rec.type)?.label || rec.type}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text2)' }}>{rec.description || '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text1)' }}>
                        {rec.mileage_at_service ? rec.mileage_at_service.toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>
                        ${rec.cost.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text2)' }}>
                        {rec.next_service_due_miles ? `${rec.next_service_due_miles.toLocaleString()} mi` : ''}
                        {rec.next_service_due_date ? <div>{rec.next_service_due_date}</div> : ''}
                        {!rec.next_service_due_miles && !rec.next_service_due_date && '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ADD VEHICLE MODAL ──────────────────────────────────────────────── */}
      {showAddVehicle && (
        <div style={{ position: 'fixed', inset: 0, background: '#000a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 32, width: 540, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #2a2d3a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>Add Vehicle</h2>
              <button onClick={() => setShowAddVehicle(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddVehicle}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div><label style={labelStyle}>Make *</label><input value={vForm.make} onChange={e => setVForm(p => ({ ...p, make: e.target.value }))} style={inputStyle} required /></div>
                <div><label style={labelStyle}>Model *</label><input value={vForm.model} onChange={e => setVForm(p => ({ ...p, model: e.target.value }))} style={inputStyle} required /></div>
                <div><label style={labelStyle}>Year</label><input type="number" value={vForm.year} onChange={e => setVForm(p => ({ ...p, year: e.target.value }))} placeholder="2024" style={inputStyle} /></div>
                <div><label style={labelStyle}>Color</label><input value={vForm.color} onChange={e => setVForm(p => ({ ...p, color: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>License Plate</label><input value={vForm.plate} onChange={e => setVForm(p => ({ ...p, plate: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>VIN</label><input value={vForm.vin} onChange={e => setVForm(p => ({ ...p, vin: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Current Mileage</label><input type="number" value={vForm.current_mileage} onChange={e => setVForm(p => ({ ...p, current_mileage: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Assigned To</label>
                  <select value={vForm.assigned_to} onChange={e => setVForm(p => ({ ...p, assigned_to: e.target.value }))} style={inputStyle}>
                    <option value="">Unassigned</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Insurance Expiry</label><input type="date" value={vForm.insurance_expiry} onChange={e => setVForm(p => ({ ...p, insurance_expiry: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Registration Expiry</label><input type="date" value={vForm.registration_expiry} onChange={e => setVForm(p => ({ ...p, registration_expiry: e.target.value }))} style={inputStyle} /></div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Notes</label>
                <input value={vForm.notes} onChange={e => setVForm(p => ({ ...p, notes: e.target.value }))} style={inputStyle} />
              </div>
              {vError && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{vError}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowAddVehicle(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #2a2d3a', cursor: 'pointer', background: 'transparent', color: 'var(--text2)', fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={vSaving} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--accent)', color: '#fff', fontWeight: 700 }}>
                  {vSaving ? 'Saving...' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD MAINTENANCE MODAL ──────────────────────────────────────────── */}
      {showAddMaintenance && (
        <div style={{ position: 'fixed', inset: 0, background: '#000a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 32, width: 480, border: '1px solid #2a2d3a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>Log Service / Maintenance</h2>
              <button onClick={() => setShowAddMaintenance(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddMaintenance}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Vehicle *</label>
                <select value={mForm.vehicle_id} onChange={e => setMForm(p => ({ ...p, vehicle_id: e.target.value }))} style={inputStyle} required>
                  <option value="">Select vehicle</option>
                  {vehicles.filter(v => v.active).map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} {v.plate ? `(${v.plate})` : ''}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Service Type *</label>
                <select value={mForm.type} onChange={e => setMForm(p => ({ ...p, type: e.target.value }))} style={inputStyle} required>
                  {MAINTENANCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div><label style={labelStyle}>Cost ($)</label><input type="number" step="0.01" value={mForm.cost} onChange={e => setMForm(p => ({ ...p, cost: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Mileage at Service</label><input type="number" value={mForm.mileage_at_service} onChange={e => setMForm(p => ({ ...p, mileage_at_service: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Next Due (miles)</label><input type="number" value={mForm.next_service_due_miles} onChange={e => setMForm(p => ({ ...p, next_service_due_miles: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Next Due (date)</label><input type="date" value={mForm.next_service_due_date} onChange={e => setMForm(p => ({ ...p, next_service_due_date: e.target.value }))} style={inputStyle} /></div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Description</label>
                <input value={mForm.description} onChange={e => setMForm(p => ({ ...p, description: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Performed By</label>
                <input value={mForm.performed_by} onChange={e => setMForm(p => ({ ...p, performed_by: e.target.value }))} placeholder="Shop or mechanic name" style={inputStyle} />
              </div>
              {mError && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{mError}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowAddMaintenance(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #2a2d3a', cursor: 'pointer', background: 'transparent', color: 'var(--text2)', fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={mSaving} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--accent)', color: '#fff', fontWeight: 700 }}>
                  {mSaving ? 'Saving...' : 'Log Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
