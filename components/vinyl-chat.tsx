'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, Minus, Send, Mic } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
type Mood = 'ready' | 'excited' | 'alert' | 'thinking' | 'celebrating'

interface Message {
  role: 'user' | 'assistant'
  content: string
  actions?: { type: string; label: string; url: string }[]
}

interface Notification {
  text: string
  mood: Mood
}

interface DragOrigin {
  startX: number
  startY: number
  posX: number
  posY: number
}

// ── Vinyl SVG Face ─────────────────────────────────────────────────────────────
function VinylFace({ mood, size = 56 }: { mood: Mood; size?: number }) {
  const accentColor =
    mood === 'alert'       ? '#ef4444' :
    mood === 'excited' || mood === 'celebrating' ? '#22c07a' :
    mood === 'thinking'    ? '#f59e0b' :
    '#4f7fff'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      style={{
        transition: 'transform 0.3s',
        animation:
          mood === 'celebrating' ? 'vinylBounce 0.6s ease-in-out infinite alternate' :
          mood === 'alert'       ? 'vinylPulse 1s ease-in-out infinite' :
          mood === 'excited'     ? 'vinylSpin 2s linear infinite' :
          'none',
        display: 'block',
      }}
    >
      {/* Outer record */}
      <circle cx="28" cy="28" r="27" fill="#13151c" stroke={accentColor} strokeWidth="2" />
      {/* Groove rings */}
      <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 3" />
      <circle cx="28" cy="28" r="17" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 3" />
      <circle cx="28" cy="28" r="12" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 3" />
      {/* Center label */}
      <circle cx="28" cy="28" r="8" fill={accentColor} />
      {/* Eyes */}
      <circle cx="25" cy="26" r="1.8" fill="white" />
      <circle cx="31" cy="26" r="1.8" fill="white" />
      <circle cx="25.5" cy="25.5" r="0.7" fill="#0d0f14" />
      <circle cx="31.5" cy="25.5" r="0.7" fill="#0d0f14" />
      {/* Mouth */}
      {mood === 'celebrating' || mood === 'excited' ? (
        <path d="M 24 30 Q 28 34 32 30" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      ) : mood === 'thinking' ? (
        <path d="M 25 31 Q 28 31 31 31" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      ) : mood === 'alert' ? (
        <path d="M 25 31 Q 28 29 31 31" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M 25 30 Q 28 32 31 30" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      )}
      {/* Arms when celebrating */}
      {mood === 'celebrating' && (
        <>
          <line x1="8" y1="28" x2="16" y2="22" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
          <line x1="48" y1="28" x2="40" y2="22" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {/* Thinking dots */}
      {mood === 'thinking' && (
        <>
          <circle cx="22" cy="18" r="1.5" fill={accentColor} opacity="0.4" />
          <circle cx="26" cy="14" r="1.5" fill={accentColor} opacity="0.6" />
          <circle cx="30" cy="11" r="1.5" fill={accentColor} opacity="0.9" />
        </>
      )}
    </svg>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
const iconBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6, background: 'transparent',
  border: 'none', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}

export default function VinylChat() {
  const pathname  = usePathname()
  const supabase  = createClient()

  const [isOpen,      setIsOpen]      = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [mood,        setMood]        = useState<Mood>('ready')
  const [messages,    setMessages]    = useState<Message[]>([])
  const [input,       setInput]       = useState('')
  const [isTyping,    setIsTyping]    = useState(false)
  const [isPulsing,   setIsPulsing]   = useState(true)
  const [notif,       setNotif]       = useState<Notification | null>(null)
  const [position,    setPosition]    = useState<{ x: number; y: number } | null>(null)
  const [isDragging,  setIsDragging]  = useState(false)

  const dragOrigin    = useRef<DragOrigin | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const panelRef      = useRef<HTMLDivElement>(null)
  const inputRef      = useRef<HTMLInputElement>(null)
  const notifTimeout  = useRef<ReturnType<typeof setTimeout>>()

  // ── Persistence ──────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vinyl-history')
      if (saved) setMessages(JSON.parse(saved))
      if (localStorage.getItem('vinyl-open') === 'true') setIsOpen(true)
    } catch {}
    const t = setTimeout(() => setIsPulsing(false), 6000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    try { localStorage.setItem('vinyl-history', JSON.stringify(messages.slice(-60))) } catch {}
  }, [messages])

  useEffect(() => {
    try { localStorage.setItem('vinyl-open', String(isOpen)) } catch {}
  }, [isOpen])

  // ── Auto-scroll ───────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    if (isOpen && !isMinimized) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen, isMinimized])

  // ── Pop notification bubble ───────────────────────────────────────────────────
  const popNotif = useCallback((text: string, newMood: Mood = 'alert') => {
    setNotif({ text, mood: newMood })
    setMood(newMood)
    clearTimeout(notifTimeout.current)
    notifTimeout.current = setTimeout(() => {
      setNotif(null)
      setMood('ready')
    }, 9000)
  }, [])

  // ── Supabase Realtime — new conversations, payments, proposals ─────────────
  useEffect(() => {
    const channel = supabase.channel('vinyl-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, () => {
        popNotif('New lead just came in! Want me to help draft a response?', 'excited')
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, () => {
        setMood('celebrating')
        popNotif('Payment just landed! Time to get to work!', 'celebrating')
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'proposals',
        filter: 'status=eq.viewed',
      }, () => {
        popNotif('Customer just opened their proposal — should I send a follow-up SMS?', 'excited')
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, popNotif])

  // ── Context-aware proactive tips ──────────────────────────────────────────────
  useEffect(() => {
    if (!pathname) return
    const t = setTimeout(() => {
      if (pathname.startsWith('/estimates') && pathname.includes('new')) {
        popNotif('Working on an estimate? Ask me about pricing or GPM targets!', 'ready')
      } else if (pathname === '/pipeline') {
        popNotif('On the pipeline? I can flag stale jobs or draft follow-ups — just ask.', 'ready')
      }
    }, 4000)
    return () => clearTimeout(t)
  }, [pathname, popNotif])

  // ── Chat ──────────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isTyping) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setIsTyping(true)
    setMood('thinking')

    try {
      const projectMatch = pathname?.match(/\/projects\/([^/]+)/)
      const res = await fetch('/api/ai/vinyl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          context: {
            page: pathname || '/',
            projectId: projectMatch ? projectMatch[1] : undefined,
          },
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || data.error || 'Sorry, something went wrong.',
        actions: data.actions,
      }])
      setMood('ready')
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
      setMood('alert')
      setTimeout(() => setMood('ready'), 3000)
    } finally {
      setIsTyping(false)
    }
  }, [input, messages, isTyping, pathname])

  // ── Drag ──────────────────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current) return
    const rect = panelRef.current.getBoundingClientRect()
    dragOrigin.current = { startX: e.clientX, startY: e.clientY, posX: rect.left, posY: rect.top }
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => {
      if (!dragOrigin.current) return
      setPosition({
        x: dragOrigin.current.posX + (e.clientX - dragOrigin.current.startX),
        y: dragOrigin.current.posY + (e.clientY - dragOrigin.current.startY),
      })
    }
    const onUp = () => setIsDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isDragging])

  const panelStyle: React.CSSProperties = position
    ? { position: 'fixed', left: position.x, top: position.y, bottom: 'auto', right: 'auto' }
    : { position: 'fixed', bottom: 88, right: 20 }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating button (closed state) ── */}
      {!isOpen && (
        <div style={{ position: 'fixed', bottom: 88, right: 24, zIndex: 9998, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          {/* Notification bubble */}
          {notif && (
            <div style={{
              maxWidth: 260,
              background: 'var(--surface)',
              border: `1px solid ${notif.mood === 'celebrating' ? 'var(--green)' : notif.mood === 'excited' ? 'var(--accent)' : 'var(--red)'}`,
              borderRadius: '16px 16px 4px 16px',
              padding: '10px 14px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              animation: 'vinylSlideIn 0.3s ease-out',
            }}>
              <p style={{ fontSize: 12, color: 'var(--text1)', lineHeight: 1.5, margin: 0 }}>{notif.text}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => { setIsOpen(true); setNotif(null) }}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px',
                    borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: 'var(--accent)', color: '#fff',
                  }}
                >
                  Talk to V.I.N.Y.L.
                </button>
                <button
                  onClick={() => setNotif(null)}
                  style={{ fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* The character */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsOpen(true)}
              title="Chat with V.I.N.Y.L."
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                animation: isPulsing ? 'vinylGlow 2s ease-in-out 3' : 'none',
                display: 'block',
              }}
            >
              <VinylFace mood={mood} size={56} />
            </button>
            {notif && !isOpen && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                width: 14, height: 14, borderRadius: '50%',
                background: 'var(--red)', border: '2px solid var(--bg)',
                animation: 'vinylPulse 1s ease-in-out infinite',
              }} />
            )}
          </div>
        </div>
      )}

      {/* ── Chat panel ── */}
      {isOpen && (
        <div
          ref={panelRef}
          className="vinyl-panel"
          style={{
            ...panelStyle,
            width: 400,
            height: isMinimized ? 52 : 520,
            background: 'var(--surface)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 48px rgba(0,0,0,0.65)',
            zIndex: 9999,
            transition: 'height 0.2s ease',
            userSelect: isDragging ? 'none' : 'auto',
          }}
        >
          {/* Header */}
          <div
            onMouseDown={handleDragStart}
            style={{
              padding: '0 12px 0 10px',
              height: 52,
              background: 'var(--surface2)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'grab',
              borderBottom: isMinimized ? 'none' : '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}
          >
            <VinylFace mood={mood} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 700, color: 'var(--text1)',
                fontFamily: 'Barlow Condensed, sans-serif',
                letterSpacing: 2, fontSize: 14, lineHeight: 1,
              }}>
                V.I.N.Y.L.
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>
                {mood === 'thinking'    ? 'Thinking…'            :
                 mood === 'celebrating' ? 'Celebrating!'          :
                 mood === 'alert'       ? 'Alert!'               :
                 mood === 'excited'     ? 'Excited!'             :
                 'Virtual Intelligence · Ready'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setIsMinimized(m => !m)} style={iconBtnStyle} title={isMinimized ? 'Expand' : 'Minimize'}>
                <Minus size={14} color="var(--text2)" />
              </button>
              <button onClick={() => setIsOpen(false)} style={iconBtnStyle} title="Close">
                <X size={14} color="var(--text2)" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, marginTop: 48, padding: '0 16px' }}>
                    <div style={{ marginBottom: 12 }}>
                      <VinylFace mood="ready" size={48} />
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>V.I.N.Y.L.</div>
                    <div>Virtual Intelligence Navigating Your Logistics</div>
                    <div style={{ marginTop: 8, fontSize: 12 }}>
                      Ask about estimates, job status, pricing, or I'll pipe up when something needs attention.
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '80%',
                      padding: '8px 12px',
                      borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '4px 12px 12px 12px',
                      background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface2)',
                      color: 'var(--text1)',
                      fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap',
                    }}>
                      {msg.content}
                    </div>
                    {msg.actions && msg.actions.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', maxWidth: '80%' }}>
                        {msg.actions.map((a, j) => (
                          <a key={j} href={a.url} style={{
                            padding: '4px 10px', borderRadius: 6,
                            background: 'rgba(79,127,255,0.15)',
                            border: '1px solid rgba(79,127,255,0.3)',
                            color: 'var(--accent)', fontSize: 12, textDecoration: 'none',
                          }}>
                            {a.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <VinylFace mood="thinking" size={24} />
                    <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: 'var(--surface2)', borderRadius: '4px 12px 12px 12px' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: 6, height: 6, borderRadius: '50%', background: 'var(--text3)',
                          animation: `vinylDot 1.2s ease-in-out ${i * 0.18}s infinite`,
                        }} />
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{
                padding: '10px 12px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', gap: 8, alignItems: 'center',
                background: 'var(--surface2)', flexShrink: 0,
              }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder="Ask V.I.N.Y.L. anything…"
                  style={{
                    flex: 1, background: 'var(--bg)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, padding: '8px 12px',
                    color: 'var(--text1)', fontSize: 13, outline: 'none',
                  }}
                />
                <button title="Voice (coming soon)" style={{ ...iconBtnStyle, opacity: 0.35 }}>
                  <Mic size={16} color="var(--text2)" />
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isTyping}
                  style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    background: input.trim() && !isTyping ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                    border: 'none', cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}
                >
                  <Send size={14} color="#fff" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes vinylGlow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(79,127,255,0.4)); }
          50%       { filter: drop-shadow(0 0 20px rgba(79,127,255,0.9)); }
        }
        @keyframes vinylPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.15); }
        }
        @keyframes vinylBounce {
          from { transform: translateY(0); }
          to   { transform: translateY(-6px); }
        }
        @keyframes vinylSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes vinylSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes vinylDot {
          0%, 100% { opacity: 0.25; transform: translateY(0); }
          50%       { opacity: 1;    transform: translateY(-3px); }
        }
        @media (max-width: 640px) {
          .vinyl-panel {
            width: 100vw !important;
            height: 100dvh !important;
            bottom: 0 !important; right: 0 !important;
            left: 0 !important; top: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </>
  )
}
