'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare, Mail, Phone, Plus, Filter, RefreshCw,
  Search, ChevronRight, Circle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ConversationThread, { CommMessage } from './ConversationThread'
import ComposeModal from './ComposeModal'
import type { Profile } from '@/types'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Conversation {
  customer_id: string | null
  customer_name: string
  customer_phone?: string
  customer_email?: string
  last_message: string
  last_channel: 'sms' | 'call' | 'email'
  last_at: string
  unread_count: number
  messages: CommMessage[]
}

type ChannelFilter = 'all' | 'sms' | 'call' | 'email'

const CHANNEL_ICON: Record<string, React.FC<any>> = {
  sms: MessageSquare,
  email: Mail,
  call: Phone,
}

const CHANNEL_COLOR: Record<string, string> = {
  sms: 'var(--green)',
  email: 'var(--accent)',
  call: 'var(--amber)',
}

function relTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CommsClient({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const router = useRouter()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // ─── Load conversations ───────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('communications')
        .select(`
          id, direction, channel, body, subject, status,
          call_duration_seconds, call_recording_url,
          to_number, from_number, to_email, from_email,
          sent_by, created_at, customer_id, project_id
        `)
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })
        .limit(500)

      if (channelFilter !== 'all') {
        query = query.eq('channel', channelFilter)
      }

      const { data: msgs, error } = await query

      if (error) {
        console.error('[CommsClient] load error:', error)
        setLoading(false)
        return
      }

      // Group by customer_id
      const convMap = new Map<string, Conversation>()

      for (const msg of (msgs || [])) {
        const key = msg.customer_id || `anon-${msg.from_number || msg.to_number || msg.from_email || msg.to_email || 'unknown'}`

        if (!convMap.has(key)) {
          convMap.set(key, {
            customer_id: msg.customer_id,
            customer_name: 'Unknown',
            last_message: msg.body || msg.subject || `${msg.channel} message`,
            last_channel: msg.channel,
            last_at: msg.created_at,
            unread_count: 0,
            messages: [],
          })
        }

        const conv = convMap.get(key)!

        // Add message in chronological order (we'll reverse later)
        conv.messages.push({
          id: msg.id,
          direction: msg.direction,
          channel: msg.channel,
          body: msg.body,
          subject: msg.subject,
          status: msg.status,
          call_duration_seconds: msg.call_duration_seconds,
          call_recording_url: msg.call_recording_url,
          sent_by: msg.sent_by,
          created_at: msg.created_at,
        })

        // Count unread inbound
        if (msg.direction === 'inbound' && msg.status === 'received') {
          conv.unread_count++
        }
      }

      // Load customer names
      const customerIds = [...convMap.keys()].filter(k => !k.startsWith('anon-'))
      if (customerIds.length > 0) {
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name, contact_name, email, phone')
          .in('id', customerIds)

        for (const c of (customers || [])) {
          const conv = convMap.get(c.id)
          if (conv) {
            conv.customer_name = c.contact_name || c.name || c.email || 'Customer'
            conv.customer_phone = c.phone
            conv.customer_email = c.email
          }
        }
      }

      // Sort each conversation's messages chronologically
      const convList = [...convMap.values()].map(c => ({
        ...c,
        messages: c.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      }))

      // Sort conversations by latest message
      convList.sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())

      setConversations(convList)

      // Update selected conv if open
      if (selectedConv) {
        const updated = convList.find(c => c.customer_id === selectedConv.customer_id)
        if (updated) setSelectedConv(updated)
      }
    } finally {
      setLoading(false)
    }
  }, [profile.org_id, channelFilter, refreshKey])

  useEffect(() => { loadConversations() }, [loadConversations])

  // ─── Realtime subscription ────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('comms-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'communications',
        filter: `org_id=eq.${profile.org_id}`,
      }, () => {
        setRefreshKey(k => k + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile.org_id])

  // ─── Quick reply ──────────────────────────────────────────────────────────────
  async function handleQuickReply() {
    if (!replyText.trim() || !selectedConv) return
    setReplying(true)
    try {
      const to = selectedConv.customer_phone || selectedConv.customer_email || ''
      const isEmail = to.includes('@')
      const endpoint = isEmail ? '/api/comms/email/send' : '/api/comms/sms/send'

      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          body: replyText,
          subject: isEmail ? 'Re: USA Wrap Co' : undefined,
          customer_id: selectedConv.customer_id,
        }),
      })

      setReplyText('')
      setRefreshKey(k => k + 1)
    } finally {
      setReplying(false)
    }
  }

  // ─── Filtered conversations ───────────────────────────────────────────────────
  const filtered = conversations.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.customer_name.toLowerCase().includes(q) ||
      c.last_message.toLowerCase().includes(q) ||
      c.customer_phone?.includes(q) ||
      c.customer_email?.toLowerCase().includes(q)
    )
  })

  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0)

  const FILTER_TABS: { key: ChannelFilter; label: string; icon: React.FC<any> }[] = [
    { key: 'all', label: 'All', icon: MessageSquare },
    { key: 'sms', label: 'SMS', icon: MessageSquare },
    { key: 'email', label: 'Email', icon: Mail },
    { key: 'call', label: 'Calls', icon: Phone },
  ]

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 100px)', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {/* ── Left panel: conversation list ──────────────────────────── */}
      <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', background: 'var(--surface)' }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 900, color: 'var(--text1)' }}>
                Inbox
              </span>
              {totalUnread > 0 && (
                <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                  {totalUnread}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setRefreshKey(k => k + 1)} className="btn-ghost btn-xs" title="Refresh">
                <RefreshCw size={13} />
              </button>
              <button onClick={() => setShowCompose(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={13} /> New
              </button>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search messages..."
              className="field"
              style={{ paddingLeft: 28, fontSize: 12, height: 32 }}
            />
          </div>
        </div>

        {/* Channel filter tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 8px' }}>
          {FILTER_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setChannelFilter(key)}
              style={{
                flex: 1, padding: '8px 4px', fontSize: 11, fontWeight: 700,
                background: 'none', border: 'none', cursor: 'pointer',
                color: channelFilter === key ? 'var(--accent)' : 'var(--text3)',
                borderBottom: `2px solid ${channelFilter === key ? 'var(--accent)' : 'transparent'}`,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 24, color: 'var(--text3)', fontSize: 13, textAlign: 'center' }}>
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--text3)', fontSize: 13, textAlign: 'center' }}>
              {search ? 'No results' : 'No messages yet'}
            </div>
          ) : (
            filtered.map((conv) => {
              const Icon = CHANNEL_ICON[conv.last_channel] || MessageSquare
              const isSelected = selectedConv?.customer_id === conv.customer_id
              return (
                <button
                  key={conv.customer_id || conv.customer_name}
                  onClick={() => setSelectedConv(conv)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%',
                    padding: '12px 14px', textAlign: 'left', border: 'none', cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: isSelected ? 'rgba(79,127,255,0.08)' : 'none',
                    borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface2)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'none' }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: `${CHANNEL_COLOR[conv.last_channel]}22`,
                    border: `1px solid ${CHANNEL_COLOR[conv.last_channel]}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 900, fontSize: 16, color: CHANNEL_COLOR[conv.last_channel] }}>
                      {conv.customer_name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                        {conv.customer_name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <Icon size={11} style={{ color: CHANNEL_COLOR[conv.last_channel] }} />
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{relTime(conv.last_at)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {conv.last_message.slice(0, 60)}{conv.last_message.length > 60 ? '...' : ''}
                      </span>
                      {conv.unread_count > 0 && (
                        <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right panel: conversation thread ──────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)', minWidth: 0 }}>
        {selectedConv ? (
          <>
            {/* Thread header */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>{selectedConv.customer_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', gap: 8 }}>
                  {selectedConv.customer_phone && <span>{selectedConv.customer_phone}</span>}
                  {selectedConv.customer_email && <span>{selectedConv.customer_email}</span>}
                </div>
              </div>
              {selectedConv.customer_id && (
                <button
                  onClick={() => router.push(`/customers/${selectedConv.customer_id}`)}
                  className="btn-ghost btn-sm"
                  style={{ fontSize: 12 }}
                >
                  View Customer <ChevronRight size={12} />
                </button>
              )}
            </div>

            {/* Messages */}
            <ConversationThread
              messages={selectedConv.messages}
              customerName={selectedConv.customer_name}
            />

            {/* Quick reply bar */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuickReply() } }}
                placeholder={`Reply via ${selectedConv.customer_phone ? 'SMS' : 'Email'} (Enter to send, Shift+Enter for new line)...`}
                rows={2}
                style={{
                  flex: 1, padding: '8px 12px',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text1)', fontSize: 13,
                  resize: 'none', outline: 'none', lineHeight: 1.5,
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  onClick={handleQuickReply}
                  disabled={replying || !replyText.trim()}
                  style={{
                    padding: '8px 14px', borderRadius: 8, border: 'none',
                    background: replyText.trim() ? 'var(--accent)' : 'var(--surface2)',
                    color: replyText.trim() ? '#fff' : 'var(--text3)',
                    cursor: replyText.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
                  }}
                >
                  {selectedConv.customer_phone ? <MessageSquare size={13} /> : <Mail size={13} />} {replying ? '...' : 'Send'}
                </button>
                <button onClick={() => setShowCompose(true)} className="btn-ghost btn-xs" style={{ fontSize: 11, textAlign: 'center' }}>
                  + Email
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text3)' }}>
            <MessageSquare size={48} style={{ opacity: 0.2 }} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>Select a conversation</div>
            <div style={{ fontSize: 13 }}>or</div>
            <button onClick={() => setShowCompose(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={14} /> Start New Message
            </button>
          </div>
        )}
      </div>

      {/* Compose modal */}
      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onSent={() => setRefreshKey(k => k + 1)}
          defaultCustomerId={selectedConv?.customer_id || undefined}
        />
      )}
    </div>
  )
}
