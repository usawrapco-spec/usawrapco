'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Phone, MessageSquare, ArrowDownLeft, ArrowUpRight, Clock, ExternalLink } from 'lucide-react'
import SMSComposer from './SMSComposer'
import { useRouter } from 'next/navigation'

interface SMSMessage {
  id: string
  body: string | null
  direction: 'inbound' | 'outbound'
  channel: string
  status: string
  sender_name: string | null
  twilio_sid: string | null
  created_at: string
  media_urls: string[] | null
}

interface SMSThreadProps {
  customerId?: string | null
  customerName: string
  customerPhone: string
  projectId?: string | null
}

function fmtTime(ts: string) {
  const d = new Date(ts)
  const diffMs = Date.now() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return `Yesterday ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function SMSThread({ customerId, customerName, customerPhone, projectId }: SMSThreadProps) {
  const supabase = createClient()
  const router = useRouter()

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<SMSMessage[]>([])
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

  const loadThread = async () => {
    setLoading(true)
    try {
      // Find SMS conversation for this customer/phone
      const normalizedPhone = customerPhone.replace(/\D/g, '')
      let convQuery = supabase
        .from('conversations')
        .select('id')
        .or(`contact_phone.eq.${customerPhone},contact_phone.eq.+${normalizedPhone},customer_phone.eq.${customerPhone},customer_phone.eq.+${normalizedPhone}`)
        .order('last_message_at', { ascending: false })
        .limit(1)

      if (customerId) {
        convQuery = supabase
          .from('conversations')
          .select('id')
          .eq('customer_id', customerId)
          .order('last_message_at', { ascending: false })
          .limit(1)
      }

      const { data: convData } = await convQuery
      const convo = convData?.[0]

      if (!convo) {
        setLoading(false)
        return
      }

      setConversationId(convo.id)

      const { data: msgs } = await supabase
        .from('conversation_messages')
        .select('id, body, direction, channel, status, sender_name, twilio_sid, created_at, media_urls')
        .eq('conversation_id', convo.id)
        .eq('channel', 'sms')
        .order('created_at', { ascending: true })
        .limit(100)

      setMessages(msgs || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadThread()
  }, [customerId, customerPhone])

  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`sms-thread-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as SMSMessage
          if (newMsg.channel === 'sms') {
            setMessages((prev) => [...prev, newMsg])
            scrollToBottom()
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  useEffect(() => { scrollToBottom() }, [messages.length])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      border: '1px solid var(--border)',
      borderRadius: 12,
      background: 'var(--surface)',
      overflow: 'hidden',
      height: 420,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(34,192,122,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageSquare size={15} style={{ color: 'var(--green)' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{customerName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text3)' }}>
              <Phone size={10} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{customerPhone}</span>
              <span style={{
                marginLeft: 4, padding: '1px 6px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                background: 'rgba(34,192,122,0.15)', color: 'var(--green)',
              }}>SMS</span>
            </div>
          </div>
        </div>
        {conversationId && (
          <button
            onClick={() => router.push('/inbox')}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: 'var(--accent)',
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            Open inbox <ExternalLink size={11} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text3)', fontSize: 13 }}>
            <Clock size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text3)' }}>
            <MessageSquare size={28} style={{ opacity: 0.3 }} />
            <span style={{ fontSize: 13 }}>No SMS messages yet</span>
            <span style={{ fontSize: 12 }}>Send the first message below</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isOut = msg.direction === 'outbound'
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOut ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3, fontSize: 10, color: 'var(--text3)' }}>
                  {isOut
                    ? <><ArrowUpRight size={10} style={{ color: 'var(--accent)' }} /><span>You{msg.sender_name ? ` · ${msg.sender_name}` : ''}</span></>
                    : <><ArrowDownLeft size={10} style={{ color: 'var(--green)' }} /><span>{customerName}</span></>
                  }
                </div>
                <div style={{
                  maxWidth: '78%',
                  padding: '9px 13px',
                  borderRadius: isOut ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isOut ? 'var(--accent)' : 'var(--surface2)',
                  color: isOut ? '#fff' : 'var(--text1)',
                  fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                }}>
                  {msg.body || ''}
                  {msg.media_urls && msg.media_urls.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {msg.media_urls.map((url, i) => (
                        <img key={i} src={url} alt="MMS" style={{ maxWidth: 180, borderRadius: 8, display: 'block' }} />
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{fmtTime(msg.created_at)}</span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div style={{ borderTop: '1px solid var(--border)', padding: 12 }}>
        {!customerPhone ? (
          <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '6px 0' }}>
            No phone number on file
          </div>
        ) : (
          <SMSComposer
            customerPhone={customerPhone}
            customerName={customerName}
            conversationId={conversationId || undefined}
            onMessageSent={loadThread}
          />
        )}
      </div>
    </div>
  )
}
