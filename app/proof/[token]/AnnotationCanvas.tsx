'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import type { ProofAnnotation, AnnotationTool, AnnotationData, DrawData, ArrowData, StampData } from '@/lib/proof-types'
import AnnotationShape from './AnnotationShape'

interface Props {
  imageUrl: string
  annotations: ProofAnnotation[]
  activeTool: AnnotationTool
  activeColor: string
  activeStamp: string
  readOnly?: boolean
  onAddAnnotation: (annotation: Omit<ProofAnnotation, 'id' | 'proof_id' | 'created_at'>) => void
}

export default function AnnotationCanvas({
  imageUrl, annotations, activeTool, activeColor, activeStamp, readOnly, onAddAnnotation,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 })
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  // Drawing state
  const [drawing, setDrawing] = useState(false)
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([])
  const [startPt, setStartPt] = useState<{ x: number; y: number } | null>(null)
  const [currentPt, setCurrentPt] = useState<{ x: number; y: number } | null>(null)
  const [showTextInput, setShowTextInput] = useState(false)
  const [textPos, setTextPos] = useState({ x: 0, y: 0 })
  const [textValue, setTextValue] = useState('')
  const textInputRef = useRef<HTMLInputElement>(null)

  // Touch zoom state
  const lastTouchDist = useRef<number | null>(null)

  // Image loaded handler
  const onImgLoad = useCallback(() => {
    if (!imgRef.current || !containerRef.current) return
    const container = containerRef.current
    const img = imgRef.current
    const cw = container.clientWidth
    const ch = container.clientHeight
    const iw = img.naturalWidth
    const ih = img.naturalHeight

    // Fit image into container
    const fitScale = Math.min(cw / iw, ch / ih, 1)
    const displayW = iw * fitScale
    const displayH = ih * fitScale

    setImgSize({ width: displayW, height: displayH })
    setScale(1)
    setOffset({ x: (cw - displayW) / 2, y: (ch - displayH) / 2 })
  }, [])

  useEffect(() => {
    if (showTextInput && textInputRef.current) {
      textInputRef.current.focus()
    }
  }, [showTextInput])

  // Get pointer position as percentage of image dimensions
  const getRelPos = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    const px = (clientX - rect.left - offset.x) / (imgSize.width * scale)
    const py = (clientY - rect.top - offset.y) / (imgSize.height * scale)
    return { x: px * 100, y: py * 100 }
  }, [offset, imgSize, scale])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (readOnly || activeTool === 'select') return
    const pos = getRelPos(e.clientX, e.clientY)
    if (!pos) return

    if (activeTool === 'draw') {
      setDrawing(true)
      setCurrentPoints([pos])
      ;(e.target as SVGSVGElement).setPointerCapture?.(e.pointerId)
    } else if (activeTool === 'arrow' || activeTool === 'rect' || activeTool === 'circle') {
      setDrawing(true)
      setStartPt(pos)
      setCurrentPt(pos)
      ;(e.target as SVGSVGElement).setPointerCapture?.(e.pointerId)
    } else if (activeTool === 'text') {
      setTextPos(pos)
      setTextValue('')
      setShowTextInput(true)
    } else if (activeTool === 'stamp') {
      onAddAnnotation({
        type: 'stamp',
        color: activeColor,
        data: { x: pos.x, y: pos.y, stamp: activeStamp || 'thumbsUp' } as StampData,
        page: 1,
      })
    }
  }, [readOnly, activeTool, activeColor, activeStamp, getRelPos, onAddAnnotation])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!drawing) return
    const pos = getRelPos(e.clientX, e.clientY)
    if (!pos) return

    if (activeTool === 'draw') {
      setCurrentPoints(prev => [...prev, pos])
    } else if (activeTool === 'arrow' || activeTool === 'rect' || activeTool === 'circle') {
      setCurrentPt(pos)
    }
  }, [drawing, activeTool, getRelPos])

  const handlePointerUp = useCallback(() => {
    if (!drawing) return
    setDrawing(false)

    if (activeTool === 'draw' && currentPoints.length >= 2) {
      onAddAnnotation({
        type: 'draw',
        color: activeColor,
        data: { points: currentPoints, strokeWidth: 3 } as DrawData,
        page: 1,
      })
    } else if (activeTool === 'arrow' && startPt && currentPt) {
      onAddAnnotation({
        type: 'arrow',
        color: activeColor,
        data: { x1: startPt.x, y1: startPt.y, x2: currentPt.x, y2: currentPt.y, strokeWidth: 3 } as ArrowData,
        page: 1,
      })
    } else if (activeTool === 'rect' && startPt && currentPt) {
      const x = Math.min(startPt.x, currentPt.x)
      const y = Math.min(startPt.y, currentPt.y)
      const width = Math.abs(currentPt.x - startPt.x)
      const height = Math.abs(currentPt.y - startPt.y)
      if (width > 0.5 && height > 0.5) {
        onAddAnnotation({
          type: 'rect',
          color: activeColor,
          data: { x, y, width, height, strokeWidth: 3 },
          page: 1,
        })
      }
    } else if (activeTool === 'circle' && startPt && currentPt) {
      const cx = (startPt.x + currentPt.x) / 2
      const cy = (startPt.y + currentPt.y) / 2
      const rx = Math.abs(currentPt.x - startPt.x) / 2
      const ry = Math.abs(currentPt.y - startPt.y) / 2
      if (rx > 0.3 && ry > 0.3) {
        onAddAnnotation({
          type: 'circle',
          color: activeColor,
          data: { cx, cy, rx, ry, strokeWidth: 3 },
          page: 1,
        })
      }
    }

    setCurrentPoints([])
    setStartPt(null)
    setCurrentPt(null)
  }, [drawing, activeTool, activeColor, currentPoints, startPt, currentPt, onAddAnnotation])

  const submitText = useCallback(() => {
    if (textValue.trim()) {
      onAddAnnotation({
        type: 'text',
        color: activeColor,
        data: { x: textPos.x, y: textPos.y, text: textValue.trim(), fontSize: 16 },
        page: 1,
      })
    }
    setShowTextInput(false)
    setTextValue('')
  }, [textValue, textPos, activeColor, onAddAnnotation])

  // Zoom controls
  const zoomIn = () => setScale(s => Math.min(s * 1.25, 4))
  const zoomOut = () => setScale(s => Math.max(s / 1.25, 0.5))
  const fitToScreen = () => {
    setScale(1)
    if (containerRef.current) {
      const cw = containerRef.current.clientWidth
      const ch = containerRef.current.clientHeight
      setOffset({
        x: (cw - imgSize.width) / 2,
        y: (ch - imgSize.height) / 2,
      })
    }
  }

  // Touch zoom
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (lastTouchDist.current !== null) {
        const delta = dist / lastTouchDist.current
        setScale(s => Math.min(Math.max(s * delta, 0.5), 4))
      }
      lastTouchDist.current = dist
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null
  }, [])

  // Current in-progress annotation preview
  const renderPreview = () => {
    if (!drawing || !imgSize.width) return null
    const w = imgSize.width
    const h = imgSize.height

    if (activeTool === 'draw' && currentPoints.length >= 2) {
      const pts = currentPoints.map(p => `${(p.x / 100) * w},${(p.y / 100) * h}`).join(' ')
      return <polyline points={pts} fill="none" stroke={activeColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
    }
    if ((activeTool === 'arrow') && startPt && currentPt) {
      return <line x1={(startPt.x / 100) * w} y1={(startPt.y / 100) * h} x2={(currentPt.x / 100) * w} y2={(currentPt.y / 100) * h} stroke={activeColor} strokeWidth={3} opacity={0.7} />
    }
    if (activeTool === 'rect' && startPt && currentPt) {
      const x = Math.min(startPt.x, currentPt.x)
      const y = Math.min(startPt.y, currentPt.y)
      const rw = Math.abs(currentPt.x - startPt.x)
      const rh = Math.abs(currentPt.y - startPt.y)
      return <rect x={(x / 100) * w} y={(y / 100) * h} width={(rw / 100) * w} height={(rh / 100) * h} fill="none" stroke={activeColor} strokeWidth={3} opacity={0.7} rx={2} />
    }
    if (activeTool === 'circle' && startPt && currentPt) {
      const cx = ((startPt.x + currentPt.x) / 2 / 100) * w
      const cy = ((startPt.y + currentPt.y) / 2 / 100) * h
      const rx = (Math.abs(currentPt.x - startPt.x) / 2 / 100) * w
      const ry = (Math.abs(currentPt.y - startPt.y) / 2 / 100) * h
      return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={activeColor} strokeWidth={3} opacity={0.7} />
    }
    return null
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Zoom controls */}
      <div style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 10,
        display: 'flex',
        gap: 4,
      }}>
        <button onClick={zoomIn} style={zoomBtnStyle} title="Zoom in"><ZoomIn size={16} /></button>
        <button onClick={zoomOut} style={zoomBtnStyle} title="Zoom out"><ZoomOut size={16} /></button>
        <button onClick={fitToScreen} style={zoomBtnStyle} title="Fit to screen"><Maximize size={16} /></button>
        <span style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.6)', color: '#9299b5', fontSize: 11, fontWeight: 700 }}>
          {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: '#0a0c12',
          borderRadius: 10,
          border: '1px solid rgba(79,127,255,0.1)',
          position: 'relative',
          touchAction: 'none',
        }}
      >
        <div style={{
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          position: 'absolute',
          left: offset.x,
          top: offset.y,
          width: imgSize.width || '100%',
          height: imgSize.height || '100%',
        }}>
          {/* Design image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Design proof"
            onLoad={onImgLoad}
            draggable={false}
            style={{
              width: imgSize.width || '100%',
              height: imgSize.height || 'auto',
              display: 'block',
              userSelect: 'none',
            }}
          />

          {/* SVG overlay */}
          <svg
            width={imgSize.width || 0}
            height={imgSize.height || 0}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              cursor: activeTool === 'select' ? 'default' :
                      activeTool === 'text' ? 'text' :
                      'crosshair',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Saved annotations */}
            {annotations.map(ann => (
              <AnnotationShape
                key={ann.id}
                annotation={ann}
                containerWidth={imgSize.width}
                containerHeight={imgSize.height}
              />
            ))}

            {/* In-progress preview */}
            {renderPreview()}
          </svg>

          {/* Floating text input */}
          {showTextInput && (
            <div style={{
              position: 'absolute',
              left: (textPos.x / 100) * imgSize.width - 4,
              top: (textPos.y / 100) * imgSize.height - 4,
              zIndex: 20,
            }}>
              <input
                ref={textInputRef}
                value={textValue}
                onChange={e => setTextValue(e.target.value)}
                onBlur={submitText}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitText()
                  if (e.key === 'Escape') { setShowTextInput(false); setTextValue('') }
                }}
                placeholder="Type here..."
                style={{
                  background: 'rgba(0,0,0,0.8)',
                  border: `2px solid ${activeColor}`,
                  borderRadius: 6,
                  color: activeColor,
                  padding: '4px 8px',
                  fontSize: 14,
                  fontWeight: 700,
                  outline: 'none',
                  minWidth: 120,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const zoomBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 6,
  background: 'rgba(0,0,0,0.6)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#e8eaed',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
