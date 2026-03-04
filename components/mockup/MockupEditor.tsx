'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  X, Plus, Trash2, Download, Loader2, Type, AlignLeft,
  AlignCenter, AlignRight, Bold, ChevronUp, ChevronDown,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TextLayer {
  id: string
  text: string
  x: number       // percentage 0–100 of container width
  y: number       // percentage 0–100 of container height
  fontSize: number
  fontFamily: string
  color: string
  fontWeight: 'normal' | 'bold'
  align: 'left' | 'center' | 'right'
  opacity: number
  rotation: number
}

interface Props {
  imageUrl: string
  onClose: () => void
  onSaved?: (url: string) => void
}

const FONTS = ['Impact', 'Bebas Neue', 'Oswald', 'Montserrat', 'Arial', 'Helvetica']

const PRESET_COLORS = [
  '#ffffff', '#000000', '#f25a5a', '#4f7fff', '#22c07a',
  '#f59e0b', '#8b5cf6', '#22d3ee', '#e8eaed', '#9299b5',
]

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MockupEditor({ imageUrl, onClose, onSaved }: Props) {
  const [layers, setLayers] = useState<TextLayer[]>([
    {
      id: uid(), text: 'YOUR COMPANY', x: 50, y: 45,
      fontSize: 48, fontFamily: 'Impact', color: '#ffffff',
      fontWeight: 'bold', align: 'center', opacity: 1, rotation: 0,
    },
  ])
  const [selectedId, setSelectedId] = useState<string | null>(layers[0]?.id || null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = layers.find(l => l.id === selectedId) || null

  function updateLayer(id: string, patch: Partial<TextLayer>) {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }

  function addLayer() {
    const newLayer: TextLayer = {
      id: uid(), text: 'NEW TEXT', x: 50, y: 60,
      fontSize: 32, fontFamily: 'Impact', color: '#ffffff',
      fontWeight: 'bold', align: 'center', opacity: 1, rotation: 0,
    }
    setLayers(prev => [...prev, newLayer])
    setSelectedId(newLayer.id)
  }

  function deleteLayer(id: string) {
    setLayers(prev => prev.filter(l => l.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  function moveLayerUp(id: string) {
    setLayers(prev => {
      const i = prev.findIndex(l => l.id === id)
      if (i <= 0) return prev
      const next = [...prev]
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      return next
    })
  }

  function moveLayerDown(id: string) {
    setLayers(prev => {
      const i = prev.findIndex(l => l.id === id)
      if (i >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
      return next
    })
  }

  // ── Drag ────────────────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedId(id)
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const layer = layers.find(l => l.id === id)
    if (!layer) return
    const currentX = (layer.x / 100) * rect.width
    const currentY = (layer.y / 100) * rect.height
    setDragOffset({
      x: e.clientX - rect.left - currentX,
      y: e.clientY - rect.top - currentY,
    })
    setDragging(id)
  }, [layers])

  useEffect(() => {
    if (!dragging) return

    function onMove(e: MouseEvent) {
      if (!dragging) return
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const rawX = e.clientX - rect.left - dragOffset.x
      const rawY = e.clientY - rect.top - dragOffset.y
      const x = Math.max(0, Math.min(100, (rawX / rect.width) * 100))
      const y = Math.max(0, Math.min(100, (rawY / rect.height) * 100))
      updateLayer(dragging, { x, y })
    }

    function onUp() { setDragging(null) }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, dragOffset])

  // ── Export ──────────────────────────────────────────────────────────────────

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    try {
      const res = await fetch('/api/mockup/export-edited', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, layers }),
      })
      if (!res.ok) {
        const data = await res.json()
        setExportError(data.error || 'Export failed')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mockup-edited-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
      if (onSaved) onSaved(url)
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  // ── Styles ───────────────────────────────────────────────────────────────────

  const inp: React.CSSProperties = {
    width: '100%', padding: '7px 10px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--surface2)',
    color: 'var(--text1)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        height: 52, background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Type size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>Mockup Editor</span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Drag text layers to position · Click to select</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {exportError && <span style={{ fontSize: 11, color: 'var(--red)' }}>{exportError}</span>}
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 7,
              background: exporting ? 'rgba(34,192,122,0.5)' : 'var(--green)',
              color: '#fff', fontSize: 12, fontWeight: 700, border: 'none', cursor: exporting ? 'not-allowed' : 'pointer',
            }}
          >
            {exporting ? <><Loader2 size={13} className="animate-spin" /> Exporting…</> : <><Download size={13} /> Export PNG</>}
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left panel — layer controls */}
        <div style={{
          width: 260, background: 'var(--surface)', borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
        }}>
          {/* Layer list */}
          <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Text Layers</span>
              <button
                onClick={addLayer}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: 'rgba(79,127,255,0.12)', border: '1px solid rgba(79,127,255,0.25)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                <Plus size={11} /> Add Text
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {layers.map((l, i) => (
                <div
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  style={{
                    padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
                    background: selectedId === l.id ? 'rgba(79,127,255,0.1)' : 'var(--surface2)',
                    border: selectedId === l.id ? '1px solid rgba(79,127,255,0.3)' : '1px solid transparent',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: l.color, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.text || '(empty)'}</span>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); moveLayerUp(l.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, display: 'flex' }} title="Move up">
                      <ChevronUp size={11} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); moveLayerDown(l.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, display: 'flex' }} title="Move down">
                      <ChevronDown size={11} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteLayer(l.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, display: 'flex' }} title="Delete">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected layer controls */}
          {selected && (
            <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Text content */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Text</label>
                <textarea
                  value={selected.text}
                  onChange={e => updateLayer(selected.id, { text: e.target.value })}
                  style={{ ...inp, minHeight: 56, resize: 'vertical', lineHeight: 1.4 }}
                />
              </div>

              {/* Font */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Font</label>
                <select value={selected.fontFamily} onChange={e => updateLayer(selected.id, { fontFamily: e.target.value })} style={{ ...inp, appearance: 'none' }}>
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {/* Size + Weight + Align row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 6, alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Size</label>
                  <input type="number" min={8} max={200} value={selected.fontSize}
                    onChange={e => updateLayer(selected.id, { fontSize: Number(e.target.value) })}
                    style={{ ...inp }} />
                </div>
                <button
                  onClick={() => updateLayer(selected.id, { fontWeight: selected.fontWeight === 'bold' ? 'normal' : 'bold' })}
                  style={{ padding: '7px 9px', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--border)', background: selected.fontWeight === 'bold' ? 'var(--accent)' : 'var(--surface2)', color: selected.fontWeight === 'bold' ? '#fff' : 'var(--text2)' }}
                  title="Bold"
                >
                  <Bold size={13} />
                </button>
                {(['left', 'center', 'right'] as const).map(a => (
                  <button key={a}
                    onClick={() => updateLayer(selected.id, { align: a })}
                    style={{ padding: '7px 9px', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--border)', background: selected.align === a ? 'var(--accent)' : 'var(--surface2)', color: selected.align === a ? '#fff' : 'var(--text2)' }}
                    title={`Align ${a}`}
                  >
                    {a === 'left' ? <AlignLeft size={12} /> : a === 'center' ? <AlignCenter size={12} /> : <AlignRight size={12} />}
                  </button>
                ))}
              </div>

              {/* Color */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Color</label>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => updateLayer(selected.id, { color: c })}
                      style={{ width: 22, height: 22, borderRadius: 4, background: c, border: selected.color === c ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="color" value={selected.color} onChange={e => updateLayer(selected.id, { color: e.target.value })}
                    style={{ width: 32, height: 28, borderRadius: 5, border: '1px solid var(--border)', cursor: 'pointer', padding: 2 }} />
                  <input value={selected.color} onChange={e => updateLayer(selected.id, { color: e.target.value })}
                    style={{ ...inp, flex: 1, fontFamily: 'JetBrains Mono, monospace' }} />
                </div>
              </div>

              {/* Opacity */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>
                  Opacity: {Math.round(selected.opacity * 100)}%
                </label>
                <input type="range" min={0} max={1} step={0.01} value={selected.opacity}
                  onChange={e => updateLayer(selected.id, { opacity: Number(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer' }} />
              </div>

              {/* Rotation */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>
                  Rotation: {selected.rotation}°
                </label>
                <input type="range" min={-180} max={180} step={1} value={selected.rotation}
                  onChange={e => updateLayer(selected.id, { rotation: Number(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer' }} />
              </div>

              {/* Position */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>X %</label>
                  <input type="number" min={0} max={100} value={Math.round(selected.x)}
                    onChange={e => updateLayer(selected.id, { x: Number(e.target.value) })}
                    style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Y %</label>
                  <input type="number" min={0} max={100} value={Math.round(selected.y)}
                    onChange={e => updateLayer(selected.id, { y: Number(e.target.value) })}
                    style={inp} />
                </div>
              </div>
            </div>
          )}

          {!selected && layers.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
              Click "Add Text" to add a text layer
            </div>
          )}
        </div>

        {/* Canvas area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'hidden', background: '#0a0b0f' }}>
          <div
            ref={containerRef}
            onClick={() => setSelectedId(null)}
            style={{
              position: 'relative',
              maxWidth: '100%',
              maxHeight: '100%',
              lineHeight: 0,
              userSelect: 'none',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Mockup"
              draggable={false}
              style={{ display: 'block', maxWidth: '100%', maxHeight: 'calc(100vh - 140px)', objectFit: 'contain' }}
            />

            {/* Text layers */}
            {layers.map(l => (
              <div
                key={l.id}
                onMouseDown={e => handleMouseDown(e, l.id)}
                style={{
                  position: 'absolute',
                  left: `${l.x}%`,
                  top: `${l.y}%`,
                  transform: `translate(-50%, -50%) rotate(${l.rotation}deg)`,
                  cursor: dragging === l.id ? 'grabbing' : 'grab',
                  fontSize: l.fontSize,
                  fontFamily: `${l.fontFamily}, Impact, Arial Black, sans-serif`,
                  fontWeight: l.fontWeight,
                  color: l.color,
                  opacity: l.opacity,
                  textAlign: l.align,
                  whiteSpace: 'pre-wrap',
                  textShadow: '1px 1px 4px rgba(0,0,0,0.8), -1px -1px 4px rgba(0,0,0,0.8)',
                  WebkitTextStroke: '0.5px rgba(0,0,0,0.5)',
                  lineHeight: 1.1,
                  outline: selectedId === l.id ? '2px dashed rgba(79,127,255,0.7)' : 'none',
                  outlineOffset: 4,
                  padding: '2px 4px',
                }}
              >
                {l.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
