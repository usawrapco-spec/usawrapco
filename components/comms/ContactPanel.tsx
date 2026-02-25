'use client'

import { useState } from 'react'
import { X, Mail, Phone, ExternalLink, Eye, MousePointer, Crown, ChevronDown, User } from 'lucide-react'
import type { Conversation, ConversationMessage } from './types'
import { CONTACT_ROLES, formatFullDate } from './types'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Props {
  conversation: Conversation
  messages: ConversationMessage[]
  onClose: () => void
  onUpdate?: (updates: Partial<Conversation>) => void
}

export function ContactPanel({ conversation: c, messages, onClose, onUpdate }: Props) {
  const supabase = createClient()
  const emailMessages = messages.filter(
    (m) => m.channel === 'email' && m.direction === 'outbound'
  )

  const [editingRole, setEditingRole] = useState(false)
  const [savingRole, setSavingRole] = useState(false)

  const handleRoleChange = async (role: string | null) => {
    setSavingRole(true)
    setEditingRole(false)
    await supabase
      .from('conversations')
      .update({ contact_role: role })
      .eq('id', c.id)
    onUpdate?.({ contact_role: role })
    setSavingRole(false)
  }

  const handleDecisionMakerToggle = async () => {
    const next = !c.is_decision_maker
    await supabase
      .from('conversations')
      .update({ is_decision_maker: next })
      .eq('id', c.id)
    onUpdate?.({ is_decision_maker: next })
  }

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

        {/* ── Contact Role ─────────────────────────────────── */}
        <div
          style={{
            background: 'var(--bg)',
            borderRadius: 10,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text3)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 10,
            }}
          >
            Contact Role
          </div>

          {/* Role selector */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <button
              onClick={() => setEditingRole(!editingRole)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 10px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 7,
                cursor: 'pointer',
                color: c.contact_role ? 'var(--text1)' : 'var(--text3)',
                fontSize: 13,
              }}
            >
              <User size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: 'left' }}>
                {savingRole ? 'Saving...' : c.contact_role || 'Set role...'}
              </span>
              <ChevronDown size={12} style={{ color: 'var(--text3)' }} />
            </button>

            {editingRole && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  zIndex: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => handleRoleChange(null)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    fontSize: 12,
                    color: 'var(--text3)',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  (No role)
                </button>
                {CONTACT_ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleChange(role)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      fontSize: 12,
                      color: role === c.contact_role ? 'var(--accent)' : 'var(--text1)',
                      fontWeight: role === c.contact_role ? 700 : 400,
                      background: role === c.contact_role ? 'rgba(79,127,255,0.08)' : 'none',
                      border: 'none',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (role !== c.contact_role) e.currentTarget.style.background = 'var(--surface2)'
                    }}
                    onMouseLeave={(e) => {
                      if (role !== c.contact_role) e.currentTarget.style.background = 'none'
                    }}
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Decision Maker toggle */}
          <button
            onClick={handleDecisionMakerToggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '8px 10px',
              background: c.is_decision_maker ? 'rgba(245,158,11,0.1)' : 'var(--surface)',
              border: `1px solid ${c.is_decision_maker ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
              borderRadius: 7,
              cursor: 'pointer',
              color: c.is_decision_maker ? 'var(--amber)' : 'var(--text2)',
              fontSize: 13,
              fontWeight: c.is_decision_maker ? 700 : 500,
            }}
          >
            <Crown size={13} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: 'left' }}>Decision Maker</span>
            {/* Toggle indicator */}
            <div
              style={{
                width: 32,
                height: 16,
                borderRadius: 8,
                background: c.is_decision_maker ? 'var(--amber)' : 'var(--surface2)',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 2,
                  left: c.is_decision_maker ? 18 : 2,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                }}
              />
            </div>
          </button>
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

        {/* Linked customer */}
        {c.customer_id && (
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
              Customer Profile
            </div>
            <Link
              href={`/customers/${c.customer_id}`}
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
              View Customer
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
                  {/* CC info */}
                  {m.cc && m.cc.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>
                      CC: {m.cc.join(', ')}
                    </div>
                  )}
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
