'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import {
  Send,
  ImageIcon,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  Users,
} from 'lucide-react'
import type { Conversation, EmailTemplate, PhotoSelection } from './types'
import type { Profile } from '@/types'
import { PhotoPickerModal } from './PhotoPickerModal'

type ComposeTab = 'email' | 'sms' | 'note'

interface Props {
  conversation: Conversation | null
  profile: Profile
  templates: EmailTemplate[]
  onSend: (data: {
    channel: ComposeTab
    subject?: string
    body: string
    body_html?: string
    photos?: PhotoSelection[]
    cc?: string[]
    bcc?: string[]
    to_email?: string
    to_phone?: string
    contact_name?: string
  }) => Promise<void>
  composingNew?: boolean
  newTo?: string
  onNewToChange?: (v: string) => void
  newName?: string
  onNewNameChange?: (v: string) => void
}

// ── Chip input for CC / BCC ──────────────────────────────────────
function ChipInput({
  label,
  chips,
  onChipsChange,
}: {
  label: string
  chips: string[]
  onChipsChange: (chips: string[]) => void
}) {
  const [input, setInput] = useState('')

  const addChip = (val: string) => {
    const trimmed = val.trim().replace(/,$/, '')
    if (trimmed && !chips.includes(trimmed)) {
      onChipsChange([...chips, trimmed])
    }
    setInput('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault()
      if (input.trim()) addChip(input)
    }
    if (e.key === 'Backspace' && !input && chips.length > 0) {
      onChipsChange(chips.slice(0, -1))
    }
  }

  const handleBlur = () => {
    if (input.trim()) addChip(input)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        padding: '5px 10px',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        flexWrap: 'wrap',
        minHeight: 32,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', paddingTop: 2, flexShrink: 0, minWidth: 28 }}>
        {label}:
      </span>
      {chips.map((chip, i) => (
        <span
          key={i}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(79,127,255,0.15)',
            color: 'var(--accent)',
            borderRadius: 4,
            padding: '1px 6px',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {chip}
          <button
            onClick={() => onChipsChange(chips.filter((_, idx) => idx !== i))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, display: 'flex', alignItems: 'center' }}
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={chips.length === 0 ? 'Add email, press Enter' : ''}
        style={{
          flex: 1,
          minWidth: 120,
          background: 'none',
          border: 'none',
          outline: 'none',
          fontSize: 12,
          color: 'var(--text1)',
        }}
      />
    </div>
  )
}

export function ComposeArea({
  conversation,
  profile,
  templates,
  onSend,
  composingNew,
  newTo,
  onNewToChange,
  newName,
  onNewNameChange,
}: Props) {
  const [tab, setTab] = useState<ComposeTab>('email')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [photos, setPhotos] = useState<PhotoSelection[]>([])
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [sending, setSending] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [ccEmails, setCcEmails] = useState<string[]>([])
  const [bccEmails, setBccEmails] = useState<string[]>([])
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const orgId = profile.org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

  const handleTemplate = (tmpl: EmailTemplate) => {
    setSubject(tmpl.subject)
    const name = conversation?.contact_name || newName || 'there'
    // Replace common template variables
    const bodyText = tmpl.body_html
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&middot;/g, '\u00B7')
      .replace(/{{contact_name}}/g, name)
      .replace(/{{customer_name}}/g, name)
    setBody(bodyText)
    setShowTemplates(false)
  }

  const handlePhotosInserted = (selected: PhotoSelection[]) => {
    setPhotos((prev) => [...prev, ...selected])
  }

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSend = async () => {
    if (!body.trim() && tab !== 'email') return
    if (tab === 'email' && !body.trim() && !subject.trim()) return
    setSending(true)
    try {
      await onSend({
        channel: tab,
        subject: tab === 'email' ? subject : undefined,
        body,
        photos: tab === 'email' ? photos : undefined,
        cc: tab === 'email' && ccEmails.length > 0 ? ccEmails : undefined,
        bcc: tab === 'email' && bccEmails.length > 0 ? bccEmails : undefined,
        to_email: composingNew ? newTo : conversation?.contact_email || undefined,
        to_phone: composingNew ? newTo : conversation?.contact_phone || undefined,
        contact_name: composingNew ? newName : undefined,
      })
      setBody('')
      setSubject('')
      setPhotos([])
      setCcEmails([])
      setBccEmails([])
      setShowCc(false)
      setShowBcc(false)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const smsCharCount = body.length
  const smsSegments = Math.ceil(smsCharCount / 160) || 1

  const TABS: { key: ComposeTab; label: string }[] = [
    { key: 'email', label: 'Email' },
    { key: 'sms', label: 'SMS' },
    { key: 'note', label: 'Note' },
  ]

  return (
    <>
      <div
        style={{
          borderTop: '1px solid var(--border)',
          background: tab === 'note' ? 'rgba(245,158,11,0.06)' : 'var(--surface)',
          flexShrink: 0,
        }}
      >
        {/* New conversation To field */}
        {composingNew && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '8px 14px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <input
              type="text"
              placeholder="Name"
              value={newName || ''}
              onChange={(e) => onNewNameChange?.(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 13,
                color: 'var(--text1)',
                outline: 'none',
              }}
            />
            <input
              type="text"
              placeholder={tab === 'sms' ? 'Phone number' : 'Email address'}
              value={newTo || ''}
              onChange={(e) => onNewToChange?.(e.target.value)}
              style={{
                flex: 2,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 13,
                color: 'var(--text1)',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            padding: '6px 14px 0',
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? 'var(--accent)' : 'var(--text3)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />

          {/* CC / BCC toggles for email */}
          {tab === 'email' && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button
                onClick={() => setShowCc(!showCc)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: showCc ? 700 : 500,
                  color: showCc ? 'var(--accent)' : 'var(--text3)',
                  background: showCc ? 'rgba(79,127,255,0.1)' : 'transparent',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                CC
              </button>
              <button
                onClick={() => setShowBcc(!showBcc)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: showBcc ? 700 : 500,
                  color: showBcc ? 'var(--purple)' : 'var(--text3)',
                  background: showBcc ? 'rgba(139,92,246,0.1)' : 'transparent',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                BCC
              </button>
            </div>
          )}

          {/* Template selector for email */}
          {tab === 'email' && templates.length > 0 && (
            <div style={{ position: 'relative', marginLeft: 6 }}>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 5,
                  fontSize: 11,
                  color: 'var(--text2)',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <FileText size={12} />
                Templates
                <ChevronDown size={10} />
              </button>
              {showTemplates && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: 4,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    width: 260,
                    maxHeight: 280,
                    overflowY: 'auto',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    zIndex: 10,
                  }}
                >
                  {templates.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => handleTemplate(tmpl)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 14px',
                        fontSize: 12,
                        color: 'var(--text1)',
                        background: 'none',
                        border: 'none',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = 'var(--surface2)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = 'none')
                      }
                    >
                      <div style={{ fontWeight: 600 }}>{tmpl.name}</div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text3)',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {tmpl.subject}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Email fields: subject + CC + BCC */}
        {tab === 'email' && (
          <div style={{ padding: '6px 14px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '7px 10px',
                fontSize: 13,
                color: 'var(--text1)',
                outline: 'none',
              }}
            />
            {showCc && (
              <ChipInput
                label="CC"
                chips={ccEmails}
                onChipsChange={setCcEmails}
              />
            )}
            {showBcc && (
              <ChipInput
                label="BCC"
                chips={bccEmails}
                onChipsChange={setBccEmails}
              />
            )}
          </div>
        )}

        {/* Selected photos preview */}
        {tab === 'email' && photos.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: '6px 14px',
              overflowX: 'auto',
            }}
          >
            {photos.map((p, i) => (
              <div
                key={i}
                style={{
                  position: 'relative',
                  width: 56,
                  height: 56,
                  borderRadius: 6,
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1px solid var(--border)',
                }}
              >
                <img
                  src={p.image_url}
                  alt={p.caption || 'Photo'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <button
                  onClick={() => removePhoto(i)}
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.7)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={10} style={{ color: '#fff' }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Body textarea */}
        <div style={{ padding: '6px 14px' }}>
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              tab === 'note'
                ? 'Write an internal note...'
                : tab === 'sms'
                  ? 'Type your SMS message...'
                  : 'Write your email message...'
            }
            rows={tab === 'email' ? 5 : 3}
            style={{
              width: '100%',
              background: tab === 'note' ? 'rgba(245,158,11,0.06)' : 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: 13,
              color: 'var(--text1)',
              outline: 'none',
              resize: 'vertical',
              minHeight: 60,
              lineHeight: 1.5,
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Footer actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 14px 10px',
          }}
        >
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {tab === 'email' && (
              <button
                onClick={() => setShowPhotoPicker(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text2)',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <ImageIcon size={13} />
                Photos
              </button>
            )}
            {/* CC/BCC chip summary */}
            {tab === 'email' && (ccEmails.length > 0 || bccEmails.length > 0) && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: 'var(--text3)',
                }}
              >
                <Users size={11} />
                {ccEmails.length + bccEmails.length} recipient{ccEmails.length + bccEmails.length !== 1 ? 's' : ''} added
              </span>
            )}
            {tab === 'sms' && (
              <span
                style={{
                  fontSize: 11,
                  color: smsCharCount > 160 ? 'var(--amber)' : 'var(--text3)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {smsCharCount}/160 &middot; {smsSegments} segment{smsSegments !== 1 ? 's' : ''}
              </span>
            )}
            {tab === 'note' && (
              <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>
                Internal note — not sent to customer
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span
              style={{
                fontSize: 10,
                color: 'var(--text3)',
              }}
            >
              {'\u2318'}+Enter to send
            </span>
            <button
              onClick={handleSend}
              disabled={sending || (!body.trim() && !subject.trim())}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                background:
                  sending || (!body.trim() && !subject.trim())
                    ? 'var(--surface2)'
                    : tab === 'note'
                      ? 'var(--amber)'
                      : 'var(--accent)',
                border: 'none',
                cursor:
                  sending || (!body.trim() && !subject.trim())
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {sending ? (
                <span
                  style={{
                    width: 14,
                    height: 14,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }}
                />
              ) : (
                <Send size={14} />
              )}
              {tab === 'note' ? 'Save Note' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      {/* Photo picker modal */}
      {showPhotoPicker && (
        <PhotoPickerModal
          projectId={conversation?.project_id}
          orgId={orgId}
          onInsert={handlePhotosInserted}
          onClose={() => setShowPhotoPicker(false)}
        />
      )}
    </>
  )
}
