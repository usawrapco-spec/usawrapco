'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Plus, X, Car, Camera, Check, Trash2 } from 'lucide-react'
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

function makeBlankVehicle(year: string, make: string, model: string, sqft: number): SurveyVehicle {
  return {
    id: crypto.randomUUID(),
    year, make, model, sqft,
    color: '', plate: '', notes: '',
    condition: 'good',
    surfaceIssues: [],
    checklist: Array(CHECKLIST_ITEMS.length).fill(false) as boolean[],
    assignedLineItems: [],
  }
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
  type ModalTab = 'ymm' | 'vin'
  const supabase = createClient()

  const [tab, setTab] = useState<ModalTab>('ymm')

  // ── Year/Make/Model tab state ──
  const [years,  setYears]  = useState<string[]>([])
  const [makes,  setMakes]  = useState<string[]>([])
  const [models, setModels] = useState<string[]>([])
  const [selYear,  setSelYear]  = useState('')
  const [selMake,  setSelMake]  = useState('')
  const [selModel, setSelModel] = useState('')
  const [ymmSqft, setYmmSqft] = useState(0)

  // ── VIN tab state ──
  const [vinInput,   setVinInput]   = useState('')
  const [vinDecoded, setVinDecoded] = useState<{ year: string; make: string; model: string } | null>(null)
  const [vinLoading, setVinLoading] = useState(false)
  const [scanning,   setScanning]   = useState(false)
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // ── Shared optional fields ──
  const [color, setColor] = useState('')
  const [plate, setPlate] = useState('')
  const [notes, setNotes] = useState('')
  const [assignedItems, setAssignedItems] = useState<string[]>([])

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
    if (!selYear) { setMakes([]); setSelMake(''); setModels([]); setSelModel(''); return }
    supabase
      .from('vehicle_measurements')
      .select('make')
      .eq('year', parseInt(selYear))
      .order('make')
      .then(({ data }) => {
        if (data) setMakes([...new Set(data.map(d => (d as { make: string }).make))])
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selYear])

  // Load models when make changes
  useEffect(() => {
    if (!selYear || !selMake) { setModels([]); setSelModel(''); return }
    supabase
      .from('vehicle_measurements')
      .select('model')
      .eq('year', parseInt(selYear))
      .eq('make', selMake)
      .order('model')
      .then(({ data }) => {
        if (data) setModels([...new Set(data.map(d => (d as { model: string }).model))])
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selYear, selMake])

  // Fetch sqft when model is selected
  useEffect(() => {
    if (!selYear || !selMake || !selModel) { setYmmSqft(0); return }
    supabase
      .from('vehicle_measurements')
      .select('total_sqft')
      .eq('year', parseInt(selYear))
      .eq('make', selMake)
      .eq('model', selModel)
      .single()
      .then(({ data }) => {
        setYmmSqft((data as { total_sqft: number } | null)?.total_sqft || 0)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selYear, selMake, selModel])

  // Stop camera on unmount
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()) }, [])

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

  function toggleItem(id: string) {
    setAssignedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function handleAdd() {
    let year = '', make = '', model = '', sqft = 0
    if (tab === 'ymm') {
      if (!selYear || !selMake) return
      year = selYear; make = selMake; model = selModel; sqft = ymmSqft
    } else {
      if (!vinDecoded) return
      year = vinDecoded.year; make = vinDecoded.make; model = vinDecoded.model
    }
    const v = makeBlankVehicle(year, make, model, sqft)
    v.color = color; v.plate = plate; v.notes = notes; v.assignedLineItems = assignedItems
    onAdd(v)
  }

  const canAdd = tab === 'ymm' ? Boolean(selYear && selMake) : Boolean(vinDecoded)

  const tabBtn = (id: ModalTab, label: string): React.CSSProperties => ({
    flex: 1, padding: '6px 0', border: 'none', cursor: 'pointer', fontSize: 11,
    background: tab === id ? 'var(--bg)' : 'transparent',
    color: tab === id ? 'var(--accent)' : 'var(--text2)',
    borderBottom: tab === id ? '2px solid var(--accent)' : '2px solid transparent',
    fontWeight: tab === id ? 600 : 400,
  })

  const labelStyle: React.CSSProperties = {
    fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 3,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000080', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 12, width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '90vh' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>Add Vehicle</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', padding: '8px 16px 0', borderBottom: '1px solid var(--surface2)' }}>
          <button style={tabBtn('ymm', 'Year/Make/Model')} onClick={() => setTab('ymm')}>Year / Make / Model</button>
          <button style={tabBtn('vin', 'Scan/Enter VIN')} onClick={() => setTab('vin')}>Scan / Enter VIN</button>
        </div>

        {/* Tab content — scrollable */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* ── YMM Tab ── */}
          {tab === 'ymm' && (
            <>
              <div>
                <div style={labelStyle}>Year</div>
                <select value={selYear} onChange={e => { setSelYear(e.target.value); setSelMake(''); setSelModel('') }} style={selectStyle}>
                  <option value="">Select year...</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <div style={labelStyle}>Make</div>
                <select value={selMake} onChange={e => { setSelMake(e.target.value); setSelModel('') }} disabled={!selYear} style={selectStyle}>
                  <option value="">Select make...</option>
                  {makes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <div style={labelStyle}>Model</div>
                <select value={selModel} onChange={e => setSelModel(e.target.value)} disabled={!selMake} style={selectStyle}>
                  <option value="">Select model...</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {ymmSqft > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: '#4f7fff15', borderRadius: 6, fontSize: 11, color: 'var(--accent)' }}>
                  <Car size={12} />
                  Auto-populated: <strong style={{ fontFamily: 'var(--font-mono)' }}>{ymmSqft} sqft</strong>
                </div>
              )}
            </>
          )}

          {/* ── VIN Tab ── */}
          {tab === 'vin' && (
            <>
              {/* Camera */}
              {!scanning ? (
                <button
                  onClick={() => { void startScan() }}
                  style={{
                    padding: 14, borderRadius: 8, border: '2px dashed var(--surface2)',
                    background: 'var(--bg)', color: 'var(--accent)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12,
                  }}
                >
                  <Camera size={16} /> Scan VIN Barcode
                </button>
              ) : (
                <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                  {/* Animated scan line keyframes */}
                  <style>{`
                    @keyframes vin-scan-line {
                      0%   { top: 8%; }
                      100% { top: 88%; }
                    }
                  `}</style>
                  <video
                    ref={videoRef}
                    style={{ width: '100%', display: 'block', borderRadius: 8 }}
                    muted
                    playsInline
                  />
                  {/* Scan frame overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {/* Corner markers */}
                    {[
                      { top: '12%', left: '8%',  borderTop: '3px solid var(--accent)', borderLeft: '3px solid var(--accent)' },
                      { top: '12%', right: '8%', borderTop: '3px solid var(--accent)', borderRight: '3px solid var(--accent)' },
                      { bottom: '12%', left: '8%',  borderBottom: '3px solid var(--accent)', borderLeft: '3px solid var(--accent)' },
                      { bottom: '12%', right: '8%', borderBottom: '3px solid var(--accent)', borderRight: '3px solid var(--accent)' },
                    ].map((s, i) => (
                      <div key={i} style={{ position: 'absolute', width: 18, height: 18, ...s }} />
                    ))}
                    {/* Animated scan line */}
                    <div style={{
                      position: 'absolute',
                      left: '8%', right: '8%', height: 2,
                      background: 'var(--accent)',
                      boxShadow: '0 0 8px var(--accent)',
                      animation: 'vin-scan-line 1.5s ease-in-out infinite alternate',
                    }} />
                  </div>
                  <button
                    onClick={stopScan}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      background: '#000000aa', border: 'none', borderRadius: 5,
                      color: 'var(--text1)', padding: '3px 8px', cursor: 'pointer', fontSize: 11,
                    }}
                  >
                    Stop
                  </button>
                </div>
              )}

              {/* Manual VIN input */}
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={vinInput}
                  onChange={e => {
                    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17)
                    setVinInput(v)
                    setVinDecoded(null)
                  }}
                  placeholder="17-character VIN"
                  maxLength={17}
                  style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', letterSpacing: 1, fontSize: 12 }}
                />
                <button
                  onClick={() => { void decodeVin(vinInput) }}
                  disabled={vinInput.length !== 17 || vinLoading}
                  style={{
                    padding: '0 12px', borderRadius: 6, border: 'none',
                    background: 'var(--accent)', color: '#fff', cursor: 'pointer',
                    fontSize: 12, flexShrink: 0,
                    opacity: vinInput.length !== 17 ? 0.5 : 1,
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
            </>
          )}

          {/* ── Shared optional fields ── */}
          <div style={{ display: 'flex', gap: 5 }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Color</div>
              <input value={color} onChange={e => setColor(e.target.value)} placeholder="e.g. White" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>License Plate</div>
              <input value={plate} onChange={e => setPlate(e.target.value)} placeholder="ABC-1234" style={{ ...inputStyle, textTransform: 'uppercase' }} />
            </div>
          </div>

          <div>
            <div style={labelStyle}>Notes</div>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." style={inputStyle} />
          </div>

          {/* Assign to Line Items */}
          {lineItemOptions.length > 0 && (
            <div>
              <div style={labelStyle}>Assign to Line Items</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {lineItemOptions.map(li => (
                  <button
                    key={li.id}
                    onClick={() => toggleItem(li.id)}
                    style={chipBtn(assignedItems.includes(li.id))}
                  >
                    {li.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div style={{ padding: '10px 16px 14px', display: 'flex', gap: 8, borderTop: '1px solid var(--surface2)' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 7,
              border: '1px solid var(--surface2)', background: 'transparent',
              color: 'var(--text2)', cursor: 'pointer', fontSize: 12,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!canAdd}
            style={{
              flex: 2, padding: '8px 0', borderRadius: 7, border: 'none',
              background: 'var(--accent)', color: '#fff',
              cursor: canAdd ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 600,
              opacity: canAdd ? 1 : 0.5,
            }}
          >
            Add Vehicle
          </button>
        </div>
      </div>
    </div>
  )
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
          {(vehicle.color || vehicle.plate) && (
            <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 1 }}>
              {[vehicle.color, vehicle.plate].filter(Boolean).join(' / ')}
            </div>
          )}
        </div>
        {vehicle.sqft > 0 && (
          <span style={{
            background: '#4f7fff20', color: 'var(--accent)',
            padding: '1px 7px', borderRadius: 20, fontSize: 10,
            fontFamily: 'var(--font-mono)', flexShrink: 0,
          }}>
            {vehicle.sqft} sf
          </span>
        )}
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 2, flexShrink: 0 }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Color / Plate inline */}
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
            const cfg    = CONDITION_CONFIG[c]
            const active = vehicle.condition === c
            return (
              <button
                key={c}
                onClick={() => onUpdate({ ...vehicle, condition: c })}
                style={{
                  flex: 1, padding: '3px 3px', borderRadius: 20,
                  border: `1px solid ${active ? cfg.color : 'var(--surface2)'}`,
                  background: active ? cfg.color + '20' : 'transparent',
                  color: active ? cfg.color : 'var(--text2)',
                  fontSize: 10, fontWeight: active ? 600 : 400, cursor: 'pointer',
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
        <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Surface Issues</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {SURFACE_ISSUES.map(issue => (
            <button key={issue} onClick={() => toggleIssue(issue)} style={chipBtn(vehicle.surfaceIssues.includes(issue), '#f59e0b')}>
              {issue}
            </button>
          ))}
        </div>
      </div>

      {/* Pre-install Checklist */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pre-install Checklist</div>
          <div style={{ fontSize: 9, color: 'var(--text2)' }}>{checkedCount}/{CHECKLIST_ITEMS.length}</div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 2, marginBottom: 5, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: progress === 100 ? 'var(--green)' : 'var(--accent)',
            borderRadius: 2, transition: 'width 0.3s',
          }} />
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
          <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Assign to Line Items</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {lineItemOptions.map(li => {
              const active = vehicle.assignedLineItems.includes(li.id)
              return (
                <button
                  key={li.id}
                  onClick={() => {
                    const next = active
                      ? vehicle.assignedLineItems.filter(x => x !== li.id)
                      : [...vehicle.assignedLineItems, li.id]
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
  const [vehicles, setVehicles]     = useState<SurveyVehicle[]>(initialVehicles)
  const [showModal, setShowModal]   = useState(false)

  function update(next: SurveyVehicle[]) {
    setVehicles(next)
    onVehiclesChange?.(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <Car size={14} color="var(--accent)" />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>Vehicle Survey</span>
        {vehicles.length > 0 && (
          <span style={{
            background: '#4f7fff20', color: 'var(--accent)',
            padding: '1px 7px', borderRadius: 20, fontSize: 10,
          }}>
            {vehicles.length}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 6, border: 'none',
            background: 'var(--accent)', color: '#fff',
            cursor: 'pointer', fontSize: 11,
          }}
        >
          <Plus size={11} /> Add Vehicle
        </button>
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

      {vehicles.length === 0 && (
        <div style={{
          padding: 16, textAlign: 'center',
          border: '2px dashed var(--surface2)', borderRadius: 8,
          color: 'var(--text3)', fontSize: 11,
        }}>
          No vehicles added yet
        </div>
      )}

      {/* AddVehicleModal */}
      {showModal && (
        <AddVehicleModal
          lineItemOptions={lineItems}
          onAdd={v => { update([...vehicles, v]); setShowModal(false) }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
