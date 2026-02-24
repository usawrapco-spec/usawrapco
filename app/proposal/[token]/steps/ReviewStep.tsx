'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

interface ReviewStepProps {
  selectedPkg: any
  upsells: any[]
  total: number
  depositAmount: number
  onSign: (signatureBase64: string) => Promise<void>
  onBack: () => void
  colors: any
}

export default function ReviewStep({
  selectedPkg, upsells, total, depositAmount, onSign, onBack, colors: C,
}: ReviewStepProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasSigned, setHasSigned] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)

  const balance = total - depositAmount

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    ctx.strokeStyle = '#f5f5f5'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }, [])

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    setHasSigned(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }, [getPos])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }, [isDrawing, getPos])

  const endDraw = useCallback(() => { setIsDrawing(false) }, [])

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
  }

  const handleSubmit = async () => {
    if (!hasSigned || !agreed || submitting) return
    setSubmitting(true)
    const canvas = canvasRef.current
    const sigData = canvas?.toDataURL('image/png') || ''
    await onSign(sigData)
    setSubmitting(false)
  }

  return (
    <div style={{ maxWidth: 580, margin: '0 auto', padding: '32px 20px 80px' }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: C.text3, fontSize: 13, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20, padding: 0,
      }}>
        <ChevronLeft size={16} /> Back
      </button>

      <div style={{
        fontSize: 28, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
        textAlign: 'center', marginBottom: 32,
      }}>
        Review &amp; Sign
      </div>

      {/* Summary */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
        overflow: 'hidden', marginBottom: 24,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 18px', borderBottom: `1px solid ${C.border}`,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.text3, marginBottom: 2 }}>Package</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text1 }}>{selectedPkg?.name}</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text1, fontFamily: 'JetBrains Mono, monospace' }}>
            ${Number(selectedPkg?.price || 0).toLocaleString()}
          </div>
        </div>

        {upsells.map((u: any) => (
          <div key={u.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 18px', borderBottom: `1px solid ${C.border}`,
          }}>
            <span style={{ fontSize: 14, color: C.text2 }}>{u.name}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text2, fontFamily: 'JetBrains Mono, monospace' }}>
              +${Number(u.price).toLocaleString()}
            </span>
          </div>
        ))}

        <div style={{ padding: '16px 18px', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 14, color: C.text2 }}>Subtotal</span>
            <span style={{ fontSize: 14, color: C.text2, fontFamily: 'JetBrains Mono, monospace' }}>${total.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.accent }}>Deposit Required</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.accent, fontFamily: 'JetBrains Mono, monospace' }}>${depositAmount.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.text3 }}>Balance due at install</span>
            <span style={{ fontSize: 14, color: C.text3, fontFamily: 'JetBrains Mono, monospace' }}>${balance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Signature */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: 20, marginBottom: 24,
      }}>
        <div style={{
          fontSize: 14, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif',
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12,
        }}>
          Digital Signature
        </div>
        <div style={{
          position: 'relative',
          border: `2px dashed ${hasSigned ? C.accent : C.border}`,
          borderRadius: 10, overflow: 'hidden', marginBottom: 12, background: 'rgba(0,0,0,0.2)',
        }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: 120, display: 'block', touchAction: 'none', cursor: 'crosshair' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          {!hasSigned && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none', color: C.text3, fontSize: 14,
            }}>
              Sign here
            </div>
          )}
        </div>
        <button onClick={clearSignature} style={{
          background: 'none', border: `1px solid ${C.border}`, borderRadius: 8,
          padding: '6px 14px', color: C.text3, fontSize: 12, cursor: 'pointer',
        }}>
          Clear
        </button>
      </div>

      {/* Agreement */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          style={{ marginTop: 3, accentColor: C.accent, width: 18, height: 18 }}
        />
        <span style={{ fontSize: 13, color: C.text2, lineHeight: 1.5 }}>
          I agree to the terms and authorize a deposit of <strong style={{ color: C.accent }}>${depositAmount.toLocaleString()}</strong>.
          By signing, I approve this proposal and authorize the deposit payment.
        </span>
      </label>

      <button
        onClick={handleSubmit}
        disabled={!hasSigned || !agreed || submitting}
        style={{
          width: '100%', padding: '18px', border: 'none', borderRadius: 14,
          background: (hasSigned && agreed && !submitting) ? `linear-gradient(135deg, ${C.accent}, #d97706)` : C.surface2,
          color: (hasSigned && agreed) ? '#000' : C.text3,
          fontSize: 17, fontWeight: 800, cursor: (hasSigned && agreed && !submitting) ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase',
          letterSpacing: '0.02em', opacity: (hasSigned && agreed) ? 1 : 0.5,
        }}
      >
        {submitting ? (
          <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
        ) : (
          <>Continue to Payment <ChevronRight size={20} /></>
        )}
      </button>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
