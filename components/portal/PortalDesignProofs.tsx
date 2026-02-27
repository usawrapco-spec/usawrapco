'use client'

import { useState } from 'react'
import { usePortal } from '@/lib/portal-context'
import { C, fmt } from '@/lib/portal-theme'
import { createClient } from '@/lib/supabase/client'
import {
  ThumbsUp, RotateCcw, Loader2, Palette, ZoomIn, X, ChevronLeft, ChevronRight,
} from 'lucide-react'

interface Proof {
  id: string
  project_id: string
  image_url: string | null
  thumbnail_url: string | null
  version_number: number
  customer_status: string
  designer_notes: string | null
  created_at: string
  project_title: string
}

export default function PortalDesignProofs({ proofs }: { proofs: Proof[] }) {
  const { token } = usePortal()
  const [localProofs, setLocalProofs] = useState(proofs)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)

  const pending = localProofs.filter(p => p.customer_status === 'pending')
  const reviewed = localProofs.filter(p => p.customer_status !== 'pending')

  async function handleAction(proofId: string, action: 'approved' | 'revision_requested') {
    setLoading(proofId)
    try {
      const res = await fetch('/api/portal/proof-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          proofId,
          action,
          feedback: feedback[proofId] || '',
        }),
      })
      if (res.ok) {
        setLocalProofs(prev => prev.map(p =>
          p.id === proofId ? { ...p, customer_status: action } : p
        ))
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ padding: '20px 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
        Design Proofs
      </h1>

      {localProofs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.text3 }}>
          <Palette size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>No design proofs yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>We will upload designs here for your review</div>
        </div>
      )}

      {/* Pending proofs */}
      {pending.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: C.amber, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            Needs Your Review ({pending.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {pending.map((proof, idx) => (
              <div key={proof.id} style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                overflow: 'hidden',
              }}>
                {/* Image */}
                {proof.image_url && (
                  <div
                    onClick={() => setLightbox(localProofs.indexOf(proof))}
                    style={{ position: 'relative', cursor: 'pointer' }}
                  >
                    <img
                      src={proof.thumbnail_url || proof.image_url}
                      alt={`Proof v${proof.version_number}`}
                      style={{ width: '100%', height: 200, objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: 'rgba(0,0,0,0.6)',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 11,
                      color: '#fff',
                    }}>
                      <ZoomIn size={12} style={{ display: 'inline', marginRight: 4 }} />
                      Full size
                    </div>
                  </div>
                )}

                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{proof.project_title}</div>
                      <div style={{ fontSize: 12, color: C.text3 }}>Version {proof.version_number} &middot; {fmt(proof.created_at)}</div>
                    </div>
                  </div>

                  {proof.designer_notes && (
                    <div style={{
                      fontSize: 12,
                      color: C.text2,
                      background: C.surface2,
                      borderRadius: 8,
                      padding: '8px 12px',
                      marginBottom: 12,
                    }}>
                      {proof.designer_notes}
                    </div>
                  )}

                  {/* Feedback input */}
                  <textarea
                    placeholder="Add feedback (optional)..."
                    value={feedback[proof.id] || ''}
                    onChange={(e) => setFeedback(prev => ({ ...prev, [proof.id]: e.target.value }))}
                    style={{
                      width: '100%',
                      minHeight: 60,
                      background: C.surface2,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: C.text1,
                      fontSize: 13,
                      resize: 'vertical',
                      marginBottom: 12,
                    }}
                  />

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => handleAction(proof.id, 'approved')}
                      disabled={loading === proof.id}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '10px 16px',
                        background: C.green,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        opacity: loading === proof.id ? 0.6 : 1,
                      }}
                    >
                      {loading === proof.id ? <Loader2 size={16} className="animate-spin" /> : <ThumbsUp size={16} />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(proof.id, 'revision_requested')}
                      disabled={loading === proof.id}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '10px 16px',
                        background: 'transparent',
                        color: C.amber,
                        border: `1px solid ${C.amber}`,
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        opacity: loading === proof.id ? 0.6 : 1,
                      }}
                    >
                      {loading === proof.id ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                      Request Revision
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviewed proofs */}
      {reviewed.length > 0 && (
        <section>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: C.text3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            Reviewed ({reviewed.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reviewed.map((proof) => (
              <div key={proof.id} style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 14,
                display: 'flex',
                gap: 12,
              }}>
                {proof.image_url && (
                  <div
                    onClick={() => setLightbox(localProofs.indexOf(proof))}
                    style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}
                  >
                    <img
                      src={proof.thumbnail_url || proof.image_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{proof.project_title} v{proof.version_number}</div>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    marginTop: 4,
                    color: proof.customer_status === 'approved' ? C.green : C.amber,
                  }}>
                    {proof.customer_status === 'approved' ? 'Approved' : 'Revision Requested'}
                  </div>
                  <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{fmt(proof.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightbox !== null && localProofs[lightbox]?.image_url && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.95)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
              padding: 8, color: '#fff', cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
          <img
            src={localProofs[lightbox].image_url!}
            alt=""
            style={{ maxWidth: '95%', maxHeight: '85vh', borderRadius: 8 }}
          />
          <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
            <button
              onClick={() => setLightbox(Math.max(0, lightbox - 1))}
              disabled={lightbox === 0}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 8, color: '#fff', cursor: 'pointer', opacity: lightbox === 0 ? 0.3 : 1 }}
            >
              <ChevronLeft size={20} />
            </button>
            <span style={{ color: '#fff', fontSize: 13, lineHeight: '36px' }}>
              {lightbox + 1} / {localProofs.length}
            </span>
            <button
              onClick={() => setLightbox(Math.min(localProofs.length - 1, lightbox + 1))}
              disabled={lightbox === localProofs.length - 1}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 8, color: '#fff', cursor: 'pointer', opacity: lightbox === localProofs.length - 1 ? 0.3 : 1 }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
