'use client'

import { X, Mail, Phone, ExternalLink, Eye, MousePointer } from 'lucide-react'
import type { Conversation, ConversationMessage } from './types'
import { formatFullDate } from './types'
import Link from 'next/link'

interface Props {
  conversation: Conversation
  messages: ConversationMessage[]
  onClose: () => void
}

export function ContactPanel({ conversation: c, messages, onClose }: Props) {
  const emailMessages = messages.filter(
    (m) => m.channel === 'email' && m.direction === 'outbound'
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 700,
            fontSize: 14,
            color: 'var(--text1)',
          }}
        >
          Contact Info
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text3)',
            padding: 4,
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {/* Contact card */}
        <div
          style={{
            background: 'var(--bg)',
            borderRadius: 10,
            padding: 16,
            marginBottom: 16,
          }}
        >
          {/* Avatar */}
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(79,127,255,0.12)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 800,
                color: 'var(--accent)',
                fontFamily: 'Barlow Condensed, sans-serif',
              }}
            >
              {(c.contact_name || '?').charAt(0).toUpperCase()}
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text1)',
                marginTop: 8,
              }}
            >
              {c.contact_name || 'Unknown'}
            </div>
          </div>

          {/* Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {c.contact_email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail
                  size={13}
                  style={{ color: 'var(--text3)', flexShrink: 0 }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--accent)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.contact_email}
                </span>
              </div>
            )}
            {c.contact_phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone
                  size={13}
                  style={{ color: 'var(--text3)', flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {c.contact_phone}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Linked project */}
        {c.project_id && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text3)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 8,
              }}
            >
              Linked Project
            </div>
            <Link
              href={`/projects/${c.project_id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                background: 'var(--bg)',
                borderRadius: 8,
                textDecoration: 'none',
                color: 'var(--accent)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <ExternalLink size={13} />
              View Project
            </Link>
          </div>
        )}

        {/* Tags */}
        {c.tags && c.tags.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text3)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 8,
              }}
            >
              Tags
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {c.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    background: 'rgba(79,127,255,0.1)',
                    color: 'var(--accent)',
                    fontWeight: 600,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Email history */}
        {emailMessages.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text3)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 8,
              }}
            >
              Sent Emails ({emailMessages.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {emailMessages.slice(0, 10).map((m) => (
                <div
                  key={m.id}
                  style={{
                    padding: '8px 10px',
                    background: 'var(--bg)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: 'var(--text1)',
                      marginBottom: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.subject || '(no subject)'}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      color: 'var(--text3)',
                      fontSize: 11,
                    }}
                  >
                    <span>{formatFullDate(m.created_at)}</span>
                    {m.open_count > 0 && (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          color: 'var(--green)',
                        }}
                      >
                        <Eye size={10} />
                        {m.open_count}x
                      </span>
                    )}
                    {m.clicked_at && (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          color: 'var(--cyan)',
                        }}
                      >
                        <MousePointer size={10} />
                        clicked
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
