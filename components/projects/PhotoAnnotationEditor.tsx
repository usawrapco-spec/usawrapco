'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Circle, Pencil, Undo2, Trash2, Save, Loader2 } from 'lucide-react'

const C = {
  bg: '#0d0f14', surface: '#13151c', surface2: '#1a1d27', border: '#1e2738',
  accent: '#4f7fff', green: '#22c07a', red: '#f25a5a', amber: '#f59e0b',
  text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
}

const INSPECTOR_TAGS = [
  'Hood Damage', 'Rust Spot', 'Existing Wrap', 'Dent', 'Paint Chip',
  'Scratches', 'Clear Coat Failure', 'Trim Damage', 'Door Ding',
  'Windshield Chip', 'Vinyl Lift', 'Bubble', 'Crease', 'Survey Photo',
]

const TAG_COLORS: Record<string, string> = {
  'Hood Damage': '#f25a5a', 'Rust Spot': '#92400e', 'Existing Wrap': '#8b5cf6',
  'Dent': '#f97316', 'Paint Chip': '#f59e0b', 'Scratches': '#eab308',
  'Clear Coat Failure': '#ef4444', 'Trim Damage': '#f97316', 'Door Ding': '#fb923c',
  'Windshield Chip': '#06b6d4', 'Vinyl Lift': '#a855f7', 'Bubble': '#8b5cf6',
  'Crease': '#ec4899', 'Survey Photo': '#4f7fff',
}

const DRAW_COLORS = ['#f25a5a', '#f59e0b', '#4f7fff', '#22c07a', '#ffffff', '#8b5cf6']

export interface PhotoAnnotation {
  id: string
  type: 'circle_marker' | 'freehand'
  x: number
  y: number
  label?: string
  color: string
  data?: { points: { x: number; y: number }[]; strokeWidth: number }
  created_at: string
}

interface Props {
  photoUrl: string
  initialAnnotations: PhotoAnnotation[]
  onSave: (annotations: PhotoAnnotation[]) => Promise<void>
  onClose: () => void
}

export default function PhotoAnnotationEditor({ photoUrl, initialAnnotations, onSave, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const [imgRect, setImgRect] = useState({ left: 0, top: 0, width: 0, height: 0 })
  const [annotations, setAnnotations] = useState<PhotoAnnotation[]>(initialAnnotations)
  const [activeTool, setActiveTool] = useState<'circle_marker' | 'freehand'>('circle_marker')
  const [activeColor, setActiveColor] = useState(DRAW_COLORS[0])
  const [activeTag, setActiveTag] = useState(INSPECTOR_TAGS[0])
  const [drawing, setDrawing] = useState(false)
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([])
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Measure image position after load / resize
  const measureImg = useCallback(() => {
    if (!imgRef.current) return
    const r = imgRef.current.getBoundingClientRect()
    setImgRect({ left: r.left, top: r.top, width: r.width, height: r.height })
  }, [])

  useEffect(() => {
    window.addEventListener('resize', measureImg)
    return () => window.removeEventListener('resize', measureImg)
  }, [measureImg])

  // Convert client coords to percentage of image
  const toPercent = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    if (imgRect.width === 0 || imgRect.height === 0) return null
    const x = ((clientX - imgRect.left) / imgRect.width) * 100
    const y = ((clientY - imgRect.top) / imgRect.height) * 100
    if (x < 0 || x > 100 || y < 0 || y > 100) return null
    return { x, y }
  }, [imgRect])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const pos = toPercent(e.clientX, e.clientY)
    if (!pos) return

    if (activeTool === 'circle_marker') {
      const color = TAG_COLORS[activeTag] || activeColor
      const ann: PhotoAnnotation = {
        id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'circle_marker',
        x: pos.x, y: pos.y,
        label: activeTag,
        color,
        created_at: new Date().toISOString(),
      }
      setAnnotations(prev => [...prev, ann])
      setDirty(true)
    } else {
      setDrawing(true)
      setCurrentPoints([pos])
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
    }
  }, [activeTool, activeTag, activeColor, toPercent])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!drawing) return
    const pos = toPercent(e.clientX, e.clientY)
    if (!pos) return
    setCurrentPoints(prev => [...prev, pos])
  }, [drawing, toPercent])

  const handlePointerUp = useCallback(() => {
    if (!drawing) return
    setDrawing(false)
    if (currentPoints.length >= 2) {
      const ann: PhotoAnnotation = {
        id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'freehand',
        x: currentPoints[0].x, y: currentPoints[0].y,
        color: activeColor,
        data: { points: currentPoints, strokeWidth: 3 },
        created_at: new Date().toISOString(),
      }
      setAnnotations(prev => [...prev, ann])
      setDirty(true)
    }
    setCurrentPoints([])
  }, [drawing, currentPoints, activeColor])

  const undo = () => {
    setAnnotations(prev => prev.slice(0, -1))
    setDirty(true)
  }

  const clearAll = () => {
    setAnnotations([])
    setDirty(true)
  }

  const removeAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave(annotations)
    setSaving(false)
    setDirty(false)
  }

  // Render annotation SVG elements
  const renderAnnotation = (ann: PhotoAnnotation, w: number, h: number) => {
    if (ann.type === 'circle_marker') {
      const cx = (ann.x / 100) * w
      const cy = (ann.y / 100) * h
      return (
        <g key={ann.id}>
          <circle cx={cx} cy={cy} r={14} fill={ann.color} opacity={0.85} stroke="#fff" strokeWidth={2} />
          <text
            x={cx + 20} y={cy + 5}
            fill="#fff" fontSize={13} fontWeight={700}
            style={{ textShadow: `0 1px 4px rgba(0,0,0,0.9), 0 0 8px ${ann.color}` }}
          >
            {ann.label}
          </text>
        </g>
      )
    }
    if (ann.type === 'freehand' && ann.data?.points && ann.data.points.length >= 2) {
      const pts = ann.data.points.map(p => `${(p.x / 100) * w},${(p.y / 100) * h}`).join(' ')
      return (
        <polyline key={ann.id} points={pts} fill="none" stroke={ann.color}
          strokeWidth={ann.data.strokeWidth || 3} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      )
    }
    return null
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        background: C.surface2, borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap',
      }}>
        {/* Tool toggles */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setActiveTool('circle_marker')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6,
              border: `1px solid ${activeTool === 'circle_marker' ? C.amber : C.border}`,
              background: activeTool === 'circle_marker' ? `${C.amber}20` : 'transparent',
              color: activeTool === 'circle_marker' ? C.amber : C.text2,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Circle size={12} /> Marker
          </button>
          <button
            onClick={() => setActiveTool('freehand')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6,
              border: `1px solid ${activeTool === 'freehand' ? C.accent : C.border}`,
              background: activeTool === 'freehand' ? `${C.accent}20` : 'transparent',
              color: activeTool === 'freehand' ? C.accent : C.text2,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Pencil size={12} /> Draw
          </button>
        </div>

        {/* Tag selector (marker mode) */}
        {activeTool === 'circle_marker' && (
          <select
            value={activeTag}
            onChange={e => setActiveTag(e.target.value)}
            style={{
              padding: '6px 10px', background: C.surface, border: `1px solid ${C.amber}`,
              borderRadius: 6, color: C.amber, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {INSPECTOR_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        {/* Color swatches (draw mode) */}
        {activeTool === 'freehand' && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {DRAW_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setActiveColor(c)}
                style={{
                  width: 20, height: 20, borderRadius: '50%', border: `2px solid ${activeColor === c ? '#fff' : 'transparent'}`,
                  background: c, cursor: 'pointer',
                }}
              />
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Actions */}
        <button onClick={undo} disabled={annotations.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.text2, fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: annotations.length === 0 ? 0.4 : 1 }}>
          <Undo2 size={12} /> Undo
        </button>
        <button onClick={clearAll} disabled={annotations.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.red, fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: annotations.length === 0 ? 0.4 : 1 }}>
          <Trash2 size={12} /> Clear
        </button>
        <button onClick={handleSave} disabled={saving || !dirty}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 6, border: 'none', background: dirty ? C.green : C.surface, color: dirty ? '#fff' : C.text3, fontSize: 11, fontWeight: 700, cursor: dirty ? 'pointer' : 'default' }}>
          {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={12} />}
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.text2, cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>

      {/* ── Image + SVG Overlay ── */}
      <div ref={containerRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: 20 }}>
        <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', maxHeight: '100%' }}>
          <img
            ref={imgRef}
            src={photoUrl}
            alt=""
            crossOrigin="anonymous"
            onLoad={measureImg}
            style={{ maxWidth: 'calc(100vw - 40px)', maxHeight: 'calc(100vh - 140px)', borderRadius: 8, objectFit: 'contain', display: 'block', userSelect: 'none' }}
            draggable={false}
          />
          <svg
            ref={svgRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              cursor: activeTool === 'circle_marker' ? 'crosshair' : 'crosshair',
              touchAction: 'none',
            }}
          >
            {/* Saved annotations */}
            {annotations.map(ann => renderAnnotation(ann, imgRect.width, imgRect.height))}

            {/* Live freehand preview */}
            {drawing && currentPoints.length >= 2 && (
              <polyline
                points={currentPoints.map(p => `${(p.x / 100) * imgRect.width},${(p.y / 100) * imgRect.height}`).join(' ')}
                fill="none" stroke={activeColor} strokeWidth={3}
                strokeLinecap="round" strokeLinejoin="round" opacity={0.7}
              />
            )}
          </svg>
        </div>
      </div>

      {/* ── Annotation List (bottom bar) ── */}
      {annotations.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, padding: '8px 16px', background: C.surface2,
          borderTop: `1px solid ${C.border}`, overflowX: 'auto', flexShrink: 0,
        }}>
          {annotations.map((ann, i) => (
            <div key={ann.id} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
              background: `${ann.color}18`, border: `1px solid ${ann.color}40`,
              borderRadius: 6, flexShrink: 0,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: ann.color }} />
              <span style={{ fontSize: 11, color: C.text1, fontWeight: 600 }}>
                {ann.type === 'circle_marker' ? ann.label : `Stroke ${i + 1}`}
              </span>
              <button
                onClick={() => removeAnnotation(ann.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text3, padding: 2, display: 'flex' }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
