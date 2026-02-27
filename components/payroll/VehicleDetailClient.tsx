'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, Truck, Edit2, Check, X, Wrench, MapPin,
  User, AlertTriangle, Plus, Loader2, Navigation, FileText,
} from 'lucide-react'
import type { Profile } from '@/types'

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

interface MileageLog {
  id: string
  date: string
  entry_type: string
  from_address: string | null
  to_address: string | null
  miles: number
  purpose: string | null
  status: string
  odometer_start: number | null
  odometer_end: number | null
  driver?: { id: string; name: string } | null
}

interface MaintenanceRecord {
  id: string
  type: string
  description: string | null
  cost: number
  mileage_at_service: number | null
  next_service_due_miles: number | null
  next_service_due_date: string | null
  performed_by: string | null
  created_at: string
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

function serviceBadge(days: number | null, milesLeft: number | null) {
  const overdue = (days !== null && days < 0) || (milesLeft !== null && milesLeft < 0)
  const dueSoon = !overdue && ((days !== null && days <= 30) || (milesLeft !== null && milesLeft < 1000))
  if (overdue) return { label: 'OVERDUE', color: 'var(--red)' }
  if (dueSoon) return { label: 'DUE SOON', color: 'var(--amber)' }
  return { label: 'OK', color: 'var(--green)' }
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface)', border: '1px solid #2a2d3a',
  borderRadius: 8, padding: '9px 12px', color: 'var(--text1)', fontSize: 14, outline: 'none',
}
const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }

export default function VehicleDetailClient({
  profile,
  vehicle: initialVehicle,
  mileageLogs: initialMileage,
  maintenanceRecords: initialMaintenance,
  employees,
}: {
  profile: Profile
  vehicle: Vehicle
  mileageLogs: MileageLog[]
  maintenanceRecords: MaintenanceRecord[]
  employees: any[]
}) {
  const isAdmin = profile.role === 'owner' || profile.role === 'admin'
  const [tab, setTab] = useState<'info' | 'mileage' | 'maintenance' | 'map'>('info')
  const [vehicle, setVehicle] = useState(initialVehicle)
  const [mileageLogs, setMileageLogs] = useState(initialMileage)
  const [maintenance, setMaintenance] = useState(initialMaintenance)

  // Edit vehicle
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year?.toString() || '',
    color: vehicle.color || '',
    plate: vehicle.plate || '',
    vin: vehicle.vin || '',
    assigned_to: vehicle.assigned_to || '',
    current_mileage: vehicle.current_mileage.toString(),
    insurance_expiry: vehicle.insurance_expiry || '',
    registration_expiry: vehicle.registration_expiry || '',
    notes: vehicle.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Add maintenance
  const [showAddMaint, setShowAddMaint] = useState(false)
  const [mForm, setMForm] = useState({
    type: 'oil_change', description: '', cost: '',
    mileage_at_service: '', next_service_due_miles: '',
    next_service_due_date: '', performed_by: '',
  })
  const [mSaving, setMSaving] = useState(false)
  const [mError, setMError] = useState('')

  // Log mileage
  const [showLogMileage, setShowLogMileage] = useState(false)
  const [mlForm, setMlForm] = useState({
    date: new Date().toISOString().split('T')[0],
    from_address: '', to_address: '',
    miles: '', purpose: '',
    odometer_start: '', odometer_end: '',
  })
  const [mlSaving, setMlSaving] = useState(false)
  const [mlError, setMlError] = useState('')

  const handleSaveVehicle = async () => {
    setSaveError('')
    setSaving(true)
    const res = await fetch(`/api/company-vehicles/${vehicle.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editForm,
        year: editForm.year ? parseInt(editForm.year) : null,
        current_mileage: parseInt(editForm.current_mileage) || 0,
        assigned_to: editForm.assigned_to || null,
        insurance_expiry: editForm.insurance_expiry || null,
        registration_expiry: editForm.registration_expiry || null,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setSaveError(data.error || 'Failed to save'); return }
    setVehicle(v => ({ ...v, ...data.vehicle }))
    setEditing(false)
  }

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault()
    setMError('')
    setMSaving(true)
    const res = await fetch('/api/vehicle-maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle_id: vehicle.id, ...mForm, cost: parseFloat(mForm.cost) || 0 }),
    })
    const data = await res.json()
    setMSaving(false)
    if (!res.ok) { setMError(data.error || 'Failed to save'); return }
    setMaintenance(prev => [data.record, ...prev])
    if (mForm.mileage_at_service) {
      setVehicle(v => ({ ...v, current_mileage: parseInt(mForm.mileage_at_service) }))
    }
    setShowAddMaint(false)
    setMForm({ type: 'oil_change', description: '', cost: '', mileage_at_service: '', next_service_due_miles: '', next_service_due_date: '', performed_by: '' })
  }

  const handleLogMileage = async (e: React.FormEvent) => {
    e.preventDefault()
    setMlError('')
    if (!mlForm.miles || parseFloat(mlForm.miles) <= 0) { setMlError('Miles required'); return }
    setMlSaving(true)
    const res = await fetch('/api/mileage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...mlForm,
        miles: parseFloat(mlForm.miles),
        entry_type: 'manual',
        vehicle_type: 'company',
        company_vehicle_id: vehicle.id,
      }),
    })
    const data = await res.json()
    setMlSaving(false)
    if (!res.ok) { setMlError(data.error || 'Failed to save'); return }
    if (data.log) setMileageLogs(prev => [data.log, ...prev])
    setShowLogMileage(false)
    setMlForm({ date: new Date().toISOString().split('T')[0], from_address: '', to_address: '', miles: '', purpose: '', odometer_start: '', odometer_end: '' })
  }

  const insuranceDays = daysUntil(vehicle.insurance_expiry)
  const regDays = daysUntil(vehicle.registration_expiry)
  const oilMilesLeft = vehicle.next_oil_change_miles != null ? vehicle.next_oil_change_miles - vehicle.current_mileage : null
  const totalCost = maintenance.reduce((s, r) => s + (r.cost || 0), 0)
  const thisYearCost = maintenance
    .filter(r => new Date(r.created_at).getFullYear() === new Date().getFullYear())
    .reduce((s, r) => s + (r.cost || 0), 0)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <Link href="/vehicles" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text2)', fontSize: 14, textDecoration: 'none', marginBottom: 20 }}>
        <ChevronLeft size={16} /> Fleet Vehicles
      </Link>

      {/* Vehicle header card */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, border: '1px solid #2a2d3a', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--accent)22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={26} color="var(--accent)" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', margin: 0, fontFamily: 'var(--font-barlow)' }}>
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                {vehicle.plate && <span style={{ fontSize: 13, color: 'var(--text2)' }}>{vehicle.plate}</span>}
                {vehicle.color && <span style={{ fontSize: 13, color: 'var(--text3)' }}>{vehicle.color}</span>}
                <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>
                  {vehicle.current_mileage.toLocaleString()} mi
                </span>
                {vehicle.assigned_employee && (
                  <span style={{ fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <User size={12} /> {vehicle.assigned_employee.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          {isAdmin && !editing && (
            <button onClick={() => setEditing(true)} style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid #2a2d3a', cursor: 'pointer',
              background: 'transparent', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
            }}>
              <Edit2 size={14} /> Edit
            </button>
          )}
          {editing && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditing(false)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #2a2d3a', cursor: 'pointer', background: 'transparent', color: 'var(--text2)', fontSize: 13 }}>Cancel</button>
              <button onClick={handleSaveVehicle} disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />} Save
              </button>
            </div>
          )}
        </div>

        {/* Status badges */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          {[
            { label: 'Insurance', days: insuranceDays },
            { label: 'Registration', days: regDays },
          ].map(({ label, days }) => {
            if (days === null) return null
            const color = days < 0 ? 'var(--red)' : days <= 30 ? 'var(--amber)' : 'var(--green)'
            return (
              <span key={label} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: `${color}20`, color, fontWeight: 600 }}>
                {label}: {days < 0 ? 'EXPIRED' : `${days}d`}
              </span>
            )
          })}
          {oilMilesLeft !== null && (
            <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, fontWeight: 600, background: `${oilMilesLeft < 0 ? 'var(--red)' : oilMilesLeft < 1000 ? 'var(--amber)' : 'var(--green)'}20`, color: oilMilesLeft < 0 ? 'var(--red)' : oilMilesLeft < 1000 ? 'var(--amber)' : 'var(--green)' }}>
              Oil Change: {oilMilesLeft < 0 ? 'OVERDUE' : `${oilMilesLeft.toLocaleString()} mi left`}
            </span>
          )}
        </div>
        {saveError && <div style={{ marginTop: 10, color: 'var(--red)', fontSize: 13 }}>{saveError}</div>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--surface)', borderRadius: 10, padding: 4 }}>
        {([['info', 'Info'], ['mileage', 'Mileage'], ['maintenance', 'Maintenance'], ['map', 'Map']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === key ? 'var(--accent)' : 'transparent',
            color: tab === key ? '#fff' : 'var(--text2)', fontWeight: 600, fontSize: 14,
          }}>{label}</button>
        ))}
      </div>

      {/* ── INFO TAB ─────────────────────────────────────────────── */}
      {tab === 'info' && (
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, border: '1px solid #2a2d3a' }}>
          {editing ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label style={labelStyle}>Make</label><input value={editForm.make} onChange={e => setEditForm(p => ({ ...p, make: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Model</label><input value={editForm.model} onChange={e => setEditForm(p => ({ ...p, model: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Year</label><input type="number" value={editForm.year} onChange={e => setEditForm(p => ({ ...p, year: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Color</label><input value={editForm.color} onChange={e => setEditForm(p => ({ ...p, color: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>License Plate</label><input value={editForm.plate} onChange={e => setEditForm(p => ({ ...p, plate: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>VIN</label><input value={editForm.vin} onChange={e => setEditForm(p => ({ ...p, vin: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Current Mileage</label><input type="number" value={editForm.current_mileage} onChange={e => setEditForm(p => ({ ...p, current_mileage: e.target.value }))} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>Assigned To</label>
                <select value={editForm.assigned_to} onChange={e => setEditForm(p => ({ ...p, assigned_to: e.target.value }))} style={inputStyle}>
                  <option value="">Unassigned</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Insurance Expiry</label><input type="date" value={editForm.insurance_expiry} onChange={e => setEditForm(p => ({ ...p, insurance_expiry: e.target.value }))} style={inputStyle} /></div>
              <div><label style={labelStyle}>Registration Expiry</label><input type="date" value={editForm.registration_expiry} onChange={e => setEditForm(p => ({ ...p, registration_expiry: e.target.value }))} style={inputStyle} /></div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Notes</label>
                <textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' as const }} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {([
                ['Make', vehicle.make],
                ['Model', vehicle.model],
                ['Year', vehicle.year?.toString() ?? '—'],
                ['Color', vehicle.color ?? '—'],
                ['License Plate', vehicle.plate ?? '—'],
                ['VIN', vehicle.vin ?? '—'],
                ['Current Mileage', vehicle.current_mileage.toLocaleString() + ' mi'],
                ['Assigned To', vehicle.assigned_employee?.name ?? '—'],
                ['Insurance Expiry', vehicle.insurance_expiry ?? '—'],
                ['Registration Expiry', vehicle.registration_expiry ?? '—'],
              ] as [string, string][]).map(([lbl, val]) => (
                <div key={lbl}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>{lbl}</div>
                  <div style={{ fontSize: 15, color: 'var(--text1)', fontWeight: 500 }}>{val}</div>
                </div>
              ))}
              {vehicle.notes && (
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>NOTES</div>
                  <div style={{ fontSize: 14, color: 'var(--text2)' }}>{vehicle.notes}</div>
                </div>
              )}
            </div>
          )}

          {/* Cost summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid #2a2d3a' }}>
            <div style={{ padding: '14px 16px', background: 'var(--surface2)', borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Total Maintenance Cost</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text1)' }}>${totalCost.toFixed(2)}</div>
            </div>
            <div style={{ padding: '14px 16px', background: 'var(--surface2)', borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>This Year</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>${thisYearCost.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── MILEAGE TAB ──────────────────────────────────────────── */}
      {tab === 'mileage' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>
                {vehicle.current_mileage.toLocaleString()}
              </span>
              <span style={{ fontSize: 14, color: 'var(--text2)', marginLeft: 8 }}>current odometer</span>
            </div>
            <button onClick={() => setShowLogMileage(true)} style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Plus size={14} /> Log Mileage
            </button>
          </div>

          {mileageLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)', background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a' }}>
              <Navigation size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div>No mileage logs for this vehicle yet</div>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                    {['Date', 'Route', 'Miles', 'Odometer', 'Purpose', 'Driver', 'Status'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mileageLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #1a1d27' }}>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--text1)', whiteSpace: 'nowrap' }}>{log.date}</td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text2)', maxWidth: 160 }}>
                        {log.from_address && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.from_address}</div>}
                        {log.to_address && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text3)' }}>→ {log.to_address}</div>}
                      </td>
                      <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--text1)', whiteSpace: 'nowrap' }}>{Number(log.miles).toFixed(1)}</td>
                      <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                        {log.odometer_start && log.odometer_end
                          ? `${Number(log.odometer_start).toLocaleString()} → ${Number(log.odometer_end).toLocaleString()}`
                          : '—'}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--text2)' }}>{log.purpose || '—'}</td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--text2)' }}>{log.driver?.name || '—'}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                          background: log.status === 'approved' ? 'var(--green)22' : log.status === 'rejected' ? 'var(--red)22' : 'var(--amber)22',
                          color: log.status === 'approved' ? 'var(--green)' : log.status === 'rejected' ? 'var(--red)' : 'var(--amber)',
                        }}>{log.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MAINTENANCE TAB ──────────────────────────────────────── */}
      {tab === 'maintenance' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: 'var(--text2)' }}>
              {maintenance.length} service records · ${totalCost.toFixed(2)} total
            </div>
            {isAdmin && (
              <button onClick={() => setShowAddMaint(true)} style={{
                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Plus size={14} /> Log Service
              </button>
            )}
          </div>

          {maintenance.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)', background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a' }}>
              <Wrench size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div>No maintenance records yet. Log the first service.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {maintenance.map(rec => {
                const days = daysUntil(rec.next_service_due_date)
                const milesLeft = rec.next_service_due_miles != null ? rec.next_service_due_miles - vehicle.current_mileage : null
                const badge = serviceBadge(days, milesLeft)
                return (
                  <div key={rec.id} style={{ background: 'var(--surface)', borderRadius: 12, padding: 18, border: '1px solid #2a2d3a', display: 'flex', gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--amber)11', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Wrench size={20} color="var(--amber)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 15 }}>
                            {MAINTENANCE_TYPES.find(t => t.value === rec.type)?.label ?? rec.type}
                          </div>
                          {rec.description && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{rec.description}</div>}
                        </div>
                        {(rec.next_service_due_date || rec.next_service_due_miles) && (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${badge.color}20`, color: badge.color, flexShrink: 0, marginLeft: 12 }}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{rec.created_at.split('T')[0]}</span>
                        {rec.mileage_at_service && <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{Number(rec.mileage_at_service).toLocaleString()} mi</span>}
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>${Number(rec.cost).toFixed(2)}</span>
                        {rec.performed_by && <span style={{ fontSize: 12, color: 'var(--text3)' }}>by {rec.performed_by}</span>}
                      </div>
                      {(rec.next_service_due_date || rec.next_service_due_miles) && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text2)' }}>
                          Next: {rec.next_service_due_date && <span>{rec.next_service_due_date}</span>}
                          {rec.next_service_due_miles && <span style={{ fontFamily: 'var(--font-mono)' }}> · {Number(rec.next_service_due_miles).toLocaleString()} mi</span>}
                          {milesLeft !== null && (
                            <span style={{ color: milesLeft < 0 ? 'var(--red)' : 'var(--text3)' }}>
                              {' '}({milesLeft < 0 ? `${Math.abs(milesLeft).toLocaleString()} mi overdue` : `${milesLeft.toLocaleString()} mi left`})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MAP TAB ──────────────────────────────────────────────── */}
      {tab === 'map' && (
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 48, border: '1px solid #2a2d3a', textAlign: 'center' }}>
          <MapPin size={48} color="var(--text3)" style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>GPS Not Connected</div>
          <div style={{ fontSize: 14, color: 'var(--text2)', maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
            Live vehicle tracking requires a GPS integration. Connect a telematics system to see real-time location and route history.
          </div>
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 400, margin: '24px auto 0' }}>
            <div style={{ padding: '14px 16px', background: 'var(--surface2)', borderRadius: 10, textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, marginBottom: 4 }}>LAST KNOWN</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>No data</div>
            </div>
            <div style={{ padding: '14px 16px', background: 'var(--surface2)', borderRadius: 10, textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, marginBottom: 4 }}>ODOMETER</div>
              <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>{vehicle.current_mileage.toLocaleString()} mi</div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD MAINTENANCE MODAL ────────────────────────────────── */}
      {showAddMaint && (
        <div style={{ position: 'fixed', inset: 0, background: '#000a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 32, width: 480, border: '1px solid #2a2d3a', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>Log Service</h2>
              <button onClick={() => setShowAddMaint(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddMaintenance}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Service Type *</label>
                <select value={mForm.type} onChange={e => setMForm(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                  {MAINTENANCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div><label style={labelStyle}>Cost ($)</label><input type="number" step="0.01" value={mForm.cost} onChange={e => setMForm(p => ({ ...p, cost: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Mileage at Service</label><input type="number" value={mForm.mileage_at_service} onChange={e => setMForm(p => ({ ...p, mileage_at_service: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Next Due (miles)</label><input type="number" value={mForm.next_service_due_miles} onChange={e => setMForm(p => ({ ...p, next_service_due_miles: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Next Due (date)</label><input type="date" value={mForm.next_service_due_date} onChange={e => setMForm(p => ({ ...p, next_service_due_date: e.target.value }))} style={inputStyle} /></div>
              </div>
              <div style={{ marginBottom: 12 }}><label style={labelStyle}>Description</label><input value={mForm.description} onChange={e => setMForm(p => ({ ...p, description: e.target.value }))} style={inputStyle} /></div>
              <div style={{ marginBottom: 16 }}><label style={labelStyle}>Performed By</label><input value={mForm.performed_by} onChange={e => setMForm(p => ({ ...p, performed_by: e.target.value }))} placeholder="Shop or mechanic name" style={inputStyle} /></div>
              {mError && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{mError}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowAddMaint(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #2a2d3a', cursor: 'pointer', background: 'transparent', color: 'var(--text2)', fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={mSaving} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--accent)', color: '#fff', fontWeight: 700 }}>
                  {mSaving ? 'Saving...' : 'Log Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── LOG MILEAGE MODAL ────────────────────────────────────── */}
      {showLogMileage && (
        <div style={{ position: 'fixed', inset: 0, background: '#000a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 32, width: 480, border: '1px solid #2a2d3a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>Log Mileage</h2>
              <button onClick={() => setShowLogMileage(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleLogMileage}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div><label style={labelStyle}>Date</label><input type="date" value={mlForm.date} onChange={e => setMlForm(p => ({ ...p, date: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Miles *</label><input type="number" step="0.1" value={mlForm.miles} onChange={e => setMlForm(p => ({ ...p, miles: e.target.value }))} style={inputStyle} required /></div>
                <div><label style={labelStyle}>Odometer Start</label><input type="number" value={mlForm.odometer_start} onChange={e => setMlForm(p => ({ ...p, odometer_start: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Odometer End</label><input type="number" value={mlForm.odometer_end} onChange={e => setMlForm(p => ({ ...p, odometer_end: e.target.value }))} style={inputStyle} /></div>
              </div>
              <div style={{ marginBottom: 12 }}><label style={labelStyle}>From</label><input value={mlForm.from_address} onChange={e => setMlForm(p => ({ ...p, from_address: e.target.value }))} placeholder="Starting address" style={inputStyle} /></div>
              <div style={{ marginBottom: 12 }}><label style={labelStyle}>To</label><input value={mlForm.to_address} onChange={e => setMlForm(p => ({ ...p, to_address: e.target.value }))} placeholder="Destination" style={inputStyle} /></div>
              <div style={{ marginBottom: 16 }}><label style={labelStyle}>Purpose</label><input value={mlForm.purpose} onChange={e => setMlForm(p => ({ ...p, purpose: e.target.value }))} placeholder="Trip reason" style={inputStyle} /></div>
              {mlError && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{mlError}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowLogMileage(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #2a2d3a', cursor: 'pointer', background: 'transparent', color: 'var(--text2)', fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={mlSaving} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--accent)', color: '#fff', fontWeight: 700 }}>
                  {mlSaving ? 'Saving...' : 'Log Mileage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
