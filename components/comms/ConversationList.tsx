'use client'

import { Search, Mail, MessageSquare, Plus } from 'lucide-react'
import type { Profile } from '@/types'
import type { Conversation } from './types'
import { relativeTime, getInitials } from './types'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
  { key: 'unread', label: 'Unread' },
  { key: 'mine', label: 'Mine' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

interface Props {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNewConversation: () => void
  search: string
  onSearchChange: (v: string) => void
  filter: FilterKey
  onFilterChange: (v: FilterKey) => void
  loading: boolean
  profile: Profile
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewConversation,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  loading,
}: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header + New */}
      <div
        style={{
          padding: '14px 14px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 800,
            fontSize: 18,
            color: 'var(--text1)',
          }}
        >
          Inbox
        </span>
        <button
          onClick={onNewConversation}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'var(--accent)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={15} style={{ color: '#fff' }} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 14px', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg)',
            borderRadius: 8,
            padding: '7px 10px',
            border: '1px solid var(--border)',
          }}
        >
          <Search size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: 13,
              color: 'var(--text1)',
            }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          padding: '0 14px 8px',
          flexShrink: 0,
          overflowX: 'auto',
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: filter === f.key ? 700 : 500,
              color: filter === f.key ? '#fff' : 'var(--text2)',
              background: filter === f.key ? 'var(--accent)' : 'transparent',
              border: filter === f.key ? 'none' : '1px solid var(--border)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Conversation list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          // Skeleton loaders
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                padding: '12px 14px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'var(--surface2)',
                  flexShrink: 0,
                  animation: 'pulse 1.5s infinite',
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    width: '60%',
                    height: 12,
                    background: 'var(--surface2)',
                    borderRadius: 4,
                    marginBottom: 6,
                    animation: 'pulse 1.5s infinite',
                  }}
                />
                <div
                  style={{
                    width: '90%',
                    height: 10,
                    background: 'var(--surface2)',
                    borderRadius: 4,
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              </div>
            </div>
          ))
        ) : conversations.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: 'var(--text3)',
              fontSize: 13,
            }}
          >
            No conversations yet
          </div>
        ) : (
          conversations.map((c) => {
            const isActive = c.id === selectedId
            const hasUnread = c.unread_count > 0
            const channelIcon =
              c.last_message_channel === 'sms' ? (
                <MessageSquare size={12} />
              ) : (
                <Mail size={12} />
              )

            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '12px 14px',
                  width: '100%',
                  textAlign: 'left',
                  background: isActive ? 'rgba(79,127,255,0.08)' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--surface2)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: isActive
                      ? 'rgba(79,127,255,0.2)'
                      : 'rgba(79,127,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 800,
                    color: 'var(--accent)',
                    flexShrink: 0,
                    fontFamily: 'Barlow Condensed, sans-serif',
                  }}
                >
                  {getInitials(c.contact_name || '?')}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: hasUnread ? 700 : 500,
                        color: 'var(--text1)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.contact_name || c.contact_email || 'Unknown'}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--text3)',
                        whiteSpace: 'nowrap',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {relativeTime(c.last_message_at)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 2,
                    }}
                  >
                    <span style={{ color: 'var(--text3)', flexShrink: 0 }}>
                      {channelIcon}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: hasUnread ? 'var(--text1)' : 'var(--text3)',
                        fontWeight: hasUnread ? 600 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.last_message_preview || 'No messages'}
                    </span>
                  </div>
                </div>

                {/* Unread badge */}
                {hasUnread && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      flexShrink: 0,
                      marginTop: 6,
                    }}
                  />
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
