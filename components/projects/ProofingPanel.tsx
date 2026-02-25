'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, Send, Eye, Clock, CheckCircle, RefreshCw, Image, X, Copy, ExternalLink, Loader2 } from 'lucide-react'
import type { Profile, Project } from '@/types'
import type { DesignProof } from '@/lib/proof-types'

interface Props {
  project: Project
  profile: Profile
}

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#f59e0b' },
  sent: { label: 'Sent', color: '#4f7fff' },
  approved: { label: 'Approved', color: '#22c07a' },
  changes_requested: { label: 'Changes Requested', color: '#f59e0b' },
}

export default function ProofingPanel({ project, profile }: Props) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [proofs, setProofs] = useState<DesignProof[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [title, setTitle] = useState('Your Design Proof')
  const [noteToCustomer, setNoteToCustomer] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [copyMsg, setCopyMsg] = useState('')
  const [viewAnnotationsId, setViewAnnotationsId] = useState<string | null>(null)
  const [viewAnnotations, setViewAnnotations] = useState<any[]>([])
  const [loadingAnnotations, setLoadingAnnotations] = useState(false)

  // Load existing proofs
  useEffect(() => {
    supabase
      .from('design_proofs')
      .select('*')
      .eq('project_id', project.id)
      .order('version_number', { ascending: false })
      .then(({ data }) => {
        if (data) setProofs(data as unknown as DesignProof[])
        setLoading(false)
      })
  }, [project.id])

  // Try to get customer email
  useEffect(() => {
    if (project.customer_id) {
      supabase
        .from('profiles')
        .select('email')
        .eq('id', project.customer_id)
        .single()
        .then(({ data }) => {
          if (data?.email) setCustomerEmail(data.email)
        })
    }
  }, [project.customer_id])

  const nextVersion = proofs.length > 0 ? proofs[0].version_number + 1 : 1

  // Upload handler
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    setPreviewUrl(URL.createObjectURL(file))

    const ext = file.name.split('.').pop() || 'png'
    const path = `proofs/${project.id}/v${nextVersion}_${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('project-files')
      .upload(path, file, { upsert: true })

    if (error) {
      console.error('Upload error:', error)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path)
    setUploadedImageUrl(urlData.publicUrl)
    setUploading(false)
  }, [project.id, nextVersion, supabase])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  // Send proof
  const handleSendProof = async () => {
    if (!uploadedImageUrl) return
    setSending(true)

    try {
      // Create proof record
      const createRes = await fetch('/api/proof/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          image_url: uploadedImageUrl,
          title,
          note_to_customer: noteToCustomer || null,
        }),
      })

      if (!createRes.ok) {
        throw new Error('Failed to create proof')
      }

      const { proof } = await createRes.json()

      // Send email if we have customer email
      if (customerEmail) {
        await fetch(`/api/proof/${proof.id}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_email: customerEmail }),
        })
      }

      // Update local state
      setProofs(prev => [proof, ...prev])
      setUploadedImageUrl(null)
      setPreviewUrl(null)
      setTitle('Your Design Proof')
      setNoteToCustomer('')
    } catch (err) {
      console.error('Send error:', err)
    }
    setSending(false)
  }

  const copyProofLink = (publicToken: string) => {
    const url = `${window.location.origin}/proof/${publicToken}`
    navigator.clipboard.writeText(url)
    setCopyMsg(publicToken)
    setTimeout(() => setCopyMsg(''), 2000)
  }

  // View annotations for a proof
  const handleViewAnnotations = async (proofId: string) => {
    if (viewAnnotationsId === proofId) {
      setViewAnnotationsId(null)
      return
    }
    setViewAnnotationsId(proofId)
    setLoadingAnnotations(true)
    try {
      const res = await fetch(`/api/proof/${proofId}/annotations`)
      if (res.ok) {
        const { annotations } = await res.json()
        setViewAnnotations(annotations || [])
      }
    } catch { /* ignore */ }
    setLoadingAnnotations(false)
  }

  const sectionStyle: React.CSSProperties = {
    padding: 16,
    background: 'var(--surface2)',
    borderRadius: 10,
    border: '1px solid var(--border)',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.06)',
    background: '#13151c',
    color: '#e8eaed',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      padding: 16,
      background: 'var(--surface)',
      borderRadius: 12,
      border: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Image size={16} color="#8b5cf6" />
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)', fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>
          Customer Proof
        </span>
      </div>

      {/* Upload section */}
      <div style={sectionStyle}>
        {previewUrl ? (
          <div style={{ position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Proof preview"
              style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8, background: '#0a0c12' }}
            />
            <button
              onClick={() => { setPreviewUrl(null); setUploadedImageUrl(null) }}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.7)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={14} />
            </button>
            {uploading && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
              }}>
                <Loader2 size={24} color="#4f7fff" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            )}
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: 24,
              borderRadius: 10,
              border: '2px dashed rgba(139,92,246,0.3)',
              background: 'rgba(139,92,246,0.03)',
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            <Upload size={24} color="#8b5cf6" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6' }}>
              Drop design file or click to upload
            </div>
            <div style={{ fontSize: 11, color: '#5a6080', marginTop: 4 }}>
              PNG, JPG, PDF — proof will be sent as Version {nextVersion}
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFileSelect(file)
          }}
        />

        {/* Title & Note */}
        {uploadedImageUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#9299b5', marginBottom: 4, display: 'block' }}>Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={inputStyle}
                placeholder="Your Design Proof"
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#9299b5', marginBottom: 4, display: 'block' }}>Note to Customer</label>
              <textarea
                value={noteToCustomer}
                onChange={e => setNoteToCustomer(e.target.value)}
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                placeholder="Optional message to the customer..."
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#9299b5', marginBottom: 4, display: 'block' }}>Customer Email</label>
              <input
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                style={inputStyle}
                placeholder="customer@email.com"
              />
            </div>
            <button
              onClick={handleSendProof}
              disabled={sending || !uploadedImageUrl}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#8b5cf6',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              {sending ? 'Sending...' : customerEmail ? 'Send Proof Link' : 'Create Proof (no email)'}
            </button>
          </div>
        )}
      </div>

      {/* Proof History */}
      {!loading && proofs.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9299b5', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Proof History
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {proofs.map(p => {
              const badge = STATUS_BADGES[p.status] || STATUS_BADGES.pending
              const isExpanded = viewAnnotationsId === p.id
              return (
                <div key={p.id}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--surface2)',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>
                        v{p.version_number}
                      </span>
                      {p.sent_at && (
                        <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} /> {new Date(p.sent_at).toLocaleDateString()}
                        </span>
                      )}
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 10,
                        fontWeight: 700,
                        background: `${badge.color}18`,
                        color: badge.color,
                      }}>
                        {badge.label}
                      </span>
                      {p.viewed_at && (
                        <span title={`Viewed ${new Date(p.viewed_at).toLocaleString()}`}>
                          <Eye size={12} color="#22d3ee" />
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => handleViewAnnotations(p.id)}
                        title="View annotations"
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          background: isExpanded ? 'rgba(79,127,255,0.15)' : 'transparent',
                          border: '1px solid var(--border)',
                          color: isExpanded ? '#4f7fff' : '#9299b5',
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Annotations
                      </button>
                      <button
                        onClick={() => copyProofLink(p.public_token)}
                        title="Copy proof link"
                        style={{
                          padding: '4px 6px',
                          borderRadius: 6,
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          color: copyMsg === p.public_token ? '#22c07a' : '#9299b5',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {copyMsg === p.public_token ? <CheckCircle size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded annotation view */}
                  {isExpanded && (
                    <div style={{
                      padding: 12,
                      background: 'rgba(79,127,255,0.04)',
                      borderRadius: '0 0 8px 8px',
                      border: '1px solid var(--border)',
                      borderTop: 'none',
                    }}>
                      {loadingAnnotations ? (
                        <div style={{ fontSize: 12, color: '#9299b5', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
                        </div>
                      ) : viewAnnotations.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#5a6080' }}>No annotations yet.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#4f7fff', marginBottom: 4 }}>
                            {viewAnnotations.length} annotation{viewAnnotations.length !== 1 ? 's' : ''}
                          </div>
                          {viewAnnotations.map((a: any) => (
                            <div key={a.id} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '4px 8px',
                              borderRadius: 6,
                              background: 'var(--surface2)',
                              fontSize: 11,
                            }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                              <span style={{ color: 'var(--text2)', textTransform: 'capitalize' }}>{a.type}</span>
                              {a.type === 'text' && a.data?.text && (
                                <span style={{ color: 'var(--text3)' }}>"{a.data.text}"</span>
                              )}
                            </div>
                          ))}
                          {p.customer_overall_note && (
                            <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', fontSize: 12, color: '#f59e0b' }}>
                              <strong>Customer note:</strong> {p.customer_overall_note}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
