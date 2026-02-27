'use client'

import { useState, useEffect, useRef } from 'react'
import { usePortal } from '@/lib/portal-context'
import { C, fmt } from '@/lib/portal-theme'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2, MessageSquare, Paperclip } from 'lucide-react'

interface Message {
  id: string
  sender_name: string
  body: string
  direction: string
  created_at: string
  project_id?: string | null
  customer_id?: string | null
}

interface Props {
  initialMessages: Message[]
  customerId: string
  customerName: string
  orgId: string
}

export default function PortalMessages({ initialMessages, customerId, customerName, orgId }: Props) {
  const { token } = usePortal()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [text, setText] = useState('')
  const [senderName, setSenderName] = useState(customerName || '')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`portal-messages-${customerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'portal_messages',
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [customerId, supabase])

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/portal/customer-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          customerId,
          orgId,
          senderName: senderName || 'Customer',
          body: text.trim(),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, data.message])
        setText('')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 130px)' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
          Messages
        </h1>
      </div>

      {/* Messages list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: C.text3 }}>
            <MessageSquare size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 14 }}>No messages yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Send us a message below</div>
          </div>
        )}

        {messages.map((msg) => {
          const isCustomer = msg.direction === 'customer'
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isCustomer ? 'flex-end' : 'flex-start',
                marginBottom: 12,
              }}
            >
              <div style={{
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: 16,
                borderBottomRightRadius: isCustomer ? 4 : 16,
                borderBottomLeftRadius: isCustomer ? 16 : 4,
                background: isCustomer ? C.accent : C.surface2,
                color: isCustomer ? '#fff' : C.text1,
              }}>
                {!isCustomer && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text3, marginBottom: 4 }}>
                    {msg.sender_name}
                  </div>
                )}
                <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {msg.body}
                </div>
                <div style={{
                  fontSize: 10,
                  color: isCustomer ? 'rgba(255,255,255,0.5)' : C.text3,
                  marginTop: 4,
                  textAlign: 'right',
                }}>
                  {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Sender name + Input */}
      <div style={{ padding: '8px 16px 16px', borderTop: `1px solid ${C.border}`, background: C.surface }}>
        {/* Name input (first time only) */}
        {!customerName && (
          <input
            type="text"
            placeholder="Your name..."
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              marginBottom: 8,
              background: C.surface2,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.text1,
              fontSize: 13,
            }}
          />
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: C.surface2,
              border: `1px solid ${C.border}`,
              borderRadius: 20,
              color: C.text1,
              fontSize: 14,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: text.trim() ? C.accent : C.surface2,
              border: 'none',
              color: '#fff',
              cursor: text.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
