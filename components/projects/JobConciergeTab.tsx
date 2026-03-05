'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Loader2, Settings, Zap, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import type { Profile, Project } from '@/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  project: Project
  profile: Profile
  formData: Record<string, any>
  onFormDataChange: (key: string, value: unknown) => void
}

const QUICK_ACTIONS = [
  { label: "What's missing?", prompt: "Review this job and tell me what is incomplete or missing that could cause delays. Be specific." },
  { label: "Draft customer update", prompt: "Draft a short, friendly customer update message about the current status of their wrap project. Keep it under 100 words." },
  { label: "Check timeline", prompt: "Review the job timeline milestones and tell me which are overdue or at risk. What should we prioritize today?" },
  { label: "Collect design files", prompt: "Write a polite message I can send to the customer asking them to submit their design files, logo, and brand colors through our intake link." },
  { label: "Checklist review", prompt: "List all outstanding checklist items across sales, production, and install departments that still need to be completed for this job." },
]

export default function JobConciergeTab({ project, profile, formData, onFormDataChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [conciergeEnabled, setConciergeEnabled] = useState<boolean>(
    formData.concierge_enabled !== false
  )
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isAdmin = ['admin', 'owner'].includes(profile.role || '')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return
    const userMsg: Message = { role: 'user', content: content.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/project-concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          orgId: project.org_id,
          message: content.trim(),
          history: messages,
          context: {
            title: project.title,
            stage: project.pipe_stage,
            customerName: (project.customer as any)?.name || formData.clientName || '',
            customerPhone: (project.customer as any)?.phone || formData.clientPhone || '',
            vehicleYear: formData.vehicle_year || '',
            vehicleMake: formData.vehicle_make || '',
            vehicleModel: formData.vehicle_model || '',
            designBrief: formData.design_brief || '',
            signoffConfirmed: !!formData.signoff_confirmed,
            installContact: formData.install_contact || {},
            productionData: formData.production_data || {},
            installChecklist: formData.install_checklist || {},
          },
        }),
      })
      const data = await res.json()
      const assistantMsg: Message = { role: 'assistant', content: data.content || data.message || 'I was unable to generate a response. Please try again.' }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please check your internet and try again.' }])
    }
    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface)', borderRadius: 10, border: '1px solid rgba(79,127,255,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(79,127,255,0.4)' }}>
            <Bot size={18} style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif' }}>Project Concierge</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>AI job manager · always watching this job</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: conciergeEnabled ? 'var(--green)' : 'var(--text3)', boxShadow: conciergeEnabled ? '0 0 8px var(--green)' : 'none' }} />
            <span style={{ fontSize: 11, color: conciergeEnabled ? 'var(--green)' : 'var(--text3)', fontWeight: 700 }}>{conciergeEnabled ? 'Active' : 'Inactive'}</span>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowSettings(s => !s)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--surface2)', background: showSettings ? 'var(--surface2)' : 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 11 }}
            >
              <Settings size={12} /> Settings
            </button>
          )}
        </div>
      </div>

      {/* Admin Settings Panel */}
      {isAdmin && showSettings && (
        <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid rgba(79,127,255,0.2)', borderRadius: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 12, fontFamily: 'Barlow Condensed, sans-serif' }}>Concierge Settings — This Job</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={conciergeEnabled}
              onChange={e => {
                setConciergeEnabled(e.target.checked)
                onFormDataChange('concierge_enabled', e.target.checked)
              }}
              style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>Enable Concierge for this job</span>
          </label>
          <div style={{ fontSize: 11, color: 'var(--text3)', padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)' }}>
            Global concierge settings (persona, auto-triggers, notification channels) are configured in{' '}
            <a href="/settings/concierge" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Settings → Project Concierge</a>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.label}
              onClick={() => sendMessage(action.prompt)}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(79,127,255,0.25)', background: 'rgba(79,127,255,0.08)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
            >
              <Zap size={10} /> {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, display: 'flex', flexDirection: 'column', minHeight: 360 }}>
        <div style={{ flex: 1, padding: 16, overflowY: 'auto', maxHeight: 420, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(79,127,255,0.2), rgba(139,92,246,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Bot size={22} style={{ color: 'var(--accent)' }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>Project Concierge ready</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', maxWidth: 320, margin: '0 auto' }}>
                I have full context on this job. Ask me anything — missing items, customer updates, timeline risks, or what needs to happen next.
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <Bot size={14} style={{ color: '#fff' }} />
                </div>
              )}
              <div style={{
                maxWidth: '80%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface2)',
                color: msg.role === 'user' ? '#fff' : 'var(--text1)',
                fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={14} style={{ color: '#fff' }} />
              </div>
              <div style={{ padding: '10px 14px', borderRadius: '12px 12px 12px 2px', background: 'var(--surface2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Loader2 size={13} style={{ color: 'var(--text3)', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Thinking…</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: 12, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this job… (Enter to send, Shift+Enter for new line)"
            disabled={loading}
            rows={2}
            style={{ flex: 1, padding: '8px 12px', background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, resize: 'none', outline: 'none' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: input.trim() && !loading ? 'var(--accent)' : 'var(--surface2)', color: input.trim() && !loading ? '#fff' : 'var(--text3)', cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 13, height: 52, flexShrink: 0 }}
          >
            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
