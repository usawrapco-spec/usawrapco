'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutTemplate, Upload, X, Plus, ChevronRight,
  CheckCircle, Clock, AlertCircle, Loader2, Car,
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
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {panels.length} detected panels — hover to highlight
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
            {/* Panel overlays */}
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
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [yearStart, setYearStart] = useState('2020')
  const [yearEnd, setYearEnd] = useState('2025')
  const [sqft, setSqft] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) {
      setFile(f)
      setPreview(URL.createObjectURL(f))
    }
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setPreview(URL.createObjectURL(f))
    }
  }

  const handleUpload = async () => {
    if (!file || !make || !model) {
      setError('Image, make, and model are required')
      return
    }
    setUploading(true)
    setError(null)
    setProgress('Uploading image…')

    const form = new FormData()
    form.append('image', file)
    form.append('make', make)
    form.append('model', model)
    form.append('year_start', yearStart)
    form.append('year_end', yearEnd)
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
      // Create a minimal template object to return
      const tpl: VehicleTemplate = {
        id: data.id,
        make,
        model,
        year_start: parseInt(yearStart),
        year_end: parseInt(yearEnd),
        sqft: sqft ? parseFloat(sqft) : null,
        base_image_url: null,
        thumbnail_url: data.thumbnail_url,
        panels_json: { panels: data.panels_json?.panels || [] },
        status: 'active',
        created_at: new Date().toISOString(),
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
          maxWidth: 560, width: '100%', border: '1px solid var(--border)',
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
          <div
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            style={{
              height: preview ? 'auto' : 160,
              border: '2px dashed var(--border)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden',
              background: 'var(--surface2)',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            {preview ? (
              <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: 240, objectFit: 'contain' }} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
                <Upload size={28} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>Drop image or click to browse</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>PNG, JPG, WebP supported</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />

          {/* Fields */}
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
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>SQUARE FOOTAGE</label>
              <input style={inputStyle} type="number" step="0.1" placeholder="e.g. 180" value={sqft} onChange={e => setSqft(e.target.value)} />
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
            <div style={{ fontSize: 13, color: 'var(--red)', padding: '8px 12px', background: 'rgba(242,90,90,0.1)', borderRadius: 8 }}>
              {error}
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
              {uploading ? 'Uploading…' : 'Upload & Detect Panels'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
