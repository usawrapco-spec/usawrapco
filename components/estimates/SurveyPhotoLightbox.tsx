'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  X, Pencil, ArrowUpRight, Square, Type, Undo2,
  Download, Link, Copy, Tag, Save, Loader2, Check,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SurveyPhotoFull {
  id: string
  public_url: string
  markup_url?: string | null
  markup_data?: DrawAction[] | null
  angle?: string | null
  category?: string | null
  caption?: string | null
  concern_type?: string | null
  is_flagged: boolean
  line_item_ids: string[]
  share_token: string
}

interface LineItemOption {
  id: string
  description: string
  category?: string
}

type DrawTool = 'freehand' | 'arrow' | 'rectangle' | 'text'

interface DrawAction {
  type: DrawTool
  points: { x: number; y: number }[]
  color: string
  text?: string
}

interface Props {
  photo: SurveyPhotoFull
  lineItems: LineItemOption[]    // estimate's line items for assignment
  orgId: string
  estimateId: string
  canWrite: boolean
  onClose: () => void
  onPhotoUpdated: (updated: Partial<SurveyPhotoFull>) => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DRAW_COLORS = [
  { name: 'Red',    value: '#f25a5a' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Blue',   value: '#4f7fff' },
  { name: 'Green',  value: '#22c07a' },
]

const ANGLE_LABEL: Record<string, string> = {
  front: 'Front', driver_side: 'Driver Side', passenger_side: 'Passenger Side',
  rear: 'Rear', detail: 'Detail', existing_vinyl: 'Existing Vinyl',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SurveyPhotoLightbox({
  photo, lineItems, orgId, estimateId, canWrite, onClose, onPhotoUpdated,
}: Props) {
  const supabase = createClient()

  // ── View mode
  const [showMarkup, setShowMarkup]   = useState(!!photo.markup_url)
  const [markupMode, setMarkupMode]   = useState(false)
  const [showAssign, setShowAssign]   = useState(false)

  // ── Drawing state
  const [drawTool, setDrawTool]       = useState<DrawTool>('freehand')
  const [drawColor, setDrawColor]     = useState('#f25a5a')
  const [actions, setActions]         = useState<DrawAction[]>(
    Array.isArray(photo.markup_data) ? photo.markup_data : []
  )
  const [isDrawing, setIsDrawing]     = useState(false)
  const [currentAction, setCurrentAction] = useState<DrawAction | null>(null)
  const [textInput, setTextInput]     = useState('')
  const [textPos, setTextPos]         = useState<{ x: number; y: number } | null>(null)

  // ── Line item assignment
  const [assignedIds, setAssignedIds] = useState<string[]>(photo.line_item_ids ?? [])
  const [savingAssign, setSavingAssign] = useState(false)

  // ── Saving markup
  const [saving, setSaving]           = useState(false)
  const [copied, setCopied]           = useState(false)
  const [linkCopied, setLinkCopied]   = useState(false)

  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const imgRef      = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef      = useRef<number | null>(null)

  // ── Render canvas ────────────────────────────────────────────────────────

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img    = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width  = img.naturalWidth  || img.width
    canvas.height = img.naturalHeight || img.height

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const toDraw = [...actions, ...(currentAction ? [currentAction] : [])]

    for (const a of toDraw) {
      ctx.strokeStyle = a.color
      ctx.fillStyle   = a.color
      ctx.lineWidth   = Math.max(2, canvas.width / 300)
      ctx.lineCap     = 'round'
      ctx.lineJoin    = 'round'

      if (a.type === 'freehand') {
        if (a.points.length < 2) continue
        ctx.beginPath()
        ctx.moveTo(a.points[0].x, a.points[0].y)
        for (let i = 1; i < a.points.length; i++) ctx.lineTo(a.points[i].x, a.points[i].y)
        ctx.stroke()
      } else if (a.type === 'arrow' && a.points.length >= 2) {
        const s = a.points[0], e = a.points[a.points.length - 1]
        const angle = Math.atan2(e.y - s.y, e.x - s.x)
        const hw    = canvas.width / 150
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(e.x, e.y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(e.x, e.y)
        ctx.lineTo(e.x - hw * Math.cos(angle - Math.PI / 6), e.y - hw * Math.sin(angle - Math.PI / 6))
        ctx.lineTo(e.x - hw * Math.cos(angle + Math.PI / 6), e.y - hw * Math.sin(angle + Math.PI / 6))
        ctx.closePath()
        ctx.fill()
      } else if (a.type === 'rectangle' && a.points.length >= 2) {
        const s = a.points[0], e = a.points[a.points.length - 1]
        ctx.strokeRect(s.x, s.y, e.x - s.x, e.y - s.y)
      } else if (a.type === 'text' && a.text && a.points.length > 0) {
        const fontSize = Math.max(16, canvas.width / 40)
        ctx.font      = `bold ${fontSize}px "Barlow Condensed", sans-serif`
        ctx.fillStyle = a.color
        // Shadow for readability
        ctx.shadowColor   = 'rgba(0,0,0,0.8)'
        ctx.shadowBlur    = 4
        ctx.fillText(a.text, a.points[0].x, a.points[0].y)
        ctx.shadowBlur    = 0
      }
    }
  }, [actions, currentAction])

  useEffect(() => {
    if (!markupMode) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(renderCanvas)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [markupMode, renderCanvas])

  // ── Canvas coords ────────────────────────────────────────────────────────

  const getCoords = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    let cx: number, cy: number
    if ('touches' in e) {
      if (!e.touches.length) return null
      cx = e.touches[0].clientX; cy = e.touches[0].clientY
    } else {
      cx = e.clientX; cy = e.clientY
    }
    return {
      x: (cx - rect.left) * (canvas.width  / rect.width),
      y: (cy - rect.top)  * (canvas.height / rect.height),
    }
  }

  // ── Mouse/touch handlers ─────────────────────────────────────────────────

  const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!markupMode || !canWrite) return
    e.preventDefault()
    const pt = getCoords(e)
    if (!pt) return

    if (drawTool === 'text') {
      setTextPos(pt)
      setTextInput('')
      return
    }
    setIsDrawing(true)
    setCurrentAction({ type: drawTool, points: [pt], color: drawColor })
  }

  const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentAction) return
    e.preventDefault()
    const pt = getCoords(e)
    if (!pt) return
    if (drawTool === 'freehand') {
      setCurrentAction(prev => prev ? { ...prev, points: [...prev.points, pt] } : null)
    } else {
      setCurrentAction(prev => prev ? { ...prev, points: [prev.points[0], pt] } : null)
    }
  }

  const onPointerUp = () => {
    if (!isDrawing || !currentAction) return
    setIsDrawing(false)
    if (currentAction.points.length > 0) {
      setActions(prev => [...prev, currentAction])
    }
    setCurrentAction(null)
  }

  const commitText = () => {
    if (!textPos || !textInput.trim()) { setTextPos(null); return }
    setActions(prev => [...prev, { type: 'text', points: [textPos], color: drawColor, text: textInput }])
    setTextPos(null)
    setTextInput('')
  }

  // ── Enter markup mode: load existing markup or original ──────────────────

  const enterMarkupMode = () => {
    const src = (photo.markup_url && !showMarkup) ? photo.markup_url : photo.public_url
    const img  = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgRef.current = img
      setMarkupMode(true)
      setTimeout(renderCanvas, 50)
    }
    img.src = src
  }

  // ── Save markup ──────────────────────────────────────────────────────────

  const saveMarkup = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setSaving(true)
    try {
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.92))
      if (!blob) throw new Error('Canvas export failed')

      const path = `survey/${estimateId}/${photo.id}/markup_${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage
        .from('project-files')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (upErr) throw upErr

      const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path)
      const markupUrl = urlData.publicUrl

      await supabase
        .from('estimate_survey_photos')
        .update({ markup_url: markupUrl, markup_data: actions })
        .eq('id', photo.id)

      onPhotoUpdated({ markup_url: markupUrl, markup_data: actions })
      setShowMarkup(true)
      setMarkupMode(false)
    } catch (err) {
      console.error('Markup save error', err)
      alert('Failed to save markup. Please try again.')
    }
    setSaving(false)
  }

  // ── Copy to clipboard ────────────────────────────────────────────────────

  const copyToClipboard = async () => {
    const canvas = canvasRef.current
    if (canvas && markupMode) {
      // Copy current canvas
      canvas.toBlob(async blob => {
        if (!blob) return
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          setCopied(true); setTimeout(() => setCopied(false), 2000)
        } catch {
          // Fallback: open in new tab
          const url = URL.createObjectURL(blob)
          window.open(url, '_blank')
        }
      })
    } else {
      // Copy markup URL or original URL
      const url = (showMarkup && photo.markup_url) ? photo.markup_url : photo.public_url
      try {
        const res = await fetch(url)
        const blob = await res.blob()
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
        setCopied(true); setTimeout(() => setCopied(false), 2000)
      } catch {
        // Fallback: copy URL text
        await navigator.clipboard.writeText(url)
        setCopied(true); setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  // ── Share link ───────────────────────────────────────────────────────────

  const copyShareLink = async () => {
    const origin = window.location.origin
    const url    = `${origin}/photos/${photo.share_token}`
    await navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2500)
  }

  // ── Line item assignment ─────────────────────────────────────────────────

  const toggleLineItem = (id: string) => {
    setAssignedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const saveAssignment = async () => {
    setSavingAssign(true)
    await supabase
      .from('estimate_survey_photos')
      .update({ line_item_ids: assignedIds })
      .eq('id', photo.id)
    onPhotoUpdated({ line_item_ids: assignedIds })
    setSavingAssign(false)
    setShowAssign(false)
  }

  // ── Download ─────────────────────────────────────────────────────────────

  const handleDownload = () => {
    const url = (showMarkup && photo.markup_url) ? photo.markup_url : photo.public_url
    const a   = document.createElement('a')
    a.href    = url
    a.download = `survey-photo-${photo.id.slice(0, 8)}.jpg`
    a.target  = '_blank'
    a.click()
  }

  // ─────────────────────────────────────────────────────────────────────────

  const displaySrc = (showMarkup && photo.markup_url && !markupMode)
    ? photo.markup_url : photo.public_url

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 700,
        background: 'rgba(0,0,0,0.96)',
        display: 'flex', flexDirection: 'column',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
        background: 'rgba(19,21,28,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexWrap: 'wrap',
      }}>
        {/* Left: close + label */}
        <button onClick={onClose} style={btnStyle('rgba(255,255,255,0.08)')}>
          <X size={16} />
        </button>
        <div style={{ fontSize: 12, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {photo.angle ? ANGLE_LABEL[photo.angle] || photo.angle : 'Photo'}
          {photo.caption && <span style={{ color: '#9299b5', marginLeft: 6, fontWeight: 400 }}>{photo.caption}</span>}
        </div>

        <div style={{ flex: 1 }} />

        {/* Markup mode tools */}
        {markupMode && canWrite && (
          <>
            {(['freehand', 'arrow', 'rectangle', 'text'] as DrawTool[]).map(tool => (
              <button key={tool} onClick={() => setDrawTool(tool)} style={btnStyle(drawTool === tool ? 'rgba(79,127,255,0.25)' : 'rgba(255,255,255,0.06)', drawTool === tool ? '#4f7fff' : '#9299b5')}>
                {tool === 'freehand'   && <Pencil      size={14} />}
                {tool === 'arrow'      && <ArrowUpRight size={14} />}
                {tool === 'rectangle'  && <Square       size={14} />}
                {tool === 'text'       && <Type         size={14} />}
              </button>
            ))}
            {DRAW_COLORS.map(c => (
              <button key={c.value} onClick={() => setDrawColor(c.value)} style={{
                width: 22, height: 22, borderRadius: '50%', border: drawColor === c.value ? `2px solid ${c.value}` : '2px solid transparent',
                background: c.value, cursor: 'pointer', outline: drawColor === c.value ? '2px solid rgba(255,255,255,0.4)' : 'none', outlineOffset: 1,
              }} />
            ))}
            <button onClick={() => setActions(prev => prev.slice(0, -1))} style={btnStyle('rgba(255,255,255,0.06)')}>
              <Undo2 size={14} />
            </button>
            <button onClick={saveMarkup} disabled={saving} style={btnStyle('rgba(34,192,122,0.15)', '#22c07a')}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              <span style={{ fontSize: 11, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>Save</span>
            </button>
            <button onClick={() => setMarkupMode(false)} style={btnStyle('rgba(255,255,255,0.06)')}>
              <X size={14} />
            </button>
          </>
        )}

        {/* View mode actions */}
        {!markupMode && (
          <>
            {/* Toggle markup/original if markup exists */}
            {photo.markup_url && (
              <button onClick={() => setShowMarkup(s => !s)} style={btnStyle(showMarkup ? 'rgba(34,192,122,0.15)' : 'rgba(255,255,255,0.06)', showMarkup ? '#22c07a' : '#9299b5')}>
                <span style={{ fontSize: 11, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>
                  {showMarkup ? 'Markup' : 'Original'}
                </span>
              </button>
            )}
            {canWrite && (
              <button onClick={enterMarkupMode} style={btnStyle('rgba(79,127,255,0.12)', '#4f7fff')}>
                <Pencil size={14} />
                <span style={{ fontSize: 11, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>Mark Up</span>
              </button>
            )}
            <button onClick={copyToClipboard} style={btnStyle(copied ? 'rgba(34,192,122,0.15)' : 'rgba(255,255,255,0.06)', copied ? '#22c07a' : '#9299b5')}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span style={{ fontSize: 11, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>Copy</span>
            </button>
            <button onClick={copyShareLink} style={btnStyle(linkCopied ? 'rgba(34,192,122,0.15)' : 'rgba(255,255,255,0.06)', linkCopied ? '#22c07a' : '#9299b5')}>
              {linkCopied ? <Check size={14} /> : <Link size={14} />}
              <span style={{ fontSize: 11, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>Share</span>
            </button>
            {lineItems.length > 0 && canWrite && (
              <button onClick={() => setShowAssign(s => !s)} style={btnStyle(showAssign || assignedIds.length > 0 ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.06)', showAssign || assignedIds.length > 0 ? '#8b5cf6' : '#9299b5')}>
                <Tag size={14} />
                <span style={{ fontSize: 11, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>
                  Assign{assignedIds.length > 0 ? ` (${assignedIds.length})` : ''}
                </span>
              </button>
            )}
            <button onClick={handleDownload} style={btnStyle('rgba(255,255,255,0.06)')}>
              <Download size={14} />
            </button>
          </>
        )}
      </div>

      {/* ── Line item assignment panel ── */}
      {showAssign && !markupMode && (
        <div style={{
          padding: '12px 16px', background: '#13151c', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9299b5', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>
            Assign to:
          </span>
          {lineItems.map(li => {
            const active = assignedIds.includes(li.id)
            return (
              <button key={li.id} onClick={() => toggleLineItem(li.id)} style={{
                padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                border: active ? '1.5px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                background: active ? 'rgba(139,92,246,0.15)' : 'transparent',
                color: active ? '#8b5cf6' : '#9299b5',
                fontSize: 11, fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif',
              }}>
                {li.description}
              </button>
            )
          })}
          <button onClick={saveAssignment} disabled={savingAssign} style={btnStyle('rgba(34,192,122,0.15)', '#22c07a')}>
            {savingAssign ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={12} />}
            <span style={{ fontSize: 11, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>Save</span>
          </button>
        </div>
      )}

      {/* ── Photo / Canvas area ── */}
      <div
        ref={containerRef}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, position: 'relative', overflow: 'hidden' }}
      >
        {markupMode ? (
          <>
            <canvas
              ref={canvasRef}
              onMouseDown={onPointerDown}
              onMouseMove={onPointerMove}
              onMouseUp={onPointerUp}
              onMouseLeave={onPointerUp}
              onTouchStart={onPointerDown}
              onTouchMove={onPointerMove}
              onTouchEnd={onPointerUp}
              style={{
                maxWidth: '100%', maxHeight: 'calc(100vh - 140px)',
                objectFit: 'contain', borderRadius: 8,
                cursor: drawTool === 'text' ? 'text' : 'crosshair',
                touchAction: 'none',
              }}
            />
            {/* Text input overlay */}
            {textPos && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10 }}>
                <input
                  autoFocus
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitText(); if (e.key === 'Escape') setTextPos(null) }}
                  onBlur={commitText}
                  placeholder="Type and press Enter"
                  style={{
                    background: 'rgba(0,0,0,0.85)', border: `2px solid ${drawColor}`,
                    color: drawColor, padding: '8px 12px', borderRadius: 8,
                    fontSize: 15, fontWeight: 700, outline: 'none', minWidth: 200,
                    fontFamily: 'Barlow Condensed, sans-serif',
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <img
            src={displaySrc}
            alt={photo.caption || photo.angle || 'survey photo'}
            style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 140px)', objectFit: 'contain', borderRadius: 8 }}
          />
        )}
      </div>

      {/* ── Footer ── */}
      {assignedIds.length > 0 && !showAssign && (
        <div style={{ padding: '8px 16px', background: 'rgba(139,92,246,0.08)', borderTop: '1px solid rgba(139,92,246,0.15)', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <Tag size={12} style={{ color: '#8b5cf6' }} />
          <span style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Assigned to:
          </span>
          {assignedIds.map(id => {
            const li = lineItems.find(l => l.id === id)
            return li ? (
              <span key={id} style={{ fontSize: 11, color: '#9299b5', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 10 }}>
                {li.description}
              </span>
            ) : null
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function btnStyle(bg: string, color = '#9299b5'): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', borderRadius: 8, border: 'none',
    background: bg, color, cursor: 'pointer', transition: 'all 0.12s',
    fontFamily: 'Barlow Condensed, sans-serif',
  }
}
