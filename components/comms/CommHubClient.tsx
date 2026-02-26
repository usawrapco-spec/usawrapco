'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  TriangleAlert, X, Phone, Mail, MessageSquare,
  Plus, Mic, Search, PhoneCall, PhoneMissed,
  PhoneOff, MicOff, Pause, ChevronDown, Bell,
  ArrowLeft,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import type {
  Conversation, ConversationMessage, EmailTemplate,
  SmsTemplate, PhotoSelection, InboxLabel,
} from './types'
import { ConversationList } from './ConversationList'
import { MessageThread } from './MessageThread'
import { ContactPanel } from './ContactPanel'
import { ComposeArea } from './ComposeArea'
import { InboxSoftphone } from './InboxSoftphone'
import { usePhone } from '@/components/phone/PhoneProvider'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

interface Teammate {
  id: string
  name: string
  role: string
}

interface ContactResult {
  id: string
  name: string
  email: string | null
  phone: string | null
  type: 'conversation' | 'customer'
}

interface Props {
  profile: Profile
  initialConversationId?: string
  initialConversations?: Conversation[]
  initialTemplates?: EmailTemplate[]
  initialSmsTemplates?: SmsTemplate[]
  initialTeammates?: Teammate[]
}

// ── Active Call Banner ───────────────────────────────────────────
function InboxActiveCallBanner() {
  const phone = usePhone()
  if (!phone || phone.callState === 'idle' || phone.callState === 'incoming') return null

  const mins = Math.floor((phone.duration || 0) / 60)
  const secs = ((phone.duration || 0) % 60).toString().padStart(2, '0')
  const timer = phone.callState === 'in-call' ? `${mins}:${secs}` : null

  const stateLabel =
    phone.callState === 'connecting' ? 'Connecting...' :
    phone.callState === 'ringing'    ? 'Ringing...' :
    phone.callState === 'in-call'    ? 'In call' : ''

  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(34,192,122,0.15) 0%, rgba(34,192,122,0.06) 100%)',
      borderBottom: '1px solid rgba(34,192,122,0.3)',
      padding: '9px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexShrink: 0,
    }}>
      {/* Pulsing dot */}
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: 'var(--green)',
        animation: phone.callState === 'in-call' ? 'pulse 1.5s infinite' : 'none',
        flexShrink: 0,
      }} />

      {/* Name + number */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {phone.activeName || phone.activeNumber || 'Unknown'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
          {stateLabel}{timer ? ` · ${timer}` : ''}
        </div>
      </div>

      {/* Controls — only show during active call */}
      {phone.callState === 'in-call' && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={phone.toggleMute}
            title={phone.isMuted ? 'Unmute' : 'Mute'}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: phone.isMuted ? 'var(--red)22' : 'var(--surface2)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: phone.isMuted ? 'var(--red)' : 'var(--text2)' }}
          >
            {phone.isMuted ? <MicOff size={12} /> : <Mic size={12} />}
            {phone.isMuted ? 'Muted' : 'Mute'}
          </button>
          <button
            onClick={phone.toggleHold}
            title={phone.isOnHold ? 'Resume' : 'Hold'}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: phone.isOnHold ? 'var(--amber)22' : 'var(--surface2)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: phone.isOnHold ? 'var(--amber)' : 'var(--text2)' }}
          >
            <Pause size={12} />
            {phone.isOnHold ? 'Held' : 'Hold'}
          </button>
          <button
            onClick={phone.hangUp}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: 'var(--red)22', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--red)' }}
          >
            <PhoneOff size={12} />
            End
          </button>
        </div>
      )}

      {/* Cancel for connecting/ringing */}
      {(phone.callState === 'connecting' || phone.callState === 'ringing') && (
        <button
          onClick={phone.hangUp}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: 'var(--red)22', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--red)' }}
        >
          <PhoneOff size={12} />
          Cancel
        </button>
      )}
    </div>
  )
}

// ── Toast Notification ────────────────────────────────────────────
interface ToastData {
  id: string
  convoId: string
  contactName: string
  preview: string
  channel: string
}

function InboxToast({ toast, onNavigate, onDismiss }: {
  toast: ToastData
  onNavigate: (id: string) => void
  onDismiss: () => void
}) {
  const Icon = toast.channel === 'sms' ? MessageSquare :
               toast.channel === 'call' ? PhoneCall :
               toast.channel === 'voicemail' ? Mic : Mail

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 20,
        zIndex: 9999,
        background: 'var(--surface)',
        border: '1px solid var(--surface2)',
        borderRadius: 12,
        padding: '12px 16px',
        width: 300,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        cursor: 'pointer',
        animation: 'slideInRight 0.2s ease',
      }}
      onClick={() => { onNavigate(toast.convoId); onDismiss() }}
    >
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={14} style={{ color: 'var(--accent)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>
          New {toast.channel === 'sms' ? 'SMS' : toast.channel === 'voicemail' ? 'Voicemail' : toast.channel === 'call' ? 'Call' : 'Email'} from {toast.contactName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {toast.preview}
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); onDismiss() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, flexShrink: 0 }}>
        <X size={13} />
      </button>
    </div>
  )
}

// ── New Conversation Modal ────────────────────────────────────────
function NewConversationModal({
  profile,
  onSelect,
  onClose,
}: {
  profile: Profile
  onSelect: (name: string, email: string | null, phone: string | null, preferredChannel: 'email' | 'sms' | 'call') => void
  onClose: () => void
}) {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ContactResult[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const orgId = profile.org_id || ORG_ID

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) { setResults([]); return }
      setSearching(true)
      try {
        // Search existing conversations
        const { data: convos } = await supabase
          .from('conversations')
          .select('id, contact_name, contact_email, contact_phone')
          .eq('org_id', orgId)
          .or(`contact_name.ilike.%${query}%,contact_email.ilike.%${query}%,contact_phone.ilike.%${query}%`)
          .limit(8)

        // Search customers
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name, email, phone')
          .eq('org_id', orgId)
          .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(8)

        const seen = new Set<string>()
        const combined: ContactResult[] = []

        // Conversations first (they're already active contacts)
        for (const c of convos || []) {
          const key = (c.contact_email || c.contact_phone || c.id).toLowerCase()
          if (!seen.has(key)) {
            seen.add(key)
            combined.push({ id: c.id, name: c.contact_name || 'Unknown', email: c.contact_email, phone: c.contact_phone, type: 'conversation' })
          }
        }
        // Then customers
        for (const c of customers || []) {
          const key = (c.email || c.phone || c.id).toLowerCase()
          if (!seen.has(key)) {
            seen.add(key)
            combined.push({ id: c.id, name: c.name, email: c.email, phone: c.phone, type: 'customer' })
          }
        }
        setResults(combined.slice(0, 10))
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  // Allow raw email/phone entry
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query)
  const isPhone = /^\+?[\d\s\-()]{7,}$/.test(query) && query.replace(/\D/g, '').length >= 7

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 16, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--surface2)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Search size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by name, email, or phone..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onClose() }}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text1)', fontWeight: 500 }}
          />
          {searching && <div style={{ width: 14, height: 14, border: '2px solid var(--text3)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', flexShrink: 0 }} />}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {results.length === 0 && !query.trim() && (
            <div style={{ padding: '20px 18px', color: 'var(--text3)', fontSize: 13 }}>
              Start typing to search contacts...
            </div>
          )}

          {results.map(r => (
            <div key={r.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--surface2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--accent)', flexShrink: 0, fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {(r.name || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {[r.email, r.phone].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>
              {/* Channel action buttons */}
              <div style={{ display: 'flex', gap: 6 }}>
                {r.email && (
                  <button onClick={() => onSelect(r.name, r.email, r.phone, 'email')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: 'var(--accent)22', color: 'var(--accent)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                    <Mail size={11} />Email
                  </button>
                )}
                {r.phone && (
                  <>
                    <button onClick={() => onSelect(r.name, r.email, r.phone, 'sms')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: 'var(--green)22', color: 'var(--green)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                      <MessageSquare size={11} />SMS
                    </button>
                    <button onClick={() => onSelect(r.name, r.email, r.phone, 'call')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: 'var(--cyan)22', color: 'var(--cyan)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                      <Phone size={11} />Call
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Raw email/phone entry */}
          {query.trim() && results.length === 0 && !searching && (
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--surface2)' }}>
              {isEmail && (
                <button onClick={() => onSelect(query, query, null, 'email')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--accent)22', color: 'var(--accent)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, width: '100%', textAlign: 'left' }}>
                  <Mail size={14} />Send email to {query}
                </button>
              )}
              {isPhone && (
                <div style={{ display: 'flex', gap: 6, marginTop: isEmail ? 6 : 0 }}>
                  <button onClick={() => onSelect(query, null, query, 'sms')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'var(--green)22', color: 'var(--green)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, flex: 1 }}>
                    <MessageSquare size={14} />SMS {query}
                  </button>
                  <button onClick={() => onSelect(query, null, query, 'call')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'var(--cyan)22', color: 'var(--cyan)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, flex: 1 }}>
                    <Phone size={14} />Call {query}
                  </button>
                </div>
              )}
              {!isEmail && !isPhone && (
                <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--text3)' }}>No contacts found. Try a valid email or phone number to start a new conversation.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────
export default function CommHubClient({
  profile,
  initialConversationId,
  initialConversations = [],
  initialTemplates = [],
  initialSmsTemplates = [],
  initialTeammates = [],
}: Props) {
  const supabase = createClient()
  const phone = usePhone()
  const orgId = profile.org_id || ORG_ID

  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId || null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates)
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>(initialSmsTemplates)
  const [teammates, setTeammates] = useState<Teammate[]>(initialTeammates)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<InboxLabel>('inbox')
  const [showContact, setShowContact] = useState(true)
  const [loading, setLoading] = useState(initialConversations.length === 0)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list')
  const [composingNew, setComposingNew] = useState(false)
  const [newTo, setNewTo] = useState('')
  const [newName, setNewName] = useState('')
  const [newChannel, setNewChannel] = useState<'email' | 'sms' | 'note'>('email')
  const [emailConfigured, setEmailConfigured] = useState(true)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [toast, setToast] = useState<ToastData | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedConvo = conversations.find((c) => c.id === selectedId) || null

  // ── Fetch conversations ───────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('org_id', orgId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(200)
    if (data) setConversations(data as Conversation[])
    setLoading(false)
  }, [supabase, orgId])

  // ── Fetch messages ────────────────────────────────────────────
  const fetchMessages = useCallback(async (convoId: string) => {
    setMessagesLoading(true)
    const { data } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', convoId)
      .order('created_at', { ascending: true })
    if (data) setMessages(data as ConversationMessage[])
    setMessagesLoading(false)
    await supabase.from('conversations').update({ unread_count: 0 }).eq('id', convoId)
    setConversations(prev => prev.map(c => c.id === convoId ? { ...c, unread_count: 0 } : c))
  }, [supabase])

  // ── Fetch templates ───────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    if (initialTemplates.length > 0) return
    const { data } = await supabase.from('email_templates').select('*').eq('org_id', orgId)
    if (data) setTemplates(data as EmailTemplate[])
  }, [supabase, orgId, initialTemplates.length])

  const fetchSmsTemplates = useCallback(async () => {
    if (initialSmsTemplates.length > 0) return
    const { data } = await supabase.from('sms_templates').select('*').eq('org_id', orgId).order('name')
    if (data) setSmsTemplates(data as SmsTemplate[])
  }, [supabase, orgId, initialSmsTemplates.length])

  const fetchTeammates = useCallback(async () => {
    if (initialTeammates.length > 0) return
    const { data } = await supabase.from('profiles').select('id, name, role').eq('org_id', orgId).neq('id', profile.id).order('name')
    if (data) setTeammates(data as Teammate[])
  }, [supabase, orgId, profile.id, initialTeammates.length])

  // ── Check email config ────────────────────────────────────────
  useEffect(() => {
    fetch('/api/system/check-env')
      .then(r => r.json())
      .then(data => setEmailConfigured(!!data.resend))
      .catch(() => {})
    try {
      if (sessionStorage.getItem('email-banner-dismissed')) setBannerDismissed(true)
    } catch {}
  }, [])

  // ── Init ──────────────────────────────────────────────────────
  useEffect(() => {
    if (initialConversations.length === 0) fetchConversations()
    fetchTemplates()
    fetchSmsTemplates()
    fetchTeammates()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId)
      setComposingNew(false)
    } else {
      setMessages([])
    }
  }, [selectedId, fetchMessages])

  // ── Realtime subscriptions ────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('comm-hub-' + orgId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `org_id=eq.${orgId}` }, () => fetchConversations())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages' }, (payload) => {
        const newMsg = payload.new as ConversationMessage
        if (newMsg.conversation_id === selectedId) {
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
        } else if (newMsg.direction === 'inbound') {
          // Show toast for background conversations
          const convo = conversations.find(c => c.id === newMsg.conversation_id)
          if (convo) {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
            setToast({ id: newMsg.id, convoId: newMsg.conversation_id, contactName: convo.contact_name || 'Unknown', preview: newMsg.body?.slice(0, 80) || '', channel: newMsg.channel })
            toastTimerRef.current = setTimeout(() => setToast(null), 5500)
          }
        }
        fetchConversations()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_messages' }, (payload) => {
        const updated = payload.new as ConversationMessage
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, orgId, selectedId, conversations, fetchConversations])

  // ── Filter conversations ──────────────────────────────────────
  const filtered = conversations.filter((c) => {
    if (filter === 'inbox') {
      if (c.is_archived) return false
      if (c.status === 'resolved') return false
    } else if (filter === 'starred') {
      if (!c.is_starred) return false
    } else if (filter === 'resolved') {
      if (c.status !== 'resolved') return false
    } else if (filter === 'archived') {
      if (!c.is_archived) return false
    } else if (filter === 'sent') {
      if (c.is_archived) return false
    } else if (filter === 'email') {
      if (c.is_archived) return false
      if (c.last_message_channel !== 'email') return false
    } else if (filter === 'sms') {
      if (c.is_archived) return false
      if (c.last_message_channel !== 'sms') return false
    } else if (filter === 'calls') {
      if (c.is_archived) return false
      if (c.last_message_channel !== 'call') return false
    } else if (filter === 'voicemail') {
      if (c.is_archived) return false
      if (c.last_message_channel !== 'voicemail') return false
    } else if (filter === 'unread') {
      if (c.is_archived) return false
      if (c.unread_count <= 0) return false
    } else if (filter === 'mine') {
      if (c.is_archived) return false
      if (c.assigned_to !== profile.id) return false
    }

    if (search) {
      const q = search.toLowerCase()
      if (
        !c.contact_name?.toLowerCase().includes(q) &&
        !c.contact_email?.toLowerCase().includes(q) &&
        !c.contact_phone?.includes(q) &&
        !c.last_message_preview?.toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  // ── Counts ────────────────────────────────────────────────────
  const counts = {
    inbox:    conversations.filter(c => !c.is_archived && c.status !== 'resolved').length,
    starred:  conversations.filter(c => c.is_starred).length,
    resolved: conversations.filter(c => c.status === 'resolved').length,
    unread:   conversations.filter(c => !c.is_archived && c.unread_count > 0).length,
  }

  // Channel stats for quick view
  const channelStats = {
    email:     conversations.filter(c => !c.is_archived && c.last_message_channel === 'email' && c.unread_count > 0).length,
    sms:       conversations.filter(c => !c.is_archived && c.last_message_channel === 'sms' && c.unread_count > 0).length,
    calls:     conversations.filter(c => !c.is_archived && c.last_message_channel === 'call' && c.unread_count > 0).length,
    voicemail: conversations.filter(c => !c.is_archived && c.last_message_channel === 'voicemail' && c.unread_count > 0).length,
  }

  // ── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      if (e.key === 'j' || e.key === 'ArrowDown') {
        const idx = filtered.findIndex(c => c.id === selectedId)
        const next = filtered[Math.min(idx + 1, filtered.length - 1)]
        if (next && next.id !== selectedId) handleSelectConversation(next.id)
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        const idx = filtered.findIndex(c => c.id === selectedId)
        const prev = filtered[Math.max(idx - 1, 0)]
        if (prev && prev.id !== selectedId) handleSelectConversation(prev.id)
      } else if (e.key === 'Escape') {
        setMobileView('list')
      } else if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        setShowNewModal(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [filtered, selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────
  const handleSelectConversation = (id: string) => {
    setSelectedId(id)
    setMobileView('thread')
    setComposingNew(false)
  }

  const handleBack = () => setMobileView('list')

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
    setShowNewModal(true)
  }

  const handleNewSend = async (data: {
    channel: 'email' | 'sms' | 'note'
    subject?: string
    body: string
    body_html?: string
    photos?: PhotoSelection[]
    cc?: string[]
    bcc?: string[]
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
        body_html: data.body_html,
        photos: data.photos || [],
        cc: data.cc,
        bcc: data.bcc,
        contact_name: data.contact_name || newName || newTo,
      }),
    })
    if (res.ok) {
      const result = await res.json()
      handleMessageSent(result.conversation_id)
    }
  }

  // ── Star / Archive ────────────────────────────────────────────
  const handleStar = async (id: string, starred: boolean) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, is_starred: starred } : c))
    await supabase.from('conversations').update({ is_starred: starred }).eq('id', id)
  }

  const handleArchive = async (id: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, is_archived: true } : c))
    if (selectedId === id) setSelectedId(null)
    await supabase.from('conversations').update({ is_archived: true }).eq('id', id)
  }

  // ── Assign / Resolve / Reopen ─────────────────────────────────
  const handleAssign = async (convoId: string, userId: string | null) => {
    setConversations(prev => prev.map(c => c.id === convoId ? { ...c, assigned_to: userId } : c))
    await supabase.from('conversations').update({ assigned_to: userId }).eq('id', convoId)
  }

  const handleResolve = async (convoId: string) => {
    setConversations(prev => prev.map(c => c.id === convoId ? { ...c, status: 'resolved' } : c))
    await supabase.from('conversations').update({ status: 'resolved' }).eq('id', convoId)
  }

  const handleReopen = async (convoId: string) => {
    setConversations(prev => prev.map(c => c.id === convoId ? { ...c, status: 'open' } : c))
    await supabase.from('conversations').update({ status: 'open' }).eq('id', convoId)
  }

  const handleContactUpdate = (updates: Partial<Conversation>) => {
    setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, ...updates } : c))
  }

  const showEmailBanner = !emailConfigured && !bannerDismissed

  const handleDismissBanner = () => {
    setBannerDismissed(true)
    try { sessionStorage.setItem('email-banner-dismissed', '1') } catch {}
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* ── Email not configured banner ─────────────────────────── */}
      {showEmailBanner && (
        <div style={{ background: 'rgba(245,158,11,0.12)', borderBottom: '1px solid rgba(245,158,11,0.35)', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <TriangleAlert size={15} style={{ color: 'var(--amber)', flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 12, color: 'var(--amber)', lineHeight: 1.5 }}>
            <strong>Email not configured.</strong>{' '}Add{' '}
            <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>RESEND_API_KEY</code>
            {' '}to Vercel env vars. Sign up free at <strong>resend.com</strong>.
          </div>
          <button onClick={handleDismissBanner} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--amber)', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── Column 1: Conversation List ─────────────────────────── */}
        <div
          style={{
            width: 280, minWidth: 280, maxWidth: 280,
            borderRight: '1px solid var(--border)',
            display: mobileView === 'list' ? 'flex' : undefined,
            flexDirection: 'column',
            background: 'var(--surface)',
            flexShrink: 0,
          }}
          className={mobileView === 'list' ? '' : 'hidden md:flex'}
        >
          {/* ── Channel quick-stats row ─────────────────────────── */}
          {Object.values(channelStats).some(v => v > 0) && (
            <div style={{ display: 'flex', gap: 4, padding: '8px 14px', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
              {([
                { key: 'email',     icon: Mail,         label: 'Email',     color: 'var(--accent)' },
                { key: 'sms',       icon: MessageSquare,label: 'SMS',       color: 'var(--green)' },
                { key: 'calls',     icon: PhoneCall,    label: 'Calls',     color: 'var(--cyan)' },
                { key: 'voicemail', icon: Mic,          label: 'VMs',       color: 'var(--amber)' },
              ] as const).map(({ key, icon: Icon, label, color }) => {
                const count = channelStats[key as keyof typeof channelStats]
                if (!count) return null
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(key as InboxLabel)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 99, background: filter === key ? color + '22' : 'var(--bg)', border: `1px solid ${filter === key ? color : 'var(--border)'}`, cursor: 'pointer', fontSize: 11, fontWeight: 700, color: filter === key ? color : 'var(--text3)' }}
                  >
                    <Icon size={11} />
                    <span>{count}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* ConversationList */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
              onStar={handleStar}
              onArchive={handleArchive}
              counts={counts}
            />
          </div>

          {/* InboxSoftphone pinned at bottom */}
          <InboxSoftphone />
        </div>

        {/* ── Column 2: Thread / New Compose ──────────────────────── */}
        <div
          style={{
            flex: 1,
            display: mobileView === 'thread' ? 'flex' : undefined,
            flexDirection: 'column',
            minWidth: 0,
          }}
          className={mobileView === 'thread' ? '' : 'hidden md:flex'}
        >
          {/* Active call banner */}
          <InboxActiveCallBanner />

          {composingNew ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: 'var(--surface)' }}>
                <button onClick={handleBack} className="md:hidden" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 4, display: 'flex', alignItems: 'center' }}>
                  <ArrowLeft size={18} />
                </button>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 16, color: 'var(--text1)' }}>
                  New Message
                </span>
                {(newName || newTo) && (
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                    to {newName || newTo}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>
                Compose your message below
              </div>
              <ComposeArea
                conversation={null}
                profile={profile}
                templates={templates}
                smsTemplates={smsTemplates}
                onSend={handleNewSend}
                composingNew
                defaultTab={newChannel}
                newTo={newTo}
                onNewToChange={setNewTo}
                newName={newName}
                onNewNameChange={setNewName}
              />
            </div>
          ) : selectedConvo ? (
            <MessageThread
              key={selectedConvo.id}
              conversation={selectedConvo}
              messages={messages}
              profile={profile}
              templates={templates}
              smsTemplates={smsTemplates}
              teammates={teammates}
              loading={messagesLoading}
              onBack={handleBack}
              onMessageSent={handleMessageSent}
              onToggleContact={() => setShowContact(!showContact)}
              contactVisible={showContact}
              onAssign={handleAssign}
              onResolve={handleResolve}
              onReopen={handleReopen}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--text3)', background: 'var(--bg)', padding: 32 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 340 }}>
                {[
                  { icon: Mail,         label: 'New Email',   color: 'var(--accent)', channel: 'email' as const },
                  { icon: MessageSquare,label: 'New SMS',     color: 'var(--green)',  channel: 'sms' as const },
                  { icon: Phone,        label: 'Make a Call', color: 'var(--cyan)',   channel: 'call' as const },
                  { icon: Mic,          label: 'Voicemail',   color: 'var(--amber)',  channel: 'voicemail' as const },
                ].map(({ icon: Icon, label, color, channel }) => (
                  <button
                    key={channel}
                    onClick={() => {
                      if (channel === 'voicemail') { setFilter('voicemail'); return }
                      if (channel === 'call') { setShowNewModal(true); return }
                      setShowNewModal(true)
                    }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 12px', borderRadius: 12, background: 'var(--surface)', border: `1px solid var(--surface2)`, cursor: 'pointer', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--surface2)'}
                  >
                    <Icon size={20} style={{ color }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{label}</span>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, textAlign: 'center' }}>
                Select a conversation, or press <kbd style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 4, padding: '1px 5px', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>N</kbd> for new
              </p>
            </div>
          )}
        </div>

        {/* ── Column 3: Contact Panel ─────────────────────────────── */}
        {showContact && selectedConvo && (
          <div
            className="hidden lg:flex"
            style={{ width: 320, minWidth: 320, maxWidth: 320, borderLeft: '1px solid var(--border)', flexDirection: 'column', background: 'var(--surface)', flexShrink: 0 }}
          >
            <ContactPanel
              conversation={selectedConvo}
              messages={messages}
              onClose={() => setShowContact(false)}
              onUpdate={handleContactUpdate}
            />
          </div>
        )}
      </div>

      {/* ── New Conversation Modal ────────────────────────────── */}
      {showNewModal && (
        <NewConversationModal
          profile={profile}
          onSelect={(name, email, phoneNum, channel) => {
            setShowNewModal(false)
            if (channel === 'call') {
              phone?.makeCall(phoneNum!, name)
              return
            }
            setSelectedId(null)
            setComposingNew(true)
            setMobileView('thread')
            setNewName(name)
            setNewTo(channel === 'sms' ? (phoneNum || '') : (email || ''))
            setNewChannel(channel)
          }}
          onClose={() => setShowNewModal(false)}
        />
      )}

      {/* ── Toast notification ───────────────────────────────── */}
      {toast && (
        <InboxToast
          toast={toast}
          onNavigate={id => { handleSelectConversation(id); setMobileView('thread') }}
          onDismiss={() => setToast(null)}
        />
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  )
}
