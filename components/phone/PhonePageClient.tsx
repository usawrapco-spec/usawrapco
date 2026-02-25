'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Phone, PhoneCall, PhoneMissed, PhoneIncoming,
  Users, Settings, List, LayoutDashboard,
  Plus, Edit2, Trash2, Check, X, ChevronDown,
  Copy, RefreshCw, AlertCircle, Voicemail,
  ToggleLeft, ToggleRight, Play, MessageSquare,
  Activity,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { InboxSoftphone } from '@/components/comms/InboxSoftphone'
import { ConversationList } from '@/components/comms/ConversationList'
import type { Conversation, ConversationMessage, InboxLabel } from '@/components/comms/types'
import { usePhone } from '@/components/phone/PhoneProvider'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'
const WEBHOOK_BASE = 'https://app.usawrapco.com'
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

// ── Interfaces ───────────────────────────────────────────────────

interface PhoneConfig {
  id: string
  org_id: string
  main_number: string | null
  greeting_text: string
  hold_music_url: string
  business_hours: Record<string, { open: string; close: string; enabled: boolean }>
  timezone: string
  after_hours_text: string
  max_queue_wait_seconds: number
  ring_timeout_seconds: number
  auto_sms_on_miss: boolean
  record_all_calls: boolean
  enabled: boolean
}

interface Department {
  id: string
  name: string
  dtmf_key: string
  description: string | null
  voicemail_greeting: string | null
  voicemail_email: string | null
  round_robin_index: number
  enabled: boolean
  sort_order: number
}

interface PhoneAgent {
  id: string
  department_id: string
  profile_id: string | null
  cell_number: string
  extension: string | null
  display_name: string | null
  round_robin_order: number
  is_available: boolean
  profile: { id: string; name: string; avatar_url: string | null; role: string } | null
  department: { id: string; name: string } | null
}

interface CallLog {
  id: string
  twilio_call_sid: string | null
  direction: string
  from_number: string | null
  to_number: string | null
  caller_name: string | null
  status: string
  duration_seconds: number
  recording_url: string | null
  voicemail_url: string | null
  voicemail_transcript: string | null
  notes: string | null
  created_at: string
  started_at: string
  ended_at: string | null
  department: { name: string } | null
}

interface Props {
  profile: Profile
  initialConfig: PhoneConfig | null
  initialDepartments: Department[]
  initialAgents: PhoneAgent[]
  initialCallLogs: CallLog[]
  allProfiles: { id: string; name: string; avatar_url: string | null; role: string }[]
  twilioConfigured: boolean
}

type NavTab = 'dashboard' | 'conversations' | 'log' | 'ivr' | 'team' | 'settings'
type LogFilter = 'all' | 'answered' | 'missed' | 'voicemail' | 'outbound'

// ── Helper functions ─────────────────────────────────────────────

function fmtDuration(secs: number) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function fmtPhone(num: string | null) {
  if (!num) return 'Unknown'
  const d = num.replace(/\D/g, '')
  if (d.length === 11 && d[0] === '1') {
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  }
  return num
}

function relTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    completed: { label: 'Answered', color: 'var(--green)' },
    missed:    { label: 'Missed',   color: 'var(--red)' },
    voicemail: { label: 'Voicemail',color: 'var(--amber)' },
    initiated: { label: 'Calling',  color: 'var(--cyan)' },
    ringing:   { label: 'Ringing',  color: 'var(--cyan)' },
    'in-progress': { label: 'Live', color: 'var(--green)' },
    transferred: { label: 'Transferred', color: 'var(--purple)' },
  }
  const s = map[status] || { label: status, color: 'var(--text3)' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: s.color + '22', color: s.color }}>
      {s.label}
    </span>
  )
}

const iStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  background: 'var(--bg)', border: '1px solid var(--surface2)',
  color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box',
}
const btnP: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
const btnS: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--surface2)', cursor: 'pointer', fontSize: 13 }

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      {children}
    </div>
  )
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: 20 }}>
      <h3 style={{ margin: '0 0 14px', color: 'var(--text1)', fontSize: 14, fontWeight: 700 }}>{title}</h3>
      {children}
    </div>
  )
}

function Toggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--surface2)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>{description}</div>
      </div>
      <button onClick={() => onChange(!value)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: value ? 'var(--green)22' : 'var(--surface2)', color: value ? 'var(--green)' : 'var(--text3)' }}>
        {value ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
        {value ? 'Enabled' : 'Disabled'}
      </button>
    </div>
  )
}

function NoteField({ initialValue, onSave }: { initialValue: string; onSave: (v: string) => void }) {
  const [val, setVal] = useState(initialValue)
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input value={val} onChange={e => setVal(e.target.value)} placeholder="Add note..." style={{ flex: 1, padding: '6px 10px', borderRadius: 6, background: 'var(--surface)', border: '1px solid var(--surface2)', color: 'var(--text1)', fontSize: 12 }} />
      <button onClick={() => onSave(val)} style={{ padding: '6px 12px', borderRadius: 6, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Save</button>
    </div>
  )
}

// ── Phone Thread View ───────────────────────────────────────────

function PhoneThreadView({ conversation }: { conversation: Conversation }) {
  const supabase = createClient()
  const phone = usePhone()
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(true)
  const [smsText, setSmsText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = { current: null as HTMLDivElement | null }

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setLoadingMsgs(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [conversation.id])

  useEffect(() => { loadMessages() }, [loadMessages])

  useEffect(() => {
    const ch = supabase.channel(`phone_thread_${conversation.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages', filter: `conversation_id=eq.${conversation.id}` }, () => loadMessages())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [conversation.id, loadMessages])

  async function sendSms() {
    if (!smsText.trim()) return
    setSending(true)
    try {
      await fetch('/api/inbox/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'sms', to_phone: conversation.contact_phone, contact_name: conversation.contact_name, body: smsText.trim() }),
      })
      setSmsText('')
      loadMessages()
    } finally { setSending(false) }
  }

  const channelColor = (ch: string) =>
    ch === 'call' ? 'var(--cyan)' : ch === 'voicemail' ? 'var(--amber)' : ch === 'sms' ? 'var(--green)' : 'var(--text3)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>{conversation.contact_name || 'Unknown'}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtPhone(conversation.contact_phone)}</div>
        </div>
        {conversation.contact_phone && (
          <button
            onClick={() => phone?.makeCall(conversation.contact_phone!, conversation.contact_name || conversation.contact_phone!)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: phone?.callState === 'in-call' ? 'var(--red)22' : 'var(--green)22', color: phone?.callState === 'in-call' ? 'var(--red)' : 'var(--green)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <Phone size={14} />{phone?.callState === 'in-call' ? 'End Call' : 'Call'}
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loadingMsgs ? (
          <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: 32 }}>Loading...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: 32 }}>No messages yet</div>
        ) : messages.map(msg => {
          const isOutbound = msg.direction === 'outbound'
          const isInternal = msg.direction === 'internal'
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOutbound ? 'flex-end' : isInternal ? 'center' : 'flex-start' }}>
              {isInternal ? (
                <div style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', padding: '4px 12px', borderRadius: 99, fontStyle: 'italic' }}>{msg.body}</div>
              ) : (
                <div style={{ maxWidth: '75%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, justifyContent: isOutbound ? 'flex-end' : 'flex-start' }}>
                    <span style={{ fontSize: 10, color: channelColor(msg.channel), fontWeight: 700, textTransform: 'uppercase' }}>{msg.channel}</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{relTime(msg.created_at)}</span>
                    {msg.call_duration_seconds && <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtDuration(msg.call_duration_seconds)}</span>}
                  </div>
                  <div style={{ padding: '9px 13px', borderRadius: isOutbound ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: isOutbound ? 'var(--accent)' : 'var(--surface)', fontSize: 13, color: isOutbound ? '#fff' : 'var(--text1)', lineHeight: 1.5 }}>
                    {msg.body}
                    {msg.voicemail_transcription && (
                      <div style={{ marginTop: 6, fontSize: 12, fontStyle: 'italic', opacity: 0.8 }}>&ldquo;{msg.voicemail_transcription}&rdquo;</div>
                    )}
                    {msg.voicemail_url && (
                      <a href={msg.voicemail_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: isOutbound ? 'rgba(255,255,255,0.8)' : 'var(--amber)', textDecoration: 'none' }}>
                        <Play size={10} />Play voicemail
                      </a>
                    )}
                    {msg.call_recording_url && (
                      <audio controls style={{ marginTop: 6, width: '100%', height: 28 }} src={msg.call_recording_url} />
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        <div ref={el => { bottomRef.current = el }} />
      </div>

      {/* SMS compose (only if has phone number) */}
      {conversation.contact_phone && (
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--surface2)', flexShrink: 0, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={smsText}
            onChange={e => setSmsText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendSms() }}
            placeholder="Type an SMS..."
            rows={2}
            style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--surface2)', borderRadius: 8, padding: '8px 12px', color: 'var(--text1)', fontSize: 13, resize: 'none', outline: 'none' }}
          />
          <button
            onClick={sendSms}
            disabled={sending || !smsText.trim()}
            style={{ padding: '8px 14px', borderRadius: 8, background: smsText.trim() ? 'var(--green)' : 'var(--surface2)', color: smsText.trim() ? '#fff' : 'var(--text3)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Conversations Tab ────────────────────────────────────────────

function PhoneConversationsTab({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<InboxLabel>('calls')
  const [loading, setLoading] = useState(true)

  const selectedConvo = conversations.find(c => c.id === selectedId) || null

  const loadConversations = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('conversations')
      .select('*')
      .eq('org_id', ORG_ID)
      .order('last_message_at', { ascending: false })
      .limit(100)

    if (filter === 'calls') q = q.eq('last_message_channel', 'call')
    else if (filter === 'sms') q = q.eq('last_message_channel', 'sms')
    else if (filter === 'voicemail') q = q.eq('last_message_channel', 'voicemail')
    else if (filter === 'unread') q = q.gt('unread_count', 0)
    else if (filter === 'starred') q = q.eq('is_starred', true)
    else if (filter === 'resolved') q = q.eq('status', 'resolved')
    else q = q.in('last_message_channel', ['call', 'sms', 'voicemail'])

    if (search.trim()) {
      q = q.or(`contact_name.ilike.%${search}%,contact_phone.ilike.%${search}%`)
    }

    const { data } = await q
    setConversations(data || [])
    setLoading(false)
  }, [filter, search])

  useEffect(() => { loadConversations() }, [loadConversations])

  useEffect(() => {
    const channel = supabase.channel('phone_convos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadConversations())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadConversations])

  const unreadCount = conversations.filter(c => c.unread_count > 0).length
  const starredCount = conversations.filter(c => c.is_starred).length

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left: conversation list */}
      <div style={{ width: 300, flexShrink: 0, borderRight: '1px solid var(--surface2)', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNewConversation={() => {}}
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
          loading={loading}
          profile={profile}
          onStar={async (id, starred) => {
            await supabase.from('conversations').update({ is_starred: starred }).eq('id', id)
            setConversations(prev => prev.map(c => c.id === id ? { ...c, is_starred: starred } : c))
          }}
          counts={{ inbox: conversations.length, starred: starredCount, resolved: 0, unread: unreadCount }}
        />
      </div>

      {/* Right: thread */}
      <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
        {selectedConvo ? (
          <PhoneThreadView conversation={selectedConvo} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text3)' }}>
            <Phone size={40} style={{ opacity: 0.3 }} />
            <span style={{ fontSize: 14 }}>Select a conversation</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────

export default function PhonePageClient({
  profile,
  initialConfig,
  initialDepartments,
  initialAgents,
  initialCallLogs,
  allProfiles,
  twilioConfigured,
}: Props) {
  const supabase = createClient()
  const phone = usePhone()

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard')
  const [logFilter, setLogFilter] = useState<LogFilter>('all')
  const [config, setConfig] = useState<PhoneConfig | null>(initialConfig)
  const [departments, setDepartments] = useState<Department[]>(initialDepartments)
  const [agents, setAgents] = useState<PhoneAgent[]>(initialAgents)
  const [callLogs, setCallLogs] = useState<CallLog[]>(initialCallLogs)
  const [liveCalls, setLiveCalls] = useState<CallLog[]>([])
  const [voicemails, setVoicemails] = useState<CallLog[]>([])
  const [saving, setSaving] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [editDept, setEditDept] = useState<Department | null>(null)
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [showAgentModal, setShowAgentModal] = useState(false)
  const [agentForm, setAgentForm] = useState({ profile_id: '', cell_number: '', department_id: '', display_name: '', extension: '' })
  const [editAgent, setEditAgent] = useState<PhoneAgent | null>(null)
  const [showEditAgentModal, setShowEditAgentModal] = useState(false)
  const [deptForm, setDeptForm] = useState<Partial<Department>>({})
  const [copied, setCopied] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Today's stats
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayLogs = callLogs.filter(c => new Date(c.created_at) >= todayStart)
  const todayCount = todayLogs.length
  const missedCount = todayLogs.filter(c => c.status === 'missed').length
  const vmCount = todayLogs.filter(c => c.status === 'voicemail').length

  useEffect(() => {
    setLiveCalls(callLogs.filter(c => ['initiated', 'ringing', 'in-progress'].includes(c.status)))
    setVoicemails(callLogs.filter(c => c.status === 'voicemail' && c.voicemail_url))
  }, [callLogs])

  // Realtime on call_logs
  useEffect(() => {
    const channel = supabase.channel('phone_page_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_logs' }, () => refreshLogs())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const refreshLogs = useCallback(async () => {
    setRefreshing(true)
    const res = await fetch(`/api/phone/call-logs?filter=${logFilter}&limit=50`)
    if (res.ok) setCallLogs(await res.json())
    setRefreshing(false)
  }, [logFilter])

  useEffect(() => { refreshLogs() }, [logFilter])

  async function saveConfig(patch: Partial<PhoneConfig>) {
    setSaving(true)
    const res = await fetch('/api/phone/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    if (res.ok) setConfig(await res.json())
    setSaving(false)
  }

  async function saveDept() {
    setSaving(true)
    const method = editDept?.id ? 'PATCH' : 'POST'
    const body = editDept?.id ? { ...deptForm, id: editDept.id } : deptForm
    const res = await fetch('/api/phone/departments', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      const d = await res.json()
      if (method === 'POST') setDepartments(prev => [...prev, d].sort((a, b) => a.sort_order - b.sort_order))
      else setDepartments(prev => prev.map(dep => dep.id === d.id ? d : dep))
    }
    setSaving(false); setShowDeptModal(false); setEditDept(null); setDeptForm({})
  }

  async function deleteDept(id: string) {
    if (!confirm('Delete this department? Agents will be unassigned.')) return
    await fetch(`/api/phone/departments?id=${id}`, { method: 'DELETE' })
    setDepartments(prev => prev.filter(d => d.id !== id))
  }

  async function saveAgent() {
    setSaving(true)
    const res = await fetch('/api/phone/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...agentForm, profile_id: agentForm.profile_id || null, round_robin_order: agents.length }) })
    if (res.ok) { const r = await fetch('/api/phone/agents'); if (r.ok) setAgents(await r.json()) }
    setSaving(false); setShowAgentModal(false)
    setAgentForm({ profile_id: '', cell_number: '', department_id: '', display_name: '', extension: '' })
  }

  async function deleteAgent(id: string) {
    await fetch(`/api/phone/agents?id=${id}`, { method: 'DELETE' })
    setAgents(prev => prev.filter(a => a.id !== id))
  }

  async function toggleAgent(agent: PhoneAgent) {
    const res = await fetch('/api/phone/agents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: agent.id, is_available: !agent.is_available }) })
    if (res.ok) { const d = await res.json(); setAgents(prev => prev.map(a => a.id === d.id ? { ...a, is_available: d.is_available } : a)) }
  }

  async function saveCallNote(id: string, notes: string) {
    await fetch('/api/phone/call-logs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, notes }) })
    setCallLogs(prev => prev.map(c => c.id === id ? { ...c, notes } : c))
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const navItems: { id: NavTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard',      label: 'Dashboard',     icon: LayoutDashboard },
    { id: 'conversations',  label: 'Conversations',  icon: MessageSquare },
    { id: 'log',            label: 'Call Log',       icon: List },
    { id: 'ivr',            label: 'IVR / Routing',  icon: Activity },
    { id: 'team',           label: 'Team',           icon: Users },
    { id: 'settings',       label: 'Settings',       icon: Settings },
  ]

  const isPhoneActive = phone?.callState !== 'idle'

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Left Sidebar ─────────────────────────────────────── */}
      <div style={{
        width: 240,
        flexShrink: 0,
        borderRight: '1px solid var(--surface2)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--surface)',
      }}>
        {/* Phone number + status */}
        <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid var(--surface2)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: isPhoneActive ? 'var(--green)22' : 'var(--accent)22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Phone size={16} style={{ color: isPhoneActive ? 'var(--green)' : 'var(--accent)' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>
                {config?.main_number ? fmtPhone(config.main_number) : 'No number'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: twilioConfigured ? (phone?.isReady ? 'var(--green)' : 'var(--amber)') : 'var(--red)',
                  animation: phone?.callState === 'in-call' ? 'pulse 1.5s infinite' : 'none',
                }} />
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {!twilioConfigured ? 'Not configured' : phone?.isReady ? 'Ready' : 'Connecting...'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 10 }}>
            {[
              { label: 'Today', value: todayCount, color: 'var(--accent)' },
              { label: 'Missed', value: missedCount, color: 'var(--red)' },
              { label: 'VMs', value: vmCount, color: 'var(--amber)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Live calls indicator */}
          {liveCalls.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '5px 8px', borderRadius: 6, background: 'var(--green)15' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)' }}>{liveCalls.length} active call{liveCalls.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {navItems.map(item => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 16px', width: '100%', textAlign: 'left',
                  background: active ? 'rgba(79,127,255,0.12)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderRadius: '0 20px 20px 0', marginRight: 8,
                  color: active ? 'var(--accent)' : 'var(--text2)',
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface2)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <Icon size={15} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.id === 'log' && missedCount > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', background: 'var(--red)22', padding: '1px 6px', borderRadius: 99 }}>{missedCount}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Softphone at bottom */}
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--surface2)' }}>
          <InboxSoftphone />
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header bar */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--surface2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--text1)', margin: 0 }}>
              {navItems.find(n => n.id === activeTab)?.label}
            </h1>
            {activeTab === 'dashboard' && (
              <p style={{ margin: '1px 0 0', color: 'var(--text3)', fontSize: 12 }}>
                Powered by Twilio · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {twilioConfigured
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: 'var(--green)22', color: 'var(--green)', fontSize: 12, fontWeight: 600 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />System Active
                </span>
              : <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: 'var(--red)22', color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>
                  <AlertCircle size={12} />Not Configured
                </span>
            }
            {(activeTab === 'log' || activeTab === 'dashboard') && (
              <button onClick={refreshLogs} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--surface2)', color: 'var(--text2)', fontSize: 12, cursor: 'pointer' }}>
                <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />Refresh
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflow: activeTab === 'conversations' ? 'hidden' : 'auto', padding: activeTab === 'conversations' ? 0 : '20px 24px' }}>

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>

              {/* Live Calls */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--surface2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PhoneCall size={16} style={{ color: 'var(--green)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 14 }}>Active Calls</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{liveCalls.length} active</span>
                </div>
                {liveCalls.length === 0
                  ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No active calls</div>
                  : liveCalls.map(call => (
                    <div key={call.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--surface2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--green)22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <PhoneIncoming size={16} style={{ color: 'var(--green)' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 14 }}>{call.caller_name || fmtPhone(call.from_number)}</div>
                          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtPhone(call.from_number)} &rarr; {call.department?.name || 'General'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StatusBadge status={call.status} />
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{relTime(call.started_at)}</span>
                        <button
                          onClick={() => phone?.makeCall(call.from_number!, call.caller_name || call.from_number!)}
                          style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--accent)22', color: 'var(--accent)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>

              {/* Voicemails */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--surface2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Voicemail size={16} style={{ color: 'var(--amber)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 14 }}>Recent Voicemails</span>
                  </div>
                  <button onClick={() => setActiveTab('log')} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>View all</button>
                </div>
                {voicemails.length === 0
                  ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No voicemails</div>
                  : voicemails.slice(0, 5).map(vm => (
                    <div key={vm.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--surface2)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 14 }}>{fmtPhone(vm.from_number)}</span>
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>&bull; {vm.department?.name || 'General'} &bull; {relTime(vm.created_at)}</span>
                          </div>
                          {vm.voicemail_transcript && (
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--text2)', fontStyle: 'italic', lineHeight: 1.5 }}>
                              &ldquo;{vm.voicemail_transcript}&rdquo;
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {vm.voicemail_url && (
                            <a href={vm.voicemail_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: 'var(--amber)22', color: 'var(--amber)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                              <Play size={11} />Play
                            </a>
                          )}
                          <button
                            onClick={() => phone?.makeCall(vm.from_number!, fmtPhone(vm.from_number))}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: 'var(--green)22', color: 'var(--green)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                          >
                            <Phone size={11} />Call back
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>

              {/* Today's summary row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {[
                  { label: 'Total calls today', value: todayCount, color: 'var(--accent)', icon: PhoneCall },
                  { label: 'Answered', value: todayLogs.filter(c => c.status === 'completed').length, color: 'var(--green)', icon: Phone },
                  { label: 'Missed', value: missedCount, color: 'var(--red)', icon: PhoneMissed },
                  { label: 'Voicemails', value: vmCount, color: 'var(--amber)', icon: Voicemail },
                ].map(s => {
                  const Icon = s.icon
                  return (
                    <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: s.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={16} style={{ color: s.color }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Available agents */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 10 }}>Agent Status</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {agents.length === 0
                    ? <span style={{ fontSize: 13, color: 'var(--text3)' }}>No agents configured</span>
                    : agents.map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 99, background: a.is_available ? 'var(--green)15' : 'var(--surface2)', border: `1px solid ${a.is_available ? 'var(--green)33' : 'var(--surface2)'}` }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: a.is_available ? 'var(--green)' : 'var(--text3)', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: a.is_available ? 'var(--text1)' : 'var(--text3)' }}>{a.display_name || a.profile?.name || 'Agent'}</span>
                        {a.extension && <span style={{ fontSize: 10, color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace' }}>×{a.extension}</span>}
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* ── CONVERSATIONS ── */}
          {activeTab === 'conversations' && (
            <PhoneConversationsTab profile={profile} />
          )}

          {/* ── CALL LOG ── */}
          {activeTab === 'log' && (
            <div style={{ maxWidth: 900 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {(['all', 'answered', 'missed', 'voicemail', 'outbound'] as LogFilter[]).map(f => (
                  <button key={f} onClick={() => setLogFilter(f)} style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: logFilter === f ? 'var(--accent)' : 'var(--surface)', color: logFilter === f ? '#fff' : 'var(--text2)', border: `1px solid ${logFilter === f ? 'var(--accent)' : 'var(--surface2)'}`, cursor: 'pointer', textTransform: 'capitalize' }}>
                    {f}
                  </button>
                ))}
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, overflow: 'hidden' }}>
                {callLogs.length === 0
                  ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>No calls found</div>
                  : callLogs.map(call => (
                    <div key={call.id}>
                      <div
                        onClick={() => setExpandedLog(expandedLog === call.id ? null : call.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--surface2)', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: call.direction === 'outbound' ? 'var(--cyan)22' : call.status === 'missed' ? 'var(--red)22' : call.status === 'voicemail' ? 'var(--amber)22' : 'var(--green)22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {call.direction === 'outbound'
                            ? <Phone size={14} style={{ color: 'var(--cyan)' }} />
                            : call.status === 'missed' ? <PhoneMissed size={14} style={{ color: 'var(--red)' }} />
                            : call.status === 'voicemail' ? <Voicemail size={14} style={{ color: 'var(--amber)' }} />
                            : <PhoneIncoming size={14} style={{ color: 'var(--green)' }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 13 }}>
                            {call.caller_name || fmtPhone(call.direction === 'outbound' ? call.to_number : call.from_number)}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                            {call.department?.name || (call.direction === 'outbound' ? 'Outbound' : 'General')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                          <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtDuration(call.duration_seconds)}</span>
                          <StatusBadge status={call.status} />
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{relTime(call.created_at)}</span>
                          <button
                            onClick={e => { e.stopPropagation(); phone?.makeCall(call.direction === 'outbound' ? call.to_number! : call.from_number!, call.caller_name || undefined) }}
                            style={{ padding: '3px 8px', borderRadius: 6, background: 'var(--accent)22', color: 'var(--accent)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                          >
                            Call
                          </button>
                          <ChevronDown size={14} style={{ color: 'var(--text3)', transform: expandedLog === call.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </div>
                      </div>
                      {expandedLog === call.id && (
                        <div style={{ padding: 16, background: 'var(--bg)', borderBottom: '1px solid var(--surface2)' }}>
                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            {call.recording_url && (
                              <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recording</div>
                                <audio controls style={{ width: '100%' }} src={call.recording_url} />
                              </div>
                            )}
                            {call.voicemail_url && (
                              <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Voicemail</div>
                                <audio controls style={{ width: '100%' }} src={call.voicemail_url} />
                              </div>
                            )}
                            {call.voicemail_transcript && (
                              <div style={{ flex: 2, minWidth: 250 }}>
                                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Transcript</div>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text2)', fontStyle: 'italic', background: 'var(--surface)', padding: '10px 12px', borderRadius: 8 }}>
                                  &ldquo;{call.voicemail_transcript}&rdquo;
                                </p>
                              </div>
                            )}
                            <div style={{ width: '100%' }}>
                              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</div>
                              <NoteField initialValue={call.notes || ''} onSave={v => saveCallNote(call.id, v)} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* ── IVR / ROUTING ── */}
          {activeTab === 'ivr' && (
            <div style={{ maxWidth: 800 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button
                  onClick={() => { setEditDept(null); setDeptForm({ name: '', dtmf_key: '', description: '', voicemail_email: 'fleet@usawrapco.com', enabled: true, sort_order: departments.length + 1 }); setShowDeptModal(true) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                >
                  <Plus size={14} />Add Department
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {departments.map(dept => {
                  const deptAgents = agents.filter(a => a.department_id === dept.id)
                  return (
                    <div key={dept.id} style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent)22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{dept.dtmf_key}</div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 15 }}>{dept.name}</div>
                            {dept.description && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>&ldquo;{dept.description}&rdquo;</div>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: dept.enabled ? 'var(--green)' : 'var(--text3)', fontWeight: 600 }}>{dept.enabled ? 'Active' : 'Disabled'}</span>
                          <button onClick={() => { setEditDept(dept); setDeptForm({ ...dept }); setShowDeptModal(true) }} style={{ padding: '5px 10px', borderRadius: 6, background: 'var(--surface2)', border: 'none', color: 'var(--text2)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Edit2 size={12} />Edit</button>
                          <button onClick={() => deleteDept(dept.id)} style={{ padding: 5, borderRadius: 6, background: 'var(--red)11', border: 'none', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={13} /></button>
                        </div>
                      </div>
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--surface2)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text2)' }}>Agents: </span>
                          {deptAgents.length === 0
                            ? <span style={{ color: 'var(--amber)' }}>None assigned</span>
                            : deptAgents.map(a => a.display_name || a.profile?.name || a.cell_number).join(', ')
                          }
                        </div>
                        {dept.voicemail_email && <div style={{ fontSize: 12, color: 'var(--text3)' }}><span style={{ fontWeight: 600, color: 'var(--text2)' }}>VM &rarr; </span>{dept.voicemail_email}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── TEAM ── */}
          {activeTab === 'team' && (
            <div style={{ maxWidth: 800 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button onClick={() => setShowAgentModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} />Add Agent
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {agents.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 14 }}>
                    No agents configured. Add agents to start receiving calls.
                  </div>
                )}
                {agents.map(agent => (
                  <div key={agent.id} style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      {agent.profile?.avatar_url
                        ? <img src={agent.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <Users size={16} style={{ color: 'var(--text3)' }} />
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 14 }}>{agent.display_name || agent.profile?.name || 'Unnamed Agent'}</span>
                        {agent.extension && (
                          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan)', background: 'var(--cyan)15', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>
                            ext.{agent.extension}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', gap: 10 }}>
                        <span>{agent.department?.name || 'No dept'}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fmtPhone(agent.cell_number)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => toggleAgent(agent)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: agent.is_available ? 'var(--green)22' : 'var(--surface2)', color: agent.is_available ? 'var(--green)' : 'var(--text3)' }}>
                        {agent.is_available ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {agent.is_available ? 'Available' : 'Offline'}
                      </button>
                      <button onClick={() => { setEditAgent(agent); setShowEditAgentModal(true) }} style={{ padding: '5px 8px', borderRadius: 6, background: 'var(--surface2)', border: 'none', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <Edit2 size={12} />Edit
                      </button>
                      <button onClick={() => phone?.makeCall(agent.cell_number, agent.display_name || agent.profile?.name || agent.cell_number)} style={{ padding: '5px 8px', borderRadius: 6, background: 'var(--accent)22', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <Phone size={12} />Call
                      </button>
                      <button onClick={() => deleteAgent(agent.id)} style={{ padding: 5, borderRadius: 6, background: 'var(--red)11', border: 'none', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 700 }}>
              {!twilioConfigured && (
                <div style={{ background: 'rgba(79,127,255,0.08)', border: '1px solid var(--accent)', borderRadius: 12, padding: 24 }}>
                  <h3 style={{ margin: '0 0 16px', color: 'var(--accent)', fontSize: 16, fontWeight: 700 }}>Phone System Setup</h3>
                  <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[
                      { n: 1, title: 'Get a Twilio account', sub: 'Sign up at twilio.com — free trial number included' },
                      { n: 2, title: 'Buy a local Gig Harbor number (+1 253 area code)', sub: 'Twilio Console → Phone Numbers → Buy a Number' },
                      { n: 3, title: 'Add env variables to Vercel', code: 'TWILIO_ACCOUNT_SID=ACxxxx\nTWILIO_AUTH_TOKEN=xxxx\nTWILIO_PHONE_NUMBER=+12535550100' },
                      { n: 4, title: 'Configure webhook in Twilio Console', sub: 'Phone Numbers → Your Number → Voice & Fax → Incoming Webhook:', code: `${WEBHOOK_BASE}/api/phone/incoming` },
                      { n: 5, title: "Add your team's cell numbers in the Team tab", sub: 'Every agent needs their personal cell number set to receive forwarded calls' },
                    ].map(step => (
                      <li key={step.n} style={{ display: 'flex', gap: 12 }}>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{step.n}</span>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 13 }}>{step.title}</div>
                          {step.sub && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{step.sub}</div>}
                          {step.code && (
                            <div style={{ position: 'relative', marginTop: 6 }}>
                              <code style={{ display: 'block', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 6, fontSize: 12, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre', lineHeight: 1.6 }}>{step.code}</code>
                              <button onClick={() => copyText(step.code!, `s${step.n}`)} style={{ position: 'absolute', top: 6, right: 6, padding: 4, borderRadius: 4, background: 'var(--surface)', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>
                                {copied === `s${step.n}` ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <Sec title="Twilio Webhook URLs">
                {[
                  { label: 'Incoming Voice (configure in Twilio)', url: `${WEBHOOK_BASE}/api/phone/incoming` },
                  { label: 'Status Callback', url: `${WEBHOOK_BASE}/api/phone/status` },
                  { label: 'Recording Callback', url: `${WEBHOOK_BASE}/api/phone/recording` },
                ].map(w => (
                  <div key={w.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{w.label}</div>
                      <code style={{ fontSize: 12, color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace' }}>{w.url}</code>
                    </div>
                    <button onClick={() => copyText(w.url, w.label)} style={{ padding: '5px 8px', borderRadius: 6, background: 'var(--surface2)', border: 'none', color: copied === w.label ? 'var(--green)' : 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      {copied === w.label ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                ))}
              </Sec>

              {config && (
                <>
                  <Sec title="Greeting Message">
                    <textarea defaultValue={config.greeting_text} rows={3} onBlur={e => saveConfig({ greeting_text: e.target.value })} style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--surface2)', borderRadius: 8, padding: '10px 12px', color: 'var(--text1)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                  </Sec>

                  <Sec title="Business Hours">
                    {DAYS.map(day => {
                      const hours = config.business_hours?.[day] || { open: '08:00', close: '17:00', enabled: false }
                      return (
                        <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div style={{ width: 36, fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{DAY_LABELS[day]}</div>
                          <input type="time" defaultValue={hours.open} disabled={!hours.enabled} onBlur={e => saveConfig({ business_hours: { ...config.business_hours, [day]: { ...hours, open: e.target.value } } })} style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--surface2)', color: hours.enabled ? 'var(--text1)' : 'var(--text3)', fontSize: 12, width: 90 }} />
                          <span style={{ color: 'var(--text3)', fontSize: 12 }}>to</span>
                          <input type="time" defaultValue={hours.close} disabled={!hours.enabled} onBlur={e => saveConfig({ business_hours: { ...config.business_hours, [day]: { ...hours, close: e.target.value } } })} style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--surface2)', color: hours.enabled ? 'var(--text1)' : 'var(--text3)', fontSize: 12, width: 90 }} />
                          <button onClick={() => { const u = { ...config.business_hours, [day]: { ...hours, enabled: !hours.enabled } }; saveConfig({ business_hours: u }); setConfig(p => p ? { ...p, business_hours: u } : p) }} style={{ padding: '4px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: hours.enabled ? 'var(--green)22' : 'var(--surface2)', color: hours.enabled ? 'var(--green)' : 'var(--text3)' }}>
                            {hours.enabled ? 'Open' : 'Closed'}
                          </button>
                        </div>
                      )
                    })}
                  </Sec>

                  <Sec title="After Hours Message">
                    <textarea defaultValue={config.after_hours_text} rows={3} onBlur={e => saveConfig({ after_hours_text: e.target.value })} style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--surface2)', borderRadius: 8, padding: '10px 12px', color: 'var(--text1)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                  </Sec>

                  <Sec title="Call Options">
                    <Toggle label="Auto-SMS on missed call" description='Sends "Sorry we missed you" text to every missed caller' value={config.auto_sms_on_miss} onChange={v => { saveConfig({ auto_sms_on_miss: v }); setConfig(p => p ? { ...p, auto_sms_on_miss: v } : p) }} />
                    <Toggle label="Record all calls" description="All inbound and outbound calls are recorded" value={config.record_all_calls} onChange={v => { saveConfig({ record_all_calls: v }); setConfig(p => p ? { ...p, record_all_calls: v } : p) }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--surface2)' }}>
                      <div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>Max hold time</div><div style={{ fontSize: 12, color: 'var(--text3)' }}>Offer voicemail after this long in queue</div></div>
                      <select value={config.max_queue_wait_seconds} onChange={e => { const v = parseInt(e.target.value); saveConfig({ max_queue_wait_seconds: v }); setConfig(p => p ? { ...p, max_queue_wait_seconds: v } : p) }} style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--surface2)', color: 'var(--text1)', fontSize: 13 }}>
                        <option value={60}>1 minute</option>
                        <option value={120}>2 minutes</option>
                        <option value={180}>3 minutes</option>
                        <option value={300}>5 minutes</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                      <div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>Ring timeout per agent</div><div style={{ fontSize: 12, color: 'var(--text3)' }}>Seconds before trying the next agent</div></div>
                      <select value={config.ring_timeout_seconds} onChange={e => { const v = parseInt(e.target.value); saveConfig({ ring_timeout_seconds: v }); setConfig(p => p ? { ...p, ring_timeout_seconds: v } : p) }} style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--surface2)', color: 'var(--text1)', fontSize: 13 }}>
                        <option value={15}>15 seconds</option>
                        <option value={20}>20 seconds</option>
                        <option value={25}>25 seconds</option>
                        <option value={30}>30 seconds</option>
                      </select>
                    </div>
                  </Sec>
                </>
              )}

              {saving && <div style={{ fontSize: 12, color: 'var(--green)', textAlign: 'right' }}>Saving...</div>}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showDeptModal && (
        <Modal title={editDept ? 'Edit Department' : 'Add Department'} onClose={() => { setShowDeptModal(false); setEditDept(null); setDeptForm({}) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FF label="Department Name"><input value={deptForm.name || ''} onChange={e => setDeptForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Sales" style={iStyle} /></FF>
            <FF label="IVR Key (caller presses)"><input value={deptForm.dtmf_key || ''} onChange={e => setDeptForm(p => ({ ...p, dtmf_key: e.target.value }))} placeholder="1" maxLength={1} style={iStyle} /></FF>
            <FF label="Menu Description (read aloud)"><input value={deptForm.description || ''} onChange={e => setDeptForm(p => ({ ...p, description: e.target.value }))} placeholder="for sales inquiries and estimates" style={iStyle} /></FF>
            <FF label="Voicemail Greeting"><textarea value={deptForm.voicemail_greeting || ''} onChange={e => setDeptForm(p => ({ ...p, voicemail_greeting: e.target.value }))} rows={3} style={{ ...iStyle, resize: 'vertical' }} /></FF>
            <FF label="VM Email Recipient"><input type="email" value={deptForm.voicemail_email || ''} onChange={e => setDeptForm(p => ({ ...p, voicemail_email: e.target.value }))} style={iStyle} /></FF>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => { setShowDeptModal(false); setEditDept(null) }} style={btnS}>Cancel</button>
              <button onClick={saveDept} disabled={saving} style={btnP}>{saving ? 'Saving...' : 'Save Department'}</button>
            </div>
          </div>
        </Modal>
      )}

      {showAgentModal && (
        <Modal title="Add Phone Agent" onClose={() => setShowAgentModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FF label="Team Member">
              <select value={agentForm.profile_id} onChange={e => { const p = allProfiles.find(pr => pr.id === e.target.value); setAgentForm(prev => ({ ...prev, profile_id: e.target.value, display_name: p?.name || '' })) }} style={iStyle}>
                <option value="">Select a team member...</option>
                {allProfiles.map(p => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
              </select>
            </FF>
            <FF label="Cell Number (E.164)"><input value={agentForm.cell_number} onChange={e => setAgentForm(p => ({ ...p, cell_number: e.target.value }))} placeholder="+12535550123" style={iStyle} /></FF>
            <FF label="Extension (optional)"><input value={agentForm.extension} onChange={e => setAgentForm(p => ({ ...p, extension: e.target.value }))} placeholder="e.g. 101" maxLength={6} style={iStyle} /></FF>
            <FF label="Department">
              <select value={agentForm.department_id} onChange={e => setAgentForm(p => ({ ...p, department_id: e.target.value }))} style={iStyle}>
                <option value="">Select department...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </FF>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setShowAgentModal(false)} style={btnS}>Cancel</button>
              <button onClick={saveAgent} disabled={saving || !agentForm.cell_number} style={btnP}>{saving ? 'Saving...' : 'Add Agent'}</button>
            </div>
          </div>
        </Modal>
      )}

      {showEditAgentModal && editAgent && (
        <Modal title="Edit Agent" onClose={() => { setShowEditAgentModal(false); setEditAgent(null) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FF label="Display Name">
              <input defaultValue={editAgent.display_name || editAgent.profile?.name || ''} onBlur={async e => {
                const res = await fetch('/api/phone/agents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editAgent.id, display_name: e.target.value }) })
                if (res.ok) { const d = await res.json(); setAgents(prev => prev.map(a => a.id === d.id ? { ...a, display_name: d.display_name } : a)) }
              }} style={iStyle} />
            </FF>
            <FF label="Cell Number">
              <input defaultValue={editAgent.cell_number} onBlur={async e => {
                const res = await fetch('/api/phone/agents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editAgent.id, cell_number: e.target.value }) })
                if (res.ok) { const d = await res.json(); setAgents(prev => prev.map(a => a.id === d.id ? { ...a, cell_number: d.cell_number } : a)) }
              }} style={iStyle} />
            </FF>
            <FF label="Extension">
              <input defaultValue={editAgent.extension || ''} placeholder="e.g. 101" maxLength={6} onBlur={async e => {
                const ext = e.target.value.trim() || null
                const res = await fetch('/api/phone/agents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editAgent.id, extension: ext }) })
                if (res.ok) { const d = await res.json(); setAgents(prev => prev.map(a => a.id === d.id ? { ...a, extension: d.extension } : a)) }
              }} style={iStyle} />
            </FF>
            <FF label="Department">
              <select defaultValue={editAgent.department_id} onChange={async e => {
                const res = await fetch('/api/phone/agents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editAgent.id, department_id: e.target.value || null }) })
                if (res.ok) { const d = await res.json(); setAgents(prev => prev.map(a => a.id === d.id ? { ...a, department_id: d.department_id } : a)) }
              }} style={iStyle}>
                <option value="">No department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </FF>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => { setShowEditAgentModal(false); setEditAgent(null) }} style={btnP}>Done</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
