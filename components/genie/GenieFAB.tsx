'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Sparkles, X, Send, RotateCcw, ChevronDown,
  Lightbulb, AlertTriangle, Zap
} from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Suggestion {
  id: string
  type: 'action' | 'warning' | 'tip' | 'opportunity'
  title: string
  message: string
  action_label?: string
  action_url?: string
  priority: 'high' | 'medium' | 'low'
}

interface GenieFABProps {
  userName?: string
  userRole?: string
  entityData?: Record<string, unknown>
}

const QUICK_PROMPTS = [
  "What should I focus on today?",
  "Explain how commission is calculated",
  "Draft a follow-up email for an old lead",
  "What's the formula for GPM?",
  "How do I add a customer expense?",
]

const typeIcon = {
  action:      Zap,
  warning:     AlertTriangle,
  tip:         Lightbulb,
  opportunity: Sparkles,
}

const typeColor = {
  action:      '#4f7fff',
  warning:     '#f59e0b',
  tip:         '#22d3ee',
  opportunity: '#22c07a',
}

export default function GenieFAB({ userName, userRole, entityData }: GenieFABProps) {
  const [open, setOpen]           = useState(false)
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [tab, setTab]             = useState<'chat' | 'tips'>('chat')
  const bottomRef                 = useRef<HTMLDivElement>(null)
  const pathname                  = usePathname()
  const router                    = useRouter()

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load suggestions when drawer opens
  const loadSuggestions = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/genie-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            userName, userRole, currentPage: pathname,
            timestamp: new Date().toISOString(),
          },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions || [])
      }
    } catch {
      // Silently fail — suggestions are non-critical
    }
  }, [userName, userRole, pathname])

  useEffect(() => {
    if (open && suggestions.length === 0) {
      loadSuggestions()
    }
  }, [open, loadSuggestions, suggestions.length])

  const sendMessage = async (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg || loading) return

    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/ai/genie-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          context: {
            userName, userRole,
            currentPage: pathname,
            entityData,
          },
          conversationHistory: newMessages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Sorry, I'm having trouble connecting right now. Please try again.",
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Connection error. Please check your internet and try again.",
      }])
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <>
      {/* ── Chat Drawer ──────────────────────────────────────── */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 80,
          right: 20,
          width: 380,
          height: 540,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} style={{ color: '#fff' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>V.I.N.Y.L.</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>AI Sales Broker</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={clearChat}
                title="Clear chat"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', padding: 4, borderRadius: 6 }}
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 4, borderRadius: 6 }}
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            {(['chat', 'tips'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  fontSize: 12,
                  fontWeight: tab === t ? 700 : 400,
                  color: tab === t ? 'var(--accent)' : 'var(--text3)',
                  background: 'none',
                  border: 'none',
                  borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {t === 'tips' ? `Tips ${suggestions.length > 0 ? `(${suggestions.length})` : ''}` : 'Chat'}
              </button>
            ))}
          </div>

          {tab === 'chat' ? (
            <>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', paddingTop: 20 }}>
                    <Sparkles size={32} style={{ color: 'var(--accent)', opacity: 0.5, margin: '0 auto 10px' }} />
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
                      Hi {userName || 'there'}! How can I help?
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {QUICK_PROMPTS.map(p => (
                        <button
                          key={p}
                          onClick={() => sendMessage(p)}
                          style={{
                            padding: '7px 12px',
                            background: 'var(--surface2)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            fontSize: 12,
                            color: 'var(--text2)',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{
                      maxWidth: '85%',
                      padding: '8px 12px',
                      borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      background: msg.role === 'user'
                        ? 'var(--accent)'
                        : 'var(--surface2)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text1)',
                      fontSize: 13,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '12px 12px 12px 4px',
                      background: 'var(--surface2)',
                      fontSize: 13,
                      color: 'var(--text3)',
                    }}>
                      Thinking...
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{
                padding: '10px 12px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: 8,
                flexShrink: 0,
              }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder="Ask V.I.N.Y.L. anything..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text1)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  style={{
                    padding: '8px 12px',
                    background: input.trim() && !loading ? 'var(--accent)' : 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: input.trim() && !loading ? '#fff' : 'var(--text3)',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Send size={14} />
                </button>
              </div>
            </>
          ) : (
            /* Tips tab */
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {suggestions.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text3)', fontSize: 13 }}>
                  Loading suggestions...
                </div>
              ) : (
                suggestions.map(s => {
                  const Icon = typeIcon[s.type] ?? Lightbulb
                  const color = typeColor[s.type] ?? '#4f7fff'
                  return (
                    <div
                      key={s.id}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--surface2)',
                        border: `1px solid ${color}30`,
                        borderRadius: 10,
                        borderLeft: `3px solid ${color}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <Icon size={14} style={{ color, flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', marginBottom: 3 }}>
                            {s.title}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                            {s.message}
                          </div>
                          {s.action_label && s.action_url && (
                            <button
                              onClick={() => { setOpen(false); router.push(s.action_url!) }}
                              style={{
                                display: 'inline-block',
                                marginTop: 6,
                                padding: '3px 10px',
                                background: `${color}18`,
                                color,
                                borderRadius: 5,
                                fontSize: 11,
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {s.action_label}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <button
                onClick={loadSuggestions}
                style={{
                  marginTop: 8,
                  padding: '8px 0',
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text3)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Refresh tips
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── FAB Button ───────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: open
            ? '#7c3aed'
            : 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          boxShadow: '0 4px 20px rgba(79,127,255,0.4)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        title={open ? 'Close V.I.N.Y.L.' : 'Open V.I.N.Y.L.'}
      >
        {open ? (
          <X size={22} style={{ color: '#fff' }} />
        ) : (
          <Sparkles size={22} style={{ color: '#fff' }} />
        )}
      </button>
    </>
  )
}
