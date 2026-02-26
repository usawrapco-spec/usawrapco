'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Bot, User, Zap, ZapOff, Play, Pause, Send, Plus,
  RefreshCw, AlertCircle, CheckCircle,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AiRule {
  id: string
  name: string
  trigger_type: string
  enabled: boolean
  ai_enabled: boolean
  ai_persona: string
  ai_goal: string
  ai_context: string | null
  max_ai_turns: number
}

interface ConvSummary {
  id: string
  customer_name: string
  last_msg: string
  last_msg_at: string
  ai_sent: boolean
  turns_used: number
  paused: boolean
}

interface ConvMessage {
  id: string
  direction: 'inbound' | 'outbound'
  body: string
  sent_by_ai: boolean
  created_at: string
  channel: string
}

interface AiConfig {
  ai_enabled: boolean
  ai_persona: string
  ai_goal: string
  ai_context: string
  max_turns: number
  turns_used: number
  paused_by: string | null
}

const PERSONA_LABELS = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly',     label: 'Friendly' },
  { value: 'hype',         label: 'Hype' },
  { value: 'brief',        label: 'Brief' },
]

const GOAL_LABELS = [
  { value: 'qualify',       label: 'Qualify Lead' },
  { value: 'book',          label: 'Book Appointment' },
  { value: 'send_proposal', label: 'Send Proposal' },
  { value: 'just_respond',  label: 'Just Respond' },
]

const TRIGGER_LABELS: Record<string, string> = {
  missed_call:     'Missed Call',
  new_lead:        'New Lead',
  new_sms_inbound: 'New Inbound SMS',
  no_response_24h: '24hr No Response',
  no_response_48h: '48hr No Response',
  estimate_viewed: 'Estimate Viewed',
  proposal_viewed: 'Proposal Viewed',
  deposit_paid:    'Deposit Paid',
  job_complete:    'Job Complete',
  keyword_match:   'Keyword Match',
}

function relTime(ts: string) {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const DEFAULT_CONFIG: AiConfig = {
  ai_enabled: true, ai_persona: 'professional', ai_goal: 'qualify',
  ai_context: '', max_turns: 5, turns_used: 0, paused_by: null,
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AICommsHubClient({ profile }: { profile: Profile }) {
  const supabase = createClient()

  const [rules,           setRules]           = useState<AiRule[]>([])
  const [convList,        setConvList]         = useState<ConvSummary[]>([])
  const [selConvId,       setSelConvId]        = useState<string | null>(null)
  const [messages,        setMessages]         = useState<ConvMessage[]>([])
  const [aiConfig,        setAiConfig]         = useState<AiConfig>(DEFAULT_CONFIG)
  const [configDirty,     setConfigDirty]      = useState(false)
  const [overrideMsg,     setOverrideMsg]      = useState('')
  const [saving,          setSaving]           = useState(false)
  const [loading,         setLoading]          = useState(true)
  const [sendingOverride, setSendingOverride]   = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── Load rules ───────────────────────────────────────────────────────────
  const loadRules = useCallback(async () => {
    const { data } = await supabase
      .from('ai_comm_rules')
      .select('*')
      .order('created_at')
    setRules((data as AiRule[]) || [])
  }, [supabase])

  // ── Load conversation feed ────────────────────────────────────────────────
  const loadConvFeed = useCallback(async () => {
    const { data: convData } = await supabase
      .from('conversations')
      .select('id, customer:customer_id(name), updated_at, conversation_ai_config(ai_enabled, turns_used, paused_by)')
      .order('updated_at', { ascending: false })
      .limit(30)

    if (!convData) { setLoading(false); return }

    const summaries: ConvSummary[] = []
    for (const c of convData) {
      const { data: lastMsgs } = await supabase
        .from('conversation_messages')
        .select('body, created_at, sent_by_ai, direction')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const lastMsg = lastMsgs?.[0]
      const cfg = (c as any).conversation_ai_config?.[0]

      summaries.push({
        id: c.id,
        customer_name: (c as any).customer?.name || 'Unknown',
        last_msg: lastMsg?.body?.slice(0, 80) || '—',
        last_msg_at: lastMsg?.created_at || (c as any).updated_at,
        ai_sent: !!lastMsg?.sent_by_ai,
        turns_used: cfg?.turns_used || 0,
        paused: !!cfg?.paused_by,
      })
    }

    setConvList(summaries)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadRules()
    loadConvFeed()
  }, [loadRules, loadConvFeed])

  // ── Load messages + config when conversation selected ────────────────────
  useEffect(() => {
    if (!selConvId) return
    async function load() {
      const [msgsRes, cfgRes] = await Promise.all([
        supabase
          .from('conversation_messages')
          .select('id, direction, body, sent_by_ai, created_at, channel')
          .eq('conversation_id', selConvId!)
          .order('created_at', { ascending: true })
          .limit(50),
        supabase
          .from('conversation_ai_config')
          .select('*')
          .eq('conversation_id', selConvId!)
          .single(),
      ])
      setMessages((msgsRes.data as ConvMessage[]) || [])
      if (cfgRes.data) {
        setAiConfig({
          ai_enabled: cfgRes.data.ai_enabled ?? true,
          ai_persona: cfgRes.data.ai_persona ?? 'professional',
          ai_goal:    cfgRes.data.ai_goal ?? 'qualify',
          ai_context: cfgRes.data.ai_context ?? '',
          max_turns:  cfgRes.data.max_turns ?? 5,
          turns_used: cfgRes.data.turns_used ?? 0,
          paused_by:  cfgRes.data.paused_by ?? null,
        })
      } else {
        setAiConfig(DEFAULT_CONFIG)
      }
      setConfigDirty(false)
    }
    load()
  }, [selConvId, supabase])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Realtime ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase.channel('ai-comms-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages' }, () => {
        loadConvFeed()
        if (selConvId) {
          supabase
            .from('conversation_messages')
            .select('id, direction, body, sent_by_ai, created_at, channel')
            .eq('conversation_id', selConvId)
            .order('created_at', { ascending: true })
            .limit(50)
            .then(({ data }) => data && setMessages(data as ConvMessage[]))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, loadConvFeed, selConvId])

  // ── Save thread config ────────────────────────────────────────────────────
  async function saveConfig() {
    if (!selConvId) return
    setSaving(true)
    await fetch('/api/ai/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: selConvId, ...aiConfig }),
    })
    setSaving(false)
    setConfigDirty(false)
  }

  // ── Pause / Resume AI ─────────────────────────────────────────────────────
  async function togglePause() {
    if (!selConvId) return
    const shouldPause = !aiConfig.paused_by
    await fetch('/api/ai/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: selConvId, pause: shouldPause }),
    })
    setAiConfig(prev => ({
      ...prev,
      paused_by:  shouldPause ? profile.id : null,
      ai_enabled: !shouldPause,
    }))
    loadConvFeed()
  }

  // ── Send override message ─────────────────────────────────────────────────
  async function sendOverride() {
    if (!selConvId || !overrideMsg.trim()) return
    setSendingOverride(true)
    const { data: conv } = await supabase
      .from('conversations')
      .select('customer:customer_id(phone, id)')
      .eq('id', selConvId)
      .single()

    const customer = (conv as any)?.customer
    if (customer?.phone) {
      await fetch('/api/comms/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: customer.phone, body: overrideMsg, customer_id: customer.id }),
      })
    }

    await supabase.from('conversation_messages').insert({
      conversation_id: selConvId,
      direction: 'outbound',
      channel: 'sms',
      body: overrideMsg,
      sent_by_ai: false,
    })

    // Pause AI — human took over
    await fetch('/api/ai/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: selConvId, pause: true }),
    })
    setAiConfig(prev => ({ ...prev, paused_by: profile.id, ai_enabled: false }))
    setOverrideMsg('')
    setSendingOverride(false)
  }

  // ── Toggle rule enabled ───────────────────────────────────────────────────
  async function toggleRule(id: string, enabled: boolean) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r))
    await fetch(`/api/ai/rules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
  }

  const selectedConv = convList.find(c => c.id === selConvId)

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '7px 10px',
    color: 'var(--text1)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
  }

  const btnPrimary: React.CSSProperties = {
    padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 12,
  }

  const btnDanger: React.CSSProperties = {
    ...btnPrimary,
    background: 'rgba(242,90,90,0.15)', color: 'var(--red)',
    border: '1px solid rgba(242,90,90,0.3)',
  }

  const btnGhost: React.CSSProperties = {
    ...btnPrimary,
    background: 'rgba(34,192,122,0.12)', color: 'var(--green)',
    border: '1px solid rgba(34,192,122,0.2)',
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>

      {/* ── LEFT: Feed + Rules (260px) ── */}
      <div style={{
        width: 260, flexShrink: 0, height: '100%',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--surface)',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={16} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)' }}>AI Comms Hub</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
            Live AI conversation feed
          </div>
        </div>

        {/* Feed */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text3)', padding: '10px 14px 4px' }}>
          Live Feed
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
              <RefreshCw size={14} style={{ margin: '0 auto 8px', display: 'block' }} />
              Loading…
            </div>
          )}
          {!loading && convList.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
              No conversations yet
            </div>
          )}
          {convList.map(conv => (
            <button
              key={conv.id}
              onClick={() => setSelConvId(conv.id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 14px', border: 'none', cursor: 'pointer',
                background: selConvId === conv.id ? 'rgba(79,127,255,0.1)' : 'transparent',
                borderLeft: `3px solid ${selConvId === conv.id ? 'var(--accent)' : 'transparent'}`,
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.customer_name}
                </span>
                {conv.paused
                  ? <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: 'var(--amber)', border: '1px solid rgba(245,158,11,0.2)', fontWeight: 700, flexShrink: 0 }}>HUMAN</span>
                  : conv.ai_sent
                  ? <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(79,127,255,0.15)', color: 'var(--accent)', border: '1px solid rgba(79,127,255,0.2)', fontWeight: 700, flexShrink: 0 }}>AI</span>
                  : null
                }
                <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>{relTime(conv.last_msg_at)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {conv.last_msg}
              </div>
              {conv.turns_used > 0 && (
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                  {conv.turns_used} AI turns used
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Rules */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 4px' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text3)' }}>AI Rules</span>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 700 }}>
              <Plus size={10} /> New
            </button>
          </div>
          {rules.map(rule => (
            <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <button
                onClick={() => toggleRule(rule.id, !rule.enabled)}
                style={{
                  width: 32, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: rule.enabled ? 'var(--green)' : 'rgba(255,255,255,0.1)',
                  position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, left: rule.enabled ? 14 : 2,
                  width: 14, height: 14, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: rule.enabled ? 'var(--text1)' : 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {rule.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                  {TRIGGER_LABELS[rule.trigger_type] || rule.trigger_type}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CENTER: Thread ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
        {!selConvId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text3)' }}>
            <Bot size={40} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>Select a conversation to view AI activity</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={16} color="var(--text2)" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{selectedConv?.customer_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {aiConfig.paused_by ? 'Human takeover active' : `AI active · ${aiConfig.turns_used}/${aiConfig.max_turns} turns used`}
                </div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                {aiConfig.paused_by
                  ? <button onClick={togglePause} style={{ ...btnGhost, display: 'flex', alignItems: 'center', gap: 5 }}><Play size={12} /> Resume AI</button>
                  : <button onClick={togglePause} style={{ ...btnDanger, display: 'flex', alignItems: 'center', gap: 5 }}><Pause size={12} /> Pause AI</button>
                }
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.direction === 'outbound' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
                  {msg.direction === 'inbound' && (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={12} color="var(--text2)" />
                    </div>
                  )}
                  <div style={{ maxWidth: '65%' }}>
                    {msg.direction === 'outbound' && msg.sent_by_ai && (
                      <div style={{ fontSize: 10, color: 'var(--accent)', marginBottom: 2, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                        <Bot size={10} /> AI sent
                      </div>
                    )}
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: msg.direction === 'outbound' ? '12px 12px 4px 12px' : '4px 12px 12px 12px',
                      background: msg.direction === 'outbound'
                        ? msg.sent_by_ai ? 'rgba(79,127,255,0.18)' : 'var(--accent)'
                        : 'var(--surface2)',
                      border: msg.sent_by_ai ? '1px solid rgba(79,127,255,0.3)' : 'none',
                      color: 'var(--text1)', fontSize: 13, lineHeight: 1.55,
                    }}>
                      {msg.body}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, textAlign: msg.direction === 'outbound' ? 'right' : 'left' }}>
                      {relTime(msg.created_at)}
                    </div>
                  </div>
                  {msg.direction === 'outbound' && (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: msg.sent_by_ai ? 'rgba(79,127,255,0.2)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {msg.sent_by_ai ? <Bot size={12} color="var(--accent)" /> : <User size={12} color="#fff" />}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Override input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, background: 'var(--surface)' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={10} />
                Override AI — sends immediately and pauses auto-respond for this thread
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={overrideMsg}
                  onChange={e => setOverrideMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendOverride()}
                  placeholder="Type an override message…"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={sendOverride}
                  disabled={!overrideMsg.trim() || sendingOverride}
                  style={{ ...btnPrimary, opacity: overrideMsg.trim() && !sendingOverride ? 1 : 0.4, cursor: overrideMsg.trim() && !sendingOverride ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Send size={13} />
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── RIGHT: Settings panel (272px) ── */}
      <div style={{ width: 272, flexShrink: 0, height: '100%', overflowY: 'auto', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
            {selConvId ? 'Thread Settings' : 'AI Settings'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {selConvId ? 'Per-thread overrides — live effect' : 'Select a conversation'}
          </div>
        </div>

        {selConvId ? (
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* AI toggle */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>AI Auto-respond</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[true, false].map(val => (
                  <button key={String(val)} onClick={() => { setAiConfig(p => ({ ...p, ai_enabled: val })); setConfigDirty(true) }} style={{
                    flex: 1, padding: '6px 0', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 12,
                    background: aiConfig.ai_enabled === val ? (val ? 'rgba(34,192,122,0.15)' : 'rgba(242,90,90,0.15)') : 'rgba(255,255,255,0.05)',
                    color: aiConfig.ai_enabled === val ? (val ? 'var(--green)' : 'var(--red)') : 'var(--text3)',
                    border: aiConfig.ai_enabled === val ? `1px solid ${val ? 'rgba(34,192,122,0.3)' : 'rgba(242,90,90,0.3)'}` : '1px solid transparent',
                  }}>
                    {val ? 'ON' : 'OFF'}
                  </button>
                ))}
              </div>
            </div>

            {/* Persona */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Persona</div>
              <select value={aiConfig.ai_persona} onChange={e => { setAiConfig(p => ({ ...p, ai_persona: e.target.value })); setConfigDirty(true) }} style={{ ...inputStyle, cursor: 'pointer' }}>
                {PERSONA_LABELS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {/* Goal */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Goal</div>
              <select value={aiConfig.ai_goal} onChange={e => { setAiConfig(p => ({ ...p, ai_goal: e.target.value })); setConfigDirty(true) }} style={{ ...inputStyle, cursor: 'pointer' }}>
                {GOAL_LABELS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>

            {/* Max turns */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Max AI Turns: {aiConfig.max_turns}</div>
              <input type="range" min={1} max={10} value={aiConfig.max_turns} onChange={e => { setAiConfig(p => ({ ...p, max_turns: Number(e.target.value) })); setConfigDirty(true) }} style={{ width: '100%' }} />
            </div>

            {/* Extra instructions */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Extra Instructions</div>
              <textarea value={aiConfig.ai_context} onChange={e => { setAiConfig(p => ({ ...p, ai_context: e.target.value })); setConfigDirty(true) }} placeholder="e.g. This customer is price-sensitive. Don't mention marine wraps." rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            {/* Turn progress bar */}
            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface2)' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Turns used this thread</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
                  <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(100, (aiConfig.turns_used / aiConfig.max_turns) * 100)}%`, background: aiConfig.turns_used >= aiConfig.max_turns ? 'var(--red)' : 'var(--accent)', transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text2)', flexShrink: 0 }}>{aiConfig.turns_used}/{aiConfig.max_turns}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {configDirty && (
                <button onClick={saveConfig} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {saving
                    ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    : <CheckCircle size={12} />}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              )}
              {aiConfig.paused_by
                ? <button onClick={togglePause} style={{ ...btnGhost, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Play size={12} /> Resume AI</button>
                : <button onClick={togglePause} style={{ ...btnDanger, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Pause size={12} /> Pause AI / Take Over</button>
              }
            </div>

            {/* Status chip */}
            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface2)' }}>
              {aiConfig.paused_by
                ? <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><ZapOff size={14} color="var(--amber)" /><span style={{ fontSize: 12, color: 'var(--amber)' }}>Human takeover active</span></div>
                : <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Zap size={14} color="var(--green)" /><span style={{ fontSize: 12, color: 'var(--green)' }}>AI is active on this thread</span></div>
              }
            </div>
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
            <Bot size={32} style={{ marginBottom: 10, opacity: 0.25, display: 'block', margin: '0 auto 10px' }} />
            Select a conversation from the feed to adjust its AI settings on the fly.
          </div>
        )}

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
