'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import type { Conversation, ConversationMessage, EmailTemplate, PhotoSelection } from './types'
import { ConversationList } from './ConversationList'
import { MessageThread } from './MessageThread'
import { ContactPanel } from './ContactPanel'
import { ComposeArea } from './ComposeArea'

interface Props {
  profile: Profile
  initialConversationId?: string
}

export default function CommHubClient({ profile, initialConversationId }: Props) {
  const supabase = createClient()
  const orgId = profile.org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId || null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'email' | 'sms' | 'unread' | 'mine'>('all')
  const [showContact, setShowContact] = useState(true)
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list')
  const [composingNew, setComposingNew] = useState(false)
  const [newTo, setNewTo] = useState('')
  const [newName, setNewName] = useState('')

  const selectedConvo = conversations.find((c) => c.id === selectedId) || null

  // ── Fetch conversations ───────────────────────────────────
  const fetchConversations = useCallback(async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('org_id', orgId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(200)
    if (data) setConversations(data)
    setLoading(false)
  }, [supabase, orgId])

  // ── Fetch messages ────────────────────────────────────────
  const fetchMessages = useCallback(
    async (convoId: string) => {
      setMessagesLoading(true)
      const { data } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', convoId)
        .order('created_at', { ascending: true })
      if (data) setMessages(data)
      setMessagesLoading(false)
      // Mark as read
      await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', convoId)
    },
    [supabase]
  )

  // ── Fetch templates ───────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('email_templates')
      .select('*')
      .eq('org_id', orgId)
    if (data) setTemplates(data)
  }, [supabase, orgId])

  // ── Init ──────────────────────────────────────────────────
  useEffect(() => {
    fetchConversations()
    fetchTemplates()
  }, [fetchConversations, fetchTemplates])

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId)
      setComposingNew(false)
    } else {
      setMessages([])
    }
  }, [selectedId, fetchMessages])

  // ── Realtime subscriptions ────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('comm-hub-' + orgId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          fetchConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
        },
        (payload) => {
          const newMsg = payload.new as ConversationMessage
          if (newMsg.conversation_id === selectedId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }
          fetchConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_messages',
        },
        (payload) => {
          const updated = payload.new as ConversationMessage
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, orgId, selectedId, fetchConversations])

  // ── Handlers ──────────────────────────────────────────────
  const handleSelectConversation = (id: string) => {
    setSelectedId(id)
    setMobileView('thread')
    setComposingNew(false)
  }

  const handleBack = () => {
    setMobileView('list')
  }

  const handleMessageSent = (convoId: string) => {
    if (convoId) {
      setSelectedId(convoId)
      fetchMessages(convoId)
    }
    fetchConversations()
    if (composingNew) {
      setComposingNew(false)
      setNewTo('')
      setNewName('')
    }
  }

  const handleNewConversation = () => {
    setSelectedId(null)
    setComposingNew(true)
    setMobileView('thread')
    setNewTo('')
    setNewName('')
  }

  const handleNewSend = async (data: {
    channel: 'email' | 'sms' | 'note'
    subject?: string
    body: string
    photos?: PhotoSelection[]
    to_email?: string
    to_phone?: string
    contact_name?: string
  }) => {
    const res = await fetch('/api/inbox/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: data.channel,
        to_email: data.to_email || newTo,
        to_phone: data.to_phone || (data.channel === 'sms' ? newTo : undefined),
        subject: data.subject,
        body: data.body,
        photos: data.photos || [],
        contact_name: data.contact_name || newName || newTo,
      }),
    })
    if (res.ok) {
      const result = await res.json()
      handleMessageSent(result.conversation_id)
    }
  }

  // ── Filter conversations ──────────────────────────────────
  const filtered = conversations.filter((c) => {
    if (search) {
      const q = search.toLowerCase()
      if (
        !c.contact_name?.toLowerCase().includes(q) &&
        !c.contact_email?.toLowerCase().includes(q) &&
        !c.last_message_preview?.toLowerCase().includes(q)
      )
        return false
    }
    if (filter === 'email' && c.last_message_channel !== 'email') return false
    if (filter === 'sms' && c.last_message_channel !== 'sms') return false
    if (filter === 'unread' && c.unread_count <= 0) return false
    if (filter === 'mine' && c.assigned_to !== profile.id) return false
    return true
  })

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Column 1: Conversation List ─────────────────────── */}
      <div
        style={{
          width: 280,
          minWidth: 280,
          maxWidth: 280,
          borderRight: '1px solid var(--border)',
          display: mobileView === 'list' ? 'flex' : undefined,
          flexDirection: 'column',
          background: 'var(--surface)',
          flexShrink: 0,
        }}
        className={mobileView === 'list' ? '' : 'hidden md:flex'}
      >
        <ConversationList
          conversations={filtered}
          selectedId={selectedId}
          onSelect={handleSelectConversation}
          onNewConversation={handleNewConversation}
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
          loading={loading}
          profile={profile}
        />
      </div>

      {/* ── Column 2: Thread / New Compose ──────────────────── */}
      <div
        style={{
          flex: 1,
          display: mobileView === 'thread' ? 'flex' : undefined,
          flexDirection: 'column',
          minWidth: 0,
        }}
        className={mobileView === 'thread' ? '' : 'hidden md:flex'}
      >
        {composingNew ? (
          /* New conversation compose */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
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
              <button
                onClick={handleBack}
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <span
                style={{
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontWeight: 800,
                  fontSize: 16,
                  color: 'var(--text1)',
                }}
              >
                New Message
              </span>
            </div>

            {/* Empty space */}
            <div
              style={{
                flex: 1,
                background: 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text3)',
                fontSize: 13,
              }}
            >
              Fill in the recipient and compose your message below
            </div>

            {/* Compose */}
            <ComposeArea
              conversation={null}
              profile={profile}
              templates={templates}
              onSend={handleNewSend}
              composingNew
              newTo={newTo}
              onNewToChange={setNewTo}
              newName={newName}
              onNewNameChange={setNewName}
            />
          </div>
        ) : selectedConvo ? (
          <MessageThread
            conversation={selectedConvo}
            messages={messages}
            profile={profile}
            templates={templates}
            loading={messagesLoading}
            onBack={handleBack}
            onMessageSent={handleMessageSent}
            onToggleContact={() => setShowContact(!showContact)}
            contactVisible={showContact}
          />
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              color: 'var(--text3)',
              background: 'var(--bg)',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text3)', opacity: 0.4 }}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
            </svg>
            <span style={{ fontSize: 14 }}>
              Select a conversation or start a new one
            </span>
          </div>
        )}
      </div>

      {/* ── Column 3: Contact Panel ─────────────────────────── */}
      {showContact && selectedConvo && (
        <div
          className="hidden lg:flex"
          style={{
            width: 320,
            minWidth: 320,
            maxWidth: 320,
            borderLeft: '1px solid var(--border)',
            flexDirection: 'column',
            background: 'var(--surface)',
            flexShrink: 0,
          }}
        >
          <ContactPanel
            conversation={selectedConvo}
            messages={messages}
            onClose={() => setShowContact(false)}
          />
        </div>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
