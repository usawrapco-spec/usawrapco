'use client'

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
} from 'lucide-react'
import type { Profile } from '@/types'
import type { Conversation, ConversationMessage, EmailTemplate, PhotoSelection } from './types'
import { formatFullDate, relativeTime } from './types'
import { ComposeArea } from './ComposeArea'

interface Props {
  conversation: Conversation
  messages: ConversationMessage[]
  profile: Profile
  templates: EmailTemplate[]
  loading: boolean
  onBack: () => void
  onMessageSent: (convoId: string) => void
  onToggleContact: () => void
  contactVisible: boolean
}

function ChannelBadge({ channel }: { channel: string }) {
  const config: Record<string, { icon: typeof Mail; label: string; color: string }> = {
    email: { icon: Mail, label: 'Email', color: 'var(--accent)' },
    sms: { icon: MessageSquare, label: 'SMS', color: 'var(--green)' },
    note: { icon: StickyNote, label: 'Note', color: 'var(--amber)' },
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
            <div
              style={{
                fontSize: 13,
                color: 'var(--text1)',
                lineHeight: 1.5,
                maxHeight: expanded ? 'none' : 120,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Show plain text version for thread view */}
              {message.body || message.body_html.replace(/<[^>]*>/g, '').slice(0, 500)}
              {!expanded && (message.body || '').length > 200 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 40,
                    background:
                      'linear-gradient(transparent, ' +
                      (isOutbound ? 'rgba(79,127,255,0.1)' : 'var(--surface2)') +
                      ')',
                  }}
                />
              )}
            </div>
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
  loading,
  onBack,
  onMessageSent,
  onToggleContact,
  contactVisible,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (data: {
    channel: 'email' | 'sms' | 'note'
    subject?: string
    body: string
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
        onSend={handleSend}
      />
    </div>
  )
}
