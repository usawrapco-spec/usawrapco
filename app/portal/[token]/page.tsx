'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, MessageSquare, RotateCcw, Send, Download, ExternalLink, AlertTriangle, X } from 'lucide-react'

export default function CustomerDesignPortal({ params }: { params: { token: string } }) {
  const supabase = createClient()
  const [design, setDesign] = useState<any>(null)
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Customer input state
  const [customerName, setCustomerName] = useState('')
  const [comment, setComment] = useState('')
  const [revisionNote, setRevisionNote] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [approved, setApproved] = useState(false)
  const [approving, setApproving] = useState(false)
  const [showRevision, setShowRevision] = useState(false)
  const [submittingRevision, setSubmittingRevision] = useState(false)
  const [revisionSent, setRevisionSent] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState(false)

  // Signature canvas
  const sigCanvasRef = useRef<HTMLCanvasElement>(null)
  const [signing, setSigning] = useState(false)
  const [sigData, setSigData] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    loadPortal()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadPortal() {
    setLoading(true)
    const { data: dp, error } = await supabase
      .from('design_projects')
      .select('*')
      .eq('portal_token', params.token)
      .single()

    if (error || !dp) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setDesign(dp)

    // Load files
    const { data: f } = await supabase
      .from('design_project_files')
      .select('*')
      .eq('design_project_id', dp.id)
      .order('version', { ascending: false })

    setFiles(f || [])

    // Load customer comments
    const { data: c } = await supabase
      .from('design_project_comments')
      .select('*')
      .eq('design_project_id', dp.id)
      .order('created_at', { ascending: true })

    setComments(c || [])

    // Check if already approved
    const { data: approvalsData } = await supabase
      .from('design_approvals')
      .select('id')
      .eq('design_project_id', dp.id)
      .limit(1)

    if (approvalsData && approvalsData.length > 0) {
      setApproved(true)
    }

    setLoading(false)
  }

  // Signature drawing
  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const canvas = sigCanvasRef.current
    if (!canvas) return
    setIsDrawing(true)
    lastPos.current = getPos(e, canvas)
    setSigning(true)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!isDrawing) return
    const canvas = sigCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx || !lastPos.current) return
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#4f7fff'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  function endDraw() {
    setIsDrawing(false)
    lastPos.current = null
    const canvas = sigCanvasRef.current
    if (canvas) setSigData(canvas.toDataURL())
  }

  function clearSig() {
    const canvas = sigCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSigData(null)
    setSigning(false)
  }

  async function handleApprove() {
    if (!customerName.trim()) { setNameError(true); return }
    if (!sigData || !signing) { alert('Please sign your name in the signature box'); return }
    setApproving(true)
    try {
      await supabase.from('design_approvals').insert({
        design_project_id: design.id,
        approved_by_name: customerName.trim(),
        signature_data: sigData,
        ip_address: null,
      })
      await supabase.from('design_projects').update({
        status: 'approved',
        updated_at: new Date().toISOString(),
      }).eq('id', design.id)
      // Add approval comment
      await supabase.from('design_project_comments').insert({
        design_project_id: design.id,
        author_name: customerName.trim(),
        author_type: 'customer',
        content: `Design approved by ${customerName.trim()}.`,
      })
      setApproved(true)
    } catch (err) {
      console.error('Approve error:', err)
    }
    setApproving(false)
  }

  async function handleSendComment() {
    if (!comment.trim()) return
    if (!customerName.trim()) { setNameError(true); return }
    setSendingComment(true)
    const { data } = await supabase.from('design_project_comments').insert({
      design_project_id: design.id,
      author_name: customerName.trim(),
      author_type: 'customer',
      content: comment.trim(),
    }).select().single()
    if (data) setComments(prev => [...prev, data])
    setComment('')
    setSendingComment(false)
  }

  async function handleRevision() {
    if (!revisionNote.trim()) return
    if (!customerName.trim()) { setNameError(true); return }
    setSubmittingRevision(true)
    await supabase.from('design_project_comments').insert({
      design_project_id: design.id,
      author_name: customerName.trim(),
      author_type: 'customer',
      content: `REVISION REQUEST: ${revisionNote.trim()}`,
    })
    await supabase.from('design_projects').update({
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    }).eq('id', design.id)
    setRevisionSent(true)
    setSubmittingRevision(false)
    setShowRevision(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0f14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#5a6080' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #4f7fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14 }}>Loading your design...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0f14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <AlertTriangle size={40} style={{ color: '#f59e0b', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 20, fontWeight: 800, color: '#e8eaed', marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>Link Not Found</div>
          <div style={{ fontSize: 14, color: '#5a6080' }}>This design review link may have expired or been removed. Please contact your wrap specialist.</div>
        </div>
      </div>
    )
  }

  const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.file_name || ''))
  const otherFiles = files.filter(f => !/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.file_name || ''))

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#13151c', borderBottom: '1px solid #1a1d27', padding: '16px 20px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4f7fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              USA WRAP CO
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif', marginTop: 2 }}>
              Review Your Design
            </div>
          </div>
          {approved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.3)', borderRadius: 20 }}>
              <CheckCircle size={14} style={{ color: '#22c07a' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#22c07a' }}>Approved</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px' }}>

        {/* Design info card */}
        <div style={{ background: '#13151c', border: '1px solid #1a1d27', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif' }}>
            {design.client_name}
          </div>
          <div style={{ fontSize: 13, color: '#9299b5', marginTop: 4 }}>
            {design.design_type} · {design.vehicle_type || 'Vehicle wrap'}
          </div>
          {design.description && (
            <div style={{ fontSize: 12, color: '#5a6080', marginTop: 8, lineHeight: 1.5 }}>{design.description}</div>
          )}
        </div>

        {/* Approved banner */}
        {approved && (
          <div style={{
            background: 'rgba(34,192,122,0.06)', border: '1px solid rgba(34,192,122,0.25)', borderRadius: 12,
            padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center',
          }}>
            <CheckCircle size={24} style={{ color: '#22c07a', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#22c07a', fontFamily: 'Barlow Condensed, sans-serif' }}>Design Approved!</div>
              <div style={{ fontSize: 13, color: '#9299b5', marginTop: 2 }}>Your approval has been recorded. Our team will begin production soon.</div>
            </div>
          </div>
        )}

        {/* Revision sent banner */}
        {revisionSent && (
          <div style={{
            background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12,
            padding: '16px 20px', marginBottom: 24,
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b' }}>Revision Request Sent</div>
            <div style={{ fontSize: 13, color: '#9299b5', marginTop: 4 }}>Our designer will review your feedback and send an updated version.</div>
          </div>
        )}

        {/* Design previews */}
        {imageFiles.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Design Files
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {imageFiles.map(f => (
                <div key={f.id} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #1a1d27', background: '#13151c', cursor: 'pointer' }}
                  onClick={() => setLightbox(f.file_url)}>
                  <img src={f.file_url} alt={f.file_name} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#9299b5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>v{f.version} · {f.file_name}</span>
                    <a href={f.file_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      style={{ color: '#4f7fff', display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: 8 }}>
                      <Download size={13} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other files */}
        {otherFiles.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Documents</div>
            {otherFiles.map(f => (
              <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#13151c', border: '1px solid #1a1d27', borderRadius: 8, marginBottom: 8, textDecoration: 'none', color: '#e8eaed', fontSize: 13 }}>
                <ExternalLink size={14} style={{ color: '#4f7fff' }} />
                {f.file_name}
              </a>
            ))}
          </div>
        )}

        {files.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#5a6080', fontSize: 13 }}>
            Design files are being prepared. Check back soon.
          </div>
        )}

        {/* Customer name */}
        {!approved && (
          <div style={{ background: '#13151c', border: '1px solid #1a1d27', borderRadius: 12, padding: '20px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#9299b5', marginBottom: 10 }}>Your Name</div>
            <input
              type="text"
              value={customerName}
              onChange={e => { setCustomerName(e.target.value); setNameError(false) }}
              placeholder="Enter your full name"
              style={{
                width: '100%', padding: '10px 12px', background: '#0d0f14',
                border: `1px solid ${nameError ? '#f25a5a' : '#1a1d27'}`, borderRadius: 8,
                color: '#e8eaed', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
            />
            {nameError && <div style={{ fontSize: 11, color: '#f25a5a', marginTop: 4 }}>Please enter your name before taking action</div>}
          </div>
        )}

        {/* Action buttons */}
        {!approved && !revisionSent && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowRevision(!showRevision)}
              style={{
                flex: 1, minWidth: 140, padding: '12px 20px', borderRadius: 10, border: '1px solid rgba(245,158,11,0.3)',
                background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <RotateCcw size={15} />
              Request Changes
            </button>
          </div>
        )}

        {/* Revision form */}
        {showRevision && !revisionSent && (
          <div style={{ background: '#13151c', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#f59e0b', marginBottom: 12, fontFamily: 'Barlow Condensed, sans-serif' }}>Request Revisions</div>
            <textarea
              value={revisionNote}
              onChange={e => setRevisionNote(e.target.value)}
              rows={4}
              placeholder="Describe what you'd like changed... Be as specific as possible."
              style={{ width: '100%', padding: '10px 12px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button onClick={() => setShowRevision(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #1a1d27', borderRadius: 8, color: '#9299b5', cursor: 'pointer', fontSize: 12 }}>
                Cancel
              </button>
              <button
                onClick={handleRevision}
                disabled={!revisionNote.trim() || submittingRevision}
                style={{ flex: 1, padding: '8px 16px', background: '#f59e0b', border: 'none', borderRadius: 8, color: '#0d0f14', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: (!revisionNote.trim() || submittingRevision) ? 0.6 : 1 }}
              >
                {submittingRevision ? 'Sending...' : 'Send Revision Request'}
              </button>
            </div>
          </div>
        )}

        {/* Approve section */}
        {!approved && !revisionSent && (
          <div style={{ background: '#13151c', border: '1px solid rgba(34,192,122,0.2)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#22c07a', marginBottom: 4, fontFamily: 'Barlow Condensed, sans-serif' }}>Approve This Design</div>
            <div style={{ fontSize: 12, color: '#5a6080', marginBottom: 16, lineHeight: 1.5 }}>
              By signing below and clicking Approve, you confirm that you've reviewed this design and authorize USA Wrap Co to proceed with production.
            </div>

            {/* Signature pad */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9299b5', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Your Signature
              </div>
              <div style={{ position: 'relative', border: '2px solid #1a1d27', borderRadius: 8, overflow: 'hidden', background: '#0d0f14', touchAction: 'none' }}>
                <canvas
                  ref={sigCanvasRef}
                  width={600}
                  height={140}
                  style={{ display: 'block', width: '100%', cursor: 'crosshair', touchAction: 'none' }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
                {!signing && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: 13, color: '#3a3f55', fontStyle: 'italic' }}>Draw your signature here</span>
                  </div>
                )}
              </div>
              <button onClick={clearSig} style={{ marginTop: 6, fontSize: 11, color: '#5a6080', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Clear signature
              </button>
            </div>

            <button
              onClick={handleApprove}
              disabled={approving}
              style={{
                width: '100%', padding: '14px', background: '#22c07a', border: 'none', borderRadius: 10,
                color: '#0d1a10', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: approving ? 0.6 : 1, fontFamily: 'Barlow Condensed, sans-serif',
              }}
            >
              <CheckCircle size={18} />
              {approving ? 'Recording Approval...' : 'I Approve This Design — Proceed to Production'}
            </button>
          </div>
        )}

        {/* Comments */}
        <div style={{ background: '#13151c', border: '1px solid #1a1d27', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e8eaed', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={16} style={{ color: '#4f7fff' }} />
            Comments
          </div>

          {/* Comment list */}
          {comments.length > 0 && (
            <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {comments.map(c => (
                <div key={c.id} style={{
                  padding: '10px 12px', borderRadius: 8,
                  background: c.author_type === 'customer' ? 'rgba(34,192,122,0.06)' : '#0d0f14',
                  border: `1px solid ${c.author_type === 'customer' ? 'rgba(34,192,122,0.15)' : '#1a1d27'}`,
                  borderLeft: `3px solid ${c.author_type === 'customer' ? '#22c07a' : '#4f7fff'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c.author_type === 'customer' ? '#22c07a' : '#4f7fff' }}>
                      {c.author_name || 'Team'}
                    </span>
                    <span style={{ fontSize: 10, color: '#5a6080' }}>
                      {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#9299b5', lineHeight: 1.4 }}>{c.content}</div>
                </div>
              ))}
            </div>
          )}

          {/* Add comment */}
          {!approved && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                placeholder="Add a comment or question..."
                style={{ flex: 1, padding: '10px 12px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none' }}
              />
              <button
                onClick={handleSendComment}
                disabled={sendingComment || !comment.trim()}
                style={{ padding: '10px 14px', background: '#4f7fff', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', opacity: (sendingComment || !comment.trim()) ? 0.4 : 1 }}
              >
                <Send size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', color: '#3a3f55', fontSize: 11, paddingBottom: 40 }}>
          Powered by USA Wrap Co · Questions? Contact your wrap specialist.
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setLightbox(null)}
        >
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff' }}>
            <X size={22} />
          </button>
          <img src={lightbox} alt="Preview" style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} onClick={e => e.stopPropagation()} />
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #3a3f55; }
        textarea::placeholder { color: #3a3f55; }
      `}</style>
    </div>
  )
}
