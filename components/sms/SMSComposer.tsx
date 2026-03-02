'use client'
import { useState } from 'react'
import { Send, Phone, MessageSquare, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface SMSComposerProps {
  customerPhone: string
  customerName: string
  conversationId?: string
  onMessageSent?: (message: string) => void
}

export default function SMSComposer({
  customerPhone,
  customerName,
  conversationId,
  onMessageSent,
}: SMSComposerProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleSend = async () => {
    if (!message.trim() || sending) return
    setSending(true)
    setStatus('idle')
    setError('')

    try {
      const res = await fetch('/api/twilio/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customerPhone,
          body: message.trim(),
          conversation_id: conversationId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setStatus('success')
      setMessage('')
      onMessageSent?.(message.trim())
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err: any) {
      setStatus('error')
      setError(err.message || 'Failed to send SMS')
    } finally {
      setSending(false)
    }
  }

  const charCount = message.length
  const smsSegments = Math.ceil(charCount / 160) || 1

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 12,
      background: 'var(--surface)',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)' }}>
        <MessageSquare size={13} style={{ color: 'var(--green)' }} />
        <span>SMS to</span>
        <span style={{ color: 'var(--text1)', fontWeight: 600 }}>{customerName}</span>
        <span style={{ color: 'var(--text3)' }}>·</span>
        <Phone size={11} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{customerPhone}</span>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
        placeholder="Type your SMS message..."
        maxLength={1600}
        rows={3}
        style={{
          width: '100%',
          background: 'var(--surface2)',
          color: 'var(--text1)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 13,
          resize: 'none',
          outline: 'none',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: charCount > 1440 ? 'var(--red)' : 'var(--text3)' }}>
            {charCount}/1600
          </span>
          {smsSegments > 1 && (
            <span style={{
              fontSize: 11, color: 'var(--amber)',
              background: 'rgba(245,158,11,0.12)',
              padding: '2px 8px', borderRadius: 99,
            }}>
              {smsSegments} segments
            </span>
          )}
          {status === 'success' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--green)' }}>
              <CheckCircle size={12} /> Sent
            </span>
          )}
          {status === 'error' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--red)' }}>
              <AlertCircle size={12} /> {error}
            </span>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: message.trim() && !sending ? 'var(--green)' : 'var(--surface2)',
            color: message.trim() && !sending ? '#fff' : 'var(--text3)',
            border: 'none', borderRadius: 8, cursor: message.trim() && !sending ? 'pointer' : 'default',
            padding: '7px 16px', fontSize: 13, fontWeight: 600,
          }}
        >
          {sending
            ? <><Clock size={13} style={{ animation: 'spin 1s linear infinite' }} />Sending...</>
            : <><Send size={13} />Send SMS</>
          }
        </button>
      </div>
    </div>
  )
}
