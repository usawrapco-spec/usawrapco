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
  'Wrap residue', 'Oxidation', 'Body filler', 'Trim damage',
]

const CHECKLIST_ITEMS = [
  'Surface clean & dry',
  'No wax/contaminants',
  'Temp 50-90F',
  'Trim removed',
  'Pre-install photos',
]

const CONDITION_CONFIG: Record<SurveyVehicle['condition'], { label: string; color: string }> = {
  excellent: { label: 'Excellent', color: '#22c07a' },
  good:      { label: 'Good',      color: '#4f7fff' },
  fair:      { label: 'Fair',      color: '#f59e0b' },
  poor:      { label: 'Poor',      color: '#f25a5a' },
}

// ─── Shared compact styles ─────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '4px 7px',
  background: 'var(--bg)', border: '1px solid var(--surface2)',
  borderRadius: 5, color: 'var(--text1)', fontSize: 11, outline: 'none',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none' as React.CSSProperties['appearance'],
  cursor: 'pointer',
}

const chipBtn = (active: boolean, color?: string): React.CSSProperties => ({
  padding: '2px 7px', borderRadius: 20, fontSize: 10, cursor: 'pointer',
  border: `1px solid ${active ? (color ?? 'var(--accent)') : 'var(--surface2)'}`,
  background: active ? (color ?? 'var(--accent)') + '20' : 'transparent',
  color: active ? (color ?? 'var(--accent)') : 'var(--text2)',
})

// ─── VehicleCard ──────────────────────────────────────────────────────────────

function VehicleCard({
  vehicle, lineItemOptions, onUpdate, onRemove,
}: {
  vehicle: SurveyVehicle
  lineItemOptions: { id: string; name: string }[]
  onUpdate: (v: SurveyVehicle) => void
  onRemove: () => void
}) {
  const checkedCount = vehicle.checklist.filter(Boolean).length
  const progress     = Math.round((checkedCount / CHECKLIST_ITEMS.length) * 100)

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

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--surface2)',
      borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Car size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 12 }}>
            {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle'}
          </div>
        </div>
        {vehicle.sqft > 0 && (
          <span style={{ background: '#4f7fff20', color: 'var(--accent)', padding: '1px 6px', borderRadius: 20, fontSize: 10, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
            {vehicle.sqft} sf
          </span>
        )}
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 2, flexShrink: 0 }}>
          <Trash2 size={13} />
        </button>
      </div>

      {/* Color / Plate / Notes inline */}
      <div style={{ display: 'flex', gap: 5 }}>
        <input
          value={vehicle.color}
          onChange={e => onUpdate({ ...vehicle, color: e.target.value })}
          placeholder="Color"
          style={{ ...inputStyle, flex: 1 }}
        />
        <input
          value={vehicle.plate}
          onChange={e => onUpdate({ ...vehicle, plate: e.target.value })}
          placeholder="Plate #"
          style={{ ...inputStyle, flex: 1 }}
        />
      </div>

      {/* Condition */}
      <div>
        <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Condition</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(Object.keys(CONDITION_CONFIG) as SurveyVehicle['condition'][]).map(c => {
            const cfg = CONDITION_CONFIG[c]
            const active = vehicle.condition === c
            return (
              <button key={c} onClick={() => onUpdate({ ...vehicle, condition: c })} style={{
                flex: 1, padding: '3px 3px', borderRadius: 20,
                border: `1px solid ${active ? cfg.color : 'var(--surface2)'}`,
                background: active ? cfg.color + '20' : 'transparent',
                color: active ? cfg.color : 'var(--text2)',
                fontSize: 10, fontWeight: active ? 600 : 400, cursor: 'pointer',
              }}>
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Surface Issues */}
      <div>
        <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Surface Issues</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {SURFACE_ISSUES.map(issue => {
            const active = vehicle.surfaceIssues.includes(issue)
            return (
              <button key={issue} onClick={() => toggleIssue(issue)} style={chipBtn(active, '#f59e0b')}>
                {issue}
              </button>
            )
          })}
        </div>
      </div>

      {/* Pre-install Checklist */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pre-install</div>
          <div style={{ fontSize: 9, color: 'var(--text2)' }}>{checkedCount}/{CHECKLIST_ITEMS.length}</div>
        </div>
        <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 2, marginBottom: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--green)' : 'var(--accent)', borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {CHECKLIST_ITEMS.map((item, idx) => (
            <button
              key={item}
              onClick={() => toggleChecklist(idx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px',
                borderRadius: 20, cursor: 'pointer', fontSize: 10,
                border: `1px solid ${vehicle.checklist[idx] ? 'var(--green)' : 'var(--surface2)'}`,
                background: vehicle.checklist[idx] ? '#22c07a20' : 'transparent',
                color: vehicle.checklist[idx] ? 'var(--green)' : 'var(--text2)',
              }}
            >
              {vehicle.checklist[idx] && <Check size={9} />}
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Assign to Line Items */}
      {lineItemOptions.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Assign to Items</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {lineItemOptions.map(li => {
              const active = vehicle.assignedLineItems.includes(li.id)
              return (
                <button
                  key={li.id}
                  onClick={() => {
                    const next = active ? vehicle.assignedLineItems.filter(x => x !== li.id) : [...vehicle.assignedLineItems, li.id]
                    onUpdate({ ...vehicle, assignedLineItems: next })
                  }}
                  style={chipBtn(active)}
                >
                  {li.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      <input
        value={vehicle.notes}
        onChange={e => onUpdate({ ...vehicle, notes: e.target.value })}
        placeholder="Notes (optional)"
        style={inputStyle}
      />
    </div>
  )
}

// ─── VinModal (compact) ───────────────────────────────────────────────────────

function VinModal({
  lineItemOptions,
  onAdd,
  onClose,
}: {
  lineItemOptions: { id: string; name: string }[]
  onAdd: (v: SurveyVehicle) => void
  onClose: () => void
}) {
  const [vinInput, setVinInput] = useState('')
  const [vinDecoded, setVinDecoded] = useState<{ year: string; make: string; model: string } | null>(null)
  const [vinLoading, setVinLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  async function decodeVin(vin: string) {
    if (vin.length !== 17) return
    setVinLoading(true)
    try {
      const res  = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`)
      const json = await res.json() as { Results: { Variable: string; Value: string }[] }
      const get  = (v: string) => json.Results.find(r => r.Variable === v)?.Value || ''
      setVinDecoded({ year: get('Model Year'), make: get('Make'), model: get('Model') })
    } catch { /* ignore */ }
    setVinLoading(false)
  }

  async function startScan() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; void videoRef.current.play() }
      setScanning(true)
    } catch { /* camera unavailable */ }
  }

  function stopScan() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()) }, [])

  function handleAdd() {
    const year  = vinDecoded?.year  || ''
    const make  = vinDecoded?.make  || ''
    const model = vinDecoded?.model || ''
    if (!year && !make) return
    onAdd({
      id: crypto.randomUUID(),
      year, make, model, sqft: 0,
      color: '', plate: '', notes: '',
      condition: 'good', surfaceIssues: [],
      checklist: Array(CHECKLIST_ITEMS.length).fill(false) as boolean[],
      assignedLineItems: [],
    })
  }

  void lineItemOptions

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000080', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 18, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>Scan / Enter VIN</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}>
            <X size={18} />
          </button>
        </div>

        {!scanning ? (
          <button onClick={() => { void startScan() }} style={{
            padding: 12, borderRadius: 8, border: '2px dashed var(--surface2)', background: 'var(--bg)',
            color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12,
          }}>
            <Camera size={16} /> Scan VIN Barcode
          </button>
        ) : (
          <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
            <video ref={videoRef} style={{ width: '100%', borderRadius: 8, display: 'block' }} muted playsInline />
            <button onClick={stopScan} style={{
              position: 'absolute', top: 7, right: 7, background: '#000000aa', border: 'none', borderRadius: 5,
              color: 'var(--text1)', padding: '3px 7px', cursor: 'pointer', fontSize: 11,
            }}>Stop</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 7 }}>
          <input
            value={vinInput}
            onChange={e => { const v = e.target.value.toUpperCase().slice(0, 17); setVinInput(v); setVinDecoded(null) }}
            placeholder="17-char VIN"
            style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', letterSpacing: 1, fontSize: 13 }}
            maxLength={17}
          />
          <button
            onClick={() => { void decodeVin(vinInput) }}
            disabled={vinInput.length !== 17 || vinLoading}
            style={{
              padding: '0 12px', borderRadius: 6, border: 'none',
              background: 'var(--accent)', color: '#fff', cursor: 'pointer',
              fontSize: 12, opacity: vinInput.length !== 17 ? 0.5 : 1,
            }}
          >
            {vinLoading ? '...' : 'Decode'}
          </button>
        </div>

        {vinDecoded && (
          <div style={{ padding: '7px 10px', background: '#22c07a15', borderRadius: 7, fontSize: 12, color: 'var(--green)' }}>
            {vinDecoded.year} {vinDecoded.make} {vinDecoded.model}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '8px 0', borderRadius: 7, border: '1px solid var(--surface2)',
            background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 12,
          }}>Cancel</button>
          <button onClick={handleAdd} disabled={!vinDecoded} style={{
            flex: 2, padding: '8px 0', borderRadius: 7, border: 'none',
            background: 'var(--accent)', color: '#fff',
            cursor: vinDecoded ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 600,
            opacity: vinDecoded ? 1 : 0.5,
          }}>Add Vehicle</button>
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
  const supabase = createClient()
  const [vehicles, setVehicles]   = useState<SurveyVehicle[]>(initialVehicles)
  const [showVinModal, setShowVinModal] = useState(false)

  // Inline add state
  const [years,  setYears]  = useState<string[]>([])
  const [makes,  setMakes]  = useState<string[]>([])
  const [models, setModels] = useState<string[]>([])
  const [addYear,  setAddYear]  = useState('')
  const [addMake,  setAddMake]  = useState('')
  const [addModel, setAddModel] = useState('')

  // Load years on mount
  useEffect(() => {
    supabase
      .from('vehicle_measurements')
      .select('year')
      .order('year', { ascending: false })
      .then(({ data }) => {
        if (data) setYears([...new Set(data.map(d => String((d as { year: number }).year)))])
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load makes when year changes
  useEffect(() => {
    if (!addYear) { setMakes([]); setAddMake(''); setModels([]); setAddModel(''); return }
    supabase
      .from('vehicle_measurements')
      .select('make')
      .eq('year', parseInt(addYear))
      .order('make')
      .then(({ data }) => {
        if (data) setMakes([...new Set(data.map(d => (d as { make: string }).make))])
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addYear])

  // Load models when make changes
  useEffect(() => {
    if (!addYear || !addMake) { setModels([]); setAddModel(''); return }
    supabase
      .from('vehicle_measurements')
      .select('model')
      .eq('year', parseInt(addYear))
      .eq('make', addMake)
      .order('model')
      .then(({ data }) => {
        if (data) setModels([...new Set(data.map(d => (d as { model: string }).model))])
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addYear, addMake])

  function update(next: SurveyVehicle[]) {
    setVehicles(next)
    onVehiclesChange?.(next)
  }

  async function handleQuickAdd() {
    if (!addYear || !addMake) return
    // Fetch sqft
    const { data } = await supabase
      .from('vehicle_measurements')
      .select('total_sqft')
      .eq('year', parseInt(addYear))
      .eq('make', addMake)
      .eq('model', addModel)
      .single()

    const sqft = (data as { total_sqft: number } | null)?.total_sqft || 0

    const newV: SurveyVehicle = {
      id: crypto.randomUUID(),
      year: addYear, make: addMake, model: addModel, sqft,
      color: '', plate: '', notes: '',
      condition: 'good', surfaceIssues: [],
      checklist: Array(CHECKLIST_ITEMS.length).fill(false) as boolean[],
      assignedLineItems: [],
    }
    update([...vehicles, newV])
    setAddYear(''); setAddMake(''); setAddModel('')
  }

  const canAdd = Boolean(addYear && addMake)
  const inlineSelStyle: React.CSSProperties = {
    ...selectStyle, fontSize: 11, flex: 1,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <Car size={14} color="var(--accent)" />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>Vehicle Survey</span>
        {vehicles.length > 0 && (
          <span style={{ background: '#4f7fff20', color: 'var(--accent)', padding: '1px 7px', borderRadius: 20, fontSize: 10 }}>
            {vehicles.length}
          </span>
        )}
      </div>

      {/* Vehicle cards */}
      {vehicles.map((v, idx) => (
        <VehicleCard
          key={v.id}
          vehicle={v}
          lineItemOptions={lineItems}
          onUpdate={updated => update(vehicles.map((x, i) => i === idx ? updated : x))}
          onRemove={() => update(vehicles.filter((_, i) => i !== idx))}
        />
      ))}

      {/* Inline add row — at the bottom */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <Car size={13} color="var(--text3)" style={{ flexShrink: 0 }} />
        <select value={addYear} onChange={e => { setAddYear(e.target.value); setAddMake(''); setAddModel('') }} style={{ ...inlineSelStyle, flex: '0 0 72px' }}>
          <option value="">Year</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={addMake} onChange={e => { setAddMake(e.target.value); setAddModel('') }} disabled={!addYear} style={inlineSelStyle}>
          <option value="">Make</option>
          {makes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={addModel} onChange={e => setAddModel(e.target.value)} disabled={!addMake} style={inlineSelStyle}>
          <option value="">Model</option>
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button
          onClick={() => { void handleQuickAdd() }}
          disabled={!canAdd}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 6, border: 'none',
            background: canAdd ? 'var(--accent)' : 'var(--surface2)',
            color: canAdd ? '#fff' : 'var(--text3)',
            cursor: canAdd ? 'pointer' : 'not-allowed', fontSize: 11, flexShrink: 0,
          }}
        >
          <Plus size={11} /> Add
        </button>
        <button
          onClick={() => setShowVinModal(true)}
          style={{
            padding: '4px 8px', borderRadius: 6, border: '1px solid var(--surface2)',
            background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 10, flexShrink: 0,
          }}
        >
          VIN
        </button>
      </div>

      {/* VIN Modal */}
      {showVinModal && (
        <VinModal
          lineItemOptions={lineItems}
          onAdd={v => { update([...vehicles, v]); setShowVinModal(false) }}
          onClose={() => setShowVinModal(false)}
        />
      )}
    </div>
  )
}
