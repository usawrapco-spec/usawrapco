'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Brain, RefreshCw, ChevronDown, ChevronUp, Square, CheckSquare,
  AlertTriangle, AlertCircle, Info, Plus, Trash2, Send, Phone,
  MessageSquare, Clock, Sparkles, History, Mic, BarChart3,
} from 'lucide-react'

interface BriefSection {
  title: string
  level: 'critical' | 'warning' | 'info'
  items: string[]
}

interface ActionItem {
  id: string
  text: string
  priority: 'high' | 'medium' | 'low'
}

interface Recap {
  id: string
  sections: BriefSection[]
  action_items: ActionItem[]
  recap_text: string
  generated_at: string
  cached?: boolean
}

interface Instruction {
  id: string
  value: string
  created_at: string
}

interface CallLog {
  id: string
  direction?: string
  status?: string
  duration_seconds?: number
  caller_number?: string
  caller_name?: string
  created_at: string
  notes?: string
  recording_url?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  profile: Profile
}

function sectionColor(level: string) {
  if (level === 'critical') return { icon: AlertTriangle, color: '#f25a5a', bg: 'rgba(242,90,90,0.06)', border: 'rgba(242,90,90,0.2)' }
  if (level === 'warning') return { icon: AlertCircle, color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)' }
  return { icon: Info, color: '#4f7fff', bg: 'rgba(79,127,255,0.06)', border: 'rgba(79,127,255,0.2)' }
}

function priorityColor(p: string) {
  if (p === 'high') return '#f25a5a'
  if (p === 'medium') return '#f59e0b'
  return '#22c07a'
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Tab: Today's Brief ────────────────────────────────────────────────────────
function BriefTab({ profile }: { profile: Profile }) {
  const [recap, setRecap] = useState<Recap | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [doneItems, setDoneItems] = useState<Set<string>>(new Set())
  const [history, setHistory] = useState<Recap[]>([])
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (recap?.id) {
      try {
        const stored = localStorage.getItem(`vinyl_done_${recap.id}`)
        if (stored) setDoneItems(new Set(JSON.parse(stored)))
      } catch {}
    }
  }, [recap?.id])

  function toggleDone(itemId: string) {
    setDoneItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      if (recap?.id) {
        try { localStorage.setItem(`vinyl_done_${recap.id}`, JSON.stringify([...next])) } catch {}
      }
      return next
    })
  }

  const loadRecap = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      if (!res.ok) throw new Error('Failed to load brief')
      const data = await res.json()
      setRecap(data)
      const expanded: Record<string, boolean> = {}
      ;(data.sections || []).forEach((_: any, i: number) => { expanded[i] = true })
      setExpandedSections(expanded)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  async function loadHistory() {
    const supabase = createClient()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('ai_recaps')
      .select('id, sections, action_items, recap_text, generated_at')
      .gte('generated_at', sevenDaysAgo)
      .order('generated_at', { ascending: false })
      .limit(20)
    setHistory((data || []) as Recap[])
  }

  useEffect(() => {
    loadRecap()
    loadHistory()
  }, [loadRecap])

  const pendingCount = recap?.action_items?.filter(a => !doneItems.has(a.id)).length ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Greeting + refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, color: 'var(--text1)' }}>
            {greeting()}, {profile.name?.split(' ')[0] || 'Owner'}
          </div>
          {recap?.generated_at && (
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} />
              Brief generated {new Date(recap.generated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              {recap.cached && <span style={{ color: '#22c07a', fontSize: 10 }}> · cached</span>}
            </div>
          )}
        </div>
        <button
          onClick={() => loadRecap(true)}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            border: '1px solid rgba(79,127,255,0.3)',
            background: 'rgba(79,127,255,0.1)',
            color: '#4f7fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh Brief
        </button>
      </div>

      {loading && !recap && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
          <Sparkles size={28} style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px', color: '#8b5cf6' }} />
          <div style={{ fontSize: 14 }}>V.I.N.Y.L. is analyzing your business...</div>
        </div>
      )}

      {error && (
        <div style={{ padding: '14px 18px', background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.2)', borderRadius: 10, color: '#f25a5a', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Sections */}
      {(recap?.sections || []).map((section, idx) => {
        const { icon: SIcon, color, bg, border } = sectionColor(section.level)
        const isOpen = expandedSections[idx] !== false
        return (
          <div key={idx} style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
            <button
              onClick={() => setExpandedSections(p => ({ ...p, [idx]: !p[idx] }))}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 18px', background: bg, border: 'none', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <SIcon size={15} color={color} />
                <span style={{ fontSize: 13, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {section.title}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace" }}>
                  ({section.items?.length || 0})
                </span>
              </div>
              {isOpen ? <ChevronUp size={14} color="var(--text3)" /> : <ChevronDown size={14} color="var(--text3)" />}
            </button>
            {isOpen && (
              <div style={{ padding: '12px 18px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(section.items || []).map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: 'var(--text1)', lineHeight: 1.6 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, marginTop: 8, flexShrink: 0 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Action Items */}
      {(recap?.action_items || []).length > 0 && (
        <div style={{ border: '1px solid rgba(34,192,122,0.2)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', background: 'rgba(34,192,122,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckSquare size={15} color="#22c07a" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#22c07a', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Action Items
            </span>
            {pendingCount > 0 && (
              <span style={{
                background: 'rgba(34,192,122,0.15)', color: '#22c07a',
                fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
              }}>
                {pendingCount} remaining
              </span>
            )}
          </div>
          <div style={{ padding: '10px 18px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(recap?.action_items || []).map(item => {
              const done = doneItems.has(item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => toggleDone(item.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '9px 12px', borderRadius: 8,
                    background: done ? 'rgba(34,192,122,0.05)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${done ? 'rgba(34,192,122,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  {done
                    ? <CheckSquare size={15} color="#22c07a" style={{ flexShrink: 0, marginTop: 1 }} />
                    : <Square size={15} color="var(--text3)" style={{ flexShrink: 0, marginTop: 1 }} />
                  }
                  <span style={{
                    flex: 1, fontSize: 13.5, color: done ? 'var(--text3)' : 'var(--text1)',
                    textDecoration: done ? 'line-through' : 'none',
                  }}>
                    {item.text}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    color: priorityColor(item.priority),
                    background: `${priorityColor(item.priority)}18`,
                    textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
                  }}>
                    {item.priority}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* History */}
      <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
        <button
          onClick={() => setShowHistory(p => !p)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', background: 'rgba(255,255,255,0.02)', border: 'none', cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={14} color="var(--text3)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Past Briefs (last 7 days)
            </span>
          </div>
          {showHistory ? <ChevronUp size={13} color="var(--text3)" /> : <ChevronDown size={13} color="var(--text3)" />}
        </button>
        {showHistory && (
          <div style={{ padding: '10px 18px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>
                No past briefs found
              </div>
            )}
            {history.map(h => (
              <div key={h.id} style={{
                padding: '10px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                  {new Date(h.generated_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.5 }}>
                  {h.recap_text?.substring(0, 200)}{h.recap_text?.length > 200 ? '...' : ''}
                </div>
                {h.action_items?.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text3)' }}>
                    {h.action_items.length} action items
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

// ─── Tab: Phone Call Analysis ──────────────────────────────────────────────────
function CallAnalysisTab() {
  const [calls, setCalls] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [analyses, setAnalyses] = useState<Record<string, any>>({})

  useEffect(() => {
    async function loadCalls() {
      const supabase = createClient()
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('call_logs')
        .select('id, direction, status, duration_seconds, caller_number, caller_name, created_at, notes, recording_url')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(50)
      setCalls((data || []) as CallLog[])
      setLoading(false)
    }
    loadCalls()
  }, [])

  async function analyzeCall(callId: string) {
    setAnalyzing(callId)
    try {
      const res = await fetch('/api/ai/analyze-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId }),
      })
      const data = await res.json()
      if (data.analysis) {
        setAnalyses(p => ({ ...p, [callId]: data.analysis }))
        // Update local calls with new notes
        setCalls(prev => prev.map(c =>
          c.id === callId ? { ...c, notes: data.analysis.summary } : c
        ))
      }
    } finally {
      setAnalyzing(null)
    }
  }

  function formatDuration(secs?: number) {
    if (!secs) return '—'
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
        <Phone size={24} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
        Loading calls...
      </div>
    )
  }

  if (!calls.length) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)' }}>
        <Phone size={32} style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px', opacity: 0.4 }} />
        <div style={{ fontSize: 14 }}>No call logs found</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Calls will appear here once your phone system is connected</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>
        {calls.length} calls in the last 30 days — click "Analyze" to extract promises and action items
      </div>
      {calls.map(call => {
        const analysis = analyses[call.id]
        const isAnalyzing = analyzing === call.id
        const dirColor = call.direction === 'inbound' ? '#22d3ee' : '#8b5cf6'
        const statusColor = call.status === 'missed' || call.status === 'no-answer' ? '#f25a5a' : '#22c07a'

        return (
          <div key={call.id} style={{
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10,
            overflow: 'hidden', background: 'rgba(255,255,255,0.01)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: `${dirColor}18`, border: `1px solid ${dirColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Phone size={15} color={dirColor} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text1)' }}>
                    {call.caller_name || call.caller_number || 'Unknown Caller'}
                  </span>
                  {call.direction && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
                      background: `${dirColor}15`, color: dirColor, textTransform: 'capitalize',
                    }}>
                      {call.direction}
                    </span>
                  )}
                  {call.status && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
                      background: `${statusColor}15`, color: statusColor, textTransform: 'capitalize',
                    }}>
                      {call.status}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {new Date(call.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  {call.duration_seconds ? ` · ${formatDuration(call.duration_seconds)}` : ''}
                  {call.caller_number && call.caller_name ? ` · ${call.caller_number}` : ''}
                </div>
              </div>
              <button
                onClick={() => analyzeCall(call.id)}
                disabled={isAnalyzing || !!analysis}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 7,
                  background: analysis ? 'rgba(34,192,122,0.1)' : 'rgba(79,127,255,0.1)',
                  border: `1px solid ${analysis ? 'rgba(34,192,122,0.2)' : 'rgba(79,127,255,0.2)'}`,
                  color: analysis ? '#22c07a' : '#4f7fff',
                  fontSize: 12, fontWeight: 600, cursor: analysis ? 'default' : 'pointer',
                  flexShrink: 0,
                }}
              >
                <BarChart3 size={12} />
                {isAnalyzing ? 'Analyzing...' : analysis ? 'Analyzed' : 'Analyze'}
              </button>
            </div>

            {/* Analysis results */}
            {analysis && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', background: 'rgba(0,0,0,0.15)' }}>
                <div style={{ fontSize: 13, color: 'var(--text1)', marginBottom: 8, lineHeight: 1.5 }}>
                  {analysis.summary}
                </div>
                {analysis.action_items?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Action Items
                    </div>
                    {analysis.action_items.map((item: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--text2)', marginBottom: 3 }}>
                        <span style={{ color: '#4f7fff' }}>→</span>
                        {item}
                      </div>
                    ))}
                  </div>
                )}
                {analysis.promises_made?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Promises / Commitments
                    </div>
                    {analysis.promises_made.map((p: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12, color: '#f59e0b', marginBottom: 3 }}>
                        <span>!</span>
                        {p}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    background: analysis.priority === 'high' ? 'rgba(242,90,90,0.15)' : 'rgba(79,127,255,0.15)',
                    color: analysis.priority === 'high' ? '#f25a5a' : '#4f7fff',
                    textTransform: 'uppercase',
                  }}>
                    {analysis.priority} priority
                  </span>
                  {analysis.sentiment && (
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                      Sentiment: {analysis.sentiment}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Existing notes */}
            {call.notes && !analysis && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '8px 16px', fontSize: 12, color: 'var(--text3)' }}>
                {call.notes}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab: Ask V.I.N.Y.L. ──────────────────────────────────────────────────────
function ChatTab({ profile }: { profile: Profile }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)

    const userMsg: ChatMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])

    try {
      const res = await fetch('/api/ai/vinyl-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: messages }),
      })
      const data = await res.json()
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 280px)', minHeight: 480 }}>
      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 4px',
        display: 'flex', flexDirection: 'column', gap: 14,
        scrollbarWidth: 'thin',
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text3)' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'linear-gradient(135deg, #4f7fff20, #8b5cf620)',
              border: '1px solid rgba(79,127,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Brain size={24} color="#8b5cf6" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>
              Ask V.I.N.Y.L. anything
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
              I have full visibility into your jobs, customers, finances, and schedule.
              Ask me about anything happening in your business.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20 }}>
              {[
                'What jobs are at risk this week?',
                'Who are our top customers by revenue?',
                'Any overdue tasks I should know about?',
                'Draft a follow-up for my open estimates',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus() }}
                  style={{
                    padding: '6px 12px', borderRadius: 20,
                    border: '1px solid rgba(79,127,255,0.2)',
                    background: 'rgba(79,127,255,0.06)',
                    color: '#4f7fff', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            gap: 10,
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: 2,
              }}>
                <Brain size={13} color="#fff" />
              </div>
            )}
            <div style={{
              maxWidth: '78%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #4f7fff, #6366f1)'
                : 'var(--surface2)',
              border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.07)' : 'none',
              fontSize: 13.5,
              color: msg.role === 'user' ? '#fff' : 'var(--text1)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {sending && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Brain size={13} color="#fff" />
            </div>
            <div style={{
              padding: '10px 16px', borderRadius: '12px 12px 12px 3px',
              background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6',
                    animation: `bounce 1.2s infinite ${i * 0.2}s`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingTop: 14,
        display: 'flex', gap: 10, alignItems: 'flex-end',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
          }}
          placeholder="Ask V.I.N.Y.L. anything about your business..."
          rows={2}
          style={{
            flex: 1, background: 'var(--surface2)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
            padding: '10px 14px', color: 'var(--text1)', fontSize: 13.5,
            outline: 'none', resize: 'none', lineHeight: 1.5,
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          style={{
            width: 42, height: 42, borderRadius: 10, flexShrink: 0,
            background: input.trim() ? 'linear-gradient(135deg, #4f7fff, #8b5cf6)' : 'rgba(255,255,255,0.05)',
            border: 'none', cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Send size={16} color={input.trim() ? '#fff' : 'var(--text3)'} />
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
      `}</style>
    </div>
  )
}

// ─── Train V.I.N.Y.L. Panel ───────────────────────────────────────────────────
function TrainPanel() {
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const res = await fetch('/api/ai/train')
      if (res.ok) {
        const data = await res.json()
        setInstructions(data.instructions || [])
      }
    } catch {}
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!input.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/ai/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: input }),
      })
      if (res.ok) { setInput(''); await load() }
    } finally { setSaving(false) }
  }

  async function del(id: string) {
    await fetch(`/api/ai/train/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div style={{
      border: '1px solid rgba(139,92,246,0.2)',
      borderRadius: 12, padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Sparkles size={15} color="#8b5cf6" />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Train V.I.N.Y.L.
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.5 }}>
        Add custom instructions that V.I.N.Y.L. will follow in every brief and chat response.
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder='e.g. "Always flag customers who haven&apos;t been contacted in 3 days"'
          style={{
            flex: 1, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
            padding: '8px 12px', color: 'var(--text1)', fontSize: 13, outline: 'none',
          }}
        />
        <button
          onClick={save}
          disabled={saving || !input.trim()}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '8px 16px', borderRadius: 8,
            background: input.trim() ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(139,92,246,0.3)',
            color: '#8b5cf6', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={13} />
          Save
        </button>
      </div>
      {instructions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {instructions.map(inst => (
            <div key={inst.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '8px 12px', borderRadius: 8,
              background: 'rgba(139,92,246,0.06)',
              border: '1px solid rgba(139,92,246,0.15)',
            }}>
              <span style={{ fontSize: 12.5, color: 'var(--text2)', flex: 1, lineHeight: 1.5 }}>{inst.value}</span>
              <button
                onClick={() => del(inst.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'var(--text3)', flexShrink: 0 }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '8px 0' }}>
          No custom instructions yet
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function VinylAIPage({ profile }: Props) {
  const [tab, setTab] = useState<'brief' | 'calls' | 'chat'>('brief')

  const tabs = [
    { id: 'brief' as const, label: "Today's Brief", icon: Brain },
    { id: 'calls' as const, label: 'Call Analysis', icon: Phone },
    { id: 'chat' as const, label: 'Ask V.I.N.Y.L.', icon: MessageSquare },
  ]

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Brain size={22} color="#fff" />
        </div>
        <div>
          <div style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 900, fontSize: 26, color: 'var(--text1)', letterSpacing: '0.04em',
          }}>
            V.I.N.Y.L.
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            Virtual Intelligence Navigating Your Logistics — Owner Command Center
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 24,
        background: 'var(--surface)', borderRadius: 10, padding: 3,
        border: '1px solid rgba(255,255,255,0.06)', width: 'fit-content',
      }}>
        {tabs.map(t => {
          const TIcon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: active ? 'rgba(79,127,255,0.15)' : 'transparent',
                color: active ? '#4f7fff' : 'var(--text3)',
                fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <TIcon size={14} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {tab === 'brief' && <BriefTab profile={profile} />}
        {tab === 'calls' && <CallAnalysisTab />}
        {tab === 'chat' && <ChatTab profile={profile} />}
      </div>

      {/* Train V.I.N.Y.L. — always visible */}
      {tab !== 'chat' && (
        <div style={{ marginTop: 24 }}>
          <TrainPanel />
        </div>
      )}
    </div>
  )
}
