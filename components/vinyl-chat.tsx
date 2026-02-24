'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquare, X, Minus, Send, Mic, Bot } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  actions?: { type: string; label: string; url: string }[]
}

interface DragOrigin {
  startX: number
  startY: number
  posX: number
  posY: number
}

const iconBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

export default function VinylChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isPulsing, setIsPulsing] = useState(true)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragOrigin = useRef<DragOrigin | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load persisted state
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vinyl-history')
      if (saved) setMessages(JSON.parse(saved))
      const open = localStorage.getItem('vinyl-open')
      if (open === 'true') setIsOpen(true)
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, isMinimized])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isTyping) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setIsTyping(true)

    try {
      const res = await fetch('/api/ai/vinyl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || data.error || 'Sorry, something went wrong.',
        actions: data.actions,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please try again.',
      }])
    } finally {
      setIsTyping(false)
    }
  }, [input, messages, isTyping])

  // Drag — desktop only
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
    : { position: 'fixed', bottom: 84, right: 20 }

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Chat with V.I.N.Y.L."
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--accent)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 24px rgba(79,127,255,0.45)',
            zIndex: 9998,
            animation: isPulsing ? 'vinylPulse 2s ease-in-out 3' : 'none',
          }}
        >
          <MessageSquare size={24} color="#fff" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="vinyl-panel"
          style={{
            ...panelStyle,
            width: 400,
            height: isMinimized ? 52 : 500,
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
              padding: '0 14px',
              height: 52,
              background: 'var(--surface2)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'grab',
              borderBottom: isMinimized ? 'none' : '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}
          >
            <Bot size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
            <span style={{
              fontWeight: 700,
              color: 'var(--text1)',
              fontFamily: 'Barlow Condensed, sans-serif',
              letterSpacing: 2,
              fontSize: 15,
            }}>
              V.I.N.Y.L.
            </span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>AI Assistant</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button
                onClick={() => setIsMinimized(m => !m)}
                style={iconBtnStyle}
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
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
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, marginTop: 48, padding: '0 16px' }}>
                    <Bot size={36} color="var(--accent)" style={{ marginBottom: 10, opacity: 0.55 }} />
                    <div style={{ fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>V.I.N.Y.L.</div>
                    <div>Virtual Intelligence Navigating Your Logistics</div>
                    <div style={{ marginTop: 8, fontSize: 12 }}>Ask about estimates, job status, scheduling, or anything wrap-related.</div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      maxWidth: '80%',
                      padding: '8px 12px',
                      borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '4px 12px 12px 12px',
                      background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface2)',
                      color: 'var(--text1)',
                      fontSize: 13,
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {msg.content}
                    </div>
                    {msg.actions && msg.actions.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', maxWidth: '80%' }}>
                        {msg.actions.map((a, j) => (
                          <a
                            key={j}
                            href={a.url}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              background: 'rgba(79,127,255,0.15)',
                              border: '1px solid rgba(79,127,255,0.3)',
                              color: 'var(--accent)',
                              fontSize: 12,
                              textDecoration: 'none',
                            }}
                          >
                            {a.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      display: 'flex',
                      gap: 4,
                      padding: '10px 14px',
                      background: 'var(--surface2)',
                      borderRadius: '4px 12px 12px 12px',
                    }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--text3)',
                          animation: `vinylDot 1.2s ease-in-out ${i * 0.18}s infinite`,
                        }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div style={{
                padding: '10px 12px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                background: 'var(--surface2)',
                flexShrink: 0,
              }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder="Ask V.I.N.Y.L. anything…"
                  style={{
                    flex: 1,
                    background: 'var(--bg)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: 'var(--text1)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
                <button title="Voice input (coming soon)" style={{ ...iconBtnStyle, opacity: 0.35 }}>
                  <Mic size={16} color="var(--text2)" />
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isTyping}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: input.trim() && !isTyping ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                    border: 'none',
                    cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.15s',
                    flexShrink: 0,
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
        @keyframes vinylPulse {
          0%, 100% { box-shadow: 0 4px 24px rgba(79,127,255,0.45); transform: scale(1); }
          50% { box-shadow: 0 4px 48px rgba(79,127,255,0.85); transform: scale(1.09); }
        }
        @keyframes vinylDot {
          0%, 100% { opacity: 0.25; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-3px); }
        }
        @media (max-width: 640px) {
          .vinyl-panel {
            width: 100vw !important;
            height: 100dvh !important;
            bottom: 0 !important;
            right: 0 !important;
            left: 0 !important;
            top: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </>
  )
}
