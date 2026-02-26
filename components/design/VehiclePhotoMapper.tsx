'use client'

import { useState, useRef, useCallback, useEffect, memo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Upload, X, Loader2, Camera, Eye, EyeOff, Layers, Sliders,
  Trash2, RefreshCw, Sparkles, CheckCircle, Image as ImageIcon,
  Download, ChevronRight, AlertTriangle, Plus, RotateCcw,
  Maximize2, SlidersHorizontal, FileImage, Car,
} from 'lucide-react'
import type { Profile } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DetectedPanel {
  panel: string
  bbox: { x: number; y: number; w: number; h: number }
  confidence: number
}

interface VehiclePhoto {
  id: string
  org_id: string
  project_id: string | null
  design_project_id: string | null
  storage_path: string
  public_url: string
  file_name: string
  file_type: string
  file_size_bytes: number | null
  angle: string | null
  angle_confidence: number | null
  vehicle_type: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: string | null
  vehicle_color: string | null
  existing_graphics: boolean | null
  detected_panels: DetectedPanel[] | null
  suggested_template: string | null
  ai_analysis: any
  ai_analyzed_at: string | null
  bg_removed_url: string | null
  created_at: string
}

type BlendMode = 'normal' | 'multiply' | 'overlay' | 'screen' | 'color-burn' | 'soft-light'

interface Props {
  profile: Profile
  projectId?: string
  designProjectId?: string
  onPhotoSelect?: (photo: VehiclePhoto) => void
  onTemplateDetected?: (template: string) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// Ordered by wrap-shop priority (driver side first)
const ANGLE_SLOTS = [
  { key: 'driver_side',          label: 'Driver Side',    short: 'DS'  },
  { key: 'passenger_side',       label: 'Passenger Side', short: 'PS'  },
  { key: 'front',                label: 'Front',          short: 'F'   },
  { key: 'rear',                 label: 'Rear',           short: 'R'   },
  { key: '3q_front_driver',      label: '3/4 Front D',    short: '¾FD' },
  { key: '3q_front_passenger',   label: '3/4 Front P',    short: '¾FP' },
  { key: '3q_rear_driver',       label: '3/4 Rear D',     short: '¾RD' },
  { key: '3q_rear_passenger',    label: '3/4 Rear P',     short: '¾RP' },
]

// Priority order for grid sorting
const ANGLE_PRIORITY: Record<string, number> = {
  driver_side: 0, passenger_side: 1, front: 2, rear: 3,
  '3q_front_driver': 4, '3q_front_passenger': 5,
  '3q_rear_driver': 6, '3q_rear_passenger': 7,
  overhead: 8, unknown: 9,
}

const ANGLE_COLORS: Record<string, string> = {
  front:                '#4f7fff',
  rear:                 '#8b5cf6',
  driver_side:          '#22c07a',
  passenger_side:       '#22d3ee',
  '3q_front_driver':    '#f59e0b',
  '3q_front_passenger': '#f97316',
  '3q_rear_driver':     '#ec4899',
  '3q_rear_passenger':  '#a78bfa',
  overhead:             '#6366f1',
  unknown:              '#5a6080',
}

const PANEL_COLORS: Record<string, string> = {
  hood:                    'rgba(79,127,255,0.4)',
  roof:                    'rgba(34,192,122,0.4)',
  driver_door:             'rgba(245,158,11,0.4)',
  passenger_door:          'rgba(249,115,22,0.4)',
  tailgate:                'rgba(139,92,246,0.4)',
  front_bumper:            'rgba(34,211,238,0.4)',
  rear_bumper:             'rgba(236,72,153,0.4)',
  driver_quarter_panel:    'rgba(16,185,129,0.4)',
  passenger_quarter_panel: 'rgba(251,191,36,0.4)',
  windshield:              'rgba(99,102,241,0.25)',
  rear_glass:              'rgba(99,102,241,0.25)',
  driver_mirror:           'rgba(239,68,68,0.4)',
  passenger_mirror:        'rgba(239,68,68,0.4)',
  rear_door:               'rgba(234,179,8,0.4)',
  bed_side_driver:         'rgba(20,184,166,0.4)',
  bed_side_passenger:      'rgba(20,184,166,0.4)',
}

const PANEL_LABELS: Record<string, string> = {
  hood:                    'Hood',
  roof:                    'Roof',
  driver_door:             'Driver Door',
  passenger_door:          'Passenger Door',
  tailgate:                'Tailgate',
  front_bumper:            'Front Bumper',
  rear_bumper:             'Rear Bumper',
  driver_quarter_panel:    'Driver Quarter',
  passenger_quarter_panel: 'Pass. Quarter',
  windshield:              'Windshield',
  rear_glass:              'Rear Glass',
  driver_mirror:           'Driver Mirror',
  passenger_mirror:        'Pass. Mirror',
  rear_door:               'Rear Door',
  bed_side_driver:         'Bed Side Driver',
  bed_side_passenger:      'Bed Side Pass.',
  running_board:           'Running Board',
  trunk:                   'Trunk',
}

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal',     label: 'Normal'     },
  { value: 'multiply',   label: 'Multiply'   },
  { value: 'overlay',    label: 'Overlay'    },
  { value: 'screen',     label: 'Screen'     },
  { value: 'color-burn', label: 'Burn'       },
  { value: 'soft-light', label: 'Soft Light' },
]

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_FILE_SIZE  = 50 * 1024 * 1024 // 50 MB

function fmtBytes(b: number | null) {
  if (!b) return ''
  if (b > 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
  return `${Math.round(b / 1024)} KB`
}

// ─────────────────────────────────────────────────────────────────────────────
// PanelOverlay — defined OUTSIDE component so React never remounts it
// ─────────────────────────────────────────────────────────────────────────────

const PanelOverlay = memo(function PanelOverlay({
  panels,
  hoveredPanel,
}: {
  panels: DetectedPanel[]
  hoveredPanel: string | null
}) {
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
    >
      {panels.map((p, i) => {
        const isHov  = hoveredPanel === p.panel
        const base   = PANEL_COLORS[p.panel] ?? 'rgba(255,255,255,0.3)'
        const fill   = isHov ? base.replace(/[\d.]+\)$/, '0.72)') : base
        const stroke = base.replace(/[\d.]+\)$/, isHov ? '1)' : '0.7)')
        return (
          <g key={i}>
            <rect
              x={p.bbox.x} y={p.bbox.y} width={p.bbox.w} height={p.bbox.h}
              fill={fill} stroke={stroke}
              strokeWidth={isHov ? '0.008' : '0.004'}
              rx="0.007"
            />
            {(isHov || p.bbox.w > 0.12) && (
              <text
                x={p.bbox.x + p.bbox.w / 2} y={p.bbox.y + p.bbox.h / 2}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="0.025" fill="#fff" fontWeight="700"
              >
                {(PANEL_LABELS[p.panel] ?? p.panel).replace(/_/g, ' ')}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// Toast — simple in-component notification
// ─────────────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000)
    return () => clearTimeout(t)
  }, [message, onDone])

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9998,
      background: 'var(--surface2)', border: '1px solid var(--surface2)',
      borderLeft: '3px solid var(--green)',
      borderRadius: 8, padding: '10px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      fontSize: 13, color: 'var(--text1)',
      display: 'flex', alignItems: 'center', gap: 8,
      maxWidth: 340,
      animation: 'slideUp 0.2s ease',
    }}>
      <CheckCircle size={15} color="var(--green)" style={{ flexShrink: 0 }} />
      {message}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function VehiclePhotoMapper({
  profile,
  projectId,
  designProjectId,
  onPhotoSelect,
  onTemplateDetected,
}: Props) {
  const supabase = createClient()

  const fileInputRef       = useRef<HTMLInputElement>(null)
  const splitContainerRef  = useRef<HTMLDivElement>(null)
  const designFileInputRef = useRef<HTMLInputElement>(null)
  // Keep analyzePhoto stable across handleFiles re-creations
  const analyzePhotoRef    = useRef<(id: string, url: string) => Promise<void>>()

  // ── State ───────────────────────────────────────────────────────────────────
  const [photos, setPhotos]                     = useState<VehiclePhoto[]>([])
  const [loading, setLoading]                   = useState(true)
  const [uploadProgress, setUploadProgress]     = useState<Record<string, number>>({})
  const [uploadErrors, setUploadErrors]         = useState<string[]>([])
  const [analyzing, setAnalyzing]               = useState<Set<string>>(new Set())
  const [removingBg, setRemovingBg]             = useState<Set<string>>(new Set())
  const [dragOver, setDragOver]                 = useState(false)
  const [selectedPhoto, setSelectedPhoto]       = useState<VehiclePhoto | null>(null)
  const [hoveredPanel, setHoveredPanel]         = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen]         = useState(false)
  const [toast, setToast]                       = useState<string | null>(null)

  // Overlay / split view
  const [designOverlayUrl, setDesignOverlayUrl] = useState('')
  const [overlayOpacity, setOverlayOpacity]     = useState(65)
  const [blendMode, setBlendMode]               = useState<BlendMode>('multiply')
  const [showPanels, setShowPanels]             = useState(true)
  const [showOverlay, setShowOverlay]           = useState(false)
  const [splitMode, setSplitMode]               = useState(false)
  const [splitPos, setSplitPos]                 = useState(50)
  const [draggingSplit, setDraggingSplit]       = useState(false)

  // ── Load photos ─────────────────────────────────────────────────────────────

  const loadPhotos = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('vehicle_photos')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })

    if (projectId)       q = q.eq('project_id', projectId)
    if (designProjectId) q = q.eq('design_project_id', designProjectId)

    const { data } = await q
    if (data) setPhotos(data as VehiclePhoto[])
    setLoading(false)
  }, [profile.org_id, projectId, designProjectId])

  useEffect(() => { loadPhotos() }, [loadPhotos])

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxOpen) { setLightboxOpen(false); return }
        if (selectedPhoto) { setSelectedPhoto(null); return }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxOpen, selectedPhoto])

  // ── Split drag ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!draggingSplit) return
    const onMove = (e: MouseEvent | TouchEvent) => {
      const el = splitContainerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX
      setSplitPos(Math.max(5, Math.min(95, ((x - rect.left) / rect.width) * 100)))
    }
    const onUp = () => setDraggingSplit(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove as any)
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove as any)
      window.removeEventListener('touchend', onUp)
    }
  }, [draggingSplit])

  // ── AI Analysis ─────────────────────────────────────────────────────────────
  // Defined BEFORE handleFiles so it can be referenced in the dep array

  const analyzePhoto = useCallback(async (photoId: string, photoUrl: string) => {
    setAnalyzing(prev => new Set(prev).add(photoId))
    try {
      const res  = await fetch('/api/analyze-vehicle-photo', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ photoUrl, photoId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      if (data.analysis) {
        const a = data.analysis
        const updated: Partial<VehiclePhoto> = {
          angle: a.angle, angle_confidence: a.angle_confidence,
          vehicle_type: a.vehicle_type, vehicle_make: a.vehicle_make,
          vehicle_model: a.vehicle_model, vehicle_year: a.vehicle_year,
          vehicle_color: a.vehicle_color, existing_graphics: a.existing_graphics,
          detected_panels: a.detected_panels, suggested_template: a.suggested_template,
          ai_analysis: a, ai_analyzed_at: new Date().toISOString(),
        }
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, ...updated } : p))
        setSelectedPhoto(prev => prev?.id === photoId ? { ...prev, ...updated } : prev)

        if (a.suggested_template) onTemplateDetected?.(a.suggested_template)

        // Toast with what we found
        const parts = [a.vehicle_year, a.vehicle_make, a.vehicle_model].filter(Boolean)
        const veh   = parts.length ? parts.join(' ') : a.vehicle_type ?? 'vehicle'
        const ang   = ANGLE_SLOTS.find(s => s.key === a.angle)?.label ?? a.angle ?? ''
        if (ang || veh) {
          setToast(`Found: ${[veh, ang].filter(Boolean).join(' — ')}`)
        }
      }
    } catch (e) {
      console.error('Analyze error:', e)
    } finally {
      setAnalyzing(prev => { const s = new Set(prev); s.delete(photoId); return s })
    }
  }, [onTemplateDetected])

  // Keep ref always current so handleFiles never has stale closure
  analyzePhotoRef.current = analyzePhoto

  // ── Upload ───────────────────────────────────────────────────────────────────
  // Uses analyzePhotoRef.current so it always calls the latest version

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files)
    const valid: File[]    = []
    const rejected: string[] = []

    for (const f of fileArr) {
      const name   = f.name.toLowerCase()
      const isHeic = name.endsWith('.heic') || name.endsWith('.heif')
      const ok     = ACCEPTED_TYPES.includes(f.type.toLowerCase()) || isHeic
      if (!ok || f.size > MAX_FILE_SIZE) {
        rejected.push(f.size > MAX_FILE_SIZE
          ? `${f.name}: too large (max 50 MB)`
          : `${f.name}: unsupported format`)
      } else {
        valid.push(f)
      }
    }
    if (rejected.length) setUploadErrors(rejected)
    if (!valid.length) return

    for (const file of valid) {
      const tmpKey = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`
      setUploadProgress(p => ({ ...p, [tmpKey]: 10 }))

      try {
        const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const path = `vehicle-photos/${profile.org_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        setUploadProgress(p => ({ ...p, [tmpKey]: 35 }))

        const { error: upErr } = await supabase.storage
          .from('project-files')
          .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })

        if (upErr) throw new Error(upErr.message)

        setUploadProgress(p => ({ ...p, [tmpKey]: 70 }))

        const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path)

        const { data: row, error: dbErr } = await supabase
          .from('vehicle_photos')
          .insert({
            org_id:            profile.org_id,
            project_id:        projectId       ?? null,
            design_project_id: designProjectId ?? null,
            storage_path:      path,
            public_url:        urlData.publicUrl,
            file_name:         file.name,
            file_type:         file.type || 'image/heic',
            file_size_bytes:   file.size,
            created_by:        profile.id,
          })
          .select()
          .single()

        if (dbErr) throw new Error(dbErr.message)

        setUploadProgress(p => ({ ...p, [tmpKey]: 100 }))
        setPhotos(prev => [row as VehiclePhoto, ...prev])

        setTimeout(() => {
          setUploadProgress(p => { const n = { ...p }; delete n[tmpKey]; return n })
          // Use ref so we always call the latest analyzePhoto
          analyzePhotoRef.current?.(row.id, urlData.publicUrl)
        }, 500)
      } catch (e: any) {
        console.error('Upload failed:', e)
        setUploadErrors(prev => [...prev, `${file.name}: ${e.message ?? 'upload failed'}`])
        setUploadProgress(p => { const n = { ...p }; delete n[tmpKey]; return n })
      }
    }
  }, [profile.org_id, profile.id, projectId, designProjectId])

  // ── Analyze all unanalyzed ───────────────────────────────────────────────────

  const analyzeAll = useCallback(() => {
    // Read photos from state at call time — safe because this is in the click handler
    setPhotos(current => {
      current.filter(p => !p.ai_analyzed_at && !analyzing.has(p.id))
             .forEach(p => analyzePhotoRef.current?.(p.id, p.public_url))
      return current
    })
  }, [analyzing])

  // ── Remove Background ───────────────────────────────────────────────────────

  const removeBackground = useCallback(async (photo: VehiclePhoto) => {
    setRemovingBg(prev => new Set(prev).add(photo.id))
    try {
      const res  = await fetch('/api/remove-background', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imageUrl: photo.public_url, projectId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.imageUrl) {
        await supabase.from('vehicle_photos').update({ bg_removed_url: data.imageUrl }).eq('id', photo.id)
        setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, bg_removed_url: data.imageUrl } : p))
        setSelectedPhoto(prev => prev?.id === photo.id ? { ...prev, bg_removed_url: data.imageUrl } : prev)
        setToast('Background removed — activate overlay to use it')
      }
    } catch (e) {
      console.error('Remove BG error:', e)
    } finally {
      setRemovingBg(prev => { const s = new Set(prev); s.delete(photo.id); return s })
    }
  }, [projectId])

  // ── Delete ──────────────────────────────────────────────────────────────────

  const deletePhoto = useCallback(async (photo: VehiclePhoto) => {
    await Promise.all([
      supabase.storage.from('project-files').remove([photo.storage_path]),
      supabase.from('vehicle_photos').delete().eq('id', photo.id),
    ])
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    setSelectedPhoto(prev => prev?.id === photo.id ? null : prev)
  }, [])

  // ── Design file → data URL ───────────────────────────────────────────────────

  const handleDesignFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const url = e.target?.result as string
      if (url) { setDesignOverlayUrl(url); setShowOverlay(true) }
    }
    reader.readAsDataURL(file)
  }, [])

  // ── Drag helpers ─────────────────────────────────────────────────────────────

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  // ── Derived ──────────────────────────────────────────────────────────────────

  // Sort photos by angle priority
  const sortedPhotos = [...photos].sort((a, b) =>
    (ANGLE_PRIORITY[a.angle ?? 'unknown'] ?? 9) - (ANGLE_PRIORITY[b.angle ?? 'unknown'] ?? 9)
  )

  const photoByAngle = ANGLE_SLOTS.reduce((acc, slot) => {
    acc[slot.key] = photos.find(p => p.angle === slot.key) ?? null
    return acc
  }, {} as Record<string, VehiclePhoto | null>)

  const coveredCount    = ANGLE_SLOTS.filter(s => photoByAngle[s.key]).length
  const unanalyzedCount = photos.filter(p => !p.ai_analyzed_at && !analyzing.has(p.id)).length
  const vehicleInfo     = photos.find(p => p.vehicle_make || p.vehicle_type)

  const isAnalyzing  = (id: string) => analyzing.has(id)
  const isRemovingBg = (id: string) => removingBg.has(id)

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, color: 'var(--text1)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Camera size={17} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Vehicle Photo Mapper</span>
            {vehicleInfo && (
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 20,
                background: 'rgba(79,127,255,0.15)', color: 'var(--accent)',
                border: '1px solid rgba(79,127,255,0.25)',
              }}>
                <Car size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                {[vehicleInfo.vehicle_year, vehicleInfo.vehicle_make, vehicleInfo.vehicle_model]
                  .filter(Boolean).join(' ') || vehicleInfo.vehicle_type}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            Upload real vehicle photos — Claude Vision auto-labels angles, detects panels, suggests template
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {unanalyzedCount > 0 && !loading && (
            <button
              onClick={analyzeAll}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px',
                borderRadius: 7, background: 'rgba(245,158,11,0.15)',
                border: '1px solid rgba(245,158,11,0.4)', color: 'var(--amber)',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}
            >
              <Sparkles size={12} /> Analyze All ({unanalyzedCount})
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 13px',
              borderRadius: 7, background: 'var(--accent)', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}
          >
            <Upload size={13} /> Add Photos
          </button>
          <input
            ref={fileInputRef} type="file" multiple
            accept=".jpg,.jpeg,.png,.webp,.heic,.heif"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = '' }}
          />
        </div>
      </div>

      {/* ── Upload progress ─────────────────────────────────────────────────── */}
      {Object.keys(uploadProgress).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {Object.entries(uploadProgress).map(([key, pct]) => (
            <div key={key} style={{
              height: 30, borderRadius: 6, background: 'var(--surface)',
              overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', paddingLeft: 10,
            }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${pct}%`, background: 'rgba(79,127,255,0.22)',
                transition: 'width 0.3s',
              }} />
              <Loader2 size={12} color="var(--accent)" className="vpm-spin" style={{ position: 'relative', marginRight: 6 }} />
              <span style={{ position: 'relative', fontSize: 11, color: 'var(--text2)' }}>
                Uploading... {pct}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Upload errors ────────────────────────────────────────────────────── */}
      {uploadErrors.length > 0 && (
        <div style={{
          background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)',
          borderRadius: 8, padding: '10px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <AlertTriangle size={13} color="var(--red)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>Upload errors</span>
            <button
              onClick={() => setUploadErrors([])}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}
            >
              <X size={13} />
            </button>
          </div>
          {uploadErrors.map((err, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--text2)' }}>{err}</div>
          ))}
        </div>
      )}

      {/* ── Angle coverage grid ─────────────────────────────────────────────── */}
      {!loading && (
        <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <RotateCcw size={12} color="var(--cyan)" />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Angle Coverage</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              {coveredCount}/{ANGLE_SLOTS.length}
            </span>
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(coveredCount / ANGLE_SLOTS.length) * 100}%`,
                background: coveredCount === ANGLE_SLOTS.length ? 'var(--green)' : 'var(--accent)',
                borderRadius: 3, transition: 'width 0.4s',
              }} />
            </div>
            {coveredCount === ANGLE_SLOTS.length && (
              <CheckCircle size={13} color="var(--green)" />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5 }}>
            {ANGLE_SLOTS.map(slot => {
              const photo    = photoByAngle[slot.key]
              const color    = ANGLE_COLORS[slot.key]
              const isSel    = selectedPhoto?.angle === slot.key
              return (
                <div
                  key={slot.key}
                  onClick={() => {
                    if (photo) { setSelectedPhoto(photo); onPhotoSelect?.(photo) }
                    else fileInputRef.current?.click()
                  }}
                  title={slot.label}
                  style={{
                    aspectRatio: '1', borderRadius: 7, overflow: 'hidden', cursor: 'pointer',
                    position: 'relative',
                    border: isSel
                      ? `2px solid ${color}`
                      : photo
                        ? `2px solid ${color}55`
                        : '2px dashed var(--surface2)',
                    background: photo ? 'transparent' : 'var(--surface2)',
                    boxShadow: isSel ? `0 0 0 2px ${color}40` : 'none',
                  }}
                >
                  {photo ? (
                    <>
                      <img
                        src={photo.public_url}
                        alt={slot.label}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }}
                      />
                      {isAnalyzing(photo.id) && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Loader2 size={11} color="#fff" className="vpm-spin" />
                        </div>
                      )}
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: `linear-gradient(transparent, ${color}cc)`,
                        padding: '8px 3px 3px', textAlign: 'center',
                        fontSize: 8, color: '#fff', fontWeight: 700, lineHeight: 1,
                      }}>
                        {slot.short}
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
                      <Plus size={13} color="var(--text3)" />
                      <span style={{ fontSize: 8, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.2, padding: '0 2px' }}>
                        {slot.short}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {photos.length > 0 && coveredCount < 3 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: 'var(--amber)' }}>
              <AlertTriangle size={11} />
              Driver side and front photos are most critical for wrap estimation
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!loading && photos.length === 0 && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--surface2)'}`,
            borderRadius: 12, padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
            background: dragOver ? 'rgba(79,127,255,0.07)' : 'transparent',
            transition: 'all 0.15s',
          }}
        >
          <Camera size={40} color="var(--text3)" style={{ margin: '0 auto 14px', display: 'block' }} />
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
            Drop customer vehicle photos here
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.7 }}>
            JPG · PNG · HEIC (iPhone) · WebP · Max 50 MB per file<br />
            Claude Vision auto-detects angle, make/model, and panel bounding boxes
          </div>
          <div style={{ marginTop: 14 }}>
            <span style={{
              display: 'inline-block', padding: '7px 18px', borderRadius: 7,
              background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600,
            }}>
              Browse Files
            </span>
          </div>
        </div>
      )}

      {/* ── Photo grid ───────────────────────────────────────────────────────── */}
      {photos.length > 0 && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
          onDrop={onDrop}
          style={{ position: 'relative' }}
        >
          {dragOver && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10, borderRadius: 10,
              border: '2px dashed var(--accent)', background: 'rgba(79,127,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, color: 'var(--accent)', pointerEvents: 'none',
            }}>
              Drop to upload
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ aspectRatio: '4/3', borderRadius: 9, background: 'var(--surface)', animation: 'vpm-pulse 1.5s ease infinite' }} />
                ))
              : sortedPhotos.map(photo => {
                  const isSel      = selectedPhoto?.id === photo.id
                  const angleColor = ANGLE_COLORS[photo.angle ?? 'unknown'] ?? '#5a6080'
                  const isHeic     = photo.file_type?.includes('heic') || photo.file_type?.includes('heif')
                  return (
                    <div
                      key={photo.id}
                      onClick={() => {
                        setSelectedPhoto(isSel ? null : photo)
                        if (!isSel) onPhotoSelect?.(photo)
                      }}
                      className="vpm-card"
                      style={{
                        position: 'relative', borderRadius: 9, overflow: 'hidden',
                        cursor: 'pointer', aspectRatio: '4/3',
                        border: isSel ? '2px solid var(--accent)' : '2px solid transparent',
                        background: 'var(--surface)',
                        boxShadow: isSel ? '0 0 0 3px rgba(79,127,255,0.2)' : 'none',
                      }}
                    >
                      <img
                        src={photo.public_url}
                        alt={photo.file_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={e => {
                          const img = e.target as HTMLImageElement
                          img.style.display = 'none'
                          if (img.parentElement) img.parentElement.style.background = 'var(--surface2)'
                        }}
                      />

                      {/* Angle badge */}
                      {photo.angle && photo.angle !== 'unknown' && (
                        <div style={{
                          position: 'absolute', top: 5, left: 5,
                          background: angleColor, color: '#fff',
                          borderRadius: 4, fontSize: 9, fontWeight: 700,
                          padding: '2px 5px', lineHeight: 1.4,
                        }}>
                          {ANGLE_SLOTS.find(s => s.key === photo.angle)?.short ?? photo.angle}
                        </div>
                      )}

                      {/* HEIC warning (may not preview on Windows/Chrome) */}
                      {isHeic && (
                        <div style={{
                          position: 'absolute', top: 5, right: 5,
                          background: 'rgba(245,158,11,0.85)', color: '#fff',
                          borderRadius: 3, fontSize: 8, fontWeight: 700, padding: '1px 4px',
                        }}>HEIC</div>
                      )}

                      {/* BG removed badge */}
                      {photo.bg_removed_url && !isHeic && (
                        <div style={{
                          position: 'absolute', top: 5, right: 5,
                          background: 'rgba(34,192,122,0.85)', color: '#fff',
                          borderRadius: 3, fontSize: 8, fontWeight: 700, padding: '1px 4px',
                        }}>BG</div>
                      )}

                      {/* Vehicle label at bottom */}
                      {photo.vehicle_make && (
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                          padding: '16px 6px 5px',
                          fontSize: 9, fontWeight: 600, color: '#fff', lineHeight: 1.3,
                        }}>
                          {[photo.vehicle_year, photo.vehicle_make, photo.vehicle_model].filter(Boolean).join(' ')}
                        </div>
                      )}

                      {/* Analyzing overlay */}
                      {isAnalyzing(photo.id) && (
                        <div style={{
                          position: 'absolute', inset: 0, background: 'rgba(13,15,20,0.65)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
                        }}>
                          <Loader2 size={20} color="var(--accent)" className="vpm-spin" />
                          <span style={{ fontSize: 10, color: '#fff' }}>Analyzing...</span>
                        </div>
                      )}

                      {/* Analyzed check */}
                      {photo.ai_analyzed_at && !isAnalyzing(photo.id) && (
                        <div style={{
                          position: 'absolute',
                          bottom: photo.vehicle_make ? 24 : 5,
                          right: 5,
                          background: 'rgba(34,192,122,0.9)', borderRadius: '50%',
                          width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <CheckCircle size={10} color="#fff" />
                        </div>
                      )}

                      {/* Hover actions (pure CSS via .vpm-actions) */}
                      <div className="vpm-actions">
                        <button
                          title="Re-analyze with AI"
                          onClick={ev => { ev.stopPropagation(); analyzePhoto(photo.id, photo.public_url) }}
                          disabled={isAnalyzing(photo.id)}
                          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4, padding: 5, cursor: 'pointer' }}
                        >
                          <RefreshCw size={11} color="#fff" />
                        </button>
                        <button
                          title="Delete photo"
                          onClick={ev => { ev.stopPropagation(); deletePhoto(photo) }}
                          style={{ background: 'rgba(242,90,90,0.75)', border: 'none', borderRadius: 4, padding: 5, cursor: 'pointer' }}
                        >
                          <Trash2 size={11} color="#fff" />
                        </button>
                      </div>
                    </div>
                  )
                })
            }
          </div>
        </div>
      )}

      {/* ── Selected Photo Detail Panel ───────────────────────────────────── */}
      {selectedPhoto && (
        <div style={{ border: '1px solid var(--surface2)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface)' }}>

          {/* Detail header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 14px', borderBottom: '1px solid var(--surface2)',
            background: 'var(--surface2)',
          }}>
            <ImageIcon size={13} color="var(--accent)" />
            <span style={{ fontWeight: 600, fontSize: 13, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {selectedPhoto.file_name}
            </span>
            {selectedPhoto.file_size_bytes && (
              <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>
                {fmtBytes(selectedPhoto.file_size_bytes)}
              </span>
            )}
            {selectedPhoto.angle && selectedPhoto.angle !== 'unknown' && (
              <span style={{
                background: ANGLE_COLORS[selectedPhoto.angle] ?? '#5a6080',
                color: '#fff', borderRadius: 4, fontSize: 10, padding: '2px 7px', fontWeight: 700, flexShrink: 0,
              }}>
                {ANGLE_SLOTS.find(s => s.key === selectedPhoto.angle)?.label ?? selectedPhoto.angle}
              </span>
            )}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setLightboxOpen(true)}
                title="Fullscreen (or press Escape to close)"
                style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 5, padding: '3px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text2)' }}
              >
                <Maximize2 size={11} />
              </button>
              <button
                onClick={() => setSelectedPhoto(null)}
                title="Close (Escape)"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', minHeight: 280, maxHeight: 480 }}>

            {/* ── Photo canvas area ───────────────────────────────────────── */}
            <div style={{ flex: '0 0 57%', background: '#000', position: 'relative', overflow: 'hidden' }}>
              <div
                ref={splitContainerRef}
                style={{ position: 'relative', height: '100%', userSelect: 'none', cursor: draggingSplit ? 'ew-resize' : 'default' }}
              >
                {/* Base photo */}
                <img
                  src={showOverlay && selectedPhoto.bg_removed_url
                    ? selectedPhoto.bg_removed_url
                    : selectedPhoto.public_url}
                  alt={selectedPhoto.file_name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', maxHeight: 440 }}
                  onError={e => { (e.target as HTMLImageElement).alt = 'Preview not available (HEIC on Windows)' }}
                />

                {/* Panel bounding box overlay */}
                {showPanels && (selectedPhoto.detected_panels?.length ?? 0) > 0 && (
                  <PanelOverlay
                    panels={selectedPhoto.detected_panels!}
                    hoveredPanel={hoveredPanel}
                  />
                )}

                {/* Design wrap overlay */}
                {showOverlay && designOverlayUrl && (
                  <img
                    src={designOverlayUrl}
                    alt="Design overlay"
                    style={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      objectFit: 'contain',
                      opacity: overlayOpacity / 100,
                      mixBlendMode: blendMode as any,
                      pointerEvents: 'none',
                      clipPath: splitMode
                        ? `polygon(0 0, ${splitPos}% 0, ${splitPos}% 100%, 0 100%)`
                        : undefined,
                    }}
                  />
                )}

                {/* Split divider handle */}
                {showOverlay && designOverlayUrl && splitMode && (
                  <div
                    onMouseDown={() => setDraggingSplit(true)}
                    onTouchStart={() => setDraggingSplit(true)}
                    style={{
                      position: 'absolute', top: 0, bottom: 0,
                      left: `${splitPos}%`, transform: 'translateX(-50%)',
                      width: 32, cursor: 'ew-resize',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: 6,
                    }}
                  >
                    <div style={{ width: 2, height: '100%', background: 'rgba(255,255,255,0.9)', boxShadow: '0 0 8px rgba(0,0,0,0.6)' }} />
                    <div style={{
                      position: 'absolute', background: '#fff', borderRadius: '50%',
                      width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
                    }}>
                      <SlidersHorizontal size={12} color="#111" />
                    </div>
                  </div>
                )}
              </div>

              {/* Canvas toolbar */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                display: 'flex', gap: 5, padding: '8px 10px',
                background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
              }}>
                <button
                  onClick={() => setShowPanels(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                    borderRadius: 5, cursor: 'pointer', fontSize: 11,
                    background: showPanels ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${showPanels ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.12)'}`,
                    color: showPanels ? 'var(--cyan)' : 'var(--text3)',
                  }}
                >
                  <Layers size={10} /> Panels
                </button>
                <button
                  onClick={() => { if (designOverlayUrl) setShowOverlay(v => !v) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                    borderRadius: 5, cursor: designOverlayUrl ? 'pointer' : 'not-allowed', fontSize: 11,
                    background: showOverlay && designOverlayUrl ? 'rgba(79,127,255,0.2)' : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${showOverlay && designOverlayUrl ? 'rgba(79,127,255,0.5)' : 'rgba(255,255,255,0.12)'}`,
                    color: showOverlay && designOverlayUrl ? 'var(--accent)' : 'var(--text3)',
                    opacity: designOverlayUrl ? 1 : 0.45,
                  }}
                >
                  <Eye size={10} /> Design
                </button>
                {showOverlay && designOverlayUrl && (
                  <button
                    onClick={() => setSplitMode(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                      borderRadius: 5, cursor: 'pointer', fontSize: 11,
                      background: splitMode ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.08)',
                      border: `1px solid ${splitMode ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.12)'}`,
                      color: splitMode ? 'var(--purple)' : 'var(--text3)',
                    }}
                  >
                    <SlidersHorizontal size={10} /> Compare
                  </button>
                )}
              </div>
            </div>

            {/* ── Right sidebar ───────────────────────────────────────────── */}
            <div style={{ flex: 1, borderLeft: '1px solid var(--surface2)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

              {/* AI Analysis section */}
              <div style={{ padding: '12px 13px', borderBottom: '1px solid var(--surface2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Sparkles size={12} color="var(--accent)" />
                  <span style={{ fontWeight: 600, fontSize: 12 }}>AI Analysis</span>
                  {isAnalyzing(selectedPhoto.id) && (
                    <Loader2 size={11} color="var(--accent)" className="vpm-spin" style={{ marginLeft: 4 }} />
                  )}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    {!selectedPhoto.ai_analyzed_at && !isAnalyzing(selectedPhoto.id) && (
                      <button
                        onClick={() => analyzePhoto(selectedPhoto.id, selectedPhoto.public_url)}
                        style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 5, padding: '2px 9px', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}
                      >
                        Analyze
                      </button>
                    )}
                    {selectedPhoto.ai_analyzed_at && (
                      <button
                        onClick={() => analyzePhoto(selectedPhoto.id, selectedPhoto.public_url)}
                        title="Re-analyze"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}
                      >
                        <RefreshCw size={11} />
                      </button>
                    )}
                  </div>
                </div>

                {isAnalyzing(selectedPhoto.id) ? (
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Running Claude Vision...</div>
                ) : selectedPhoto.ai_analyzed_at ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[
                      ['Vehicle',     [selectedPhoto.vehicle_year, selectedPhoto.vehicle_make, selectedPhoto.vehicle_model].filter(Boolean).join(' ') || '—'],
                      ['Type',        selectedPhoto.vehicle_type ?? '—'],
                      ['Color',       selectedPhoto.vehicle_color ?? '—'],
                      ['Confidence',  selectedPhoto.angle_confidence != null ? `${Math.round((selectedPhoto.angle_confidence as number) * 100)}%` : '—'],
                      ['Template',    selectedPhoto.suggested_template ?? '—'],
                    ].map(([label, val]) => (
                      <div key={label as string} style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                        <span style={{ color: 'var(--text3)', minWidth: 72, flexShrink: 0 }}>{label}</span>
                        <span style={{ color: 'var(--text1)', fontWeight: 500 }}>{val}</span>
                      </div>
                    ))}
                    {selectedPhoto.existing_graphics && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--amber)' }}>
                        <AlertTriangle size={11} />
                        Existing graphics detected — prep work required
                      </div>
                    )}
                    {selectedPhoto.suggested_template && onTemplateDetected && (
                      <button
                        onClick={() => onTemplateDetected!(selectedPhoto.suggested_template!)}
                        style={{
                          marginTop: 3, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center',
                          padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
                          background: 'rgba(79,127,255,0.12)', border: '1px solid rgba(79,127,255,0.3)',
                          color: 'var(--accent)', fontSize: 11, fontWeight: 600, width: '100%',
                        }}
                      >
                        <ChevronRight size={11} />
                        Use "{selectedPhoto.suggested_template}" template
                      </button>
                    )}
                    {selectedPhoto.ai_analysis?.notes && (
                      <div style={{
                        fontSize: 10, color: 'var(--text3)',
                        background: 'rgba(255,255,255,0.04)', borderRadius: 5,
                        padding: '5px 7px', lineHeight: 1.55,
                      }}>
                        {selectedPhoto.ai_analysis.notes}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    Click Analyze to run Claude Vision detection
                  </div>
                )}
              </div>

              {/* Detected panels interactive list */}
              {(selectedPhoto.detected_panels?.length ?? 0) > 0 && (
                <div style={{ padding: '12px 13px', borderBottom: '1px solid var(--surface2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Layers size={12} color="var(--cyan)" />
                    <span style={{ fontWeight: 600, fontSize: 12 }}>
                      {selectedPhoto.detected_panels!.length} Panels
                    </span>
                    <button
                      onClick={() => setShowPanels(v => !v)}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: showPanels ? 'var(--cyan)' : 'var(--text3)', padding: 2 }}
                      title={showPanels ? 'Hide panel overlay' : 'Show panel overlay'}
                    >
                      {showPanels ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {selectedPhoto.detected_panels!.map((p, i) => {
                      const color = PANEL_COLORS[p.panel] ?? 'rgba(255,255,255,0.15)'
                      const isH   = hoveredPanel === p.panel
                      return (
                        <div
                          key={i}
                          onMouseEnter={() => setHoveredPanel(p.panel)}
                          onMouseLeave={() => setHoveredPanel(null)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '4px 6px', borderRadius: 5,
                            background: isH ? color : 'transparent',
                            cursor: 'crosshair', transition: 'background 0.1s',
                          }}
                        >
                          <div style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: color, border: '1px solid rgba(255,255,255,0.15)' }} />
                          <span style={{ fontSize: 11, color: isH ? 'var(--text1)' : 'var(--text2)', flex: 1 }}>
                            {PANEL_LABELS[p.panel] ?? p.panel.replace(/_/g, ' ')}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                            {Math.round(p.confidence * 100)}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Wrap overlay controls */}
              <div style={{ padding: '12px 13px', borderBottom: '1px solid var(--surface2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Sliders size={12} color="var(--purple)" />
                  <span style={{ fontWeight: 600, fontSize: 12 }}>Wrap Overlay</span>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>Design image</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      type="url"
                      placeholder="Paste design URL..."
                      value={designOverlayUrl.startsWith('data:') ? '' : designOverlayUrl}
                      onChange={e => { setDesignOverlayUrl(e.target.value); if (e.target.value) setShowOverlay(true) }}
                      style={{
                        flex: 1, padding: '5px 8px', fontSize: 11,
                        background: 'var(--bg)', border: '1px solid var(--surface2)',
                        borderRadius: 5, color: 'var(--text1)',
                      }}
                    />
                    <button
                      onClick={() => designFileInputRef.current?.click()}
                      title="Upload design file"
                      style={{ padding: '5px 8px', background: 'var(--surface2)', border: '1px solid var(--surface2)', borderRadius: 5, cursor: 'pointer', color: 'var(--text2)' }}
                    >
                      <FileImage size={13} />
                    </button>
                    <input
                      ref={designFileInputRef} type="file" accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => { if (e.target.files?.[0]) handleDesignFile(e.target.files[0]); e.target.value = '' }}
                    />
                  </div>
                  {designOverlayUrl.startsWith('data:') && (
                    <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 3 }}>
                      Local file loaded
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>
                    <span>Opacity</span><span>{overlayOpacity}%</span>
                  </div>
                  <input
                    type="range" min={10} max={100} value={overlayOpacity}
                    onChange={e => setOverlayOpacity(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {BLEND_MODES.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setBlendMode(m.value)}
                      style={{
                        padding: '2px 7px', fontSize: 10, borderRadius: 4, cursor: 'pointer',
                        border: `1px solid ${blendMode === m.value ? 'var(--accent)' : 'var(--surface2)'}`,
                        background: blendMode === m.value ? 'rgba(79,127,255,0.18)' : 'transparent',
                        color: blendMode === m.value ? 'var(--accent)' : 'var(--text3)',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enhancement actions */}
              <div style={{ padding: '12px 13px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Sparkles size={12} color="var(--amber)" />
                  <span style={{ fontWeight: 600, fontSize: 12 }}>Enhancement</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <button
                    onClick={() => removeBackground(selectedPhoto)}
                    disabled={isRemovingBg(selectedPhoto.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                      borderRadius: 6, background: 'var(--surface2)', border: '1px solid var(--surface2)',
                      color: 'var(--text1)', cursor: isRemovingBg(selectedPhoto.id) ? 'wait' : 'pointer',
                      fontSize: 11, textAlign: 'left', opacity: isRemovingBg(selectedPhoto.id) ? 0.65 : 1,
                    }}
                  >
                    {isRemovingBg(selectedPhoto.id)
                      ? <Loader2 size={13} className="vpm-spin" />
                      : <ImageIcon size={13} color="var(--accent)" />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>Remove Background</div>
                      <div style={{ fontSize: 9, color: 'var(--text3)' }}>
                        {selectedPhoto.bg_removed_url ? 'Regenerate clean version' : 'Isolate vehicle from background'}
                      </div>
                    </div>
                    {selectedPhoto.bg_removed_url && <CheckCircle size={12} color="var(--green)" />}
                  </button>

                  <a
                    href={selectedPhoto.bg_removed_url ?? selectedPhoto.public_url}
                    download={selectedPhoto.file_name}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                      borderRadius: 6, background: 'var(--surface2)', border: '1px solid var(--surface2)',
                      color: 'var(--text1)', textDecoration: 'none', fontSize: 11,
                    }}
                  >
                    <Download size={13} color="var(--text3)" />
                    <div>
                      <div style={{ fontWeight: 600 }}>Download</div>
                      <div style={{ fontSize: 9, color: 'var(--text3)' }}>
                        {selectedPhoto.bg_removed_url ? 'Background-removed version' : 'Original file'}
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen Lightbox ───────────────────────────────────────────── */}
      {lightboxOpen && selectedPhoto && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.94)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            title="Close (Escape)"
            style={{
              position: 'absolute', top: 16, right: 16, zIndex: 10000,
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: '50%', padding: 8, cursor: 'pointer', color: '#fff',
            }}
          >
            <X size={20} />
          </button>

          <div
            style={{ position: 'relative', maxWidth: '92vw', maxHeight: '92vh' }}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.public_url}
              alt={selectedPhoto.file_name}
              style={{ maxWidth: '92vw', maxHeight: '92vh', objectFit: 'contain', borderRadius: 8, display: 'block' }}
            />
            {showPanels && (selectedPhoto.detected_panels?.length ?? 0) > 0 && (
              <div style={{ position: 'absolute', inset: 0 }}>
                <PanelOverlay panels={selectedPhoto.detected_panels!} hoveredPanel={hoveredPanel} />
              </div>
            )}
            {showOverlay && designOverlayUrl && (
              <img
                src={designOverlayUrl}
                alt="overlay"
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'contain', opacity: overlayOpacity / 100,
                  mixBlendMode: blendMode as any, pointerEvents: 'none',
                }}
              />
            )}
          </div>

          {/* Lightbox label */}
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center',
          }}>
            {[selectedPhoto.vehicle_year, selectedPhoto.vehicle_make, selectedPhoto.vehicle_model].filter(Boolean).join(' ')}
            {selectedPhoto.angle && selectedPhoto.angle !== 'unknown' && (
              <span style={{ marginLeft: 8, color: ANGLE_COLORS[selectedPhoto.angle] }}>
                — {ANGLE_SLOTS.find(s => s.key === selectedPhoto.angle)?.label ?? selectedPhoto.angle}
              </span>
            )}
            <span style={{ marginLeft: 8, opacity: 0.5 }}>Press Escape to close</span>
          </div>
        </div>
      )}

      {/* ── Toast notification ────────────────────────────────────────────── */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* ── Scoped styles ─────────────────────────────────────────────────── */}
      <style>{`
        @keyframes vpm-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes vpm-pulse { 0%,100% { opacity:1 } 50% { opacity:0.45 } }
        @keyframes slideUp { from { transform: translateY(12px); opacity:0 } to { transform: translateY(0); opacity:1 } }
        .vpm-spin { animation: vpm-spin 1s linear infinite; }
        .vpm-card .vpm-actions {
          opacity: 0;
          transition: opacity 0.15s;
          position: absolute;
          bottom: 0; left: 0; right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.72));
          padding: 16px 6px 6px;
          display: flex;
          gap: 5px;
          justify-content: flex-end;
        }
        .vpm-card:hover .vpm-actions { opacity: 1; }
      `}</style>
    </div>
  )
}
