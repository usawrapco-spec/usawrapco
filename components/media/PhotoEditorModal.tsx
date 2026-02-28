'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, RotateCcw, RotateCw, FlipHorizontal, FlipVertical,
  Type, Square, Circle, Pen, Undo, Redo, Download, Save,
  Sun, Contrast, Droplets, Crop, RefreshCw, ZoomIn,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  photoUrl: string
  jobTitle?: string
  projectId?: string
  onClose: () => void
  onSaved?: (newUrl: string) => void
}

// We load fabric lazily to avoid SSR issues
let fabricLoaded = false

export default function PhotoEditorModal({ photoUrl, jobTitle, projectId, onClose, onSaved }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const imageRef = useRef<any>(null)
  const [fabricCanvas, setFabricCanvas] = useState<any>(null)
  const [tool, setTool] = useState<'select' | 'draw' | 'text' | 'rect' | 'circle'>('select')
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [saturation, setSaturation] = useState(0)
  const [drawColor, setDrawColor] = useState('#ff0000')
  const [drawWidth, setDrawWidth] = useState(4)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const supabase = createClient()

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Load fabric.js dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return
    const load = async () => {
      const mod = await import('fabric')
      fabricRef.current = mod
      await initCanvas(mod)
    }
    load()
  }, [])

  async function initCanvas(fabric: any) {
    if (!canvasRef.current) return
    const fc = new fabric.Canvas(canvasRef.current, {
      preserveObjectStacking: true,
      selection: true,
    })
    setFabricCanvas(fc)

    // Load image — Fabric.js v7 uses Promise-based fromURL
    try {
      const img = await fabric.Image.fromURL(photoUrl, { crossOrigin: 'anonymous' })
      if (!img) return
      const maxW = Math.min(window.innerWidth - 80, 900)
      const maxH = Math.min(window.innerHeight - 240, 600)
      const scale = Math.min(maxW / img.width, maxH / img.height, 1)
      fc.setWidth(img.width * scale)
      fc.setHeight(img.height * scale)
      img.scale(scale)
      img.set({ left: 0, top: 0, selectable: false, evented: false })
      fc.add(img)
      fc.sendToBack(img)
      imageRef.current = img
      fc.renderAll()
    } catch (e) {
      console.error('[PhotoEditor] Image load failed:', e)
    }
  }

  useEffect(() => {
    if (!fabricCanvas) return
    // Keyboard undo/redo
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { fabricCanvas.undo?.(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { fabricCanvas.redo?.(); return }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = fabricCanvas.getActiveObject()
        if (active && active !== imageRef.current) {
          fabricCanvas.remove(active)
          fabricCanvas.renderAll()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [fabricCanvas])

  // Apply image filters
  useEffect(() => {
    if (!fabricCanvas || !imageRef.current) return
    const img = imageRef.current
    const fabric = fabricRef.current
    if (!fabric) return
    img.filters = [
      new fabric.filters.Brightness({ brightness: brightness / 100 }),
      new fabric.filters.Contrast({ contrast: contrast / 100 }),
      new fabric.filters.Saturation({ saturation: saturation / 100 }),
    ]
    img.applyFilters()
    fabricCanvas.renderAll()
  }, [brightness, contrast, saturation, fabricCanvas])

  // Tool switching
  useEffect(() => {
    if (!fabricCanvas) return
    fabricCanvas.isDrawingMode = tool === 'draw'
    if (tool === 'draw') {
      fabricCanvas.freeDrawingBrush.color = drawColor
      fabricCanvas.freeDrawingBrush.width = drawWidth
    }
  }, [tool, fabricCanvas, drawColor, drawWidth])

  function handleRotateLeft() {
    if (!imageRef.current || !fabricCanvas) return
    imageRef.current.set('angle', (imageRef.current.angle || 0) - 90)
    fabricCanvas.renderAll()
  }
  function handleRotateRight() {
    if (!imageRef.current || !fabricCanvas) return
    imageRef.current.set('angle', (imageRef.current.angle || 0) + 90)
    fabricCanvas.renderAll()
  }
  function handleFlipH() {
    if (!imageRef.current || !fabricCanvas) return
    imageRef.current.set('flipX', !imageRef.current.flipX)
    fabricCanvas.renderAll()
  }
  function handleFlipV() {
    if (!imageRef.current || !fabricCanvas) return
    imageRef.current.set('flipY', !imageRef.current.flipY)
    fabricCanvas.renderAll()
  }
  function handleAddText() {
    if (!fabricCanvas || !fabricRef.current) return
    const text = new fabricRef.current.IText('Edit me', {
      left: 50, top: 50, fontSize: 28, fill: drawColor, fontFamily: 'Arial',
      fontWeight: 'bold',
    })
    fabricCanvas.add(text)
    fabricCanvas.setActiveObject(text)
    fabricCanvas.renderAll()
    setTool('select')
  }
  function handleAddRect() {
    if (!fabricCanvas || !fabricRef.current) return
    const rect = new fabricRef.current.Rect({
      left: 50, top: 50, width: 120, height: 80,
      fill: 'transparent', stroke: drawColor, strokeWidth: 3,
    })
    fabricCanvas.add(rect)
    fabricCanvas.setActiveObject(rect)
    fabricCanvas.renderAll()
    setTool('select')
  }
  function handleAddCircle() {
    if (!fabricCanvas || !fabricRef.current) return
    const circle = new fabricRef.current.Circle({
      left: 50, top: 50, radius: 50,
      fill: 'transparent', stroke: drawColor, strokeWidth: 3,
    })
    fabricCanvas.add(circle)
    fabricCanvas.setActiveObject(circle)
    fabricCanvas.renderAll()
    setTool('select')
  }
  function handleReset() {
    if (!fabricCanvas || !imageRef.current) return
    // Remove all non-image objects
    fabricCanvas.getObjects().forEach((obj: any) => {
      if (obj !== imageRef.current) fabricCanvas.remove(obj)
    })
    imageRef.current.set({ angle: 0, flipX: false, flipY: false })
    imageRef.current.filters = []
    imageRef.current.applyFilters()
    setBrightness(0); setContrast(0); setSaturation(0)
    fabricCanvas.renderAll()
  }

  function handleDownload() {
    if (!fabricCanvas) return
    const dataUrl = fabricCanvas.toDataURL({ format: 'jpeg', quality: 0.92 })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `edited-${Date.now()}.jpg`
    a.click()
  }

  async function handleSaveAsNew() {
    if (!fabricCanvas || !projectId) { showToast('Project ID required to save'); return }
    setSaving(true)
    try {
      const dataUrl = fabricCanvas.toDataURL({ format: 'jpeg', quality: 0.92 })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const fileName = `edited-${Date.now()}.jpg`
      const filePath = `projects/${projectId}/${fileName}`
      const { error: uploadErr } = await supabase.storage
        .from('project-files')
        .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true })
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(filePath)
      const newUrl = urlData.publicUrl
      // Save record to job_photos
      await supabase.from('job_photos').insert({
        project_id: projectId,
        url: newUrl,
        photo_type: 'after',
        caption: `Edited version — ${new Date().toLocaleDateString()}`,
      })
      onSaved?.(newUrl)
      showToast('Saved as new photo')
    } catch (err) {
      showToast('Save failed')
    }
    setSaving(false)
  }

  const TOOLBAR_STYLE = {
    display: 'flex', flexDirection: 'column' as const, gap: 6, padding: '12px 10px',
    background: 'var(--surface)', borderRight: '1px solid var(--surface2)',
    width: 52, alignItems: 'center',
  }
  const btnStyle = (active?: boolean) => ({
    width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: active ? 'var(--accent)' : 'var(--bg)',
    color: active ? '#fff' : 'var(--text2)',
  })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9995,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', background: 'var(--surface)',
        borderBottom: '1px solid var(--surface2)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 15, fontWeight: 800, color: 'var(--text1)',
            fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            Canvas Editor
          </span>
          {jobTitle && (
            <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>{jobTitle}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleDownload} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px',
            borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--bg)',
            color: 'var(--text1)', fontSize: 12, cursor: 'pointer',
          }}>
            <Download size={13} /> Download
          </button>
          {projectId && (
            <button onClick={handleSaveAsNew} disabled={saving} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px',
              borderRadius: 8, border: 'none', background: 'var(--green)',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
            }}>
              <Save size={13} /> {saving ? 'Saving...' : 'Save as New'}
            </button>
          )}
          <button onClick={onClose} style={{
            padding: '6px 12px', borderRadius: 8, border: '1px solid var(--surface2)',
            background: 'transparent', color: 'var(--text2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
          }}>
            <X size={13} /> Close
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left toolbar */}
        <div style={TOOLBAR_STYLE}>
          <button onClick={() => setTool('select')} style={btnStyle(tool === 'select')} title="Select"><ZoomIn size={16} /></button>
          <button onClick={() => setTool('draw')} style={btnStyle(tool === 'draw')} title="Draw"><Pen size={16} /></button>
          <button onClick={handleAddText} style={btnStyle()} title="Add Text"><Type size={16} /></button>
          <button onClick={handleAddRect} style={btnStyle()} title="Rectangle"><Square size={16} /></button>
          <button onClick={handleAddCircle} style={btnStyle()} title="Circle"><Circle size={16} /></button>
          <div style={{ width: '100%', height: 1, background: 'var(--surface2)', margin: '4px 0' }} />
          <button onClick={handleRotateLeft} style={btnStyle()} title="Rotate Left"><RotateCcw size={16} /></button>
          <button onClick={handleRotateRight} style={btnStyle()} title="Rotate Right"><RotateCw size={16} /></button>
          <button onClick={handleFlipH} style={btnStyle()} title="Flip Horizontal"><FlipHorizontal size={16} /></button>
          <button onClick={handleFlipV} style={btnStyle()} title="Flip Vertical"><FlipVertical size={16} /></button>
          <div style={{ width: '100%', height: 1, background: 'var(--surface2)', margin: '4px 0' }} />
          <button onClick={handleReset} style={btnStyle()} title="Reset"><RefreshCw size={16} /></button>
        </div>

        {/* Canvas area */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
          <canvas ref={canvasRef} />
        </div>

        {/* Right panel */}
        <div style={{
          width: 220, flexShrink: 0, background: 'var(--surface)',
          borderLeft: '1px solid var(--surface2)', padding: 16,
          display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto',
        }}>
          {/* Color + stroke */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Color</div>
            <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)}
              style={{ width: '100%', height: 36, borderRadius: 8, border: 'none', cursor: 'pointer' }} />
            {tool === 'draw' && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 6 }}>Brush Width: {drawWidth}px</div>
                <input type="range" min={1} max={30} value={drawWidth} onChange={e => setDrawWidth(+e.target.value)} style={{ width: '100%' }} />
              </div>
            )}
          </div>

          {/* Adjustments */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Adjustments</div>
            <AdjustSlider icon={<Sun size={12} />} label="Brightness" value={brightness} onChange={setBrightness} />
            <AdjustSlider icon={<Contrast size={12} />} label="Contrast" value={contrast} onChange={setContrast} />
            <AdjustSlider icon={<Droplets size={12} />} label="Saturation" value={saturation} onChange={setSaturation} />
          </div>
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface2)', border: '1px solid var(--surface2)',
          borderRadius: 8, padding: '8px 16px', color: 'var(--text1)', fontSize: 13, fontWeight: 600,
          zIndex: 10000,
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}

function AdjustSlider({ icon, label, value, onChange }: {
  icon: React.ReactNode; label: string; value: number; onChange: (v: number) => void
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text2)' }}>
          {icon} {label}
        </div>
        <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{value}</span>
      </div>
      <input
        type="range" min={-100} max={100} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ width: '100%' }}
      />
    </div>
  )
}
