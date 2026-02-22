'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'
import {
  ArrowLeft, Save, Type, Square, Circle, Upload, Image as ImageIcon,
  Undo2, Redo2, Trash2, Move, Palette, Send, MessageCircle,
  FileText, Lightbulb, Clock, ZoomIn, ZoomOut, Layers,
} from 'lucide-react'

interface DesignCanvasClientProps {
  profile: Profile
  design: any
  jobImages: any[]
  comments: any[]
}

interface CanvasObject {
  id: string
  type: 'rect' | 'circle' | 'text' | 'image'
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  text?: string
  fontSize?: number
  fontWeight?: number
  imageSrc?: string
  rotation: number
  opacity: number
}

type Tool = 'select' | 'rect' | 'circle' | 'text' | 'image'

const COLORS = ['#4f7fff', '#22c07a', '#f25a5a', '#f59e0b', '#8b5cf6', '#22d3ee', '#ffffff', '#000000', '#e8eaed', '#ff6b6b']

export default function DesignCanvasClient({ profile, design, jobImages, comments: initialComments }: DesignCanvasClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [objects, setObjects] = useState<CanvasObject[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [fillColor, setFillColor] = useState('#4f7fff')
  const [zoom, setZoom] = useState(1)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'brief' | 'ai' | 'tools' | 'history'>('tools')
  const [comments, setComments] = useState(initialComments)
  const [newComment, setNewComment] = useState('')
  const [aiFeedback, setAiFeedback] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [undoStack, setUndoStack] = useState<CanvasObject[][]>([])
  const [redoStack, setRedoStack] = useState<CanvasObject[][]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const linkedJob = design.linked_project || null
  const formData = linkedJob?.form_data || {}

  // Load saved canvas data
  useEffect(() => {
    if (design.canvas_data) {
      try {
        const parsed = JSON.parse(design.canvas_data)
        if (Array.isArray(parsed)) setObjects(parsed)
      } catch {}
    }
  }, [design.id])

  // Redraw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)
    ctx.save()
    ctx.scale(zoom, zoom)

    // Background grid
    ctx.fillStyle = '#1a1d27'
    ctx.fillRect(0, 0, w / zoom, h / zoom)
    ctx.strokeStyle = 'rgba(90,96,128,0.15)'
    ctx.lineWidth = 1
    for (let x = 0; x < w / zoom; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h / zoom); ctx.stroke()
    }
    for (let y = 0; y < h / zoom; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w / zoom, y); ctx.stroke()
    }

    // Draw objects
    objects.forEach(obj => {
      ctx.save()
      ctx.globalAlpha = obj.opacity
      ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2)
      ctx.rotate((obj.rotation * Math.PI) / 180)
      ctx.translate(-(obj.x + obj.width / 2), -(obj.y + obj.height / 2))

      if (obj.type === 'rect') {
        ctx.fillStyle = obj.fill
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height)
        if (obj.strokeWidth > 0) {
          ctx.strokeStyle = obj.stroke
          ctx.lineWidth = obj.strokeWidth
          ctx.strokeRect(obj.x, obj.y, obj.width, obj.height)
        }
      } else if (obj.type === 'circle') {
        ctx.fillStyle = obj.fill
        ctx.beginPath()
        ctx.ellipse(obj.x + obj.width / 2, obj.y + obj.height / 2, obj.width / 2, obj.height / 2, 0, 0, Math.PI * 2)
        ctx.fill()
        if (obj.strokeWidth > 0) {
          ctx.strokeStyle = obj.stroke
          ctx.lineWidth = obj.strokeWidth
          ctx.stroke()
        }
      } else if (obj.type === 'text') {
        ctx.fillStyle = obj.fill
        ctx.font = `${obj.fontWeight || 700} ${obj.fontSize || 24}px Barlow Condensed, sans-serif`
        ctx.fillText(obj.text || 'Text', obj.x, obj.y + (obj.fontSize || 24))
      } else if (obj.type === 'image' && obj.imageSrc) {
        const img = new window.Image()
        img.src = obj.imageSrc
        try { ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height) } catch {}
      }

      // Selection outline
      if (obj.id === selectedId) {
        ctx.strokeStyle = '#4f7fff'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 3])
        ctx.strokeRect(obj.x - 2, obj.y - 2, obj.width + 4, obj.height + 4)
        ctx.setLineDash([])
      }

      ctx.restore()
    })

    ctx.restore()
  }, [objects, selectedId, zoom])

  useEffect(() => { drawCanvas() }, [drawCanvas])

  // Resize canvas to fit container
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
      drawCanvas()
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [drawCanvas])

  const pushUndo = () => {
    setUndoStack(prev => [...prev.slice(-20), [...objects]])
    setRedoStack([])
  }

  const undo = () => {
    if (undoStack.length === 0) return
    setRedoStack(prev => [...prev, [...objects]])
    const last = undoStack[undoStack.length - 1]
    setUndoStack(prev => prev.slice(0, -1))
    setObjects(last)
  }

  const redo = () => {
    if (redoStack.length === 0) return
    setUndoStack(prev => [...prev, [...objects]])
    const last = redoStack[redoStack.length - 1]
    setRedoStack(prev => prev.slice(0, -1))
    setObjects(last)
  }

  const addObject = (type: CanvasObject['type'], extra: Partial<CanvasObject> = {}) => {
    pushUndo()
    const canvas = canvasRef.current
    const cx = (canvas?.width || 800) / 2 / zoom
    const cy = (canvas?.height || 600) / 2 / zoom
    const obj: CanvasObject = {
      id: crypto.randomUUID(),
      type,
      x: cx - 50,
      y: cy - 30,
      width: type === 'text' ? 200 : 100,
      height: type === 'text' ? 40 : 100,
      fill: fillColor,
      stroke: '#ffffff',
      strokeWidth: 0,
      rotation: 0,
      opacity: 1,
      fontSize: 24,
      fontWeight: 700,
      text: type === 'text' ? 'New Text' : undefined,
      ...extra,
    }
    setObjects(prev => [...prev, obj])
    setSelectedId(obj.id)
    setTool('select')
  }

  // Canvas mouse events
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / zoom
    const my = (e.clientY - rect.top) / zoom

    if (tool === 'rect') { addObject('rect'); return }
    if (tool === 'circle') { addObject('circle'); return }
    if (tool === 'text') {
      const text = prompt('Enter text:')
      if (text) addObject('text', { text, x: mx, y: my })
      return
    }

    // Select mode: find clicked object
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i]
      if (mx >= obj.x && mx <= obj.x + obj.width && my >= obj.y && my <= obj.y + obj.height) {
        setSelectedId(obj.id)
        setIsDragging(true)
        setDragOffset({ x: mx - obj.x, y: my - obj.y })
        return
      }
    }
    setSelectedId(null)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedId) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / zoom
    const my = (e.clientY - rect.top) / zoom

    setObjects(prev => prev.map(obj =>
      obj.id === selectedId ? { ...obj, x: mx - dragOffset.x, y: my - dragOffset.y } : obj
    ))
  }

  const handleCanvasMouseUp = () => {
    if (isDragging) pushUndo()
    setIsDragging(false)
  }

  const deleteSelected = () => {
    if (!selectedId) return
    pushUndo()
    setObjects(prev => prev.filter(o => o.id !== selectedId))
    setSelectedId(null)
  }

  const selectedObj = objects.find(o => o.id === selectedId)

  const updateSelected = (updates: Partial<CanvasObject>) => {
    if (!selectedId) return
    setObjects(prev => prev.map(obj => obj.id === selectedId ? { ...obj, ...updates } : obj))
  }

  // Save canvas
  const saveCanvas = async () => {
    setSaving(true)
    await supabase.from('design_projects').update({
      canvas_data: JSON.stringify(objects),
      updated_at: new Date().toISOString(),
    }).eq('id', design.id)
    setSaving(false)
  }

  // Add comment
  const addComment = async () => {
    if (!newComment.trim()) return
    const { data } = await supabase.from('design_project_comments').insert({
      design_project_id: design.id,
      author_id: profile.id,
      content: newComment.trim(),
    }).select('*, author:author_id(id, name)').single()
    if (data) setComments(prev => [data, ...prev])
    setNewComment('')
  }

  // Request AI feedback
  const requestAiFeedback = async () => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/design-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId: design.id,
          canvasObjects: objects,
          briefData: {
            clientName: design.client_name,
            designType: design.design_type,
            description: design.description,
            vehicle: formData.vehicle || linkedJob?.vehicle_desc,
          },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiFeedback(data)
      }
    } catch {}
    setAiLoading(false)
  }

  // Send proof — exports canvas as PNG and creates a design_proofs record
  const sendProof = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setSaving(true)
    try {
      // Save canvas state first
      await supabase.from('design_projects').update({
        canvas_data: JSON.stringify(objects),
        updated_at: new Date().toISOString(),
      }).eq('id', design.id)

      // Export canvas to blob
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Failed to export canvas')

      // Upload to Supabase storage
      const fileName = `proofs/${design.id}/${Date.now()}.png`
      const { error: uploadErr } = await supabase.storage
        .from('job-images')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true })
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('job-images').getPublicUrl(fileName)
      const publicUrl = urlData?.publicUrl || ''

      // Create proof record if there's a linked project
      if (design.project_id) {
        await supabase.from('design_proofs').insert({
          org_id: profile.org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
          project_id: design.project_id,
          image_url: publicUrl,
          designer_notes: `Proof from Design Studio for ${design.client_name}`,
          sent_by: profile.id,
        })
      }

      // Update design status
      await supabase.from('design_projects').update({
        status: 'proof_sent',
      }).eq('id', design.id)

      alert('Proof sent successfully!')
    } catch (err: any) {
      console.error('Send proof error:', err)
      alert('Error sending proof: ' + (err.message || 'Unknown error'))
    }
    setSaving(false)
  }

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new window.Image()
      img.onload = () => {
        addObject('image', {
          imageSrc: ev.target?.result as string,
          width: Math.min(img.width, 300),
          height: Math.min(img.height, 300),
        })
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const toolItems: { key: Tool; icon: typeof Move; label: string }[] = [
    { key: 'select', icon: Move, label: 'Select' },
    { key: 'rect', icon: Square, label: 'Rectangle' },
    { key: 'circle', icon: Circle, label: 'Circle' },
    { key: 'text', icon: Type, label: 'Text' },
  ]

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left: Canvas Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
          background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        }}>
          <button onClick={() => router.push('/design')} style={toolBtnStyle}>
            <ArrowLeft size={14} />
          </button>
          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

          {toolItems.map(t => (
            <button
              key={t.key}
              onClick={() => setTool(t.key)}
              title={t.label}
              style={{
                ...toolBtnStyle,
                background: tool === t.key ? 'var(--accent)' : 'transparent',
                color: tool === t.key ? '#fff' : 'var(--text3)',
              }}
            >
              <t.icon size={14} />
            </button>
          ))}

          <button onClick={() => fileInputRef.current?.click()} title="Add Image" style={toolBtnStyle}>
            <Upload size={14} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

          <button onClick={undo} disabled={undoStack.length === 0} title="Undo" style={{ ...toolBtnStyle, opacity: undoStack.length === 0 ? 0.3 : 1 }}>
            <Undo2 size={14} />
          </button>
          <button onClick={redo} disabled={redoStack.length === 0} title="Redo" style={{ ...toolBtnStyle, opacity: redoStack.length === 0 ? 0.3 : 1 }}>
            <Redo2 size={14} />
          </button>
          <button onClick={deleteSelected} disabled={!selectedId} title="Delete" style={{ ...toolBtnStyle, opacity: selectedId ? 1 : 0.3 }}>
            <Trash2 size={14} />
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.1))} title="Zoom Out" style={toolBtnStyle}>
            <ZoomOut size={14} />
          </button>
          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text3)', minWidth: 40, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} title="Zoom In" style={toolBtnStyle}>
            <ZoomIn size={14} />
          </button>

          <div style={{ flex: 1 }} />

          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {design.client_name}
          </div>

          <button
            onClick={sendProof}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 6, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Send size={12} />
            Send Proof
          </button>
          <button
            onClick={saveCanvas}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 6, border: 'none',
              background: 'var(--green)', color: '#0d1a10',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Save size={12} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: tool === 'select' ? (isDragging ? 'grabbing' : 'default') : 'crosshair' }}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            style={{ display: 'block', width: '100%', height: '100%' }}
          />
          {/* Object count badge */}
          <div style={{
            position: 'absolute', bottom: 12, left: 12,
            padding: '4px 10px', borderRadius: 6, background: 'rgba(13,15,20,0.8)',
            fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Layers size={12} /> {objects.length} objects
          </div>
        </div>
      </div>

      {/* Right: Panel */}
      <div style={{
        width: 340, flexShrink: 0, borderLeft: '1px solid var(--border)',
        background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {([
            { key: 'tools' as const, label: 'Tools', icon: Palette },
            { key: 'brief' as const, label: 'Brief', icon: FileText },
            { key: 'ai' as const, label: 'AI', icon: Lightbulb },
            { key: 'history' as const, label: 'History', icon: Clock },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
                background: 'transparent', fontSize: 11, fontWeight: 700,
                color: tab === t.key ? 'var(--accent)' : 'var(--text3)',
                borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          {tab === 'tools' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Color picker */}
              <div>
                <div style={labelStyle}>Fill Color</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        setFillColor(c)
                        if (selectedId) updateSelected({ fill: c })
                      }}
                      style={{
                        width: 24, height: 24, borderRadius: 6, border: fillColor === c ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: c, cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Selected object properties */}
              {selectedObj && (
                <>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <div style={labelStyle}>Selected: {selectedObj.type}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={labelStyle}>X</div>
                      <input type="number" value={Math.round(selectedObj.x)} onChange={e => updateSelected({ x: +e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <div style={labelStyle}>Y</div>
                      <input type="number" value={Math.round(selectedObj.y)} onChange={e => updateSelected({ y: +e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <div style={labelStyle}>W</div>
                      <input type="number" value={Math.round(selectedObj.width)} onChange={e => updateSelected({ width: +e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <div style={labelStyle}>H</div>
                      <input type="number" value={Math.round(selectedObj.height)} onChange={e => updateSelected({ height: +e.target.value })} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <div style={labelStyle}>Opacity</div>
                    <input type="range" min="0" max="1" step="0.05" value={selectedObj.opacity}
                      onChange={e => updateSelected({ opacity: +e.target.value })}
                      style={{ width: '100%' }} />
                  </div>
                  <div>
                    <div style={labelStyle}>Rotation</div>
                    <input type="range" min="0" max="360" step="1" value={selectedObj.rotation}
                      onChange={e => updateSelected({ rotation: +e.target.value })}
                      style={{ width: '100%' }} />
                  </div>
                  {selectedObj.type === 'text' && (
                    <>
                      <div>
                        <div style={labelStyle}>Text</div>
                        <input type="text" value={selectedObj.text || ''} onChange={e => updateSelected({ text: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <div style={labelStyle}>Font Size</div>
                        <input type="number" value={selectedObj.fontSize || 24} onChange={e => updateSelected({ fontSize: +e.target.value })} style={inputStyle} />
                      </div>
                    </>
                  )}
                  <div>
                    <div style={labelStyle}>Stroke Width</div>
                    <input type="number" min="0" max="20" value={selectedObj.strokeWidth} onChange={e => updateSelected({ strokeWidth: +e.target.value })} style={inputStyle} />
                  </div>
                </>
              )}

              {/* Job images */}
              {jobImages.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={labelStyle}>Job Reference Images</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    {jobImages.filter(i => i.mime_type?.startsWith('image/')).map(img => (
                      <img
                        key={img.id}
                        src={img.public_url}
                        alt={img.file_name || ''}
                        style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--border)' }}
                        title="Click to add to canvas"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'brief' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)' }}>Design Brief</div>
              {linkedJob ? (
                <>
                  <InfoRow label="Client" value={design.client_name} />
                  <InfoRow label="Job" value={linkedJob.title} />
                  <InfoRow label="Vehicle" value={formData.vehicle || linkedJob.vehicle_desc || '—'} />
                  <InfoRow label="Design Type" value={design.design_type?.replace('_', ' ')} />
                  <InfoRow label="Wrap Type" value={formData.wrapType || formData.jobType || '—'} />
                  <InfoRow label="Coverage" value={formData.coverage || '—'} />
                  <InfoRow label="Material" value={formData.material || '—'} />
                  <InfoRow label="Sq Ft" value={formData.sqft || '—'} />
                  {design.description && (
                    <div>
                      <div style={labelStyle}>Notes</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{design.description}</div>
                    </div>
                  )}
                  <button
                    onClick={() => router.push(`/projects/${linkedJob.id}`)}
                    style={{ ...toolBtnStyle, width: '100%', justifyContent: 'center', padding: '8px 12px', fontSize: 12, background: 'var(--surface2)' }}
                  >
                    Open Linked Job
                  </button>
                </>
              ) : (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
                  No linked job. Create this design standalone or link it to a job from Design Studio.
                </div>
              )}
            </div>
          )}

          {tab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)' }}>AI Design Feedback</div>
              <button
                onClick={requestAiFeedback}
                disabled={aiLoading}
                style={{
                  padding: '10px 16px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #8b5cf6, #4f7fff)',
                  color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Lightbulb size={14} />
                {aiLoading ? 'Analyzing...' : 'Get AI Feedback'}
              </button>
              {aiFeedback && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {aiFeedback.issues?.map((issue: any, i: number) => (
                    <div key={i} style={{
                      padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)',
                      borderLeft: `3px solid ${issue.severity === 'error' ? 'var(--red)' : issue.severity === 'warning' ? 'var(--amber)' : 'var(--accent)'}`,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text1)' }}>{issue.title || issue.type}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{issue.message || issue.description}</div>
                    </div>
                  ))}
                  {aiFeedback.summary && (
                    <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{aiFeedback.summary}</div>
                  )}
                  {!aiFeedback.issues?.length && !aiFeedback.summary && (
                    <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: 12 }}>
                      No issues found. Design looks good!
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)' }}>Comments & History</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addComment()}
                  placeholder="Add a comment..."
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={addComment} disabled={!newComment.trim()} style={{ ...toolBtnStyle, background: 'var(--accent)', color: '#fff' }}>
                  <Send size={12} />
                </button>
              </div>
              {comments.map((c: any) => (
                <div key={c.id} style={{ padding: '8px 10px', background: 'var(--surface2)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text1)' }}>{(c.author as any)?.name || 'Unknown'}</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>{c.content}</div>
                </div>
              ))}
              {comments.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)', fontSize: 12 }}>No comments yet</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' as const, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text1)' }}>{value || '—'}</div>
    </div>
  )
}

const toolBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  padding: '6px 8px', borderRadius: 6, border: 'none',
  background: 'transparent', color: 'var(--text3)', cursor: 'pointer',
  fontSize: 12, fontWeight: 600,
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, color: 'var(--text3)',
  textTransform: 'uppercase' as const, marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', background: 'var(--surface2)',
  border: '1px solid var(--border)', borderRadius: 6,
  color: 'var(--text1)', fontSize: 12, outline: 'none',
}
