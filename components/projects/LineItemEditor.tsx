'use client'

import React, { useState, useCallback, useRef } from 'react'
import {
  GripVertical, ChevronDown, ChevronRight, Edit2, Check, X,
  Camera, Upload, Flag, AlertTriangle, CheckCircle, Trash2,
  Wand2, ExternalLink, Plus,
} from 'lucide-react'
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
  gpm: number
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

const JOB_TYPES: { value: CalcType; label: string }[] = [
  { value: 'commercial', label: 'Commercial Wrap' },
  { value: 'box_truck',  label: 'Box Truck' },
  { value: 'trailer',    label: 'Trailer' },
  { value: 'marine',     label: 'Marine' },
  { value: 'ppf',        label: 'PPF' },
]

const PHOTO_ANGLES = [
  'Front 3/4', 'Rear 3/4', 'Driver Side', 'Pass Side',
  'Hood Close', 'Roof', 'Door Jamb', 'Bumper Detail',
]

const STYLE_PRESETS = [
  { label: 'Professional',   wrapStyle: 'Company Branding / Logo' },
  { label: 'Bold Graphics',  wrapStyle: 'Bold & Aggressive' },
  { label: 'Minimal',        wrapStyle: 'Minimalist / Clean' },
  { label: 'Racing',         wrapStyle: 'Racing / Sport Stripes' },
  { label: 'Matte',          wrapStyle: 'Full Color Change' },
  { label: 'Chrome',         wrapStyle: 'Gradient / Color Fade' },
]

const DESIGN_STATUSES: { value: DesignStatus; label: string; color: string }[] = [
  { value: 'not_started', label: 'Not Started', color: 'var(--text3)' },
  { value: 'in_progress', label: 'In Progress',  color: '#f59e0b' },
  { value: 'proof_sent',  label: 'Proof Sent',   color: 'var(--cyan)' },
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
    salePrice: 0, materialCost: 0, laborCost: 0, gpm: 0,
    linkedVehicleIds: [], photos: [],
    selectedMockupUrl: null, designStatus: 'not_started', designNotes: '',
  }
}

// ─── PhotosTab ────────────────────────────────────────────────────────────────

function PhotosTab({
  item,
  onUpdate,
}: {
  item: LineItemData
  onUpdate: (updated: LineItemData) => void
}) {
  const [angle, setAngle] = useState(PHOTO_ANGLES[0])
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  function removePhoto(id: string) {
    onUpdate({ ...item, photos: item.photos.filter(p => p.id !== id) })
  }

  const flaggedCount = item.photos.filter(p => p.flagged).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {flaggedCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#f59e0b20', borderRadius: 8, fontSize: 12, color: '#f59e0b' }}>
          <AlertTriangle size={13} />
          {flaggedCount} photo{flaggedCount > 1 ? 's' : ''} flagged for review
        </div>
      )}

      {/* Angle selector */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Angle</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {PHOTO_ANGLES.map(a => (
            <button
              key={a}
              onClick={() => setAngle(a)}
              style={{
                padding: '5px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                border: `1px solid ${angle === a ? 'var(--cyan)' : 'var(--surface2)'}`,
                background: angle === a ? '#22d3ee20' : 'transparent',
                color: angle === a ? 'var(--cyan)' : 'var(--text2)',
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Upload buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
        <button
          onClick={() => cameraInputRef.current?.click()}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '9px 0', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 12,
          }}
        >
          <Camera size={14} />
          Take Photo
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '9px 0', borderRadius: 8,
            border: '1px solid var(--surface2)', background: 'transparent',
            color: 'var(--text2)', cursor: 'pointer', fontSize: 12,
          }}
        >
          <Upload size={14} />
          Upload
        </button>
      </div>

      {/* Photo grid */}
      {item.photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {item.photos.map(photo => (
            <div
              key={photo.id}
              style={{
                borderRadius: 8, overflow: 'hidden', position: 'relative',
                border: `1px solid ${photo.flagged ? '#f59e0b' : 'var(--surface2)'}`,
                background: 'var(--bg)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.angle} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: '6px 8px', background: 'var(--bg)' }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>{photo.angle}</div>
                <input
                  value={photo.note}
                  onChange={e => updatePhoto(photo.id, { note: e.target.value })}
                  placeholder="Note..."
                  style={{
                    width: '100%', fontSize: 11, background: 'transparent',
                    border: 'none', outline: 'none', color: 'var(--text2)',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                  <button
                    onClick={() => updatePhoto(photo.id, { flagged: !photo.flagged })}
                    style={{
                      flex: 1, padding: '4px 0', borderRadius: 5, border: 'none', cursor: 'pointer',
                      background: photo.flagged ? '#f59e0b20' : 'var(--surface2)',
                      color: photo.flagged ? '#f59e0b' : 'var(--text3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Flag size={11} />
                  </button>
                  <button
                    onClick={() => removePhoto(photo.id)}
                    style={{
                      flex: 1, padding: '4px 0', borderRadius: 5, border: 'none', cursor: 'pointer',
                      background: 'var(--surface2)', color: 'var(--red)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {item.photos.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', border: '2px dashed var(--surface2)', borderRadius: 10, color: 'var(--text3)', fontSize: 12 }}>
          No photos yet. Use the buttons above to take or upload photos.
        </div>
      )}
    </div>
  )
}

// ─── MockupTab ────────────────────────────────────────────────────────────────

function MockupTab({
  item,
  projectId,
  onUpdate,
}: {
  item: LineItemData
  projectId: string
  onUpdate: (updated: LineItemData) => void
}) {
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
          year: '',
          make: 'Commercial',
          model: item.name,
          wrapStyle: stylePreset.wrapStyle,
          specificElements: customPrompt,
          projectId,
          itemId: item.id,
          vehicleDesc: item.name,
        }),
      })
      const data = await res.json() as { status: string; imageUrl?: string; predictionId?: string; error?: string }

      if (!res.ok || data.error) {
        setError(data.error || 'Generation failed')
        return
      }

      if (data.status === 'succeeded' && data.imageUrl) {
        setGeneratedUrls(prev => [data.imageUrl!, ...prev])
        return
      }

      // Poll for async prediction
      if (data.predictionId) {
        const id = data.predictionId
        let attempts = 0
        while (attempts < 40) {
          await new Promise(r => setTimeout(r, 3000))
          const poll = await fetch(`/api/ai/generate-mockup?id=${id}`)
          const pollData = await poll.json() as { status: string; imageUrl?: string }
          if (pollData.status === 'succeeded' && pollData.imageUrl) {
            setGeneratedUrls(prev => [pollData.imageUrl!, ...prev])
            break
          }
          if (pollData.status === 'failed' || pollData.status === 'canceled') {
            setError('Generation failed. Please try again.')
            break
          }
          attempts++
        }
        if (attempts >= 40) setError('Timed out. Please try again.')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Style presets */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Style Preset</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {STYLE_PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => setStylePreset(p)}
              style={{
                padding: '5px 11px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${stylePreset.label === p.label ? 'var(--purple)' : 'var(--surface2)'}`,
                background: stylePreset.label === p.label ? '#8b5cf620' : 'transparent',
                color: stylePreset.label === p.label ? 'var(--purple)' : 'var(--text2)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom prompt */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Custom Details (optional)</div>
        <textarea
          value={customPrompt}
          onChange={e => setCustomPrompt(e.target.value)}
          placeholder="e.g. company name, colors, specific graphic elements..."
          rows={2}
          style={{
            width: '100%', padding: '8px 10px', background: 'var(--bg)',
            border: '1px solid var(--surface2)', borderRadius: 7,
            color: 'var(--text1)', fontSize: 12, outline: 'none',
            resize: 'vertical', boxSizing: 'border-box',
          }}
        />
      </div>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--red)', padding: '6px 10px', background: '#f25a5a15', borderRadius: 7 }}>
          {error}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={() => { void generate() }}
        disabled={generating}
        style={{
          padding: '10px 0', borderRadius: 8, border: 'none',
          background: generating ? 'var(--surface2)' : 'var(--purple)',
          color: generating ? 'var(--text2)' : '#fff',
          cursor: generating ? 'not-allowed' : 'pointer',
          fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}
      >
        <Wand2 size={14} />
        {generating ? 'Generating (30-60s)...' : 'Generate Mockup'}
      </button>

      {/* Generated images */}
      {generatedUrls.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Generated Mockups</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {generatedUrls.map((url, idx) => {
              const isSelected = item.selectedMockupUrl === url
              return (
                <div
                  key={idx}
                  style={{
                    position: 'relative', borderRadius: 8, overflow: 'hidden',
                    border: `2px solid ${isSelected ? 'var(--green)' : 'var(--surface2)'}`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Mockup ${idx + 1}`} style={{ width: '100%', display: 'block', borderRadius: 6 }} />
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'var(--green)', borderRadius: 20, padding: '2px 8px',
                      display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#fff',
                    }}>
                      <CheckCircle size={11} />
                      Selected
                    </div>
                  )}
                  <button
                    onClick={() => onUpdate({ ...item, selectedMockupUrl: isSelected ? null : url })}
                    style={{
                      position: 'absolute', bottom: 8, right: 8,
                      padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                      background: isSelected ? '#22c07a30' : 'var(--accent)',
                      color: isSelected ? 'var(--green)' : '#fff', fontSize: 12,
                    }}
                  >
                    {isSelected ? 'Deselect' : 'Select'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── DesignTab ────────────────────────────────────────────────────────────────

function DesignTab({
  item,
  projectId,
  onUpdate,
}: {
  item: LineItemData
  projectId: string
  onUpdate: (updated: LineItemData) => void
}) {
  const statusCfg = DESIGN_STATUSES.find(s => s.value === item.designStatus) ?? DESIGN_STATUSES[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Status */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Design Status</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {DESIGN_STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => onUpdate({ ...item, designStatus: s.value })}
              style={{
                flex: 1, padding: '7px 4px', borderRadius: 7, fontSize: 11, cursor: 'pointer',
                border: `1px solid ${item.designStatus === s.value ? s.color : 'var(--surface2)'}`,
                background: item.designStatus === s.value ? s.color + '20' : 'transparent',
                color: item.designStatus === s.value ? s.color : 'var(--text2)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div style={{
          marginTop: 8, padding: '6px 10px', borderRadius: 7, fontSize: 12,
          background: statusCfg.color + '15', color: statusCfg.color,
        }}>
          Status: {statusCfg.label}
        </div>
      </div>

      {/* Selected mockup preview */}
      {item.selectedMockupUrl && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Selected Mockup</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.selectedMockupUrl}
            alt="Selected mockup"
            style={{ width: '100%', borderRadius: 8, border: '2px solid var(--green)', display: 'block' }}
          />
        </div>
      )}

      {/* Design notes */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Design Notes</div>
        <textarea
          value={item.designNotes}
          onChange={e => onUpdate({ ...item, designNotes: e.target.value })}
          placeholder="Notes for the design team..."
          rows={3}
          style={{
            width: '100%', padding: '8px 10px', background: 'var(--bg)',
            border: '1px solid var(--surface2)', borderRadius: 7,
            color: 'var(--text1)', fontSize: 12, outline: 'none',
            resize: 'vertical', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Open Design Studio */}
      <a
        href={`/design/${projectId}/${item.id}`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          padding: '10px 0', borderRadius: 8,
          border: '1px solid var(--accent)', background: '#4f7fff15',
          color: 'var(--accent)', fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}
      >
        <ExternalLink size={14} />
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
  const [expanded, setExpanded] = useState(true)
  const [activeTab, setActiveTab] = useState<ItemTab>('calculator')
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(item.name)

  const flaggedPhotos = item.photos.filter(p => p.flagged).length

  function handleCalcResult(r: CalcResult) {
    onUpdate({
      ...item,
      salePrice: r.salePrice,
      materialCost: r.materialCost,
      laborCost: r.laborCost,
      gpm: r.gpm,
    })
  }

  const tabs: { id: ItemTab; label: string; badge?: number }[] = [
    { id: 'calculator', label: 'Calculator' },
    { id: 'photos',     label: 'Photos',  badge: flaggedPhotos > 0 ? flaggedPhotos : undefined },
    { id: 'mockup',     label: 'Mockup',  badge: item.selectedMockupUrl ? 1 : undefined },
    { id: 'design',     label: 'Design' },
  ]

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--surface2)',
      borderRadius: 10, overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        borderBottom: expanded ? '1px solid var(--surface2)' : 'none',
        cursor: 'pointer',
      }}>
        {/* Drag handle */}
        <GripVertical size={16} color="var(--text3)" style={{ flexShrink: 0, cursor: 'grab' }} />

        {/* Index */}
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--surface2)', color: 'var(--text3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600, flexShrink: 0,
        }}>
          {index + 1}
        </div>

        {/* Type selector */}
        <select
          value={item.type}
          onChange={e => onUpdate({ ...item, type: e.target.value as CalcType })}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--bg)', border: '1px solid var(--surface2)',
            borderRadius: 6, padding: '4px 8px', fontSize: 11,
            color: 'var(--text2)', cursor: 'pointer', outline: 'none',
          }}
        >
          {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        {/* Name */}
        {editingName ? (
          <div style={{ flex: 1, display: 'flex', gap: 5 }} onClick={e => e.stopPropagation()}>
            <input
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              autoFocus
              style={{
                flex: 1, padding: '4px 8px', background: 'var(--bg)',
                border: '1px solid var(--accent)', borderRadius: 6,
                color: 'var(--text1)', fontSize: 13, outline: 'none',
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') { onUpdate({ ...item, name: draftName }); setEditingName(false) }
                if (e.key === 'Escape') { setDraftName(item.name); setEditingName(false) }
              }}
            />
            <button onClick={() => { onUpdate({ ...item, name: draftName }); setEditingName(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)' }}>
              <Check size={14} />
            </button>
            <button onClick={() => { setDraftName(item.name); setEditingName(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <div
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, cursor: 'text' }}
            onClick={e => { e.stopPropagation(); setEditingName(true) }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{item.name}</span>
            <Edit2 size={12} color="var(--text3)" />
          </div>
        )}

        {/* Financial summary */}
        {item.salePrice > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', fontFamily: 'var(--font-mono)' }}>
              ${fmt(item.salePrice)}
            </span>
            <span style={{
              padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: `${gpmColor(item.gpm)}20`,
              color: gpmColor(item.gpm),
              fontFamily: 'var(--font-mono)',
            }}>
              {item.gpm}%
            </span>
          </div>
        )}

        {/* Linked vehicles */}
        {item.linkedVehicleIds.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
            {item.linkedVehicleIds.length}v
          </span>
        )}

        {/* Remove */}
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 2, flexShrink: 0 }}
        >
          <Trash2 size={14} />
        </button>

        {/* Expand/collapse */}
        <button
          onClick={() => setExpanded(x => !x)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, flexShrink: 0 }}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {expanded && (
        <div>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--surface2)' }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer', fontSize: 12,
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
                    position: 'absolute', top: 5, right: 8,
                    background: t.id === 'mockup' ? 'var(--green)' : '#f59e0b',
                    color: '#fff', borderRadius: 20,
                    width: 14, height: 14, fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: 14 }}>
            {activeTab === 'calculator' && (
              <>
                {/* Vehicle assignment */}
                {surveyVehicles.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                      Linked Vehicles
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {surveyVehicles.map(v => {
                        const active = item.linkedVehicleIds.includes(v.id)
                        return (
                          <button
                            key={v.id}
                            onClick={() => onUpdate({
                              ...item,
                              linkedVehicleIds: active
                                ? item.linkedVehicleIds.filter(x => x !== v.id)
                                : [...item.linkedVehicleIds, v.id],
                            })}
                            style={{
                              padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                              border: `1px solid ${active ? 'var(--accent)' : 'var(--surface2)'}`,
                              background: active ? '#4f7fff20' : 'transparent',
                              color: active ? 'var(--accent)' : 'var(--text2)',
                            }}
                          >
                            {[v.year, v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <CompactCalculator
                  type={item.type}
                  targetGpm={75}
                  onResult={handleCalcResult}
                />
              </>
            )}
            {activeTab === 'photos' && (
              <PhotosTab item={item} onUpdate={onUpdate} />
            )}
            {activeTab === 'mockup' && (
              <MockupTab item={item} projectId={projectId} onUpdate={onUpdate} />
            )}
            {activeTab === 'design' && (
              <DesignTab item={item} projectId={projectId} onUpdate={onUpdate} />
            )}
          </div>

          {/* Bottom summary bar */}
          {item.salePrice > 0 && (
            <div style={{
              padding: '8px 14px',
              borderTop: '1px solid var(--surface2)',
              display: 'flex', gap: 16, background: 'var(--bg)',
            }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>Sale</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', fontFamily: 'var(--font-mono)' }}>${fmt(item.salePrice)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>Material</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>${fmt(item.materialCost)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>Labor</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>${fmt(item.laborCost)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>GPM</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: gpmColor(item.gpm), fontFamily: 'var(--font-mono)' }}>{item.gpm}%</div>
              </div>
            </div>
          )}
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
  const totalCogs    = items.reduce((acc, x) => acc + x.materialCost + x.laborCost, 0)
  const blendedGpm   = totalRevenue > 0 ? Math.round(((totalRevenue - totalCogs) / totalRevenue) * 100 * 10) / 10 : 0

  // Suppress targetGpm warning — passed through to CompactCalculator indirectly
  void targetGpm

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {JOB_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => addItem(t.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 7,
              border: '1px solid var(--surface2)', background: 'transparent',
              color: 'var(--text2)', cursor: 'pointer', fontSize: 12,
            }}
          >
            <Plus size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Totals row */}
      {items.length > 1 && totalRevenue > 0 && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, background: 'var(--bg)',
          border: '1px solid var(--surface2)',
          display: 'flex', gap: 20, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>Total Revenue</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', fontFamily: 'var(--font-mono)' }}>${fmt(totalRevenue)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>Total COGS</div>
            <div style={{ fontSize: 14, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>${fmt(totalCogs)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>Blended GPM</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: gpmColor(blendedGpm), fontFamily: 'var(--font-mono)' }}>{blendedGpm}%</div>
          </div>
        </div>
      )}
    </div>
  )
}
