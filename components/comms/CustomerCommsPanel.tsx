'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Mail, Phone, Send, X, ChevronRight, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface CommEntry {
  id: string
  direction: 'inbound' | 'outbound'
  channel: 'sms' | 'call' | 'email'
  body: string | null
  subject: string | null
  status: string
  call_duration_seconds: number | null
  created_at: string
}

interface Props {
  customerId?: string | null
  projectId?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  customerName?: string
}

const CHANNEL_ICON: Record<string, React.FC<any>> = {
  sms: MessageSquare,
  email: Mail,
  call: Phone,
}

function relTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function CustomerCommsPanel({ customerId, projectId, customerPhone, customerEmail, customerName }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [messages, setMessages] = useState<CommEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [smsText, setSmsText] = useState('')
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'sms' | 'email'>('sms')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [isExpanded, setIsExpanded] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!customerId && !projectId) return
    loadMessages()
  }, [customerId, projectId])

  async function loadMessages() {
    setLoading(true)
    try {
      let query = supabase
        .from('communications')
        .select('id, direction, channel, body, subject, status, call_duration_seconds, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      if (projectId) {
        query = query.eq('project_id', projectId)
      } else if (customerId) {
        query = query.eq('customer_id', customerId)
      }

      const { data } = await query
      setMessages((data || []).reverse())
    } finally {
      setLoading(false)
    }
  }

  async function handleSendSms() {
    if (!smsText.trim()) return
    const to = customerPhone
    if (!to) { alert('No phone number on file for this customer'); return }

    setSending(true)
    try {
      const res = await fetch('/api/comms/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          body: smsText,
          customer_id: customerId,
          project_id: projectId,
        }),
      })
      if (!res.ok) throw new Error('Send failed')
      setSmsText('')
      await loadMessages()
    } catch (e) {
      alert('Failed to send SMS')
    } finally {
      setSending(false)
    }
  }

  async function handleSendEmail() {
    if (!emailBody.trim() || !emailSubject.trim()) return
    const to = customerEmail
    if (!to) { alert('No email on file for this customer'); return }

    setSending(true)
    try {
      const res = await fetch('/api/comms/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject: emailSubject,
          body: emailBody,
          customer_id: customerId,
          project_id: projectId,
        }),
      })
      if (!res.ok) throw new Error('Send failed')
      setEmailSubject('')
      setEmailBody('')
      await loadMessages()
    } catch (e) {
      alert('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  async function handleCall() {
    const to = customerPhone
    if (!to) { alert('No phone number on file for this customer'); return }
    if (!confirm(`Call ${customerName || 'this customer'} at ${to}?`)) return

    try {
      const res = await fetch('/api/comms/call/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, customer_id: customerId, project_id: projectId }),
      })
      const data = await res.json()
      if (data.demo) {
        alert('Demo mode: Twilio not configured. Call would be initiated to ' + to)
      }
      await loadMessages()
    } catch {
      alert('Failed to initiate call')
    }
  }

  const noContact = !customerPhone && !customerEmail

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      background: 'var(--surface)',
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 900, color: 'var(--text1)' }}>
            Communications
          </span>
          {messages.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', padding: '1px 7px', borderRadius: 8 }}>
              {messages.length}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {customerId && (
            <button
              onClick={e => { e.stopPropagation(); router.push('/comms') }}
              style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              View all <ExternalLink size={10} />
            </button>
          )}
          <ChevronRight size={14} style={{ color: 'var(--text3)', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
        </div>
      </div>

      {isExpanded && (
        <div>
          {/* Message history */}
          {loading ? (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>Loading...</div>
          ) : messages.length === 0 ? (
            <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>
              No messages yet
            </div>
          ) : (
            <div style={{ maxHeight: 220, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {messages.map(msg => {
                const Icon = CHANNEL_ICON[msg.channel] || MessageSquare
                const isOut = msg.direction === 'outbound'
                return (
                  <div key={msg.id} style={{
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    flexDirection: isOut ? 'row-reverse' : 'row',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: isOut ? 'rgba(79,127,255,0.15)' : 'rgba(34,192,122,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={12} style={{ color: isOut ? 'var(--accent)' : 'var(--green)' }} />
                    </div>
                    <div style={{
                      flex: 1, background: isOut ? 'rgba(79,127,255,0.08)' : 'var(--surface2)',
                      borderRadius: 8, padding: '6px 10px', maxWidth: '85%',
                    }}>
                      {msg.channel === 'email' && msg.subject && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 2 }}>{msg.subject}</div>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--text1)', lineHeight: 1.4 }}>
                        {msg.channel === 'call'
                          ? `${isOut ? 'Outbound' : 'Inbound'} call${msg.call_duration_seconds ? ` · ${Math.floor(msg.call_duration_seconds / 60)}m ${msg.call_duration_seconds % 60}s` : ''}`
                          : (msg.body || '').slice(0, 100) + ((msg.body || '').length > 100 ? '...' : '')}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{relTime(msg.created_at)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Compose area */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px' }}>
            {noContact ? (
              <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '8px 0' }}>
                No phone or email on file
              </div>
            ) : (
              <>
                {/* Tab toggle */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                  {customerPhone && (
                    <button onClick={() => setActiveTab('sms')} style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: activeTab === 'sms' ? 'var(--accent)' : 'var(--surface2)', color: activeTab === 'sms' ? '#fff' : 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <MessageSquare size={11} /> SMS
                    </button>
                  )}
                  {customerEmail && (
                    <button onClick={() => setActiveTab('email')} style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: activeTab === 'email' ? 'var(--accent)' : 'var(--surface2)', color: activeTab === 'email' ? '#fff' : 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Mail size={11} /> Email
                    </button>
                  )}
                  {customerPhone && (
                    <button onClick={handleCall} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={11} /> Call
                    </button>
                  )}
                </div>

                {activeTab === 'sms' && customerPhone && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <textarea
                      ref={textareaRef}
                      value={smsText}
                      onChange={e => setSmsText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendSms() } }}
                      placeholder={`Text ${customerName || 'customer'}...`}
                      rows={2}
                      style={{ flex: 1, padding: '7px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text1)', fontSize: 12, resize: 'none', outline: 'none' }}
                    />
                    <button onClick={handleSendSms} disabled={sending || !smsText.trim()} style={{ padding: '0 12px', borderRadius: 7, border: 'none', background: smsText.trim() ? 'var(--accent)' : 'var(--surface2)', color: smsText.trim() ? '#fff' : 'var(--text3)', cursor: smsText.trim() ? 'pointer' : 'default' }}>
                      <Send size={14} />
                    </button>
                  </div>
                )}

                {activeTab === 'email' && customerEmail && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Subject..." style={{ padding: '6px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text1)', fontSize: 12, outline: 'none' }} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Write email..." rows={2} style={{ flex: 1, padding: '7px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text1)', fontSize: 12, resize: 'none', outline: 'none' }} />
                      <button onClick={handleSendEmail} disabled={sending || !emailBody.trim() || !emailSubject.trim()} style={{ padding: '0 12px', borderRadius: 7, border: 'none', background: (emailBody.trim() && emailSubject.trim()) ? 'var(--accent)' : 'var(--surface2)', color: (emailBody.trim() && emailSubject.trim()) ? '#fff' : 'var(--text3)', cursor: (emailBody.trim() && emailSubject.trim()) ? 'pointer' : 'default' }}>
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
