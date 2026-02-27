'use client'

import DOMPurify from 'dompurify'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  StickyNote,
  Eye,
  MousePointer,
  PanelRightOpen,
  PanelRightClose,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  RotateCcw,
  UserCheck,
  Phone,
  PhoneOff,
  Mic,
  Play,
  Image as ImageIcon,
} from 'lucide-react'
import type { Profile } from '@/types'
import type { Conversation, ConversationMessage, EmailTemplate, SmsTemplate, PhotoSelection } from './types'
import { formatFullDate, relativeTime } from './types'
import { ComposeArea } from './ComposeArea'
import { usePhone } from '@/components/phone/PhoneProvider'

interface Teammate {
  id: string
  name: string
  role: string
}

interface Props {
  conversation: Conversation
  messages: ConversationMessage[]
  profile: Profile
  templates: EmailTemplate[]
  smsTemplates?: SmsTemplate[]
  teammates?: Teammate[]
  loading: boolean
  onBack: () => void
  onMessageSent: (convoId: string) => void
  onToggleContact: () => void
  contactVisible: boolean
  onAssign?: (convoId: string, userId: string | null) => void
  onResolve?: (convoId: string) => void
  onReopen?: (convoId: string) => void
}

function ChannelBadge({ channel }: { channel: string }) {
  const config: Record<string, { icon: typeof Mail; label: string; color: string }> = {
    email:     { icon: Mail,         label: 'Email',     color: 'var(--accent)' },
    sms:       { icon: MessageSquare,label: 'SMS',       color: 'var(--green)' },
    note:      { icon: StickyNote,   label: 'Note',      color: 'var(--amber)' },
    call:      { icon: Phone,        label: 'Call',      color: 'var(--cyan)' },
    voicemail: { icon: Mic,          label: 'Voicemail', color: 'var(--purple)' },
  }
  const c = config[channel] || config.email
  const Icon = c.icon
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 10,
        fontWeight: 600,
        color: c.color,
        padding: '1px 6px',
        borderRadius: 4,
        background: `${c.color}15`,
      }}
    >
      <Icon size={10} />
      {c.label}
    </span>
  )
}

function ReadReceipt({ message }: { message: ConversationMessage }) {
  if (message.channel !== 'email' || message.direction !== 'outbound') return null
  if (!message.opened_at && !message.clicked_at) {
    if (message.status === 'delivered') {
      return (
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>Delivered</span>
      )
    }
    if (message.status === 'sent') {
      return <span style={{ fontSize: 10, color: 'var(--text3)' }}>Sent</span>
    }
    if (message.status === 'bounced') {
      return (
        <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 600 }}>
          Bounced
        </span>
      )
    }
    return null
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      {message.open_count > 0 && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 10,
            color: 'var(--green)',
            fontWeight: 600,
          }}
        >
          <Eye size={10} />
          Opened {message.open_count}x
          {message.opened_at && (
            <span style={{ color: 'var(--text3)', fontWeight: 400 }}>
              &middot; Last {formatFullDate(message.opened_at)}
            </span>
          )}
        </span>
      )}
      {message.clicked_at && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 10,
            color: 'var(--cyan)',
            fontWeight: 600,
          }}
        >
          <MousePointer size={10} />
          Clicked link
        </span>
      )}
    </div>
  )
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const [expanded, setExpanded] = useState(false)
  const isOutbound = message.direction === 'outbound'
  const isNote = message.channel === 'note' || message.direction === 'internal'

  const bgColor = isNote
    ? 'rgba(245,158,11,0.08)'
    : isOutbound
      ? 'rgba(79,127,255,0.1)'
      : 'var(--surface2)'

  const align = isNote ? 'center' : isOutbound ? 'flex-end' : 'flex-start'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: align,
        padding: '4px 18px',
      }}
    >
      <div
        style={{
          maxWidth: message.channel === 'email' ? '90%' : '75%',
          minWidth: 180,
          background: bgColor,
          borderRadius: isNote
            ? 10
            : isOutbound
              ? '12px 12px 4px 12px'
              : '12px 12px 12px 4px',
          padding: message.channel === 'email' ? '12px 14px' : '8px 12px',
          border: isNote ? '1px dashed var(--amber)' : 'none',
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4,
          }}
        >
          <ChannelBadge channel={message.channel} />
          <span
            style={{
              fontSize: 10,
              color: 'var(--text3)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {relativeTime(message.created_at)}
          </span>
          {message.sent_by_name && (
            <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600 }}>
              {message.sent_by_name}
            </span>
          )}
        </div>

        {/* Email subject */}
        {message.channel === 'email' && message.subject && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text1)',
              marginBottom: 6,
            }}
          >
            {message.subject}
          </div>
        )}

        {/* Body */}
        {message.channel === 'email' && message.body_html ? (
          <div>
            {/* Rich editor HTML (not full template) — render directly */}
            {/* Legacy messages that stored full branded template → show plain text */}
            {message.body_html.startsWith('<!DOCTYPE') || message.body_html.startsWith('<html') ? (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text1)',
                  lineHeight: 1.5,
                  maxHeight: expanded ? 'none' : 160,
                  overflow: 'hidden',
                }}
              >
                {message.body || message.body_html.replace(/<[^>]*>/g, '').slice(0, 500)}
              </div>
            ) : (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text1)',
                  lineHeight: 1.5,
                  maxHeight: expanded ? 'none' : 160,
                  overflow: 'hidden',
                }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.body_html || '') }}
              />
            )}
            {!expanded && (message.body || '').length > 200 && (
              <div
                style={{
                  height: 40,
                  background:
                    'linear-gradient(transparent, ' +
                    (isOutbound ? 'rgba(79,127,255,0.1)' : 'var(--surface2)') +
                    ')',
                  marginTop: -40,
                  pointerEvents: 'none',
                }}
              />
            )}
            {(message.body || '').length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 0 0',
                  fontWeight: 600,
                }}
              >
                {expanded ? (
                  <>
                    <ChevronUp size={12} /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown size={12} /> Show more
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              fontSize: 13,
              color: isNote ? 'var(--amber)' : 'var(--text1)',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}
          >
            {message.body}
          </div>
        )}

        {/* MMS images */}
        {message.media_urls && message.media_urls.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {message.media_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img
                  src={url}
                  alt={`MMS photo ${i + 1}`}
                  style={{
                    width: 140,
                    height: 140,
                    objectFit: 'cover',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    display: 'block',
                  }}
                />
              </a>
            ))}
          </div>
        )}

        {/* Call duration */}
        {message.channel === 'call' && message.call_duration_seconds != null && (
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            Duration: {Math.floor(message.call_duration_seconds / 60)}:{String(message.call_duration_seconds % 60).padStart(2, '0')}
            {message.call_recording_url && (
              <a
                href={message.call_recording_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginLeft: 8, color: 'var(--cyan)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}
              >
                <Play size={10} /> Recording
              </a>
            )}
          </div>
        )}

        {/* Voicemail */}
        {message.channel === 'voicemail' && (
          <div style={{ marginTop: 8 }}>
            {message.voicemail_url && (
              <audio controls style={{ width: '100%', height: 32 }}>
                <source src={message.voicemail_url} />
              </audio>
            )}
            {message.voicemail_transcription && (
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6, fontStyle: 'italic', borderLeft: '2px solid var(--purple)', paddingLeft: 8 }}>
                "{message.voicemail_transcription}"
              </div>
            )}
          </div>
        )}

        {/* Read receipt */}
        <ReadReceipt message={message} />
      </div>
    </div>
  )
}

export function MessageThread({
  conversation,
  messages,
  profile,
  templates,
  smsTemplates = [],
  teammates = [],
  loading,
  onBack,
  onMessageSent,
  onToggleContact,
  contactVisible,
  onAssign,
  onResolve,
  onReopen,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showAssign, setShowAssign] = useState(false)
  const [calling, setCalling] = useState(false)
  const phone = usePhone()

  const contactPhone = conversation.contact_phone
  const normalizedContact = contactPhone?.replace(/\D/g, '')
  const normalizedActive = phone?.activeNumber?.replace(/\D/g, '')
  const isCallToThisContact = !!normalizedContact && !!normalizedActive &&
    (normalizedActive.endsWith(normalizedContact) || normalizedContact.endsWith(normalizedActive))
  const isInCallWithContact = phone?.callState === 'in-call' && isCallToThisContact
  const callBusy = !!phone && phone.callState !== 'idle' && !isCallToThisContact

  const handleCall = async () => {
    if (!phone || !contactPhone) return
    if (isInCallWithContact) {
      phone.hangUp()
      return
    }
    setCalling(true)
    try {
      await phone.makeCall(contactPhone, conversation.contact_name || contactPhone)
    } finally {
      setCalling(false)
    }
  }

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Compute reply subject from last email in thread
  const replySubject = (() => {
    const emailMsgs = messages.filter(m => m.channel === 'email' && m.subject)
    if (emailMsgs.length === 0) return undefined
    const s = emailMsgs[emailMsgs.length - 1].subject || ''
    return s.toLowerCase().startsWith('re:') ? s : `Re: ${s}`
  })()

  const handleSend = async (data: {
    channel: 'email' | 'sms' | 'note'
    subject?: string
    body: string
    body_html?: string
    photos?: PhotoSelection[]
    cc?: string[]
    bcc?: string[]
    to_email?: string
    to_phone?: string
    contact_name?: string
  }) => {
    const res = await fetch('/api/inbox/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversation.id,
        channel: data.channel,
        to_email: data.to_email || conversation.contact_email,
        to_phone: data.to_phone || conversation.contact_phone,
        subject: data.subject,
        body: data.body,
        body_html: data.body_html,
        photos: data.photos || [],
        cc: data.cc,
        bcc: data.bcc,
        contact_name: data.contact_name || conversation.contact_name,
      }),
    })
    if (res.ok) {
      onMessageSent(conversation.id)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Thread header */}
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
          background: 'var(--surface)',
        }}
      >
        {/* Back button (mobile) */}
        <button
          onClick={onBack}
          className="md:hidden"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text2)',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ArrowLeft size={18} />
        </button>

        {/* Contact info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--text1)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {conversation.contact_name || 'Unknown'}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 12,
              color: 'var(--text3)',
              marginTop: 1,
            }}
          >
            {conversation.contact_email && (
              <span>{conversation.contact_email}</span>
            )}
            {conversation.contact_phone && (
              <span>{conversation.contact_phone}</span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Resolve / Reopen */}
          {conversation.status === 'resolved' ? (
            <button
              onClick={() => onReopen?.(conversation.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'transparent', cursor: 'pointer',
                fontSize: 11, fontWeight: 600, color: 'var(--text2)',
              }}
              title="Reopen conversation"
            >
              <RotateCcw size={13} />
              Reopen
            </button>
          ) : (
            <button
              onClick={() => onResolve?.(conversation.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(34,192,122,0.4)',
                background: 'rgba(34,192,122,0.08)', cursor: 'pointer',
                fontSize: 11, fontWeight: 600, color: 'var(--green)',
              }}
              title="Mark as resolved"
            >
              <CheckCircle size={13} />
              Resolve
            </button>
          )}

          {/* Assign dropdown */}
          {teammates.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowAssign(!showAssign)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)',
                  background: 'transparent', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, color: conversation.assigned_to ? 'var(--accent)' : 'var(--text3)',
                }}
                title="Assign conversation"
              >
                <UserCheck size={13} />
                {conversation.assigned_to
                  ? (teammates.find(t => t.id === conversation.assigned_to)?.name || 'Assigned')
                  : 'Assign'}
              </button>
              {showAssign && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 8, minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  zIndex: 20, overflow: 'hidden',
                }}>
                  <button
                    onClick={() => { onAssign?.(conversation.id, null); setShowAssign(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 12px', fontSize: 12, color: 'var(--text3)',
                      background: 'none', border: 'none', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    Unassigned
                  </button>
                  {teammates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { onAssign?.(conversation.id, t.id); setShowAssign(false) }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '8px 12px', fontSize: 12,
                        color: conversation.assigned_to === t.id ? 'var(--accent)' : 'var(--text1)',
                        fontWeight: conversation.assigned_to === t.id ? 700 : 400,
                        background: conversation.assigned_to === t.id ? 'rgba(79,127,255,0.08)' : 'none',
                        border: 'none', borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => { if (conversation.assigned_to !== t.id) e.currentTarget.style.background = 'var(--surface2)' }}
                      onMouseLeave={e => { if (conversation.assigned_to !== t.id) e.currentTarget.style.background = 'none' }}
                    >
                      <div>{t.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'capitalize' }}>{t.role.replace('_', ' ')}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Click-to-call */}
          {contactPhone && phone && (
            <button
              onClick={handleCall}
              disabled={callBusy || calling}
              title={
                isInCallWithContact ? 'End call' :
                callBusy ? 'Already in a call' :
                `Call ${conversation.contact_name || contactPhone}`
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 6,
                border: isInCallWithContact
                  ? '1px solid rgba(242,90,90,0.4)'
                  : '1px solid rgba(34,192,122,0.4)',
                background: isInCallWithContact
                  ? 'rgba(242,90,90,0.1)'
                  : calling
                    ? 'rgba(34,192,122,0.05)'
                    : 'rgba(34,192,122,0.08)',
                cursor: callBusy || calling ? 'not-allowed' : 'pointer',
                fontSize: 11,
                fontWeight: 600,
                color: isInCallWithContact ? 'var(--red)' : 'var(--green)',
                opacity: callBusy ? 0.4 : 1,
                transition: 'all 0.15s',
              }}
            >
              {isInCallWithContact ? (
                <>
                  <PhoneOff size={13} />
                  End call
                </>
              ) : calling ? (
                <>
                  <Phone size={13} style={{ animation: 'pulse 1s infinite' }} />
                  Calling…
                </>
              ) : (
                <>
                  <Phone size={13} />
                  Call
                </>
              )}
            </button>
          )}

          {/* In-call live indicator */}
          {isInCallWithContact && phone && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--green)',
                fontFamily: 'JetBrains Mono, monospace',
                background: 'rgba(34,192,122,0.1)',
                padding: '3px 7px',
                borderRadius: 4,
              }}
            >
              {Math.floor(phone.duration / 60)}:{String(phone.duration % 60).padStart(2, '0')}
            </span>
          )}

          {/* Contact panel toggle */}
          <button
            onClick={onToggleContact}
            className="hidden lg:flex"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: contactVisible ? 'var(--accent)' : 'var(--text3)',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
            title={contactVisible ? 'Hide contact panel' : 'Show contact panel'}
          >
            {contactVisible ? (
              <PanelRightClose size={18} />
            ) : (
              <PanelRightOpen size={18} />
            )}
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 0',
          background: 'var(--bg)',
        }}
      >
        {loading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: '12px 18px',
            }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end',
                }}
              >
                <div
                  style={{
                    width: `${40 + Math.random() * 30}%`,
                    height: 60,
                    borderRadius: 12,
                    background: 'var(--surface2)',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text3)',
              fontSize: 13,
            }}
          >
            No messages yet. Start the conversation below.
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
      </div>

      {/* Compose area */}
      <ComposeArea
        conversation={conversation}
        profile={profile}
        templates={templates}
        smsTemplates={smsTemplates}
        replySubject={replySubject}
        onSend={handleSend}
      />
    </div>
  )
}
