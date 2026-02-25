'use client'

import { Search, Mail, MessageSquare, Plus, Star, Archive, Inbox, Send as SendIcon, CheckCircle, Phone, Mic } from 'lucide-react'
import type { Profile } from '@/types'
import type { Conversation, InboxLabel } from './types'
import { relativeTime, getInitials } from './types'

const LABELS: { key: InboxLabel; label: string; icon: typeof Inbox }[] = [
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'starred', label: 'Starred', icon: Star },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle },
  { key: 'archived', label: 'Archived', icon: Archive },
  { key: 'sent', label: 'Sent', icon: SendIcon },
]

const FILTERS: { key: InboxLabel; label: string }[] = [
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
  { key: 'calls', label: 'Calls' },
  { key: 'voicemail', label: 'Voicemail' },
  { key: 'unread', label: 'Unread' },
  { key: 'mine', label: 'Mine' },
]

interface Props {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNewConversation: () => void
  search: string
  onSearchChange: (v: string) => void
  filter: InboxLabel
  onFilterChange: (v: InboxLabel) => void
  loading: boolean
  profile: Profile
  onStar?: (id: string, starred: boolean) => void
  onArchive?: (id: string) => void
  counts?: { inbox: number; starred: number; resolved: number; unread: number }
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
  onStar,
  onArchive,
  counts,
}: Props) {
  const activeLabel = LABELS.find(l => l.key === filter) ? filter : 'inbox'
  const activeFilter = FILTERS.find(f => f.key === filter) ? filter : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header + Compose */}
      <div
        style={{
          padding: '14px 14px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          borderBottom: '1px solid var(--border)',
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
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            borderRadius: 8,
            background: 'var(--accent)',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          <Plus size={13} />
          Compose
        </button>
      </div>

      {/* Gmail-style label nav */}
      <div style={{ padding: '8px 0', flexShrink: 0 }}>
        {LABELS.map((l) => {
          const isActive = l.key === activeLabel && !activeFilter
          const Icon = l.icon
          const count =
            l.key === 'inbox'    ? counts?.inbox    :
            l.key === 'starred'  ? counts?.starred  :
            l.key === 'resolved' ? counts?.resolved :
            undefined
          return (
            <button
              key={l.key}
              onClick={() => onFilterChange(l.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 16px',
                width: '100%',
                textAlign: 'left',
                background: isActive ? 'rgba(79,127,255,0.12)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '0 20px 20px 0',
                marginRight: 8,
                color: isActive ? 'var(--accent)' : 'var(--text2)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'var(--surface2)'
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent'
              }}
            >
              <Icon size={15} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 700 : 500 }}>
                {l.label}
              </span>
              {count !== undefined && count > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isActive ? 'var(--accent)' : 'var(--text3)',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Channel / status filter chips */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '0 14px 8px',
          flexShrink: 0,
          overflowX: 'auto',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(activeFilter === f.key ? 'inbox' : f.key)}
            style={{
              padding: '3px 10px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: activeFilter === f.key ? 700 : 500,
              color: activeFilter === f.key ? '#fff' : 'var(--text2)',
              background: activeFilter === f.key ? 'var(--accent)' : 'transparent',
              border: activeFilter === f.key ? 'none' : '1px solid var(--border)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {f.label}
            {f.key === 'unread' && counts?.unread ? ` (${counts.unread})` : ''}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding: '8px 14px', flexShrink: 0 }}>
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

      {/* Conversation list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
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
            {activeLabel === 'starred'  ? 'No starred conversations' :
           activeLabel === 'resolved' ? 'No resolved conversations' :
           activeLabel === 'archived' ? 'No archived conversations' :
           activeLabel === 'sent'     ? 'No sent messages' :
           'No conversations yet'}
          </div>
        ) : (
          conversations.map((c) => {
            const isActive = c.id === selectedId
            const hasUnread = c.unread_count > 0
            const channelIcon =
              c.last_message_channel === 'sms'      ? <MessageSquare size={11} /> :
              c.last_message_channel === 'call'      ? <Phone size={11} /> :
              c.last_message_channel === 'voicemail' ? <Mic size={11} /> :
                                                       <Mail size={11} />

            return (
              <div
                key={c.id}
                style={{
                  position: 'relative',
                  background: isActive ? 'rgba(79,127,255,0.08)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'
                  const starBtn = e.currentTarget.querySelector<HTMLElement>('.star-btn')
                  if (starBtn) starBtn.style.opacity = '1'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  const starBtn = e.currentTarget.querySelector<HTMLElement>('.star-btn')
                  if (starBtn && !c.is_starred) starBtn.style.opacity = '0'
                }}
              >
                <button
                  onClick={() => onSelect(c.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '11px 14px 11px 10px',
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {/* Star */}
                  <button
                    className="star-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStar?.(c.id, !c.is_starred)
                    }}
                    title={c.is_starred ? 'Unstar' : 'Star'}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 2px 0',
                      color: c.is_starred ? 'var(--amber)' : 'var(--text3)',
                      opacity: c.is_starred ? 1 : 0,
                      transition: 'opacity 0.1s',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Star size={13} fill={c.is_starred ? 'var(--amber)' : 'none'} />
                  </button>

                  {/* Avatar */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: isActive
                        ? 'rgba(79,127,255,0.2)'
                        : 'rgba(79,127,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
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

                    {/* Role badge */}
                    {c.contact_role && (
                      <div style={{ marginTop: 1 }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: c.is_decision_maker ? 'var(--amber)' : 'var(--text3)',
                            background: c.is_decision_maker ? 'rgba(245,158,11,0.1)' : 'var(--surface2)',
                            padding: '1px 6px',
                            borderRadius: 4,
                          }}
                        >
                          {c.is_decision_maker ? '★ ' : ''}{c.contact_role}
                        </span>
                      </div>
                    )}

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
                  {hasUnread ? (
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
                  ) : c.status === 'resolved' ? (
                    <CheckCircle
                      size={13}
                      style={{ color: 'var(--green)', flexShrink: 0, marginTop: 4 }}
                    />
                  ) : null}
                </button>

                {/* Archive button (on hover) */}
                {onArchive && !c.is_archived && (
                  <button
                    className="star-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      onArchive(c.id)
                    }}
                    title="Archive"
                    style={{
                      position: 'absolute',
                      right: 10,
                      bottom: 10,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 3,
                      color: 'var(--text3)',
                      opacity: 0,
                      transition: 'opacity 0.1s',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Archive size={12} />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
