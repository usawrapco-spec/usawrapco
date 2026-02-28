'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  MessageCircle, X, Send, Mic, MicOff, Sparkles,
  Briefcase, DollarSign, Users, FileText, ChevronDown,
  Loader2, Bot, Fuel, Wrench, TrendingUp
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const SUGGESTED_ACTIONS = [
  { label: "Show today's jobs", icon: Briefcase, prompt: "What jobs are scheduled for today?" },
  { label: 'Check revenue', icon: DollarSign, prompt: "Give me a revenue summary for this month." },
  { label: 'Follow up with leads', icon: Users, prompt: "Which leads need follow-up today?" },
  { label: 'Create estimate', icon: FileText, prompt: "Help me create a new estimate." },
]

const SESSION_KEY = 'vinyl_chat_session'

export default function VinylWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const pathname = usePathname()
  const router = useRouter()
  const [fleetContext, setFleetContext] = useState<string | null>(null)
  const isFleetPage = pathname?.startsWith('/fleet-map') ?? false

  const suggestedActions = isFleetPage ? [
    { label: 'Fuel check', icon: Fuel, prompt: "Which of my vehicles needs gas right now?" },
    { label: 'Impressions today', icon: TrendingUp, prompt: "How many total impressions did the fleet generate today?" },
    { label: 'Schedule service', icon: Wrench, prompt: "Which vehicles have upcoming maintenance due?" },
    { label: 'Stuck jobs', icon: Briefcase, prompt: "Show me all jobs currently stuck in the pipeline for more than 3 days." },
  ] : SUGGESTED_ACTIONS

  // Fleet context injection
  useEffect(() => {
    if (!isFleetPage) {
      setFleetContext(null)
      return
    }
    async function loadFleetContext() {
      try {
        const res = await fetch('/api/fleet-map/vehicles')
        if (!res.ok) return
        const data = await res.json()
        const vehicles = data.vehicles || []

        // Build a concise fleet summary for context injection
        const summary = vehicles.map((v: any) => {
          const fuelSeed = parseInt((v.id || '').replace(/-/g,'').slice(-4), 16) || 80
          const fuelLevel = (fuelSeed % 80) + 20
          const todayMiles = v.today_miles || 0
          const impressions = Math.round(todayMiles * ((v.wrap_sqft || 300) / 200) * 1.4)
          return `${v.name || 'Vehicle'} (${v.make || ''} ${v.model || ''} ${v.year || ''}): status=${v.fleet_status || 'unknown'}, speed=${v.speed_mph || 0}mph, today_miles=${todayMiles}mi, fuel=${fuelLevel}%, impressions_today=${impressions.toLocaleString()}, next_service=${v.next_service_date || 'none'}`
        }).join('\n')

        const activeCount = vehicles.filter((v: any) => v.fleet_status === 'moving' || v.fleet_status === 'active').length
        const totalMiles = vehicles.reduce((s: number, v: any) => s + (v.today_miles || 0), 0)
        const lowFuelVehicles = vehicles.filter((v: any) => {
          const seed = parseInt((v.id || '').replace(/-/g,'').slice(-4), 16) || 80
          return (seed % 80) + 20 < 25
        })

        const ctx = `FLEET CONTEXT (${new Date().toLocaleString()}):
Active vehicles: ${activeCount}/${vehicles.length}
Total miles today: ${totalMiles}
Low fuel vehicles: ${lowFuelVehicles.map((v: any) => v.name).join(', ') || 'none'}

VEHICLE DETAILS:
${summary}

You can help with: checking fuel levels, calculating impressions, finding nearby gas stations, scheduling maintenance, identifying stuck/idle vehicles.`

        setFleetContext(ctx)
      } catch {
        setFleetContext(null)
      }
    }
    loadFleetContext()
  }, [isFleetPage, pathname])

  // Load session from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY)
      if (saved) setMessages(JSON.parse(saved))
    } catch {}
  }, [])

  // Save session to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(messages.slice(-50)))
    }
  }, [messages])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/vinyl/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
          page_context: pathname,
          fleet_context: isFleetPage ? fleetContext : undefined,
        }),
      })

      const data = await res.json()

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])

      // Handle actions
      if (data.actions?.length) {
        for (const action of data.actions) {
          if (action.type === 'navigate') {
            router.push(action.payload)
          }
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Sorry, I couldn't process that. Please try again.",
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, pathname, router, fleetContext, isFleetPage])

  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsListening(false)
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [isListening])

  // Don't show on public/auth pages
  if (pathname?.startsWith('/login') || pathname?.startsWith('/auth') ||
      pathname?.startsWith('/intake/') || pathname?.startsWith('/proof/') ||
      pathname?.startsWith('/signoff/') || pathname?.startsWith('/track/') ||
      pathname?.startsWith('/portal') || pathname?.startsWith('/estimate/view') ||
      pathname?.startsWith('/invoice/view') || pathname?.startsWith('/ref/') ||
      pathname?.startsWith('/onboard/') || pathname?.startsWith('/affiliate') ||
      pathname?.startsWith('/shop') || pathname?.startsWith('/brand/') ||
      pathname?.startsWith('/proposal/')) {
    return null
  }

  return (
    <>
      {/* Collapsed FAB */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
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
            boxShadow: '0 4px 24px rgba(79,127,255,0.4)',
            zIndex: 9999,
            animation: 'vinylPulse 3s ease-in-out infinite',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Bot size={26} color="#fff" />
        </button>
      )}

      {/* Expanded Panel */}
      {isOpen && (
        <>
          {/* Mobile overlay */}
          <div
            onClick={() => setIsOpen(false)}
            className="md:hidden"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 9998,
            }}
          />

          <div
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              width: 380,
              height: 520,
              borderRadius: 16,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'slideUp 0.3s ease',
            }}
            className="max-md:!inset-0 max-md:!w-full max-md:!h-full max-md:!rounded-none max-md:!bottom-0 max-md:!right-0"
          >
            {/* Header */}
            <div style={{
              padding: '14px 16px',
              background: 'linear-gradient(135deg, var(--accent), #3d5fcc)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="#fff" />
                  <span style={{
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontWeight: 800,
                    fontSize: 18,
                    color: '#fff',
                    letterSpacing: 2,
                  }}>V.I.N.Y.L.</span>
                  {isFleetPage && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: 'rgba(34,211,238,0.15)', color: 'var(--cyan)',
                      letterSpacing: '0.06em', marginLeft: 6,
                    }}>
                      FLEET MODE
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.7)',
                  letterSpacing: 0.5,
                  marginTop: 2,
                }}>Virtual Intelligence Navigating Your Logistics</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => { setMessages([]); localStorage.removeItem(SESSION_KEY) }}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 10,
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >Clear</button>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} color="#fff" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              {messages.length === 0 && !isLoading && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <Bot size={32} color="var(--accent)" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: 14, color: 'var(--text2)' }}>How can I help you today?</div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                    {suggestedActions.map(action => (
                      <button
                        key={action.label}
                        onClick={() => sendMessage(action.prompt)}
                        style={{
                          background: 'var(--surface2)',
                          border: '1px solid var(--border)',
                          borderRadius: 20,
                          padding: '8px 14px',
                          fontSize: 12,
                          color: 'var(--text1)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--accent)'
                          e.currentTarget.style.color = 'var(--accent)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.color = 'var(--text1)'
                        }}
                      >
                        <action.icon size={13} />
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface2)',
                    color: msg.role === 'user' ? '#fff' : 'var(--text1)',
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    padding: '10px 18px',
                    borderRadius: '14px 14px 14px 4px',
                    background: 'var(--surface2)',
                    display: 'flex',
                    gap: 5,
                    alignItems: 'center',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text3)', animation: 'typingDot 1.4s ease-in-out infinite' }} />
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text3)', animation: 'typingDot 1.4s ease-in-out 0.2s infinite' }} />
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text3)', animation: 'typingDot 1.4s ease-in-out 0.4s infinite' }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexShrink: 0,
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
                placeholder="Ask V.I.N.Y.L. anything..."
                style={{
                  flex: 1,
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: 'var(--text1)',
                  outline: 'none',
                }}
              />
              <button
                onClick={toggleVoice}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: isListening ? 'var(--red)' : 'var(--surface2)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {isListening ? <MicOff size={16} color="#fff" /> : <Mic size={16} color="var(--text2)" />}
              </button>
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: input.trim() ? 'var(--accent)' : 'var(--surface2)',
                  border: 'none',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  opacity: input.trim() ? 1 : 0.5,
                }}
              >
                {isLoading ? <Loader2 size={16} color="#fff" className="animate-spin" /> : <Send size={16} color="#fff" />}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Inline Styles */}
      <style jsx global>{`
        @keyframes vinylPulse {
          0%, 100% { box-shadow: 0 4px 24px rgba(79,127,255,0.4); }
          50% { box-shadow: 0 4px 32px rgba(79,127,255,0.7), 0 0 48px rgba(79,127,255,0.2); }
        }
        @keyframes typingDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  )
}
