'use client'

import { useState } from 'react'
import {
  MessageSquare, Mail, Phone, Send, ChevronRight,
  Star, Clock, Search, X,
} from 'lucide-react'

const C = {
  bg: '#0d0f14', surface: '#13151c', surface2: '#1a1d27', border: '#2a2f3d',
  accent: '#4f7fff', green: '#22c07a', red: '#f25a5a', cyan: '#22d3ee',
  amber: '#f59e0b', purple: '#8b5cf6', text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: C.surface2, border: `1px solid ${C.border}`,
  borderRadius: 8, color: C.text1, fontSize: 13, outline: 'none', boxSizing: 'border-box',
}

interface Template { id: string; name: string; body: string; category: string | null }
interface Conversation {
  id: string; customer_name: string | null; customer_phone: string | null
  customer_email: string | null; channel: string; last_message: string | null
  last_message_at: string | null; starred: boolean
}

export default function CommsPage({
  templates,
  conversations,
}: {
  templates: Template[]
  conversations: Conversation[]
}) {
  const [tab, setTab] = useState<'sms' | 'email' | 'history'>('sms')
  const [smsTo, setSmsTo] = useState('')
  const [smsBody, setSmsBody] = useState('')
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [search, setSearch] = useState('')

  async function sendSMS() {
    if (!smsTo.trim() || !smsBody.trim()) return
    setSending(true)
    const res = await fetch('/api/comms/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: smsTo, body: smsBody }),
    })
    if (res.ok) {
      setSent(true)
      setSmsBody('')
      setTimeout(() => setSent(false), 3000)
    }
    setSending(false)
  }

  async function sendEmail() {
    if (!emailTo.trim() || !emailBody.trim()) return
    setSending(true)
    const res = await fetch('/api/comms/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: emailTo, subject: emailSubject, body: emailBody }),
    })
    if (res.ok) {
      setSent(true)
      setEmailBody('')
      setEmailSubject('')
      setTimeout(() => setSent(false), 3000)
    }
    setSending(false)
  }

  function applyTemplate(t: Template) {
    setSmsBody(t.body)
  }

  const filteredConvos = conversations.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.customer_name?.toLowerCase().includes(q) ||
      c.customer_phone?.includes(q) ||
      c.customer_email?.toLowerCase().includes(q)
  })

  return (
    <div style={{ padding: '20px 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text1, margin: '0 0 4px', fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
        Communications
      </h1>
      <p style={{ fontSize: 13, color: C.text3, margin: '0 0 20px' }}>
        Text and email customers directly
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
        {([
          { key: 'sms' as const, label: 'Send SMS', icon: MessageSquare },
          { key: 'email' as const, label: 'Send Email', icon: Mail },
          { key: 'history' as const, label: 'History', icon: Clock },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '12px', background: 'none', border: 'none',
              borderBottom: tab === t.key ? `2px solid ${C.accent}` : '2px solid transparent',
              color: tab === t.key ? C.accent : C.text3, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* SMS Tab */}
      {tab === 'sms' && (
        <div>
          <input style={inp} placeholder="Phone number" type="tel" value={smsTo} onChange={e => setSmsTo(e.target.value)} />

          {/* Templates */}
          {templates.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 6, textTransform: 'uppercase' }}>
                Quick Templates
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {templates.slice(0, 6).map(t => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    style={{
                      padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: C.surface2, border: `1px solid ${C.border}`,
                      color: C.text2, cursor: 'pointer',
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            style={{ ...inp, minHeight: 100, resize: 'vertical', marginTop: 8 }}
            placeholder="Type your message..."
            value={smsBody}
            onChange={e => setSmsBody(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <span style={{ fontSize: 11, color: C.text3 }}>{smsBody.length} chars</span>
            <button
              onClick={sendSMS}
              disabled={sending || !smsTo.trim() || !smsBody.trim()}
              style={{
                padding: '10px 24px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                background: smsTo && smsBody ? C.green : C.surface2,
                color: smsTo && smsBody ? '#fff' : C.text3,
                border: 'none', cursor: smsTo && smsBody ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Send size={14} /> {sending ? 'Sending...' : sent ? 'Sent!' : 'Send SMS'}
            </button>
          </div>
        </div>
      )}

      {/* Email Tab */}
      {tab === 'email' && (
        <div>
          <input style={{ ...inp, marginBottom: 8 }} placeholder="To (email)" type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} />
          <input style={{ ...inp, marginBottom: 8 }} placeholder="Subject" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
          <textarea
            style={{ ...inp, minHeight: 120, resize: 'vertical' }}
            placeholder="Email body..."
            value={emailBody}
            onChange={e => setEmailBody(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              onClick={sendEmail}
              disabled={sending || !emailTo.trim() || !emailBody.trim()}
              style={{
                padding: '10px 24px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                background: emailTo && emailBody ? C.accent : C.surface2,
                color: emailTo && emailBody ? '#fff' : C.text3,
                border: 'none', cursor: emailTo && emailBody ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Send size={14} /> {sending ? 'Sending...' : sent ? 'Sent!' : 'Send Email'}
            </button>
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} color={C.text3} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              style={{ ...inp, paddingLeft: 34 }}
              placeholder="Search conversations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredConvos.map(c => (
              <div key={c.id} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                {c.channel === 'sms' ? <MessageSquare size={16} color={C.green} /> :
                 c.channel === 'email' ? <Mail size={16} color={C.accent} /> :
                 <Phone size={16} color={C.cyan} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>
                    {c.customer_name || c.customer_phone || c.customer_email || 'Unknown'}
                  </div>
                  {c.last_message && (
                    <div style={{ fontSize: 11, color: C.text3, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.last_message}
                    </div>
                  )}
                </div>
                {c.last_message_at && (
                  <div style={{ fontSize: 10, color: C.text3 }}>
                    {new Date(c.last_message_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
            {filteredConvos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: C.text3, fontSize: 13 }}>
                No conversations found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
