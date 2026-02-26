'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Search, Mail, Phone, PhoneCall, MessageSquare, StickyNote, Send, Paperclip,
  ChevronDown, ChevronRight, Bot, Clock, Circle, ArrowLeft, Sparkles, X,
  MoreHorizontal, User, Building2, ExternalLink, Filter, Inbox, PhoneIncoming,
  PhoneOutgoing, AlertTriangle, Zap, Shield, Eye, EyeOff, ToggleLeft, ToggleRight,
  DollarSign, Brain, TrendingUp, UserCheck, Play, Pause,
} from 'lucide-react'

/* ─── Types ──────────────────────────────────────────────────────────── */

type ChannelType = 'sms' | 'email' | 'web_chat' | 'call' | 'note' | 'ai_bot'
type MessageDirection = 'inbound' | 'outbound' | 'internal'
type LeadStage = 'new' | 'qualifying' | 'quoting' | 'negotiating' | 'deposit_sent' | 'converted' | 'lost'
type ConvoStatus = 'active' | 'escalated' | 'closed' | 'converted'

interface AIConversation {
  id: string
  customer_id: string | null
  channel: string
  phone_number: string | null
  email_address: string | null
  status: ConvoStatus
  escalation_reason: string | null
  escalated_to: string | null
  ai_enabled: boolean
  lead_stage: LeadStage
  vehicle_info: any
  wrap_preferences: any
  quote_data: any
  created_at: string
  updated_at: string
  customer?: { id: string; name: string; email?: string; phone?: string; company_name?: string }
  messages?: AIMessage[]
  last_message?: AIMessage
}

interface AIMessage {
  id: string
  conversation_id: string
  role: 'customer' | 'ai' | 'human_agent'
  content: string
  channel: string
  ai_reasoning: string | null
  ai_confidence: number | null
  tokens_used: number | null
  cost_cents: number | null
  created_at: string
}

interface Communication {
  id: string
  customer_id: string
  channel: ChannelType
  direction: MessageDirection
  content: string
  subject?: string
  from_address?: string
  to_address?: string
  call_duration?: number
  call_notes?: string
  read: boolean
  created_at: string
  sent_by?: string
}

interface DemoCustomer {
  id: string
  contact_name: string
  company_name?: string
  email?: string
  phone?: string
  status?: string
  avatar_initial: string
  avatar_color: string
}

interface DemoMessage {
  id: string
  customer_id: string
  channel: ChannelType
  direction: MessageDirection
  content: string
  subject?: string
  call_duration?: number
  call_notes?: string
  read: boolean
  created_at: string
  sent_by?: string
  ai_reasoning?: string | null
  ai_confidence?: number | null
  role?: 'customer' | 'ai' | 'human_agent'
}

/* ─── Demo Data ──────────────────────────────────────────────────────── */

const DEMO_CONVERSATIONS: AIConversation[] = [
  {
    id: 'vc-1', customer_id: 'demo-1', channel: 'sms', phone_number: '+12535551234',
    email_address: null, status: 'active', escalation_reason: null, escalated_to: null,
    ai_enabled: true, lead_stage: 'quoting',
    vehicle_info: { type: 'Ford Transit', year: '2024' },
    wrap_preferences: { wrap_type: 'full_wrap', colors: 'Red & White' },
    quote_data: { total: 3800, deposit: 250 },
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 120000).toISOString(),
    customer: { id: 'demo-1', name: 'Bob Smith', phone: '(555) 234-5678', company_name: "Bob's Pizza" },
  },
  {
    id: 'vc-2', customer_id: 'demo-2', channel: 'email', phone_number: null,
    email_address: 'alice@parkdental.com', status: 'active', escalation_reason: null,
    escalated_to: null, ai_enabled: true, lead_stage: 'qualifying',
    vehicle_info: { type: 'Fleet - 5 vans' },
    wrap_preferences: { wrap_type: 'full_wrap' },
    quote_data: {},
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
    customer: { id: 'demo-2', name: 'Alice Park', email: 'alice@parkdental.com', company_name: 'Park Dental' },
  },
  {
    id: 'vc-3', customer_id: 'demo-3', channel: 'sms', phone_number: '+12535559876',
    email_address: null, status: 'escalated', escalation_reason: 'Customer requested human agent',
    escalated_to: null, ai_enabled: false, lead_stage: 'negotiating',
    vehicle_info: { type: '2 x F-150' },
    wrap_preferences: { wrap_type: 'partial', areas: 'doors + tailgate' },
    quote_data: { total: 2400 },
    created_at: new Date(Date.now() - 259200000).toISOString(),
    updated_at: new Date(Date.now() - 2700000).toISOString(),
    customer: { id: 'demo-3', name: 'Jake Torres', phone: '(555) 456-7890', company_name: 'Torres Roofing' },
  },
  {
    id: 'vc-4', customer_id: 'demo-4', channel: 'sms', phone_number: '+12535554321',
    email_address: null, status: 'converted', escalation_reason: null, escalated_to: null,
    ai_enabled: false, lead_stage: 'converted',
    vehicle_info: { type: 'Tesla Model 3' },
    wrap_preferences: { wrap_type: 'ppf', areas: 'full front' },
    quote_data: { total: 1850, deposit: 250, paid: true },
    created_at: new Date(Date.now() - 432000000).toISOString(),
    updated_at: new Date(Date.now() - 10800000).toISOString(),
    customer: { id: 'demo-4', name: 'Sarah Chen', phone: '(555) 567-8901' },
  },
]

function demoTimestamp(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString()
}

const DEMO_MESSAGES_MAP: Record<string, DemoMessage[]> = {
  'vc-1': [
    { id: 'vm-1a', customer_id: 'demo-1', channel: 'sms', direction: 'inbound', content: 'Hey, I saw your work on a pizza van in Tacoma. I need something similar for my delivery fleet.', read: true, created_at: demoTimestamp(1440), role: 'customer' },
    { id: 'vm-1b', customer_id: 'demo-1', channel: 'sms', direction: 'outbound', content: "Hi Bob! Thanks for reaching out to USA Wrap Co. I'd love to help with your delivery fleet. Can you tell me what vehicle(s) you have and what kind of wrap you're thinking?", read: true, created_at: demoTimestamp(1438), sent_by: 'ai', role: 'ai', ai_reasoning: 'New lead greeting + qualification question. Moving to qualifying stage.', ai_confidence: 0.92 },
    { id: 'vm-1c', customer_id: 'demo-1', channel: 'sms', direction: 'inbound', content: "It's a 2024 Ford Transit. Want a full wrap with our logo, phone number, and the pizza design. Red and white colors.", read: true, created_at: demoTimestamp(1400), role: 'customer' },
    { id: 'vm-1d', customer_id: 'demo-1', channel: 'sms', direction: 'outbound', content: "Great choice! A full wrap on a Ford Transit runs about $3,800 and includes design, print, laminate, and professional installation. Timeline is typically 2-3 weeks from design approval. Want me to put together a quote?", read: true, created_at: demoTimestamp(1398), sent_by: 'ai', role: 'ai', ai_reasoning: 'Customer provided vehicle + preferences. Quoting standard Transit full wrap price. Moving to quoting.', ai_confidence: 0.95 },
    { id: 'vm-1e', customer_id: 'demo-1', channel: 'sms', direction: 'inbound', content: "Yeah that sounds about right. What's the next step?", read: false, created_at: demoTimestamp(2), role: 'customer' },
  ],
  'vc-2': [
    { id: 'vm-2a', customer_id: 'demo-2', channel: 'email', direction: 'inbound', content: "We're interested in wrapping our fleet of 5 dental vans with our new branding.", read: true, created_at: demoTimestamp(10080), role: 'customer', subject: 'Fleet Wrap Inquiry' },
    { id: 'vm-2b', customer_id: 'demo-2', channel: 'email', direction: 'outbound', content: "Hi Alice! Thank you for your interest in USA Wrap Co. Fleet wraps are our specialty. For 5+ vehicles we offer a 15% fleet discount. Could you share what type of vans you have so I can prepare accurate pricing?", read: true, created_at: demoTimestamp(10078), sent_by: 'ai', role: 'ai', ai_reasoning: 'Fleet inquiry - qualify vehicle type. Mention fleet discount to build value.', ai_confidence: 0.88 },
    { id: 'vm-2c', customer_id: 'demo-2', channel: 'email', direction: 'inbound', content: "They're all Ford Transit Connect vans, 2023 models. Do you need photos?", read: false, created_at: demoTimestamp(120), role: 'customer', subject: 'Re: Fleet Wrap Inquiry' },
  ],
  'vc-3': [
    { id: 'vm-3a', customer_id: 'demo-3', channel: 'sms', direction: 'inbound', content: "Need logos on doors and tailgate for 2 F-150s. What's it gonna cost?", read: true, created_at: demoTimestamp(4320), role: 'customer' },
    { id: 'vm-3b', customer_id: 'demo-3', channel: 'sms', direction: 'outbound', content: "Hey Jake! Door and tailgate graphics for F-150s run about $1,200 per truck, so $2,400 total for both. Includes design, print, and install. Usually a 1-day turnaround per truck.", read: true, created_at: demoTimestamp(4318), sent_by: 'ai', role: 'ai', ai_reasoning: 'Direct pricing request - provide clear quote. Partial wrap pricing.', ai_confidence: 0.90 },
    { id: 'vm-3c', customer_id: 'demo-3', channel: 'sms', direction: 'inbound', content: "Can you do better on price? My buddy got his done for $900 each.", read: true, created_at: demoTimestamp(2880), role: 'customer' },
    { id: 'vm-3d', customer_id: 'demo-3', channel: 'sms', direction: 'outbound', content: "I appreciate you sharing that. Our pricing includes premium 3M vinyl with a 5-year warranty and professional installation. For 2 trucks, the best I can offer is $1,100 each — $2,200 total. That saves you $200 and you get our quality guarantee.", read: true, created_at: demoTimestamp(2878), sent_by: 'ai', role: 'ai', ai_reasoning: 'Price negotiation - offer modest discount within 10% max. Emphasize quality value.', ai_confidence: 0.75 },
    { id: 'vm-3e', customer_id: 'demo-3', channel: 'sms', direction: 'inbound', content: "I want to talk to a real person about this.", read: true, created_at: demoTimestamp(45), role: 'customer' },
    { id: 'vm-3f', customer_id: 'demo-3', channel: 'sms', direction: 'outbound', content: "Absolutely! Let me connect you with our team. A specialist will be with you shortly.", read: true, created_at: demoTimestamp(44), sent_by: 'ai', role: 'ai', ai_reasoning: 'ESCALATED: Customer requested human agent', ai_confidence: 1.0 },
  ],
  'vc-4': [
    { id: 'vm-4a', customer_id: 'demo-4', channel: 'sms', direction: 'inbound', content: "Hi, I was referred by a friend. Want PPF on my new Tesla Model 3.", read: true, created_at: demoTimestamp(7200), role: 'customer' },
    { id: 'vm-4b', customer_id: 'demo-4', channel: 'sms', direction: 'outbound', content: "Welcome Sarah! Great choice protecting your Tesla. Full front PPF (bumper, hood, fenders, mirrors) is $1,850. We use XPEL Ultimate Plus. Want me to get you scheduled?", read: true, created_at: demoTimestamp(7198), sent_by: 'ai', role: 'ai', ai_reasoning: 'Referral lead + specific request. Quote PPF pricing, push toward booking.', ai_confidence: 0.95 },
    { id: 'vm-4c', customer_id: 'demo-4', channel: 'sms', direction: 'inbound', content: "Yes! What do I need to do?", read: true, created_at: demoTimestamp(7000), role: 'customer' },
    { id: 'vm-4d', customer_id: 'demo-4', channel: 'sms', direction: 'outbound', content: "To secure your spot, just pay the $250 design deposit here: usawrapco.com/deposit?id=vc-4. Then we'll schedule your install. Whole process takes 4-5 hours.", read: true, created_at: demoTimestamp(6998), sent_by: 'ai', role: 'ai', ai_reasoning: 'Customer ready to book. Send deposit link. Moving to deposit_sent stage.', ai_confidence: 0.97 },
    { id: 'vm-4e', customer_id: 'demo-4', channel: 'sms', direction: 'inbound', content: "Done! Just paid the deposit. When can you fit me in?", read: true, created_at: demoTimestamp(6500), role: 'customer' },
  ],
}

const DEMO_AI_STATS = {
  conversations_today: 12,
  quotes_sent: 4,
  deposits_collected: 2,
  deposits_revenue: 500,
  escalation_rate: 8,
  avg_response_time: 8,
  ai_cost_today: 2.47,
  conversion_rate: 33,
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (isToday) return `Today ${time}`
  if (isYesterday) return `Yesterday ${time}`
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`
}

const STAGE_COLORS: Record<LeadStage, string> = {
  new: '#4f7fff',
  qualifying: '#22d3ee',
  quoting: '#f59e0b',
  negotiating: '#8b5cf6',
  deposit_sent: '#22c07a',
  converted: '#22c07a',
  lost: '#f25a5a',
}

const STATUS_COLORS: Record<ConvoStatus, string> = {
  active: '#22c07a',
  escalated: '#f59e0b',
  closed: '#5a6080',
  converted: '#4f7fff',
}

/* ─── Props ───────────────────────────────────────────────────────────── */

interface Props {
  profile: Profile
  customers: any[]
  communications: any[]
  conversations?: any[]
}

/* ─── Component ───────────────────────────────────────────────────────── */

export default function InboxClient({ profile, customers, communications, conversations: serverConversations }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [tab, setTab] = useState<'all' | 'active' | 'escalated' | 'closed'>('all')
  const [search, setSearch] = useState('')
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null)
  const [composeText, setComposeText] = useState('')
  const [sending, setSending] = useState(false)
  const [showReasoning, setShowReasoning] = useState<Record<string, boolean>>({})
  const [mobileShowThread, setMobileShowThread] = useState(false)
  const [conversations, setConversations] = useState<AIConversation[]>([])
  const [messages, setMessages] = useState<DemoMessage[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  // Determine if using demo data
  const useDemo = (!serverConversations || serverConversations.length === 0)

  // Initialize conversations
  useEffect(() => {
    if (useDemo) {
      setConversations(DEMO_CONVERSATIONS)
    } else {
      setConversations(serverConversations || [])
    }
  }, [useDemo, serverConversations])

  // Load messages when selecting a conversation
  useEffect(() => {
    if (!selectedConvoId) { setMessages([]); return }
    if (useDemo) {
      setMessages(DEMO_MESSAGES_MAP[selectedConvoId] || [])
      return
    }
    // Fetch from API
    setLoadingMsgs(true)
    fetch(`/api/ai-broker/conversations?id=${selectedConvoId}`)
      .then(r => r.json())
      .then(data => {
        if (data.conversation?.messages) {
          setMessages(data.conversation.messages.map((m: any) => ({
            id: m.id,
            customer_id: data.conversation.customer_id,
            channel: m.channel,
            direction: m.role === 'customer' ? 'inbound' : 'outbound',
            content: m.content,
            read: true,
            created_at: m.created_at,
            sent_by: m.role,
            role: m.role,
            ai_reasoning: m.ai_reasoning,
            ai_confidence: m.ai_confidence,
          })))
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMsgs(false))
  }, [selectedConvoId, useDemo])

  // Realtime subscription
  useEffect(() => {
    if (useDemo) return
    const channel = supabase.channel('inbox-convos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `org_id=eq.${profile.org_id}` }, (payload: any) => {
        if (payload.eventType === 'INSERT') setConversations(prev => [payload.new as AIConversation, ...prev])
        else if (payload.eventType === 'UPDATE') {
          setConversations(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c))
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const newMsg = payload.new as any
        if (newMsg.conversation_id === selectedConvoId) {
          setMessages(prev => [...prev, {
            id: newMsg.id,
            customer_id: '',
            channel: newMsg.channel,
            direction: newMsg.role === 'customer' ? 'inbound' : 'outbound',
            content: newMsg.content,
            read: true,
            created_at: newMsg.created_at,
            sent_by: newMsg.role,
            role: newMsg.role,
            ai_reasoning: newMsg.ai_reasoning,
            ai_confidence: newMsg.ai_confidence,
          }])
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile.org_id, selectedConvoId, useDemo])

  // Auto-scroll
  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Filter conversations
  const filteredConvos = useMemo(() => {
    let list = [...conversations]
    if (tab !== 'all') list = list.filter(c => c.status === tab)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        (c.customer?.name || '').toLowerCase().includes(q) ||
        (c.customer?.company_name || '').toLowerCase().includes(q) ||
        (c.phone_number || '').includes(q) ||
        (c.email_address || '').includes(q)
      )
    }
    return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }, [conversations, tab, search])

  const selectedConvo = conversations.find(c => c.id === selectedConvoId) || null

  // Stats
  const stats = useMemo(() => {
    if (useDemo) return DEMO_AI_STATS
    const active = conversations.filter(c => c.status === 'active').length
    const escalated = conversations.filter(c => c.status === 'escalated').length
    const converted = conversations.filter(c => c.status === 'converted').length
    return {
      conversations_today: conversations.length,
      quotes_sent: conversations.filter(c => c.quote_data?.total).length,
      deposits_collected: converted,
      deposits_revenue: converted * 250,
      escalation_rate: conversations.length > 0 ? Math.round((escalated / conversations.length) * 100) : 0,
      avg_response_time: 8,
      ai_cost_today: 0,
      conversion_rate: conversations.length > 0 ? Math.round((converted / conversations.length) * 100) : 0,
    }
  }, [conversations, useDemo])

  function selectConvo(id: string) {
    setSelectedConvoId(id)
    setMobileShowThread(true)
  }

  async function handleSend() {
    if (!composeText.trim() || !selectedConvoId) return
    setSending(true)
    try {
      await fetch('/api/ai-broker/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: selectedConvoId, action: 'send_message', message: composeText.trim() }),
      })
      if (useDemo) {
        setMessages(prev => [...prev, {
          id: 'manual-' + Date.now(),
          customer_id: selectedConvo?.customer_id || '',
          channel: (selectedConvo?.channel || 'sms') as ChannelType,
          direction: 'outbound',
          content: composeText.trim(),
          read: true,
          created_at: new Date().toISOString(),
          sent_by: 'human_agent',
          role: 'human_agent',
        }])
      }
    } catch {}
    setSending(false)
    setComposeText('')
  }

  async function handleTakeOver() {
    if (!selectedConvoId) return
    await fetch('/api/ai-broker/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: selectedConvoId, action: 'take_over' }),
    })
    setConversations(prev => prev.map(c =>
      c.id === selectedConvoId ? { ...c, ai_enabled: false, status: 'escalated' as ConvoStatus } : c
    ))
  }

  async function handleReEnableAI() {
    if (!selectedConvoId) return
    await fetch('/api/ai-broker/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: selectedConvoId, action: 're_enable_ai' }),
    })
    setConversations(prev => prev.map(c =>
      c.id === selectedConvoId ? { ...c, ai_enabled: true, status: 'active' as ConvoStatus } : c
    ))
  }

  function toggleReasoning(msgId: string) {
    setShowReasoning(prev => ({ ...prev, [msgId]: !prev[msgId] }))
  }

  /* ─── Colors ────────────────────────────────────────────────────────── */

  const c = {
    bg: '#0d0f14', surface: '#161920', surface2: '#1a1d27',
    border: '#1e2330', borderHover: '#2a3040',
    accent: '#4f7fff', green: '#22c07a', amber: '#f59e0b',
    red: '#f25a5a', purple: '#8b5cf6', cyan: '#22d3ee',
    text1: '#ffffff', text2: '#8b95a5', text3: '#505a6b',
  }

  const tabs: { key: typeof tab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: conversations.length },
    { key: 'active', label: 'Active', count: conversations.filter(cv => cv.status === 'active').length },
    { key: 'escalated', label: 'Escalated', count: conversations.filter(cv => cv.status === 'escalated').length },
    { key: 'closed', label: 'Closed', count: conversations.filter(cv => cv.status === 'closed' || cv.status === 'converted').length },
  ]

  /* ─── Render ────────────────────────────────────────────────────────── */

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', background: c.bg, fontFamily: '-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif', fontSize: 14, color: c.text1 }}>

      {/* ─ Demo Mode Banner ─────────────────────────────────────────── */}
      {useDemo && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 16px',
          background: 'rgba(245,158,11,0.10)',
          borderBottom: '1px solid rgba(245,158,11,0.22)',
        }}>
          <span style={{
            fontSize: 9, fontWeight: 900, letterSpacing: '0.1em',
            color: '#f59e0b', background: 'rgba(245,158,11,0.2)',
            padding: '1px 7px', borderRadius: 4,
          }}>
            DEMO
          </span>
          <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 500 }}>
            Sample data — connect Twilio and Resend to activate live conversations
          </span>
        </div>
      )}

      {/* ─ AI Broker Stats Bar ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', background: c.surface, borderBottom: `1px solid ${c.border}`, borderRadius: '10px 10px 0 0', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Bot size={16} style={{ color: c.cyan }} />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.cyan }}>V.I.N.Y.L. AI BROKER</span>
        </div>
        {[
          { label: 'Conversations', value: stats.conversations_today, icon: <MessageSquare size={12} />, color: c.accent },
          { label: 'Quotes', value: stats.quotes_sent, icon: <DollarSign size={12} />, color: c.amber },
          { label: 'Deposits', value: `$${stats.deposits_revenue}`, icon: <TrendingUp size={12} />, color: c.green },
          { label: 'Escalation', value: `${stats.escalation_rate}%`, icon: <AlertTriangle size={12} />, color: c.red },
          { label: 'Avg Response', value: `${stats.avg_response_time}s`, icon: <Zap size={12} />, color: c.purple },
          { label: 'Conversion', value: `${stats.conversion_rate}%`, icon: <UserCheck size={12} />, color: c.green },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: `${s.color}10`, borderRadius: 6, border: `1px solid ${s.color}20` }}>
            <span style={{ color: s.color, display: 'flex' }}>{s.icon}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 10, color: c.text3 }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ─── LEFT: Conversation List ──────────────────────────────── */}
        <div
          className="inbox-left-panel"
          style={{
            width: 340, minWidth: 340, borderRight: `1px solid ${c.border}`,
            display: 'flex', flexDirection: 'column', background: c.surface,
            ...(mobileShowThread ? { position: 'absolute' as const, left: 0, top: 0, bottom: 0, zIndex: 10, transform: 'translateX(-100%)' } : {}),
          }}
        >
          {/* Search + Tabs */}
          <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${c.border}` }}>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.text3, pointerEvents: 'none' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..."
                style={{ width: '100%', padding: '8px 12px 8px 32px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text1, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{
                    flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 600, fontFamily: 'Barlow Condensed, sans-serif',
                    textTransform: 'uppercase', letterSpacing: '0.04em', border: 'none', borderRadius: 6, cursor: 'pointer',
                    background: tab === t.key ? `${c.accent}20` : 'transparent',
                    color: tab === t.key ? c.accent : c.text3, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                >
                  {t.label}
                  {t.count > 0 && <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', opacity: 0.7 }}>{t.count}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConvos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Bot size={32} style={{ color: c.text3, opacity: 0.3, marginBottom: 8 }} />
                <div style={{ color: c.text3, fontSize: 13 }}>
                  {search ? `No results for "${search}"` : 'No conversations'}
                </div>
              </div>
            ) : filteredConvos.map(convo => {
              const isActive = selectedConvoId === convo.id
              const name = convo.customer?.name || convo.phone_number || convo.email_address || 'Unknown'
              const initial = name.charAt(0).toUpperCase()
              const stageColor = STAGE_COLORS[convo.lead_stage] || c.text3
              const statusColor = STATUS_COLORS[convo.status] || c.text3

              return (
                <div key={convo.id} onClick={() => selectConvo(convo.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', cursor: 'pointer',
                    borderLeft: isActive ? `3px solid ${c.accent}` : '3px solid transparent',
                    background: isActive ? `${c.accent}08` : 'transparent',
                    borderBottom: `1px solid ${c.border}`,
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = c.bg }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  {/* Avatar */}
                  <div style={{ width: 36, height: 36, minWidth: 36, borderRadius: '50%', background: `${stageColor}20`, color: stageColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif', position: 'relative' }}>
                    {initial}
                    {convo.ai_enabled && (
                      <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: c.cyan, border: `2px solid ${c.surface}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bot size={8} color="#000" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: c.text1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{name}</span>
                      <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: c.text3, whiteSpace: 'nowrap' }}>{relativeTime(convo.updated_at)}</span>
                    </div>
                    {convo.customer?.company_name && <div style={{ fontSize: 11, color: c.text2, marginBottom: 2 }}>{convo.customer.company_name}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ padding: '1px 5px', borderRadius: 4, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', background: `${stageColor}15`, color: stageColor, border: `1px solid ${stageColor}30` }}>{convo.lead_stage}</span>
                      <span style={{ padding: '1px 5px', borderRadius: 4, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}>{convo.status}</span>
                      <span style={{ fontSize: 10, color: c.text3, display: 'flex', alignItems: 'center', gap: 2 }}>
                        {convo.channel === 'sms' ? <MessageSquare size={10} /> : <Mail size={10} />}
                        {convo.channel.toUpperCase()}
                      </span>
                      {convo.quote_data?.total && (
                        <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: c.green }}>
                          ${convo.quote_data.total.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── RIGHT: Thread View ──────────────────────────────────── */}
        <div className="inbox-right-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: c.bg, overflow: 'hidden' }}>
          {!selectedConvo ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Bot size={48} style={{ color: c.cyan, opacity: 0.3 }} />
              <div style={{ color: c.text2, fontSize: 15, fontWeight: 500 }}>V.I.N.Y.L. AI Broker</div>
              <div style={{ color: c.text3, fontSize: 12 }}>Select a conversation to view the thread</div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '10px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: c.surface }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => { setMobileShowThread(false); setSelectedConvoId(null) }} className="inbox-mobile-back"
                    style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, border: 'none', background: 'transparent', color: c.text2, cursor: 'pointer', borderRadius: 6, padding: 0, minWidth: 44, minHeight: 44 }}>
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedConvo.customer?.name || selectedConvo.phone_number || 'Unknown'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: c.text2 }}>
                      {selectedConvo.customer?.company_name && <span>{selectedConvo.customer.company_name}</span>}
                      <span style={{ padding: '1px 5px', borderRadius: 4, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', background: `${STAGE_COLORS[selectedConvo.lead_stage]}15`, color: STAGE_COLORS[selectedConvo.lead_stage], border: `1px solid ${STAGE_COLORS[selectedConvo.lead_stage]}30` }}>{selectedConvo.lead_stage}</span>
                      {selectedConvo.vehicle_info?.type && <span style={{ color: c.text3 }}>{selectedConvo.vehicle_info.type}</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* AI toggle */}
                  <button
                    onClick={selectedConvo.ai_enabled ? handleTakeOver : handleReEnableAI}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6,
                      border: `1px solid ${selectedConvo.ai_enabled ? c.cyan : c.amber}30`,
                      background: `${selectedConvo.ai_enabled ? c.cyan : c.amber}10`,
                      color: selectedConvo.ai_enabled ? c.cyan : c.amber,
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {selectedConvo.ai_enabled ? <><Bot size={12} /> AI Active</> : <><UserCheck size={12} /> Human Mode</>}
                  </button>

                  {selectedConvo.ai_enabled && (
                    <button onClick={handleTakeOver}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: `1px solid ${c.amber}30`, background: `${c.amber}10`, color: c.amber, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      <Shield size={12} /> Take Over
                    </button>
                  )}

                  {!selectedConvo.ai_enabled && selectedConvo.status === 'escalated' && (
                    <button onClick={handleReEnableAI}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: `1px solid ${c.cyan}30`, background: `${c.cyan}10`, color: c.cyan, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      <Bot size={12} /> Re-enable AI
                    </button>
                  )}
                </div>
              </div>

              {/* Escalation Banner */}
              {selectedConvo.status === 'escalated' && selectedConvo.escalation_reason && (
                <div style={{ padding: '8px 16px', background: `${c.amber}10`, borderBottom: `1px solid ${c.amber}25`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={14} style={{ color: c.amber }} />
                  <span style={{ fontSize: 12, color: c.amber, fontWeight: 500 }}>Escalated: {selectedConvo.escalation_reason}</span>
                </div>
              )}

              {/* Vehicle/Quote Info Bar */}
              {(selectedConvo.vehicle_info?.type || selectedConvo.quote_data?.total) && (
                <div style={{ padding: '6px 16px', background: c.surface, borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: c.text2 }}>
                  {selectedConvo.vehicle_info?.type && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ color: c.text3 }}>Vehicle:</span> {selectedConvo.vehicle_info.type}
                      {selectedConvo.vehicle_info.year && ` (${selectedConvo.vehicle_info.year})`}
                    </span>
                  )}
                  {selectedConvo.wrap_preferences?.wrap_type && (
                    <span><span style={{ color: c.text3 }}>Wrap:</span> {String(selectedConvo.wrap_preferences.wrap_type).replace('_', ' ')}</span>
                  )}
                  {selectedConvo.quote_data?.total && (
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: c.green, fontWeight: 600 }}>
                      Quote: ${selectedConvo.quote_data.total.toLocaleString()}
                    </span>
                  )}
                </div>
              )}

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {loadingMsgs ? (
                  <div style={{ textAlign: 'center', padding: 40, color: c.text3 }}>Loading messages...</div>
                ) : messages.map(msg => {
                  const isOutbound = msg.direction === 'outbound'
                  const isAI = msg.role === 'ai' || msg.sent_by === 'ai'
                  const isHuman = msg.role === 'human_agent' || msg.sent_by === 'human_agent'

                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOutbound ? 'flex-end' : 'flex-start', maxWidth: '80%', alignSelf: isOutbound ? 'flex-end' : 'flex-start' }}>
                      {/* Timestamp + role */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2, fontSize: 10, color: c.text3 }}>
                        {isAI && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '0 4px', borderRadius: 3, background: `${c.cyan}15`, color: c.cyan, fontSize: 9, fontWeight: 600 }}><Bot size={8} /> V.I.N.Y.L.</span>}
                        {isHuman && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '0 4px', borderRadius: 3, background: `${c.purple}15`, color: c.purple, fontSize: 9, fontWeight: 600 }}><UserCheck size={8} /> AGENT</span>}
                        {!isOutbound && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '0 4px', borderRadius: 3, background: `${c.green}15`, color: c.green, fontSize: 9, fontWeight: 600 }}><User size={8} /> CUSTOMER</span>}
                        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatTimestamp(msg.created_at)}</span>
                        {isAI && msg.ai_confidence != null && (
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: msg.ai_confidence > 0.8 ? c.green : msg.ai_confidence > 0.6 ? c.amber : c.red }}>
                            {Math.round(msg.ai_confidence * 100)}%
                          </span>
                        )}
                      </div>

                      {/* Bubble */}
                      <div style={{
                        padding: '8px 14px', borderRadius: 10,
                        borderTopLeftRadius: !isOutbound ? 2 : 10,
                        borderTopRightRadius: isOutbound ? 2 : 10,
                        fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word' as const, maxWidth: '100%',
                        ...(isAI ? { background: `${c.cyan}10`, border: `1px solid ${c.cyan}20`, color: c.text1 }
                          : isHuman ? { background: `${c.purple}12`, border: `1px solid ${c.purple}20`, color: c.text1 }
                          : isOutbound ? { background: `${c.accent}18`, border: `1px solid ${c.accent}25`, color: c.text1 }
                          : { background: c.surface, border: `1px solid ${c.border}`, color: c.text1 }),
                      }}>
                        {msg.subject && <div style={{ fontSize: 11, fontWeight: 600, color: c.text2, marginBottom: 4, paddingBottom: 4, borderBottom: `1px solid ${c.border}` }}>{msg.subject}</div>}
                        {msg.content}
                      </div>

                      {/* AI Reasoning (collapsible) */}
                      {isAI && msg.ai_reasoning && (
                        <div style={{ marginTop: 2 }}>
                          <button onClick={() => toggleReasoning(msg.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 4, border: 'none', background: 'transparent', color: c.text3, fontSize: 10, cursor: 'pointer' }}
                          >
                            <Brain size={10} /> {showReasoning[msg.id] ? 'Hide' : 'Show'} reasoning
                          </button>
                          {showReasoning[msg.id] && (
                            <div style={{ padding: '6px 10px', marginTop: 2, borderRadius: 6, background: `${c.purple}08`, border: `1px solid ${c.purple}15`, fontSize: 11, color: c.text2, lineHeight: 1.4, fontStyle: 'italic' }}>
                              {msg.ai_reasoning}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Compose */}
              <div style={{ padding: '10px 16px', borderTop: `1px solid ${c.border}`, background: c.surface }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: c.bg, borderRadius: 10, border: `1px solid ${c.border}`, padding: '8px 12px' }}>
                  <textarea
                    ref={textareaRef}
                    value={composeText}
                    onChange={e => setComposeText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder={selectedConvo.ai_enabled ? 'Type to send as human (pauses AI for this message)...' : 'Type a message...'}
                    rows={1}
                    style={{ flex: 1, background: 'transparent', border: 'none', color: c.text1, fontSize: 13, lineHeight: 1.5, resize: 'none', outline: 'none', maxHeight: 120, minHeight: 20, fontFamily: 'inherit', padding: '6px 0' }}
                  />
                  <button onClick={handleSend} disabled={!composeText.trim() || sending}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, border: 'none',
                      background: composeText.trim() ? c.accent : `${c.accent}30`, color: composeText.trim() ? '#fff' : c.text3,
                      cursor: composeText.trim() ? 'pointer' : 'default', flexShrink: 0, minWidth: 44, minHeight: 44, padding: 0,
                    }}>
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile CSS */}
      <style>{`
        @media (max-width: 768px) {
          .inbox-left-panel { width: 100% !important; min-width: 100% !important; position: absolute !important; left: 0 !important; top: 0 !important; bottom: 0 !important; z-index: 10 !important; transform: translateX(0) !important; }
          .inbox-left-panel[style*="translateX(-100%)"] { transform: translateX(-100%) !important; }
          .inbox-right-panel { position: absolute !important; left: 0 !important; top: 0 !important; right: 0 !important; bottom: 0 !important; }
          .inbox-mobile-back { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
