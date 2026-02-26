'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { PenTool, Check, RotateCcw, X } from 'lucide-react'
import type { MobileJob } from './mobileConstants'

export default function MobileSignatureModal({
  job,
  onClose,
}: {
  job: MobileJob
  onClose: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [agreed, setAgreed] = useState(false)

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)
    ctx.strokeStyle = '#e8eaed'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    }
  }, [])

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setDrawing(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }, [getPos])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasSignature(true)
  }, [drawing, getPos])

  const endDraw = useCallback(() => {
    setDrawing(false)
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }, [])

  const profit = job.revenue - job.cost

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'relative',
        background: 'var(--surface)',
        borderRadius: '16px 16px 0 0',
        padding: 16,
        maxHeight: '75%',
        overflow: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text1)',
          }}>
            <PenTool size={16} color="var(--purple)" />
            Sign Off
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Pay / bonus terms */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 12,
        }}>
          <div style={{
            background: 'var(--surface2)',
            borderRadius: 8,
            padding: 10,
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600 }}>Revenue</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>
              ${job.revenue.toLocaleString()}
            </div>
          </div>
          <div style={{
            background: 'var(--surface2)',
            borderRadius: 8,
            padding: 10,
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600 }}>Profit</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
              ${profit.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>Draw signature below</div>
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface2)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: 120, display: 'block', touchAction: 'none' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
            {hasSignature && (
              <button
                onClick={clearCanvas}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  background: 'rgba(0,0,0,0.5)',
                  border: 'none',
                  borderRadius: 6,
                  padding: 4,
                  cursor: 'pointer',
                  color: 'var(--text2)',
                }}
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Agree checkbox */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          color: 'var(--text2)',
          cursor: 'pointer',
          marginBottom: 12,
        }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={{ accentColor: 'var(--purple)' }}
          />
          I confirm that all work has been completed to standard
        </label>

        {/* Submit */}
        <button
          disabled={!hasSignature || !agreed}
          onClick={onClose}
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 8,
            border: 'none',
            background: hasSignature && agreed ? 'var(--green)' : 'var(--surface2)',
            color: hasSignature && agreed ? '#fff' : 'var(--text3)',
            fontSize: 13,
            fontWeight: 700,
            cursor: hasSignature && agreed ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Check size={16} />
          Submit Sign-Off
        </button>
      </div>
    </div>
  )
}
