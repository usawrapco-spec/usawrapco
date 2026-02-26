'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Upload,
  Check,
  X,
  Send,
  Copy,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react'

interface Mockup {
  id: string
  project_id: string
  image_url: string
  label: string | null
  is_selected_for_proof: boolean
  sent_to_customer: boolean
  sent_at: string | null
  sort_order: number
  created_at: string
}

interface Props {
  projectId: string
  orgId: string
  proofToken: string | null
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
  vehicle: string
}

export default function MockupBox({
  projectId,
  orgId,
  proofToken,
  customerName,
  customerPhone,
  customerEmail,
  vehicle,
}: Props) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [mockups, setMockups] = useState<Mockup[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [sending, setSending] = useState(false)
  const [customMsg, setCustomMsg] = useState('')
  const [sendSMS, setSendSMS] = useState(!!customerPhone)
  const [sendEmail, setSendEmail] = useState(!!customerEmail)
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [editLabelText, setEditLabelText] = useState('')
  const [copied, setCopied] = useState(false)

  const firstName = customerName?.split(' ')[0] || 'there'
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const proofLink = proofToken ? `${appUrl}/proof/${proofToken}` : ''

  const fetchMockups = useCallback(async () => {
    const { data } = await supabase
      .from('design_mockups')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
    if (data) setMockups(data)
    setLoading(false)
  }, [supabase, projectId])

  useEffect(() => {
    fetchMockups()
  }, [fetchMockups])

  const selected = mockups.filter((m) => m.is_selected_for_proof)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `mockups/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(path, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        continue
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('project-files').getPublicUrl(path)

      await supabase.from('design_mockups').insert({
        project_id: projectId,
        org_id: orgId,
        image_url: publicUrl,
        label: file.name.replace(/\.[^/.]+$/, ''),
        is_selected_for_proof: false,
        sort_order: mockups.length,
      })
    }

    await fetchMockups()
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const toggleSelect = async (id: string) => {
    const mockup = mockups.find((m) => m.id === id)
    if (!mockup) return
    await supabase
      .from('design_mockups')
      .update({ is_selected_for_proof: !mockup.is_selected_for_proof })
      .eq('id', id)
    setMockups((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, is_selected_for_proof: !m.is_selected_for_proof }
          : m
      )
    )
  }

  const saveLabel = async (id: string) => {
    await supabase
      .from('design_mockups')
      .update({ label: editLabelText })
      .eq('id', id)
    setMockups((prev) =>
      prev.map((m) => (m.id === id ? { ...m, label: editLabelText } : m))
    )
    setEditingLabel(null)
  }

  const deleteMockup = async (id: string) => {
    await supabase.from('design_mockups').delete().eq('id', id)
    setMockups((prev) => prev.filter((m) => m.id !== id))
  }

  const handleSend = async () => {
    if (!selected.length) return
    setSending(true)
    try {
      await fetch('/api/proofs/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          mockup_ids: selected.map((m) => m.id),
          send_sms: sendSMS,
          send_email: sendEmail,
          custom_message: customMsg || undefined,
        }),
      })
      await fetchMockups()
      setShowSendModal(false)
      setCustomMsg('')
    } catch (err) {
      console.error('Send error:', err)
    }
    setSending(false)
  }

  const copyLink = async () => {
    if (!proofLink) return
    try {
      await navigator.clipboard.writeText(proofLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          color: 'var(--text3)',
        }}
      >
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ImageIcon size={13} /> Mockups ({mockups.length})
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              color: 'var(--text2)',
            }}
          >
            {uploading ? (
              <Loader2
                size={12}
                style={{ animation: 'spin 1s linear infinite' }}
              />
            ) : (
              <Upload size={12} />
            )}
            Upload
          </button>
          {selected.length > 0 && (
            <button
              onClick={() => setShowSendModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #22c07a, #16a34a)',
                border: 'none',
                color: '#fff',
              }}
            >
              <Send size={12} /> Send {selected.length} Mockup
              {selected.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        style={{ display: 'none' }}
      />

      {/* Mockup grid */}
      {mockups.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--text3)',
            fontSize: 13,
            background: 'var(--surface2)',
            borderRadius: 12,
            border: '1px dashed var(--border)',
          }}
        >
          No mockups yet. Upload design photos to send to the customer.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          {mockups.map((m) => (
            <div
              key={m.id}
              onClick={() => toggleSelect(m.id)}
              style={{
                position: 'relative',
                borderRadius: 12,
                overflow: 'hidden',
                cursor: 'pointer',
                border: m.is_selected_for_proof
                  ? '2px solid #6366f1'
                  : '2px solid var(--border)',
                boxShadow: m.is_selected_for_proof
                  ? '0 0 16px rgba(99,102,241,0.3)'
                  : 'none',
                transition: 'all 0.15s',
              }}
            >
              <img
                src={m.image_url}
                alt={m.label || 'Mockup'}
                style={{
                  width: '100%',
                  aspectRatio: '4/3',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />

              {/* Selected indicator */}
              {m.is_selected_for_proof && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={14} color="#fff" />
                </div>
              )}

              {/* Sent badge */}
              {m.sent_to_customer && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 9,
                    fontWeight: 800,
                    background: 'rgba(34,192,122,0.9)',
                    color: '#fff',
                  }}
                >
                  SENT
                </div>
              )}

              {/* Label + actions */}
              <div
                style={{
                  padding: '8px 10px',
                  background: 'var(--surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 4,
                }}
              >
                {editingLabel === m.id ? (
                  <input
                    value={editLabelText}
                    onChange={(e) => setEditLabelText(e.target.value)}
                    onBlur={() => saveLabel(m.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveLabel(m.id)
                      if (e.key === 'Escape') setEditingLabel(null)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    style={{
                      flex: 1,
                      background: 'var(--surface2)',
                      border: '1px solid var(--accent)',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 11,
                      color: 'var(--text1)',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text2)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {m.label || 'Untitled'}
                  </span>
                )}
                <div
                  style={{ display: 'flex', gap: 4 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setEditingLabel(m.id)
                      setEditLabelText(m.label || '')
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                      color: 'var(--text3)',
                    }}
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => deleteMockup(m.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                      color: 'var(--text3)',
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Send Modal */}
      {showSendModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowSendModal(false)}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 18,
              padding: 24,
              width: 420,
              maxWidth: '90vw',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontSize: 18,
                  fontWeight: 800,
                  color: 'var(--text1)',
                }}
              >
                Send Mockups to Customer
              </div>
              <button
                onClick={() => setShowSendModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text3)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p
              style={{
                fontSize: 13,
                color: 'var(--text2)',
                marginBottom: 12,
              }}
            >
              Sending {selected.length} mockup
              {selected.length !== 1 ? 's' : ''} to{' '}
              <strong style={{ color: 'var(--text1)' }}>{customerName}</strong>
            </p>

            {/* Custom message */}
            <textarea
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              placeholder={`Hi ${firstName}! Your ${vehicle || 'wrap'} design is ready...`}
              rows={3}
              style={{
                width: '100%',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 13,
                color: 'var(--text1)',
                outline: 'none',
                resize: 'vertical',
              }}
            />

            {/* Send via toggles */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginTop: 12,
              }}
            >
              {customerPhone && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: 'var(--text2)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={sendSMS}
                    onChange={(e) => setSendSMS(e.target.checked)}
                  />
                  SMS
                </label>
              )}
              {customerEmail && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: 'var(--text2)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                  />
                  Email
                </label>
              )}
            </div>

            {/* Proof link preview */}
            {proofLink && (
              <div
                style={{
                  background: 'var(--surface2)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  marginTop: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--text3)',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {proofLink}
                </span>
                <button
                  onClick={copyLink}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: copied ? 'var(--green)' : 'var(--accent)',
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Copy size={11} /> {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending || (!sendSMS && !sendEmail)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                background:
                  sending || (!sendSMS && !sendEmail)
                    ? 'var(--surface2)'
                    : 'linear-gradient(135deg, #22c07a, #16a34a)',
                border: 'none',
                color: '#fff',
                marginTop: 16,
                opacity: sending || (!sendSMS && !sendEmail) ? 0.5 : 1,
              }}
            >
              {sending ? 'Sending...' : 'Send Now'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
