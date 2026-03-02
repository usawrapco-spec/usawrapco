'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutTemplate, Upload, X, Plus, ChevronRight,
  CheckCircle, Clock, AlertCircle, Loader2, Car,
  Database, Ruler, Check,
} from 'lucide-react'

interface VehicleTemplate {
  id: string
  make: string
  model: string
  year_start: number
  year_end: number
  sqft: number | null
  base_image_url: string | null
  thumbnail_url: string | null
  panels_json: any
  status: string
  created_at: string
  // Scale-aware fields
  width_inches: number | null
  height_inches: number | null
  scale_factor: number | null
  source_format: string | null
  vehicle_db_id: string | null
}

interface VehicleDbRow {
  id: string
  make: string
  model: string
  year_start: number | null
  year_end: number | null
  full_wrap_sqft: number | null
  side_sqft: number | null
  linear_feet: number | null
}

interface PanelBox {
  name: string
  bbox: { x: number; y: number; w: number; h: number }
  warp_points: { x: number; y: number }[]
}

const STATUS_ICON: Record<string, React.ElementType> = {
  active: CheckCircle,
  processing: Clock,
  error: AlertCircle,
}
const STATUS_COLOR: Record<string, string> = {
  active: 'var(--green)',
  processing: 'var(--amber)',
  error: 'var(--red)',
}

const SCALE_OPTIONS = [
  { label: '1:1 (actual size)', value: 1 },
  { label: '1/10 scale', value: 10 },
  { label: '1/20 (ProVehicleOutlines)', value: 20 },
  { label: '1/25 scale', value: 25 },
]

/** Client-side parse of AI %%BoundingBox from first 8 KB */
function parseAIBBox(text: string): { w: number; h: number } | null {
  const hi = text.match(/%%HiResBoundingBox:\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
  if (hi) return { w: parseFloat(hi[3]) - parseFloat(hi[1]), h: parseFloat(hi[4]) - parseFloat(hi[2]) }
  const bb = text.match(/%%BoundingBox:\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
  if (bb) return { w: parseFloat(bb[3]) - parseFloat(bb[1]), h: parseFloat(bb[4]) - parseFloat(bb[2]) }
  return null
}

/** Client-side parse of SVG dimensions in points */
function parseSVGDims(text: string): { w: number; h: number } | null {
  const vb = text.match(/viewBox=["']\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*["']/)
  if (vb) return { w: parseFloat(vb[3]), h: parseFloat(vb[4]) }
  const wm = text.match(/\bwidth=["']([\d.]+)(px|pt|in|mm)?["']/)
  const hm = text.match(/\bheight=["']([\d.]+)(px|pt|in|mm)?["']/)
  if (wm && hm) {
    const toPt: Record<string, number> = { pt: 1, px: 0.75, in: 72, mm: 2.835 }
    const f = toPt[wm[2] || 'px'] || 1
    return { w: parseFloat(wm[1]) * f, h: parseFloat(hm[1]) * f }
  }
  return null
}

export default function TemplatesPage() {
  const supabase = createClient()
  const [templates, setTemplates] = useState<VehicleTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<VehicleTemplate | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
      if (!profile) return
      setOrgId(profile.org_id)

      const { data } = await supabase
        .from('vehicle_templates')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })
      setTemplates(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const handleUploaded = (tpl: VehicleTemplate) => {
    setTemplates(prev => [tpl, ...prev])
    setUploadOpen(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LayoutTemplate size={22} style={{ color: 'var(--accent)' }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>
              Vehicle Templates
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>{templates.length} templates available</p>
          </div>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', borderRadius: 8,
            background: 'var(--accent)', color: '#fff',
            fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
          }}
        >
          <Plus size={15} />
          Upload Template
        </button>
      </div>

      {/* Grid */}
      {templates.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)',
        }}>
          <Car size={40} style={{ color: 'var(--text3)', marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>No templates yet</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
            Upload vehicle base images to enable mockup compositing
          </div>
          <button
            onClick={() => setUploadOpen(true)}
            style={{
              padding: '9px 20px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
            }}
          >
            Upload First Template
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
        }}>
          {templates.map(t => {
            const Icon = STATUS_ICON[t.status] || CheckCircle
            const color = STATUS_COLOR[t.status] || 'var(--text3)'
            const panels: PanelBox[] = t.panels_json?.panels || []
            const hasDb = !!t.vehicle_db_id
            const hasDims = !!(t.width_inches && t.height_inches)
            return (
              <div
                key={t.id}
                onClick={() => setSelectedTemplate(t)}
                style={{
                  background: 'var(--surface)',
                  border: selectedTemplate?.id === t.id ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { if (selectedTemplate?.id !== t.id) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(79,127,255,0.4)' }}
                onMouseLeave={e => { if (selectedTemplate?.id !== t.id) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)' }}
              >
                {/* Thumbnail */}
                <div style={{ height: 160, background: 'var(--surface2)', position: 'relative', overflow: 'hidden' }}>
                  {t.thumbnail_url ? (
                    <img
                      src={t.thumbnail_url}
                      alt={`${t.make} ${t.model}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Car size={32} style={{ color: 'var(--text3)' }} />
                    </div>
                  )}
                  {/* Status badge */}
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 20,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(4px)',
                  }}>
                    <Icon size={10} style={{ color }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color }}>{t.status}</span>
                  </div>
                  {/* DB match / Manual badge */}
                  <div style={{ position: 'absolute', top: 8, left: 8 }}>
                    {hasDb ? (
                      <span style={{ padding: '2px 7px', borderRadius: 10, fontSize: 9, fontWeight: 700, background: 'rgba(34,192,122,0.85)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Database size={8} /> DB Match
                      </span>
                    ) : (
                      <span style={{ padding: '2px 7px', borderRadius: 10, fontSize: 9, fontWeight: 700, background: 'rgba(245,158,11,0.8)', color: '#fff' }}>
                        Manual
                      </span>
                    )}
                  </div>
                  {/* Panel count */}
                  {panels.length > 0 && (
                    <div style={{
                      position: 'absolute', bottom: 8, left: 8,
                      padding: '3px 8px', borderRadius: 20,
                      background: 'rgba(79,127,255,0.85)',
                      fontSize: 10, fontWeight: 700, color: '#fff',
                    }}>
                      {panels.length} panels
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>
                    {t.make} {t.model}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                    {t.year_start}–{t.year_end}
                    {t.sqft ? ` · ${t.sqft} sqft` : ''}
                  </div>
                  {/* Real dimensions */}
                  {hasDims && (
                    <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Ruler size={9} />
                      {t.width_inches}&Prime; × {t.height_inches}&Prime; actual
                      {t.scale_factor && t.scale_factor !== 1 && (
                        <span style={{ color: 'var(--text3)', marginLeft: 4 }}>(1/{t.scale_factor})</span>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>View panels</span>
                    <ChevronRight size={11} style={{ color: 'var(--accent)' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Panel overlay viewer */}
      {selectedTemplate && (
        <PanelViewer
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      )}

      {/* Upload modal */}
      {uploadOpen && orgId && (
        <UploadModal
          orgId={orgId}
          onClose={() => setUploadOpen(false)}
          onUploaded={handleUploaded}
        />
      )}
    </div>
  )
}

// ── Panel Viewer ──────────────────────────────────────────────────────────────
function PanelViewer({ template, onClose }: { template: VehicleTemplate; onClose: () => void }) {
  const panels: PanelBox[] = template.panels_json?.panels || []
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--surface)', borderRadius: 16, overflow: 'hidden',
          maxWidth: 900, width: '100%', border: '1px solid var(--border)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>
              {template.make} {template.model} ({template.year_start}–{template.year_end})
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>{panels.length} detected panels — hover to highlight</span>
              {template.width_inches && template.height_inches && (
                <span style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                  {template.width_inches}&Prime; × {template.height_inches}&Prime; actual
                </span>
              )}
              {template.sqft && (
                <span>{template.sqft} sqft</span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Image with panel overlays */}
        <div style={{ padding: 20 }}>
          <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
            {template.base_image_url ? (
              <img
                src={template.base_image_url}
                alt="Template"
                style={{ width: '100%', display: 'block', borderRadius: 8 }}
              />
            ) : (
              <div style={{
                height: 300, background: 'var(--surface2)', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Car size={40} style={{ color: 'var(--text3)' }} />
              </div>
            )}
            {panels.map(p => (
              <div
                key={p.name}
                onMouseEnter={() => setHovered(p.name)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  position: 'absolute',
                  left: `${p.bbox.x}%`,
                  top: `${p.bbox.y}%`,
                  width: `${p.bbox.w}%`,
                  height: `${p.bbox.h}%`,
                  border: `2px solid ${hovered === p.name ? 'var(--green)' : 'rgba(79,127,255,0.6)'}`,
                  background: hovered === p.name ? 'rgba(34,192,122,0.2)' : 'rgba(79,127,255,0.08)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {hovered === p.name && (
                  <div style={{
                    position: 'absolute', top: -24, left: 0,
                    padding: '3px 8px', borderRadius: 4,
                    background: 'var(--green)', color: '#fff',
                    fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
                  }}>
                    {p.name.replace('_', ' ').toUpperCase()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Panel list */}
        {panels.length > 0 && (
          <div style={{ padding: '0 20px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {panels.map(p => (
              <span
                key={p.name}
                onMouseEnter={() => setHovered(p.name)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: hovered === p.name ? 'rgba(34,192,122,0.15)' : 'rgba(79,127,255,0.1)',
                  border: hovered === p.name ? '1px solid rgba(34,192,122,0.4)' : '1px solid rgba(79,127,255,0.25)',
                  color: hovered === p.name ? 'var(--green)' : 'var(--accent)',
                  cursor: 'default',
                }}
              >
                {p.name.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({
  orgId,
  onClose,
  onUploaded,
}: {
  orgId: string
  onClose: () => void
  onUploaded: (tpl: VehicleTemplate) => void
}) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [yearStart, setYearStart] = useState('2020')
  const [yearEnd, setYearEnd] = useState('2025')
  const [sqft, setSqft] = useState('')
  const [scaleFactor, setScaleFactor] = useState(20)
  const [customScale, setCustomScale] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Live bbox state
  const [bboxPts, setBboxPts] = useState<{ w: number; h: number } | null>(null)

  // Vehicle DB match
  const [matchingVehicle, setMatchingVehicle] = useState(false)
  const [matchedVehicle, setMatchedVehicle] = useState<VehicleDbRow | null>(null)
  const [noVehicleMatch, setNoVehicleMatch] = useState(false)

  const effectiveScale = customScale ? parseFloat(customScale) || 20 : scaleFactor
  const realW = bboxPts ? parseFloat(((bboxPts.w / 72) * effectiveScale).toFixed(1)) : null
  const realH = bboxPts ? parseFloat(((bboxPts.h / 72) * effectiveScale).toFixed(1)) : null
  const computedSqft = realW && realH ? parseFloat(((realW * realH) / 144).toFixed(0)) : null

  const isAiOrSvg = (f: File) => {
    const n = f.name.toLowerCase()
    return n.endsWith('.ai') || n.endsWith('.svg')
  }

  async function readBBox(f: File) {
    if (!isAiOrSvg(f)) { setBboxPts(null); return }
    try {
      const text = await f.slice(0, 8192).text()
      const dims = f.name.toLowerCase().endsWith('.ai') ? parseAIBBox(text) : parseSVGDims(text)
      setBboxPts(dims)
    } catch { setBboxPts(null) }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (!f) return
    const n = f.name.toLowerCase()
    const allowed = f.type.startsWith('image/') || n.endsWith('.ai') || n.endsWith('.svg')
    if (!allowed) return
    setFile(f)
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null)
    readBBox(f)
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null)
    readBBox(f)
  }

  async function handleMatchVehicle() {
    if (!make || !model) return
    setMatchingVehicle(true)
    setMatchedVehicle(null)
    setNoVehicleMatch(false)
    try {
      const { data } = await supabase
        .from('vehicle_measurements')
        .select('id, make, model, year_start, year_end, full_wrap_sqft, side_sqft, linear_feet')
        .ilike('make', make)
        .ilike('model', `%${model}%`)
        .limit(1)
        .single()
      if (data) {
        setMatchedVehicle(data)
        if (!sqft && data.full_wrap_sqft) setSqft(String(data.full_wrap_sqft))
      } else {
        setNoVehicleMatch(true)
      }
    } catch { setNoVehicleMatch(true) }
    setMatchingVehicle(false)
  }

  const handleUpload = async () => {
    if (!file || !make || !model) {
      setError('File, make, and model are required')
      return
    }
    setUploading(true)
    setError(null)
    setProgress('Uploading file…')

    const form = new FormData()
    form.append('image', file)
    form.append('make', make)
    form.append('model', model)
    form.append('year_start', yearStart)
    form.append('year_end', yearEnd)
    form.append('scale_factor', String(effectiveScale))
    if (sqft) form.append('sqft', sqft)

    try {
      setProgress('Detecting panels with AI…')
      const res = await fetch('/api/mockup/upload-template', {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Upload failed')
        setUploading(false)
        setProgress(null)
        return
      }

      const tpl: VehicleTemplate = {
        id: data.id,
        make,
        model,
        year_start: parseInt(yearStart),
        year_end: parseInt(yearEnd),
        sqft: data.sqft ?? (sqft ? parseFloat(sqft) : null),
        base_image_url: null,
        thumbnail_url: data.thumbnail_url,
        panels_json: { panels: data.panels_json?.panels || [] },
        status: 'active',
        created_at: new Date().toISOString(),
        width_inches:  data.width_inches ?? null,
        height_inches: data.height_inches ?? null,
        scale_factor:  data.scale_factor ?? effectiveScale,
        source_format: data.source_format ?? null,
        vehicle_db_id: data.vehicle_db_id ?? null,
      }
      setProgress(null)
      onUploaded(tpl)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
      setProgress(null)
    }
    setUploading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px',
    borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface2)', color: 'var(--text1)',
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--surface)', borderRadius: 16, overflow: 'hidden',
          maxWidth: 580, width: '100%', border: '1px solid var(--border)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={16} style={{ color: 'var(--accent)' }} />
            Upload Vehicle Template
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Dropzone */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>TEMPLATE FILE *</label>
            <div
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              style={{
                height: preview ? 'auto' : 140,
                border: `2px dashed ${file ? 'var(--green)' : 'var(--border)'}`,
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', overflow: 'hidden',
                background: file ? 'rgba(34,192,122,0.04)' : 'var(--surface2)',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = file ? 'var(--green)' : 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = file ? 'var(--green)' : 'var(--border)')}
            >
              {preview ? (
                <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: 220, objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', color: file ? 'var(--green)' : 'var(--text3)', padding: 16 }}>
                  <Upload size={24} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                  {file ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{file.name}</div>
                      <div style={{ fontSize: 11, marginTop: 2 }}>{(file.size / 1024).toFixed(0)} KB · Click to change</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Drop or click to browse</div>
                      <div style={{ fontSize: 11, marginTop: 4 }}>PNG, JPG, SVG, AI supported</div>
                    </>
                  )}
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*,.ai,.svg" style={{ display: 'none' }} onChange={onFileChange} />
          </div>

          {/* Scale factor */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>SCALE FACTOR</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {SCALE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setScaleFactor(opt.value); setCustomScale('') }}
                  style={{
                    padding: '5px 11px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                    border: scaleFactor === opt.value && !customScale ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: scaleFactor === opt.value && !customScale ? 'rgba(79,127,255,0.1)' : 'var(--surface2)',
                    color: scaleFactor === opt.value && !customScale ? 'var(--accent)' : 'var(--text2)',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Custom:</span>
              <input
                value={customScale}
                onChange={e => setCustomScale(e.target.value)}
                placeholder="e.g. 15"
                style={{ ...inputStyle, width: 80 }}
              />
            </div>

            {/* Live dimension preview */}
            {bboxPts && (
              <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(79,127,255,0.08)', border: '1px solid rgba(79,127,255,0.2)', fontSize: 12 }}>
                <div style={{ color: 'var(--text3)', marginBottom: 4 }}>
                  File units: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text2)' }}>
                    {bboxPts.w.toFixed(1)} × {bboxPts.h.toFixed(1)} pts
                  </span>
                </div>
                <div style={{ color: 'var(--accent)', fontWeight: 700 }}>
                  At 1/{effectiveScale} scale → real size:{' '}
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {realW}&Prime; × {realH}&Prime; actual
                  </span>
                </div>
                {computedSqft && (
                  <div style={{ color: 'var(--text3)', marginTop: 2 }}>
                    Computed sqft: <span style={{ color: 'var(--text1)', fontWeight: 600 }}>{computedSqft} sqft</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Make / Model / Year */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>MAKE *</label>
              <input style={inputStyle} placeholder="e.g. Ford" value={make} onChange={e => setMake(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>MODEL *</label>
              <input style={inputStyle} placeholder="e.g. Transit" value={model} onChange={e => setModel(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>YEAR START</label>
              <input style={inputStyle} type="number" value={yearStart} onChange={e => setYearStart(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>YEAR END</label>
              <input style={inputStyle} type="number" value={yearEnd} onChange={e => setYearEnd(e.target.value)} />
            </div>
          </div>

          {/* Vehicle DB match */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <button
                onClick={handleMatchVehicle}
                disabled={!make || !model || matchingVehicle}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 7,
                  background: 'rgba(79,127,255,0.1)', border: '1px solid rgba(79,127,255,0.25)',
                  color: (!make || !model) ? 'var(--text3)' : 'var(--accent)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  opacity: (!make || !model) ? 0.5 : 1,
                }}
              >
                {matchingVehicle
                  ? <><Loader2 size={11} className="animate-spin" /> Searching…</>
                  : <><Database size={11} /> Match Vehicle DB</>
                }
              </button>
              {matchedVehicle && (
                <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={11} /> Matched
                </span>
              )}
              {noVehicleMatch && (
                <span style={{ fontSize: 11, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={11} /> No DB match — enter sqft manually
                </span>
              )}
            </div>

            {/* Matched vehicle card */}
            {matchedVehicle && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(34,192,122,0.07)', border: '1px solid rgba(34,192,122,0.25)', fontSize: 11, marginBottom: 10 }}>
                <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Check size={11} /> {matchedVehicle.year_start ?? ''}–{matchedVehicle.year_end ?? ''} {matchedVehicle.make} {matchedVehicle.model}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {matchedVehicle.full_wrap_sqft != null && (
                    <div>
                      <div style={{ color: 'var(--text3)' }}>Full wrap</div>
                      <div style={{ fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{matchedVehicle.full_wrap_sqft} sqft</div>
                    </div>
                  )}
                  {matchedVehicle.side_sqft != null && (
                    <div>
                      <div style={{ color: 'var(--text3)' }}>Side</div>
                      <div style={{ fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{matchedVehicle.side_sqft} sqft</div>
                    </div>
                  )}
                  {matchedVehicle.linear_feet != null && (
                    <div>
                      <div style={{ color: 'var(--text3)' }}>Linear ft</div>
                      <div style={{ fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{matchedVehicle.linear_feet} ft</div>
                    </div>
                  )}
                </div>
                {/* Template vs DB sqft comparison */}
                {computedSqft && matchedVehicle.full_wrap_sqft != null && (
                  <div style={{ marginTop: 8, padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', fontSize: 11 }}>
                    <span style={{ color: 'var(--text3)' }}>Template sqft: </span>
                    <span style={{ color: 'var(--text1)', fontWeight: 700 }}>{computedSqft}</span>
                    <span style={{ color: 'var(--text3)', margin: '0 6px' }}>vs DB:</span>
                    <span style={{ color: 'var(--text1)', fontWeight: 700 }}>{matchedVehicle.full_wrap_sqft}</span>
                  </div>
                )}
              </div>
            )}

            {/* Sqft field */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>SQUARE FOOTAGE</label>
              <input
                style={{ ...inputStyle }}
                type="number"
                step="0.1"
                placeholder={computedSqft ? `${computedSqft} (auto-computed)` : 'e.g. 485'}
                value={sqft}
                onChange={e => setSqft(e.target.value)}
              />
              {computedSqft && !sqft && (
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
                  Leave blank to use computed {computedSqft} sqft from template dimensions
                </div>
              )}
            </div>
          </div>

          {/* Status/error */}
          {progress && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontSize: 13 }}>
              <Loader2 size={14} className="animate-spin" />
              {progress}
            </div>
          )}
          {error && (
            <div style={{ fontSize: 13, color: 'var(--red)', padding: '8px 12px', background: 'rgba(242,90,90,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !file || !make || !model}
              style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                background: 'var(--accent)', color: '#fff', border: 'none',
                cursor: uploading || !file || !make || !model ? 'not-allowed' : 'pointer',
                opacity: uploading || !file || !make || !model ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              {uploading && <Loader2 size={14} className="animate-spin" />}
              {uploading ? 'Uploading…' : 'Match & Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
