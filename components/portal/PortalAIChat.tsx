'use client'

import { useState, useRef, useEffect } from 'react'
import { usePortal } from '@/lib/portal-context'
import { C } from '@/lib/portal-theme'
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'How long does a full wrap take?',
  'What materials do you use?',
  'How do I care for my wrap?',
  'I want to request a quote',
  "What's the status of my project?",
]

export default function PortalAIChat() {
  const { customer, token } = usePortal()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hey ${customer.name?.split(' ')[0] || 'there'}! I'm your USA Wrap Co assistant. I can answer questions about your project, wrap materials, care instructions, or help you request a quote or update your info. What can I help with?`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || loading) return

    const userMsg: Message = { role: 'user', content: msg }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/portal/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          messages: newMessages.slice(1), // skip the initial greeting
        }),
      })

      const data = await res.json()
      if (data.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble processing that. Please try again or message the team directly.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 140px)', maxHeight: 'calc(100dvh - 140px)' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 10,
              marginBottom: 16,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: msg.role === 'assistant' ? `${C.accent}15` : `${C.green}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {msg.role === 'assistant'
                ? <Bot size={16} style={{ color: C.accent }} />
                : <User size={16} style={{ color: C.green }} />}
            </div>

            {/* Bubble */}
            <div style={{
              maxWidth: '80%', padding: '10px 14px', borderRadius: 14,
              background: msg.role === 'user' ? C.accent : C.surface,
              color: msg.role === 'user' ? '#fff' : C.text1,
              fontSize: 13, lineHeight: 1.5,
              border: msg.role === 'assistant' ? `1px solid ${C.border}` : 'none',
            }}>
              {msg.content.split('\n').map((line, j) => (
                <p key={j} style={{ margin: j === 0 ? 0 : '8px 0 0' }}>{line}</p>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, background: `${C.accent}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={16} style={{ color: C.accent }} />
            </div>
            <div style={{
              padding: '10px 14px', borderRadius: 14, background: C.surface,
              border: `1px solid ${C.border}`, color: C.text3, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Thinking...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions (show only if only the greeting message) */}
      {messages.length === 1 && (
        <div style={{ padding: '0 16px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              style={{
                padding: '6px 12px', borderRadius: 20, border: `1px solid ${C.border}`,
                background: 'transparent', color: C.text2, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <Sparkles size={10} style={{ marginRight: 4 }} />{s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.surface,
        display: 'flex', gap: 8, alignItems: 'flex-end',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Ask me anything..."
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 12,
            border: `1px solid ${C.border}`, background: C.surface2,
            color: C.text1, fontSize: 14, outline: 'none',
          }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{
            width: 40, height: 40, borderRadius: 12, border: 'none',
            background: input.trim() ? C.accent : C.surface2,
            color: input.trim() ? '#fff' : C.text3,
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >
          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
        </button>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
