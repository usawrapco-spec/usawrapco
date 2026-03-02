'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Plus, X, Car, Camera, Check, Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SurveyVehicle {
  id: string
  year: string
  make: string
  model: string
  sqft: number
  color: string
  plate: string
  notes: string
  condition: 'excellent' | 'good' | 'fair' | 'poor'
  surfaceIssues: string[]
  checklist: boolean[]
  assignedLineItems: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SURFACE_ISSUES = [
  'Rust spots', 'Dents', 'Scratches', 'Peeling paint', 'Rock chips',
  'Previous wrap residue', 'Oxidation', 'Body filler visible', 'Trim damage',
]

const CHECKLIST_ITEMS = [
  'Surface clean & dry',
  'No wax/contaminants',
  'Temp within range 50-90F',
  'Trim removed if needed',
  'Pre-install photos taken',
]

const CONDITION_CONFIG: Record<SurveyVehicle['condition'], { label: string; color: string }> = {
  excellent: { label: 'Excellent', color: '#22c07a' },
  good:      { label: 'Good',      color: '#4f7fff' },
  fair:      { label: 'Fair',      color: '#f59e0b' },
  poor:      { label: 'Poor',      color: '#f25a5a' },
}

// ─── Shared input styles ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: 'var(--bg)',
  border: '1px solid var(--surface2)',
  borderRadius: 8,
  color: 'var(--text1)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none' as React.CSSProperties['appearance'],
  cursor: 'pointer',
}

// ─── VehicleCard ──────────────────────────────────────────────────────────────

function VehicleCard({
  vehicle,
  lineItemOptions,
  onUpdate,
  onRemove,
}: {
  vehicle: SurveyVehicle
  lineItemOptions: { id: string; name: string }[]
  onUpdate: (v: SurveyVehicle) => void
  onRemove: () => void
}) {
  const checkedCount = vehicle.checklist.filter(Boolean).length
  const progress = Math.round((checkedCount / CHECKLIST_ITEMS.length) * 100)

  function toggleIssue(issue: string) {
    const next = vehicle.surfaceIssues.includes(issue)
      ? vehicle.surfaceIssues.filter(i => i !== issue)
      : [...vehicle.surfaceIssues, issue]
    onUpdate({ ...vehicle, surfaceIssues: next })
  }

  function toggleChecklist(idx: number) {
    const next = [...vehicle.checklist]
    next[idx] = !next[idx]
    onUpdate({ ...vehicle, checklist: next })
  }

  function toggleLineItem(id: string) {
    const next = vehicle.assignedLineItems.includes(id)
      ? vehicle.assignedLineItems.filter(x => x !== id)
      : [...vehicle.assignedLineItems, id]
    onUpdate({ ...vehicle, assignedLineItems: next })
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--surface2)',
      borderRadius: 10,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Car size={18} color="var(--accent)" />
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 14 }}>
            {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle'}
          </div>
          {(vehicle.color || vehicle.plate) && (
            <div style={{ color: 'var(--text2)', fontSize: 12 }}>
              {[vehicle.color, vehicle.plate].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        {vehicle.sqft > 0 && (
          <div style={{
            background: '#4f7fff20', color: 'var(--accent)',
            padding: '2px 8px', borderRadius: 20,
            fontSize: 12, fontFamily: 'var(--font-mono)',
          }}>
            {vehicle.sqft} sqft
          </div>
        )}
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 4 }}
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Condition */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Condition
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(Object.keys(CONDITION_CONFIG) as SurveyVehicle['condition'][]).map(c => {
            const cfg = CONDITION_CONFIG[c]
            const active = vehicle.condition === c
            return (
              <button
                key={c}
                onClick={() => onUpdate({ ...vehicle, condition: c })}
                style={{
                  flex: 1, padding: '5px 4px', borderRadius: 6,
                  border: `1px solid ${active ? cfg.color : 'var(--surface2)'}`,
                  background: active ? cfg.color + '20' : 'transparent',
                  color: active ? cfg.color : 'var(--text2)',
                  fontSize: 11, fontWeight: active ? 600 : 400, cursor: 'pointer',
                }}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Surface Issues */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Surface Issues
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {SURFACE_ISSUES.map(issue => {
            const active = vehicle.surfaceIssues.includes(issue)
            return (
              <button
                key={issue}
                onClick={() => toggleIssue(issue)}
                style={{
                  padding: '4px 9px', borderRadius: 20,
                  border: `1px solid ${active ? '#f59e0b' : 'var(--surface2)'}`,
                  background: active ? '#f59e0b20' : 'transparent',
                  color: active ? '#f59e0b' : 'var(--text2)',
                  fontSize: 11, cursor: 'pointer',
                }}
              >
                {issue}
              </button>
            )
          })}
        </div>
      </div>

      {/* Pre-install Checklist */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pre-install Checklist
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)' }}>{checkedCount}/{CHECKLIST_ITEMS.length}</div>
        </div>
        <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: progress === 100 ? 'var(--green)' : 'var(--accent)',
            borderRadius: 2, transition: 'width 0.3s',
          }} />
        </div>
        {CHECKLIST_ITEMS.map((item, idx) => (
          <button
            key={item}
            onClick={() => toggleChecklist(idx)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', background: 'none', border: 'none',
              cursor: 'pointer', padding: '5px 0', textAlign: 'left',
            }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
              border: `1.5px solid ${vehicle.checklist[idx] ? 'var(--green)' : 'var(--surface2)'}`,
              background: vehicle.checklist[idx] ? '#22c07a20' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {vehicle.checklist[idx] && <Check size={10} color="var(--green)" />}
            </div>
            <span style={{ fontSize: 12, color: vehicle.checklist[idx] ? 'var(--text1)' : 'var(--text2)' }}>
              {item}
            </span>
          </button>
        ))}
      </div>

      {/* Assign to Line Items */}
      {lineItemOptions.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Assign to Line Items
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {lineItemOptions.map(li => {
              const active = vehicle.assignedLineItems.includes(li.id)
              return (
                <button
                  key={li.id}
                  onClick={() => toggleLineItem(li.id)}
                  style={{
                    padding: '4px 9px', borderRadius: 20,
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--surface2)'}`,
                    background: active ? '#4f7fff20' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text2)',
                    fontSize: 11, cursor: 'pointer',
                  }}
                >
                  {li.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      {vehicle.notes && (
        <div style={{
          fontSize: 12, color: 'var(--text2)', fontStyle: 'italic',
          borderTop: '1px solid var(--surface2)', paddingTop: 8,
        }}>
          {vehicle.notes}
        </div>
      )}
    </div>
  )
}

// ─── AddVehicleModal ──────────────────────────────────────────────────────────

function AddVehicleModal({
  lineItemOptions,
  onAdd,
  onClose,
}: {
  lineItemOptions: { id: string; name: string }[]
  onAdd: (v: SurveyVehicle) => void
  onClose: () => void
}) {
  const supabase = createClient()
  const [tab, setTab] = useState<'ymm' | 'vin'>('ymm')

  // YMM
  const [years, setYears] = useState<string[]>([])
  const [makes, setMakes] = useState<string[]>([])
  const [models, setModels] = useState<string[]>([])
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMake, setSelectedMake] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [autoSqft, setAutoSqft] = useState(0)

  // VIN
  const [vinInput, setVinInput] = useState('')
  const [vinDecoded, setVinDecoded] = useState<{ year: string; make: string; model: string } | null>(null)
  const [vinLoading, setVinLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Common
  const [color, setColor] = useState('')
  const [plate, setPlate] = useState('')
  const [notes, setNotes] = useState('')
  const [assignedLineItems, setAssignedLineItems] = useState<string[]>([])

  // Load years
  useEffect(() => {
    supabase
      .from('vehicle_measurements')
      .select('year')
      .order('year', { ascending: false })
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map(d => String((d as { year: number }).year)))]
          setYears(unique)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load makes
  useEffect(() => {
    if (!selectedYear) return
    setMakes([])
    setSelectedMake('')
    setModels([])
    setSelectedModel('')
    setAutoSqft(0)
    supabase
      .from('vehicle_measurements')
      .select('make')
      .eq('year', parseInt(selectedYear))
      .order('make')
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map(d => (d as { make: string }).make))]
          setMakes(unique)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear])

  // Load models
  useEffect(() => {
    if (!selectedYear || !selectedMake) return
    setModels([])
    setSelectedModel('')
    setAutoSqft(0)
    supabase
      .from('vehicle_measurements')
      .select('model')
      .eq('year', parseInt(selectedYear))
      .eq('make', selectedMake)
      .order('model')
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map(d => (d as { model: string }).model))]
          setModels(unique)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMake])

  // Load sqft
  useEffect(() => {
    if (!selectedYear || !selectedMake || !selectedModel) return
    supabase
      .from('vehicle_measurements')
      .select('total_sqft')
      .eq('year', parseInt(selectedYear))
      .eq('make', selectedMake)
      .eq('model', selectedModel)
      .single()
      .then(({ data }) => {
        if (data) setAutoSqft((data as { total_sqft: number }).total_sqft || 0)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMake, selectedModel])

  async function decodeVin(vin: string) {
    if (vin.length !== 17) return
    setVinLoading(true)
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`)
      const json = await res.json() as { Results: { Variable: string; Value: string }[] }
      const get = (v: string) => json.Results.find(r => r.Variable === v)?.Value || ''
      setVinDecoded({ year: get('Model Year'), make: get('Make'), model: get('Model') })
    } catch { /* ignore */ }
    setVinLoading(false)
  }

  async function startScan() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        void videoRef.current.play()
      }
      setScanning(true)
    } catch { /* camera unavailable */ }
  }

  function stopScan() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()) }, [])

  function toggleAssigned(id: string) {
    setAssignedLineItems(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function handleAdd() {
    const year  = tab === 'ymm' ? selectedYear  : (vinDecoded?.year  || '')
    const make  = tab === 'ymm' ? selectedMake  : (vinDecoded?.make  || '')
    const model = tab === 'ymm' ? selectedModel : (vinDecoded?.model || '')
    const sqft  = tab === 'ymm' ? autoSqft : 0
    if (!year && !make) return
    onAdd({
      id: crypto.randomUUID(),
      year, make, model, sqft,
      color, plate, notes,
      condition: 'good',
      surfaceIssues: [],
      checklist: Array(CHECKLIST_ITEMS.length).fill(false) as boolean[],
      assignedLineItems,
    })
    onClose()
  }

  const canAdd = tab === 'ymm'
    ? Boolean(selectedYear && selectedMake)
    : Boolean(vinDecoded || vinInput.length === 17)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#00000080', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 14, padding: 24,
        width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>Add Vehicle</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 8, padding: 4 }}>
          {([['ymm', 'Year / Make / Model'], ['vin', 'Scan / Enter VIN']] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 6, border: 'none',
                background: tab === t ? 'var(--surface)' : 'transparent',
                color: tab === t ? 'var(--text1)' : 'var(--text2)',
                fontSize: 12, fontWeight: tab === t ? 600 : 400, cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* YMM Tab */}
        {tab === 'ymm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={selectStyle}>
              <option value="">Select Year</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={selectedMake} onChange={e => setSelectedMake(e.target.value)} disabled={!selectedYear} style={selectStyle}>
              <option value="">Select Make</option>
              {makes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} disabled={!selectedMake} style={selectStyle}>
              <option value="">Select Model</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {autoSqft > 0 && (
              <div style={{ fontSize: 12, color: 'var(--green)', padding: '6px 10px', background: '#22c07a15', borderRadius: 6 }}>
                Auto-detected: {autoSqft} sqft
              </div>
            )}
          </div>
        )}

        {/* VIN Tab */}
        {tab === 'vin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!scanning ? (
              <button
                onClick={() => { void startScan() }}
                style={{
                  padding: 14, borderRadius: 10,
                  border: '2px dashed var(--surface2)', background: 'var(--bg)',
                  color: 'var(--accent)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13,
                }}
              >
                <Camera size={18} />
                Scan VIN Barcode (Camera)
              </button>
            ) : (
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                <video ref={videoRef} style={{ width: '100%', borderRadius: 10, display: 'block' }} muted playsInline />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: '80%', height: 60, borderRadius: 6, overflow: 'hidden',
                    border: '2px solid var(--accent)', position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute', left: 0, right: 0, height: 2,
                      background: 'var(--accent)', top: '50%',
                    }} />
                  </div>
                </div>
                <button
                  onClick={stopScan}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: '#000000aa', border: 'none', borderRadius: 6,
                    color: 'var(--text1)', padding: '4px 8px', cursor: 'pointer', fontSize: 12,
                  }}
                >
                  Stop
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={vinInput}
                onChange={e => {
                  const v = e.target.value.toUpperCase().slice(0, 17)
                  setVinInput(v)
                  setVinDecoded(null)
                }}
                placeholder="Enter 17-char VIN"
                style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', letterSpacing: 1 }}
                maxLength={17}
              />
              <button
                onClick={() => { void decodeVin(vinInput) }}
                disabled={vinInput.length !== 17 || vinLoading}
                style={{
                  padding: '0 14px', borderRadius: 8, border: 'none',
                  background: 'var(--accent)', color: '#fff', cursor: 'pointer',
                  fontSize: 12, opacity: vinInput.length !== 17 ? 0.5 : 1,
                }}
              >
                {vinLoading ? '...' : 'Decode'}
              </button>
            </div>
            {vinInput.length > 0 && vinInput.length < 17 && (
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{17 - vinInput.length} more characters needed</div>
            )}
            {vinDecoded && (
              <div style={{ padding: 10, background: '#22c07a15', borderRadius: 8, fontSize: 12, color: 'var(--green)' }}>
                {vinDecoded.year} {vinDecoded.make} {vinDecoded.model}
              </div>
            )}
          </div>
        )}

        {/* Common fields */}
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={color} onChange={e => setColor(e.target.value)} placeholder="Color (optional)" style={{ ...inputStyle, flex: 1 }} />
          <input value={plate} onChange={e => setPlate(e.target.value)} placeholder="Plate # (optional)" style={{ ...inputStyle, flex: 1 }} />
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />

        {/* Assign to line items */}
        {lineItemOptions.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Assign to Line Items
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {lineItemOptions.map(li => {
                const active = assignedLineItems.includes(li.id)
                return (
                  <button
                    key={li.id}
                    onClick={() => toggleAssigned(li.id)}
                    style={{
                      padding: '4px 10px', borderRadius: 20,
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--surface2)'}`,
                      background: active ? '#4f7fff20' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text2)',
                      fontSize: 11, cursor: 'pointer',
                    }}
                  >
                    {li.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8,
              border: '1px solid var(--surface2)', background: 'transparent',
              color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!canAdd}
            style={{
              flex: 2, padding: '10px 0', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff',
              cursor: canAdd ? 'pointer' : 'not-allowed',
              fontSize: 13, fontWeight: 600, opacity: canAdd ? 1 : 0.5,
            }}
          >
            Add Vehicle
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── VehicleSurvey (main export) ──────────────────────────────────────────────

export function VehicleSurvey({
  projectId: _projectId,
  lineItems = [],
  onVehiclesChange,
  initialVehicles = [],
}: {
  projectId: string
  lineItems?: { id: string; name: string }[]
  onVehiclesChange?: (vehicles: SurveyVehicle[]) => void
  initialVehicles?: SurveyVehicle[]
}) {
  const [vehicles, setVehicles] = useState<SurveyVehicle[]>(initialVehicles)
  const [showModal, setShowModal] = useState(false)

  function update(next: SurveyVehicle[]) {
    setVehicles(next)
    onVehiclesChange?.(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Car size={16} color="var(--accent)" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>Vehicle Survey</span>
          {vehicles.length > 0 && (
            <span style={{
              background: '#4f7fff20', color: 'var(--accent)',
              padding: '2px 8px', borderRadius: 20, fontSize: 11,
            }}>
              {vehicles.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 12,
          }}
        >
          <Plus size={13} />
          Add Vehicle
        </button>
      </div>

      {vehicles.length === 0 ? (
        <div style={{
          padding: 24, textAlign: 'center',
          border: '2px dashed var(--surface2)', borderRadius: 10,
          color: 'var(--text3)', fontSize: 13,
        }}>
          No vehicles added yet. Click &quot;Add Vehicle&quot; to start the survey.
        </div>
      ) : (
        vehicles.map((v, idx) => (
          <VehicleCard
            key={v.id}
            vehicle={v}
            lineItemOptions={lineItems}
            onUpdate={updated => update(vehicles.map((x, i) => i === idx ? updated : x))}
            onRemove={() => update(vehicles.filter((_, i) => i !== idx))}
          />
        ))
      )}

      {showModal && (
        <AddVehicleModal
          lineItemOptions={lineItems}
          onAdd={v => update([...vehicles, v])}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
