'use client'

import { useState, useEffect, useRef } from 'react'
import { C, fmt } from '@/lib/portal-theme'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2, Users, MessageSquare, Building2 } from 'lucide-react'

export type MessageChannel = 'dealer_shop' | 'group' | 'customer_shop'

interface DealerMessage {
  id: string
  channel: MessageChannel
  sender_type: 'dealer' | 'shop' | 'customer'
  sender_name: string
  body: string
  attachment_url: string | null
  read_dealer: boolean
  created_at: string
}

interface Props {
  dealerId: string
  dealerName: string
  referralId?: string   // scope to a specific job (optional)
  initialMessages: DealerMessage[]
}

const CHANNEL_META: Record<MessageChannel, { label: string; icon: typeof Users; description: string; color: string }> = {
  dealer_shop: {
    label: 'Shop Direct',
    icon: Building2,
    description: 'Private between you and the shop — customer cannot see this',
    color: '#4f7fff',
  },
  group: {
    label: 'Group Chat',
    icon: Users,
    description: 'Everyone — you, the shop, and the customer',
    color: '#22c07a',
  },
  customer_shop: {
    label: 'Customer Thread',
    icon: MessageSquare,
    description: 'Between the customer and the shop — you can read but not reply',
    color: '#22d3ee',
  },
}

const SENDER_COLOR: Record<string, string> = {
  dealer: '#4f7fff',
  shop:   '#22c07a',
  customer: '#f59e0b',
}

export default function DealerMessages({ dealerId, dealerName, referralId, initialMessages }: Props) {
  const [activeChannel, setActiveChannel] = useState<MessageChannel>('dealer_shop')
  const [messages, setMessages] = useState<DealerMessage[]>(initialMessages)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const channelMessages = messages.filter(m => m.channel === activeChannel)

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [channelMessages.length, activeChannel])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`dealer-messages-${dealerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dealer_messages',
          filter: `dealer_id=eq.${dealerId}`,
        },
        (payload) => {
          const msg = payload.new as DealerMessage
          if (referralId && (payload.new as any).referral_id !== referralId) return
          setMessages(prev => [...prev, msg])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [dealerId, referralId])

  // Mark messages as read when channel switches
  useEffect(() => {
    const unread = channelMessages.filter(m => !m.read_dealer)
    if (unread.length === 0) return
    supabase
      .from('dealer_messages')
      .update({ read_dealer: true })
      .in('id', unread.map(m => m.id))
      .then(() => {})
  }, [activeChannel])

  const canReply = activeChannel !== 'customer_shop'

  async function handleSend() {
    if (!text.trim() || sending || !canReply) return
    setSending(true)
    try {
      await supabase.from('dealer_messages').insert({
        dealer_id: dealerId,
        referral_id: referralId || null,
        channel: activeChannel,
        sender_type: 'dealer',
        sender_name: dealerName,
        body: text.trim(),
        read_dealer: true,
        read_shop: false,
        read_customer: activeChannel === 'group' ? false : undefined,
      })
      setText('')
    } finally {
      setSending(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const meta = CHANNEL_META[activeChannel]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 130px)' }}>

      {/* Channel Selector */}
      <div style={{
        display: 'flex', gap: 6, padding: '12px 16px',
        borderBottom: `1px solid ${C.border}`,
        background: C.surface,
        overflowX: 'auto',
      }}>
        {(Object.keys(CHANNEL_META) as MessageChannel[]).map(ch => {
          const m = CHANNEL_META[ch]
          const Icon = m.icon
          const active = activeChannel === ch
          const unread = messages.filter(msg => msg.channel === ch && !msg.read_dealer).length
          return (
            <button
              key={ch}
              onClick={() => setActiveChannel(ch)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 20, border: 'none',
                background: active ? m.color : C.surface2,
                color: active ? '#fff' : C.text2,
                fontSize: 13, fontWeight: active ? 700 : 500,
                cursor: 'pointer', fontFamily: 'inherit',
                flexShrink: 0, position: 'relative',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={14} strokeWidth={2} />
              {m.label}
              {unread > 0 && (
                <span style={{
                  background: '#f25a5a', color: '#fff',
                  borderRadius: '50%', width: 16, height: 16,
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginLeft: 2,
                }}>
                  {unread}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Channel description */}
      <div style={{
        padding: '8px 16px', fontSize: 11, color: meta.color,
        background: `${meta.color}08`, borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <meta.icon size={12} />
        {meta.description}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {channelMessages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: C.text3 }}>
            <meta.icon size={28} strokeWidth={1} style={{ marginBottom: 8, opacity: 0.3 }} />
            <div style={{ fontSize: 13 }}>No messages yet in this thread</div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {channelMessages.map(msg => {
            const isDealer = msg.sender_type === 'dealer'
            const senderColor = SENDER_COLOR[msg.sender_type] ?? C.text2
            return (
              <div key={msg.id} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: isDealer ? 'flex-end' : 'flex-start',
              }}>
                <div style={{ fontSize: 10, color: C.text3, marginBottom: 4 }}>
                  <span style={{ color: senderColor, fontWeight: 700 }}>{msg.sender_name}</span>
                  {' · '}{fmt(msg.created_at)}
                </div>
                <div style={{
                  maxWidth: '78%', padding: '10px 14px', borderRadius: isDealer ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isDealer ? `${C.accent}20` : C.surface,
                  border: `1px solid ${isDealer ? C.accent + '40' : C.border}`,
                  fontSize: 14, color: C.text1, lineHeight: 1.5,
                }}>
                  {msg.body}
                </div>
              </div>
            )
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px env(safe-area-inset-bottom, 12px)',
        borderTop: `1px solid ${C.border}`,
        background: C.surface,
      }}>
        {canReply ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder={`Message ${meta.label}…`}
              rows={1}
              style={{
                flex: 1, background: C.surface2, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '10px 14px', color: C.text1,
                fontSize: 14, resize: 'none', fontFamily: 'inherit',
                outline: 'none', lineHeight: 1.5,
              }}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              style={{
                width: 40, height: 40, borderRadius: 10, border: 'none',
                background: text.trim() && !sending ? meta.color : C.surface2,
                color: text.trim() && !sending ? '#fff' : C.text3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: text.trim() && !sending ? 'pointer' : 'default',
                flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', fontSize: 12, color: C.text3, padding: '8px 0' }}>
            Read-only — this thread is between the customer and the shop
          </div>
        )}
      </div>
    </div>
  )
}
