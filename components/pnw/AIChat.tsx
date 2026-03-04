'use client'
import { useState, useRef, useEffect } from 'react'
import {
  Send, Loader2, Anchor, Fish, CloudSun, Map, ChevronRight,
  Sparkles, Route, Radio, Shell, Users
} from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  tripPlan?: TripPlan | null
}

interface TripPlanStop {
  order: number
  time: string
  type: string
  name: string
  description: string
  tips?: string
  lat?: number
  lng?: number
  duration?: string
}

interface TripPlan {
  title: string
  duration: string
  totalDistance?: string
  stops: TripPlanStop[]
  fuelEstimate?: string
  bestTides?: string
  fishingHighlights?: string[]
  safetyNotes?: string[]
}

interface WeatherContext {
  temp?: number
  description?: string
  wind?: string
}

interface TideContext {
  trend?: string
  height?: number
  nextHigh?: string
}

interface AIChatProps {
  weatherContext?: WeatherContext
  tideContext?: TideContext
  compact?: boolean
}

const QUICK_ACTIONS = [
  { icon: Fish, label: "What's biting now?", query: "What fish are in season right now and where are the best spots to find them in Puget Sound?" },
  { icon: Route, label: 'Plan a day trip', query: 'Plan me a great full-day boat trip from Gig Harbor. I want to fish for salmon in the morning, grab lunch somewhere, and explore a bit. Give me a full itinerary.' },
  { icon: CloudSun, label: 'Weather intel', query: 'Give me a marine weather briefing for Puget Sound. What should I know before heading out? Any small craft advisories? What are typical conditions this time of year?' },
  { icon: Anchor, label: 'Best anchorages', query: 'What are the best anchorages and overnight stops in southern Puget Sound? Include free anchorages, state parks buoys, and marinas with good amenities.' },
  { icon: Radio, label: 'VHF guide', query: 'Walk me through VHF radio protocol for recreational boaters in Puget Sound. What channels should I monitor? When do the USCG broadcasts happen?' },
  { icon: Shell, label: 'Crabbing & shrimping', query: 'When and where can I crab and shrimp in Puget Sound? What gear do I need? Are there any current closures or restrictions I should know about?' },
  { icon: Map, label: 'San Juans trip', query: 'Plan a 3-day San Juan Islands boat trip from Gig Harbor. Include the best stops, fishing spots, restaurants, and anchorages. What time of year is best?' },
  { icon: Users, label: 'Gig Harbor dining', query: 'What are the best waterfront restaurants and attractions in Gig Harbor accessible by boat? Which dock can I tie up at?' },
]

const STOP_TYPE_COLORS: Record<string, string> = {
  depart: '#22c07a',
  fishing: '#22d3ee',
  dining: '#f59e0b',
  sightseeing: '#8b5cf6',
  anchor: '#4f7fff',
  fuel: '#f25a5a',
  arrive: '#22c07a',
}

function TripPlanCard({ plan }: { plan: TripPlan }) {
  return (
    <div style={{
      background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.2)',
      borderRadius: 12, padding: '14px 16px', marginTop: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Route size={14} color="#22d3ee" />
        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 800, letterSpacing: 1, color: '#22d3ee' }}>
          TRIP PLAN: {plan.title?.toUpperCase()}
        </span>
      </div>

      {(plan.duration || plan.totalDistance || plan.fuelEstimate) && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          {[
            plan.duration && { label: 'Duration', value: plan.duration },
            plan.totalDistance && { label: 'Distance', value: plan.totalDistance },
            plan.fuelEstimate && { label: 'Fuel', value: plan.fuelEstimate },
            plan.bestTides && { label: 'Tides', value: plan.bestTides },
          ].filter(Boolean).map((stat: any) => (
            <div key={stat.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '6px 10px' }}>
              <div style={{ fontSize: 9, color: '#9299b5', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: 0.5 }}>{stat.label.toUpperCase()}</div>
              <div style={{ fontSize: 12, color: '#e8eaed', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {plan.stops?.map((stop, i) => {
          const color = STOP_TYPE_COLORS[stop.type] || '#9299b5'
          return (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, border: `2px solid ${color}`, flexShrink: 0 }} />
                {i < (plan.stops.length - 1) && (
                  <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', marginTop: 2 }} />
                )}
              </div>
              <div style={{ flex: 1, paddingBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#e8eaed' }}>{stop.name}</span>
                  <span style={{ fontSize: 10, color: color, fontFamily: 'JetBrains Mono, monospace' }}>{stop.time}</span>
                </div>
                <div style={{ fontSize: 11, color: '#9299b5', marginTop: 1, lineHeight: 1.4 }}>{stop.description}</div>
                {stop.tips && (
                  <div style={{ fontSize: 10, color: '#5a6080', marginTop: 3, fontStyle: 'italic' }}>{stop.tips}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {plan.fishingHighlights && plan.fishingHighlights.length > 0 && (
        <div style={{ marginBottom: 10, padding: '8px 10px', background: 'rgba(34,211,238,0.07)', borderRadius: 8 }}>
          <div style={{ fontSize: 10, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: 0.5, color: '#22d3ee', marginBottom: 4 }}>FISHING HIGHLIGHTS</div>
          {plan.fishingHighlights.map((h, i) => (
            <div key={i} style={{ fontSize: 11, color: '#9299b5', marginBottom: 2 }}>• {h}</div>
          ))}
        </div>
      )}

      {plan.safetyNotes && plan.safetyNotes.length > 0 && (
        <div style={{ padding: '8px 10px', background: 'rgba(245,158,11,0.07)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.15)' }}>
          <div style={{ fontSize: 10, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: 0.5, color: '#f59e0b', marginBottom: 4 }}>SAFETY NOTES</div>
          {plan.safetyNotes.slice(0, 3).map((n, i) => (
            <div key={i} style={{ fontSize: 10, color: '#9299b5', marginBottom: 2 }}>• {n}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <div style={{
          background: 'rgba(79,127,255,0.2)', border: '1px solid rgba(79,127,255,0.3)',
          borderRadius: '14px 14px 4px 14px', padding: '10px 14px',
          maxWidth: '82%', fontSize: 13, color: '#e8eaed', lineHeight: 1.5,
        }}>
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, background: 'rgba(34,211,238,0.15)',
        border: '1px solid rgba(34,211,238,0.3)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0, marginTop: 2,
      }}>
        <Anchor size={13} color="#22d3ee" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px 14px 14px 4px', padding: '10px 14px',
          fontSize: 13, color: '#e8eaed', lineHeight: 1.6, whiteSpace: 'pre-wrap',
        }}>
          {msg.content}
        </div>
        {msg.tripPlan && <TripPlanCard plan={msg.tripPlan} />}
      </div>
    </div>
  )
}

export default function AIChat({ weatherContext, tideContext, compact = false }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setShowQuickActions(false)
    setLoading(true)

    try {
      const res = await fetch('/api/pnw/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          context: {
            weather: weatherContext,
            tides: tideContext,
          },
        }),
      })

      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer || 'Sorry, I could not generate a response.',
        tripPlan: data.tripPlan || null,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, the AI is temporarily unavailable. Please try again shortly.',
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg)',
    }}>
      {/* Header */}
      <div style={{
        padding: compact ? '10px 14px 8px' : '14px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(13,15,20,0.8)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(34,211,238,0.25), rgba(79,127,255,0.25))',
            border: '1px solid rgba(34,211,238,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={15} color="#22d3ee" />
          </div>
          <div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 800, letterSpacing: 1, color: '#e8eaed' }}>
              PNW AI CONCIERGE
            </div>
            <div style={{ fontSize: 10, color: '#9299b5' }}>Fishing guide · Trip planner · Local expert</div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setShowQuickActions(true) }}
              style={{ marginLeft: 'auto', fontSize: 10, color: '#5a6080', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
            >
              New chat
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {messages.length === 0 && showQuickActions && (
          <div>
            <div style={{
              textAlign: 'center', padding: '16px 8px 12px',
              fontSize: 13, color: '#9299b5', lineHeight: 1.5,
            }}>
              Ask me anything about fishing, boating, weather, or where to explore in the Pacific Northwest.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
              {QUICK_ACTIONS.map(action => {
                const Icon = action.icon
                return (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.query)}
                    style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10, padding: '10px 10px', cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 7,
                    }}
                  >
                    <Icon size={13} color="#22d3ee" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#9299b5', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600, letterSpacing: 0.3, lineHeight: 1.3 }}>
                      {action.label}
                    </span>
                    <ChevronRight size={10} color="#5a6080" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

        {loading && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: 'rgba(34,211,238,0.15)',
              border: '1px solid rgba(34,211,238,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Anchor size={13} color="#22d3ee" />
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.05)', borderRadius: '14px 14px 14px 4px',
              padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#22d3ee',
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px 12px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(13,15,20,0.8)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, padding: '8px 8px 8px 12px',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about fishing, weather, trip planning, dining..."
            rows={1}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#e8eaed', fontSize: 13, resize: 'none', lineHeight: 1.5,
              fontFamily: 'system-ui, sans-serif', maxHeight: 100, overflowY: 'auto',
              scrollbarWidth: 'none',
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            style={{
              width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: input.trim() && !loading ? '#22d3ee' : 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', flexShrink: 0,
            }}
          >
            {loading
              ? <Loader2 size={14} color="#9299b5" style={{ animation: 'spin 1s linear infinite' }} />
              : <Send size={14} color={input.trim() ? '#0d0f14' : '#5a6080'} />
            }
          </button>
        </div>
        <div style={{ fontSize: 9, color: '#5a6080', marginTop: 6, textAlign: 'center' }}>
          AI knowledge of PNW fishing, boating, weather, tourism
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
