'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Sparkles, Upload, X, Download, Eye, Layers, Sun, Moon, Cloud, Sunset,
  Building2, TreePine, Car, ZoomIn, Trash2, RefreshCw, Copy, Info,
  ChevronLeft, ChevronRight, LayoutGrid, Maximize2, Droplets, Camera,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Render {
  id: string
  project_id: string
  prediction_id: string
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  render_url: string | null
  original_photo_url: string | null
  prompt: string | null
  lighting: string
  background: string
  angle: string
  version: number
  notes: string | null
  watermarked: boolean
  watermark_url: string | null
  is_multi_angle: boolean
  angle_set_id: string | null
  wrap_description: string | null
  created_at: string
}

interface RenderSettings {
  max_renders_per_job: number
  watermark_enabled: boolean
  watermark_text: string
}

interface RenderEngineProps {
  jobId: string
  orgId: string
  wrapDescription?: string
  vehicleType?: string
}

const LIGHTING_OPTIONS = [
  { key: 'showroom',    label: 'Showroom',     desc: 'Studio white, perfect lighting', Icon: Sparkles },
  { key: 'daylight',    label: 'Outdoor Day',  desc: 'Natural sunlight, clear sky',    Icon: Sun },
  { key: 'overcast',    label: 'Overcast',     desc: 'Soft, no harsh shadows',         Icon: Cloud },
  { key: 'golden_hour', label: 'Golden Hour',  desc: 'Sunset warm tones',              Icon: Sunset },
  { key: 'night',       label: 'Night',        desc: 'Headlights on, dramatic dark',   Icon: Moon },
]

const BACKGROUND_OPTIONS = [
  { key: 'studio',      label: 'White Studio',    desc: 'Clean white backdrop', Icon: Sparkles },
  { key: 'city_street', label: 'City Street',     desc: 'Urban environment',    Icon: Building2 },
  { key: 'dealership',  label: 'Dealership Lot',  desc: 'Automotive setting',   Icon: Car },
  { key: 'custom',      label: 'Custom Upload',   desc: 'Your own background',  Icon: Upload },
]

const ANGLE_LABELS: Record<string, string> = {
  original:      'Original',
  front:         'Front',
  side:          'Side',
  rear:          'Rear',
  three_quarter: '3/4 View',
}

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--accent), #22d3ee)',
          borderRadius: 4,
          transition: 'width 0.4s ease',
          boxShadow: '0 0 8px var(--accent)',
        }} />
      </div>
    </div>
  )
}

function RenderCard({
  render,
  onView,
  onCompare,
  onDelete,
  onDownload,
}: {
  render: Render
  onView: (r: Render) => void
  onCompare: (r: Render) => void
  onDelete: (id: string) => void
  onDownload: (r: Render) => void
}) {
  const [hover, setHover] = useState(false)
  const isPending = render.status === 'pending' || render.status === 'processing'
  const isFailed = render.status === 'failed'

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--surface2)',
        border: `1px solid ${hover ? 'var(--accent)' : 'var(--border)'}`,
        transition: 'border-color 0.15s',
        aspectRatio: '4/3',
        cursor: isPending ? 'default' : 'pointer',
      }}
    >
      {render.render_url ? (
        <img
          src={render.render_url}
          alt={`Render v${render.version} ${render.angle}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onClick={() => onView(render)}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {isFailed ? (
            <>
              <X size={24} color="var(--red)" />
              <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>Failed</span>
              {render.notes && <span style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', padding: '0 8px' }}>{render.notes}</span>}
            </>
          ) : (
            <>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '3px solid var(--accent)',
                borderTopColor: 'transparent',
                animation: 'spin 1s linear infinite',
              }} />
              <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700 }}>Rendering...</span>
            </>
          )}
        </div>
      )}

      {/* Angle badge */}
      {render.angle !== 'original' && (
        <div style={{
          position: 'absolute', top: 6, left: 6,
          background: 'rgba(0,0,0,0.7)', color: '#fff',
          fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
          letterSpacing: '.06em', textTransform: 'uppercase',
          backdropFilter: 'blur(4px)',
        }}>
          {ANGLE_LABELS[render.angle] || render.angle}
        </div>
      )}

      {/* Version badge */}
      <div style={{
        position: 'absolute', top: 6, right: 6,
        background: 'rgba(0,0,0,0.7)', color: '#fff',
        fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
        fontFamily: 'JetBrains Mono, monospace',
        backdropFilter: 'blur(4px)',
      }}>
        v{render.version}
      </div>

      {/* Hover actions */}
      {hover && render.render_url && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          backdropFilter: 'blur(2px)',
        }}>
          <ActionBtn icon={<Eye size={14} />} label="View" onClick={() => onView(render)} />
          {render.original_photo_url && (
            <ActionBtn icon={<Layers size={14} />} label="Compare" onClick={() => onCompare(render)} />
          )}
          <ActionBtn icon={<Download size={14} />} label="Download" onClick={() => onDownload(render)} />
          <ActionBtn icon={<Trash2 size={14} />} label="Delete" onClick={() => onDelete(render.id)} danger />
        </div>
      )}

      {/* Lighting/bg info strip */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
        padding: '16px 8px 6px',
        fontSize: 9, color: 'rgba(255,255,255,0.8)',
        fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
      }}>
        {render.lighting?.replace('_', ' ')} · {render.background?.replace('_', ' ')}
      </div>
    </div>
  )
}

function ActionBtn({ icon, label, onClick, danger = false }: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={label}
      style={{
        background: danger ? 'rgba(242,90,90,0.2)' : 'rgba(255,255,255,0.15)',
        border: `1px solid ${danger ? 'rgba(242,90,90,0.4)' : 'rgba(255,255,255,0.3)'}`,
        color: danger ? 'var(--red)' : '#fff',
        borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: 700,
        backdropFilter: 'blur(4px)',
        transition: 'all 0.1s',
      }}
    >
      {icon} {label}
    </button>
  )
}

function LightboxModal({ render, onClose, compareMode, original }: {
  render: Render
  onClose: () => void
  compareMode: boolean
  original?: string | null
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '95vw', maxHeight: '90vh' }}>
        {compareMode && original ? (
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontWeight: 800, letterSpacing: '.06em' }}>ORIGINAL PHOTO</div>
              <img src={original} alt="Original" style={{ maxHeight: '80vh', maxWidth: '44vw', borderRadius: 12, border: '1px solid var(--border)' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 8, fontWeight: 800, letterSpacing: '.06em' }}>AI RENDER</div>
              <img src={render.render_url!} alt="Render" style={{ maxHeight: '80vh', maxWidth: '44vw', borderRadius: 12, border: '1px solid var(--accent)' }} />
            </div>
          </div>
        ) : (
          <img
            src={render.render_url!}
            alt="Render"
            style={{ maxHeight: '85vh', maxWidth: '90vw', borderRadius: 12, border: '1px solid var(--border)' }}
          />
        )}
        <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            v{render.version} · {render.lighting?.replace('_', ' ')} · {render.background?.replace('_', ' ')}
            {render.angle !== 'original' && ` · ${ANGLE_LABELS[render.angle]}`}
          </span>
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          position: 'fixed', top: 20, right: 20,
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%', width: 40, height: 40, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
        }}
      >
        <X size={18} />
      </button>
    </div>
  )
}

export default function RenderEngine({ jobId, orgId, wrapDescription: initialDesc = '', vehicleType = '' }: RenderEngineProps) {
  const [renders, setRenders] = useState<Render[]>([])
  const [settings, setSettings] = useState<RenderSettings>({ max_renders_per_job: 20, watermark_enabled: true, watermark_text: 'UNCONFIRMED — USA WRAP CO' })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')

  // Form state
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState('')
  const [wrapDescription, setWrapDescription] = useState(initialDesc || `${vehicleType} vinyl wrap`.trim())
  const [lighting, setLighting] = useState('showroom')
  const [background, setBackground] = useState('studio')
  const [multiAngle, setMultiAngle] = useState(false)

  // Gallery state
  const [viewingRender, setViewingRender] = useState<Render | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Photo upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bgFileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Polling
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const pendingRenderIds = useRef<Set<string>>(new Set())

  const loadRenders = useCallback(async () => {
    try {
      const res = await fetch(`/api/renders/${jobId}`)
      const data = await res.json()
      if (data.renders) {
        setRenders(data.renders)
        setSettings(data.settings || settings)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    loadRenders()
  }, [loadRenders])

  // Poll pending renders
  useEffect(() => {
    const pending = renders.filter(r => r.status === 'pending' || r.status === 'processing')
    if (pending.length === 0) {
      if (pollingRef.current) clearInterval(pollingRef.current)
      return
    }

    if (pollingRef.current) return // already polling

    pollingRef.current = setInterval(async () => {
      let allDone = true
      for (const r of pending) {
        try {
          const res = await fetch(`/api/renders/generate?renderId=${r.id}`)
          const data = await res.json()
          if (data.status === 'processing' || data.status === 'pending') {
            allDone = false
            if (data.progress) setProgress(data.progress)
          }
          if (data.status === 'succeeded' || data.status === 'failed') {
            setRenders(prev => prev.map(pr =>
              pr.id === r.id ? { ...pr, ...data.render } : pr
            ))
          }
        } catch { /* ignore */ }
      }
      if (allDone) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        pollingRef.current = null
        setGenerating(false)
        setProgress(100)
        setTimeout(() => setProgress(0), 2000)
      }
    }, 3000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [renders])

  async function handlePhotoUpload(file: File) {
    if (!file) return
    setUploadingPhoto(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `vehicle-photos/${jobId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('project-files')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (upErr) { setError('Photo upload failed'); return }
      const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(path)
      setVehiclePhotoUrl(publicUrl)
    } catch {
      setError('Photo upload failed')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleGenerate() {
    if (generating) return
    setError('')
    setGenerating(true)
    setProgress(5)
    setProgressLabel(multiAngle ? 'Generating 5 angle renders...' : 'Generating render...')

    try {
      const res = await fetch('/api/renders/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          vehiclePhotoUrl: vehiclePhotoUrl || undefined,
          wrapDescription,
          lighting,
          background,
          multiAngle,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Render failed')
        setGenerating(false)
        setProgress(0)
        return
      }

      // Add new renders to list
      if (data.renders) {
        setRenders(prev => [...data.renders, ...prev])
        setProgress(15)
      }
    } catch {
      setError('Network error during render generation')
      setGenerating(false)
      setProgress(0)
    }
  }

  async function handleDelete(renderId: string) {
    if (!confirm('Delete this render?')) return
    try {
      await fetch(`/api/renders/${jobId}?renderId=${renderId}`, { method: 'DELETE' })
      setRenders(prev => prev.filter(r => r.id !== renderId))
    } catch {
      setError('Failed to delete render')
    }
  }

  function handleDownload(render: Render) {
    if (!render.render_url) return
    const a = document.createElement('a')
    a.href = render.render_url
    a.download = `render-v${render.version}-${render.lighting}-${render.angle}.jpg`
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const succeededRenders = renders.filter(r => r.status === 'succeeded')
  const pendingRenders = renders.filter(r => r.status === 'pending' || r.status === 'processing')
  const hasPending = pendingRenders.length > 0

  return (
    <div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="var(--accent)" />
            AI Photorealistic Renders
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
            {renders.length} render{renders.length !== 1 ? 's' : ''} · {settings.max_renders_per_job - renders.length} remaining
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--text2)' }}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={loadRenders}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--text2)' }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Generator Panel ── */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 20,
        marginBottom: 24,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left: Photo selector */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 10 }}>
              Vehicle Photo (optional — improves realism)
            </label>
            {vehiclePhotoUrl ? (
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '4/3' }}>
                <img src={vehiclePhotoUrl} alt="Vehicle" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  onClick={() => setVehiclePhotoUrl('')}
                  style={{
                    position: 'absolute', top: 6, right: 6,
                    background: 'rgba(0,0,0,0.6)', border: 'none',
                    borderRadius: '50%', width: 26, height: 26, cursor: 'pointer',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  aspectRatio: '4/3',
                  border: '2px dashed var(--border)',
                  borderRadius: 10,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: 'pointer', transition: 'border-color 0.15s',
                  background: 'var(--surface2)',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                {uploadingPhoto ? (
                  <>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Camera size={28} color="var(--text3)" />
                    <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700 }}>Upload Vehicle Photo</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', padding: '0 16px' }}>
                      Enables img2img — wrap applied to your actual vehicle
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>or paste a URL below</span>
                  </>
                )}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
            {!vehiclePhotoUrl && (
              <input
                type="text"
                placeholder="Or paste photo URL..."
                value={vehiclePhotoUrl}
                onChange={e => setVehiclePhotoUrl(e.target.value)}
                style={{
                  width: '100%', marginTop: 8, padding: '8px 12px',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 8, fontSize: 12, color: 'var(--text1)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            )}

            {/* Multi-angle toggle */}
            {vehiclePhotoUrl && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={multiAngle}
                    onChange={e => setMultiAngle(e.target.checked)}
                    style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                  />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text1)' }}>Generate All Angles</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                      Creates Front · Side · Rear · 3/4 view (5 renders total)
                    </div>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Right: Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Wrap description */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>
                Wrap Design Description
              </label>
              <textarea
                value={wrapDescription}
                onChange={e => setWrapDescription(e.target.value)}
                placeholder="e.g. gloss black full wrap, matte red with white racing stripes, carbon fiber hood..."
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 10, fontSize: 12, color: 'var(--text1)',
                  resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Lighting */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>
                Lighting
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {LIGHTING_OPTIONS.map(({ key, label, desc, Icon }) => (
                  <button
                    key={key}
                    onClick={() => setLighting(key)}
                    style={{
                      padding: '8px 6px', borderRadius: 8, cursor: 'pointer', border: 'none',
                      background: lighting === key ? 'rgba(79,127,255,0.15)' : 'var(--surface2)',
                      outline: lighting === key ? '2px solid var(--accent)' : '1px solid var(--border)',
                      transition: 'all 0.15s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}
                  >
                    <Icon size={16} color={lighting === key ? 'var(--accent)' : 'var(--text3)'} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: lighting === key ? 'var(--accent)' : 'var(--text2)' }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Background */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>
                Background
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {BACKGROUND_OPTIONS.map(({ key, label, desc, Icon }) => (
                  <button
                    key={key}
                    onClick={() => setBackground(key)}
                    style={{
                      padding: '8px 6px', borderRadius: 8, cursor: 'pointer', border: 'none',
                      background: background === key ? 'rgba(79,127,255,0.15)' : 'var(--surface2)',
                      outline: background === key ? '2px solid var(--accent)' : '1px solid var(--border)',
                      transition: 'all 0.15s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}
                  >
                    <Icon size={14} color={background === key ? 'var(--accent)' : 'var(--text3)'} />
                    <span style={{ fontSize: 9, fontWeight: 800, color: background === key ? 'var(--accent)' : 'var(--text2)', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generating || (!wrapDescription && !vehiclePhotoUrl)}
              style={{
                marginTop: 'auto',
                padding: '14px 20px',
                borderRadius: 12,
                border: 'none',
                cursor: generating ? 'not-allowed' : 'pointer',
                background: generating
                  ? 'var(--surface2)'
                  : 'linear-gradient(135deg, var(--accent), #22d3ee)',
                color: generating ? 'var(--text3)' : '#fff',
                fontSize: 14, fontWeight: 900,
                letterSpacing: '.04em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.15s',
                boxShadow: generating ? 'none' : '0 4px 16px rgba(79,127,255,0.35)',
              }}
            >
              {generating ? (
                <>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--text3)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate Render {multiAngle && vehiclePhotoUrl ? '(5 angles)' : ''}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {generating && progress > 0 && (
          <ProgressBar pct={progress} label={progressLabel || 'Processing...'} />
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.25)',
            borderRadius: 10, fontSize: 12, color: 'var(--red)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <X size={14} />
            {error}
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', color: 'var(--text3)' }}>
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* ── Pending renders strip ── */}
      {hasPending && (
        <div style={{
          marginBottom: 16, padding: '12px 16px',
          background: 'rgba(79,127,255,0.08)', border: '1px solid rgba(79,127,255,0.2)',
          borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>
            {pendingRenders.length} render{pendingRenders.length !== 1 ? 's' : ''} processing...
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Results will appear automatically (10–30 sec)</span>
        </div>
      )}

      {/* ── Gallery ── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--text3)', gap: 10 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
          Loading renders...
        </div>
      ) : renders.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '48px 24px', textAlign: 'center',
          border: '2px dashed var(--border)', borderRadius: 14,
        }}>
          <Sparkles size={40} color="var(--text3)" style={{ marginBottom: 16, opacity: 0.4 }} />
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text2)', marginBottom: 6 }}>No renders yet</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', maxWidth: 320 }}>
            Enter a wrap description above and click Generate Render to create photorealistic visualizations for your client.
          </div>
        </div>
      ) : (
        <>
          {/* Group by angle set */}
          {viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {renders.map(render => (
                <RenderCard
                  key={render.id}
                  render={render}
                  onView={(r) => { setViewingRender(r); setCompareMode(false) }}
                  onCompare={(r) => { setViewingRender(r); setCompareMode(true) }}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {renders.map(render => (
                <div
                  key={render.id}
                  style={{
                    display: 'flex', gap: 14, alignItems: 'center',
                    padding: '12px 16px',
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 10,
                  }}
                >
                  {render.render_url ? (
                    <img src={render.render_url} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    <div style={{ width: 80, height: 60, background: 'var(--surface)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text1)' }}>
                      v{render.version} · {render.lighting?.replace('_', ' ')} · {render.background?.replace('_', ' ')}
                      {render.angle !== 'original' && ` · ${ANGLE_LABELS[render.angle]}`}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {render.wrap_description || render.prompt?.slice(0, 80)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                      {new Date(render.created_at).toLocaleString()} · {render.status}
                    </div>
                  </div>
                  {render.render_url && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setViewingRender(render); setCompareMode(false) }}
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--text2)' }}>
                        <Eye size={13} />
                      </button>
                      <button onClick={() => handleDownload(render)}
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--text2)' }}>
                        <Download size={13} />
                      </button>
                      <button onClick={() => handleDelete(render.id)}
                        style={{ background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.2)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--red)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Cost summary */}
      {renders.length > 0 && (
        <div style={{
          marginTop: 16, padding: '10px 14px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, display: 'flex', gap: 20, fontSize: 11, color: 'var(--text3)',
        }}>
          <span><strong style={{ color: 'var(--text2)' }}>{succeededRenders.length}</strong> completed</span>
          <span><strong style={{ color: 'var(--text2)' }}>{pendingRenders.length}</strong> pending</span>
          <span><strong style={{ color: 'var(--text2)' }}>{settings.max_renders_per_job - renders.length}</strong> remaining this job</span>
          <span style={{ marginLeft: 'auto' }}>Est. cost: ~${(renders.reduce((a, r) => a + (r.cost_credits || 0), 0)).toFixed(3)}</span>
        </div>
      )}

      {/* Lightbox */}
      {viewingRender && (
        <LightboxModal
          render={viewingRender}
          onClose={() => setViewingRender(null)}
          compareMode={compareMode}
          original={viewingRender.original_photo_url}
        />
      )}
    </div>
  )
}
