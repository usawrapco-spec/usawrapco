'use client'

import { useEffect, useRef } from 'react'
import { MessageSquare, Mail, Phone, CheckCheck, Clock, AlertCircle, Mic } from 'lucide-react'

export interface CommMessage {
  id: string
  direction: 'inbound' | 'outbound'
  channel: 'sms' | 'call' | 'email'
  body: string | null
  subject: string | null
  status: string
  call_duration_seconds: number | null
  call_recording_url: string | null
  sent_by: string | null
  created_at: string
  sender_name?: string
}

interface Props {
  messages: CommMessage[]
  customerName?: string
}

function fmtTime(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (diffDays === 1) return `Yesterday ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function fmtDuration(secs: number | null) {
  if (!secs) return '0s'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'delivered') return <CheckCheck size={12} style={{ color: 'var(--green)' }} />
  if (status === 'failed') return <AlertCircle size={12} style={{ color: 'var(--red)' }} />
  return <Clock size={12} style={{ color: 'var(--text3)' }} />
}

function ChannelIcon({ channel }: { channel: 'sms' | 'call' | 'email' }) {
  if (channel === 'sms') return <MessageSquare size={11} />
  if (channel === 'email') return <Mail size={11} />
  return <Phone size={11} />
}

export default function ConversationThread({ messages, customerName }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text3)', fontSize: 13, flexDirection: 'column', gap: 8,
      }}>
        <MessageSquare size={32} style={{ opacity: 0.3 }} />
        <span>No messages yet</span>
        {customerName && <span style={{ fontSize: 12 }}>Start a conversation with {customerName}</span>}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {messages.map((msg) => {
        const isOut = msg.direction === 'outbound'

        // ── Call entry ──────────────────────────────────────────
        if (msg.channel === 'call') {
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 20,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                fontSize: 12, color: 'var(--text2)',
              }}>
                <Phone size={13} style={{ color: msg.status === 'failed' ? 'var(--red)' : 'var(--green)' }} />
                <span style={{ color: 'var(--text1)', fontWeight: 600 }}>
                  {isOut ? 'Outbound call' : 'Inbound call'}
                </span>
                {msg.call_duration_seconds !== null && (
                  <span style={{ color: 'var(--text3)' }}>· {fmtDuration(msg.call_duration_seconds)}</span>
                )}
                {msg.status === 'failed' && (
                  <span style={{ color: 'var(--red)' }}>· No answer</span>
                )}
                {msg.call_recording_url && (
                  <a
                    href={msg.call_recording_url}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)', textDecoration: 'none' }}
                  >
                    <Mic size={11} /> Recording
                  </a>
                )}
                <span style={{ color: 'var(--text3)', fontSize: 11 }}>{fmtTime(msg.created_at)}</span>
              </div>
            </div>
          )
        }

        // ── Email entry ─────────────────────────────────────────
        if (msg.channel === 'email') {
          return (
            <div key={msg.id} style={{
              padding: '12px 14px',
              background: isOut ? 'var(--surface2)' : 'rgba(79,127,255,0.08)',
              border: `1px solid ${isOut ? 'var(--border)' : 'rgba(79,127,255,0.25)'}`,
              borderRadius: 10, maxWidth: '85%',
              alignSelf: isOut ? 'flex-end' : 'flex-start',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Mail size={12} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>
                  {msg.subject || '(no subject)'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {msg.body}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>
                <ChannelIcon channel="email" />
                {msg.sender_name && <span>{msg.sender_name} ·</span>}
                <span>{fmtTime(msg.created_at)}</span>
                <StatusIcon status={msg.status} />
              </div>
            </div>
          )
        }

        // ── SMS entry ───────────────────────────────────────────
        return (
          <div key={msg.id} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isOut ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '75%',
              padding: '10px 14px',
              borderRadius: isOut ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: isOut ? 'var(--accent)' : 'var(--surface2)',
              color: isOut ? '#fff' : 'var(--text1)',
              fontSize: 14,
              lineHeight: 1.5,
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.body}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              marginTop: 4, fontSize: 11, color: 'var(--text3)',
            }}>
              {isOut && msg.sender_name && <span>{msg.sender_name} ·</span>}
              <span>{fmtTime(msg.created_at)}</span>
              {isOut && <StatusIcon status={msg.status} />}
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
