'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  MessageCircle, Mail, Bot, Users, Search, Send, Paperclip,
  Smile, Sparkles, Phone, Globe, Tag, Briefcase, Plus,
  Clock, Check, CheckCheck, Filter, ChevronDown, Star,
  User, FileText, ClipboardList, StickyNote, ExternalLink,
  Hash, Loader2, MessageSquare, ArrowLeft
} from 'lucide-react'

type Channel = 'all' | 'unread' | 'sms' | 'email' | 'vinyl_chat' | 'internal'

interface Communication {
  id: string
  channel: 'sms' | 'email' | 'vinyl_chat' | 'internal' | 'portal'
  direction: 'inbound' | 'outbound'
  customer_id: string | null
  job_id: string | null
  from_address: string | null
  to_address: string | null
  subject: string | null
  body: string
  status: string
  read_at: string | null
  sent_by: string | null
  created_at: string
  customer?: { id: string; name: string; email?: string; phone?: string }
}

interface ConversationThread {
  customer_id: string
  customer_name: string
  last_message: string
  last_channel: string
  last_time: string
  unread: number
  messages: Communication[]
}

const CHANNEL_FILTERS: { id: Channel; label: string; icon: any; color: string }[] = [
  { id: 'all', label: 'All', icon: MessageSquare, color: 'var(--text2)' },
  { id: 'unread', label: 'Unread', icon: Star, color: 'var(--amber)' },
  { id: 'sms', label: 'SMS', icon: MessageCircle, color: 'var(--green)' },
  { id: 'email', label: 'Email', icon: Mail, color: 'var(--accent)' },
  { id: 'vinyl_chat', label: 'V.I.N.Y.L.', icon: Bot, color: 'var(--purple)' },
  { id: 'internal', label: 'Internal', icon: Hash, color: 'var(--cyan)' },
]

const CHANNEL_STYLES: Record<string, { bg: string; color: string; icon: any }> = {
  sms: { bg: 'rgba(34,192,122,0.15)', color: '#22c07a', icon: MessageCircle },
  email: { bg: 'rgba(79,127,255,0.1)', color: '#4f7fff', icon: Mail },
  vinyl_chat: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', icon: Bot },
  internal: { bg: 'rgba(34,211,238,0.15)', color: '#22d3ee', icon: Hash },
  portal: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', icon: Globe },
}

export default function CommunicationsPage() {
  const [threads, setThreads] = useState<ConversationThread[]>([])
  const [activeThread, setActiveThread] = useState<ConversationThread | null>(null)
  const [messages, setMessages] = useState<Communication[]>([])
  const [filter, setFilter] = useState<Channel>('all')
  const [search, setSearch] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [replyChannel, setReplyChannel] = useState<'sms' | 'email' | 'internal'>('sms')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showMobileThread, setShowMobileThread] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadCommunications()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadCommunications = async () => {
    try {
      const { data } = await supabase
        .from('communications')
        .select('*, customer:customers(id, name, email, phone)')
        .order('created_at', { ascending: false })
        .limit(200)

      if (data) {
        // Group by customer
        const grouped: Record<string, ConversationThread> = {}
        data.forEach((msg: any) => {
          const key = msg.customer_id || msg.from_address || 'unknown'
          if (!grouped[key]) {
            grouped[key] = {
              customer_id: msg.customer_id || '',
              customer_name: msg.customer?.name || msg.from_address || 'Unknown',
              last_message: msg.body || msg.subject || '',
              last_channel: msg.channel,
              last_time: msg.created_at,
              unread: 0,
              messages: [],
            }
          }
          grouped[key].messages.push(msg)
          if (!msg.read_at && msg.direction === 'inbound') {
            grouped[key].unread++
          }
        })
        setThreads(Object.values(grouped))
      }
    } catch {}
    setLoading(false)
  }

  const selectThread = (thread: ConversationThread) => {
    setActiveThread(thread)
    setMessages(thread.messages.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ))
    setShowMobileThread(true)

    // Mark as read
    const unreadIds = thread.messages.filter(m => !m.read_at && m.direction === 'inbound').map(m => m.id)
    if (unreadIds.length) {
      supabase.from('communications').update({ read_at: new Date().toISOString() }).in('id', unreadIds)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeThread || sending) return
    setSending(true)

    try {
      const { data } = await supabase.from('communications').insert({
        channel: replyChannel,
        direction: 'outbound',
        customer_id: activeThread.customer_id || null,
        body: newMessage.trim(),
        status: 'sent',
      }).select().single()

      if (data) {
        setMessages(prev => [...prev, data])
        setNewMessage('')
      }
    } catch {}
    setSending(false)
  }

  const filteredThreads = threads.filter(t => {
    if (filter === 'unread') return t.unread > 0
    if (filter !== 'all') return t.last_channel === filter
    return true
  }).filter(t => {
    if (!search) return true
    return t.customer_name.toLowerCase().includes(search.toLowerCase()) ||
           t.last_message.toLowerCase().includes(search.toLowerCase())
  })

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'Now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', background: 'var(--bg)' }}>
      {/* Left Panel - Conversation List */}
      <div
        className={showMobileThread ? 'max-md:hidden' : ''}
        style={{
          width: 320,
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{
              fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 20,
              color: 'var(--text1)', margin: 0,
            }}>Messages</h2>
            <button className="btn-primary btn-xs"><Plus size={12} /> New</button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text3)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="field"
              style={{ paddingLeft: 32 }}
            />
          </div>

          {/* Channel Filters */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
            {CHANNEL_FILTERS.map(ch => (
              <button
                key={ch.id}
                onClick={() => setFilter(ch.id)}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: `1px solid ${filter === ch.id ? ch.color : 'var(--border)'}`,
                  background: filter === ch.id ? `${ch.color}15` : 'transparent',
                  color: filter === ch.id ? ch.color : 'var(--text3)',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <ch.icon size={11} />
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {/* Thread List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
              <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 12 }}>Loading conversations...</div>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
              <MessageSquare size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div style={{ fontSize: 13 }}>No conversations yet</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Messages will appear here when customers reach out</div>
            </div>
          ) : (
            filteredThreads.map((thread, i) => {
              const channelStyle = CHANNEL_STYLES[thread.last_channel]
              const isActive = activeThread?.customer_id === thread.customer_id
              return (
                <div
                  key={i}
                  onClick={() => selectThread(thread)}
                  style={{
                    padding: '12px 14px', cursor: 'pointer',
                    background: isActive ? 'var(--surface2)' : 'transparent',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', gap: 10,
                    transition: 'background 0.1s',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: channelStyle?.bg || 'var(--surface2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {channelStyle?.icon && <channelStyle.icon size={16} style={{ color: channelStyle.color }} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 13, fontWeight: thread.unread > 0 ? 800 : 600,
                        color: 'var(--text1)',
                      }}>{thread.customer_name}</span>
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>{formatTime(thread.last_time)}</span>
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: thread.unread > 0 ? 'var(--text1)' : 'var(--text3)',
                      fontWeight: thread.unread > 0 ? 600 : 400,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      marginTop: 2,
                    }}>
                      {thread.last_message}
                    </div>
                  </div>

                  {/* Unread Badge */}
                  {thread.unread > 0 && (
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--accent)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 800, alignSelf: 'center',
                    }}>{thread.unread}</div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Center Panel - Message Thread */}
      <div
        className={!showMobileThread ? 'max-md:hidden' : ''}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}
      >
        {!activeThread ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', color: 'var(--text3)',
          }}>
            <MessageSquare size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>Select a conversation</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Choose from the list on the left</div>
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)',
            }}>
              <button
                className="md:hidden"
                onClick={() => setShowMobileThread(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}
              >
                <ArrowLeft size={20} />
              </button>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--surface2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User size={16} color="var(--text3)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                  {activeThread.customer_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {activeThread.messages.length} messages
                </div>
              </div>
              <button className="btn-ghost btn-xs"><Phone size={12} /> Call</button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {messages.map(msg => {
                const channelStyle = CHANNEL_STYLES[msg.channel]
                const isOutbound = msg.direction === 'outbound'
                return (
                  <div key={msg.id} style={{
                    display: 'flex', justifyContent: isOutbound ? 'flex-end' : 'flex-start',
                    marginBottom: 12,
                  }}>
                    <div style={{ maxWidth: '70%' }}>
                      {/* Channel Badge */}
                      <div style={{
                        fontSize: 10, color: channelStyle?.color || 'var(--text3)',
                        marginBottom: 4,
                        textAlign: isOutbound ? 'right' : 'left',
                        display: 'flex', alignItems: 'center', gap: 4,
                        justifyContent: isOutbound ? 'flex-end' : 'flex-start',
                      }}>
                        {channelStyle?.icon && <channelStyle.icon size={10} />}
                        {msg.channel.toUpperCase()}
                      </div>

                      {/* Message Bubble */}
                      <div style={{
                        padding: msg.channel === 'email' ? '12px 16px' : '10px 14px',
                        borderRadius: isOutbound ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: msg.channel === 'sms'
                          ? (isOutbound ? 'var(--accent)' : 'rgba(34,192,122,0.15)')
                          : msg.channel === 'email'
                          ? 'var(--surface)'
                          : msg.channel === 'vinyl_chat'
                          ? (isOutbound ? 'var(--accent)' : 'rgba(139,92,246,0.15)')
                          : 'rgba(34,211,238,0.15)',
                        border: msg.channel === 'email' ? '1px solid var(--border)' : 'none',
                        color: isOutbound && msg.channel !== 'email' ? '#fff' : 'var(--text1)',
                      }}>
                        {msg.subject && (
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{msg.subject}</div>
                        )}
                        <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.body}</div>
                      </div>

                      {/* Timestamp */}
                      <div style={{
                        fontSize: 10, color: 'var(--text3)', marginTop: 4,
                        textAlign: isOutbound ? 'right' : 'left',
                        display: 'flex', alignItems: 'center', gap: 4,
                        justifyContent: isOutbound ? 'flex-end' : 'flex-start',
                      }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        {isOutbound && (
                          msg.status === 'delivered' ? <CheckCheck size={12} color="var(--green)" /> :
                          msg.status === 'sent' ? <Check size={12} /> : null
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            <div style={{
              padding: '12px 16px', borderTop: '1px solid var(--border)',
              background: 'var(--surface)',
            }}>
              {/* Channel Selector */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {(['sms', 'email', 'internal'] as const).map(ch => {
                  const style = CHANNEL_STYLES[ch]
                  return (
                    <button
                      key={ch}
                      onClick={() => setReplyChannel(ch)}
                      style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        border: `1px solid ${replyChannel === ch ? style.color : 'var(--border)'}`,
                        background: replyChannel === ch ? style.bg : 'transparent',
                        color: replyChannel === ch ? style.color : 'var(--text3)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <style.icon size={11} />
                      {ch.toUpperCase()}
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <textarea
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder={`Reply via ${replyChannel.toUpperCase()}...`}
                    style={{
                      width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--text1)',
                      outline: 'none', resize: 'none', minHeight: 40, maxHeight: 120,
                      fontFamily: 'inherit',
                    }}
                    rows={1}
                  />
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0, paddingBottom: 2 }}>
                  <button style={{
                    width: 36, height: 36, borderRadius: 8, background: 'var(--surface2)',
                    border: '1px solid var(--border)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Paperclip size={14} color="var(--text3)" />
                  </button>
                  <button style={{
                    width: 36, height: 36, borderRadius: 8, background: 'var(--surface2)',
                    border: '1px solid var(--border)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Sparkles size={14} color="var(--purple)" />
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: newMessage.trim() ? 'var(--accent)' : 'var(--surface2)',
                      border: 'none', cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {sending ? <Loader2 size={14} color="#fff" className="animate-spin" /> : <Send size={14} color="#fff" />}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right Panel - Customer Info */}
      {activeThread && (
        <div className="max-lg:hidden" style={{
          width: 280, borderLeft: '1px solid var(--border)',
          background: 'var(--surface)', overflowY: 'auto',
        }}>
          {/* Customer Card */}
          <div style={{ padding: 20, borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px',
              background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={24} color="var(--text3)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>
              {activeThread.customer_name}
            </div>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 8 }}>
              <span className="badge-accent">Customer</span>
            </div>
          </div>

          {/* Contact Info */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="section-label" style={{ fontSize: 10 }}>Contact Info</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text2)' }}>
                <Phone size={13} color="var(--text3)" />
                {activeThread.messages[0]?.from_address || 'No phone'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text2)' }}>
                <Mail size={13} color="var(--text3)" />
                {activeThread.messages[0]?.customer?.email || 'No email'}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="section-label" style={{ fontSize: 10 }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start', width: '100%' }}>
                <ClipboardList size={14} /> Create Task
              </button>
              <button className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start', width: '100%' }}>
                <StickyNote size={14} /> Add Note
              </button>
              <button className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start', width: '100%' }}>
                <FileText size={14} /> Create Estimate
              </button>
              <button className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start', width: '100%' }}>
                <ExternalLink size={14} /> View Profile
              </button>
            </div>
          </div>

          {/* Associated Jobs */}
          <div style={{ padding: '16px 20px' }}>
            <div className="section-label" style={{ fontSize: 10 }}>Associated Jobs</div>
            <div style={{ color: 'var(--text3)', fontSize: 12, textAlign: 'center', padding: 16 }}>
              <Briefcase size={20} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <div>No associated jobs</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
