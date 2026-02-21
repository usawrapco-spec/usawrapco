'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkles, MessageSquare, Send, X,
  Zap, Mail, ListTodo, DollarSign,
} from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface GenieBarProps {
  userName: string
  userRole: string
}

// ── Rotating insights (demo mode) ──────────────────────────────────────────────

const INSIGHTS = [
  '3 jobs need attention -- no activity in 3+ days.',
  "Bob's Pizza has 5 trucks, you wrapped 2. Call about the other 3.",
  "Fleet renewal: Metro Cleaning's wrap is 11 months old.",
  'GPM trending up this month -- 68% avg vs 62% last month.',
  '2 proofs awaiting customer approval for 48+ hours.',
  'Installer Jake has availability next Tuesday-Thursday.',
  'Quick tip: Torres Roofing was referred by ABC Landscaping.',
  'Revenue this week: $12,400 -- on track to beat last week.',
]

// ── Quick-action chips ─────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Draft follow-up email', icon: Mail, prompt: 'Draft a follow-up email for a customer who hasn\'t responded in a week.' },
  { label: 'Create task', icon: ListTodo, prompt: 'Help me create a new task for my current priority jobs.' },
  { label: 'Suggest price', icon: DollarSign, prompt: 'What would be a good price for a standard full wrap on a box truck?' },
  { label: 'Summarize this job', icon: Zap, prompt: 'Summarize the current job I\'m looking at -- status, financials, next steps.' },
]

// ── Demo fallback responses ────────────────────────────────────────────────────

const DEMO_RESPONSES: Record<string, string> = {
  'attention': `Here are the jobs that need attention:\n\n- **Bob's Pizza** -- Last contact 14 days ago. Full wrap on Ford Transit, $4,200. No proof sent yet.\n- **Metro Cleaning #3** -- Install was scheduled for last Friday, still in production stage.\n- **Torres Roofing** -- Proof approved 5 days ago but no install date set.\n\nWant me to draft follow-up messages for any of these?`,
  'email': `Here's a follow-up template:\n\n---\n\nSubject: Quick update on your vehicle wrap\n\nHi [Customer],\n\nJust checking in on your wrap project. We have everything ready to move forward and wanted to confirm the next steps with you.\n\nWould any day next week work for you to finalize the details? We have availability Tuesday through Thursday.\n\nLooking forward to hearing from you!\n\nBest,\n${'{userName}'}\nUSA Wrap Co\n\n---\n\nWant me to adjust the tone or add specific project details?`,
  'revenue': `Here's your revenue snapshot:\n\n- **This week:** $12,400 (on track to beat last week's $11,800)\n- **This month:** $47,200 / $60,000 goal (79%)\n- **Avg GPM:** 68% (up from 62% last month)\n- **Jobs closed this month:** 8\n- **Pipeline value:** $34,500 across 6 active jobs\n\nYour top revenue driver this month is fleet work -- 3 fleet jobs totaling $28,000.`,
  'price': `For a standard full wrap on a box truck:\n\n- **Material:** 200-250 sqft vinyl + laminate = $800-$1,000\n- **Print:** ~$250\n- **Design:** $400-$600\n- **Install labor:** $1,200-$1,600 (16-20 hrs)\n- **Total cost:** $2,650-$3,450\n\nRecommended price: **$5,500-$7,000** depending on design complexity.\nTarget GPM: 55-65%\n\nWant me to build a detailed estimate?`,
  'summarize': `I don't have a specific job loaded right now, but here's what I can see on your current page.\n\nNavigate to a specific project and ask me again -- I'll pull in the full details including financials, stage, and recommended next actions.`,
}

function getDemoResponse(message: string, userName: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('attention') || lower.includes('stale') || lower.includes('need')) {
    return DEMO_RESPONSES.attention
  }
  if (lower.includes('email') || lower.includes('follow') || lower.includes('draft')) {
    return DEMO_RESPONSES.email.replace('{userName}', userName)
  }
  if (lower.includes('revenue') || lower.includes('money') || lower.includes('sales') || lower.includes('month')) {
    return DEMO_RESPONSES.revenue
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('quote') || lower.includes('suggest')) {
    return DEMO_RESPONSES.price
  }
  if (lower.includes('summarize') || lower.includes('summary') || lower.includes('job')) {
    return DEMO_RESPONSES.summarize
  }
  return `Great question! Here are a few things I can help with:\n\n- Draft customer emails and follow-ups\n- Suggest pricing for wrap jobs\n- Summarize job details and financials\n- Identify stale leads that need attention\n- Calculate GPM and commissions\n\nTry asking something specific and I'll dig in.`
}

// ── Session storage helpers ────────────────────────────────────────────────────

const STORAGE_KEY_MESSAGES = 'genie-bar-messages'
const STORAGE_KEY_EXPANDED = 'genie-bar-expanded'

function loadMessages(): Message[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_MESSAGES)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveMessages(msgs: Message[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(msgs))
  } catch { /* quota exceeded — ignore */ }
}

function loadExpanded(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY_EXPANDED) === 'true'
  } catch {
    return false
  }
}

function saveExpanded(v: boolean) {
  try {
    sessionStorage.setItem(STORAGE_KEY_EXPANDED, String(v))
  } catch { /* ignore */ }
}

// ── Typing animation helper ────────────────────────────────────────────────────

function useStreamedText(text: string, active: boolean, speed = 12): string {
  const [displayed, setDisplayed] = useState('')
  const idxRef = useRef(0)

  useEffect(() => {
    if (!active) {
      setDisplayed(text)
      idxRef.current = text.length
      return
    }
    setDisplayed('')
    idxRef.current = 0
    const interval = setInterval(() => {
      idxRef.current += 1
      const next = text.slice(0, idxRef.current)
      setDisplayed(next)
      if (idxRef.current >= text.length) clearInterval(interval)
    }, speed)
    return () => clearInterval(interval)
  }, [text, active, speed])

  return displayed
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function GenieBar({ userName, userRole }: GenieBarProps) {
  // Supabase client (available for future real-time queries)
  const _supabase = createClient()
  const pathname = usePathname()

  // State
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [insightIdx, setInsightIdx] = useState(0)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [inputFocused, setInputFocused] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const initRef = useRef(false)

  // ── Initialize from session storage ────────────────────────────────────────
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    setMessages(loadMessages())
    setExpanded(loadExpanded())
  }, [])

  // ── Persist state ──────────────────────────────────────────────────────────
  useEffect(() => { saveMessages(messages) }, [messages])
  useEffect(() => { saveExpanded(expanded) }, [expanded])

  // ── Auto-scroll chat ──────────────────────────────────────────────────────
  useEffect(() => {
    if (expanded) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, expanded])

  // ── Rotate insights every 8 seconds ────────────────────────────────────────
  useEffect(() => {
    if (expanded) return
    const timer = setInterval(() => {
      setInsightIdx(prev => (prev + 1) % INSIGHTS.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [expanded])

  // ── Focus input when expanding ─────────────────────────────────────────────
  useEffect(() => {
    if (expanded) {
      setTimeout(() => inputRef.current?.focus(), 320)
    }
  }, [expanded])

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    setInput('')
    if (!expanded) setExpanded(true)

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: msg,
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/genie-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          context: {
            page: pathname,
            role: userRole,
            userName,
          },
          conversationHistory: [...messages, userMsg].slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      let responseText: string
      if (res.ok) {
        const data = await res.json()
        responseText = data.response || 'I didn\'t get a response. Try again?'
      } else {
        // API failed — use demo fallback
        responseText = getDemoResponse(msg, userName)
      }

      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: responseText,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, aiMsg])
      setStreamingId(aiMsg.id)
      // Clear streaming state after animation completes
      setTimeout(() => setStreamingId(null), responseText.length * 12 + 200)
    } catch {
      // Network error — use demo fallback
      const fallback = getDemoResponse(msg, userName)
      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: fallback,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, aiMsg])
      setStreamingId(aiMsg.id)
      setTimeout(() => setStreamingId(null), fallback.length * 12 + 200)
    } finally {
      setLoading(false)
    }
  }, [input, loading, expanded, messages, pathname, userRole, userName])

  // ── Expand handler ─────────────────────────────────────────────────────────
  const handleExpand = useCallback(() => {
    if (!expanded) setExpanded(true)
  }, [expanded])

  const handleCollapse = useCallback(() => {
    setExpanded(false)
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'relative',
      zIndex: 50,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    }}>
      {/* ── Collapsed Bar ─────────────────────────────────────────────────── */}
      {!expanded && (
        <div
          onClick={handleExpand}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 44,
            padding: '0 16px',
            background: 'rgba(79,127,255,0.06)',
            borderLeft: '3px solid var(--accent)',
            borderBottom: '1px solid #1e2330',
            cursor: 'pointer',
            transition: 'background 0.2s',
            gap: 12,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(79,127,255,0.10)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(79,127,255,0.06)' }}
        >
          {/* Left: sparkle icon + rotating insight */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
          }}>
            <Sparkles size={16} style={{ color: '#8b5cf6', flexShrink: 0 }} />
            <span style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 700,
              fontSize: 13,
              color: '#8b5cf6',
              flexShrink: 0,
            }}>
              Genie:
            </span>
            <span
              key={insightIdx}
              style={{
                fontSize: 13,
                color: 'var(--text2)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                animation: 'genieBarFadeIn 0.5s ease-out',
              }}
            >
              {INSIGHTS[insightIdx]}
            </span>
          </div>

          {/* Right: Ask Genie input placeholder */}
          <div
            onClick={e => { e.stopPropagation(); handleExpand() }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid #1e2330',
              cursor: 'text',
              flexShrink: 0,
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(79,127,255,0.4)'
              ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#1e2330'
              ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'
            }}
          >
            <MessageSquare size={14} style={{ color: 'var(--text3)' }} />
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>Ask Genie...</span>
          </div>
        </div>
      )}

      {/* ── Expanded Panel ────────────────────────────────────────────────── */}
      <div style={{
        maxHeight: expanded ? 520 : 0,
        opacity: expanded ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
        background: 'rgba(22,25,32,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: expanded ? '0 0 12px 12px' : 0,
        border: expanded ? '1px solid #1e2330' : 'none',
        borderTop: expanded ? '1px solid rgba(79,127,255,0.2)' : 'none',
        boxShadow: expanded ? '0 16px 48px rgba(0,0,0,0.4)' : 'none',
      }}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid #1e2330',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} style={{ color: '#8b5cf6' }} />
            <span style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--text1)',
            }}>
              AI Genie
            </span>
            <span style={{
              fontSize: 11,
              color: 'var(--text3)',
              background: 'rgba(139,92,246,0.1)',
              padding: '2px 8px',
              borderRadius: 10,
            }}>
              {userRole.replace('_', ' ')}
            </span>
          </div>
          <button
            onClick={handleCollapse}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text3)',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)' }}
            title="Collapse"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Chat messages ──────────────────────────────────────────── */}
        <div style={{
          maxHeight: 400,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minHeight: 120,
        }}>
          {messages.length === 0 && !loading && (
            <div style={{
              textAlign: 'center',
              padding: '24px 0 12px',
              color: 'var(--text3)',
              fontSize: 13,
            }}>
              <Sparkles size={24} style={{ color: '#8b5cf6', opacity: 0.4, margin: '0 auto 8px', display: 'block' }} />
              Hi {userName.split(' ')[0]}, ask me anything about your shop.
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              streaming={msg.id === streamingId}
            />
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={12} style={{ color: '#8b5cf6', flexShrink: 0 }} />
              <div style={{
                padding: '8px 14px',
                borderRadius: '12px 12px 12px 4px',
                background: 'rgba(139,92,246,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <span style={{ animation: 'genieDot 1.4s ease-in-out infinite', width: 6, height: 6, borderRadius: '50%', background: 'var(--text3)', display: 'inline-block' }} />
                <span style={{ animation: 'genieDot 1.4s ease-in-out 0.2s infinite', width: 6, height: 6, borderRadius: '50%', background: 'var(--text3)', display: 'inline-block' }} />
                <span style={{ animation: 'genieDot 1.4s ease-in-out 0.4s infinite', width: 6, height: 6, borderRadius: '50%', background: 'var(--text3)', display: 'inline-block' }} />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* ── Quick-action chips ──────────────────────────────────────── */}
        {messages.length === 0 && !loading && (
          <div style={{
            padding: '0 16px 8px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}>
            {QUICK_ACTIONS.map(action => {
              const Icon = action.icon
              return (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.prompt)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 10px',
                    borderRadius: 8,
                    border: '1px solid #1e2330',
                    background: 'rgba(255,255,255,0.03)',
                    color: 'var(--text2)',
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(79,127,255,0.4)'
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(79,127,255,0.08)'
                    ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#1e2330'
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'
                    ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text2)'
                  }}
                >
                  <Icon size={12} />
                  {action.label}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Input bar ──────────────────────────────────────────────── */}
        <div style={{
          padding: '10px 16px 12px',
          borderTop: '1px solid #1e2330',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Ask the Genie anything..."
            style={{
              flex: 1,
              height: 44,
              padding: '0 14px',
              background: '#161920',
              border: `1px solid ${inputFocused ? 'rgba(79,127,255,0.5)' : '#1e2330'}`,
              borderRadius: 10,
              color: 'var(--text1)',
              fontSize: 13,
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxShadow: inputFocused ? '0 0 0 3px rgba(79,127,255,0.1)' : 'none',
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              border: 'none',
              background: input.trim() && !loading
                ? 'var(--accent)'
                : '#161920',
              color: input.trim() && !loading ? '#fff' : 'var(--text3)',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* ── Keyframe styles ───────────────────────────────────────────────── */}
      <style>{`
        @keyframes genieDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes genieBarFadeIn {
          0% { opacity: 0; transform: translateY(-4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .genie-bar-collapsed-insight { display: none !important; }
        }
      `}</style>
    </div>
  )
}

// ── Message bubble sub-component ─────────────────────────────────────────────

function MessageBubble({ message, streaming }: { message: Message; streaming: boolean }) {
  const isUser = message.role === 'user'
  const displayText = useStreamedText(message.content, streaming)

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      alignItems: 'flex-start',
      gap: 8,
    }}>
      {/* AI avatar */}
      {!isUser && (
        <div style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'rgba(139,92,246,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 2,
        }}>
          <Sparkles size={12} style={{ color: '#8b5cf6' }} />
        </div>
      )}

      <div style={{
        maxWidth: '80%',
        padding: '8px 14px',
        borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
        background: isUser
          ? 'var(--accent)'
          : 'rgba(139,92,246,0.08)',
        color: isUser ? '#fff' : 'var(--text1)',
        fontSize: 13,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {/* Render bold text markers */}
        <MessageContent text={displayText} isUser={isUser} />
      </div>
    </div>
  )
}

// ── Simple markdown-like bold rendering ──────────────────────────────────────

function MessageContent({ text, isUser }: { text: string; isUser: boolean }) {
  // Split on **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const inner = part.slice(2, -2)
          return (
            <span key={i} style={{
              fontWeight: 700,
              color: isUser ? '#fff' : 'var(--text1)',
              fontFamily: inner.match(/\$[\d,]+/) ? 'JetBrains Mono, monospace' : 'inherit',
            }}>
              {inner}
            </span>
          )
        }
        // Render numbers in JetBrains Mono
        return <NumberHighlighter key={i} text={part} isUser={isUser} />
      })}
    </>
  )
}

function NumberHighlighter({ text, isUser }: { text: string; isUser: boolean }) {
  const parts = text.split(/(\$[\d,.]+%?|\d+%)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (/^\$[\d,.]+%?$/.test(part) || /^\d+%$/.test(part)) {
          return (
            <span key={i} style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              color: isUser ? '#fff' : 'var(--accent)',
            }}>
              {part}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}
