'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Palette, CheckCircle2, Pencil, ZoomIn, ZoomOut, RotateCcw,
  MessageSquarePlus, X, ChevronLeft, ChevronRight, MapPin
} from 'lucide-react'

interface CustomerProofingProps {
  token: string
}

interface Pin {
  id: string
  x: number
  y: number
  comment: string
  confirmed: boolean
}

export default function CustomerProofing({ token }: CustomerProofingProps) {
  const supabase = createClient()

  // Flow detection
  const [flow, setFlow] = useState<'new' | 'legacy' | null>(null)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState<'approved' | 'revision' | null>(null)

  // ── NEW FLOW state ──────────────────────────────────────────────
  const [proofToken, setProofToken] = useState<any>(null)
  const [designProject, setDesignProject] = useState<any>(null)
  const [proofFiles, setProofFiles] = useState<any[]>([])
  const [fileIndex, setFileIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 })
  const [pins, setPins] = useState<Pin[]>([])
  const [addingPin, setAddingPin] = useState(false)
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null)
  const [pinComment, setPinComment] = useState('')
  const [revisionNote, setRevisionNote] = useState('')
  const [saving, setSaving] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  // ── LEGACY FLOW state ───────────────────────────────────────────
  const [settings, setSettings] = useState<any>(null)
  const [proofs, setProofs] = useState<any[]>([])
  const [feedback, setFeedback] = useState('')
  const [confirmName, setConfirmName] = useState('')
  const [responsibilityAccepted, setResponsibilityAccepted] = useState(false)
  const [legacySaving, setLegacySaving] = useState(false)

  // ── Load ────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      // Try new flow first
      const { data: pt } = await supabase
        .from('proofing_tokens')
        .select('*')
        .eq('token', token)
        .single()

      if (pt) {
        setProofToken(pt)
        setFlow('new')

        // Load design project
        if (pt.design_project_id) {
          const { data: dp } = await supabase
            .from('design_projects')
            .select('*')
            .eq('id', pt.design_project_id)
            .single()
          if (dp) setDesignProject(dp)

          // Load proof files (latest version first)
          const { data: files } = await supabase
            .from('design_project_files')
            .select('*')
            .eq('design_project_id', pt.design_project_id)
            .order('version', { ascending: false })
          if (files) setProofFiles(files.filter(f => f.file_type?.startsWith('image') || f.file_url?.match(/\.(png|jpg|jpeg|gif|webp)$/i)))
        }

        setLoading(false)
        return
      }

      // Fall back to legacy flow
      const { data: s } = await supabase
        .from('proof_settings')
        .select('*')
        .eq('proofing_token', token)
        .single()

      if (s) {
        setSettings(s)
        const { data: p } = await supabase
          .from('design_proofs')
          .select('*')
          .eq('project_id', s.project_id)
          .order('version_number', { ascending: false })
        if (p) setProofs(p)
        setFlow('legacy')
      }

      setLoading(false)
    }
    load()
  }, [token])

  // ── New flow: zoom / pan helpers ────────────────────────────────
  const resetView = () => { setZoom(1); setPanX(0); setPanY(0) }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (addingPin) return
    setIsPanning(true)
    setLastMouse({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return
    setPanX(x => x + e.clientX - lastMouse.x)
    setPanY(y => y + e.clientY - lastMouse.y)
    setLastMouse({ x: e.clientX, y: e.clientY })
  }, [isPanning, lastMouse])

  const handleMouseUp = () => setIsPanning(false)

  const handleImageClick = (e: React.MouseEvent) => {
    if (!addingPin || !imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPendingPin({ x, y })
    setPinComment('')
  }

  const confirmPin = () => {
    if (!pendingPin || !pinComment.trim()) return
    setPins(prev => [...prev, {
      id: crypto.randomUUID(),
      x: pendingPin.x,
      y: pendingPin.y,
      comment: pinComment.trim(),
      confirmed: true,
    }])
    setPendingPin(null)
    setPinComment('')
    setAddingPin(false)
  }

  const removePin = (id: string) => setPins(prev => prev.filter(p => p.id !== id))

  // ── New flow: approve ───────────────────────────────────────────
  const handleApprove = async () => {
    if (!proofToken) return
    setSaving(true)
    await supabase.from('proofing_tokens').update({ status: 'approved' }).eq('id', proofToken.id)
    if (designProject) {
      await supabase.from('design_projects').update({ status: 'approved' }).eq('id', designProject.id)
    }
    setSaving(false)
    setDone('approved')
  }

  // ── New flow: request revision ──────────────────────────────────
  const handleRevision = async () => {
    if (!proofToken) return
    setSaving(true)
    const pinSummary = pins.map((p, i) => `Pin ${i + 1}: ${p.comment}`).join('\n')
    const fullNote = [revisionNote, pinSummary].filter(Boolean).join('\n\n')
    await supabase.from('proofing_tokens').update({
      status: 'revision_requested',
      revision_notes: fullNote || null,
    }).eq('id', proofToken.id)
    if (designProject) {
      await supabase.from('design_projects').update({ status: 'revision' }).eq('id', designProject.id)
    }
    setSaving(false)
    setDone('revision')
  }

  // ── Legacy flow actions ─────────────────────────────────────────
  const latestProof = proofs[0]
  const revisionsLeft = settings ? settings.max_revisions - settings.revisions_used : 0

  const approveDesign = async () => {
    if (!latestProof || !confirmName || !responsibilityAccepted) return
    setLegacySaving(true)
    await supabase.from('design_proofs').update({
      customer_status: 'approved',
      customer_approved_at: new Date().toISOString(),
      customer_name_confirm: confirmName,
      responsibility_accepted: true,
      customer_feedback: feedback || 'Approved — no changes needed',
    }).eq('id', latestProof.id)
    setProofs(prev => prev.map(p => p.id === latestProof.id
      ? { ...p, customer_status: 'approved', customer_name_confirm: confirmName } : p))
    setLegacySaving(false)
  }

  const requestRevision = async () => {
    if (!latestProof || !feedback.trim() || revisionsLeft <= 0) return
    setLegacySaving(true)
    await supabase.from('design_proofs').update({
      customer_status: 'revision_requested',
      customer_feedback: feedback,
    }).eq('id', latestProof.id)
    await supabase.from('proof_settings').update({
      revisions_used: (settings.revisions_used || 0) + 1,
    }).eq('id', settings.id)
    setProofs(prev => prev.map(p => p.id === latestProof.id
      ? { ...p, customer_status: 'revision_requested', customer_feedback: feedback } : p))
    setSettings((s: any) => ({ ...s, revisions_used: (s.revisions_used || 0) + 1 }))
    setFeedback('')
    setLegacySaving(false)
  }

  // ── Render: loading / error ─────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0f14' }}>
      <div style={{ color: '#9299b5', fontSize: 14 }}>Loading proof...</div>
    </div>
  )

  if (!flow) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0f14' }}>
      <div style={{ textAlign: 'center' }}>
        <X size={40} style={{ color: '#f25a5a', margin: '0 auto 12px' }} />
        <div style={{ color: '#e8eaed', fontWeight: 700, fontSize: 16 }}>Invalid or expired proof link.</div>
      </div>
    </div>
  )

  // ── Render: thank-you screen ────────────────────────────────────
  if (done) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0f14' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: '0 24px' }}>
        <CheckCircle2 size={56} style={{ color: done === 'approved' ? '#22c07a' : '#f59e0b', margin: '0 auto 20px' }} />
        <div style={{ fontSize: 24, fontWeight: 900, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.02em', marginBottom: 8 }}>
          {done === 'approved' ? 'Design Approved!' : 'Revision Requested'}
        </div>
        <div style={{ fontSize: 14, color: '#9299b5', lineHeight: 1.6 }}>
          {done === 'approved'
            ? "We've received your approval and will proceed to production. Our team will be in touch with next steps."
            : "We've received your revision notes and will get back to you with an updated design shortly."}
        </div>
      </div>
    </div>
  )

  // ── Render: NEW FLOW ─────────────────────────────────────────────
  if (flow === 'new') {
    const currentFile = proofFiles[fileIndex]
    const alreadyActioned = proofToken?.status === 'approved' || proofToken?.status === 'revision_requested'

    return (
      <div style={{ minHeight: '100vh', background: '#0d0f14', color: '#e8eaed' }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #1a1d27', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.04em' }}>
              USA WRAP CO
            </div>
            <div style={{ fontSize: 12, color: '#9299b5', marginTop: 2 }}>Design Proof Review</div>
          </div>
          {designProject && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed' }}>{designProject.title || 'Design Proof'}</div>
              <div style={{ fontSize: 11, color: '#9299b5', marginTop: 2 }}>
                {designProject.design_type && <span style={{ textTransform: 'capitalize' }}>{designProject.design_type}</span>}
              </div>
            </div>
          )}
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

          {/* Already actioned */}
          {alreadyActioned && (
            <div style={{
              marginBottom: 20, padding: '14px 20px', borderRadius: 10,
              background: proofToken.status === 'approved' ? 'rgba(34,192,122,0.08)' : 'rgba(245,158,11,0.08)',
              border: `1px solid ${proofToken.status === 'approved' ? 'rgba(34,192,122,0.3)' : 'rgba(245,158,11,0.3)'}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <CheckCircle2 size={18} style={{ color: proofToken.status === 'approved' ? '#22c07a' : '#f59e0b', flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: '#e8eaed' }}>
                {proofToken.status === 'approved'
                  ? 'You have already approved this design. Our team has been notified.'
                  : 'You have already requested a revision. Our team is working on updates.'}
              </div>
            </div>
          )}

          {/* Image viewer */}
          {proofFiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, background: '#13151c', borderRadius: 16, border: '1px solid #1a1d27' }}>
              <Palette size={48} style={{ margin: '0 auto 16px', color: '#5a6080' }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#9299b5' }}>Design In Progress</div>
              <div style={{ fontSize: 13, color: '#5a6080', marginTop: 8 }}>Your proof will appear here once uploaded by our team.</div>
            </div>
          ) : (
            <div style={{ background: '#13151c', borderRadius: 16, border: '1px solid #1a1d27', overflow: 'hidden', marginBottom: 20 }}>
              {/* File tabs */}
              {proofFiles.length > 1 && (
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1a1d27', overflowX: 'auto' }}>
                  {proofFiles.map((f, i) => (
                    <button key={f.id} onClick={() => { setFileIndex(i); resetView() }}
                      style={{
                        padding: '8px 16px', background: 'transparent', border: 'none',
                        borderBottom: i === fileIndex ? '2px solid #4f7fff' : '2px solid transparent',
                        color: i === fileIndex ? '#4f7fff' : '#9299b5',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                      }}>
                      {f.file_name || `File ${i + 1}`}
                      {f.version && <span style={{ marginLeft: 6, opacity: 0.6 }}>v{f.version}</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Image + zoom controls */}
              <div style={{ position: 'relative' }}>
                {/* Zoom toolbar */}
                <div style={{
                  position: 'absolute', top: 12, right: 12, zIndex: 10,
                  display: 'flex', gap: 4, background: 'rgba(13,15,20,0.85)', borderRadius: 8, padding: 4,
                }}>
                  <button onClick={() => setZoom(z => Math.min(z + 0.25, 4))}
                    style={{ padding: '6px 8px', background: 'transparent', border: 'none', color: '#9299b5', cursor: 'pointer', borderRadius: 4 }}>
                    <ZoomIn size={16} />
                  </button>
                  <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                    style={{ padding: '6px 8px', background: 'transparent', border: 'none', color: '#9299b5', cursor: 'pointer', borderRadius: 4 }}>
                    <ZoomOut size={16} />
                  </button>
                  <button onClick={resetView}
                    style={{ padding: '6px 8px', background: 'transparent', border: 'none', color: '#9299b5', cursor: 'pointer', borderRadius: 4 }}>
                    <RotateCcw size={16} />
                  </button>
                  {!alreadyActioned && (
                    <button onClick={() => { setAddingPin(a => !a); setPendingPin(null) }}
                      title="Click to add annotation pin"
                      style={{
                        padding: '6px 8px', background: addingPin ? '#4f7fff22' : 'transparent',
                        border: addingPin ? '1px solid #4f7fff' : 'none', borderRadius: 4,
                        color: addingPin ? '#4f7fff' : '#9299b5', cursor: 'pointer',
                      }}>
                      <MapPin size={16} />
                    </button>
                  )}
                </div>

                {/* Image area */}
                <div
                  style={{
                    overflow: 'hidden', height: 480,
                    cursor: addingPin ? 'crosshair' : isPanning ? 'grabbing' : 'grab',
                    userSelect: 'none', position: 'relative',
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onClick={handleImageClick}
                >
                  <div
                    ref={imgRef}
                    style={{
                      position: 'relative',
                      transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                      transformOrigin: 'center center',
                      transition: isPanning ? 'none' : 'transform 0.15s ease',
                      display: 'inline-block',
                      width: '100%',
                    }}
                  >
                    <img
                      src={currentFile?.file_url}
                      alt="Design proof"
                      draggable={false}
                      style={{ width: '100%', display: 'block' }}
                    />
                    {/* Annotation pins */}
                    {pins.filter(p => p.confirmed).map((p, i) => (
                      <div key={p.id}
                        style={{
                          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
                          transform: 'translate(-50%, -100%)',
                          zIndex: 20,
                        }}>
                        <div style={{
                          background: '#4f7fff', color: '#fff', borderRadius: '50%',
                          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 900, boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                          cursor: 'pointer',
                        }} title={p.comment}>
                          {i + 1}
                        </div>
                      </div>
                    ))}
                    {/* Pending pin */}
                    {pendingPin && (
                      <div style={{
                        position: 'absolute', left: `${pendingPin.x}%`, top: `${pendingPin.y}%`,
                        transform: 'translate(-50%, -100%)', zIndex: 30,
                      }}>
                        <div style={{
                          background: '#f59e0b', borderRadius: '50%',
                          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                        }}>
                          <MapPin size={14} color="#0d0f14" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pending pin input */}
                {pendingPin && (
                  <div style={{
                    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                    background: '#13151c', border: '1px solid #4f7fff', borderRadius: 10,
                    padding: '12px 16px', width: 320, zIndex: 40, boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#9299b5', marginBottom: 8 }}>Add annotation</div>
                    <input
                      autoFocus
                      value={pinComment}
                      onChange={e => setPinComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && confirmPin()}
                      placeholder="Describe the change needed..."
                      style={{
                        width: '100%', background: '#0d0f14', border: '1px solid #1a1d27',
                        borderRadius: 6, padding: '8px 10px', fontSize: 13, color: '#e8eaed', outline: 'none',
                        marginBottom: 8,
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={confirmPin}
                        style={{
                          flex: 1, padding: '8px', borderRadius: 6, background: '#4f7fff',
                          color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                        }}>
                        Add Pin
                      </button>
                      <button onClick={() => { setPendingPin(null); setPinComment('') }}
                        style={{
                          padding: '8px 12px', borderRadius: 6, background: '#1a1d27',
                          color: '#9299b5', border: 'none', cursor: 'pointer',
                        }}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Zoom label */}
              <div style={{ padding: '8px 16px', borderTop: '1px solid #1a1d27', fontSize: 11, color: '#5a6080', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{addingPin ? 'Click on the image to drop an annotation pin' : 'Drag to pan · scroll or use buttons to zoom'}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{Math.round(zoom * 100)}%</span>
              </div>
            </div>
          )}

          {/* Annotation list */}
          {pins.filter(p => p.confirmed).length > 0 && (
            <div style={{ background: '#13151c', borderRadius: 12, border: '1px solid #1a1d27', padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
                Annotation Pins
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pins.filter(p => p.confirmed).map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{
                      background: '#4f7fff', color: '#fff', borderRadius: '50%',
                      width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 900, flexShrink: 0, marginTop: 1,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, fontSize: 13, color: '#e8eaed', lineHeight: 1.5 }}>{p.comment}</div>
                    {!alreadyActioned && (
                      <button onClick={() => removePin(p.id)}
                        style={{ background: 'none', border: 'none', color: '#5a6080', cursor: 'pointer', padding: 2 }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action panel */}
          {!alreadyActioned && proofFiles.length > 0 && (
            <div style={{ background: '#13151c', borderRadius: 16, border: '1px solid #1a1d27', padding: '20px 24px' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#e8eaed', marginBottom: 16 }}>Your Response</div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9299b5', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                  Additional Notes (optional)
                </label>
                <textarea
                  value={revisionNote}
                  onChange={e => setRevisionNote(e.target.value)}
                  rows={3}
                  placeholder="Any overall comments about the design..."
                  style={{
                    width: '100%', background: '#0d0f14', border: '1px solid #1a1d27',
                    borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#e8eaed',
                    outline: 'none', resize: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleApprove}
                  disabled={saving}
                  style={{
                    flex: 1, padding: '14px 24px', borderRadius: 10, background: '#22c07a',
                    color: '#0d1a10', border: 'none', fontWeight: 900, fontSize: 15,
                    fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em',
                    cursor: saving ? 'wait' : 'pointer', textTransform: 'uppercase',
                  }}>
                  <CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, marginBottom: 2 }} />
                  {saving ? 'Saving...' : 'Approve Design'}
                </button>
                <button
                  onClick={handleRevision}
                  disabled={saving}
                  style={{
                    flex: 1, padding: '14px 24px', borderRadius: 10, background: 'rgba(245,158,11,0.1)',
                    color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontWeight: 800, fontSize: 15,
                    fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em',
                    cursor: saving ? 'wait' : 'pointer', textTransform: 'uppercase',
                  }}>
                  <Pencil size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, marginBottom: 2 }} />
                  {saving ? 'Saving...' : 'Request Revision'}
                </button>
              </div>

              {pins.filter(p => p.confirmed).length > 0 && (
                <div style={{ fontSize: 11, color: '#9299b5', marginTop: 10, textAlign: 'center' }}>
                  {pins.filter(p => p.confirmed).length} annotation pin{pins.filter(p => p.confirmed).length !== 1 ? 's' : ''} will be included with your revision request
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Render: LEGACY FLOW ──────────────────────────────────────────
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif' }}>USA WRAP CO</div>
        <div style={{ fontSize: 14, color: '#9299b5', marginTop: 4 }}>Design Proof Review</div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24,
        padding: '12px 20px', background: '#13151c', borderRadius: 10, border: '1px solid #1a1d27',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase' }}>Version</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#4f7fff', fontFamily: 'JetBrains Mono, monospace' }}>{latestProof?.version_number || 0}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase' }}>Revisions Used</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>{settings.revisions_used} / {settings.max_revisions}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase' }}>Remaining</div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: revisionsLeft > 0 ? '#22c07a' : '#f25a5a' }}>{revisionsLeft}</div>
        </div>
      </div>

      {proofs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#5a6080' }}>
          <Palette size={48} style={{ margin: '0 auto 16px', color: '#5a6080' }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: '#9299b5' }}>Design in Progress</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>Your proof will appear here once our team uploads it.</div>
        </div>
      ) : (
        <>
          <div style={{ background: '#13151c', border: '1px solid #1a1d27', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: 4, background: '#0d0f14' }}>
              <img src={latestProof.image_url} alt={`Proof v${latestProof.version_number}`} style={{ width: '100%', borderRadius: 12 }} />
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#e8eaed' }}>Proof Version {latestProof.version_number}</div>
                <StatusBadge status={latestProof.customer_status} />
              </div>
              {latestProof.designer_notes && (
                <div style={{ fontSize: 12, color: '#9299b5', padding: '8px 12px', background: '#0d0f14', borderRadius: 8, marginBottom: 12 }}>
                  <strong>Designer Notes:</strong> {latestProof.designer_notes}
                </div>
              )}
              {latestProof.customer_status === 'approved' && (
                <div style={{ padding: 16, background: 'rgba(34,192,122,0.05)', border: '1px solid rgba(34,192,122,0.2)', borderRadius: 10, textAlign: 'center' }}>
                  <CheckCircle2 size={32} style={{ margin: '0 auto 8px', color: '#22c07a' }} />
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#22c07a' }}>Design Approved</div>
                  <div style={{ fontSize: 12, color: '#9299b5', marginTop: 4 }}>
                    Approved by {latestProof.customer_name_confirm} on {new Date(latestProof.customer_approved_at).toLocaleDateString()}
                  </div>
                </div>
              )}
              {latestProof.customer_status === 'revision_requested' && (
                <div style={{ padding: 16, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>Revision Requested</div>
                  <div style={{ fontSize: 12, color: '#9299b5' }}>{latestProof.customer_feedback}</div>
                </div>
              )}
              {latestProof.customer_status === 'pending' && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#5a6080', textTransform: 'uppercase', marginBottom: 6 }}>
                      Your Feedback {revisionsLeft <= 0 ? '(no revisions remaining)' : ''}
                    </label>
                    <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3}
                      placeholder="Share your thoughts — what do you like? What needs to change?"
                      style={{ width: '100%', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#e8eaed', outline: 'none', resize: 'none' }} />
                  </div>
                  <div style={{ padding: 16, background: '#0d0f14', borderRadius: 10, marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#e8eaed', marginBottom: 12 }}>To approve this design:</div>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
                      <input type="checkbox" checked={responsibilityAccepted} onChange={e => setResponsibilityAccepted(e.target.checked)}
                        style={{ width: 18, height: 18, marginTop: 2, accentColor: '#22c07a' }} />
                      <span style={{ fontSize: 12, color: '#9299b5', lineHeight: 1.5 }}>
                        I have reviewed the design proof and <strong style={{ color: '#e8eaed' }}>accept full responsibility</strong> for the layout, spelling, grammar, color accuracy, and overall design. I understand that once approved, changes may incur additional fees.
                      </span>
                    </label>
                    <div style={{ marginBottom: 0 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#5a6080', textTransform: 'uppercase', marginBottom: 6 }}>Type your full name to approve</label>
                      <input value={confirmName} onChange={e => setConfirmName(e.target.value)} placeholder="John Smith"
                        style={{ width: '100%', background: '#13151c', border: '1px solid #1a1d27', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#e8eaed', outline: 'none' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={approveDesign} disabled={!confirmName || !responsibilityAccepted || legacySaving}
                      style={{ flex: 1, padding: '14px 24px', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer', border: 'none', background: confirmName && responsibilityAccepted ? '#22c07a' : '#1a2540', color: confirmName && responsibilityAccepted ? '#0d1a10' : '#5a6080' }}>
                      Approve Design
                    </button>
                    <button onClick={requestRevision} disabled={!feedback.trim() || revisionsLeft <= 0 || legacySaving}
                      style={{ flex: 1, padding: '14px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: revisionsLeft > 0 && feedback.trim() ? 'pointer' : 'not-allowed', background: '#f59e0b15', color: revisionsLeft > 0 ? '#f59e0b' : '#5a6080', border: '1px solid #f59e0b30' }}>
                      <Pencil size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} /> Request Revision ({revisionsLeft} left)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          {proofs.length > 1 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Previous Versions</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {proofs.slice(1).map(p => (
                  <div key={p.id} style={{ width: 120, background: '#13151c', borderRadius: 8, overflow: 'hidden', border: '1px solid #1a1d27' }}>
                    <img src={p.image_url} alt={`v${p.version_number}`} style={{ width: '100%' }} />
                    <div style={{ padding: '4px 8px', fontSize: 10, color: '#5a6080' }}>v{p.version_number} · <StatusBadge status={p.customer_status} small /></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatusBadge({ status, small }: { status: string; small?: boolean }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: '#f59e0b15', color: '#f59e0b', label: 'Awaiting Review' },
    approved: { bg: '#22c07a15', color: '#22c07a', label: 'Approved' },
    revision_requested: { bg: '#f25a5a15', color: '#f25a5a', label: 'Revision Requested' },
  }
  const c = config[status] || config.pending
  return (
    <span style={{ padding: small ? '1px 6px' : '3px 10px', borderRadius: 6, fontSize: small ? 8 : 10, fontWeight: 800, background: c.bg, color: c.color }}>
      {c.label}
    </span>
  )
}
