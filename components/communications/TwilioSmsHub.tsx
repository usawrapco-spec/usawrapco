'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  MessageCircle, Phone, Settings, Send, PhoneCall, PhoneIncoming,
  PhoneOutgoing, Play, Pause, User, Bot, Loader2,
  Clock, X, Volume2, Search, ChevronLeft, Mic, ToggleLeft, ToggleRight,
  AlertCircle,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SmsConversation {
  id: string
  contact_phone: string
  contact_name: string | null
  customer_id: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
  ai_enabled: boolean
  status: string
  created_at: string
}

interface SmsMessage {
  id: string
  conversation_id: string
  direction: 'inbound' | 'outbound'
  body: string
  from_number: string | null
  to_number: string | null
  twilio_sid: string | null
  ai_generated: boolean
  status: string
  created_at: string
}

interface CallLog {
  id: string
  direction: string
  from_number: string | null
  to_number: string | null
  caller_name: string | null
  duration_seconds: number | null
  status: string
  recording_url: string | null
  notes: string | null
  twilio_call_sid: string | null
  created_at: string
}

type Tab = 'conversations' | 'calls' | 'settings'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ts: string | null) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatDuration(secs: number | null) {
  if (!secs || secs <= 0) return '--:--'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatPhone(p: string | null) {
  if (!p) return ''
  const digits = p.replace(/\D/g, '')
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return p
}

// ── Audio Player (for call recordings) ───────────────────────────────────────

function AudioPlayer({ url }: { url: string }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  async function toggle() {
    if (!ref.current) return
    if (playing) { ref.current.pause(); setPlaying(false) }
    else {
      try { await ref.current.play(); setPlaying(true) } catch { /* autoplay blocked */ }
    }
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onTime = () => setProgress(el.duration ? el.currentTime / el.duration : 0)
    const onEnd  = () => setPlaying(false)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('ended', onEnd)
    return () => { el.removeEventListener('timeupdate', onTime); el.removeEventListener('ended', onEnd) }
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', borderRadius: 8, padding: '6px 12px' }}>
      <audio ref={ref} src={url} style={{ display: 'none' }} />
      <button onClick={toggle} style={{ background: 'var(--accent)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
        {playing ? <Pause size={12} color="#fff" /> : <Play size={12} color="#fff" />}
      </button>
      <div style={{ flex: 1, height: 4, background: 'var(--surface)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: 'var(--accent)', transition: 'width 0.5s linear' }} />
      </div>
      <Volume2 size={14} color="var(--text2)" />
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TwilioSmsHub({ profile }: { profile: Profile }) {
  const supabase = createClient()

  const [tab, setTab] = useState<Tab>('conversations')

  // Conversations tab
  const [convos, setConvos] = useState<SmsConversation[]>([])
  const [selectedConvo, setSelectedConvo] = useState<SmsConversation | null>(null)
  const [messages, setMessages] = useState<SmsMessage[]>([])
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sendText, setSendText] = useState('')
  const [sending, setSending] = useState(false)
  const [convoSearch, setConvoSearch] = useState('')

  // Calls tab
  const [calls, setCalls] = useState<CallLog[]>([])
  const [loadingCalls, setLoadingCalls] = useState(false)
  const [callNoteTarget, setCallNoteTarget] = useState<string | null>(null)
  const [callNoteText, setCallNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [dialTo, setDialTo] = useState('')
  const [dialing, setDialing] = useState(false)

  // Settings tab
  const [aiEnabled, setAiEnabled] = useState(true)
  const [twilioNumber, setTwilioNumber] = useState<string | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── Load Conversations ──────────────────────────────────────────────────────

  const loadConvos = useCallback(async () => {
    setLoadingConvos(true)
    try {
      const { data } = await supabase
        .from('sms_conversations')
        .select('*')
        .order('last_message_at', { ascending: false })
        .limit(100)
      setConvos(data || [])
    } finally {
      setLoadingConvos(false)
    }
  }, [])

  // ── Load Messages ───────────────────────────────────────────────────────────

  const loadMessages = useCallback(async (convoId: string) => {
    setLoadingMsgs(true)
    try {
      const { data } = await supabase
        .from('sms_messages')
        .select('*')
        .eq('conversation_id', convoId)
        .order('created_at', { ascending: true })
      setMessages(data || [])
      // Mark as read (fire-and-forget)
      supabase
        .from('sms_conversations')
        .update({ unread_count: 0 })
        .eq('id', convoId)
        .then(() => {}, (err) => console.error('mark-as-read failed:', err))
      setConvos(prev => prev.map(c => c.id === convoId ? { ...c, unread_count: 0 } : c))
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  // ── Load Calls ─────────────────────────────────────────────────────────────

  const loadCalls = useCallback(async () => {
    setLoadingCalls(true)
    try {
      const { data } = await supabase
        .from('call_logs')
        .select('id, direction, from_number, to_number, caller_name, duration_seconds, status, recording_url, notes, twilio_call_sid, created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      setCalls(data || [])
    } finally {
      setLoadingCalls(false)
    }
  }, [])

  // ── Load Settings ──────────────────────────────────────────────────────────

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true)
    try {
      const res = await fetch('/api/twilio/settings')
      const data = await res.json()
      setAiEnabled(data.ai_sms_enabled !== false)
      setTwilioNumber(data.twilio_number || null)
    } finally {
      setLoadingSettings(false)
    }
  }, [])

  // ── Init ───────────────────────────────────────────────────────────────────

  useEffect(() => { loadConvos() }, [loadConvos])
  useEffect(() => { if (tab === 'calls') loadCalls() }, [tab, loadCalls])
  useEffect(() => { if (tab === 'settings') loadSettings() }, [tab, loadSettings])

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Realtime subscriptions ─────────────────────────────────────────────────

  useEffect(() => {
    const ch = supabase
      .channel('sms_convos_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sms_conversations' }, () => {
        loadConvos()
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [loadConvos])

  useEffect(() => {
    if (!selectedConvo) return
    const ch = supabase
      .channel(`sms_msgs_${selectedConvo.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sms_messages',
        filter: `conversation_id=eq.${selectedConvo.id}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as SmsMessage])
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [selectedConvo])

  // Realtime refresh for call_logs (fires when a call is logged or status updated)
  useEffect(() => {
    if (tab !== 'calls') return
    const ch = supabase
      .channel('call_logs_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_logs' }, () => {
        loadCalls()
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [tab, loadCalls])

  // ── Select Conversation ────────────────────────────────────────────────────

  function selectConvo(c: SmsConversation) {
    setSelectedConvo(c)
    setMessages([])
    loadMessages(c.id)
  }

  // ── Send SMS ───────────────────────────────────────────────────────────────

  async function handleSend() {
    if (!sendText.trim() || !selectedConvo || sending) return
    const convo = selectedConvo
    const body = sendText.trim()
    setSending(true)

    try {
      const res = await fetch('/api/twilio/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: convo.contact_phone, body, conversationId: convo.id }),
      })
      if (res.ok) {
        setSendText('')
        await loadMessages(convo.id)
      } else {
        // Keep text so user can retry
        const err = await res.json().catch(() => ({}))
        console.error('SMS send failed:', err?.error || res.status)
      }
    } catch {
      // Network error — keep text so user can retry
    } finally {
      setSending(false)
    }
  }

  // ── Toggle per-conversation AI ─────────────────────────────────────────────

  async function toggleConvoAi(convoId: string, current: boolean) {
    await supabase
      .from('sms_conversations')
      .update({ ai_enabled: !current })
      .eq('id', convoId)
    setConvos(prev => prev.map(c => c.id === convoId ? { ...c, ai_enabled: !current } : c))
    if (selectedConvo?.id === convoId) {
      setSelectedConvo(prev => prev ? { ...prev, ai_enabled: !current } : prev)
    }
  }

  // ── Make Call ──────────────────────────────────────────────────────────────

  async function handleMakeCall(to: string) {
    if (dialing || !to) return
    setDialing(true)
    try {
      await fetch('/api/twilio/make-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      })
      setDialTo('')
      loadCalls()
    } finally {
      setDialing(false)
    }
  }

  // ── Save Call Note ─────────────────────────────────────────────────────────

  async function saveCallNote(callId: string) {
    const noteText = callNoteText
    setSavingNote(true)
    try {
      await supabase
        .from('call_logs')
        .update({ notes: noteText })
        .eq('id', callId)
      setCalls(prev => prev.map(c => c.id === callId ? { ...c, notes: noteText } : c))
      setCallNoteTarget(null)
      setCallNoteText('')
    } finally {
      setSavingNote(false)
    }
  }

  // ── Toggle Global AI ───────────────────────────────────────────────────────

  async function toggleGlobalAi() {
    const next = !aiEnabled
    setAiEnabled(next) // optimistic
    setSavingSettings(true)
    try {
      await fetch('/api/twilio/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_sms_enabled: next }),
      })
    } catch {
      setAiEnabled(!next) // revert on error
    } finally {
      setSavingSettings(false)
    }
  }

  // ── Filtered conversations ─────────────────────────────────────────────────

  const filteredConvos = convos.filter(c => {
    if (!convoSearch) return true
    const q = convoSearch.toLowerCase()
    return (
      (c.contact_name || '').toLowerCase().includes(q) ||
      c.contact_phone.includes(q) ||
      (c.last_message || '').toLowerCase().includes(q)
    )
  })

  const totalUnread = convos.reduce((sum, c) => sum + c.unread_count, 0)

  // ── Styles ─────────────────────────────────────────────────────────────────

  const s = {
    root: {
      display: 'flex', flexDirection: 'column' as const,
      height: 'calc(100vh - 60px)',
      background: 'var(--bg)',
    },
    header: {
      borderBottom: '1px solid var(--surface2)',
      padding: '0 20px',
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'var(--surface)',
      flexShrink: 0,
    },
    tabBtn: (active: boolean) => ({
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '14px 16px',
      borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      color: active ? 'var(--accent)' : 'var(--text2)',
      background: 'none', border: 'none',
      borderRadius: 0, cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
      transition: 'color 0.15s',
    }),
    body: {
      flex: 1, display: 'flex', overflow: 'hidden',
    },
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={s.root}>

      {/* Tab header */}
      <div style={s.header}>
        <button style={s.tabBtn(tab === 'conversations')} onClick={() => setTab('conversations')}>
          <MessageCircle size={15} />
          SMS
          {totalUnread > 0 && (
            <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 6px', minWidth: 16, textAlign: 'center' }}>
              {totalUnread}
            </span>
          )}
        </button>
        <button style={s.tabBtn(tab === 'calls')} onClick={() => setTab('calls')}>
          <Phone size={15} />
          Calls
        </button>
        <button style={s.tabBtn(tab === 'settings')} onClick={() => setTab('settings')}>
          <Settings size={15} />
          Settings
        </button>
      </div>

      <div style={s.body}>

        {/* ── TAB: Conversations ─────────────────────────────────────────── */}
        {tab === 'conversations' && (
          <>
            {/* Left sidebar — conversation list */}
            <div style={{
              width: selectedConvo ? 300 : '100%', maxWidth: 340,
              borderRight: '1px solid var(--surface2)',
              display: 'flex', flexDirection: 'column',
              background: 'var(--surface)',
              flexShrink: 0,
            }}>
              {/* Search */}
              <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--surface2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', borderRadius: 8, padding: '6px 10px' }}>
                  <Search size={14} color="var(--text2)" />
                  <input
                    value={convoSearch}
                    onChange={e => setConvoSearch(e.target.value)}
                    placeholder="Search conversations..."
                    style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text1)', fontSize: 13, flex: 1, fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              {/* List */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {loadingConvos ? (
                  <div style={{ padding: 40, textAlign: 'center' }}>
                    <Loader2 size={20} color="var(--text2)" style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : filteredConvos.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
                    No conversations yet
                  </div>
                ) : filteredConvos.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectConvo(c)}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '12px 14px',
                      background: selectedConvo?.id === c.id ? 'var(--surface2)' : 'none',
                      border: 'none', borderBottom: '1px solid var(--surface2)',
                      cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start',
                      transition: 'background 0.1s',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <User size={16} color="#fff" />
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.contact_name || formatPhone(c.contact_phone)}
                        </span>
                        <span style={{ color: 'var(--text2)', fontSize: 11, flexShrink: 0 }}>
                          {formatTime(c.last_message_at)}
                        </span>
                      </div>
                      {c.contact_name && (
                        <div style={{ color: 'var(--text2)', fontSize: 11, marginBottom: 2 }}>{formatPhone(c.contact_phone)}</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: 'var(--text2)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {c.last_message || 'No messages'}
                        </span>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          {c.ai_enabled && (
                            <span style={{ background: 'var(--purple)', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '1px 4px' }}>AI</span>
                          )}
                          {c.unread_count > 0 && (
                            <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>
                              {c.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right panel — thread */}
            {selectedConvo ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

                {/* Thread header */}
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--surface2)',
                  background: 'var(--surface)',
                  display: 'flex', alignItems: 'center', gap: 12,
                  flexShrink: 0,
                }}>
                  <button onClick={() => setSelectedConvo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text2)', padding: 4 }}>
                    <ChevronLeft size={18} />
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 14 }}>
                      {selectedConvo.contact_name || formatPhone(selectedConvo.contact_phone)}
                    </div>
                    {selectedConvo.contact_name && (
                      <div style={{ color: 'var(--text2)', fontSize: 12 }}>{formatPhone(selectedConvo.contact_phone)}</div>
                    )}
                  </div>

                  {/* AI toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Bot size={14} color={selectedConvo.ai_enabled ? 'var(--purple)' : 'var(--text2)'} />
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>AI Auto-Respond</span>
                    <button
                      onClick={() => toggleConvoAi(selectedConvo.id, selectedConvo.ai_enabled)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: selectedConvo.ai_enabled ? 'var(--purple)' : 'var(--text2)', display: 'flex', alignItems: 'center' }}
                    >
                      {selectedConvo.ai_enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    </button>
                  </div>

                  {/* Click-to-call */}
                  <button
                    onClick={() => handleMakeCall(selectedConvo.contact_phone)}
                    disabled={dialing}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--green)', border: 'none', borderRadius: 8, padding: '7px 12px', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  >
                    {dialing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <PhoneCall size={14} />}
                    Call
                  </button>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {loadingMsgs ? (
                    <div style={{ textAlign: 'center', paddingTop: 40 }}>
                      <Loader2 size={20} color="var(--text2)" style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 13, paddingTop: 40 }}>
                      No messages in this conversation
                    </div>
                  ) : messages.map(m => {
                    const isOut = m.direction === 'outbound'
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start' }}>
                        {!isOut && (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8, alignSelf: 'flex-end' }}>
                            <User size={12} color="var(--text2)" />
                          </div>
                        )}
                        <div style={{ maxWidth: '70%' }}>
                          <div style={{
                            padding: '9px 13px', borderRadius: isOut ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: isOut ? 'var(--accent)' : 'var(--surface2)',
                            color: isOut ? '#fff' : 'var(--text1)',
                            fontSize: 13, lineHeight: 1.4,
                          }}>
                            {m.body}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, justifyContent: isOut ? 'flex-end' : 'flex-start' }}>
                            {m.ai_generated && <Bot size={10} color="var(--purple)" />}
                            <span style={{ color: 'var(--text2)', fontSize: 10 }}>{formatTime(m.created_at)}</span>
                          </div>
                        </div>
                        {isOut && (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 8, alignSelf: 'flex-end', opacity: 0.7 }}>
                            {m.ai_generated ? <Bot size={12} color="#fff" /> : <User size={12} color="#fff" />}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Compose */}
                <div style={{
                  padding: '12px 16px',
                  borderTop: '1px solid var(--surface2)',
                  background: 'var(--surface)',
                  display: 'flex', gap: 8, alignItems: 'flex-end',
                  flexShrink: 0,
                }}>
                  <textarea
                    value={sendText}
                    onChange={e => setSendText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder="Type a message... (Enter to send)"
                    rows={2}
                    style={{
                      flex: 1, background: 'var(--surface2)', border: '1px solid var(--surface2)',
                      borderRadius: 10, padding: '9px 12px',
                      color: 'var(--text1)', fontSize: 13, fontFamily: 'inherit',
                      resize: 'none', outline: 'none', lineHeight: 1.4,
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!sendText.trim() || sending}
                    style={{
                      background: sendText.trim() ? 'var(--accent)' : 'var(--surface2)',
                      border: 'none', borderRadius: 10,
                      width: 40, height: 40, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: sendText.trim() ? 'pointer' : 'not-allowed',
                      transition: 'background 0.15s',
                    }}
                  >
                    {sending ? <Loader2 size={16} color="#fff" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} color={sendText.trim() ? '#fff' : 'var(--text2)'} />}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text2)' }}>
                <MessageCircle size={40} strokeWidth={1.2} />
                <p style={{ fontSize: 14, margin: 0 }}>Select a conversation to view messages</p>
              </div>
            )}
          </>
        )}

        {/* ── TAB: Calls ─────────────────────────────────────────────────── */}
        {tab === 'calls' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

            {/* Outbound dial */}
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
              <PhoneCall size={18} color="var(--green)" />
              <input
                value={dialTo}
                onChange={e => setDialTo(e.target.value)}
                placeholder="+1 (555) 000-0000"
                style={{ flex: 1, background: 'var(--surface2)', border: 'none', borderRadius: 8, padding: '8px 12px', color: 'var(--text1)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
              />
              <button
                onClick={() => dialTo && handleMakeCall(dialTo)}
                disabled={!dialTo || dialing}
                style={{ background: 'var(--green)', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {dialing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <PhoneCall size={14} />}
                Call
              </button>
            </div>

            {/* Call log */}
            {loadingCalls ? (
              <div style={{ textAlign: 'center', paddingTop: 40 }}>
                <Loader2 size={24} color="var(--text2)" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : calls.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 14, paddingTop: 40 }}>
                No calls logged yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {calls.map(c => {
                  const isIn = c.direction === 'inbound'
                  return (
                    <div key={c.id} style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Direction icon */}
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                          background: isIn ? 'rgba(34,192,122,0.15)' : 'rgba(79,127,255,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isIn
                            ? <PhoneIncoming size={15} color="var(--green)" />
                            : <PhoneOutgoing size={15} color="var(--accent)" />
                          }
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 13 }}>
                            {c.caller_name || formatPhone(isIn ? c.from_number : c.to_number)}
                          </div>
                          <div style={{ color: 'var(--text2)', fontSize: 12 }}>
                            {formatPhone(isIn ? c.from_number : c.to_number)} · {isIn ? 'Inbound' : 'Outbound'}
                          </div>
                        </div>

                        {/* Duration + time */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ color: 'var(--text1)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            <Clock size={12} color="var(--text2)" />
                            {formatDuration(c.duration_seconds)}
                          </div>
                          <div style={{ color: 'var(--text2)', fontSize: 11 }}>{formatTime(c.created_at)}</div>
                        </div>

                        {/* Click-to-call */}
                        <button
                          onClick={() => handleMakeCall(isIn ? (c.from_number || '') : (c.to_number || ''))}
                          style={{ background: 'var(--surface2)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--green)', fontSize: 12 }}
                        >
                          <PhoneCall size={13} />
                          Call
                        </button>
                      </div>

                      {/* Recording */}
                      {c.recording_url && (
                        <div style={{ marginTop: 10 }}>
                          <AudioPlayer url={c.recording_url} />
                        </div>
                      )}

                      {/* Status badge */}
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '2px 7px',
                          background: c.status === 'completed' ? 'rgba(34,192,122,0.15)' : 'rgba(242,90,90,0.15)',
                          color: c.status === 'completed' ? 'var(--green)' : 'var(--red)',
                        }}>
                          {c.status}
                        </span>

                        {/* Notes */}
                        {callNoteTarget === c.id ? (
                          <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                            <input
                              value={callNoteText}
                              onChange={e => setCallNoteText(e.target.value)}
                              placeholder="Add a note..."
                              autoFocus
                              style={{ flex: 1, background: 'var(--surface2)', border: 'none', borderRadius: 6, padding: '4px 8px', color: 'var(--text1)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
                            />
                            <button onClick={() => saveCallNote(c.id)} disabled={savingNote} style={{ background: 'var(--accent)', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                              {savingNote ? '...' : 'Save'}
                            </button>
                            <button onClick={() => setCallNoteTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 4 }}>
                              <X size={14} />
                            </button>
                          </div>
                        ) : c.notes ? (
                          <span
                            style={{ color: 'var(--text2)', fontSize: 12, cursor: 'pointer', flex: 1 }}
                            onClick={() => { setCallNoteTarget(c.id); setCallNoteText(c.notes || '') }}
                          >
                            {c.notes}
                          </span>
                        ) : (
                          <button
                            onClick={() => { setCallNoteTarget(c.id); setCallNoteText('') }}
                            style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 12, cursor: 'pointer', padding: '2px 4px' }}
                          >
                            + Add note
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Settings ──────────────────────────────────────────────── */}
        {tab === 'settings' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, maxWidth: 560 }}>

            {loadingSettings ? (
              <div style={{ textAlign: 'center', paddingTop: 40 }}>
                <Loader2 size={24} color="var(--text2)" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Twilio number */}
                <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20 }}>
                  <div style={{ color: 'var(--text2)', fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Twilio Phone Number</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Phone size={20} color="var(--accent)" />
                    <span style={{ color: 'var(--text1)', fontSize: 18, fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>
                      {twilioNumber ? formatPhone(twilioNumber) : 'Not configured'}
                    </span>
                  </div>
                  {!twilioNumber && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center', color: 'var(--amber)', fontSize: 12 }}>
                      <AlertCircle size={13} />
                      Set TWILIO_PHONE_NUMBER in environment variables
                    </div>
                  )}
                </div>

                {/* Global AI toggle */}
                <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Bot size={18} color="var(--purple)" />
                        AI Agent Auto-Respond
                      </div>
                      <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 4 }}>
                        Master switch — overrides per-conversation settings
                      </div>
                    </div>
                    <button
                      onClick={toggleGlobalAi}
                      disabled={savingSettings}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: aiEnabled ? 'var(--purple)' : 'var(--text2)', display: 'flex', alignItems: 'center' }}
                    >
                      {aiEnabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                    </button>
                  </div>

                  <div style={{ borderTop: '1px solid var(--surface2)', paddingTop: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: aiEnabled ? 'var(--green)' : 'var(--text2)', flexShrink: 0, marginTop: 4 }} />
                    <p style={{ color: 'var(--text2)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                      {aiEnabled
                        ? 'Claude AI (claude-sonnet-4-6) will automatically respond to inbound SMS. It knows about USA Wrap Co services, pricing ($2,500–$8,000+), and turnaround times (1–3 days). You can disable AI per conversation using the toggle in the thread view.'
                        : 'AI auto-respond is off. All inbound SMS will appear in your inbox without an AI reply. You can enable AI per conversation regardless of this setting.'
                      }
                    </p>
                  </div>
                </div>

                {/* Webhook instructions */}
                <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20 }}>
                  <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Mic size={16} color="var(--cyan)" />
                    Twilio Webhook Configuration
                  </div>
                  <div style={{ color: 'var(--text2)', fontSize: 12, marginBottom: 10 }}>
                    Set these URLs in your Twilio console (Phone Numbers → your number):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'SMS webhook', value: 'https://app.usawrapco.com/api/twilio/inbound-sms' },
                      { label: 'Voice webhook', value: 'https://app.usawrapco.com/api/twilio/inbound-call' },
                      { label: 'Call status', value: 'https://app.usawrapco.com/api/twilio/call-status' },
                    ].map(w => (
                      <div key={w.label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ color: 'var(--text2)', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{w.label}</div>
                        <code style={{ color: 'var(--cyan)', fontSize: 12 }}>{w.value}</code>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
