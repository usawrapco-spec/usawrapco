'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Car, Camera, Layers, AlertTriangle, PenLine, ClipboardCheck } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VehicleEntry {
  year: number; make: string; model: string; sqft: number
  basePrice: number; installHours: number; tier: string
}
type VehicleModelInfo = { model: string; sqft: number | null }

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchAllMakes(): Promise<string[]> {
  try { const r = await fetch('/api/vehicles/makes'); const d = await r.json(); return d.makes || [] } catch { return [] }
}
async function fetchModelsForMake(make: string, year?: string): Promise<VehicleModelInfo[]> {
  try {
    const y = year ? `&year=${year}` : ''
    const r = await fetch(`/api/vehicles/models?make=${encodeURIComponent(make)}${y}`)
    const d = await r.json()
    return (d.models || []).map((m: { model: string; sqft: number | null }) => ({ model: m.model, sqft: m.sqft }))
  } catch { return [] }
}
async function lookupVehicle(make: string, model: string, year?: string): Promise<VehicleEntry | null> {
  try {
    const y = year ? `&year=${year}` : ''
    const r = await fetch(`/api/vehicles/lookup?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}${y}`)
    const d = await r.json()
    if (d.measurement) {
      const m = d.measurement as Record<string, unknown>
      const sqft = Number(m.full_wrap_sqft) || 0
      return { year: year ? parseInt(year) : 0, make, model, sqft, basePrice: sqft ? Math.round(sqft * 20) : 0, installHours: sqft ? Math.round((sqft / 30) * 10) / 10 : 8, tier: (m.body_style as string) || 'standard' }
    }
  } catch {/* ignore */}
  return null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WRAP_SCOPES = [
  { key: 'full_wrap', label: 'Full Wrap' },
  { key: 'partial',   label: 'Partial Wrap' },
  { key: 'hood',      label: 'Hood Only' },
  { key: 'roof',      label: 'Roof Only' },
  { key: 'rear',      label: 'Rear Only' },
  { key: 'custom',    label: 'Custom Zones' },
]
const VEHICLE_CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor']
const PAINT_CONDITIONS   = ['Good', 'Needs Prep', 'Poor']
const DESIGN_DIRECTIONS  = [
  { key: 'custom_design',  label: 'Custom Design' },
  { key: 'customer_files', label: 'Customer Provides Files' },
  { key: 'template',       label: 'Use Template' },
]
const SURFACE_ISSUES = ['Rust spots', 'Deep scratches', 'Dents', 'Previous vinyl', 'Fading', 'Clear coat issues']
const PREP_TIMES = ['None', '1hr', '2hr', '4hr', 'Custom']

const hFont = "'Barlow Condensed', sans-serif"
const mFont = "'JetBrains Mono', monospace"

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  projectId: string
  initialData: Record<string, any>
}

export default function ProjectIntakeSurvey({ projectId, initialData }: Props) {
  const supabase = createClient()
  const [surveyData, setSurveyData] = useState<Record<string, any>>(initialData)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [allMakes, setAllMakes]       = useState<string[]>([])
  const [modelInfos, setModelInfos]   = useState<VehicleModelInfo[]>([])
  const [makeOpen, setMakeOpen]       = useState(false)
  const [modelOpen, setModelOpen]     = useState(false)
  const [makeFilter, setMakeFilter]   = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [vehicleEntry, setVehicleEntry] = useState<VehicleEntry | null>(null)
  const [photoAngles, setPhotoAngles] = useState<string[]>(initialData.photos || [])
  const [signatureSaved, setSignatureSaved] = useState(!!initialData.signatureData)
  const [isDrawing, setIsDrawing]     = useState(false)
  const [lastPos, setLastPos]         = useState<{ x: number; y: number } | null>(null)
  const makeRef    = useRef<HTMLDivElement>(null)
  const modelRef   = useRef<HTMLDivElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)

  useEffect(() => { fetchAllMakes().then(setAllMakes) }, [])

  useEffect(() => {
    if (surveyData.vehicleMake) {
      fetchModelsForMake(surveyData.vehicleMake, surveyData.vehicleYear).then(ms =>
        setModelInfos(ms.map(m => ({ model: m.model, sqft: m.sqft })))
      )
    }
  }, [surveyData.vehicleMake, surveyData.vehicleYear])

  useEffect(() => {
    if (surveyData.vehicleMake && surveyData.vehicleModel) {
      lookupVehicle(surveyData.vehicleMake, surveyData.vehicleModel, surveyData.vehicleYear)
        .then(v => setVehicleEntry(v))
    }
  }, [surveyData.vehicleMake, surveyData.vehicleModel, surveyData.vehicleYear])

  useEffect(() => {
    function h(e: MouseEvent) {
      if (makeRef.current && !makeRef.current.contains(e.target as Node)) setMakeOpen(false)
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function onFieldChange(key: string, value: unknown) {
    const updated = { ...surveyData, [key]: value }
    setSurveyData(updated)
    setSaveStatus('saving')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      // Read current form_data first to safely merge the survey key
      const { data: cur } = await supabase
        .from('projects').select('form_data').eq('id', projectId).single()
      await supabase.from('projects').update({
        form_data: { ...((cur?.form_data as Record<string, unknown>) ?? {}), survey: updated },
      }).eq('id', projectId)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 500)
  }

  const filteredMakes  = makeFilter  ? allMakes.filter(m => m.toLowerCase().includes(makeFilter.toLowerCase())) : allMakes
  const filteredModels = modelFilter ? modelInfos.filter(m => m.model.toLowerCase().includes(modelFilter.toLowerCase())) : modelInfos

  function selectMake(make: string) {
    setMakeOpen(false); setMakeFilter('')
    onFieldChange('vehicleMake', make)
    onFieldChange('vehicleModel', '')
    setVehicleEntry(null)
    fetchModelsForMake(make, surveyData.vehicleYear).then(ms => setModelInfos(ms.map(m => ({ model: m.model, sqft: m.sqft }))))
  }

  async function selectModel(model: string) {
    setModelOpen(false); setModelFilter('')
    onFieldChange('vehicleModel', model)
    const v = await lookupVehicle(surveyData.vehicleMake, model, surveyData.vehicleYear)
    setVehicleEntry(v)
    const sqft = getWrapSqft(v, surveyData.wrapScope)
    onFieldChange('vehicleSqft', sqft)
  }

  function selectScope(scope: string) {
    onFieldChange('wrapScope', scope)
    const sqft = getWrapSqft(vehicleEntry, scope)
    onFieldChange('vehicleSqft', sqft)
  }

  function getWrapSqft(v: VehicleEntry | null, scope: string): number {
    if (!v || !v.sqft) return 0
    switch (scope) {
      case 'full_wrap': return v.sqft
      case 'partial':   return Math.round(v.sqft * 0.6)
      case 'hood':      return Math.round(v.sqft * 0.12)
      case 'roof':      return Math.round(v.sqft * 0.10)
      case 'rear':      return Math.round(v.sqft * 0.08)
      default:          return Math.round(v.sqft * 0.5)
    }
  }

  function toggleSurfaceIssue(issue: string) {
    const current: string[] = surveyData.surfaceIssues || []
    onFieldChange('surfaceIssues', current.includes(issue) ? current.filter(i => i !== issue) : [...current, issue])
  }

  function getSigPos(e: React.MouseEvent | React.TouchEvent) {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY }
  }
  function startDraw(e: React.MouseEvent | React.TouchEvent) { e.preventDefault(); setIsDrawing(true); setLastPos(getSigPos(e)) }
  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing || !canvasRef.current || !lastPos) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    const pos = getSigPos(e)
    ctx.beginPath(); ctx.strokeStyle = '#e8eaed'; ctx.lineWidth = 2; ctx.lineCap = 'round'
    ctx.moveTo(lastPos.x, lastPos.y); ctx.lineTo(pos.x, pos.y); ctx.stroke()
    setLastPos(pos)
  }
  function stopDraw() { setIsDrawing(false); setLastPos(null) }
  function saveSignature() {
    if (!canvasRef.current) return
    onFieldChange('signatureData', canvasRef.current.toDataURL())
    onFieldChange('signatureDate', new Date().toISOString())
    setSignatureSaved(true)
  }
  function clearSignature() {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    onFieldChange('signatureData', null)
    setSignatureSaved(false)
  }

  const completionFields = [surveyData.vehicleMake, surveyData.vehicleModel, surveyData.vehicleCondition, surveyData.wrapScope, surveyData.paintCondition, surveyData.customerConfirmed]
  const completionPct    = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100)
  const sqftPreview      = vehicleEntry && surveyData.wrapScope ? getWrapSqft(vehicleEntry, surveyData.wrapScope) : null

  const sFld: React.CSSProperties = { width: '100%', padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--surface2)', borderRadius: 6, color: 'var(--text1)', fontSize: 13, outline: 'none' }
  const sLbl: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: hFont }
  const sCard: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: '20px', marginBottom: 16 }
  const btnSel = (active: boolean, accent = 'var(--accent)'): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: active ? `1px solid ${accent}` : '1px solid var(--surface2)',
    background: active ? 'rgba(79,127,255,0.15)' : 'var(--bg)',
    color: active ? accent : 'var(--text2)', transition: 'all 0.15s',
  })
  const ddStyle: React.CSSProperties = {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
    background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 8,
    marginTop: 2, maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  }
  const optSt: React.CSSProperties = { padding: '7px 12px', fontSize: 12, color: 'var(--text1)', cursor: 'pointer', borderBottom: '1px solid var(--surface2)' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ClipboardCheck size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: hFont, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text1)' }}>
            Vehicle Intake Survey
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 10, background: completionPct === 100 ? 'rgba(34,192,122,0.15)' : 'rgba(79,127,255,0.12)', color: completionPct === 100 ? 'var(--green)' : 'var(--accent)' }}>
            {completionPct}% complete
          </span>
        </div>
        <div style={{ fontSize: 11, color: saveStatus === 'saved' ? 'var(--green)' : saveStatus === 'saving' ? 'var(--amber)' : 'var(--text3)' }}>
          {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : ''}
        </div>
      </div>

      <div style={{ height: 4, borderRadius: 4, background: 'var(--surface2)', marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 4, background: 'var(--accent)', width: `${completionPct}%`, transition: 'width 0.3s ease' }} />
      </div>

      {/* ── VEHICLE INFO ───────────────────────────────────────────────────────── */}
      <div style={sCard}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: hFont, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Car size={13} /> Vehicle Information
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 10, marginBottom: 14 }}>
          <div>
            <label style={sLbl}>Year</label>
            <input value={surveyData.vehicleYear || ''} onChange={e => onFieldChange('vehicleYear', e.target.value)} style={sFld} placeholder="2024" />
          </div>
          <div ref={makeRef} style={{ position: 'relative' }}>
            <label style={sLbl}>Make</label>
            <input
              value={makeOpen ? makeFilter : (surveyData.vehicleMake || '')}
              onChange={e => { setMakeFilter(e.target.value); if (!makeOpen) setMakeOpen(true) }}
              onFocus={() => setMakeOpen(true)}
              style={sFld} placeholder="Ford"
            />
            {makeOpen && filteredMakes.length > 0 && (
              <div style={ddStyle}>
                {filteredMakes.slice(0, 80).map(m => (
                  <div key={m} style={optSt} onMouseDown={() => selectMake(m)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    {m}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div ref={modelRef} style={{ position: 'relative' }}>
            <label style={sLbl}>Model</label>
            <input
              value={modelOpen ? modelFilter : (surveyData.vehicleModel || '')}
              onChange={e => { setModelFilter(e.target.value); if (!modelOpen) setModelOpen(true) }}
              onFocus={() => { if (surveyData.vehicleMake) setModelOpen(true) }}
              style={sFld}
              disabled={!surveyData.vehicleMake}
              placeholder={surveyData.vehicleMake ? 'F-150' : 'Select make first'}
            />
            {modelOpen && filteredModels.length > 0 && (
              <div style={ddStyle}>
                {filteredModels.map(m => (
                  <div key={m.model} style={{ ...optSt, display: 'flex', justifyContent: 'space-between' }}
                    onMouseDown={() => { void selectModel(m.model) }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span>{m.model}</span>
                    {m.sqft && <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: mFont }}>{m.sqft}sqft</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={sLbl}>Current Color</label>
            <input value={surveyData.vehicleColor || ''} onChange={e => onFieldChange('vehicleColor', e.target.value)} style={sFld} placeholder="White" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 10, marginBottom: 14 }}>
          <div>
            <label style={sLbl}>VIN Number</label>
            <input value={surveyData.vin || ''} onChange={e => onFieldChange('vin', e.target.value.toUpperCase())} style={sFld} placeholder="1HGBH41JXMN109186" maxLength={17} />
          </div>
          <div>
            <label style={sLbl}>License Plate</label>
            <input value={surveyData.licensePlate || ''} onChange={e => onFieldChange('licensePlate', e.target.value.toUpperCase())} style={sFld} placeholder="ABC-1234" />
          </div>
          <div>
            <label style={sLbl}>Odometer</label>
            <input type="number" value={surveyData.odometer || ''} onChange={e => onFieldChange('odometer', e.target.value)} style={sFld} placeholder="45000" />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={sLbl}>Vehicle Condition</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {VEHICLE_CONDITIONS.map(c => (
              <button key={c} onClick={() => onFieldChange('vehicleCondition', c)} style={btnSel(surveyData.vehicleCondition === c)}>{c}</button>
            ))}
          </div>
        </div>

        <div>
          <label style={sLbl}>Vehicle Photos</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Front', 'Driver Side', 'Passenger Side', 'Rear', 'Damage'].map(angle => (
              <label key={angle} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 14px', borderRadius: 8, border: '1px dashed var(--surface2)', cursor: 'pointer', background: 'var(--bg)', minWidth: 80, color: photoAngles.includes(angle) ? 'var(--green)' : 'var(--text3)' }}>
                <Camera size={18} style={{ color: photoAngles.includes(angle) ? 'var(--green)' : 'var(--text3)' }} />
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: hFont }}>{angle}</span>
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                  onChange={e => {
                    if (e.target.files?.[0]) {
                      const next = [...new Set([...photoAngles, angle])]
                      setPhotoAngles(next)
                      onFieldChange('photos', next)
                    }
                  }}
                />
              </label>
            ))}
          </div>
          {photoAngles.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 6 }}>{photoAngles.length} angle(s): {photoAngles.join(', ')}</div>
          )}
        </div>
      </div>

      {/* ── WRAP SCOPE ─────────────────────────────────────────────────────────── */}
      <div style={sCard}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple)', fontFamily: hFont, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Layers size={13} /> Wrap Scope
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={sLbl}>Wrap Type</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {WRAP_SCOPES.map(s => (
              <button key={s.key} onClick={() => selectScope(s.key)} style={btnSel(surveyData.wrapScope === s.key, 'var(--purple)')}>{s.label}</button>
            ))}
          </div>
        </div>

        {sqftPreview !== null && vehicleEntry && (
          <div style={{ display: 'flex', gap: 20, marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(34,192,122,0.06)', border: '1px solid rgba(34,192,122,0.15)' }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', fontFamily: hFont, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Est. Sqft</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)', fontFamily: mFont }}>{sqftPreview}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', fontFamily: hFont, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Full Wrap Sqft</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', fontFamily: mFont }}>{vehicleEntry.sqft}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', fontFamily: hFont, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Base Rate</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', fontFamily: mFont }}>${vehicleEntry.basePrice}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', fontFamily: hFont, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Install Hrs</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', fontFamily: mFont }}>{vehicleEntry.installHours}h</div>
            </div>
          </div>
        )}

        {(surveyData.wrapScope === 'partial' || surveyData.wrapScope === 'custom') && (
          <div style={{ marginBottom: 14 }}>
            <label style={sLbl}>Coverage Zones</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Hood', 'Roof', 'Driver Side', 'Passenger Side', 'Rear', 'Front Bumper', 'Rear Bumper', 'Mirrors'].map(zone => {
                const zones: string[] = surveyData.coverageZones || []
                return (
                  <button key={zone}
                    onClick={() => onFieldChange('coverageZones', zones.includes(zone) ? zones.filter(z => z !== zone) : [...zones, zone])}
                    style={btnSel(zones.includes(zone), 'var(--purple)')}>
                    {zone}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14, marginBottom: 14 }}>
          <div>
            <label style={sLbl}>Color / Finish Preference</label>
            <input value={surveyData.colorPreference || ''} onChange={e => onFieldChange('colorPreference', e.target.value)} style={sFld} placeholder="e.g. Matte black, chrome delete..." />
          </div>
          <div>
            <label style={sLbl}>Design Direction</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DESIGN_DIRECTIONS.map(d => (
                <button key={d.key} onClick={() => onFieldChange('designDirection', d.key)} style={btnSel(surveyData.designDirection === d.key, 'var(--cyan)')}>{d.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label style={sLbl}>Special Instructions</label>
          <textarea value={surveyData.specialInstructions || ''} onChange={e => onFieldChange('specialInstructions', e.target.value)} style={{ ...sFld, resize: 'vertical', minHeight: 70 }} rows={3} placeholder="Any special requirements, branding notes, customer requests..." />
        </div>
      </div>

      {/* ── SURFACE CONDITION ──────────────────────────────────────────────────── */}
      <div style={sCard}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', fontFamily: hFont, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={13} /> Surface Condition
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={sLbl}>Paint Condition</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {PAINT_CONDITIONS.map(c => (
              <button key={c} onClick={() => onFieldChange('paintCondition', c)} style={btnSel(surveyData.paintCondition === c, 'var(--amber)')}>{c}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={sLbl}>Surface Issues (check all that apply)</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SURFACE_ISSUES.map(issue => {
              const issues: string[] = surveyData.surfaceIssues || []
              const active = issues.includes(issue)
              return (
                <button key={issue} onClick={() => toggleSurfaceIssue(issue)}
                  style={{ ...btnSel(active, 'var(--amber)'), background: active ? 'rgba(245,158,11,0.12)' : 'var(--bg)' }}>
                  {issue}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
          <div>
            <label style={sLbl}>Pre-existing Damage Notes</label>
            <textarea value={surveyData.damageNotes || ''} onChange={e => onFieldChange('damageNotes', e.target.value)} style={{ ...sFld, resize: 'vertical', minHeight: 70 }} rows={3} placeholder="Describe any existing damage..." />
          </div>
          <div>
            <label style={sLbl}>Estimated Prep Time Needed</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PREP_TIMES.map(t => (
                <button key={t} onClick={() => onFieldChange('prepTime', t)} style={btnSel(surveyData.prepTime === t, 'var(--amber)')}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CUSTOMER SIGN-OFF ──────────────────────────────────────────────────── */}
      <div style={sCard}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', fontFamily: hFont, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <PenLine size={13} /> Customer Sign-off
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!surveyData.customerConfirmed} onChange={e => onFieldChange('customerConfirmed', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--green)' }} />
          <span style={{ fontSize: 13, color: 'var(--text1)' }}>Customer confirms vehicle condition described above is accurate and has been inspected.</span>
        </label>

        <div style={{ marginBottom: 8 }}>
          <label style={sLbl}>Customer Signature</label>
          <div style={{ border: '1px solid var(--surface2)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg)' }}>
            <canvas ref={canvasRef} width={600} height={120}
              style={{ display: 'block', width: '100%', height: 120, touchAction: 'none', cursor: 'crosshair' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{signatureSaved ? 'Signature saved' : 'Draw signature above'}</div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={saveSignature} style={{ padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: 'rgba(34,192,122,0.12)', border: '1px solid rgba(34,192,122,0.3)', color: 'var(--green)', cursor: 'pointer' }}>Save Signature</button>
          <button onClick={clearSignature} style={{ padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: 'var(--bg)', border: '1px solid var(--surface2)', color: 'var(--text3)', cursor: 'pointer' }}>Clear</button>
          {surveyData.signatureDate && (
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Signed: {new Date(surveyData.signatureDate as string).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {surveyData.wrapScope && surveyData.vehicleMake && surveyData.vehicleModel && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(34,192,122,0.06)', border: '1px solid rgba(34,192,122,0.2)' }}>
          <span style={{ fontSize: 13, color: 'var(--text1)' }}>Survey complete — scope and vehicle data saved.</span>
        </div>
      )}
    </div>
  )
}
