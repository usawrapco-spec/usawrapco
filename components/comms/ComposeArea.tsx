'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import {
  Send,
  ImageIcon,
  FileText,
  X,
  ChevronDown,
  Users,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  PenLine,
  Briefcase,
} from 'lucide-react'
import type { Conversation, EmailTemplate, SmsTemplate, PhotoSelection } from './types'
import type { Profile } from '@/types'
import { PhotoPickerModal } from './PhotoPickerModal'
import { createClient } from '@/lib/supabase/client'

interface ContactSuggestion {
  id: string
  name: string
  email: string | null
  phone: string | null
  hasActiveJob: boolean
}

type ComposeTab = 'email' | 'sms' | 'note'

interface Props {
  conversation: Conversation | null
  profile: Profile
  templates: EmailTemplate[]
  smsTemplates?: SmsTemplate[]
  replySubject?: string
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
  defaultTab?: ComposeTab
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

// ── Rich text toolbar button ──────────────────────────────────────
function ToolbarBtn({
  onMouseDown,
  title,
  children,
}: {
  onMouseDown: (e: React.MouseEvent) => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={onMouseDown}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 24,
        background: 'transparent',
        border: '1px solid transparent',
        borderRadius: 4,
        cursor: 'pointer',
        color: 'var(--text2)',
        padding: 0,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

// ── Rich text email editor ────────────────────────────────────────
function RichTextEditor({
  editorRef,
  onKeyDown,
  placeholder,
}: {
  editorRef: React.RefObject<HTMLDivElement>
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
  placeholder: string
}) {
  const execFmt = (e: React.MouseEvent, cmd: string, val?: string) => {
    e.preventDefault()
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
  }

  const insertLink = (e: React.MouseEvent) => {
    e.preventDefault()
    const url = window.prompt('Enter URL:', 'https://')
    if (url) {
      editorRef.current?.focus()
      document.execCommand('createLink', false, url)
    }
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      {/* Formatting toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '4px 8px',
          background: 'var(--surface2)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <ToolbarBtn onMouseDown={e => execFmt(e, 'bold')} title="Bold (Ctrl+B)">
          <Bold size={12} />
        </ToolbarBtn>
        <ToolbarBtn onMouseDown={e => execFmt(e, 'italic')} title="Italic (Ctrl+I)">
          <Italic size={12} />
        </ToolbarBtn>
        <ToolbarBtn onMouseDown={e => execFmt(e, 'underline')} title="Underline (Ctrl+U)">
          <Underline size={12} />
        </ToolbarBtn>
        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
        <ToolbarBtn onMouseDown={e => execFmt(e, 'insertUnorderedList')} title="Bullet list">
          <List size={12} />
        </ToolbarBtn>
        <ToolbarBtn onMouseDown={e => execFmt(e, 'insertOrderedList')} title="Numbered list">
          <ListOrdered size={12} />
        </ToolbarBtn>
        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
        <ToolbarBtn onMouseDown={insertLink} title="Insert link">
          <Link2 size={12} />
        </ToolbarBtn>
        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
        <ToolbarBtn onMouseDown={e => execFmt(e, 'removeFormat')} title="Clear formatting">
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>Tx</span>
        </ToolbarBtn>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onKeyDown={onKeyDown}
        data-placeholder={placeholder}
        style={{
          minHeight: 120,
          maxHeight: 280,
          overflowY: 'auto',
          padding: '8px 12px',
          fontSize: 13,
          color: 'var(--text1)',
          outline: 'none',
          lineHeight: 1.6,
          background: 'var(--bg)',
        }}
      />
    </div>
  )
}

export function ComposeArea({
  conversation,
  profile,
  templates,
  smsTemplates = [],
  replySubject,
  onSend,
  composingNew,
  defaultTab,
  newTo,
  onNewToChange,
  newName,
  onNewNameChange,
}: Props) {
  const [tab, setTab] = useState<ComposeTab>(defaultTab || 'email')
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
  const editorRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()
  const orgId = profile.org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

  // ── Contact autocomplete ───────────────────────────────────────
  const [suggestions, setSuggestions] = useState<ContactSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const toWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!composingNew || !newTo || newTo.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    const timer = setTimeout(async () => {
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name, email, phone')
        .eq('org_id', orgId)
        .or(`name.ilike.%${newTo}%,email.ilike.%${newTo}%,phone.ilike.%${newTo}%`)
        .limit(8)
      if (!customers?.length) { setSuggestions([]); setShowSuggestions(false); return }

      const ids = customers.map((c) => c.id)
      const { data: jobs } = await supabase
        .from('projects')
        .select('customer_id')
        .in('customer_id', ids)
        .not('status', 'in', '("done","cancelled")')
      const activeSet = new Set((jobs || []).map((j) => j.customer_id))

      setSuggestions(customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        hasActiveJob: activeSet.has(c.id),
      })))
      setShowSuggestions(true)
    }, 250)
    return () => clearTimeout(timer)
  }, [newTo, composingNew]) // eslint-disable-line

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toWrapperRef.current && !toWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectSuggestion = (s: ContactSuggestion) => {
    onNewNameChange?.(s.name)
    onNewToChange?.(tab === 'sms' ? (s.phone || '') : (s.email || ''))
    setShowSuggestions(false)
  }

  // Signature HTML block appended below message body
  const sigHtml = profile.email_signature
    ? `<div><br></div><div data-sig="1" style="color:#9299b5;font-size:12px;border-top:1px solid #1a1d27;padding-top:6px;margin-top:4px;">-- <br>${profile.email_signature.replace(/\n/g, '<br>')}</div>`
    : ''

  // ── Initialize editor with signature on first render ──────────
  useEffect(() => {
    if (editorRef.current && sigHtml && !editorRef.current.innerText.trim()) {
      editorRef.current.innerHTML = sigHtml
      try {
        const range = document.createRange()
        const sel = window.getSelection()
        range.setStart(editorRef.current, 0)
        range.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(range)
      } catch {}
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pre-fill subject for reply threading ─────────────────────
  useEffect(() => {
    if (replySubject && !subject) {
      setSubject(
        replySubject.toLowerCase().startsWith('re:')
          ? replySubject
          : `Re: ${replySubject}`
      )
    }
  }, [replySubject]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTemplate = (tmpl: EmailTemplate) => {
    const name = conversation?.contact_name || newName || 'there'
    const html = tmpl.body_html
      .replace(/\{\{contact_name\}\}/g, name)
      .replace(/\{\{customer_name\}\}/g, name)
    setSubject(tmpl.subject)
    if (editorRef.current && tab === 'email') {
      editorRef.current.innerHTML = html + (sigHtml || '')
      editorRef.current.focus()
    } else {
      // Strip tags for SMS/note
      const plain = html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&')
      setBody(plain)
    }
    setShowTemplates(false)
  }

  const handlePhotosInserted = (selected: PhotoSelection[]) => {
    setPhotos((prev) => [...prev, ...selected])
  }

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  const resetEditor = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = sigHtml || ''
      try {
        const range = document.createRange()
        const sel = window.getSelection()
        range.setStart(editorRef.current, 0)
        range.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(range)
      } catch {}
    }
  }

  const handleSend = async () => {
    const isEmail = tab === 'email'
    const emailHtml = isEmail && editorRef.current ? editorRef.current.innerHTML : undefined
    const emailPlain = isEmail && editorRef.current ? (editorRef.current.innerText || '') : body

    if (isEmail) {
      if (!emailPlain.trim()) return
    } else {
      if (!body.trim()) return
    }

    setSending(true)
    try {
      await onSend({
        channel: tab,
        subject: isEmail ? subject : undefined,
        body: isEmail ? emailPlain : body,
        body_html: emailHtml || undefined,
        photos: (isEmail || tab === 'sms') && photos.length > 0 ? photos : undefined,
        cc: isEmail && ccEmails.length > 0 ? ccEmails : undefined,
        bcc: isEmail && bccEmails.length > 0 ? bccEmails : undefined,
        to_email: composingNew ? (tab !== 'sms' ? newTo : undefined) : conversation?.contact_email || undefined,
        to_phone: composingNew ? (tab === 'sms' ? newTo : undefined) : conversation?.contact_phone || undefined,
        contact_name: composingNew ? newName : undefined,
      })
      setBody('')
      setSubject('')
      setPhotos([])
      setCcEmails([])
      setBccEmails([])
      setShowCc(false)
      setShowBcc(false)
      resetEditor()
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
      {/* Styles for contenteditable placeholder + formatting */}
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: var(--text3);
          pointer-events: none;
        }
        [contenteditable] a { color: var(--accent); }
        [contenteditable] ul { padding-left: 20px; margin: 4px 0; }
        [contenteditable] ol { padding-left: 20px; margin: 4px 0; }
        [contenteditable] li { margin: 2px 0; }
        [contenteditable] p { margin: 0 0 4px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      <div
        style={{
          borderTop: '1px solid var(--border)',
          background: tab === 'note' ? 'rgba(245,158,11,0.06)' : 'var(--surface)',
          flexShrink: 0,
        }}
      >
        {/* New conversation To field with contact autocomplete */}
        {composingNew && (
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 8 }}>
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
              <div ref={toWrapperRef} style={{ flex: 2, position: 'relative' }}>
                <input
                  type="text"
                  placeholder={tab === 'sms' ? 'Phone number' : 'Email or name to search...'}
                  value={newTo || ''}
                  onChange={(e) => { onNewToChange?.(e.target.value); setShowSuggestions(true) }}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
                  style={{
                    width: '100%',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 13,
                    color: 'var(--text1)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                    zIndex: 50,
                  }}>
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s) }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          padding: '8px 12px',
                          background: 'none',
                          border: 'none',
                          borderBottom: '1px solid var(--surface2)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        {/* Avatar */}
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--accent)', flexShrink: 0, fontFamily: 'Barlow Condensed, sans-serif' }}>
                          {(s.name || '?').charAt(0).toUpperCase()}
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tab === 'sms' ? (s.phone || s.email || '') : (s.email || s.phone || '')}
                          </div>
                        </div>
                        {/* Job badge */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '2px 7px',
                          borderRadius: 99,
                          fontSize: 10,
                          fontWeight: 700,
                          background: s.hasActiveJob ? 'rgba(34,192,122,0.15)' : 'var(--surface2)',
                          color: s.hasActiveJob ? 'var(--green)' : 'var(--text3)',
                          flexShrink: 0,
                        }}>
                          <Briefcase size={9} />
                          {s.hasActiveJob ? 'Active job' : 'No job'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
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

          {/* SMS template selector */}
          {tab === 'sms' && smsTemplates.length > 0 && (
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
                Quick reply
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
                  {smsTemplates.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => {
                        const name = conversation?.contact_name || newName || 'there'
                        setBody(tmpl.body.replace(/\{\{contact_name\}\}/g, name))
                        setShowTemplates(false)
                      }}
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
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      <div style={{ fontWeight: 600 }}>{tmpl.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tmpl.body.slice(0, 60)}...
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
                    width: 280,
                    maxHeight: 300,
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

        {/* Selected photos preview (email + MMS) */}
        {(tab === 'email' || tab === 'sms') && photos.length > 0 && (
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
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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

        {/* Body area */}
        <div style={{ padding: '6px 14px' }}>
          {tab === 'email' ? (
            <RichTextEditor
              editorRef={editorRef}
              onKeyDown={handleKeyDown}
              placeholder="Write your email..."
            />
          ) : (
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                tab === 'note'
                  ? 'Write an internal note...'
                  : 'Type your SMS message...'
              }
              rows={3}
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
          )}
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
            {(tab === 'email' || tab === 'sms') && (
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
                  color: tab === 'sms' ? 'var(--green)' : 'var(--text2)',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <ImageIcon size={13} />
                {tab === 'sms' ? 'MMS' : 'Photos'}
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
            {/* Signature indicator */}
            {tab === 'email' && profile.email_signature && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: 'var(--text3)',
                }}
              >
                <PenLine size={11} />
                Sig
              </span>
            )}
            {tab === 'sms' && (
              <span
                style={{
                  fontSize: 11,
                  color: smsCharCount > 160 && photos.length === 0 ? 'var(--amber)' : 'var(--text3)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {photos.length > 0
                  ? `MMS · ${photos.length} photo${photos.length !== 1 ? 's' : ''}`
                  : `${smsCharCount}/160 · ${smsSegments} segment${smsSegments !== 1 ? 's' : ''}`}
              </span>
            )}
            {tab === 'note' && (
              <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>
                Internal note — not sent to customer
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>
              {'\u2318'}+Enter to send
            </span>
            <button
              onClick={handleSend}
              disabled={sending}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                background: sending
                  ? 'var(--surface2)'
                  : tab === 'note'
                    ? 'var(--amber)'
                    : 'var(--accent)',
                border: 'none',
                cursor: sending ? 'not-allowed' : 'pointer',
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
