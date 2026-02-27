'use client'

import { useState, useRef, useCallback } from 'react'
import { usePortal } from '@/lib/portal-context'
import { C, money, fmt } from '@/lib/portal-theme'
import {
  CheckCircle2, Loader2, PenTool, X,
} from 'lucide-react'

interface Props {
  estimate: {
    id: string; estimate_number: string; title: string | null
    subtotal: number; discount_percent: number | null; discount_amount: number | null
    tax_percent: number | null; tax_amount: number | null; total: number
    notes: string | null; status: string; customer_note: string | null; created_at: string
  }
  lineItems: {
    id: string; name: string; description: string | null
    quantity: number; unit_price: number; total_price: number
    sort_order: number; specs: any
  }[]
  options: { id: string; label: string; sort_order: number; selected: boolean; line_item_ids: string[] }[]
  existingSignature: { id: string; signer_name: string; signed_at: string } | null
  customerId: string
  customerName: string
}

export default function PortalProposalView({
  estimate, lineItems, options, existingSignature, customerId, customerName,
}: Props) {
  const { token } = usePortal()
  const [selectedOption, setSelectedOption] = useState<string | null>(
    options.find(o => o.selected)?.id || options[0]?.id || null
  )
  const [showSignature, setShowSignature] = useState(false)
  const [signed, setSigned] = useState(!!existingSignature)
  const [signerName, setSignerName] = useState(customerName || '')

  // Filter line items by selected option
  const visibleItems = selectedOption && options.length > 0
    ? lineItems.filter(li => {
        const opt = options.find(o => o.id === selectedOption)
        return opt?.line_item_ids.includes(li.id)
      })
    : lineItems

  return (
    <div style={{ padding: '20px 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
        Proposal
      </h1>
      <div style={{ fontSize: 13, color: C.text2, marginBottom: 20 }}>
        #{estimate.estimate_number} {estimate.title && `- ${estimate.title}`}
      </div>

      {/* Status banner */}
      {signed && (
        <div style={{
          background: `${C.green}12`,
          border: `1px solid ${C.green}30`,
          borderRadius: 12,
          padding: 14,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <CheckCircle2 size={20} color={C.green} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.green }}>Proposal Accepted</div>
            {existingSignature && (
              <div style={{ fontSize: 11, color: C.text2 }}>
                Signed by {existingSignature.signer_name} on {fmt(existingSignature.signed_at)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Package options (A/B/C) */}
      {options.length > 1 && (
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: C.text3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            Select Package
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedOption(opt.id)}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  background: selectedOption === opt.id ? `${C.accent}18` : C.surface,
                  border: `2px solid ${selectedOption === opt.id ? C.accent : C.border}`,
                  borderRadius: 10,
                  color: selectedOption === opt.id ? C.accent : C.text2,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Line items */}
      <section style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 20,
      }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{ fontSize: 14, fontWeight: 600 }}>Line Items</h2>
        </div>
        {visibleItems.map((li, i) => (
          <div key={li.id} style={{
            padding: '12px 16px',
            borderBottom: i < visibleItems.length - 1 ? `1px solid ${C.border}` : 'none',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{li.name}</div>
                {li.description && (
                  <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>{li.description}</div>
                )}
              </div>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'var(--font-mono, JetBrains Mono, monospace)',
                flexShrink: 0,
                marginLeft: 12,
              }}>
                {money(li.total_price)}
              </div>
            </div>
          </div>
        ))}
        {/* Total */}
        <div style={{
          padding: '14px 16px',
          borderTop: `1px solid ${C.border}`,
          background: C.surface2,
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Total</span>
          <span style={{
            fontSize: 18,
            fontWeight: 700,
            color: C.accent,
            fontFamily: 'var(--font-mono, JetBrains Mono, monospace)',
          }}>
            {money(estimate.total)}
          </span>
        </div>
      </section>

      {/* Notes */}
      {estimate.notes && (
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Notes</h3>
          <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {estimate.notes}
          </div>
        </div>
      )}

      {/* Accept & Sign */}
      {!signed && estimate.status !== 'accepted' && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowSignature(true)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '14px 20px',
              background: C.green,
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            <PenTool size={18} />
            Accept & Sign
          </button>
        </div>
      )}

      {/* Signature modal */}
      {showSignature && (
        <SignatureModal
          token={token}
          proposalId={estimate.id}
          customerId={customerId}
          signerName={signerName}
          onNameChange={setSignerName}
          onClose={() => setShowSignature(false)}
          onSigned={() => { setSigned(true); setShowSignature(false) }}
        />
      )}
    </div>
  )
}

function SignatureModal({
  token, proposalId, customerId, signerName, onNameChange, onClose, onSigned,
}: {
  token: string; proposalId: string; customerId: string; signerName: string
  onNameChange: (n: string) => void; onClose: () => void; onSigned: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const getPos = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }, [])

  function startDraw(e: React.TouchEvent | React.MouseEvent) {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    setDrawing(true)
    setHasDrawn(true)
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  function draw(e: React.TouchEvent | React.MouseEvent) {
    if (!drawing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#e8eaed'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  function stopDraw() { setDrawing(false) }

  function clearCanvas() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  async function handleSubmit() {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawn || !signerName.trim()) return
    setSubmitting(true)
    try {
      const signatureData = canvas.toDataURL('image/png')
      const res = await fetch('/api/portal/sign-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, proposalId, customerId, signerName: signerName.trim(), signatureData }),
      })
      if (res.ok) onSigned()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        background: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        width: '100%', maxWidth: 480, padding: '20px 16px 32px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Sign Proposal</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        <input
          type="text"
          placeholder="Full Name"
          value={signerName}
          onChange={(e) => onNameChange(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', background: C.surface2,
            border: `1px solid ${C.border}`, borderRadius: 8, color: C.text1, fontSize: 15, marginBottom: 14,
          }}
        />

        <div style={{ fontSize: 12, color: C.text3, marginBottom: 6 }}>Draw your signature below</div>
        <canvas
          ref={canvasRef} width={360} height={140}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
          style={{
            width: '100%', height: 140, background: C.bg,
            border: `1px solid ${C.border}`, borderRadius: 8, touchAction: 'none', cursor: 'crosshair',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, marginBottom: 16 }}>
          <button onClick={clearCanvas} style={{ fontSize: 12, color: C.text3, background: 'none', border: 'none', cursor: 'pointer' }}>
            Clear
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!hasDrawn || !signerName.trim() || submitting}
          style={{
            width: '100%', padding: '14px 20px',
            background: hasDrawn && signerName.trim() ? C.green : C.surface2,
            color: hasDrawn && signerName.trim() ? '#fff' : C.text3,
            border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 15,
            cursor: hasDrawn && signerName.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
          Accept Proposal
        </button>
        <div style={{ fontSize: 11, color: C.text3, textAlign: 'center', marginTop: 10 }}>
          By signing, you agree to the terms outlined in this proposal.
        </div>
      </div>
    </div>
  )
}
