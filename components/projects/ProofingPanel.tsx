'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Upload, Send, Check, X, ChevronDown, ChevronUp, ChevronRight, Mail,
  ThumbsUp, ThumbsDown, MoreHorizontal, Download, History,
  Copy, Trash2, FileImage, Clock, Loader2, Plus, MessageSquare,
  Paperclip,
} from 'lucide-react'
import type { Profile, Project } from '@/types'
import GalleryPicker, { type GalleryFile } from '@/components/shared/GalleryPicker'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProofVersion {
  id: string
  version_number: number
  file_url: string | null
  file_name: string | null
  file_type: string | null
  thumbnail_url: string | null
  notes: string | null
  created_at: string
  uploader?: { name: string } | null
}

interface ProofMessage {
  id: string
  content: string
  sender_name: string | null
  sender_type: 'internal' | 'customer'
  attachments: string[]
  created_at: string
}

interface JobProof {
  id: string
  proof_number: number
  title: string
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'revision_requested'
  current_version: number
  sent_at: string | null
  approved_at: string | null
  approved_by: string | null
  customer_notes: string | null
  internal_notes: string | null
  created_at: string
  versions?: ProofVersion[]
  messages?: ProofMessage[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:              { label: 'Draft',             color: '#9299b5', bg: '#9299b520' },
  sent:               { label: 'Sent',              color: '#4f7fff', bg: '#4f7fff20' },
  approved:           { label: 'Approved',          color: '#22c07a', bg: '#22c07a20' },
  rejected:           { label: 'Rejected',          color: '#f25a5a', bg: '#f25a5a20' },
  revision_requested: { label: 'Revision Requested', color: '#f59e0b', bg: '#f59e0b20' },
}

interface Props {
  project: Project
  profile: Profile
}

export default function ProofingPanel({ project, profile }: Props) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [proofs, setProofs] = useState<JobProof[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedProof, setExpandedProof] = useState<string | null>(null)
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({})
  const [messageInputs, setMessageInputs] = useState<Record<string, string>>({})
  const [sendingMessage, setSendingMessage] = useState<string | null>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryProofId, setGalleryProofId] = useState<string | null>(null)
  const [moreMenuOpen, setMoreMenuOpen] = useState<string | null>(null)
  const [versionPanelOpen, setVersionPanelOpen] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ proofId: string; note: string } | null>(null)
  const [creating, setCreating] = useState(false)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  const loadProofs = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/jobs/${project.id}/proofs`)
    if (res.ok) {
      const { proofs: data } = await res.json()
      setProofs(data || [])
    }
    setLoading(false)
  }, [project.id])

  useEffect(() => { loadProofs() }, [loadProofs])

  // Close more menu on outside click
  useEffect(() => {
    if (!moreMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moreMenuOpen])

  const createProof = async () => {
    setCreating(true)
    const res = await fetch(`/api/jobs/${project.id}/proofs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: project.org_id,
        created_by: profile.id,
      }),
    })
    if (res.ok) {
      const { proof } = await res.json()
      setProofs(prev => [...prev, proof])
      setExpandedProof(proof.id)
    }
    setCreating(false)
  }

  const updateProofStatus = async (proofId: string, status: JobProof['status'], extra?: Record<string, unknown>) => {
    const res = await fetch(`/api/jobs/${project.id}/proofs/${proofId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...extra }),
    })
    if (res.ok) {
      const { proof } = await res.json()
      setProofs(prev => prev.map(p => p.id === proofId ? { ...p, ...proof } : p))
    }
  }

  const deleteProof = async (proofId: string) => {
    const res = await fetch(`/api/jobs/${project.id}/proofs/${proofId}`, { method: 'DELETE' })
    if (res.ok) setProofs(prev => prev.filter(p => p.id !== proofId))
  }

  const sendMessage = async (proofId: string) => {
    const content = messageInputs[proofId]?.trim()
    if (!content) return
    setSendingMessage(proofId)
    const res = await fetch(`/api/jobs/${project.id}/proofs/${proofId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: project.org_id,
        sender_id: profile.id,
        sender_name: profile.name,
        sender_type: 'internal',
        content,
      }),
    })
    if (res.ok) {
      const { message } = await res.json()
      setProofs(prev => prev.map(p => {
        if (p.id !== proofId) return p
        return { ...p, messages: [...(p.messages || []), message] }
      }))
      setMessageInputs(prev => ({ ...prev, [proofId]: '' }))
    }
    setSendingMessage(null)
  }

  const uploadVersionFile = useCallback(async (proofId: string, file: File) => {
    setUploadingFor(proofId)
    const ext = file.name.split('.').pop() || 'bin'
    const path = `proofs/${project.id}/${proofId}/v_${Date.now()}.${ext}`

    const { error } = await supabase.storage.from('project-files').upload(path, file, { upsert: true })
    if (error) { setUploadingFor(null); return }

    const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path)

    const res = await fetch(`/api/jobs/${project.id}/proofs/${proofId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: project.org_id,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
        uploaded_by: profile.id,
      }),
    })
    if (res.ok) {
      const { version } = await res.json()
      setProofs(prev => prev.map(p => {
        if (p.id !== proofId) return p
        return {
          ...p,
          current_version: version.version_number,
          versions: [...(p.versions || []), version],
        }
      }))
    }
    setUploadingFor(null)
  }, [supabase, project.id, project.org_id, profile.id])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, proofId: string) => {
    const file = e.target.files?.[0]
    if (file) uploadVersionFile(proofId, file)
    e.target.value = ''
  }

  const handleGallerySelect = async (file: GalleryFile) => {
    if (!galleryProofId) return
    setGalleryOpen(false)
    const res = await fetch(`/api/jobs/${project.id}/proofs/${galleryProofId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: project.org_id,
        file_url: file.url,
        file_name: file.name,
        file_type: file.file_type,
        uploaded_by: profile.id,
      }),
    })
    if (res.ok) {
      const { version } = await res.json()
      setProofs(prev => prev.map(p => {
        if (p.id !== galleryProofId) return p
        return {
          ...p,
          current_version: version.version_number,
          versions: [...(p.versions || []), version],
        }
      }))
    }
    setGalleryProofId(null)
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 30, color: 'var(--text3)' }}>
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
        Loading proofs…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileImage size={16} style={{ color: 'var(--cyan)' }} />
          <span style={{
            fontSize: 13, fontWeight: 800, color: 'var(--text1)',
            fontFamily: 'Barlow Condensed, sans-serif',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            Proofs
          </span>
          {proofs.length > 0 && (
            <span style={{
              padding: '2px 8px', borderRadius: 10, background: 'var(--surface2)',
              color: 'var(--text2)', fontSize: 11, fontWeight: 700,
            }}>
              {proofs.length}
            </span>
          )}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {proofs.some(p => p.status === 'draft') && (
            <button
              onClick={() => {
                const draftProof = proofs.find(p => p.status === 'draft')
                if (draftProof) updateProofStatus(draftProof.id, 'sent')
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                border: 'none', background: 'var(--cyan)', color: '#000',
                cursor: 'pointer', fontSize: 12, fontWeight: 700,
              }}
            >
              <Send size={13} /> Send V1 for Review
            </button>
          )}
          <button
            onClick={createProof}
            disabled={creating}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              border: 'none', background: 'var(--green)', color: '#fff',
              cursor: 'pointer', fontSize: 12, fontWeight: 700,
              opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
            Add New Proof
          </button>
        </div>
      </div>

      {/* ── Proof cards ───────────────────────────────────────────────────── */}
      {proofs.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          background: 'var(--surface)', borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <FileImage size={36} style={{ color: 'var(--text3)', opacity: 0.4, display: 'block', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>No proofs yet</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6, marginBottom: 16 }}>
            Add a design proof to share with the customer for approval.
          </div>
          <button
            onClick={createProof}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff',
              cursor: 'pointer', fontSize: 13, fontWeight: 700,
            }}
          >
            Add First Proof
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {proofs.map(proof => {
            const sc = STATUS_CONFIG[proof.status] ?? STATUS_CONFIG.draft
            const isExpanded = expandedProof === proof.id
            const messagesExpanded = expandedMessages[proof.id]
            const latestVersion = proof.versions?.[proof.versions.length - 1]
            const visibleMessages = messagesExpanded
              ? (proof.messages || [])
              : (proof.messages || []).slice(-2)

            return (
              <div
                key={proof.id}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid rgba(255,255,255,0.08)`,
                  borderLeft: `3px solid ${sc.color}`,
                  borderRadius: '0 12px 12px 0',
                  overflow: 'hidden',
                }}
              >
                {/* ── Proof Card Header ── */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  cursor: 'pointer',
                }} onClick={() => setExpandedProof(isExpanded ? null : proof.id)}>

                  {/* Thumbnail */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 8, flexShrink: 0,
                    background: 'var(--surface2)', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {latestVersion?.file_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={latestVersion.file_url}
                        alt={proof.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <FileImage size={22} style={{ color: 'var(--text3)' }} />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                        {proof.title}
                      </span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10,
                        background: sc.bg, color: sc.color,
                        fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        {sc.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                        #{proof.proof_number} · {fmtDate(proof.created_at)}
                      </span>
                      {proof.versions && proof.versions.length > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); setVersionPanelOpen(versionPanelOpen === proof.id ? null : proof.id) }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '2px 8px', borderRadius: 6,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'transparent', color: 'var(--text2)',
                            cursor: 'pointer', fontSize: 11, fontWeight: 700,
                          }}
                        >
                          Version {proof.current_version} <ChevronRight size={10} />
                        </button>
                      )}
                      {proof.messages && proof.messages.length > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MessageSquare size={11} /> {proof.messages.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Email */}
                    <button
                      title="Email to customer"
                      onClick={() => updateProofStatus(proof.id, 'sent')}
                      style={{
                        width: 30, height: 30, borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                        color: 'var(--text2)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Mail size={13} />
                    </button>
                    {/* Approve */}
                    <button
                      title="Approve proof"
                      onClick={() => updateProofStatus(proof.id, 'approved', { approved_by: profile.name })}
                      style={{
                        width: 30, height: 30, borderRadius: 6,
                        border: '1px solid rgba(34,192,122,0.3)', background: 'rgba(34,192,122,0.1)',
                        color: '#22c07a', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <ThumbsUp size={13} />
                    </button>
                    {/* Reject */}
                    <button
                      title="Reject proof"
                      onClick={() => setRejectModal({ proofId: proof.id, note: '' })}
                      style={{
                        width: 30, height: 30, borderRadius: 6,
                        border: '1px solid rgba(242,90,90,0.3)', background: 'rgba(242,90,90,0.1)',
                        color: '#f25a5a', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <ThumbsDown size={13} />
                    </button>
                    {/* More */}
                    <div style={{ position: 'relative' }} ref={moreMenuOpen === proof.id ? moreMenuRef : undefined}>
                      <button
                        onClick={() => setMoreMenuOpen(moreMenuOpen === proof.id ? null : proof.id)}
                        style={{
                          width: 30, height: 30, borderRadius: 6,
                          border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                          color: 'var(--text2)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <MoreHorizontal size={13} />
                      </button>
                      {moreMenuOpen === proof.id && (
                        <div style={{
                          position: 'absolute', top: '100%', right: 0, zIndex: 200,
                          marginTop: 4, background: 'var(--surface)',
                          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                          overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                          minWidth: 160,
                        }}>
                          {[
                            { icon: <Download size={12} />, label: 'Download', action: () => { if (latestVersion?.file_url) window.location.href = latestVersion.file_url } },
                            { icon: <History size={12} />, label: 'View History', action: () => setVersionPanelOpen(proof.id) },
                            { icon: <Copy size={12} />, label: 'Duplicate', action: async () => {
                              await fetch(`/api/jobs/${project.id}/proofs`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ org_id: project.org_id, title: `${proof.title} (Copy)`, created_by: profile.id }),
                              })
                              loadProofs()
                            }},
                            { icon: <Trash2 size={12} />, label: 'Delete', action: () => deleteProof(proof.id), danger: true },
                          ].map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => { item.action(); setMoreMenuOpen(null) }}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                                padding: '9px 12px', border: 'none', background: 'transparent',
                                color: (item as any).danger ? '#f25a5a' : 'var(--text1)',
                                cursor: 'pointer', fontSize: 13, textAlign: 'left',
                              }}
                            >
                              {item.icon} {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpandedProof(isExpanded ? null : proof.id)}
                      style={{
                        width: 30, height: 30, borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                        color: 'var(--text2)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* ── Version History Panel ── */}
                {versionPanelOpen === proof.id && proof.versions && (
                  <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.15)',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                      Version History
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[...proof.versions].reverse().map(v => (
                        <div
                          key={v.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px', borderRadius: 8,
                            background: v.version_number === proof.current_version ? 'rgba(79,127,255,0.1)' : 'var(--surface2)',
                            border: `1px solid ${v.version_number === proof.current_version ? 'rgba(79,127,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                          }}
                        >
                          {/* Tiny thumb */}
                          <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', background: 'var(--bg)', flexShrink: 0 }}>
                            {v.file_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={v.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            ) : (
                              <FileImage size={16} style={{ color: 'var(--text3)', margin: '10px auto', display: 'block' }} />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: v.version_number === proof.current_version ? 'var(--accent)' : 'var(--text1)' }}>
                              Version {v.version_number}
                              {v.version_number === proof.current_version && (
                                <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 6 }}>current</span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                              {fmtDate(v.created_at)}
                              {v.uploader?.name && ` · ${v.uploader.name}`}
                            </div>
                          </div>
                          {v.file_url && (
                            <a
                              href={v.file_url}
                              download
                              onClick={e => e.stopPropagation()}
                              style={{ color: 'var(--text3)', flexShrink: 0 }}
                            >
                              <Download size={14} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Expanded: Upload new version + per-proof chat ── */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Upload new version */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                        Add File / New Version
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="file"
                          id={`file-upload-${proof.id}`}
                          style={{ display: 'none' }}
                          onChange={e => handleFileInput(e, proof.id)}
                          accept="image/*,.pdf,.ai,.psd,.png,.jpg"
                        />
                        <label
                          htmlFor={`file-upload-${proof.id}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 12px', borderRadius: 8,
                            border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent',
                            color: 'var(--text2)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          }}
                        >
                          {uploadingFor === proof.id
                            ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…</>
                            : <><Upload size={13} /> Upload File</>
                          }
                        </label>
                        <button
                          onClick={() => { setGalleryProofId(proof.id); setGalleryOpen(true) }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 12px', borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                            color: 'var(--text2)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          }}
                        >
                          <FileImage size={13} /> From Gallery
                        </button>
                      </div>
                    </div>

                    {/* Per-proof chat thread */}
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MessageSquare size={11} /> Discussion
                        {proof.messages && proof.messages.length > 2 && (
                          <button
                            onClick={() => setExpandedMessages(prev => ({ ...prev, [proof.id]: !prev[proof.id] }))}
                            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                          >
                            {messagesExpanded ? 'Show less' : `Show all ${proof.messages.length} messages`}
                          </button>
                        )}
                      </div>

                      {/* Messages */}
                      {visibleMessages.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', marginBottom: 10 }}>
                          No messages yet. Start a discussion about this proof.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                          {visibleMessages.map(msg => (
                            <div
                              key={msg.id}
                              style={{
                                display: 'flex', flexDirection: 'column', gap: 2,
                                alignItems: msg.sender_type === 'customer' ? 'flex-start' : 'flex-end',
                              }}
                            >
                              <div style={{
                                maxWidth: '80%', padding: '8px 12px', borderRadius: 10,
                                background: msg.sender_type === 'customer'
                                  ? 'rgba(139,92,246,0.15)'
                                  : 'var(--surface2)',
                                border: msg.sender_type === 'customer'
                                  ? '1px solid rgba(139,92,246,0.3)'
                                  : '1px solid rgba(255,255,255,0.06)',
                                color: 'var(--text1)', fontSize: 13, lineHeight: 1.5,
                              }}>
                                {msg.content}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text3)', paddingLeft: 4 }}>
                                {msg.sender_name} · {fmtDate(msg.created_at)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Message input */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                        <input
                          value={messageInputs[proof.id] || ''}
                          onChange={e => setMessageInputs(prev => ({ ...prev, [proof.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(proof.id) } }}
                          placeholder="Add a note about this proof…"
                          style={{
                            flex: 1, padding: '8px 12px', borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'var(--bg)', color: 'var(--text1)',
                            fontSize: 13, outline: 'none',
                          }}
                        />
                        <button
                          onClick={() => sendMessage(proof.id)}
                          disabled={!messageInputs[proof.id]?.trim() || sendingMessage === proof.id}
                          style={{
                            padding: '8px 12px', borderRadius: 8,
                            border: 'none', background: 'var(--accent)', color: '#fff',
                            cursor: 'pointer', opacity: !messageInputs[proof.id]?.trim() ? 0.5 : 1,
                            display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
                          }}
                        >
                          {sendingMessage === proof.id
                            ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                            : <Send size={13} />
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Reject Modal ──────────────────────────────────────────────────── */}
      {rejectModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.1)',
            padding: 24, width: '100%', maxWidth: 440,
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text1)', marginBottom: 4 }}>
              Reject Proof
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              Optionally add a reason for rejection.
            </div>
            <textarea
              value={rejectModal.note}
              onChange={e => setRejectModal(prev => prev ? { ...prev, note: e.target.value } : null)}
              placeholder="What changes are needed?"
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'var(--bg)', color: 'var(--text1)',
                fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={() => setRejectModal(null)}
                style={{
                  padding: '8px 16px', borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                  color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateProofStatus(rejectModal.proofId, 'rejected', { customer_notes: rejectModal.note || null })
                  setRejectModal(null)
                }}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: '#f25a5a', color: '#fff',
                  cursor: 'pointer', fontSize: 13, fontWeight: 700,
                }}
              >
                Reject Proof
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Gallery Picker ────────────────────────────────────────────────── */}
      {galleryOpen && (
        <GalleryPicker
          mode="proof"
          currentProjectId={project.id}
          orgId={project.org_id}
          onSelect={handleGallerySelect}
          onClose={() => { setGalleryOpen(false); setGalleryProofId(null) }}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
