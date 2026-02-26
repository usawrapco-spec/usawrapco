'use client'
import { ORG_ID } from '@/lib/org'


import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  MessageCircle, Send, ArrowLeft, Users, Hash, User, Clock,
} from 'lucide-react'
import Link from 'next/link'

interface InstallerProfile {
  id: string
  name: string
  avatar_url: string | null
  role: string
}

interface ChatMessage {
  id: string
  channel: string
  project_id: string | null
  sender_id: string
  recipient_id: string | null
  body: string
  attachments: any[]
  created_at: string
  sender?: { id: string; name: string; avatar_url: string | null }
}

export default function InstallChatClient({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const [installers, setInstallers] = useState<InstallerProfile[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChannel, setSelectedChannel] = useState<string>('team')
  const [selectedName, setSelectedName] = useState<string>('#install-team')
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadInstallers = useCallback(async () => {
    const { data } = await supabase.from('profiles')
      .select('id, name, avatar_url, role')
      .eq('org_id', ORG_ID)
      .in('role', ['installer', 'owner', 'admin', 'production'])
      .order('name')
    setInstallers(data || [])
  }, [supabase])

  const loadMessages = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('installer_messages')
      .select('id, channel, project_id, sender_id, recipient_id, body, attachments, created_at')
      .eq('org_id', ORG_ID)
      .order('created_at', { ascending: true })
      .limit(100)

    if (selectedChannel === 'team') {
      query = query.eq('channel', 'team')
    } else {
      // DM: messages between current user and selected user (in either direction)
      query = query.eq('channel', 'dm').or(
        `and(sender_id.eq.${profile.id},recipient_id.eq.${selectedChannel}),and(sender_id.eq.${selectedChannel},recipient_id.eq.${profile.id})`
      )
    }

    const { data } = await query
    const rows = data || []

    if (rows.length > 0) {
      const senderIds = [...new Set(rows.map(r => r.sender_id))]
      const { data: senders } = await supabase.from('profiles').select('id, name, avatar_url').in('id', senderIds)
      const senderMap = Object.fromEntries((senders || []).map(s => [s.id, s]))
      setMessages(rows.map(r => ({ ...r, sender: senderMap[r.sender_id] })))
    } else {
      setMessages([])
    }
    setLoading(false)
    setTimeout(scrollToBottom, 100)
  }, [supabase, selectedChannel, profile.id])

  // Set up realtime subscription
  useEffect(() => {
    loadInstallers()
  }, [loadInstallers])

  useEffect(() => {
    loadMessages()

    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Subscribe to new messages
    const channel = supabase
      .channel('installer-messages-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'installer_messages',
        filter: `org_id=eq.${ORG_ID}`,
      }, async (payload) => {
        const newMsg = payload.new as any
        // Check if this message belongs to our current channel
        let relevant = false
        if (selectedChannel === 'team' && newMsg.channel === 'team') {
          relevant = true
        } else if (selectedChannel !== 'team' && newMsg.channel === 'dm') {
          if ((newMsg.sender_id === profile.id && newMsg.recipient_id === selectedChannel) ||
              (newMsg.sender_id === selectedChannel && newMsg.recipient_id === profile.id)) {
            relevant = true
          }
        }

        if (relevant) {
          const { data: senderData } = await supabase.from('profiles').select('id, name, avatar_url').eq('id', newMsg.sender_id).single()
          setMessages(prev => [...prev, { ...newMsg, sender: senderData }])
          setTimeout(scrollToBottom, 100)
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [loadMessages, supabase, selectedChannel, profile.id])

  const handleSend = async () => {
    if (!messageText.trim()) return
    setSending(true)

    const msg: any = {
      org_id: ORG_ID,
      channel: selectedChannel === 'team' ? 'team' : 'dm',
      sender_id: profile.id,
      body: messageText.trim(),
      attachments: [],
    }

    if (selectedChannel !== 'team') {
      msg.recipient_id = selectedChannel
    }

    await supabase.from('installer_messages').insert(msg)
    setMessageText('')
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const selectChannel = (channelId: string, name: string) => {
    setSelectedChannel(channelId)
    setSelectedName(name)
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const formatBody = (body: string) => {
    // Simple formatting: **bold** and newlines
    return body.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g)
      return (
        <span key={i}>
          {i > 0 && <br />}
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>
            }
            return <span key={j}>{part}</span>
          })}
        </span>
      )
    })
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', background: 'var(--bg)' }}>
      {/* Left Sidebar - Channel List */}
      <div style={{ width: 260, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/install" style={{ color: 'var(--text3)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={16} />
            </Link>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text1)', margin: 0 }}>
              <MessageCircle size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--accent)' }} />
              Install Chat
            </h2>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '12px 0' }}>
          {/* Team Channel */}
          <div style={{ padding: '0 12px', marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 8px' }}>Channels</div>
            <button onClick={() => selectChannel('team', '#install-team')} style={{
              width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: selectedChannel === 'team' ? 'var(--surface2)' : 'transparent',
              color: selectedChannel === 'team' ? 'var(--text1)' : 'var(--text2)', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Hash size={15} style={{ color: 'var(--accent)' }} />
              install-team
              <Users size={12} style={{ marginLeft: 'auto', color: 'var(--text3)' }} />
            </button>
          </div>

          {/* Direct Messages */}
          <div style={{ padding: '0 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 8px', marginTop: 8 }}>Direct Messages</div>
            {installers.filter(i => i.id !== profile.id).map(inst => (
              <button key={inst.id} onClick={() => selectChannel(inst.id, inst.name)} style={{
                width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: selectedChannel === inst.id ? 'var(--surface2)' : 'transparent',
                color: selectedChannel === inst.id ? 'var(--text1)' : 'var(--text2)', fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {inst.name[0]?.toUpperCase() || '?'}
                </div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inst.name}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto', textTransform: 'capitalize' }}>{inst.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Chat Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {selectedChannel === 'team' ? (
            <>
              <Hash size={18} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 15 }}>install-team</span>
              <span style={{ color: 'var(--text3)', fontSize: 12, marginLeft: 8 }}>Group channel for all installers</span>
            </>
          ) : (
            <>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                {selectedName[0]?.toUpperCase() || '?'}
              </div>
              <span style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 15 }}>{selectedName}</span>
              <span style={{ color: 'var(--text3)', fontSize: 12, marginLeft: 8 }}>Direct Message</span>
            </>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text2)', padding: 40 }}>
              <Clock size={18} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} /> Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 60 }}>
              <MessageCircle size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: 14 }}>No messages yet. Start the conversation.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {messages.map((msg, i) => {
                const isOwn = msg.sender_id === profile.id
                const showAvatar = i === 0 || messages[i - 1].sender_id !== msg.sender_id ||
                  (new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 300000)

                return (
                  <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: showAvatar ? '8px 0' : '1px 0', marginLeft: showAvatar ? 0 : 42 }}>
                    {showAvatar && (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: isOwn ? 'var(--green)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: 2 }}>
                        {(msg.sender?.name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      {showAvatar && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 13 }}>{msg.sender?.name || 'Unknown'}</span>
                          <span style={{ color: 'var(--text3)', fontSize: 11 }}>{formatTime(msg.created_at)}</span>
                        </div>
                      )}
                      <div style={{ color: 'var(--text1)', fontSize: 13, lineHeight: 1.5 }}>
                        {formatBody(msg.body)}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <textarea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${selectedName}...`}
              rows={1}
              style={{
                flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10,
                padding: '10px 14px', color: 'var(--text1)', fontSize: 13, resize: 'none', maxHeight: 120,
                overflow: 'auto', lineHeight: 1.5, boxSizing: 'border-box',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 120) + 'px'
              }}
            />
            <button onClick={handleSend} disabled={sending || !messageText.trim()} style={{
              width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: messageText.trim() ? 'var(--accent)' : 'var(--surface2)',
              color: messageText.trim() ? '#fff' : 'var(--text3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              opacity: sending ? 0.6 : 1,
            }}>
              <Send size={18} />
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            Press Enter to send, Shift+Enter for new line. **Bold** with double asterisks.
          </div>
        </div>
      </div>
    </div>
  )
}
