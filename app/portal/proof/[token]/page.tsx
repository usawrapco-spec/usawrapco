'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Check, X, MessageCircle, ChevronLeft, ChevronRight, ZoomIn,
  ZoomOut, Send, AlertCircle, CheckCircle2, Clock, Loader2,
  MapPin, Plus
} from 'lucide-react'

interface Annotation {
  id: string
  x: number
  y: number
  text: string
  number: number
}

interface Comment {
  id: string
  role: string
  text: string
  created_at: string
}

export default function ProofingPortal() {
  const params = useParams()
  const token = params?.token as string
  const [design, setDesign] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentAngle, setCurrentAngle] = useState(0)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [newAnnotationText, setNewAnnotationText] = useState('')
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null)
  const [isAnnotating, setIsAnnotating] = useState(false)
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [zoom, setZoom] = useState(100)
  const [approved, setApproved] = useState(false)
  const [confirmCheck, setConfirmCheck] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [changesSent, setChangesSent] = useState(false)
  const imageRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const angles = ['Front 3/4', 'Driver Side', 'Rear 3/4', 'Passenger Side']

  useEffect(() => {
    loadDesign()
  }, [token])

  const loadDesign = async () => {
    try {
      const { data } = await supabase
        .from('design_files')
        .select('*, projects(title, vehicle_desc, customer_id)')
        .eq('proof_token', token)
        .single()

      if (data) {
        setDesign(data)
        if (data.status === 'approved') setApproved(true)
      }

      // Load existing reviews/comments
      if (data?.id) {
        const { data: reviews } = await supabase
          .from('proof_reviews')
          .select('*')
          .eq('design_file_id', data.id)
          .order('created_at', { ascending: true })

        if (reviews) {
          const cmts = reviews
            .filter((r: any) => r.comment)
            .map((r: any) => ({
              id: r.id,
              role: r.reviewer_type || 'customer',
              text: r.comment,
              created_at: r.created_at,
            }))
          setComments(cmts)
        }
      }
    } catch {}
    setLoading(false)
  }

  const handleImageClick = (e: React.MouseEvent) => {
    if (!isAnnotating) return
    const rect = imageRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPendingPin({ x, y })
  }

  const addAnnotation = () => {
    if (!pendingPin || !newAnnotationText.trim()) return
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      x: pendingPin.x,
      y: pendingPin.y,
      text: newAnnotationText.trim(),
      number: annotations.length + 1,
    }
    setAnnotations(prev => [...prev, annotation])
    setNewAnnotationText('')
    setPendingPin(null)
  }

  const submitChanges = async () => {
    setSubmitting(true)
    try {
      await supabase.from('proof_reviews').insert({
        design_file_id: design?.id,
        reviewer_type: 'customer',
        action: 'changes_requested',
        annotations: annotations,
        comment: `Changes requested: ${annotations.map(a => `#${a.number}: ${a.text}`).join('; ')}`,
      })

      await supabase
        .from('design_files')
        .update({
          status: 'changes_requested',
          revision_count: (design?.revision_count || 0) + 1,
        })
        .eq('id', design?.id)

      setChangesSent(true)
      setIsAnnotating(false)
    } catch {}
    setSubmitting(false)
  }

  const approveDesign = async () => {
    if (!confirmCheck) return
    setSubmitting(true)
    try {
      await supabase.from('proof_reviews').insert({
        design_file_id: design?.id,
        reviewer_type: 'customer',
        action: 'approved',
        comment: 'Design approved by customer',
      })

      await supabase
        .from('design_files')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', design?.id)

      setApproved(true)
    } catch {}
    setSubmitting(false)
  }

  const addComment = async () => {
    if (!newComment.trim()) return
    const comment = {
      id: crypto.randomUUID(),
      role: 'customer',
      text: newComment.trim(),
      created_at: new Date().toISOString(),
    }
    setComments(prev => [...prev, comment])

    await supabase.from('proof_reviews').insert({
      design_file_id: design?.id,
      reviewer_type: 'customer',
      action: 'comment',
      comment: newComment.trim(),
    })

    setNewComment('')
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0d0f14',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Loader2 size={32} color="#4f7fff" className="animate-spin" />
      </div>
    )
  }

  if (!design) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0d0f14',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
        color: '#9299b5',
      }}>
        <AlertCircle size={48} style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Proof Not Found</h2>
        <p style={{ fontSize: 14 }}>This proof link may have expired or is invalid.</p>
      </div>
    )
  }

  const revisionExceeded = (design.revision_count || 0) >= (design.included_revisions || 2)

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14' }}>
      {/* Header */}
      <div style={{
        background: '#13151c', borderBottom: '1px solid #2a2f3d',
        padding: '16px 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{
              fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 22,
              color: '#e8eaed', margin: 0,
            }}>
              Design Proof
            </h1>
            <div style={{ fontSize: 13, color: '#9299b5', marginTop: 4 }}>
              {design.name || 'Vehicle Wrap Design'} &middot; Revision {(design.revision_count || 0) + 1} of {design.included_revisions || 2} included
            </div>
          </div>
          <div style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: approved ? 'rgba(34,192,122,0.15)' : changesSent ? 'rgba(245,158,11,0.15)' : 'rgba(79,127,255,0.15)',
            color: approved ? '#22c07a' : changesSent ? '#f59e0b' : '#4f7fff',
          }}>
            {approved ? 'Approved' : changesSent ? 'Changes Requested' : 'Awaiting Review'}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24, display: 'flex', gap: 24 }}>
        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {/* Design Image */}
          <div
            ref={imageRef}
            onClick={handleImageClick}
            style={{
              position: 'relative',
              width: '100%',
              height: 500,
              background: '#1a1d27',
              borderRadius: 12,
              border: '1px solid #2a2f3d',
              overflow: 'hidden',
              cursor: isAnnotating ? 'crosshair' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ color: '#5a6080', textAlign: 'center' }}>
              <ZoomIn size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div style={{ fontSize: 14 }}>{angles[currentAngle]} View</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Design proof image</div>
            </div>

            {/* Annotation Pins */}
            {annotations.map(ann => (
              <div
                key={ann.id}
                onClick={e => { e.stopPropagation(); setActiveAnnotation(ann.id) }}
                style={{
                  position: 'absolute',
                  left: `${ann.x}%`,
                  top: `${ann.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: activeAnnotation === ann.id ? '#f25a5a' : '#4f7fff',
                  border: '2px solid #fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#fff',
                  cursor: 'pointer',
                  zIndex: 10,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}
              >
                {ann.number}
              </div>
            ))}

            {/* Pending Pin */}
            {pendingPin && (
              <div style={{
                position: 'absolute',
                left: `${pendingPin.x}%`,
                top: `${pendingPin.y}%`,
                transform: 'translate(-50%, -50%)',
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#f59e0b',
                border: '2px solid #fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
                color: '#fff',
                animation: 'pulse 1s infinite',
                zIndex: 10,
              }}>
                <Plus size={14} />
              </div>
            )}
          </div>

          {/* Angle Navigation */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button
              onClick={() => setCurrentAngle(i => (i - 1 + angles.length) % angles.length)}
              className="btn-ghost btn-sm"
            >
              <ChevronLeft size={16} />
            </button>
            {angles.map((angle, i) => (
              <button
                key={angle}
                onClick={() => setCurrentAngle(i)}
                style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${currentAngle === i ? '#4f7fff' : '#2a2f3d'}`,
                  background: currentAngle === i ? 'rgba(79,127,255,0.15)' : '#1a1d27',
                  color: currentAngle === i ? '#4f7fff' : '#9299b5',
                  cursor: 'pointer',
                }}
              >
                {angle}
              </button>
            ))}
            <button
              onClick={() => setCurrentAngle(i => (i + 1) % angles.length)}
              className="btn-ghost btn-sm"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Zoom Controls */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
            <button className="btn-ghost btn-xs" onClick={() => setZoom(z => Math.max(50, z - 25))}><ZoomOut size={14} /></button>
            <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#9299b5' }}>{zoom}%</span>
            <button className="btn-ghost btn-xs" onClick={() => setZoom(z => Math.min(200, z + 25))}><ZoomIn size={14} /></button>
          </div>

          {/* Comment Thread */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e8eaed', marginBottom: 12 }}>Comments</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {comments.map(comment => (
                <div key={comment.id} style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: comment.role === 'customer' ? 'rgba(79,127,255,0.1)' : '#1a1d27',
                  border: '1px solid #2a2f3d',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: comment.role === 'customer' ? '#4f7fff' : '#22d3ee' }}>
                      {comment.role === 'customer' ? 'You' : 'Designer'}
                    </span>
                    <span style={{ fontSize: 10, color: '#5a6080' }}>
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#e8eaed' }}>{comment.text}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addComment() }}
                placeholder="Add a comment..."
                style={{
                  flex: 1, background: '#1a1d27', border: '1px solid #2a2f3d',
                  borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#e8eaed',
                  outline: 'none',
                }}
              />
              <button onClick={addComment} className="btn-primary btn-sm"><Send size={14} /></button>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ width: 300 }}>
          {/* Status */}
          <div style={{
            background: '#13151c', border: '1px solid #2a2f3d', borderRadius: 12,
            padding: 20, marginBottom: 16,
          }}>
            <div style={{
              padding: '8px 16px', borderRadius: 8, textAlign: 'center',
              fontSize: 14, fontWeight: 700, marginBottom: 16,
              background: approved ? 'rgba(34,192,122,0.15)' : 'rgba(79,127,255,0.15)',
              color: approved ? '#22c07a' : '#4f7fff',
            }}>
              {approved ? (
                <><CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Design Approved</>
              ) : (
                <><Clock size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Awaiting Your Review</>
              )}
            </div>

            {!approved && (
              <>
                {/* Approve Button */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    fontSize: 12, color: '#9299b5', cursor: 'pointer', marginBottom: 12,
                  }}>
                    <input
                      type="checkbox"
                      checked={confirmCheck}
                      onChange={e => setConfirmCheck(e.target.checked)}
                      style={{ marginTop: 2, accentColor: '#4f7fff' }}
                    />
                    I have reviewed this design and authorize production
                  </label>
                  <button
                    onClick={approveDesign}
                    disabled={!confirmCheck || submitting}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10,
                      background: confirmCheck ? '#22c07a' : '#1a1d27',
                      border: 'none', cursor: confirmCheck ? 'pointer' : 'not-allowed',
                      color: '#fff', fontSize: 14, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      opacity: confirmCheck ? 1 : 0.5,
                    }}
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Approve This Design
                  </button>
                </div>

                {/* Request Changes */}
                <div style={{ borderTop: '1px solid #2a2f3d', paddingTop: 16 }}>
                  <button
                    onClick={() => setIsAnnotating(!isAnnotating)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      background: isAnnotating ? 'rgba(245,158,11,0.15)' : '#1a1d27',
                      border: `1px solid ${isAnnotating ? '#f59e0b' : '#2a2f3d'}`,
                      color: isAnnotating ? '#f59e0b' : '#9299b5',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    <MapPin size={14} />
                    {isAnnotating ? 'Cancel Annotation Mode' : 'Request Changes'}
                  </button>

                  {isAnnotating && (
                    <div style={{ marginTop: 12, fontSize: 11, color: '#9299b5' }}>
                      Click anywhere on the design to add annotation pins. Add your notes below.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Annotation List */}
          {annotations.length > 0 && (
            <div style={{
              background: '#13151c', border: '1px solid #2a2f3d', borderRadius: 12,
              padding: 16, marginBottom: 16,
            }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed', marginBottom: 12 }}>
                Annotations ({annotations.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {annotations.map(ann => (
                  <div
                    key={ann.id}
                    onClick={() => setActiveAnnotation(ann.id)}
                    style={{
                      padding: '8px 12px', borderRadius: 8,
                      background: activeAnnotation === ann.id ? 'rgba(79,127,255,0.1)' : '#1a1d27',
                      border: `1px solid ${activeAnnotation === ann.id ? '#4f7fff' : '#2a2f3d'}`,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: '#4f7fff', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 800, flexShrink: 0,
                      }}>{ann.number}</span>
                      <span style={{ fontSize: 12, color: '#e8eaed' }}>{ann.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={submitChanges}
                disabled={submitting}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8, marginTop: 12,
                  background: '#f59e0b', border: 'none', color: '#000',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Submit Changes Request
              </button>
            </div>
          )}

          {/* Pending Pin Input */}
          {pendingPin && (
            <div style={{
              background: '#13151c', border: '1px solid #f59e0b', borderRadius: 12,
              padding: 16, marginBottom: 16,
            }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>
                Add Note for Pin #{annotations.length + 1}
              </h4>
              <textarea
                value={newAnnotationText}
                onChange={e => setNewAnnotationText(e.target.value)}
                placeholder="Describe the change needed..."
                style={{
                  width: '100%', background: '#1a1d27', border: '1px solid #2a2f3d',
                  borderRadius: 8, padding: 10, fontSize: 13, color: '#e8eaed',
                  outline: 'none', resize: 'vertical', minHeight: 60,
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => setPendingPin(null)} className="btn-ghost btn-sm" style={{ flex: 1 }}>Cancel</button>
                <button onClick={addAnnotation} className="btn-primary btn-sm" style={{ flex: 1 }}>Add</button>
              </div>
            </div>
          )}

          {/* Revision Counter */}
          <div style={{
            background: '#13151c', border: '1px solid #2a2f3d', borderRadius: 12,
            padding: 16,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9299b5', marginBottom: 8 }}>Revisions</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'JetBrains Mono', color: '#e8eaed' }}>
              {design.revision_count || 0} <span style={{ fontSize: 14, color: '#5a6080' }}>/ {design.included_revisions || 2}</span>
            </div>
            <div style={{ fontSize: 11, color: '#5a6080', marginTop: 4 }}>included revisions</div>
            {revisionExceeded && (
              <div style={{
                marginTop: 12, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                fontSize: 12, color: '#f59e0b',
              }}>
                <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Additional revisions may incur extra charges
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
