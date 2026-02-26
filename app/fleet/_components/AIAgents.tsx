'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, RotateCcw, Loader2, BarChart3, Truck, DollarSign, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AgentDef {
  id: string
  name: string
  color: string
  icon: LucideIcon
  description: string
  quickPrompts: string[]
}

const AGENTS: AgentDef[] = [
  {
    id: 'bookkeeper',
    name: 'Bookkeeper',
    color: '#f59e0b',
    icon: BarChart3,
    description: 'Financial data, P&L, invoices, payments, expenses',
    quickPrompts: [
      "What's our net P&L?",
      'Which invoices are overdue?',
      'Flag data gaps',
      'Top expenses this month',
      'Job margins',
    ],
  },
  {
    id: 'fleet_manager',
    name: 'Fleet Manager',
    color: '#60a5fa',
    icon: Truck,
    description: 'Fleet vehicles, mileage, wrap pipeline, customer fleets',
    quickPrompts: [
      'How many vehicles in our fleet?',
      'Which vehicles need wrapping?',
      'Mileage report by vehicle',
      'Customers with largest fleets',
      'Wrap pipeline',
    ],
  },
  {
    id: 'sales_agent',
    name: 'Sales Agent',
    color: '#4ade80',
    icon: DollarSign,
    description: 'Quoting, pricing, customer pipeline, wrap sales',
    quickPrompts: [
      'How should I price a full wrap?',
      "What's in our pipeline?",
      'Help me quote a fleet deal',
      'Which leads need follow-up?',
      'Best performing wrap types',
    ],
  },
  {
    id: 'production_manager',
    name: 'Production Manager',
    color: '#c084fc',
    icon: Wrench,
    description: 'Job scheduling, shop capacity, installer workload',
    quickPrompts: [
      'What jobs are active?',
      'Who has the most hours this week?',
      'Any jobs behind schedule?',
      'Shop capacity this week',
      'Installer workload balance',
    ],
  },
]

interface Props {
  compact?: boolean
}

export default function AIAgents({ compact }: Props) {
  const [activeAgent, setActiveAgent] = useState(AGENTS[0])
  const [conversations, setConversations] = useState<Record<string, Message[]>>({})
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const messages = conversations[activeAgent.id] || []

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim()
    if (!content || loading) return
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setConversations(c => ({ ...c, [activeAgent.id]: newMessages }))
    setLoading(true)

    try {
      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: activeAgent.id, messages: newMessages }),
      })
      const data = await res.json()
      if (data.content) {
        setConversations(c => ({
          ...c,
          [activeAgent.id]: [...newMessages, { role: 'assistant', content: data.content }],
        }))
      }
    } catch (err) {
      setConversations(c => ({
        ...c,
        [activeAgent.id]: [...newMessages, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }],
      }))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const resetConversation = () => {
    setConversations(c => ({ ...c, [activeAgent.id]: [] }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: compact ? undefined : 'calc(100vh - 200px)', minHeight: 500 }}>
      {/* Agent cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, flexShrink: 0 }}>
        {AGENTS.map(agent => {
          const Icon = agent.icon
          const isActive = activeAgent.id === agent.id
          return (
            <button
              key={agent.id}
              onClick={() => setActiveAgent(agent)}
              style={{
                padding: '14px 16px', borderRadius: 12, textAlign: 'left',
                background: isActive ? `${agent.color}12` : 'var(--surface)',
                border: isActive ? `1.5px solid ${agent.color}40` : '1px solid var(--border)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${agent.color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} style={{ color: agent.color }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: isActive ? agent.color : 'var(--text1)' }}>
                  {agent.name}
                </span>
              </div>
              {!compact && (
                <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>
                  {agent.description}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)',
        overflow: 'hidden', minHeight: 300,
      }}>
        {/* Chat header */}
        <div style={{
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: `${activeAgent.color}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {(() => { const Icon = activeAgent.icon; return <Icon size={13} style={{ color: activeAgent.color }} /> })()}
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: activeAgent.color }}>
              {activeAgent.name}
            </span>
          </div>
          <button onClick={resetConversation} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)',
            padding: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
          }}>
            <RotateCcw size={12} /> Reset
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {messages.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 16 }}>
                Ask {activeAgent.name} anything about your data
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {activeAgent.quickPrompts.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    style={{
                      padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      background: `${activeAgent.color}10`, color: activeAgent.color,
                      border: `1px solid ${activeAgent.color}30`, cursor: 'pointer',
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12,
            }}>
              <div style={{
                maxWidth: '80%', padding: '10px 14px', borderRadius: 12,
                background: m.role === 'user' ? 'rgba(79,127,255,0.15)' : 'var(--surface2)',
                color: 'var(--text1)', fontSize: 13, lineHeight: 1.6,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
              <div style={{
                padding: '10px 14px', borderRadius: 12, background: 'var(--surface2)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ color: activeAgent.color, fontSize: 13 }}>Thinking</span>
                <span style={{ display: 'inline-flex', gap: 3 }}>
                  {[0, 1, 2].map(n => (
                    <span key={n} style={{
                      width: 5, height: 5, borderRadius: '50%', background: activeAgent.color,
                      animation: `dotPulse 1.2s ${n * 0.15}s ease-in-out infinite`,
                    }} />
                  ))}
                </span>
                <style>{`@keyframes dotPulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }`}</style>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick prompts (when conversation exists) */}
        {messages.length > 0 && (
          <div style={{
            padding: '8px 16px', borderTop: '1px solid var(--border)',
            display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0,
          }}>
            {activeAgent.quickPrompts.slice(0, 3).map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={loading}
                style={{
                  padding: '5px 12px', borderRadius: 16, fontSize: 11, fontWeight: 500,
                  background: `${activeAgent.color}08`, color: activeAgent.color,
                  border: `1px solid ${activeAgent.color}20`, cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: '10px 16px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, flexShrink: 0,
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={`Ask ${activeAgent.name}...`}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 10,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: 'var(--text1)', fontSize: 13, outline: 'none',
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{
              padding: '10px 16px', borderRadius: 10,
              background: input.trim() ? activeAgent.color : 'var(--surface2)',
              color: input.trim() ? '#fff' : 'var(--text3)',
              border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
