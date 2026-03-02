'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  GripVertical, ChevronDown, ChevronRight, Edit2, Check, X,
  Camera, Upload, Flag, AlertTriangle, CheckCircle, Trash2,
  Wand2, ExternalLink, Plus, Car,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CompactCalculator, type CalcType, type CalcResult } from './CompactCalculator'
import type { SurveyVehicle } from './VehicleSurvey'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LineItemData {
  id: string
  type: CalcType
  name: string
  salePrice: number
  materialCost: number
  laborCost: number
  designFee: number
  gpm: number
  vehicleYear: string
  vehicleMake: string
  vehicleModel: string
  vehicleSqft: number
  linkedVehicleIds: string[]
  photos: ItemPhoto[]
  selectedMockupUrl: string | null
  designStatus: DesignStatus
  designNotes: string
}

interface ItemPhoto {
  id: string
  url: string
  angle: string
  flagged: boolean
  note: string
}

type DesignStatus = 'not_started' | 'in_progress' | 'proof_sent' | 'approved'
type ItemTab = 'calculator' | 'photos' | 'mockup' | 'design'

// ─── Constants ────────────────────────────────────────────────────────────────

const JOB_TYPES: { value: CalcType; label: string; badge: string }[] = [
  { value: 'commercial', label: 'Commercial Wrap', badge: 'WRAP' },
  { value: 'box_truck',  label: 'Box Truck',       badge: 'BOX'  },
  { value: 'trailer',    label: 'Trailer',          badge: 'TRLR' },
  { value: 'marine',     label: 'Marine',           badge: 'MRNE' },
  { value: 'ppf',        label: 'PPF',              badge: 'PPF'  },
]

const PHOTO_ANGLES = [
  'Front 3/4', 'Rear 3/4', 'Driver Side', 'Pass Side',
  'Hood Close', 'Roof', 'Door Jamb', 'Bumper Detail',
]

const STYLE_PRESETS = [
  { label: 'Professional',  wrapStyle: 'Company Branding / Logo' },
  { label: 'Bold Graphics', wrapStyle: 'Bold & Aggressive' },
  { label: 'Minimal',       wrapStyle: 'Minimalist / Clean' },
  { label: 'Racing',        wrapStyle: 'Racing / Sport Stripes' },
  { label: 'Matte',         wrapStyle: 'Full Color Change' },
  { label: 'Chrome',        wrapStyle: 'Gradient / Color Fade' },
]

const DESIGN_STATUSES: { value: DesignStatus; label: string; color: string }[] = [
  { value: 'not_started', label: 'Not Started', color: 'var(--text3)' },
  { value: 'in_progress', label: 'In Progress',  color: '#f59e0b'      },
  { value: 'proof_sent',  label: 'Proof Sent',   color: 'var(--cyan)'  },
  { value: 'approved',    label: 'Approved',     color: 'var(--green)' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gpmColor(gpm: number): string {
  if (gpm >= 75) return 'var(--green)'
  if (gpm >= 65) return '#f59e0b'
  return 'var(--red)'
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function newItem(type: CalcType = 'commercial'): LineItemData {
  return {
    id: crypto.randomUUID(),
    type,
    name: JOB_TYPES.find(t => t.value === type)?.label ?? 'Line Item',
    salePrice: 0, materialCost: 0, laborCost: 0, designFee: 0, gpm: 0,
    vehicleYear: '', vehicleMake: '', vehicleModel: '', vehicleSqft: 0,
    linkedVehicleIds: [], photos: [],
    selectedMockupUrl: null, designStatus: 'not_started', designNotes: '',
  }
}

// ─── Shared compact styles ─────────────────────────────────────────────────────

const numLabel: React.CSSProperties = {
  fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 1,
}

const selStyle: React.CSSProperties = {
  padding: '4px 6px', background: 'var(--bg)',
  border: '1px solid var(--surface2)', borderRadius: 5,
  color: 'var(--text1)', fontSize: 11, outline: 'none',
  cursor: 'pointer', appearance: 'none' as React.CSSProperties['appearance'],
  width: '100%',
}

// ─── NumbersPanel ─────────────────────────────────────────────────────────────

function NumbersPanel({ item, onUpdate }: { item: LineItemData; onUpdate: (u: LineItemData) => void }) {
  const cogs = item.materialCost + item.laborCost + item.designFee
  const gp   = item.salePrice - cogs
  const gpm  = item.salePrice > 0 ? Math.round((gp / item.salePrice) * 1000) / 10 : 0
  const col  = gpmColor(gpm)

  return (
    <div style={{
      background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--surface2)',
      padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {/* Sale Price — editable */}
      <div>
        <div style={numLabel}>Sale Price</div>
        <input
          type="number" min="0"
          value={item.salePrice || ''}
          onChange={e => {
            const sp = Number(e.target.value) || 0
            const newGpm = sp > 0 ? Math.round(((sp - cogs) / sp) * 1000) / 10 : 0
            onUpdate({ ...item, salePrice: sp, gpm: newGpm })
          }}
          style={{
            width: '100%', padding: '5px 8px', background: 'var(--bg)',
            border: '1px solid var(--accent)', borderRadius: 5,
            color: 'var(--text1)', fontSize: 14, fontWeight: 700,
            fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Costs */}
      <div style={{ borderTop: '1px solid var(--surface2)', paddingTop: 6 }}>
        {/* Material */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={numLabel}>Material</span>
          <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>${fmt(item.materialCost)}</span>
        </div>
        {/* Install Pay */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={numLabel}>Install Pay</span>
          <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>${fmt(item.laborCost)}</span>
        </div>
        {/* Design Fee — editable */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={numLabel}>Design Fee</span>
          <input
            type="number" min="0"
            value={item.designFee || ''}
            onChange={e => onUpdate({ ...item, designFee: Number(e.target.value) || 0 })}
            placeholder="0"
            style={{
              width: 60, padding: '2px 5px', textAlign: 'right',
              background: 'var(--bg)', border: '1px solid var(--surface2)', borderRadius: 4,
              color: 'var(--text2)', fontSize: 10, fontFamily: 'var(--font-mono)', outline: 'none',
            }}
          />
        </div>
        {/* COGS */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '4px 0', borderTop: '1px solid var(--surface2)',
        }}>
          <span style={{ ...numLabel, color: 'var(--text2)', fontWeight: 700 }}>COGS</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>${fmt(cogs)}</span>
        </div>
      </div>

      {/* GP + GPM */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={numLabel}>Gross Profit</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: gp >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
            {gp >= 0 ? '+' : ''}${fmt(gp)}
          </span>
        </div>
        <div style={{
          textAlign: 'center', padding: '7px 0',
          background: col + '15', borderRadius: 6,
        }}>
          <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>GPM</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: col, fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>
            {gpm}%
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── InlineVehicleSelector ────────────────────────────────────────────────────

function InlineVehicleSelector({
  value,
  onSelect,
}: {
  value: { year: string; make: string; model: string; sqft: number }
  onSelect: (v: { year: string; make: string; model: string; sqft: number }) => void
}) {
  const supabase = createClient()
  const [years, setYears]   = useState<string[]>([])
  const [makes, setMakes]   = useState<string[]>([])
  const [models, setModels] = useState<string[]>([])
  const [selYear,  setSelYear]  = useState(value.year)
  const [selMake,  setSelMake]  = useState(value.make)
  const [selModel, setSelModel] = useState(value.model)

  // Load years once
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

  // Fetch sqft and call onSelect when model is picked
  useEffect(() => {
    if (!selYear || !selMake || !selModel) return
    supabase
      .from('vehicle_measurements')
      .select('total_sqft')
      .eq('year', parseInt(selYear))
      .eq('make', selMake)
      .eq('model', selModel)
      .single()
      .then(({ data }) => {
        if (data) onSelect({ year: selYear, make: selMake, model: selModel, sqft: (data as { total_sqft: number }).total_sqft || 0 })
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selYear, selMake, selModel])

  const hasVehicle = value.year && value.make && value.model

  function clear() {
    setSelYear(''); setSelMake(''); setSelModel('')
    onSelect({ year: '', make: '', model: '', sqft: 0 })
  }

  return (
    <div style={{ borderTop: '1px solid var(--surface2)', paddingTop: 8, marginTop: 6 }}>
      <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
        Vehicle
      </div>
      {hasVehicle ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Car size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--text1)', fontWeight: 600, flex: 1 }}>
            {value.year} {value.make} {value.model}
          </span>
          {value.sqft > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--font-mono)', background: 'var(--surface2)', padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>
              {value.sqft} sf
            </span>
          )}
          <button onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0, flexShrink: 0 }}>
            <X size={12} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{ flex: '0 0 68px' }}>
            <select value={selYear} onChange={e => setSelYear(e.target.value)} style={selStyle}>
              <option value="">Year</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <select value={selMake} onChange={e => setSelMake(e.target.value)} disabled={!selYear} style={selStyle}>
              <option value="">Make</option>
              {makes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <select value={selModel} onChange={e => setSelModel(e.target.value)} disabled={!selMake} style={selStyle}>
              <option value="">Model</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PhotosTab ────────────────────────────────────────────────────────────────

function PhotosTab({ item, onUpdate }: { item: LineItemData; onUpdate: (updated: LineItemData) => void }) {
  const [angle, setAngle] = useState(PHOTO_ANGLES[0])
  const fileInputRef   = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  function addPhotoUrl(url: string) {
    const photo: ItemPhoto = { id: crypto.randomUUID(), url, angle, flagged: false, note: '' }
    onUpdate({ ...item, photos: [...item.photos, photo] })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { if (ev.target?.result) addPhotoUrl(ev.target.result as string) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function updatePhoto(id: string, patch: Partial<ItemPhoto>) {
    onUpdate({ ...item, photos: item.photos.map(p => p.id === id ? { ...p, ...patch } : p) })
  }

  const flaggedCount = item.photos.filter(p => p.flagged).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {flaggedCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px', background: '#f59e0b20', borderRadius: 6, fontSize: 11, color: '#f59e0b' }}>
          <AlertTriangle size={12} />
          {flaggedCount} photo{flaggedCount > 1 ? 's' : ''} flagged
        </div>
      )}

      <div>
        <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Angle</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {PHOTO_ANGLES.map(a => (
            <button key={a} onClick={() => setAngle(a)} style={{
              padding: '3px 8px', borderRadius: 20, fontSize: 10, cursor: 'pointer',
              border: `1px solid ${angle === a ? 'var(--cyan)' : 'var(--surface2)'}`,
              background: angle === a ? '#22d3ee20' : 'transparent',
              color: angle === a ? 'var(--cyan)' : 'var(--text2)',
            }}>
              {a}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
        <input ref={fileInputRef}   type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
        <button onClick={() => cameraInputRef.current?.click()} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          padding: '7px 0', borderRadius: 7, border: 'none',
          background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 11,
        }}>
          <Camera size={13} /> Take Photo
        </button>
        <button onClick={() => fileInputRef.current?.click()} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          padding: '7px 0', borderRadius: 7,
          border: '1px solid var(--surface2)', background: 'transparent',
          color: 'var(--text2)', cursor: 'pointer', fontSize: 11,
        }}>
          <Upload size={13} /> Upload
        </button>
      </div>

      {item.photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {item.photos.map(photo => (
            <div key={photo.id} style={{
              borderRadius: 7, overflow: 'hidden', position: 'relative',
              border: `1px solid ${photo.flagged ? '#f59e0b' : 'var(--surface2)'}`,
              background: 'var(--bg)',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.angle} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: '5px 6px', background: 'var(--bg)' }}>
                <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 3 }}>{photo.angle}</div>
                <input
                  value={photo.note}
                  onChange={e => updatePhoto(photo.id, { note: e.target.value })}
                  placeholder="Note..."
                  style={{ width: '100%', fontSize: 10, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text2)', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  <button onClick={() => updatePhoto(photo.id, { flagged: !photo.flagged })} style={{
                    flex: 1, padding: '3px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: photo.flagged ? '#f59e0b20' : 'var(--surface2)',
                    color: photo.flagged ? '#f59e0b' : 'var(--text3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Flag size={10} />
                  </button>
                  <button onClick={() => onUpdate({ ...item, photos: item.photos.filter(p => p.id !== photo.id) })} style={{
                    flex: 1, padding: '3px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: 'var(--surface2)', color: 'var(--red)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {item.photos.length === 0 && (
        <div style={{ padding: 16, textAlign: 'center', border: '2px dashed var(--surface2)', borderRadius: 8, color: 'var(--text3)', fontSize: 11 }}>
          No photos yet
        </div>
      )}
    </div>
  )
}

// ─── MockupTab ────────────────────────────────────────────────────────────────

function MockupTab({ item, projectId, onUpdate }: { item: LineItemData; projectId: string; onUpdate: (u: LineItemData) => void }) {
  const [stylePreset, setStylePreset] = useState(STYLE_PRESETS[0])
  const [customPrompt, setCustomPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([])
  const [error, setError] = useState('')

  async function generate() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/ai/generate-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: item.vehicleYear,
          make: item.vehicleMake || 'Commercial',
          model: item.vehicleModel || item.name,
          wrapStyle: stylePreset.wrapStyle,
          specificElements: customPrompt,
          projectId,
          itemId: item.id,
          vehicleDesc: [item.vehicleYear, item.vehicleMake, item.vehicleModel].filter(Boolean).join(' ') || item.name,
        }),
      })
      const data = await res.json() as { status: string; imageUrl?: string; predictionId?: string; error?: string }
      if (!res.ok || data.error) { setError(data.error || 'Generation failed'); return }
      if (data.status === 'succeeded' && data.imageUrl) { setGeneratedUrls(prev => [data.imageUrl!, ...prev]); return }
      if (data.predictionId) {
        const id = data.predictionId
        let attempts = 0
        while (attempts < 40) {
          await new Promise(r => setTimeout(r, 3000))
          const poll = await fetch(`/api/ai/generate-mockup?id=${id}`)
          const pd = await poll.json() as { status: string; imageUrl?: string }
          if (pd.status === 'succeeded' && pd.imageUrl) { setGeneratedUrls(prev => [pd.imageUrl!, ...prev]); break }
          if (pd.status === 'failed' || pd.status === 'canceled') { setError('Generation failed.'); break }
          attempts++
        }
        if (attempts >= 40) setError('Timed out.')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Style Preset</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {STYLE_PRESETS.map(p => (
            <button key={p.label} onClick={() => setStylePreset(p)} style={{
              padding: '3px 9px', borderRadius: 20, fontSize: 10, cursor: 'pointer',
              border: `1px solid ${stylePreset.label === p.label ? 'var(--purple)' : 'var(--surface2)'}`,
              background: stylePreset.label === p.label ? '#8b5cf620' : 'transparent',
              color: stylePreset.label === p.label ? 'var(--purple)' : 'var(--text2)',
            }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={customPrompt}
        onChange={e => setCustomPrompt(e.target.value)}
        placeholder="Custom details (colors, elements, company name...)"
        rows={2}
        style={{
          width: '100%', padding: '6px 8px', background: 'var(--bg)',
          border: '1px solid var(--surface2)', borderRadius: 6,
          color: 'var(--text1)', fontSize: 11, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
        }}
      />

      {error && (
        <div style={{ fontSize: 11, color: 'var(--red)', padding: '5px 8px', background: '#f25a5a15', borderRadius: 6 }}>{error}</div>
      )}

      <button onClick={() => { void generate() }} disabled={generating} style={{
        padding: '8px 0', borderRadius: 7, border: 'none',
        background: generating ? 'var(--surface2)' : 'var(--purple)',
        color: generating ? 'var(--text2)' : '#fff',
        cursor: generating ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <Wand2 size={13} />
        {generating ? 'Generating (30-60s)...' : 'Generate Mockup'}
      </button>

      {generatedUrls.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {generatedUrls.map((url, idx) => {
            const isSelected = item.selectedMockupUrl === url
            return (
              <div key={idx} style={{ position: 'relative', borderRadius: 7, overflow: 'hidden', border: `2px solid ${isSelected ? 'var(--green)' : 'var(--surface2)'}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Mockup ${idx + 1}`} style={{ width: '100%', display: 'block', borderRadius: 5 }} />
                {isSelected && (
                  <div style={{ position: 'absolute', top: 6, right: 6, background: 'var(--green)', borderRadius: 20, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#fff' }}>
                    <CheckCircle size={10} /> Selected
                  </div>
                )}
                <button onClick={() => onUpdate({ ...item, selectedMockupUrl: isSelected ? null : url })} style={{
                  position: 'absolute', bottom: 6, right: 6,
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: isSelected ? '#22c07a30' : 'var(--accent)',
                  color: isSelected ? 'var(--green)' : '#fff', fontSize: 11,
                }}>
                  {isSelected ? 'Deselect' : 'Select'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── DesignTab ────────────────────────────────────────────────────────────────

function DesignTab({ item, projectId, onUpdate }: { item: LineItemData; projectId: string; onUpdate: (u: LineItemData) => void }) {
  const statusCfg = DESIGN_STATUSES.find(s => s.value === item.designStatus) ?? DESIGN_STATUSES[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Design Status</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {DESIGN_STATUSES.map(s => (
            <button key={s.value} onClick={() => onUpdate({ ...item, designStatus: s.value })} style={{
              flex: 1, padding: '5px 3px', borderRadius: 20, fontSize: 10, cursor: 'pointer',
              border: `1px solid ${item.designStatus === s.value ? s.color : 'var(--surface2)'}`,
              background: item.designStatus === s.value ? s.color + '20' : 'transparent',
              color: item.designStatus === s.value ? s.color : 'var(--text2)',
            }}>
              {s.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 6, padding: '4px 8px', borderRadius: 5, fontSize: 11, background: statusCfg.color + '15', color: statusCfg.color }}>
          {statusCfg.label}
        </div>
      </div>

      {item.selectedMockupUrl && (
        <div>
          <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Selected Mockup</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.selectedMockupUrl} alt="Mockup" style={{ width: '100%', borderRadius: 7, border: '2px solid var(--green)', display: 'block' }} />
        </div>
      )}

      <div>
        <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Design Notes</div>
        <textarea
          value={item.designNotes}
          onChange={e => onUpdate({ ...item, designNotes: e.target.value })}
          placeholder="Notes for design team..."
          rows={3}
          style={{
            width: '100%', padding: '6px 8px', background: 'var(--bg)',
            border: '1px solid var(--surface2)', borderRadius: 6,
            color: 'var(--text1)', fontSize: 11, outline: 'none',
            resize: 'vertical', boxSizing: 'border-box',
          }}
        />
      </div>

      <a href={`/design/${projectId}/${item.id}`} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '8px 0', borderRadius: 7,
        border: '1px solid var(--accent)', background: '#4f7fff15',
        color: 'var(--accent)', fontSize: 12, fontWeight: 600, textDecoration: 'none',
      }}>
        <ExternalLink size={13} />
        Open Design Studio
      </a>
    </div>
  )
}

// ─── LineItemEditor ───────────────────────────────────────────────────────────

export function LineItemEditor({
  item,
  index,
  projectId,
  surveyVehicles = [],
  onUpdate,
  onRemove,
}: {
  item: LineItemData
  index: number
  projectId: string
  surveyVehicles?: SurveyVehicle[]
  onUpdate: (updated: LineItemData) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<ItemTab>('calculator')
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(item.name)
  const [calcKey, setCalcKey] = useState(0)

  // Suppress unused var warning for surveyVehicles — kept for API compat
  void surveyVehicles

  const flaggedPhotos = item.photos.filter(p => p.flagged).length
  const typeBadge     = JOB_TYPES.find(t => t.value === item.type)?.badge ?? 'WRAP'
  const vehicleDesc   = [item.vehicleYear, item.vehicleMake, item.vehicleModel].filter(Boolean).join(' ')

  function handleCalcResult(r: CalcResult) {
    // Keep user's manually set sale price if it differs from calculator suggestion
    onUpdate({
      ...item,
      materialCost: r.materialCost,
      laborCost: r.laborCost,
      salePrice: item.salePrice > 0 ? item.salePrice : r.salePrice,
      gpm: item.salePrice > 0
        ? (item.salePrice > 0 ? Math.round(((item.salePrice - r.materialCost - r.laborCost - item.designFee) / item.salePrice) * 1000) / 10 : 0)
        : r.gpm,
    })
  }

  const tabs: { id: ItemTab; label: string; badge?: number }[] = [
    { id: 'calculator', label: 'Calc' },
    { id: 'photos',     label: 'Photos', badge: flaggedPhotos > 0 ? flaggedPhotos : undefined },
    { id: 'mockup',     label: 'Mockup', badge: item.selectedMockupUrl ? 1 : undefined },
    { id: 'design',     label: 'Design' },
  ]

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--surface2)',
      borderRadius: 8, overflow: 'hidden',
    }}>
      {/* ─── Collapsed / Header Row ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px',
        borderBottom: expanded ? '1px solid var(--surface2)' : 'none',
        minWidth: 0,
      }}>
        {/* Drag handle */}
        <GripVertical size={13} color="var(--text3)" style={{ flexShrink: 0, cursor: 'grab' }} />

        {/* Index */}
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: 'var(--surface2)',
          color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 600, flexShrink: 0,
        }}>
          {index + 1}
        </div>

        {/* Type badge */}
        <span style={{
          fontSize: 8, padding: '2px 5px', borderRadius: 3,
          background: '#4f7fff15', color: 'var(--accent)',
          fontWeight: 700, letterSpacing: '0.04em', flexShrink: 0,
        }}>
          {typeBadge}
        </span>

        {/* Name */}
        {editingName ? (
          <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 3 }} onClick={e => e.stopPropagation()}>
            <input
              autoFocus value={draftName}
              onChange={e => setDraftName(e.target.value)}
              style={{
                flex: 1, minWidth: 0, padding: '2px 6px', background: 'var(--bg)',
                border: '1px solid var(--accent)', borderRadius: 4,
                color: 'var(--text1)', fontSize: 12, outline: 'none',
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') { onUpdate({ ...item, name: draftName }); setEditingName(false) }
                if (e.key === 'Escape') { setDraftName(item.name); setEditingName(false) }
              }}
            />
            <button onClick={() => { onUpdate({ ...item, name: draftName }); setEditingName(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', padding: 0 }}>
              <Check size={12} />
            </button>
            <button onClick={() => { setDraftName(item.name); setEditingName(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0 }}>
              <X size={12} />
            </button>
          </div>
        ) : (
          <span
            onClick={e => { e.stopPropagation(); setEditingName(true) }}
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', cursor: 'text', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {item.name}
            <Edit2 size={10} color="var(--text3)" />
          </span>
        )}

        {/* Vehicle desc */}
        {vehicleDesc && (
          <span style={{
            fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', minWidth: 0, maxWidth: 160,
          }}>
            {vehicleDesc}
          </span>
        )}

        {/* Sqft */}
        {item.vehicleSqft > 0 && (
          <span style={{
            fontSize: 9, color: 'var(--text2)', fontFamily: 'var(--font-mono)',
            background: 'var(--surface2)', padding: '1px 5px', borderRadius: 3, flexShrink: 0,
          }}>
            {item.vehicleSqft} sf
          </span>
        )}

        <div style={{ flex: 1 }} />

        {/* Sale price */}
        {item.salePrice > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
            ${fmt(item.salePrice)}
          </span>
        )}

        {/* GPM badge */}
        {item.gpm > 0 && (
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 20,
            background: gpmColor(item.gpm) + '20', color: gpmColor(item.gpm),
            fontFamily: 'var(--font-mono)', fontWeight: 600, flexShrink: 0,
          }}>
            {item.gpm}%
          </span>
        )}

        {/* Remove */}
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 2, flexShrink: 0 }}
        >
          <Trash2 size={12} />
        </button>

        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(x => !x)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, flexShrink: 0 }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* ─── Expanded Content ───────────────────────────────────────────────── */}
      {expanded && (
        <div>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--surface2)' }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  flex: 1, padding: '7px 0', border: 'none', cursor: 'pointer', fontSize: 11,
                  background: activeTab === t.id ? 'var(--bg)' : 'transparent',
                  color: activeTab === t.id ? 'var(--accent)' : 'var(--text2)',
                  borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                  fontWeight: activeTab === t.id ? 600 : 400,
                  position: 'relative',
                }}
              >
                {t.label}
                {t.badge !== undefined && (
                  <span style={{
                    position: 'absolute', top: 4, right: 6,
                    background: t.id === 'mockup' ? 'var(--green)' : '#f59e0b',
                    color: '#fff', borderRadius: 20,
                    width: 13, height: 13, fontSize: 8, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: 12 }}>
            {activeTab === 'calculator' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Type selector */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {JOB_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => onUpdate({ ...item, type: t.value })}
                      style={{
                        padding: '3px 9px', borderRadius: 20, fontSize: 10, cursor: 'pointer',
                        border: `1px solid ${item.type === t.value ? 'var(--accent)' : 'var(--surface2)'}`,
                        background: item.type === t.value ? '#4f7fff20' : 'transparent',
                        color: item.type === t.value ? 'var(--accent)' : 'var(--text2)',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Two-column: Calculator (left) + Numbers (right) */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ flex: '1 1 60%', minWidth: 0 }}>
                    <CompactCalculator
                      key={calcKey}
                      type={item.type}
                      targetGpm={75}
                      hideResult
                      onResult={handleCalcResult}
                      initialSqft={item.vehicleSqft}
                    />
                  </div>
                  <div style={{ flex: '0 0 190px', maxWidth: 210 }}>
                    <NumbersPanel item={item} onUpdate={onUpdate} />
                  </div>
                </div>

                {/* Vehicle selector — bottom of calculator tab */}
                <InlineVehicleSelector
                  value={{ year: item.vehicleYear, make: item.vehicleMake, model: item.vehicleModel, sqft: item.vehicleSqft }}
                  onSelect={v => {
                    setCalcKey(k => k + 1)
                    onUpdate({ ...item, vehicleYear: v.year, vehicleMake: v.make, vehicleModel: v.model, vehicleSqft: v.sqft })
                  }}
                />
              </div>
            )}
            {activeTab === 'photos' && <PhotosTab item={item} onUpdate={onUpdate} />}
            {activeTab === 'mockup' && <MockupTab item={item} projectId={projectId} onUpdate={onUpdate} />}
            {activeTab === 'design' && <DesignTab item={item} projectId={projectId} onUpdate={onUpdate} />}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── LineItemsList ────────────────────────────────────────────────────────────

export function LineItemsList({
  projectId,
  targetGpm = 75,
  surveyVehicles = [],
}: {
  projectId: string
  targetGpm?: number
  surveyVehicles?: SurveyVehicle[]
}) {
  const [items, setItems] = useState<LineItemData[]>([newItem('commercial')])

  const updateItem = useCallback((id: string, updated: LineItemData) => {
    setItems(prev => prev.map(x => x.id === id ? updated : x))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(x => x.id !== id))
  }, [])

  function addItem(type: CalcType) {
    setItems(prev => [...prev, newItem(type)])
  }

  const totalRevenue = items.reduce((acc, x) => acc + x.salePrice, 0)
  const totalCogs    = items.reduce((acc, x) => acc + x.materialCost + x.laborCost + x.designFee, 0)
  const blendedGpm   = totalRevenue > 0 ? Math.round(((totalRevenue - totalCogs) / totalRevenue) * 100 * 10) / 10 : 0

  void targetGpm

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, idx) => (
        <LineItemEditor
          key={item.id}
          item={item}
          index={idx}
          projectId={projectId}
          surveyVehicles={surveyVehicles}
          onUpdate={updated => updateItem(item.id, updated)}
          onRemove={() => removeItem(item.id)}
        />
      ))}

      {/* Add buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {JOB_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => addItem(t.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 6,
              border: '1px solid var(--surface2)', background: 'transparent',
              color: 'var(--text2)', cursor: 'pointer', fontSize: 11,
            }}
          >
            <Plus size={11} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Totals row */}
      {items.length > 1 && totalRevenue > 0 && (
        <div style={{
          padding: '10px 14px', borderRadius: 7, background: 'var(--bg)',
          border: '1px solid var(--surface2)', display: 'flex', gap: 16, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Revenue</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', fontFamily: 'var(--font-mono)' }}>${fmt(totalRevenue)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total COGS</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>${fmt(totalCogs)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Blended GPM</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: gpmColor(blendedGpm), fontFamily: 'var(--font-mono)' }}>{blendedGpm}%</div>
          </div>
        </div>
      )}
    </div>
  )
}
