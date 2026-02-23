'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Camera,
  Upload,
  X,
  Undo2,
  Pencil,
  ArrowUpRight,
  Square,
  Type,
  Eye,
  EyeOff,
  Save,
  Trash2,
  ZoomIn,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Fonts ───────────────────────────────────────────────────────────────────
const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PhotoInspectionProps {
  lineItemId: string
  specs: Record<string, unknown>
  updateSpec: (key: string, value: unknown) => void
  canWrite: boolean
  orgId: string
}

interface InspectionPhoto {
  url: string
  markupUrl?: string
  labels: string[]
  customerVisible: boolean
}

type DrawTool = 'freehand' | 'arrow' | 'rectangle' | 'text'

interface DrawAction {
  type: DrawTool | 'label'
  points: { x: number; y: number }[]
  color: string
  label?: string
  text?: string
}

interface LabelPreset {
  label: string
  color: string
}

const LABEL_PRESETS: LabelPreset[] = [
  { label: 'Cannot Wrap', color: 'var(--red)' },
  { label: 'Prep Required', color: 'var(--amber)' },
  { label: 'Damage Present', color: 'var(--red)' },
  { label: 'Rust', color: 'var(--red)' },
  { label: 'Note', color: 'var(--accent)' },
  { label: 'Good to Go', color: 'var(--green)' },
]

const DRAW_COLORS = [
  { name: 'Red', value: '#f25a5a' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Blue', value: '#4f7fff' },
  { name: 'Green', value: '#22c07a' },
]

const MAX_PHOTOS = 10

// ─── Component ───────────────────────────────────────────────────────────────

export default function PhotoInspection({
  lineItemId,
  specs,
  updateSpec,
  canWrite,
  orgId,
}: PhotoInspectionProps) {
  const supabase = createClient()

  // ─── State ─────────────────────────────────────────────────────────────────

  const photos: InspectionPhoto[] = useMemo(() => {
    const raw = specs.inspectionPhotos
    return Array.isArray(raw) ? raw : []
  }, [specs.inspectionPhotos])

  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [markupIndex, setMarkupIndex] = useState<number | null>(null)
  const [savingMarkup, setSavingMarkup] = useState(false)

  // Canvas drawing state
  const [drawTool, setDrawTool] = useState<DrawTool>('freehand')
  const [drawColor, setDrawColor] = useState('#f25a5a')
  const [actions, setActions] = useState<DrawAction[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentAction, setCurrentAction] = useState<DrawAction | null>(null)
  const [pendingLabel, setPendingLabel] = useState<string | null>(null)
  const [textInput, setTextInput] = useState('')
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const updatePhotos = useCallback(
    (newPhotos: InspectionPhoto[]) => {
      updateSpec('inspectionPhotos', newPhotos)
    },
    [updateSpec],
  )

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      let clientX: number, clientY: number
      if ('touches' in e) {
        if (e.touches.length === 0) return null
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height),
      }
    },
    [],
  )

  // ─── Upload ────────────────────────────────────────────────────────────────

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!canWrite) return
      const remaining = MAX_PHOTOS - photos.length
      if (remaining <= 0) return
      const toUpload = files.slice(0, remaining)
      setUploading(true)
      try {
        const newPhotos: InspectionPhoto[] = []
        for (const file of toUpload) {
          const ext = file.name.split('.').pop() || 'jpg'
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
          const path = `inspections/${lineItemId}/${fileName}`
          const { error } = await supabase.storage
            .from('job-images')
            .upload(path, file, { upsert: true })
          if (error) {
            console.error('Upload error:', error)
            continue
          }
          const {
            data: { publicUrl },
          } = supabase.storage.from('job-images').getPublicUrl(path)
          newPhotos.push({
            url: publicUrl,
            labels: [],
            customerVisible: false,
          })
        }
        if (newPhotos.length > 0) {
          updatePhotos([...photos, ...newPhotos])
        }
      } finally {
        setUploading(false)
      }
    },
    [canWrite, photos, lineItemId, supabase, updatePhotos],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files) return
      uploadFiles(Array.from(files))
      e.target.value = ''
    },
    [uploadFiles],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/'),
      )
      if (files.length > 0) uploadFiles(files)
    },
    [uploadFiles],
  )

  const deletePhoto = useCallback(
    (index: number) => {
      const updated = photos.filter((_, i) => i !== index)
      updatePhotos(updated)
    },
    [photos, updatePhotos],
  )

  const toggleCustomerVisible = useCallback(
    (index: number) => {
      const updated = photos.map((p, i) =>
        i === index ? { ...p, customerVisible: !p.customerVisible } : p,
      )
      updatePhotos(updated)
    },
    [photos, updatePhotos],
  )

  // ─── Canvas Drawing ────────────────────────────────────────────────────────

  const redrawCanvas = useCallback(
    (actionsToRender: DrawAction[]) => {
      const canvas = canvasRef.current
      const img = imageRef.current
      if (!canvas || !img) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Draw all actions
      for (const action of actionsToRender) {
        ctx.strokeStyle = action.color
        ctx.fillStyle = action.color
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        switch (action.type) {
          case 'freehand': {
            if (action.points.length < 2) break
            ctx.beginPath()
            ctx.moveTo(action.points[0].x, action.points[0].y)
            for (let i = 1; i < action.points.length; i++) {
              ctx.lineTo(action.points[i].x, action.points[i].y)
            }
            ctx.stroke()
            break
          }
          case 'arrow': {
            if (action.points.length < 2) break
            const start = action.points[0]
            const end = action.points[action.points.length - 1]
            // Line
            ctx.beginPath()
            ctx.moveTo(start.x, start.y)
            ctx.lineTo(end.x, end.y)
            ctx.stroke()
            // Arrowhead
            const angle = Math.atan2(end.y - start.y, end.x - start.x)
            const headLen = 18
            ctx.beginPath()
            ctx.moveTo(end.x, end.y)
            ctx.lineTo(
              end.x - headLen * Math.cos(angle - Math.PI / 6),
              end.y - headLen * Math.sin(angle - Math.PI / 6),
            )
            ctx.moveTo(end.x, end.y)
            ctx.lineTo(
              end.x - headLen * Math.cos(angle + Math.PI / 6),
              end.y - headLen * Math.sin(angle + Math.PI / 6),
            )
            ctx.stroke()
            break
          }
          case 'rectangle': {
            if (action.points.length < 2) break
            const p1 = action.points[0]
            const p2 = action.points[action.points.length - 1]
            ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y)
            break
          }
          case 'text': {
            if (action.points.length === 0 || !action.text) break
            const pos = action.points[0]
            ctx.font = 'bold 18px Barlow Condensed, sans-serif'
            ctx.fillStyle = action.color
            // Background
            const metrics = ctx.measureText(action.text)
            ctx.fillStyle = 'rgba(0,0,0,0.7)'
            ctx.fillRect(
              pos.x - 4,
              pos.y - 20,
              metrics.width + 8,
              26,
            )
            ctx.fillStyle = action.color
            ctx.fillText(action.text, pos.x, pos.y)
            break
          }
          case 'label': {
            if (action.points.length === 0 || !action.label) break
            const lp = action.points[0]
            const radius = 10
            // Circle
            ctx.beginPath()
            ctx.arc(lp.x, lp.y, radius, 0, Math.PI * 2)
            ctx.fillStyle = action.color
            ctx.fill()
            ctx.strokeStyle = '#fff'
            ctx.lineWidth = 2
            ctx.stroke()
            // Text label
            ctx.font = 'bold 14px Barlow Condensed, sans-serif'
            const labelMetrics = ctx.measureText(action.label)
            const labelX = lp.x + radius + 6
            const labelY = lp.y + 5
            // Background
            ctx.fillStyle = 'rgba(0,0,0,0.8)'
            ctx.fillRect(
              labelX - 4,
              labelY - 16,
              labelMetrics.width + 8,
              22,
            )
            ctx.fillStyle = action.color
            ctx.fillText(action.label, labelX, labelY)
            ctx.lineWidth = 3
            break
          }
        }
      }
    },
    [],
  )

  // Load image when markup overlay opens
  useEffect(() => {
    if (markupIndex === null) return
    const photo = photos[markupIndex]
    if (!photo) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      const canvas = canvasRef.current
      if (!canvas) return
      // Size canvas to image aspect ratio, max 900px wide
      const maxW = Math.min(900, window.innerWidth - 40)
      const scale = maxW / img.naturalWidth
      canvas.width = maxW
      canvas.height = img.naturalHeight * scale
      // Load existing markup actions if any
      setActions([])
      redrawCanvas([])
    }
    img.src = photo.url
  }, [markupIndex, photos, redrawCanvas])

  // Redraw on actions change
  useEffect(() => {
    if (markupIndex === null) return
    const allActions = currentAction ? [...actions, currentAction] : actions
    redrawCanvas(allActions)
  }, [actions, currentAction, markupIndex, redrawCanvas])

  // ─── Mouse/Touch Handlers ──────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!canWrite) return
      const coords = getCanvasCoords(e)
      if (!coords) return

      // If placing a label
      if (pendingLabel) {
        const preset = LABEL_PRESETS.find((p) => p.label === pendingLabel)
        const newAction: DrawAction = {
          type: 'label',
          points: [coords],
          color: preset?.color || drawColor,
          label: pendingLabel,
        }
        setActions((prev) => [...prev, newAction])
        // Also track the label in the photo's labels array
        if (markupIndex !== null) {
          const updated = photos.map((p, i) => {
            if (i !== markupIndex && !p.labels.includes(pendingLabel!)) return p
            if (i === markupIndex) {
              const newLabels = p.labels.includes(pendingLabel!)
                ? p.labels
                : [...p.labels, pendingLabel!]
              return { ...p, labels: newLabels }
            }
            return p
          })
          updatePhotos(updated)
        }
        setPendingLabel(null)
        return
      }

      // If text tool, set position and wait for input
      if (drawTool === 'text') {
        setTextPosition(coords)
        return
      }

      setIsDrawing(true)
      setCurrentAction({
        type: drawTool,
        points: [coords],
        color: drawColor,
      })
    },
    [canWrite, getCanvasCoords, pendingLabel, drawTool, drawColor, markupIndex, photos, updatePhotos],
  )

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !currentAction) return
      const coords = getCanvasCoords(e)
      if (!coords) return

      setCurrentAction((prev) => {
        if (!prev) return prev
        if (prev.type === 'freehand') {
          return { ...prev, points: [...prev.points, coords] }
        }
        // For arrow/rectangle, keep start and update end
        return { ...prev, points: [prev.points[0], coords] }
      })
    },
    [isDrawing, currentAction, getCanvasCoords],
  )

  const handlePointerUp = useCallback(() => {
    if (!isDrawing || !currentAction) return
    setActions((prev) => [...prev, currentAction])
    setCurrentAction(null)
    setIsDrawing(false)
  }, [isDrawing, currentAction])

  const handleTextSubmit = useCallback(() => {
    if (!textPosition || !textInput.trim()) {
      setTextPosition(null)
      setTextInput('')
      return
    }
    const newAction: DrawAction = {
      type: 'text',
      points: [textPosition],
      color: drawColor,
      text: textInput.trim(),
    }
    setActions((prev) => [...prev, newAction])
    setTextPosition(null)
    setTextInput('')
  }, [textPosition, textInput, drawColor])

  const handleUndo = useCallback(() => {
    setActions((prev) => prev.slice(0, -1))
  }, [])

  // ─── Save Markup ───────────────────────────────────────────────────────────

  const handleSaveMarkup = useCallback(async () => {
    if (markupIndex === null) return
    const canvas = canvasRef.current
    if (!canvas) return

    setSavingMarkup(true)
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
      )
      if (!blob) return

      const fileName = `markup-${Date.now()}.png`
      const path = `inspections/${lineItemId}/${fileName}`

      const { error } = await supabase.storage
        .from('job-images')
        .upload(path, blob, { upsert: true, contentType: 'image/png' })

      if (error) {
        console.error('Markup upload error:', error)
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('job-images').getPublicUrl(path)

      // Collect labels from actions
      const actionLabels = actions
        .filter((a) => a.type === 'label' && a.label)
        .map((a) => a.label!)
      const uniqueLabels = Array.from(new Set([...photos[markupIndex].labels, ...actionLabels]))

      const updated = photos.map((p, i) =>
        i === markupIndex
          ? { ...p, markupUrl: publicUrl, labels: uniqueLabels }
          : p,
      )
      updatePhotos(updated)
      setMarkupIndex(null)
    } finally {
      setSavingMarkup(false)
    }
  }, [markupIndex, lineItemId, supabase, actions, photos, updatePhotos])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Camera size={18} style={{ color: 'var(--accent)' }} />
          <span
            style={{
              fontFamily: headingFont,
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text1)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Photo Inspection
          </span>
        </div>
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 12,
            color: 'var(--text3)',
          }}
        >
          {photos.length}/{MAX_PHOTOS}
        </span>
      </div>

      {/* Upload Area */}
      {canWrite && photos.length < MAX_PHOTOS && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8,
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            background: dragOver ? 'rgba(79,127,255,0.06)' : 'var(--surface)',
            transition: 'all 0.2s',
          }}
        >
          {uploading ? (
            <Loader2 size={24} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          ) : (
            <Upload size={24} style={{ color: 'var(--text3)' }} />
          )}
          <span style={{ fontFamily: headingFont, fontSize: 14, color: 'var(--text2)' }}>
            {uploading
              ? 'Uploading...'
              : 'Drop vehicle photos here or click to upload'}
          </span>
          <span style={{ fontFamily: monoFont, fontSize: 11, color: 'var(--text3)' }}>
            JPG, PNG, WebP - Max {MAX_PHOTOS} photos
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}
        >
          {photos.map((photo, index) => (
            <div
              key={`${photo.url}-${index}`}
              style={{
                position: 'relative',
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid var(--border)',
                background: 'var(--surface2)',
                cursor: 'pointer',
              }}
            >
              {/* Thumbnail */}
              <div
                onClick={() => {
                  if (canWrite) {
                    setMarkupIndex(index)
                    setActions([])
                    setCurrentAction(null)
                    setPendingLabel(null)
                    setTextPosition(null)
                    setTextInput('')
                  }
                }}
                style={{
                  width: '100%',
                  aspectRatio: '4/3',
                  backgroundImage: `url(${photo.markupUrl || photo.url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />

              {/* Labels badges */}
              {photo.labels.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                  }}
                >
                  {photo.labels.map((label) => {
                    const preset = LABEL_PRESETS.find((p) => p.label === label)
                    return (
                      <span
                        key={label}
                        style={{
                          fontSize: 9,
                          fontFamily: headingFont,
                          fontWeight: 600,
                          padding: '1px 5px',
                          borderRadius: 3,
                          background: 'rgba(0,0,0,0.75)',
                          color: preset?.color || 'var(--text2)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {label}
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Markup indicator */}
              {photo.markupUrl && (
                <div
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    background: 'rgba(79,127,255,0.85)',
                    borderRadius: 4,
                    padding: '2px 5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <Pencil size={10} style={{ color: '#fff' }} />
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: headingFont,
                      fontWeight: 600,
                      color: '#fff',
                      textTransform: 'uppercase',
                    }}
                  >
                    Marked
                  </span>
                </div>
              )}

              {/* Bottom bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 6px',
                  background: 'var(--surface)',
                  borderTop: '1px solid var(--border)',
                }}
              >
                {/* Customer visible toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (canWrite) toggleCustomerVisible(index)
                  }}
                  title={
                    photo.customerVisible
                      ? 'Visible to customer'
                      : 'Hidden from customer'
                  }
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: canWrite ? 'pointer' : 'default',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {photo.customerVisible ? (
                    <Eye size={13} style={{ color: 'var(--green)' }} />
                  ) : (
                    <EyeOff size={13} style={{ color: 'var(--text3)' }} />
                  )}
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: headingFont,
                      color: photo.customerVisible
                        ? 'var(--green)'
                        : 'var(--text3)',
                    }}
                  >
                    {photo.customerVisible ? 'Customer' : 'Internal'}
                  </span>
                </button>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {canWrite && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMarkupIndex(index)
                          setActions([])
                          setCurrentAction(null)
                          setPendingLabel(null)
                          setTextPosition(null)
                          setTextInput('')
                        }}
                        title="Open markup"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 2,
                          color: 'var(--text2)',
                        }}
                      >
                        <ZoomIn size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deletePhoto(index)
                        }}
                        title="Delete photo"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 2,
                          color: 'var(--red)',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {photos.length === 0 && !canWrite && (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            color: 'var(--text3)',
            fontFamily: headingFont,
            fontSize: 14,
          }}
        >
          No inspection photos uploaded
        </div>
      )}

      {/* ─── Markup Canvas Modal ─────────────────────────────────────────────── */}

      {markupIndex !== null && photos[markupIndex] && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflow: 'auto',
            padding: '16px 8px',
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 6,
              marginBottom: 10,
              padding: '8px 12px',
              background: 'var(--surface)',
              borderRadius: 8,
              border: '1px solid var(--border)',
              maxWidth: 920,
              width: '100%',
            }}
          >
            {/* Draw tools */}
            <ToolBtn
              icon={<Pencil size={15} />}
              label="Draw"
              active={drawTool === 'freehand' && !pendingLabel}
              onClick={() => {
                setDrawTool('freehand')
                setPendingLabel(null)
                setTextPosition(null)
              }}
            />
            <ToolBtn
              icon={<ArrowUpRight size={15} />}
              label="Arrow"
              active={drawTool === 'arrow' && !pendingLabel}
              onClick={() => {
                setDrawTool('arrow')
                setPendingLabel(null)
                setTextPosition(null)
              }}
            />
            <ToolBtn
              icon={<Square size={15} />}
              label="Rect"
              active={drawTool === 'rectangle' && !pendingLabel}
              onClick={() => {
                setDrawTool('rectangle')
                setPendingLabel(null)
                setTextPosition(null)
              }}
            />
            <ToolBtn
              icon={<Type size={15} />}
              label="Text"
              active={drawTool === 'text' && !pendingLabel}
              onClick={() => {
                setDrawTool('text')
                setPendingLabel(null)
              }}
            />

            {/* Divider */}
            <div
              style={{
                width: 1,
                height: 24,
                background: 'var(--border)',
                margin: '0 4px',
              }}
            />

            {/* Colors */}
            {DRAW_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setDrawColor(c.value)}
                title={c.name}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: c.value,
                  border:
                    drawColor === c.value
                      ? '2px solid #fff'
                      : '2px solid transparent',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'border 0.15s',
                }}
              />
            ))}

            {/* Divider */}
            <div
              style={{
                width: 1,
                height: 24,
                background: 'var(--border)',
                margin: '0 4px',
              }}
            />

            {/* Undo */}
            <ToolBtn
              icon={<Undo2 size={15} />}
              label="Undo"
              active={false}
              onClick={handleUndo}
              disabled={actions.length === 0}
            />

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Save + Close */}
            <button
              onClick={handleSaveMarkup}
              disabled={savingMarkup}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                background: 'var(--green)',
                color: '#fff',
                fontFamily: headingFont,
                fontSize: 13,
                fontWeight: 600,
                cursor: savingMarkup ? 'wait' : 'pointer',
                opacity: savingMarkup ? 0.6 : 1,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {savingMarkup ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Save size={14} />
              )}
              Save Markup
            </button>
            <button
              onClick={() => setMarkupIndex(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--surface2)',
                color: 'var(--text2)',
                fontFamily: headingFont,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <X size={14} />
              Close
            </button>
          </div>

          {/* Label Presets */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 10,
              maxWidth: 920,
              width: '100%',
            }}
          >
            {LABEL_PRESETS.map((preset) => {
              const isActive = pendingLabel === preset.label
              const IconComp =
                preset.label === 'Good to Go'
                  ? CheckCircle2
                  : preset.label === 'Note'
                    ? CircleDot
                    : AlertTriangle
              return (
                <button
                  key={preset.label}
                  onClick={() => {
                    setPendingLabel(isActive ? null : preset.label)
                    setTextPosition(null)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: isActive
                      ? `1px solid ${preset.color}`
                      : '1px solid var(--border)',
                    background: isActive ? 'rgba(255,255,255,0.06)' : 'var(--surface)',
                    color: preset.color,
                    fontFamily: headingFont,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    transition: 'all 0.15s',
                  }}
                >
                  <IconComp size={13} />
                  {preset.label}
                </button>
              )
            })}
            {pendingLabel && (
              <span
                style={{
                  fontFamily: headingFont,
                  fontSize: 12,
                  color: 'var(--amber)',
                  alignSelf: 'center',
                  marginLeft: 4,
                }}
              >
                Click on the photo to place label
              </span>
            )}
          </div>

          {/* Canvas Container */}
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              maxWidth: 920,
              width: '100%',
              borderRadius: 8,
              overflow: 'hidden',
              border: '1px solid var(--border)',
              background: '#000',
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              style={{
                display: 'block',
                width: '100%',
                cursor: pendingLabel
                  ? 'crosshair'
                  : drawTool === 'text'
                    ? 'text'
                    : 'crosshair',
                touchAction: 'none',
              }}
            />

            {/* Text input overlay */}
            {textPosition && drawTool === 'text' && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.3)',
                }}
              >
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: 12,
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <input
                    autoFocus
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTextSubmit()
                      if (e.key === 'Escape') {
                        setTextPosition(null)
                        setTextInput('')
                      }
                    }}
                    placeholder="Type annotation..."
                    style={{
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      padding: '6px 10px',
                      color: 'var(--text1)',
                      fontFamily: headingFont,
                      fontSize: 14,
                      outline: 'none',
                      width: 220,
                    }}
                  />
                  <button
                    onClick={handleTextSubmit}
                    style={{
                      background: 'var(--accent)',
                      border: 'none',
                      borderRadius: 4,
                      padding: '6px 12px',
                      color: '#fff',
                      fontFamily: headingFont,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setTextPosition(null)
                      setTextInput('')
                    }}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      padding: '6px 8px',
                      color: 'var(--text3)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spin animation keyframes (injected once) */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ─── ToolBtn Sub-Component ──────────────────────────────────────────────────

function ToolBtn({
  icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        borderRadius: 5,
        border: active ? '1px solid var(--accent)' : '1px solid transparent',
        background: active ? 'rgba(79,127,255,0.12)' : 'transparent',
        color: active ? 'var(--accent)' : disabled ? 'var(--text3)' : 'var(--text2)',
        fontFamily: 'Barlow Condensed, sans-serif',
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        transition: 'all 0.15s',
      }}
    >
      {icon}
      {label}
    </button>
  )
}
