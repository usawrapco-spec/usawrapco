'use client'

import { useState, useRef, useEffect } from 'react'
import type { Profile } from '@/types'
import { Brain, Send, Loader2, MessageSquare, TrendingUp, DollarSign, Users, BarChart2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const PREBUILT_QUERIES = [
  { label: "Total payroll this month?", icon: DollarSign },
  { label: "Which jobs had the best margin?", icon: TrendingUp },
  { label: "Installer pay breakdown", icon: Users },
  { label: "Revenue vs last month?", icon: BarChart2 },
  { label: "Unpaid invoices summary", icon: DollarSign },
  { label: "Top performing sales agents", icon: TrendingUp },
]

export default function AIBookkeeperClient({ profile }: { profile: Profile }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    const userMsg = text.trim()
    if (!userMsg || loading) return
    setInput('')
    setLoading(true)

    const history: Message[] = [...messages, { role: 'user', content: userMsg }]
    setMessages(history)

    const res = await fetch('/api/payroll/bookkeeper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMsg,
        history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setMessages(prev => [...prev, { role: 'assistant', content: data.error || 'Sorry, something went wrong.' }])
      return
    }
    setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 260px)', maxWidth: 800 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Brain size={20} color="var(--accent)" />
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>AI Bookkeeper</h2>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)' }}>
          Ask your bookkeeper anything about payroll, revenue, margins, and job profitability. Uses live business data.
        </p>
      </div>

      {/* Quick queries */}
      {messages.length === 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Quick questions</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PREBUILT_QUERIES.map(q => {
              const Icon = q.icon
              return (
                <button key={q.label} onClick={() => sendMessage(q.label)} style={{
                  padding: '7px 14px', borderRadius: 20, border: '1px solid #2a2d3a', cursor: 'pointer',
                  background: 'var(--surface)', color: 'var(--text1)', fontSize: 12, fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s'
                }}>
                  <Icon size={11} color="var(--accent)" />
                  {q.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Message list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4, marginBottom: 12 }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text2)', gap: 8, paddingTop: 40 }}>
            <MessageSquare size={40} style={{ opacity: 0.2 }} />
            <div style={{ fontSize: 14 }}>Ask me anything about your business finances</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>I have access to payroll data, invoices, jobs, and revenue</div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface)',
              border: msg.role === 'user' ? 'none' : '1px solid #2a2d3a',
              color: msg.role === 'user' ? '#fff' : 'var(--text1)',
              fontSize: 14,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}>
              {msg.role === 'assistant' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Brain size={12} color="var(--accent)" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase' }}>Bookkeeper</span>
                </div>
              )}
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '12px 16px', borderRadius: '4px 16px 16px 16px', background: 'var(--surface)', border: '1px solid #2a2d3a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>Analyzing your data...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask your bookkeeper anything..."
          disabled={loading}
          style={{
            flex: 1, background: 'var(--surface)', border: '1px solid #2a2d3a',
            borderRadius: 10, padding: '11px 16px', color: 'var(--text1)', fontSize: 14, outline: 'none'
          }}
        />
        <button type="submit" disabled={loading || !input.trim()} style={{
          padding: '11px 18px', borderRadius: 10, border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
          background: 'var(--accent)', color: '#fff', fontWeight: 700, opacity: loading || !input.trim() ? 0.6 : 1,
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
          Ask
        </button>
      </form>

      {messages.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button onClick={() => setMessages([])} style={{ fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Clear conversation
          </button>
        </div>
      )}
    </div>
  )
}
