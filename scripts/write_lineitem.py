#!/usr/bin/env python3
"""Writes the redesigned LineItemEnhanced.tsx"""
import os

TARGET = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                      'components', 'estimates', 'LineItemEnhanced.tsx')

CONTENT = r"""'use client'

import { useState, useEffect } from 'react'
import {
  ChevronDown,
  Image as ImageIcon,
  Camera,
  Trash2,
  GripVertical,
  Ruler,
  AlertTriangle,
  CheckCircle,
  Plus,
  X,
  Layers,
} from 'lucide-react'
import VehicleLookupModal from '@/components/VehicleLookupModal'
import type { MeasurementResult } from '@/components/VehicleMeasurementPicker'
import PhotoInspection from './PhotoInspection'
import { createClient } from '@/lib/supabase/client'

interface VinylRoll {
  id: string
  name: string
  brand: string | null
  color: string | null
  finish: string | null
  width_in: number | null
  sqft_available: number | null
  cost_per_sqft: number | null
  cost_per_foot: number | null
  status: string
}

interface LineItemEnhancedProps {
  item: any
  index: number
  onUpdate: (index: number, updates: any) => void
  onDelete: (index: number) => void
  allItems: any[]
  orgId?: string
  projectId?: string
}

const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const ISSUE_FLAGS = [
  { key: 'clean',  label: 'Clean',          color: 'var(--green)' },
  { key: 'rust',   label: 'Rust/Damage',    color: 'var(--red)'   },
  { key: 'curves', label: 'Complex Curves', color: 'var(--amber)' },
  { key: 'rivets', label: 'Rivets/Screws',  color: 'var(--amber)' },
]

export default function LineItemEnhanced({
  item, index, onUpdate, onDelete, allItems, orgId, projectId,
}: LineItemEnhancedProps) {
  const [collapsed, setCollapsed] = useState(item.collapsed !== false)
  const [showPhotoInspection, setShowPhotoInspection] = useState(false)
  const [showMeasurementModal, setShowMeasurementModal] = useState(false)
  const [showMockupInput, setShowMockupInput] = useState(false)
  const [mockupInputVal, setMockupInputVal] = useState(item.mockupUrl || '')
  const [vinylRolls, setVinylRolls] = useState<VinylRoll[]>([])
  const [loadingRolls, setLoadingRolls] = useState(false)
  const [showAddRoll, setShowAddRoll] = useState(false)
  const [newRoll, setNewRoll] = useState({ brand: '', color: '', finish: '', width_in: 54, length_ft: 150, cost_per_foot: 0 })
  const [projectPhotos, setProjectPhotos] = useState<{ id: string; url: string; name: string }[]>([])
  const [showPhotosPicker, setShowPhotosPicker] = useState(false)

  const handleToggleCollapsed = () => {
    setCollapsed(!collapsed)
    onUpdate(index, { collapsed: !collapsed })
  }

  const parentItems = allItems
    .map((itm, idx) => ({ ...itm, index: idx }))
    .filter((itm) => itm.index !== index && !itm.rollupTo)

  useEffect(() => {
    if (!orgId) return
    setLoadingRolls(true)
    fetch(`/api/inventory/vinyl?org_id=${orgId}`)
      .then(r => r.json())
      .then((d: any) => { if (d.rolls) setVinylRolls(d.rolls) })
      .catch(() => {})
      .finally(() => setLoadingRolls(false))
  }, [orgId])

  useEffect(() => {
    if (!projectId || !showPhotosPicker) return
    const supabase = createClient()
    supabase
      .from('files')
      .select('id, bucket_path, file_name')
      .eq('project_id', projectId)
      .in('file_type', ['photo', 'reference'])
      .then(({ data }: any) => {
        if (data) {
          setProjectPhotos(data.map((f: any) => ({
            id: f.id,
            name: f.file_name,
            url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/project-files/${f.bucket_path}`,
          })))
        }
      })
  }, [projectId, showPhotosPicker])

  const handleRollSelect = (rollId: string) => {
    const roll = vinylRolls.find(r => r.id === rollId)
    if (roll) {
      onUpdate(index, { materialRollId: roll.id, materialName: roll.name, materialCostPerSqft: roll.cost_per_sqft || 0 })
    } else {
      onUpdate(index, { materialRollId: '', materialName: '', materialCostPerSqft: 0 })
    }
  }

  const handleAddRoll = async () => {
    if (!orgId || !newRoll.brand) return
    const supabase = createClient()
    const { data, error } = await supabase.from('vinyl_inventory').insert({
      org_id: orgId, brand: newRoll.brand, color: newRoll.color, finish: newRoll.finish,
      width_inches: newRoll.width_in, length_ft: newRoll.length_ft,
      cost_per_foot: newRoll.cost_per_foot, status: 'in_stock',
    }).select().single()
    if (!error && data) {
      fetch(`/api/inventory/vinyl?org_id=${orgId}`)
        .then(r => r.json())
        .then((d: any) => { if (d.rolls) setVinylRolls(d.rolls) })
      setShowAddRoll(false)
      setNewRoll({ brand: '', color: '', finish: '', width_in: 54, length_ft: 150, cost_per_foot: 0 })
    }
  }

  const estimatedHours = item.specs?.estimatedHours || item.estimatedHours || 0
  const daysNeeded = estimatedHours > 0 ? Math.ceil(estimatedHours / 8) + 1 : null
  const sqft = item.sqftOverride || item.sqft || item.specs?.vinylArea || 0
  const matCostPerSqft = item.materialCostPerSqft || 0
  const waste = item.specs?.wasteBuffer || 10
  const matCostCalc = sqft > 0 && matCostPerSqft > 0
    ? Math.round(sqft * (1 + waste / 100) * matCostPerSqft * 100) / 100
    : null
  const issueFlags: string[] = item.issueFlags || []
  const hasIssues = item.vehicleNotes || item.cantWrapNotes || issueFlags.some((f: string) => f !== 'clean')
  const attachedPhotos: string[] = item.attachedPhotos || []

  // ─── COLLAPSED ─────────────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <div className="card p-3 mb-3 cursor-pointer" onClick={handleToggleCollapsed}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GripVertical size={14} className="text-text3 shrink-0 cursor-grab" />
            <span className="text-sm font-700 text-text1 truncate">{item.product || 'Line Item'}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-sm font-700 text-text1">{fmtC(item.total || 0)}</div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(index) }} className="p-1 hover:bg-red/10 rounded text-red">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        {(item.vehicle || sqft > 0 || estimatedHours > 0) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', paddingLeft: 22, fontSize: 11, color: 'var(--text3)' }}>
            {item.vehicle && <span style={{ color: 'var(--text2)' }}>{item.vehicle}</span>}
            {sqft > 0 && <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan)' }}>{sqft} sqft</span>}
            {estimatedHours > 0 && <span>{estimatedHours}h est</span>}
            {daysNeeded && <span style={{ color: 'var(--accent)' }}>{daysNeeded}d needed</span>}
          </div>
        )}
        {(hasIssues || attachedPhotos.length > 0 || item.mockupUrl) && (
          <div style={{ display: 'flex', gap: 5, marginTop: 3, paddingLeft: 22, flexWrap: 'wrap' }}>
            {hasIssues && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 5, background: 'rgba(245,158,11,0.1)', color: 'var(--amber)', border: '1px solid rgba(245,158,11,0.2)' }}>Issues</span>}
            {attachedPhotos.length > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 5, background: 'rgba(79,127,255,0.1)', color: 'var(--accent)', border: '1px solid rgba(79,127,255,0.2)' }}>{attachedPhotos.length} photos</span>}
            {item.mockupUrl && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 5, background: 'rgba(139,92,246,0.1)', color: 'var(--purple)', border: '1px solid rgba(139,92,246,0.2)' }}>Mockup</span>}
          </div>
        )}
      </div>
    )
  }

  // ─── EXPANDED ──────────────────────────────────────────────────────────────
  return (
    <div className="card p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={handleToggleCollapsed} className="p-1 hover:bg-surface2 rounded"><ChevronDown size={15} /></button>
          <GripVertical size={14} className="text-text3 cursor-grab" />
          <span className="text-xs font-700 text-text2">Item {index + 1}</span>
        </div>
        <button onClick={() => onDelete(index)} className="btn-secondary text-xs text-red"><Trash2 size={12} /> Delete</button>
      </div>

      {/* SECTION 1 — Vehicle Issues (TOP) */}
      <div style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8, padding: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 8 }}>
          Vehicle Issues / Wrap Notes
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
          <div>
            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3, fontFamily: 'Barlow Condensed, sans-serif' }}>Wrappable / Notes</label>
            <textarea value={item.vehicleNotes || ''} onChange={e => onUpdate(index, { vehicleNotes: e.target.value })} className="field w-full" rows={2} placeholder="e.g. Both sides, rear doors..." style={{ fontSize: 11 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3, fontFamily: 'Barlow Condensed, sans-serif' }}>Cannot Wrap</label>
            <textarea value={item.cantWrapNotes || ''} onChange={e => onUpdate(index, { cantWrapNotes: e.target.value })} className="field w-full" rows={2} placeholder="e.g. Mirrors, handles, glass..." style={{ fontSize: 11 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {ISSUE_FLAGS.map(flag => {
            const active = issueFlags.includes(flag.key)
            return (
              <button key={flag.key} onClick={() => {
                const next = active ? issueFlags.filter((f: string) => f !== flag.key) : [...issueFlags, flag.key]
                onUpdate(index, { issueFlags: next })
              }} style={{ padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase', border: active ? `1.5px solid ${flag.color}` : '1px solid var(--border)', background: active ? flag.color + '18' : 'var(--surface)', color: active ? flag.color : 'var(--text3)' }}>
                {flag.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* SECTION 2 — Product + Vehicle */}
      <div className="space-y-3 mb-3">
        <div>
          <label className="block text-xs font-700 text-text2 mb-1.5 uppercase">Product</label>
          <input type="text" value={item.product || ''} onChange={e => onUpdate(index, { product: e.target.value })} className="field w-full" placeholder="Product name" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <label className="block text-xs font-700 text-text2 uppercase" style={{ margin: 0 }}>Vehicle / Description</label>
            <button onClick={() => setShowMeasurementModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--amber)', cursor: 'pointer' }}>
              <Ruler size={10} /> Sq Ft Lookup
            </button>
          </div>
          <input type="text" value={item.vehicle || ''} onChange={e => onUpdate(index, { vehicle: e.target.value })} className="field w-full" placeholder="e.g., 2023 Ford F-150, Blue" />
          <VehicleLookupModal open={showMeasurementModal} onClose={() => setShowMeasurementModal(false)}
            onSelect={(m: MeasurementResult) => {
              const desc = `${m.year_start}${m.year_end !== m.year_start ? '-' + m.year_end : ''} ${m.make} ${m.model}`
              onUpdate(index, { vehicle: desc, sqft: m.full_wrap_sqft, qty: m.full_wrap_sqft })
            }} />
        </div>
      </div>

      {/* SECTION 3 — Material */}
      <div style={{ background: 'rgba(79,127,255,0.04)', border: '1px solid rgba(79,127,255,0.12)', borderRadius: 8, padding: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Barlow Condensed, sans-serif' }}>Material</div>
          {orgId && (
            <button onClick={() => setShowAddRoll(!showAddRoll)} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 700, background: 'rgba(79,127,255,0.1)', border: '1px solid rgba(79,127,255,0.2)', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif' }}>
              <Plus size={9} /> Add Roll
            </button>
          )}
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3, fontFamily: 'Barlow Condensed, sans-serif' }}>
            Select Material Roll{loadingRolls ? ' (loading...)' : ''}
          </label>
          <select value={item.materialRollId || ''} onChange={e => handleRollSelect(e.target.value)} className="field w-full" style={{ fontSize: 12 }}>
            <option value="">— Select from inventory —</option>
            {vinylRolls.map(r => (
              <option key={r.id} value={r.id}>
                {r.name}{r.width_in ? ` · ${r.width_in}"` : ''}{r.sqft_available ? ` · ${Math.round(r.sqft_available)} sqft` : ''}{r.cost_per_sqft ? ` · $${r.cost_per_sqft}/sqft` : ''}
              </option>
            ))}
          </select>
          {item.materialName && (
            <div style={{ marginTop: 3, fontSize: 10, color: 'var(--accent)' }}>
              {item.materialName}
              {item.materialCostPerSqft > 0 && <span style={{ fontFamily: 'JetBrains Mono, monospace', marginLeft: 6 }}>${item.materialCostPerSqft}/sqft</span>}
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
          <div>
            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3, fontFamily: 'Barlow Condensed, sans-serif' }}>Sqft (from calc)</label>
            <input type="number" value={item.sqft || item.specs?.vinylArea || ''} readOnly className="field w-full" style={{ fontSize: 11, background: 'var(--surface2)', color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3, fontFamily: 'Barlow Condensed, sans-serif' }}>Manual Sqft Override</label>
            <input type="number" value={item.sqftOverride || ''} onChange={e => onUpdate(index, { sqftOverride: parseFloat(e.target.value) || null })} className="field w-full" placeholder="blank = use calc" style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} />
          </div>
        </div>
        {matCostCalc !== null && (
          <div style={{ fontSize: 10, color: 'var(--text2)', padding: '4px 8px', background: 'rgba(79,127,255,0.06)', borderRadius: 5, marginBottom: 6 }}>
            Mat cost: <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--accent)' }}>{fmtC(matCostCalc)}</span>
            <span style={{ color: 'var(--text3)', marginLeft: 6 }}>({sqft} sqft x ${matCostPerSqft} + {waste}% waste)</span>
          </div>
        )}
        {showAddRoll && (
          <div style={{ marginTop: 8, padding: 10, background: 'var(--bg)', borderRadius: 7, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>Add New Roll to Inventory</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: 6 }}>
              <input className="field" placeholder="Brand" value={newRoll.brand} onChange={e => setNewRoll(p => ({ ...p, brand: e.target.value }))} style={{ fontSize: 11 }} />
              <input className="field" placeholder="Color" value={newRoll.color} onChange={e => setNewRoll(p => ({ ...p, color: e.target.value }))} style={{ fontSize: 11 }} />
              <input className="field" placeholder="Finish" value={newRoll.finish} onChange={e => setNewRoll(p => ({ ...p, finish: e.target.value }))} style={{ fontSize: 11 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: 8 }}>
              <div><label style={{ fontSize: 9, color: 'var(--text3)' }}>Width (in)</label><input type="number" className="field" value={newRoll.width_in} onChange={e => setNewRoll(p => ({ ...p, width_in: Number(e.target.value) }))} style={{ fontSize: 11 }} /></div>
              <div><label style={{ fontSize: 9, color: 'var(--text3)' }}>Length (ft)</label><input type="number" className="field" value={newRoll.length_ft} onChange={e => setNewRoll(p => ({ ...p, length_ft: Number(e.target.value) }))} style={{ fontSize: 11 }} /></div>
              <div><label style={{ fontSize: 9, color: 'var(--text3)' }}>Cost/Foot ($)</label><input type="number" className="field" value={newRoll.cost_per_foot || ''} onChange={e => setNewRoll(p => ({ ...p, cost_per_foot: Number(e.target.value) }))} style={{ fontSize: 11 }} step="0.01" /></div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleAddRoll} className="btn-primary text-xs" style={{ flex: 1 }}>Save Roll</button>
              <button onClick={() => setShowAddRoll(false)} className="btn-secondary text-xs">Cancel</button>
            </div>
          </div>
        )}
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: 'Barlow Condensed, sans-serif' }}>
            Production - Actual Material Used
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div>
              <label style={{ fontSize: 9, color: 'var(--text3)' }}>Actual Linft Used</label>
              <input type="number" value={item.actualLinft || ''} onChange={e => {
                const linft = parseFloat(e.target.value) || null
                onUpdate(index, { actualLinft: linft, actualSqft: linft ? Math.round(linft * 4.5) : null })
              }} className="field w-full" placeholder="0.0" step="0.5" style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} />
            </div>
            <div>
              <label style={{ fontSize: 9, color: 'var(--text3)' }}>=  Sqft Printed (54")</label>
              <input type="number" value={item.actualSqft || ''} readOnly className="field w-full" style={{ fontSize: 11, background: 'var(--surface2)', color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }} />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4 - Qty / Price / Total */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-xs font-700 text-text2 mb-1.5 uppercase">Qty</label>
          <input type="number" value={item.qty || 1} onChange={e => { const qty = parseFloat(e.target.value) || 1; onUpdate(index, { qty, total: qty * (item.price || 0) }) }} className="field w-full" min="0" />
        </div>
        <div>
          <label className="block text-xs font-700 text-text2 mb-1.5 uppercase">Unit Price</label>
          <input type="number" value={item.price || 0} onChange={e => { const price = parseFloat(e.target.value) || 0; onUpdate(index, { price, total: (item.qty || 1) * price }) }} className="field w-full" min="0" step="0.01" />
        </div>
        <div>
          <label className="block text-xs font-700 text-text2 mb-1.5 uppercase">Total</label>
          <input type="number" value={item.total || 0} readOnly className="field w-full bg-surface2" />
        </div>
      </div>

      {/* SECTION 5 - Photo Inspector */}
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setShowPhotoInspection(!showPhotoInspection)} className="btn-secondary text-xs w-full" style={{ justifyContent: 'flex-start', gap: 6 }}>
          <Camera size={12} />
          {showPhotoInspection ? 'Hide' : 'Show'} Photo Inspector
          {attachedPhotos.length > 0 && <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, background: 'rgba(79,127,255,0.15)', color: 'var(--accent)', padding: '1px 5px', borderRadius: 6 }}>{attachedPhotos.length} attached</span>}
        </button>
        {showPhotoInspection && (
          <div style={{ marginTop: 8 }}>
            {projectId && (
              <div style={{ marginBottom: 8 }}>
                <button onClick={() => setShowPhotosPicker(!showPhotosPicker)} style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'rgba(79,127,255,0.08)', border: '1px solid rgba(79,127,255,0.2)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Layers size={10} /> Select from Project Photos
                </button>
                {showPhotosPicker && (
                  <div style={{ marginTop: 6, padding: 8, background: 'var(--surface2)', borderRadius: 7, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 6, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', fontWeight: 700 }}>Click photos to attach</div>
                    {projectPhotos.length === 0 && <div style={{ fontSize: 11, color: 'var(--text3)' }}>No photos uploaded to this project yet.</div>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {projectPhotos.map(photo => {
                        const attached = attachedPhotos.includes(photo.url)
                        return (
                          <div key={photo.id} style={{ position: 'relative', cursor: 'pointer' }}
                            onClick={() => onUpdate(index, { attachedPhotos: attached ? attachedPhotos.filter((u: string) => u !== photo.url) : [...attachedPhotos, photo.url] })}>
                            <img src={photo.url} alt={photo.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 5, border: attached ? '2px solid var(--accent)' : '1px solid var(--border)' }} />
                            {attached && <CheckCircle size={12} style={{ position: 'absolute', top: 2, right: 2, color: 'var(--accent)' }} />}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            {orgId && (
              <PhotoInspection
                lineItemId={item.id || `item-${index}`}
                specs={item.specs || {}}
                updateSpec={(key: string, val: unknown) => onUpdate(index, { specs: { ...(item.specs || {}), [key]: val } })}
                canWrite={true}
                orgId={orgId}
              />
            )}
          </div>
        )}
      </div>

      {/* SECTION 6 - Mockup */}
      <div style={{ marginBottom: 10 }}>
        {item.mockupUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 7 }}>
            <img src={item.mockupUrl} alt="Mockup" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4 }} />
            <div style={{ flex: 1, fontSize: 11, color: 'var(--purple)' }}>Mockup attached</div>
            <button onClick={() => onUpdate(index, { mockupUrl: null })} style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={13} /></button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setShowMockupInput(!showMockupInput)} className="btn-secondary text-xs" style={{ gap: 5 }}>
              <ImageIcon size={11} /> Attach Mockup
            </button>
            {projectId && (
              <a href={`/mockup-generator?lineItemId=${item.id || index}`} className="btn-secondary text-xs" style={{ display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                <Layers size={11} /> Create Mockup
              </a>
            )}
          </div>
        )}
        {showMockupInput && !item.mockupUrl && (
          <div style={{ marginTop: 6, display: 'flex', gap: 5 }}>
            <input type="text" value={mockupInputVal} onChange={e => setMockupInputVal(e.target.value)} className="field flex-1" placeholder="Paste mockup image URL..." style={{ fontSize: 11 }} />
            <button onClick={() => { onUpdate(index, { mockupUrl: mockupInputVal }); setShowMockupInput(false) }} className="btn-primary text-xs">Attach</button>
          </div>
        )}
      </div>

      {/* SECTION 7 - Rollup */}
      <div className="border-t border-border pt-3">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-text3">
          <input type="checkbox" checked={!!item.rollupTo} onChange={e => onUpdate(index, { rollupTo: e.target.checked ? (item.rollupTo || null) : null })} className="w-3.5 h-3.5" />
          Roll up into parent line item
        </label>
        {item.rollupTo !== undefined && item.rollupTo !== null && (
          <div className="ml-5 mt-2">
            <select value={item.rollupTo || ''} onChange={e => onUpdate(index, { rollupTo: parseInt(e.target.value) })} className="field w-full text-xs">
              <option value="">Select parent...</option>
              {parentItems.map(parent => (
                <option key={parent.index} value={parent.index}>{parent.index + 1}: {parent.product || 'Untitled'}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}
"""

with open(TARGET, 'w', newline='\n', encoding='utf-8') as f:
    f.write(CONTENT)
print(f'Wrote {len(CONTENT)} chars to {TARGET}')
