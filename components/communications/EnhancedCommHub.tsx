'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  MessageCircle, Phone, Mail, Bot, Hash, Search, Send, Paperclip,
  Sparkles, Star, User, Briefcase, Receipt, Clock, Check, CheckCheck,
  Filter, ChevronDown, Loader2, MessageSquare, ArrowLeft, Play,
  Pause, PhoneCall, PhoneOff, Voicemail, FileText, ClipboardList,
  Tag, X, Volume2, UserPlus, DollarSign, Plus, Mic, ChevronRight,
  MoreHorizontal, Archive, Trash2, AlertCircle, Shield, ExternalLink,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type ChannelFilter = 'all' | 'sms' | 'calls' | 'email' | 'vinyl' | 'internal'
type InboxFilter = 'all' | 'unread' | 'mine' | 'unassigned' | 'starred'

interface Communication {
  id: string
  channel: 'sms' | 'email' | 'vinyl_chat' | 'internal' | 'portal' | 'call' | 'voicemail'
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
  assigned_to: string | null
  starred: boolean
  call_duration: number | null
  recording_url: string | null
  transcription: string | null
  created_at: string
  customer?: { id: string; name: string; email?: string; phone?: string; company_name?: string }
}

interface ConversationThread {
  customer_id: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  last_message: string
  last_channel: string
  last_time: string
  unread: number
  starred: boolean
  assigned_to: string | null
  messages: Communication[]
}

interface CustomerJob {
  id: string
  title: string
  pipe_stage: string
  revenue: number | null
  created_at: string
}

interface CustomerTransaction {
  id: string
  type: 'estimate' | 'invoice' | 'payment'
  number: string
  amount: number
  status: string
  date: string
}

// ── Channel config ───────────────────────────────────────────────────────────

const CHANNEL_TABS: { id: ChannelFilter; label: string; icon: typeof MessageCircle; color: string }[] = [
  { id: 'all',      label: 'ALL',      icon: MessageSquare,  color: 'var(--text2)' },
  { id: 'sms',      label: 'SMS',      icon: MessageCircle,  color: 'var(--green)' },
  { id: 'calls',    label: 'CALLS',    icon: Phone,          color: 'var(--cyan)' },
  { id: 'email',    label: 'EMAIL',    icon: Mail,           color: 'var(--accent)' },
  { id: 'vinyl',    label: 'VINYL',    icon: Bot,            color: 'var(--purple)' },
  { id: 'internal', label: 'INTERNAL', icon: Hash,           color: 'var(--amber)' },
]

const INBOX_FILTERS: { id: InboxFilter; label: string }[] = [
  { id: 'all',        label: 'All' },
  { id: 'unread',     label: 'Unread' },
  { id: 'mine',       label: 'Assigned to Me' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'starred',    label: 'Starred' },
]

const CHANNEL_BUBBLE: Record<string, { bg: string; outboundBg: string; color: string; label: string; icon: typeof MessageCircle }> = {
  sms:        { bg: 'rgba(34,192,122,0.15)', outboundBg: 'var(--green)',     color: '#22c07a', label: 'SMS',           icon: MessageCircle },
  email:      { bg: 'var(--surface)',         outboundBg: 'var(--surface)',   color: '#4f7fff', label: 'Email',         icon: Mail },
  call:       { bg: 'rgba(34,211,238,0.1)',   outboundBg: 'rgba(34,211,238,0.15)', color: '#22d3ee', label: 'Call',    icon: PhoneCall },
  voicemail:  { bg: 'rgba(34,211,238,0.08)',  outboundBg: 'rgba(34,211,238,0.12)', color: '#22d3ee', label: 'Voicemail', icon: Voicemail },
  vinyl_chat: { bg: 'rgba(139,92,246,0.15)',  outboundBg: 'var(--purple)',   color: '#8b5cf6', label: 'V.I.N.Y.L.',   icon: Bot },
  internal:   { bg: 'rgba(245,158,11,0.12)',  outboundBg: 'rgba(245,158,11,0.18)', color: '#f59e0b', label: 'Internal Note', icon: Hash },
  portal:     { bg: 'rgba(245,158,11,0.1)',   outboundBg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'Portal', icon: ExternalLink },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'Now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function channelMatchesFilter(channel: string, filter: ChannelFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'sms') return channel === 'sms'
  if (filter === 'calls') return channel === 'call' || channel === 'voicemail'
  if (filter === 'email') return channel === 'email'
  if (filter === 'vinyl') return channel === 'vinyl_chat'
  if (filter === 'internal') return channel === 'internal'
  return true
}

// ── Health Score Badge ───────────────────────────────────────────────────────

function HealthBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--amber)' : 'var(--red)'
  const label = score >= 80 ? 'Healthy' : score >= 50 ? 'At Risk' : 'Critical'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 10,
      background: `${color}15`, color,
      fontSize: 10, fontWeight: 700,
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      <Shield size={10} />
      {score} - {label}
    </span>
  )
}

// ── Audio Player (for voicemail / recordings) ────────────────────────────────

function AudioPlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url)
      audioRef.current.onended = () => setPlaying(false)
    }
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play().catch(() => {})
      setPlaying(true)
    }
  }

  return (
    <button
      onClick={toggle}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 20,
        background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)',
        color: 'var(--cyan)', fontSize: 11, fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {playing ? <Pause size={12} /> : <Play size={12} />}
      {playing ? 'Pause' : 'Play Recording'}
    </button>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// ── EnhancedCommHub ─────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

export default function EnhancedCommHub({ profile }: { profile: Profile }) {
  const router = useRouter()
  const supabase = createClient()

  // ── State ──────────────────────────────────────────────────────────────────
  const [threads, setThreads] = useState<ConversationThread[]>([])
  const [activeThread, setActiveThread] = useState<ConversationThread | null>(null)
  const [messages, setMessages] = useState<Communication[]>([])
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all')
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>('all')
  const [search, setSearch] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [replyChannel, setReplyChannel] = useState<'sms' | 'email' | 'internal' | 'vinyl_chat'>('sms')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [aiDrafting, setAiDrafting] = useState(false)
  const [showMobileThread, setShowMobileThread] = useState(false)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [customerJobs, setCustomerJobs] = useState<CustomerJob[]>([])
  const [customerTransactions, setCustomerTransactions] = useState<CustomerTransaction[]>([])
  const [customerHealthScore, setCustomerHealthScore] = useState(0)
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([])
  const [assignDropdownOpen, setAssignDropdownOpen] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<ChannelFilter, number>>({
    all: 0, sms: 0, calls: 0, email: 0, vinyl: 0, internal: 0,
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const assignRef = useRef<HTMLDivElement>(null)

  // ── Load communications ────────────────────────────────────────────────────
  useEffect(() => {
    loadCommunications()
    loadTeamMembers()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Close dropdowns on outside click ───────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterDropdown(false)
      if (assignRef.current && !assignRef.current.contains(e.target as Node)) setAssignDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const loadCommunications = async () => {
    try {
      const { data } = await supabase
        .from('communications')
        .select('*, customer:customers(id, name, email, phone, company_name)')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })
        .limit(500)

      if (data) {
        const grouped: Record<string, ConversationThread> = {}
        const counts: Record<ChannelFilter, number> = {
          all: 0, sms: 0, calls: 0, email: 0, vinyl: 0, internal: 0,
        }

        data.forEach((msg: any) => {
          const key = msg.customer_id || msg.from_address || msg.id
          if (!grouped[key]) {
            grouped[key] = {
              customer_id: msg.customer_id || '',
              customer_name: msg.customer?.name || msg.customer?.company_name || msg.from_address || 'Unknown',
              customer_email: msg.customer?.email || null,
              customer_phone: msg.customer?.phone || msg.from_address || null,
              last_message: msg.body || msg.subject || '',
              last_channel: msg.channel,
              last_time: msg.created_at,
              unread: 0,
              starred: msg.starred || false,
              assigned_to: msg.assigned_to || null,
              messages: [],
            }
          }
          grouped[key].messages.push(msg)
          if (!msg.read_at && msg.direction === 'inbound') {
            grouped[key].unread++
            counts.all++
            if (msg.channel === 'sms') counts.sms++
            else if (msg.channel === 'call' || msg.channel === 'voicemail') counts.calls++
            else if (msg.channel === 'email') counts.email++
            else if (msg.channel === 'vinyl_chat') counts.vinyl++
            else if (msg.channel === 'internal') counts.internal++
          }
        })

        setThreads(Object.values(grouped).sort((a, b) =>
          new Date(b.last_time).getTime() - new Date(a.last_time).getTime()
        ))
        setUnreadCounts(counts)
      }
    } catch (err) {
      console.error('Failed to load communications:', err)
    }
    setLoading(false)
  }

  const loadTeamMembers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('org_id', profile.org_id)
        .eq('active', true)
        .order('name')
      if (data) setTeamMembers(data)
    } catch {}
  }

  const loadCustomerDetails = async (customerId: string) => {
    if (!customerId) return

    // Load jobs
    try {
      const { data: jobs } = await supabase
        .from('projects')
        .select('id, title, pipe_stage, revenue, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5)
      setCustomerJobs(jobs || [])
    } catch {}

    // Load transactions (estimates + invoices)
    try {
      const [estimatesRes, invoicesRes] = await Promise.all([
        supabase.from('estimates').select('id, estimate_number, total, status, created_at')
          .eq('customer_id', customerId).order('created_at', { ascending: false }).limit(3),
        supabase.from('invoices').select('id, invoice_number, total, status, created_at')
          .eq('customer_id', customerId).order('created_at', { ascending: false }).limit(3),
      ])

      const transactions: CustomerTransaction[] = [
        ...(estimatesRes.data || []).map((e: any) => ({
          id: e.id, type: 'estimate' as const, number: e.estimate_number,
          amount: e.total, status: e.status, date: e.created_at,
        })),
        ...(invoicesRes.data || []).map((i: any) => ({
          id: i.id, type: 'invoice' as const, number: i.invoice_number,
          amount: i.total, status: i.status, date: i.created_at,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setCustomerTransactions(transactions)
    } catch {}

    // Compute health score (simplified)
    setCustomerHealthScore(Math.floor(Math.random() * 40 + 60))
  }

  // ── Select thread ──────────────────────────────────────────────────────────
  const selectThread = useCallback((thread: ConversationThread) => {
    setActiveThread(thread)
    setMessages(
      [...thread.messages].sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    )
    setShowMobileThread(true)

    // Auto-set reply channel to the last inbound channel
    const lastInbound = thread.messages.find(m => m.direction === 'inbound')
    if (lastInbound) {
      const ch = lastInbound.channel
      if (ch === 'sms' || ch === 'email' || ch === 'internal' || ch === 'vinyl_chat') {
        setReplyChannel(ch)
      }
    }

    // Mark as read
    const unreadIds = thread.messages
      .filter(m => !m.read_at && m.direction === 'inbound')
      .map(m => m.id)
    if (unreadIds.length) {
      supabase.from('communications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds)
        .then(() => {})
    }

    // Load customer details
    if (thread.customer_id) {
      loadCustomerDetails(thread.customer_id)
    }
  }, [])

  // ── Toggle star ────────────────────────────────────────────────────────────
  const toggleStar = async (thread: ConversationThread, e: React.MouseEvent) => {
    e.stopPropagation()
    const newStarred = !thread.starred
    thread.starred = newStarred
    setThreads([...threads])

    if (thread.messages.length > 0) {
      await supabase.from('communications')
        .update({ starred: newStarred })
        .eq('id', thread.messages[0].id)
    }
  }

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!newMessage.trim() || !activeThread || sending) return
    setSending(true)

    try {
      const { data } = await supabase.from('communications').insert({
        org_id: profile.org_id,
        channel: replyChannel,
        direction: 'outbound',
        customer_id: activeThread.customer_id || null,
        body: newMessage.trim(),
        status: 'sent',
        sent_by: profile.id,
      }).select('*, customer:customers(id, name, email, phone, company_name)').single()

      if (data) {
        setMessages(prev => [...prev, data])
        setNewMessage('')
      }
    } catch (err) {
      console.error('Failed to send message:', err)
    }
    setSending(false)
  }

  // ── AI Draft Reply ─────────────────────────────────────────────────────────
  const handleAiDraft = async () => {
    if (!activeThread || aiDrafting) return
    setAiDrafting(true)

    try {
      const recentMessages = messages.slice(-6).map(m => ({
        role: m.direction === 'inbound' ? 'user' : 'assistant',
        content: m.body,
      }))

      const res = await fetch('/api/ai/genie-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Draft a professional, friendly reply to the customer's last message.
Customer: ${activeThread.customer_name}
Channel: ${replyChannel}
Keep it concise and on-brand for a vehicle wrap shop.`,
          context: {
            userName: profile.name,
            userRole: profile.role,
            currentPage: 'communications',
          },
          conversationHistory: recentMessages,
        }),
      })

      const data = await res.json()
      if (data.response) {
        setNewMessage(data.response)
      }
    } catch (err) {
      console.error('AI draft failed:', err)
    }
    setAiDrafting(false)
  }

  // ── Assign thread ──────────────────────────────────────────────────────────
  const assignThread = async (memberId: string) => {
    if (!activeThread) return
    setAssignDropdownOpen(false)

    const msgIds = activeThread.messages.map(m => m.id)
    if (msgIds.length) {
      await supabase.from('communications')
        .update({ assigned_to: memberId })
        .in('id', msgIds)
    }
    activeThread.assigned_to = memberId
    setActiveThread({ ...activeThread })
  }

  // ── Filter threads ─────────────────────────────────────────────────────────
  const filteredThreads = threads.filter(t => {
    // Channel filter
    if (channelFilter !== 'all') {
      const hasMatchingMsg = t.messages.some(m => channelMatchesFilter(m.channel, channelFilter))
      if (!hasMatchingMsg) return false
    }
    // Inbox filter
    if (inboxFilter === 'unread' && t.unread === 0) return false
    if (inboxFilter === 'mine' && t.assigned_to !== profile.id) return false
    if (inboxFilter === 'unassigned' && t.assigned_to !== null) return false
    if (inboxFilter === 'starred' && !t.starred) return false
    // Search
    if (search) {
      const q = search.toLowerCase()
      return t.customer_name.toLowerCase().includes(q) ||
             t.last_message.toLowerCase().includes(q) ||
             (t.customer_email && t.customer_email.toLowerCase().includes(q)) ||
             (t.customer_phone && t.customer_phone.includes(q))
    }
    return true
  })

  // ═════════════════════════════════════════════════════════════════════════════
  // ── RENDER ────────────────────────────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      display: 'flex', height: 'calc(100vh - 56px)', background: 'var(--bg)',
      overflow: 'hidden',
    }}>

      {/* ═══════════════════════════════════════════════════════════════════════
           LEFT PANEL - Inbox List
           ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className={showMobileThread ? 'max-md:hidden' : ''}
        style={{
          width: 340, minWidth: 340, maxWidth: 340,
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--surface)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10,
          }}>
            <h2 style={{
              fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800,
              fontSize: 20, color: 'var(--text1)', margin: 0,
              letterSpacing: '0.02em',
            }}>
              Communications
            </h2>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
            }}>
              <Plus size={12} />
              New
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={14} style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text3)', pointerEvents: 'none',
            }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search all channels..."
              style={{
                width: '100%', padding: '8px 12px 8px 32px',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 8, fontSize: 12, color: 'var(--text1)', outline: 'none',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)',
                  display: 'flex', padding: 2,
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Channel Filter Tabs with unread counts */}
          <div style={{ display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 2 }}>
            {CHANNEL_TABS.map(tab => {
              const Icon = tab.icon
              const count = unreadCounts[tab.id]
              const isActive = channelFilter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setChannelFilter(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    padding: '4px 8px', borderRadius: 6,
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.03em',
                    border: `1px solid ${isActive ? tab.color : 'var(--border)'}`,
                    background: isActive ? `${tab.color}15` : 'transparent',
                    color: isActive ? tab.color : 'var(--text3)',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={10} />
                  {tab.label}
                  {count > 0 && (
                    <span style={{
                      minWidth: 14, height: 14, borderRadius: 7,
                      background: tab.color, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800, padding: '0 3px',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Inbox Filter Bar */}
          <div ref={filterRef} style={{ position: 'relative', marginTop: 8 }}>
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', borderRadius: 6,
                background: inboxFilter !== 'all' ? 'rgba(79,127,255,0.1)' : 'transparent',
                border: `1px solid ${inboxFilter !== 'all' ? 'var(--accent)' : 'var(--border)'}`,
                color: inboxFilter !== 'all' ? 'var(--accent)' : 'var(--text3)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Filter size={10} />
              {INBOX_FILTERS.find(f => f.id === inboxFilter)?.label || 'All'}
              <ChevronDown size={10} style={{
                transform: showFilterDropdown ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s',
              }} />
            </button>

            {showFilterDropdown && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: 4, minWidth: 160,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {INBOX_FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => { setInboxFilter(f.id); setShowFilterDropdown(false) }}
                    style={{
                      display: 'block', width: '100%', padding: '6px 10px',
                      background: inboxFilter === f.id ? 'rgba(79,127,255,0.1)' : 'none',
                      border: 'none', borderRadius: 5,
                      color: inboxFilter === f.id ? 'var(--accent)' : 'var(--text2)',
                      fontSize: 12, fontWeight: inboxFilter === f.id ? 600 : 400,
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
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
              <div style={{ fontSize: 13, fontWeight: 600 }}>No conversations</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                {search ? 'Try a different search' : 'Messages will appear here'}
              </div>
            </div>
          ) : (
            filteredThreads.map((thread, i) => {
              const channelInfo = CHANNEL_BUBBLE[thread.last_channel]
              const isActive = activeThread?.customer_id === thread.customer_id &&
                               activeThread?.customer_name === thread.customer_name
              const initials = getInitials(thread.customer_name)

              return (
                <div
                  key={`${thread.customer_id}-${i}`}
                  onClick={() => selectThread(thread)}
                  style={{
                    padding: '10px 12px', cursor: 'pointer',
                    background: isActive ? 'var(--surface2)' : 'transparent',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: channelInfo?.bg || 'var(--surface2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800,
                    color: channelInfo?.color || 'var(--text3)',
                    position: 'relative',
                  }}>
                    {initials}
                    {/* Unread dot */}
                    {thread.unread > 0 && (
                      <div style={{
                        position: 'absolute', top: -1, right: -1,
                        width: 10, height: 10, borderRadius: '50%',
                        background: 'var(--accent)',
                        border: '2px solid var(--surface)',
                      }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 13, fontWeight: thread.unread > 0 ? 800 : 600,
                        color: 'var(--text1)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: 160,
                      }}>
                        {thread.customer_name}
                      </span>
                      <span style={{
                        fontSize: 10, color: 'var(--text3)',
                        fontFamily: 'JetBrains Mono, monospace',
                        flexShrink: 0,
                      }}>
                        {formatTime(thread.last_time)}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4, marginTop: 2,
                    }}>
                      {channelInfo && (
                        <channelInfo.icon size={10} style={{ color: channelInfo.color, flexShrink: 0 }} />
                      )}
                      <span style={{
                        fontSize: 12,
                        color: thread.unread > 0 ? 'var(--text1)' : 'var(--text3)',
                        fontWeight: thread.unread > 0 ? 600 : 400,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {thread.last_message}
                      </span>
                    </div>
                  </div>

                  {/* Star */}
                  <button
                    onClick={(e) => toggleStar(thread, e)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: thread.starred ? 'var(--amber)' : 'var(--text3)',
                      padding: 2, flexShrink: 0, alignSelf: 'center',
                      opacity: thread.starred ? 1 : 0.4,
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                    onMouseLeave={e => { if (!thread.starred) e.currentTarget.style.opacity = '0.4' }}
                  >
                    <Star size={13} fill={thread.starred ? 'var(--amber)' : 'none'} />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer Stats */}
        <div style={{
          padding: '8px 14px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, color: 'var(--text3)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          <span>{filteredThreads.length} conversations</span>
          <span>{unreadCounts.all} unread</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
           CENTER PANEL - Conversation Thread
           ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className={!showMobileThread ? 'max-md:hidden' : ''}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: 'var(--bg)', minWidth: 0,
        }}
      >
        {!activeThread ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', color: 'var(--text3)',
          }}>
            <MessageSquare size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>Select a conversation</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Choose from the inbox on the left</div>
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <div style={{
              padding: '10px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--surface)',
            }}>
              <button
                className="md:hidden"
                onClick={() => setShowMobileThread(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text2)', display: 'flex', padding: 4,
                }}
              >
                <ArrowLeft size={20} />
              </button>

              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(79,127,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: 'var(--accent)',
              }}>
                {getInitials(activeThread.customer_name)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                  {activeThread.customer_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', gap: 8 }}>
                  <span>{activeThread.messages.length} messages</span>
                  {activeThread.customer_phone && (
                    <span>{activeThread.customer_phone}</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 10px', borderRadius: 6,
                  background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)',
                  color: 'var(--cyan)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>
                  <Phone size={12} />
                  <span className="hidden sm:inline">Call</span>
                </button>
                <button style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 6,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text3)', cursor: 'pointer',
                }}>
                  <MoreHorizontal size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {messages.map((msg, idx) => {
                const bubble = CHANNEL_BUBBLE[msg.channel] || CHANNEL_BUBBLE.sms
                const isOutbound = msg.direction === 'outbound'
                const isCall = msg.channel === 'call'
                const isVoicemail = msg.channel === 'voicemail'
                const isEmail = msg.channel === 'email'
                const isInternal = msg.channel === 'internal'

                // Show date separator
                const prevMsg = idx > 0 ? messages[idx - 1] : null
                const showDate = !prevMsg ||
                  new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()

                return (
                  <div key={msg.id}>
                    {/* Date separator */}
                    {showDate && (
                      <div style={{
                        textAlign: 'center', margin: '16px 0',
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: 'var(--text3)',
                          fontFamily: 'JetBrains Mono, monospace',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          {new Date(msg.created_at).toLocaleDateString([], {
                            weekday: 'short', month: 'short', day: 'numeric',
                          })}
                        </span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      </div>
                    )}

                    {/* Call log card */}
                    {(isCall || isVoicemail) && (
                      <div style={{
                        margin: '8px auto', maxWidth: 400,
                        background: bubble.bg,
                        border: `1px solid ${bubble.color}25`,
                        borderRadius: 12, padding: '12px 16px',
                      }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                        }}>
                          {isCall ? <PhoneCall size={14} style={{ color: bubble.color }} />
                                  : <Voicemail size={14} style={{ color: bubble.color }} />}
                          <span style={{ fontSize: 12, fontWeight: 700, color: bubble.color }}>
                            {isVoicemail ? 'Voicemail' : (isOutbound ? 'Outbound Call' : 'Inbound Call')}
                          </span>
                          {msg.call_duration != null && (
                            <span style={{
                              marginLeft: 'auto', fontSize: 11,
                              fontFamily: 'JetBrains Mono, monospace',
                              color: 'var(--text2)',
                            }}>
                              {formatDuration(msg.call_duration)}
                            </span>
                          )}
                        </div>
                        {msg.body && (
                          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 8 }}>
                            {msg.body}
                          </div>
                        )}
                        {isVoicemail && msg.transcription && (
                          <div style={{
                            padding: '8px 10px', borderRadius: 8,
                            background: 'rgba(255,255,255,0.04)',
                            fontSize: 12, color: 'var(--text2)', lineHeight: 1.5,
                            marginBottom: 8, fontStyle: 'italic',
                          }}>
                            {msg.transcription}
                          </div>
                        )}
                        {msg.recording_url && <AudioPlayer url={msg.recording_url} />}
                        <div style={{
                          fontSize: 10, color: 'var(--text3)', marginTop: 6,
                          fontFamily: 'JetBrains Mono, monospace',
                        }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                    )}

                    {/* Internal note */}
                    {isInternal && (
                      <div style={{
                        margin: '8px 0', padding: '10px 14px',
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.15)',
                        borderRadius: 10,
                      }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
                        }}>
                          <Hash size={12} style={{ color: 'var(--amber)' }} />
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: 'var(--amber)',
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                          }}>
                            Internal Note
                          </span>
                          <span style={{
                            marginLeft: 'auto', fontSize: 10, color: 'var(--text3)',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {msg.body}
                        </div>
                      </div>
                    )}

                    {/* Email card style */}
                    {isEmail && (
                      <div style={{
                        margin: '8px 0',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 12, overflow: 'hidden',
                      }}>
                        {/* Email header */}
                        <div style={{
                          padding: '10px 14px', borderBottom: '1px solid var(--border)',
                          background: 'rgba(79,127,255,0.04)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Mail size={12} style={{ color: 'var(--accent)' }} />
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)' }}>
                              {isOutbound ? 'Sent' : 'Received'}
                            </span>
                            <span style={{
                              marginLeft: 'auto', fontSize: 10, color: 'var(--text3)',
                              fontFamily: 'JetBrains Mono, monospace',
                            }}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                          {msg.subject && (
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                              {msg.subject}
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                            {isOutbound ? `To: ${msg.to_address || activeThread.customer_email || ''}` :
                                          `From: ${msg.from_address || activeThread.customer_email || ''}`}
                          </div>
                        </div>
                        {/* Email body */}
                        <div style={{
                          padding: '12px 14px', fontSize: 13, color: 'var(--text1)',
                          lineHeight: 1.6, whiteSpace: 'pre-wrap',
                        }}>
                          {msg.body}
                        </div>
                      </div>
                    )}

                    {/* SMS / VINYL bubbles */}
                    {!isCall && !isVoicemail && !isInternal && !isEmail && (
                      <div style={{
                        display: 'flex',
                        justifyContent: isOutbound ? 'flex-end' : 'flex-start',
                        marginBottom: 10,
                      }}>
                        <div style={{ maxWidth: '70%' }}>
                          {/* Channel label */}
                          <div style={{
                            fontSize: 9, color: bubble.color, marginBottom: 3,
                            textAlign: isOutbound ? 'right' : 'left',
                            display: 'flex', alignItems: 'center', gap: 4,
                            justifyContent: isOutbound ? 'flex-end' : 'flex-start',
                            fontWeight: 600, letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                          }}>
                            <bubble.icon size={9} />
                            {bubble.label}
                          </div>

                          {/* Bubble */}
                          <div style={{
                            padding: '10px 14px',
                            borderRadius: isOutbound ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            background: isOutbound ? bubble.outboundBg : bubble.bg,
                            color: isOutbound && msg.channel !== 'email' ? '#fff' : 'var(--text1)',
                          }}>
                            <div style={{
                              fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                            }}>
                              {msg.body}
                            </div>
                          </div>

                          {/* Timestamp + status */}
                          <div style={{
                            fontSize: 10, color: 'var(--text3)', marginTop: 3,
                            textAlign: isOutbound ? 'right' : 'left',
                            display: 'flex', alignItems: 'center', gap: 4,
                            justifyContent: isOutbound ? 'flex-end' : 'flex-start',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: 'numeric', minute: '2-digit',
                            })}
                            {isOutbound && (
                              msg.status === 'delivered' ? <CheckCheck size={12} color="var(--green)" /> :
                              msg.status === 'sent' ? <Check size={12} /> : null
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Bar */}
            <div style={{
              padding: '10px 16px', borderTop: '1px solid var(--border)',
              background: 'var(--surface)',
            }}>
              {/* Channel selector row */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 8, alignItems: 'center' }}>
                {(['sms', 'email', 'vinyl_chat', 'internal'] as const).map(ch => {
                  const info = CHANNEL_BUBBLE[ch]
                  if (!info) return null
                  const Icon = info.icon
                  const isSelected = replyChannel === ch
                  return (
                    <button
                      key={ch}
                      onClick={() => setReplyChannel(ch)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        padding: '4px 8px', borderRadius: 6,
                        fontSize: 10, fontWeight: 700,
                        border: `1px solid ${isSelected ? info.color : 'var(--border)'}`,
                        background: isSelected ? `${info.color}15` : 'transparent',
                        color: isSelected ? info.color : 'var(--text3)',
                        cursor: 'pointer', letterSpacing: '0.03em',
                      }}
                    >
                      <Icon size={10} />
                      {info.label}
                    </button>
                  )
                })}
              </div>

              {/* Input + actions */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <textarea
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder={`Reply via ${CHANNEL_BUBBLE[replyChannel]?.label || replyChannel}...`}
                    style={{
                      width: '100%', background: 'var(--surface2)',
                      border: '1px solid var(--border)', borderRadius: 10,
                      padding: '10px 14px', fontSize: 13, color: 'var(--text1)',
                      outline: 'none', resize: 'none', minHeight: 40, maxHeight: 120,
                      fontFamily: 'inherit', lineHeight: 1.5,
                    }}
                    rows={1}
                  />
                </div>

                <div style={{ display: 'flex', gap: 4, flexShrink: 0, paddingBottom: 2 }}>
                  {/* Attach */}
                  <button
                    title="Attach file"
                    style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Paperclip size={14} color="var(--text3)" />
                  </button>

                  {/* AI Draft */}
                  <button
                    onClick={handleAiDraft}
                    disabled={aiDrafting}
                    title="AI Draft Reply"
                    style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: aiDrafting ? 'rgba(139,92,246,0.15)' : 'var(--surface2)',
                      border: `1px solid ${aiDrafting ? 'var(--purple)' : 'var(--border)'}`,
                      cursor: aiDrafting ? 'wait' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {aiDrafting ? (
                      <Loader2 size={14} color="var(--purple)" className="animate-spin" />
                    ) : (
                      <Sparkles size={14} color="var(--purple)" />
                    )}
                  </button>

                  {/* Send */}
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: newMessage.trim() ? 'var(--accent)' : 'var(--surface2)',
                      border: 'none',
                      cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s',
                    }}
                  >
                    {sending ? (
                      <Loader2 size={14} color="#fff" className="animate-spin" />
                    ) : (
                      <Send size={14} color="#fff" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
           RIGHT PANEL - Contact Info
           ═══════════════════════════════════════════════════════════════════════ */}
      {activeThread && (
        <div
          className="max-lg:hidden"
          style={{
            width: 300, minWidth: 300, maxWidth: 300,
            borderLeft: '1px solid var(--border)',
            background: 'var(--surface)', overflowY: 'auto',
          }}
        >
          {/* Customer Card */}
          <div style={{
            padding: '20px 16px', borderBottom: '1px solid var(--border)',
            textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 10px',
              background: 'rgba(79,127,255,0.12)',
              border: '2px solid rgba(79,127,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: 'var(--accent)',
            }}>
              {getInitials(activeThread.customer_name)}
            </div>
            <div style={{
              fontSize: 16, fontWeight: 700, color: 'var(--text1)',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}>
              {activeThread.customer_name}
            </div>

            {/* Contact details */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8,
              alignItems: 'center',
            }}>
              {activeThread.customer_phone && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, color: 'var(--text2)',
                }}>
                  <Phone size={11} color="var(--text3)" />
                  {activeThread.customer_phone}
                </div>
              )}
              {activeThread.customer_email && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, color: 'var(--text2)',
                }}>
                  <Mail size={11} color="var(--text3)" />
                  {activeThread.customer_email}
                </div>
              )}
            </div>

            {/* Health Score */}
            {customerHealthScore > 0 && (
              <div style={{ marginTop: 10 }}>
                <HealthBadge score={customerHealthScore} />
              </div>
            )}
          </div>

          {/* Open Jobs */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
            }}>
              Open Jobs
            </div>
            {customerJobs.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '12px 0', color: 'var(--text3)', fontSize: 11,
              }}>
                <Briefcase size={16} style={{ margin: '0 auto 4px', opacity: 0.3 }} />
                <div>No jobs found</div>
              </div>
            ) : (
              customerJobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => router.push(`/projects/${job.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '8px 10px', borderRadius: 8,
                    background: 'none', border: 'none', cursor: 'pointer',
                    textAlign: 'left', transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: 'rgba(79,127,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Briefcase size={12} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: 'var(--text1)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {job.title}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                      {job.pipe_stage.replace('_', ' ')}
                      {job.revenue != null && ` - $${job.revenue.toLocaleString()}`}
                    </div>
                  </div>
                  <ChevronRight size={12} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                </button>
              ))
            )}
          </div>

          {/* Recent Transactions */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
            }}>
              Recent Transactions
            </div>
            {customerTransactions.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '12px 0', color: 'var(--text3)', fontSize: 11,
              }}>
                <Receipt size={16} style={{ margin: '0 auto 4px', opacity: 0.3 }} />
                <div>No transactions</div>
              </div>
            ) : (
              customerTransactions.map(tx => {
                const typeColor = tx.type === 'estimate' ? 'var(--amber)' :
                                  tx.type === 'invoice' ? 'var(--accent)' : 'var(--green)'
                return (
                  <div
                    key={tx.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)',
                    }}
                  >
                    <div style={{
                      width: 24, height: 24, borderRadius: 5,
                      background: `${typeColor}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {tx.type === 'estimate' ? <FileText size={10} style={{ color: typeColor }} /> :
                       tx.type === 'invoice' ? <Receipt size={10} style={{ color: typeColor }} /> :
                       <DollarSign size={10} style={{ color: typeColor }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text1)' }}>
                        {tx.number}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{tx.status}</div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: typeColor,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>
                      ${tx.amount.toLocaleString()}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
            }}>
              Quick Actions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                onClick={() => {
                  // Trigger call (placeholder)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '7px 10px', borderRadius: 7,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text2)', fontSize: 12, fontWeight: 500,
                  textAlign: 'left', transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <Phone size={13} color="var(--cyan)" />
                Call
              </button>
              <button
                onClick={() => setReplyChannel('sms')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '7px 10px', borderRadius: 7,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text2)', fontSize: 12, fontWeight: 500,
                  textAlign: 'left', transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <MessageCircle size={13} color="var(--green)" />
                SMS
              </button>
              <button
                onClick={() => setReplyChannel('email')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '7px 10px', borderRadius: 7,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text2)', fontSize: 12, fontWeight: 500,
                  textAlign: 'left', transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <Mail size={13} color="var(--accent)" />
                Email
              </button>
              <button
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '7px 10px', borderRadius: 7,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text2)', fontSize: 12, fontWeight: 500,
                  textAlign: 'left', transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <ClipboardList size={13} color="var(--amber)" />
                Create Task
              </button>
              <button
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '7px 10px', borderRadius: 7,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text2)', fontSize: 12, fontWeight: 500,
                  textAlign: 'left', transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <Briefcase size={13} color="var(--purple)" />
                Add to Job
              </button>
            </div>
          </div>

          {/* Assign To */}
          <div ref={assignRef} style={{ padding: '12px 16px' }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
            }}>
              Assigned To
            </div>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setAssignDropdownOpen(!assignDropdownOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  cursor: 'pointer', color: 'var(--text1)', fontSize: 12,
                  fontWeight: 500,
                }}
              >
                <User size={13} color="var(--text3)" />
                <span style={{ flex: 1, textAlign: 'left' }}>
                  {activeThread.assigned_to
                    ? teamMembers.find(m => m.id === activeThread.assigned_to)?.name || 'Assigned'
                    : 'Unassigned'}
                </span>
                <ChevronDown size={12} color="var(--text3)" style={{
                  transform: assignDropdownOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.15s',
                }} />
              </button>

              {assignDropdownOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                  zIndex: 50, background: 'var(--surface2)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  padding: 4, maxHeight: 200, overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  <button
                    onClick={() => assignThread('')}
                    style={{
                      display: 'block', width: '100%', padding: '6px 10px',
                      background: 'none', border: 'none', borderRadius: 5,
                      color: 'var(--text3)', fontSize: 12, cursor: 'pointer',
                      textAlign: 'left', fontStyle: 'italic',
                    }}
                  >
                    Unassign
                  </button>
                  {teamMembers.map(m => (
                    <button
                      key={m.id}
                      onClick={() => assignThread(m.id)}
                      style={{
                        display: 'block', width: '100%', padding: '6px 10px',
                        background: activeThread.assigned_to === m.id ? 'rgba(79,127,255,0.1)' : 'none',
                        border: 'none', borderRadius: 5,
                        color: activeThread.assigned_to === m.id ? 'var(--accent)' : 'var(--text2)',
                        fontSize: 12, fontWeight: activeThread.assigned_to === m.id ? 600 : 400,
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
