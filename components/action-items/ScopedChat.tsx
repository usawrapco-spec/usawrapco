'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send, Sparkles, Loader2 } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  recapId: string
  itemId: string
  actionItem: any
  entities: any[]
  entityType: string
  initialSession: any
  ownerName: string
}

export default function ScopedChat({
  recapId, itemId, actionItem, entities, entityType, initialSession, ownerName,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialSession?.messages || [])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(initialSession?.id || null)
  const [isOpen, setIsOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/action-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          recapId,
          itemId,
          actionItem,
          entities,
          entityType,
          sessionId,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
        if (data.sessionId) setSessionId(data.sessionId)
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const entityLabel = entityType
    ? `${entities.length} ${entityType}${entities.length !== 1 ? 's' : ''}`
    : 'this item'

  return (
    <div style={{
      border: '1px solid rgba(139,92,246,0.2)',
      borderRadius: 14, overflow: 'hidden',
      background: 'linear-gradient(135deg, rgba(139,92,246,0.04) 0%, rgba(79,127,255,0.04) 100%)',
    }}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(p => !p)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'rgba(139,92,246,0.06)',
          border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'linear-gradient(135deg, #8b5cf6, #4f7fff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageSquare size={13} color="#fff" />
          </div>
          <span style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 900, fontSize: 13, letterSpacing: '0.04em',
            color: 'var(--text2, #9299b5)', textTransform: 'uppercase',
          }}>
            Ask V.I.N.Y.L. About This
          </span>
          {messages.length > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
              background: 'rgba(139,92,246,0.15)', color: '#8b5cf6',
            }}>
              {messages.length} messages
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <>
          {/* Messages */}
          <div style={{
            maxHeight: 360, overflowY: 'auto',
            padding: '12px 16px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {messages.length === 0 && (
              <div style={{
                padding: '16px', textAlign: 'center',
                color: 'var(--text3, #5a6080)', fontSize: 13,
              }}>
                <Sparkles size={18} style={{ marginBottom: 6, display: 'block', margin: '0 auto 6px' }} />
                I can help you with {entityLabel}. Ask me to draft a message, analyze the situation, or suggest next steps.
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} style={{
                display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: 12,
                  background: msg.role === 'user'
                    ? 'rgba(79,127,255,0.15)'
                    : 'rgba(255,255,255,0.04)',
                  border: msg.role === 'user'
                    ? '1px solid rgba(79,127,255,0.25)'
                    : '1px solid rgba(255,255,255,0.06)',
                }}>
                  {msg.role === 'assistant' && (
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: '#8b5cf6',
                      marginBottom: 4, letterSpacing: '0.04em',
                    }}>
                      V.I.N.Y.L.
                    </div>
                  )}
                  <div style={{
                    fontSize: 13, color: 'var(--text1, #e8eaed)',
                    lineHeight: 1.5, whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Loader2 size={14} color="#8b5cf6" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 12, color: 'var(--text3, #5a6080)' }}>Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 16px 14px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 8,
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={`e.g. "Draft a follow-up message for these ${entityType || 'items'}..."`}
              disabled={loading}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                padding: '9px 14px', color: 'var(--text1, #e8eaed)',
                fontSize: 13, outline: 'none',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                padding: '9px 14px', borderRadius: 8,
                border: 'none',
                background: input.trim() ? 'linear-gradient(135deg, #4f7fff, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                color: input.trim() ? '#fff' : 'var(--text3, #5a6080)',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center',
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
