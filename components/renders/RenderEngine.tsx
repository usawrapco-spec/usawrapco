'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Sparkles, X, Download, Eye, Layers, Sun, Moon, Cloud,
  Building2, Car, Trash2, RefreshCw, Camera,
  LayoutGrid, List, Package, ChevronDown, ChevronRight,
  Sunset,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  is_multi_angle: boolean
  angle_set_id: string | null
  wrap_description: string | null
  created_at: string
  cost_credits: number
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

// ─── Config ───────────────────────────────────────────────────────────────────

const LIGHTING_OPTIONS = [
  { key: 'showroom',    label: 'Showroom',    desc: 'Studio white, perfect light',  Icon: Sparkles },
  { key: 'daylight',    label: 'Daylight',    desc: 'Clear sky, sun high',          Icon: Sun },
  { key: 'overcast',    label: 'Overcast',    desc: 'Soft, no shadows',             Icon: Cloud },
  { key: 'golden_hour', label: 'Golden Hour', desc: 'Sunset warm tones',            Icon: Sunset },
  { key: 'night',       label: 'Night',       desc: 'Headlights on, dark',          Icon: Moon },
]

const BACKGROUND_OPTIONS = [
  { key: 'studio',      label: 'White Studio',  Icon: Sparkles },
  { key: 'city_street', label: 'City Street',   Icon: Building2 },
  { key: 'dealership',  label: 'Dealership',    Icon: Car },
]

// Canonical angle sort order for display
const ANGLE_ORDER = ['original', 'front', 'side', 'rear', 'three_quarter']

const ANGLE_LABELS: Record<string, string> = {
  original:      'Original',
  front:         'Front',
  side:          'Side',
  rear:          'Rear',
  three_quarter: '¾ View',
}

const RENDER_PACKAGES = [
  {
    key:   'showroom_set',
    label: 'Showroom Set',
    desc:  '5 angles · White studio',
    icon:  '🏛',
    angles: [
      { angle: 'original',      lighting: 'showroom', background: 'studio' },
      { angle: 'front',         lighting: 'showroom', background: 'studio' },
      { angle: 'side',          lighting: 'showroom', background: 'studio' },
      { angle: 'rear',          lighting: 'showroom', background: 'studio' },
      { angle: 'three_quarter', lighting: 'showroom', background: 'studio' },
    ],
  },
  {
    key:   'street_set',
    label: 'Street Cred',
    desc:  '3 angles · City + Golden hour',
    icon:  '🌆',
    angles: [
      { angle: 'three_quarter', lighting: 'golden_hour', background: 'city_street' },
      { angle: 'side',          lighting: 'golden_hour', background: 'city_street' },
      { angle: 'front',         lighting: 'daylight',    background: 'city_street' },
    ],
  },
  {
    key:   'full_presentation',
    label: 'Full Presentation',
    desc:  '8 renders · All scenarios',
    icon:  '🎬',
    angles: [
      { angle: 'three_quarter', lighting: 'showroom',    background: 'studio' },
      { angle: 'side',          lighting: 'showroom',    background: 'studio' },
      { angle: 'three_quarter', lighting: 'golden_hour', background: 'city_street' },
      { angle: 'side',          lighting: 'daylight',    background: 'dealership' },
      { angle: 'front',         lighting: 'showroom',    background: 'studio' },
      { angle: 'rear',          lighting: 'showroom',    background: 'studio' },
      { angle: 'three_quarter', lighting: 'night',       background: 'city_street' },
      { angle: 'original',      lighting: 'overcast',    background: 'dealership' },
    ],
  },
]

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner({ size = 16, color = 'var(--accent)' }: { size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${color}30`,
      borderTopColor: color,
      animation: 'spin 0.9s linear infinite',
      flexShrink: 0,
    }} />
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, label, subLabel }: { pct: number; label: string; subLabel?: string }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700 }}>{label}</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {subLabel && <span style={{ fontSize: 10, color: 'var(--text3)' }}>{subLabel}</span>}
          <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 800 }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--accent), #22d3ee)',
          borderRadius: 6, transition: 'width 0.5s ease',
          boxShadow: `0 0 10px var(--accent)60`,
        }} />
      </div>
    </div>
  )
}

// ─── Render Card ──────────────────────────────────────────────────────────────

function RenderCard({ render, onView, onCompare, onDelete, onDownload }: {
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
        position: 'relative', borderRadius: 10, overflow: 'hidden',
        background: 'var(--surface2)',
        border: `1px solid ${hover && render.render_url ? 'var(--accent)' : 'var(--border)'}`,
        transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
        transform: hover && render.render_url ? 'translateY(-2px)' : 'none',
        boxShadow: hover && render.render_url ? '0 6px 20px rgba(79,127,255,0.2)' : 'none',
        aspectRatio: '4/3',
        cursor: render.render_url ? 'pointer' : 'default',
      }}
    >
      {render.render_url ? (
        <img
          src={render.render_url}
          alt={`v${render.version} ${render.angle}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onClick={() => onView(render)}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {isFailed ? (
            <>
              <X size={22} color="var(--red)" />
              <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>Failed</span>
              {render.notes && <span style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'center', padding: '0 10px' }}>{render.notes.slice(0, 60)}</span>}
            </>
          ) : (
            <>
              <Spinner size={26} />
              <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700 }}>Rendering…</span>
              <span style={{ fontSize: 9, color: 'var(--text3)' }}>10–30 sec</span>
            </>
          )}
        </div>
      )}

      {render.angle !== 'original' && (
        <div style={{
          position: 'absolute', top: 6, left: 6,
          background: 'rgba(0,0,0,0.72)', color: '#fff',
          fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
          letterSpacing: '.07em', textTransform: 'uppercase', backdropFilter: 'blur(4px)',
        }}>
          {ANGLE_LABELS[render.angle] || render.angle}
        </div>
      )}

      <div style={{
        position: 'absolute', top: 6, right: 6,
        background: 'rgba(0,0,0,0.72)', color: '#fff',
        fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
        fontFamily: 'JetBrains Mono, monospace', backdropFilter: 'blur(4px)',
      }}>
        v{render.version}
      </div>

      {hover && render.render_url && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          backdropFilter: 'blur(2px)',
        }}>
          <HoverBtn icon={<Eye size={13} />}     label="View"    onClick={() => onView(render)} />
          {render.original_photo_url && (
            <HoverBtn icon={<Layers size={13} />} label="Compare" onClick={() => onCompare(render)} />
          )}
          <HoverBtn icon={<Download size={13} />} label="Save"    onClick={() => onDownload(render)} />
          <HoverBtn icon={<Trash2 size={13} />}   label="Delete"  onClick={() => onDelete(render.id)} danger />
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.82))',
        padding: '20px 8px 6px',
        fontSize: 8, color: 'rgba(255,255,255,0.75)',
        fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase',
      }}>
        {render.lighting?.replace('_', ' ')} · {render.background?.replace('_', ' ')}
      </div>
    </div>
  )
}

function HoverBtn({ icon, label, onClick, danger = false }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={label}
      style={{
        background: danger ? 'rgba(242,90,90,0.25)' : 'rgba(255,255,255,0.18)',
        border: `1px solid ${danger ? 'rgba(242,90,90,0.45)' : 'rgba(255,255,255,0.35)'}`,
        color: danger ? '#f87171' : '#fff',
        borderRadius: 8, padding: '5px 8px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 10, fontWeight: 700, backdropFilter: 'blur(4px)',
        transition: 'all 0.1s',
      }}
    >
      {icon} {label}
    </button>
  )
}

// ─── Angle Set Group ──────────────────────────────────────────────────────────

function AngleSetGroup({ renders, onView, onCompare, onDelete, onDownload }: {
  renders: Render[]
  onView: (r: Render) => void
  onCompare: (r: Render) => void
  onDelete: (id: string) => void
  onDownload: (r: Render) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const sorted = [...renders].sort((a, b) => ANGLE_ORDER.indexOf(a.angle) - ANGLE_ORDER.indexOf(b.angle))
  const done = renders.filter(r => r.status === 'succeeded').length
  const first = sorted[0]

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%', padding: '10px 14px',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
          borderBottom: collapsed ? 'none' : '1px solid var(--border)',
        }}
      >
        {collapsed ? <ChevronRight size={14} color="var(--text3)" /> : <ChevronDown size={14} color="var(--text3)" />}
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text1)' }}>
            Multi-Angle Set — v{first?.version}
          </span>
          <span style={{ fontSize: 10, color: done < renders.length ? 'var(--accent)' : 'var(--green)', marginLeft: 10 }}>
            {done}/{renders.length} complete
          </span>
          <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 10 }}>
            {first?.lighting?.replace('_', ' ')} · {first?.background?.replace('_', ' ')}
          </span>
        </div>
        {done < renders.length && <Spinner size={14} />}
      </button>
      {!collapsed && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, padding: 12 }}>
          {sorted.map(r => (
            <RenderCard key={r.id} render={r} onView={onView} onCompare={onCompare} onDelete={onDelete} onDownload={onDownload} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ render, onClose, compareMode, original, allRenders, onNav }: {
  render: Render
  onClose: () => void
  compareMode: boolean
  original?: string | null
  allRenders: Render[]
  onNav: (r: Render) => void
}) {
  const successfulRenders = allRenders.filter(r => r.status === 'succeeded' && r.render_url)
  const currentIdx = successfulRenders.findIndex(r => r.id === render.id)

  // Keyboard nav — proper deps, no stale closures, proper cleanup
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowRight' && currentIdx < successfulRenders.length - 1) {
        onNav(successfulRenders[currentIdx + 1])
      }
      if (e.key === 'ArrowLeft' && currentIdx > 0) {
        onNav(successfulRenders[currentIdx - 1])
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, onNav, currentIdx, successfulRenders.length]) // stable deps — no stale closures

  if (!render.render_url) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.94)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {compareMode && original ? (
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 8, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>ORIGINAL PHOTO</div>
              <img src={original} alt="Original" style={{ maxHeight: '78vh', maxWidth: '43vw', borderRadius: 12, border: '1px solid var(--border)' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--accent)', marginBottom: 8, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>AI RENDER</div>
              <img src={render.render_url} alt="Render" style={{ maxHeight: '78vh', maxWidth: '43vw', borderRadius: 12, border: '1px solid var(--accent)', boxShadow: '0 0 30px rgba(79,127,255,0.3)' }} />
            </div>
          </div>
        ) : (
          <img src={render.render_url} alt="Render" style={{ maxHeight: '82vh', maxWidth: '90vw', borderRadius: 14, border: '1px solid var(--border)' }} />
        )}

        <div style={{ marginTop: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
          {currentIdx > 0 && (
            <button onClick={() => onNav(successfulRenders[currentIdx - 1])} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#fff', fontSize: 11 }}>
              ← Prev
            </button>
          )}
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            v{render.version} · {render.lighting?.replace('_', ' ')} · {render.background?.replace('_', ' ')}
            {render.angle !== 'original' && ` · ${ANGLE_LABELS[render.angle]}`}
            {successfulRenders.length > 1 && ` · ${currentIdx + 1}/${successfulRenders.length}`}
          </span>
          {currentIdx < successfulRenders.length - 1 && (
            <button onClick={() => onNav(successfulRenders[currentIdx + 1])} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#fff', fontSize: 11 }}>
              Next →
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onClose}
        style={{
          position: 'fixed', top: 18, right: 18,
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: '50%', width: 40, height: 40, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}
      >
        <X size={18} />
      </button>
    </div>
  )
}

// ─── Main RenderEngine ────────────────────────────────────────────────────────

export default function RenderEngine({ jobId, orgId, wrapDescription: initialDesc = '', vehicleType = '' }: RenderEngineProps) {
  const [renders, setRenders] = useState<Render[]>([])
  const [settings, setSettings] = useState<RenderSettings>({ max_renders_per_job: 20, watermark_enabled: true, watermark_text: 'UNCONFIRMED — USA WRAP CO' })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')

  // Form
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState('')
  const [wrapDescription, setWrapDescription] = useState(
    () => initialDesc || (vehicleType ? `${vehicleType} vinyl wrap` : '')
  )
  const [lighting, setLighting] = useState('showroom')
  const [background, setBackground] = useState('studio')
  const [multiAngle, setMultiAngle] = useState(false)
  const [activeTab, setActiveTab] = useState<'custom' | 'packages'>('custom')

  // Gallery
  const [viewingRender, setViewingRender] = useState<Render | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Polling refs
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef(false)    // guard: prevents double-start
  const rendersRef = useRef(renders)    // access current renders inside interval without dep
  rendersRef.current = renders          // always sync

  const loadRenders = useCallback(async () => {
    try {
      const res = await fetch(`/api/renders/${jobId}`)
      const data = await res.json()
      if (data.renders) { setRenders(data.renders) }
      if (data.settings) { setSettings(data.settings) }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [jobId])

  useEffect(() => { loadRenders() }, [loadRenders])

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
      isPollingRef.current = false
    }
  }, [])

  // Polling engine — watches pending count (a number) not the full renders array
  const pendingCount = renders.filter(r => r.status === 'pending' || r.status === 'processing').length

  useEffect(() => {
    // All done — stop polling
    if (pendingCount === 0) {
      if (isPollingRef.current) {
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
        isPollingRef.current = false
        setGenerating(false)
        setProgress(100)
        setTimeout(() => setProgress(0), 2500)
      }
      return
    }

    // Already polling — don't start another interval
    if (isPollingRef.current) return

    isPollingRef.current = true
    let ticker = 0

    pollingRef.current = setInterval(async () => {
      ticker++

      // Monotonically increase fake progress (never goes backwards)
      setProgress(prev => Math.min(92, Math.max(prev, 15 + ticker * 3)))

      const currentPending = rendersRef.current.filter(
        r => r.status === 'pending' || r.status === 'processing'
      )

      // All resolved inside the interval itself
      if (currentPending.length === 0) {
        clearInterval(pollingRef.current!)
        pollingRef.current = null
        isPollingRef.current = false
        setGenerating(false)
        setProgress(100)
        setTimeout(() => setProgress(0), 2500)
        return
      }

      // Poll each pending render
      for (const r of currentPending) {
        try {
          const res = await fetch(`/api/renders/generate?renderId=${r.id}`)
          if (!res.ok) continue
          const data = await res.json()
          if (data.status === 'succeeded' || data.status === 'failed' || data.status === 'canceled') {
            setRenders(prev => prev.map(pr => pr.id === r.id ? { ...pr, ...data.render } : pr))
          }
        } catch { /* ignore individual failures, keep polling */ }
      }
    }, 3500)
  }, [pendingCount]) // only re-run when pending count changes (number, not array)

  // Photo upload
  async function handlePhotoUpload(file: File) {
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
    } catch { setError('Photo upload failed') }
    finally { setUploadingPhoto(false) }
  }

  // Fire render request
  async function fireGenerate(overrideBody?: Record<string, any>) {
    if (generating) return
    setError('')
    setGenerating(true)
    setProgress(5)

    const body = overrideBody ?? {
      vehiclePhotoUrl: vehiclePhotoUrl || undefined,
      wrapDescription,
      lighting,
      background,
      multiAngle,
    }

    try {
      const res = await fetch('/api/renders/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, jobId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Render failed to start')
        setGenerating(false)
        setProgress(0)
        return
      }

      if (data.renders?.length) {
        setRenders(prev => [...data.renders, ...prev])
        setProgress(12)
        setProgressLabel(`${data.count} render${data.count !== 1 ? 's' : ''} queued — processing…`)
      }
    } catch {
      setError('Network error — check your connection')
      setGenerating(false)
      setProgress(0)
    }
  }

  async function handlePackage(pkg: typeof RENDER_PACKAGES[0]) {
    if (!wrapDescription.trim() && !vehiclePhotoUrl) {
      setError('Add a wrap description or vehicle photo first')
      return
    }
    setProgressLabel(`${pkg.label}: ${pkg.angles.length} renders queued…`)
    await fireGenerate({
      vehiclePhotoUrl: vehiclePhotoUrl || undefined,
      wrapDescription,
      presetAngles: pkg.angles,
    })
  }

  async function handleDelete(renderId: string) {
    if (!confirm('Delete this render?')) return
    try {
      await fetch(`/api/renders/${jobId}?renderId=${renderId}`, { method: 'DELETE' })
      setRenders(prev => prev.filter(r => r.id !== renderId))
    } catch { setError('Delete failed') }
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

  function handleDownloadAll() {
    // Snapshot the list at click time, stagger to avoid browser throttling
    const toDownload = renders.filter(r => r.status === 'succeeded' && r.render_url)
    toDownload.forEach((r, i) => setTimeout(() => handleDownload(r), i * 400))
  }

  // Grouping
  const succeededRenders = renders.filter(r => r.status === 'succeeded' && r.render_url)

  const angleSets: Record<string, Render[]> = {}
  const singleRenders: Render[] = []
  for (const r of renders) {
    if (r.angle_set_id) {
      if (!angleSets[r.angle_set_id]) angleSets[r.angle_set_id] = []
      angleSets[r.angle_set_id].push(r)
    } else {
      singleRenders.push(r)
    }
  }

  const totalCost = renders.reduce((a, r) => a + (r.cost_credits || 0), 0)
  const usedCount = renders.filter(r => r.status !== 'failed' && r.status !== 'canceled').length
  const remaining = Math.max(0, settings.max_renders_per_job - usedCount)

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="var(--accent)" />
            AI Photorealistic Renders
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3, display: 'flex', gap: 14 }}>
            <span>{renders.length} total · {succeededRenders.length} complete</span>
            <span style={{ color: remaining <= 3 ? 'var(--red)' : 'var(--text3)' }}>{remaining} remaining</span>
            {totalCost > 0 && <span>~${totalCost.toFixed(3)} est. cost</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {succeededRenders.length > 1 && (
            <button onClick={handleDownloadAll} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: 'var(--text2)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Download size={13} /> All
            </button>
          )}
          <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: 'var(--text2)' }} title={viewMode === 'grid' ? 'List view' : 'Grid view'}>
            {viewMode === 'grid' ? <List size={14} /> : <LayoutGrid size={14} />}
          </button>
          <button onClick={loadRenders} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: 'var(--text2)' }} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Generator Panel ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 22 }}>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 18, background: 'var(--surface2)', borderRadius: 10, padding: 3, width: 'fit-content' }}>
          {([
            { key: 'custom',   label: 'Custom Render',  icon: <Sparkles size={12} /> },
            { key: 'packages', label: 'Render Packages', icon: <Package size={12} /> },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: activeTab === t.key ? 'var(--surface)' : 'transparent',
                color: activeTab === t.key ? 'var(--accent)' : 'var(--text3)',
                fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 5,
                boxShadow: activeTab === t.key ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Shared: photo + wrap description */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 18 }}>
          {/* Photo */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 8 }}>
              Vehicle Photo <span style={{ color: 'var(--accent)', fontWeight: 600, textTransform: 'none' }}>— enables img2img</span>
            </label>
            {vehiclePhotoUrl ? (
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '4/3' }}>
                <img src={vehiclePhotoUrl} alt="Vehicle" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => setVehiclePhotoUrl('')} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={12} />
                </button>
                <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(34,192,122,0.9)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5, letterSpacing: '.06em' }}>
                  IMG2IMG MODE
                </div>
              </div>
            ) : (
              <>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(79,127,255,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface2)' }}
                  style={{ aspectRatio: '4/3', border: '2px dashed var(--border)', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', background: 'var(--surface2)', transition: 'border-color 0.15s, background 0.15s' }}
                >
                  {uploadingPhoto
                    ? <><Spinner size={24} /><span style={{ fontSize: 11, color: 'var(--text3)' }}>Uploading…</span></>
                    : <>
                        <Camera size={28} color="var(--text3)" />
                        <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700 }}>Upload Vehicle Photo</span>
                        <span style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', padding: '0 20px', lineHeight: 1.5 }}>Wrap applied to your actual vehicle via img2img</span>
                      </>
                  }
                </div>
                <input type="text" placeholder="Or paste photo URL…" value={vehiclePhotoUrl} onChange={e => setVehiclePhotoUrl(e.target.value)} style={{ width: '100%', marginTop: 8, padding: '8px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text1)', outline: 'none', boxSizing: 'border-box' }} />
              </>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
          </div>

          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 6 }}>
                Wrap Design Description
              </label>
              <textarea
                value={wrapDescription}
                onChange={e => setWrapDescription(e.target.value)}
                placeholder="e.g. matte black full wrap with red racing stripes, carbon fiber hood, chrome accents…"
                rows={4}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text1)', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 }}
              />
            </div>
            <div>
              <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700 }}>Quick add:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                {['matte black', 'gloss white', 'carbon fiber', 'chrome silver', 'color shift', 'full wrap', 'partial wrap', 'racing stripes'].map(chip => (
                  <button
                    key={chip}
                    onClick={() => setWrapDescription(d => d ? `${d}, ${chip}` : chip)}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)' }}
                    style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text3)', transition: 'all 0.1s' }}
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Custom tab */}
        {activeTab === 'custom' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 8 }}>Lighting</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {LIGHTING_OPTIONS.map(({ key, label, desc, Icon }) => (
                  <button key={key} onClick={() => setLighting(key)} title={desc} style={{ flex: 1, padding: '9px 6px', borderRadius: 9, cursor: 'pointer', border: 'none', background: lighting === key ? 'rgba(79,127,255,0.15)' : 'var(--surface2)', outline: lighting === key ? '2px solid var(--accent)' : '1px solid var(--border)', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <Icon size={15} color={lighting === key ? 'var(--accent)' : 'var(--text3)'} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: lighting === key ? 'var(--accent)' : 'var(--text2)' }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 8 }}>Background</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {BACKGROUND_OPTIONS.map(({ key, label, Icon }) => (
                  <button key={key} onClick={() => setBackground(key)} style={{ flex: 1, padding: '9px 6px', borderRadius: 9, cursor: 'pointer', border: 'none', background: background === key ? 'rgba(79,127,255,0.15)' : 'var(--surface2)', outline: background === key ? '2px solid var(--accent)' : '1px solid var(--border)', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <Icon size={14} color={background === key ? 'var(--accent)' : 'var(--text3)'} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: background === key ? 'var(--accent)' : 'var(--text2)' }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={multiAngle} onChange={e => setMultiAngle(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
                <div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text1)' }}>Generate All 5 Angles</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 8 }}>Original · Front · Side · Rear · ¾ View</span>
                </div>
              </label>
              {multiAngle && (
                <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--surface2)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                  5 renders · ~60 sec
                </span>
              )}
            </div>

            <button
              onClick={() => fireGenerate()}
              disabled={generating || (!wrapDescription.trim() && !vehiclePhotoUrl)}
              style={{
                width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
                cursor: generating || (!wrapDescription.trim() && !vehiclePhotoUrl) ? 'not-allowed' : 'pointer',
                background: generating || (!wrapDescription.trim() && !vehiclePhotoUrl)
                  ? 'var(--surface2)' : 'linear-gradient(135deg, var(--accent), #22d3ee)',
                color: generating || (!wrapDescription.trim() && !vehiclePhotoUrl) ? 'var(--text3)' : '#fff',
                fontSize: 15, fontWeight: 900, letterSpacing: '.03em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'all 0.15s',
                boxShadow: (!generating && (wrapDescription.trim() || vehiclePhotoUrl)) ? '0 4px 20px rgba(79,127,255,0.4)' : 'none',
              }}
            >
              {generating
                ? <><Spinner size={16} color="var(--text3)" /> Generating…</>
                : <><Sparkles size={16} /> Generate Render{multiAngle ? ' (5 Angles)' : ''}</>
              }
            </button>
          </>
        )}

        {/* Packages tab */}
        {activeTab === 'packages' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {RENDER_PACKAGES.map(pkg => (
              <button
                key={pkg.key}
                onClick={() => handlePackage(pkg)}
                disabled={generating}
                onMouseEnter={e => { if (!generating) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(79,127,255,0.06)' } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface2)' }}
                style={{ padding: '16px 14px', borderRadius: 12, cursor: generating ? 'not-allowed' : 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)', textAlign: 'left', transition: 'all 0.15s', opacity: generating ? 0.6 : 1 }}
              >
                <div style={{ fontSize: 22, marginBottom: 8 }}>{pkg.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text1)', marginBottom: 4 }}>{pkg.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>{pkg.desc}</div>
                <div style={{ marginTop: 10, fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>
                  {pkg.angles.length} renders · ~{Math.round(pkg.angles.length * 15)}s
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Progress */}
        {generating && progress > 0 && (
          <ProgressBar pct={progress} label={progressLabel || 'Processing…'} subLabel={vehiclePhotoUrl ? 'img2img mode' : 'text2img mode'} />
        )}

        {/* Error */}
        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.25)', borderRadius: 10, fontSize: 12, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <X size={14} /> {error}
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', color: 'var(--text3)' }}><X size={11} /></button>
          </div>
        )}
      </div>

      {/* Pending strip */}
      {pendingCount > 0 && (
        <div style={{ marginBottom: 14, padding: '10px 16px', background: 'rgba(79,127,255,0.07)', border: '1px solid rgba(79,127,255,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Spinner size={14} />
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>
            {pendingCount} render{pendingCount !== 1 ? 's' : ''} processing
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Results appear automatically</span>
        </div>
      )}

      {/* Gallery */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, color: 'var(--text3)', gap: 10 }}>
          <Spinner size={18} /> Loading renders…
        </div>
      ) : renders.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '52px 24px', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: 14 }}>
          <Sparkles size={44} color="var(--text3)" style={{ marginBottom: 16, opacity: 0.3 }} />
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text2)', marginBottom: 8 }}>No renders yet</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', maxWidth: 340, lineHeight: 1.6 }}>
            Enter a wrap description above and click <strong>Generate Render</strong>, or try a <strong>Render Package</strong> for a full presentation set.
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {renders.map(render => (
            <div key={render.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10 }}>
              {render.render_url
                ? <img src={render.render_url} alt="" style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                : <div style={{ width: 72, height: 54, background: 'var(--surface)', borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size={16} /></div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text1)' }}>
                  v{render.version} · {render.lighting?.replace('_', ' ')} · {render.background?.replace('_', ' ')}
                  {render.angle !== 'original' && ` · ${ANGLE_LABELS[render.angle]}`}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {render.wrap_description || render.prompt?.slice(0, 70)}
                </div>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '.05em', flexShrink: 0, background: render.status === 'succeeded' ? 'rgba(34,192,122,0.1)' : render.status === 'failed' ? 'rgba(242,90,90,0.1)' : 'rgba(79,127,255,0.1)', color: render.status === 'succeeded' ? 'var(--green)' : render.status === 'failed' ? 'var(--red)' : 'var(--accent)' }}>
                {render.status}
              </span>
              {render.render_url && (
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <button onClick={() => { setViewingRender(render); setCompareMode(false) }} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--text2)' }}><Eye size={12} /></button>
                  <button onClick={() => handleDownload(render)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--text2)' }}><Download size={12} /></button>
                  <button onClick={() => handleDelete(render.id)} style={{ background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.2)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--red)' }}><Trash2 size={12} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div>
          {/* Angle sets */}
          {Object.entries(angleSets).map(([setId, setRenders]) => (
            <AngleSetGroup
              key={setId}
              renders={setRenders}
              onView={r => { setViewingRender(r); setCompareMode(false) }}
              onCompare={r => { setViewingRender(r); setCompareMode(true) }}
              onDelete={handleDelete}
              onDownload={handleDownload}
            />
          ))}
          {/* Single renders */}
          {singleRenders.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {singleRenders.map(render => (
                <RenderCard
                  key={render.id}
                  render={render}
                  onView={r => { setViewingRender(r); setCompareMode(false) }}
                  onCompare={r => { setViewingRender(r); setCompareMode(true) }}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {viewingRender?.render_url && (
        <Lightbox
          render={viewingRender}
          onClose={() => setViewingRender(null)}
          compareMode={compareMode}
          original={viewingRender.original_photo_url}
          allRenders={renders}
          onNav={r => setViewingRender(r)}
        />
      )}
    </div>
  )
}
