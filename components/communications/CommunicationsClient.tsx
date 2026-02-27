'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import type { Conversation, ConversationMessage, SmsTemplate } from '@/components/comms/types'
import { relativeTime, getInitials } from '@/components/comms/types'
import {
  MessageSquare, Phone, Settings as SettingsIcon, Search,
  Send, Bot, PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Play, Pause, Edit3, Check, X, ChevronLeft, Loader2,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'sms' | 'calls' | 'settings'

interface CallLog {
  id: string
  org_id: string
  twilio_call_sid: string | null
  direction: 'inbound' | 'outbound'
  from_number: string
  to_number: string
  caller_name: string | null
  customer_id: string | null
  status: string
  duration_seconds: number | null
  recording_url: string | null
  notes: string | null
  started_at: string
  ended_at: string | null
  created_at: string
}

// ── Styles ────────────────────────────────────────────────────────────────────

const tabStyle = (active: boolean) => ({
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: 6,
  padding: '8px 16px',
  borderRadius: 8,
  border: 'none',
  background: active ? 'var(--accent)' : 'transparent',
  color: active ? '#fff' : 'var(--text2)',
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  cursor: 'pointer' as const,
  transition: 'all 0.15s',
})

const cardStyle = {
  background: 'var(--surface)',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.06)',
  overflow: 'hidden' as const,
}

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'var(--surface2)',
  color: 'var(--text1)',
  fontSize: 13,
  outline: 'none',
}

const btnPrimary = {
  display: 'flex' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 6,
  padding: '8px 16px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer' as const,
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CommunicationsClient({ profile }: { profile: Profile }) {
  const supabase = useMemo(() => createClient(), [])
  const [tab, setTab] = useState<Tab>('sms')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 20px' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexShrink: 0 }}>
        <button onClick={() => setTab('sms')} style={tabStyle(tab === 'sms')}>
          <MessageSquare size={15} /> SMS Conversations
        </button>
        <button onClick={() => setTab('calls')} style={tabStyle(tab === 'calls')}>
          <Phone size={15} /> Calls
        </button>
        <button onClick={() => setTab('settings')} style={tabStyle(tab === 'settings')}>
          <SettingsIcon size={15} /> Settings
        </button>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'sms' && <SmsTab supabase={supabase} profile={profile} />}
        {tab === 'calls' && <CallsTab supabase={supabase} profile={profile} />}
        {tab === 'settings' && <SettingsTab supabase={supabase} />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function SmsTab({ supabase, profile }: { supabase: any; profile: Profile }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [search, setSearch] = useState('')
  const [msgInput, setMsgInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aiConfigs, setAiConfigs] = useState<Record<string, boolean>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load conversations
  const loadConversations = useCallback(async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('last_message_channel', 'sms')
      .order('last_message_at', { ascending: false })

    if (data) setConversations(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadConversations() }, [loadConversations])

  // Real-time subscription for conversations
  useEffect(() => {
    const channel = supabase
      .channel('comms-conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        loadConversations()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, loadConversations])

  // Load messages when conversation selected
  useEffect(() => {
    if (!selected) { setMessages([]); return }

    async function loadMessages() {
      const { data } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', selected!.id)
        .order('created_at', { ascending: true })

      if (data) setMessages(data)
    }
    loadMessages()

    // Mark as read
    supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', selected.id)
      .then(() => { loadConversations() })

    // Real-time for messages
    const channel = supabase
      .channel(`comms-msgs-${selected.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_messages',
        filter: `conversation_id=eq.${selected.id}`,
      }, (payload: any) => {
        setMessages(prev => [...prev, payload.new as ConversationMessage])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selected, supabase, loadConversations])

  // Load AI configs
  useEffect(() => {
    async function loadAiConfigs() {
      const { data } = await supabase
        .from('conversation_ai_config')
        .select('conversation_id, ai_enabled')

      if (data) {
        const map: Record<string, boolean> = {}
        data.forEach((c: any) => { map[c.conversation_id] = c.ai_enabled })
        setAiConfigs(map)
      }
    }
    loadAiConfigs()
  }, [supabase])

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send SMS
  async function handleSend() {
    if (!msgInput.trim() || !selected?.contact_phone || sending) return
    setSending(true)
    try {
      await fetch('/api/twilio/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selected.contact_phone,
          body: msgInput.trim(),
          conversation_id: selected.id,
        }),
      })
      setMsgInput('')
      loadConversations()
    } catch (err) {
      console.error('Send SMS error:', err)
    } finally {
      setSending(false)
    }
  }

  // Toggle AI for conversation
  async function toggleAi(convoId: string) {
    const current = aiConfigs[convoId] || false
    const newVal = !current
    setAiConfigs(prev => ({ ...prev, [convoId]: newVal }))

    await supabase.from('conversation_ai_config').upsert({
      conversation_id: convoId,
      ai_enabled: newVal,
    }, { onConflict: 'conversation_id' })
  }

  const filtered = conversations.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (c.contact_name || '').toLowerCase().includes(q) ||
      (c.contact_phone || '').includes(q)
    )
  })

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0, ...cardStyle }}>
      {/* Left: Conversation list */}
      <div style={{
        width: selected ? undefined : '100%',
        minWidth: 280,
        maxWidth: 360,
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        ...(selected ? { display: undefined } : {}),
      }}
        className={selected ? 'hidden md:flex' : 'flex'}
      >
        {/* Search */}
        <div style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text3)' }} />
            <input
              placeholder="Search conversations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 32 }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)' }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              No SMS conversations
            </div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  background: selected?.id === c.id ? 'rgba(79,127,255,0.1)' : 'transparent',
                  borderLeft: selected?.id === c.id ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--surface2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: 'var(--text2)', flexShrink: 0,
                }}>
                  {getInitials(c.contact_name || '?')}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 13, fontWeight: c.unread_count > 0 ? 700 : 500,
                      color: 'var(--text1)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                    }}>
                      {c.contact_name || c.contact_phone || 'Unknown'}
                    </span>
                    {aiConfigs[c.id] && (
                      <span title="AI enabled"><Bot size={12} color="var(--cyan)" /></span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
                      {relativeTime(c.last_message_at)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--text3)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginTop: 2,
                  }}>
                    {c.last_message_preview || 'No messages'}
                  </div>
                </div>

                {/* Unread badge */}
                {c.unread_count > 0 && (
                  <div style={{
                    minWidth: 18, height: 18, borderRadius: 9,
                    background: 'var(--accent)', color: '#fff',
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 5px', flexShrink: 0,
                  }}>
                    {c.unread_count}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Message thread */}
      <div style={{ flex: 1, display: selected ? 'flex' : undefined, flexDirection: 'column' }}
        className={!selected ? 'hidden md:flex' : 'flex'}
      >
        {!selected ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text3)', fontSize: 14,
          }}>
            Select a conversation
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
            }}>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 0 }}
                className="md:hidden"
              >
                <ChevronLeft size={18} />
              </button>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--surface2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'var(--text2)', flexShrink: 0,
              }}>
                {getInitials(selected.contact_name || '?')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>
                  {selected.contact_name || 'Unknown'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {selected.contact_phone}
                </div>
              </div>
              <button
                onClick={() => toggleAi(selected.id)}
                title={aiConfigs[selected.id] ? 'Disable AI auto-reply' : 'Enable AI auto-reply'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: '1px solid',
                  borderColor: aiConfigs[selected.id] ? 'var(--cyan)' : 'rgba(255,255,255,0.1)',
                  background: aiConfigs[selected.id] ? 'rgba(34,211,238,0.1)' : 'transparent',
                  color: aiConfigs[selected.id] ? 'var(--cyan)' : 'var(--text3)',
                  cursor: 'pointer',
                }}
              >
                <Bot size={12} />
                AI {aiConfigs[selected.id] ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 14, scrollbarWidth: 'thin' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: 40 }}>
                  No messages yet
                </div>
              ) : (
                messages.map(m => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      justifyContent: m.direction === 'outbound' ? 'flex-end' : 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{
                      maxWidth: '75%',
                      padding: '8px 12px',
                      borderRadius: 12,
                      background: m.direction === 'outbound' ? 'var(--accent)' : 'var(--surface2)',
                      color: m.direction === 'outbound' ? '#fff' : 'var(--text1)',
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}>
                      {m.sent_by_name === 'AI Assistant' && (
                        <div style={{ fontSize: 10, color: m.direction === 'outbound' ? 'rgba(255,255,255,0.7)' : 'var(--cyan)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Bot size={10} /> AI
                        </div>
                      )}
                      <div>{m.body}</div>
                      <div style={{
                        fontSize: 10,
                        color: m.direction === 'outbound' ? 'rgba(255,255,255,0.6)' : 'var(--text3)',
                        marginTop: 4,
                        textAlign: 'right',
                      }}>
                        {relativeTime(m.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              display: 'flex', gap: 8, padding: '10px 14px',
              borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
            }}>
              <input
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Type a message..."
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={handleSend} disabled={sending || !msgInput.trim()} style={{
                ...btnPrimary,
                opacity: sending || !msgInput.trim() ? 0.5 : 1,
              }}>
                {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALLS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function CallsTab({ supabase, profile }: { supabase: any; profile: Profile }) {
  const [calls, setCalls] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [callTo, setCallTo] = useState('')
  const [calling, setCalling] = useState(false)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('call_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (data) setCalls(data)
      setLoading(false)
    }
    load()
  }, [supabase])

  async function handleCall() {
    if (!callTo.trim() || calling) return
    setCalling(true)
    try {
      const res = await fetch('/api/twilio/make-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: callTo.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setCallTo('')
        // Refresh
        const { data: updated } = await supabase
          .from('call_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
        if (updated) setCalls(updated)
      }
    } catch (err) {
      console.error('Make call error:', err)
    } finally {
      setCalling(false)
    }
  }

  async function saveNote(callId: string) {
    await supabase
      .from('call_logs')
      .update({ notes: noteText })
      .eq('id', callId)

    setCalls(prev => prev.map(c => c.id === callId ? { ...c, notes: noteText } : c))
    setEditingNote(null)
  }

  function togglePlay(callId: string, url: string) {
    if (playingId === callId) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      if (audioRef.current) audioRef.current.pause()
      const audio = new Audio(url)
      audio.onended = () => setPlayingId(null)
      audio.play()
      audioRef.current = audio
      setPlayingId(callId)
    }
  }

  function directionIcon(call: CallLog) {
    if (call.direction === 'outbound') return <PhoneOutgoing size={14} color="var(--accent)" />
    if (call.status === 'no-answer' || call.status === 'missed') return <PhoneMissed size={14} color="var(--red)" />
    return <PhoneIncoming size={14} color="var(--green)" />
  }

  function formatDuration(secs: number | null) {
    if (!secs) return '-'
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Click-to-call bar */}
      <div style={{
        display: 'flex', gap: 8, padding: 12,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <input
          value={callTo}
          onChange={e => setCallTo(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCall() }}
          placeholder="Enter phone number to call..."
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={handleCall} disabled={calling || !callTo.trim()} style={{
          ...btnPrimary,
          opacity: calling || !callTo.trim() ? 0.5 : 1,
        }}>
          {calling ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <PhoneCall size={14} />}
          <span>Call</span>
        </button>
      </div>

      {/* Call list */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin' }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : calls.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            No call logs yet
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {[' ', 'Contact', 'Number', 'Duration', 'Status', 'Time', 'Recording', 'Notes'].map((h, i) => (
                  <th key={i} style={{
                    padding: '8px 10px', fontSize: 11, fontWeight: 600,
                    color: 'var(--text3)', textAlign: 'left', textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map(call => (
                <tr key={call.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '8px 10px' }}>{directionIcon(call)}</td>
                  <td style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text1)', fontWeight: 500 }}>
                    {call.caller_name || '-'}
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {call.direction === 'inbound' ? call.from_number : call.to_number}
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatDuration(call.duration_seconds)}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4,
                      background: call.status === 'completed' ? 'rgba(34,192,122,0.15)' :
                        call.status === 'no-answer' || call.status === 'missed' ? 'rgba(242,90,90,0.15)' :
                        'rgba(255,255,255,0.06)',
                      color: call.status === 'completed' ? 'var(--green)' :
                        call.status === 'no-answer' || call.status === 'missed' ? 'var(--red)' :
                        'var(--text2)',
                    }}>
                      {call.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text3)' }}>
                    {relativeTime(call.started_at || call.created_at)}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    {call.recording_url ? (
                      <button
                        onClick={() => togglePlay(call.id, call.recording_url!)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: playingId === call.id ? 'var(--accent)' : 'var(--text2)',
                          padding: 2,
                        }}
                      >
                        {playingId === call.id ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    {editingNote === call.id ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveNote(call.id) }}
                          style={{ ...inputStyle, padding: '4px 8px', fontSize: 12, width: 140 }}
                          autoFocus
                        />
                        <button onClick={() => saveNote(call.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', padding: 2 }}>
                          <Check size={13} />
                        </button>
                        <button onClick={() => setEditingNote(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}>
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingNote(call.id); setNoteText(call.notes || '') }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: call.notes ? 'var(--text2)' : 'var(--text3)',
                          fontSize: 12, padding: 0,
                          display: 'flex', alignItems: 'center', gap: 4,
                          maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {call.notes || <Edit3 size={12} />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function SettingsTab({ supabase }: { supabase: any }) {
  const [aiEnabled, setAiEnabled] = useState(false)
  const [mainNumber, setMainNumber] = useState<string | null>(null)
  const [templates, setTemplates] = useState<SmsTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTpl, setEditingTpl] = useState<string | null>(null)
  const [tplBody, setTplBody] = useState('')

  useEffect(() => {
    async function load() {
      // Load AI settings
      const { data: ai } = await supabase
        .from('ai_settings')
        .select('enabled')
        .limit(1)
        .single()
      if (ai) setAiEnabled(ai.enabled)

      // Load phone system
      const { data: phone } = await supabase
        .from('phone_system')
        .select('main_number')
        .limit(1)
        .single()
      if (phone) setMainNumber(phone.main_number)

      // Load SMS templates
      const { data: tpls } = await supabase
        .from('sms_templates')
        .select('*')
        .order('name')
      if (tpls) setTemplates(tpls)

      setLoading(false)
    }
    load()
  }, [supabase])

  async function toggleGlobalAi() {
    const newVal = !aiEnabled
    setAiEnabled(newVal)
    await supabase.from('ai_settings').upsert({
      org_id: process.env.NEXT_PUBLIC_ORG_ID || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
      enabled: newVal,
    }, { onConflict: 'org_id' })
  }

  async function saveTemplate(id: string) {
    await supabase
      .from('sms_templates')
      .update({ body: tplBody })
      .eq('id', id)
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, body: tplBody } : t))
    setEditingTpl(null)
  }

  if (loading) {
    return (
      <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: 'var(--text3)' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
      {/* Global AI toggle */}
      <div style={{ ...cardStyle, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bot size={16} color="var(--cyan)" /> AI Auto-Reply
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              When enabled, AI will automatically respond to inbound SMS messages for conversations with AI toggled on.
            </div>
          </div>
          <button
            onClick={toggleGlobalAi}
            style={{
              width: 48, height: 26, borderRadius: 13, padding: 2,
              border: 'none', cursor: 'pointer', flexShrink: 0,
              background: aiEnabled ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: '#fff',
              transform: aiEnabled ? 'translateX(22px)' : 'translateX(0)',
              transition: 'transform 0.2s',
            }} />
          </button>
        </div>
      </div>

      {/* Phone number */}
      <div style={{ ...cardStyle, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Phone size={16} color="var(--accent)" /> Twilio Phone Number
        </div>
        <div style={{
          fontSize: 16, color: mainNumber ? 'var(--text1)' : 'var(--text3)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {mainNumber || 'Not configured'}
        </div>
      </div>

      {/* SMS Templates */}
      <div style={{ ...cardStyle, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare size={16} color="var(--accent)" /> SMS Templates
        </div>
        {templates.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>No templates configured</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {templates.map(tpl => (
              <div key={tpl.id} style={{
                padding: '10px 12px', borderRadius: 8,
                background: 'var(--surface2)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{tpl.name}</span>
                  {editingTpl === tpl.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => saveTemplate(tpl.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', padding: 2 }}>
                        <Check size={13} />
                      </button>
                      <button onClick={() => setEditingTpl(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}>
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingTpl(tpl.id); setTplBody(tpl.body) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}
                    >
                      <Edit3 size={13} />
                    </button>
                  )}
                </div>
                {editingTpl === tpl.id ? (
                  <textarea
                    value={tplBody}
                    onChange={e => setTplBody(e.target.value)}
                    rows={3}
                    style={{
                      ...inputStyle,
                      resize: 'vertical' as const,
                      fontFamily: 'inherit',
                    }}
                    autoFocus
                  />
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {tpl.body}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
