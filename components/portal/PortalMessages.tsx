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
  attachment_url?: string | null
}

interface Props {
  initialMessages: Message[]
  customerId: string
  customerName: string
  orgId: string
  projectId?: string  // When set, scopes chat to a specific job
}

export default function PortalMessages({ initialMessages, customerId, customerName, orgId, projectId }: Props) {
  const { token } = usePortal()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [text, setText] = useState('')
  const [senderName, setSenderName] = useState(customerName || '')
  const [sending, setSending] = useState(false)
  const [attachmentPreview, setAttachmentPreview] = useState<{ file: File; url: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
          // If scoped to a project, only show messages for that project
          if (projectId && newMsg.project_id !== projectId) return
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [customerId, supabase])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachmentPreview({ file, url: URL.createObjectURL(file) })
    e.target.value = ''
  }

  function clearAttachment() {
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview.url)
      setAttachmentPreview(null)
    }
  }

  async function handleSend() {
    if ((!text.trim() && !attachmentPreview) || sending) return
    setSending(true)

    let attachmentUrl: string | null = null

    try {
      // Upload attachment first if present
      if (attachmentPreview) {
        setUploading(true)
        const formData = new FormData()
        formData.append('file', attachmentPreview.file)
        formData.append('portal_token', token)
        formData.append('category', 'message_attachment')

        const uploadRes = await fetch('/api/portal/upload', { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()
        if (uploadRes.ok && uploadData.url) {
          attachmentUrl = uploadData.url
        }
        setUploading(false)
      }

      const messageBody = attachmentUrl && !text.trim()
        ? '[Sent an image]'
        : text.trim()

      const res = await fetch('/api/portal/customer-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          customerId,
          orgId,
          senderName: senderName || 'Customer',
          body: messageBody,
          attachment_url: attachmentUrl,
          ...(projectId && { project_id: projectId }),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, data.message])
        setText('')
        clearAttachment()
      }
    } finally {
      setSending(false)
      setUploading(false)
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
                {msg.attachment_url && (
                  <img
                    src={msg.attachment_url}
                    alt="Attachment"
                    style={{
                      maxWidth: '100%',
                      borderRadius: 8,
                      marginBottom: msg.body && msg.body !== '[Sent an image]' ? 8 : 0,
                    }}
                  />
                )}
                {msg.body && msg.body !== '[Sent an image]' && (
                  <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {msg.body}
                  </div>
                )}
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
        {/* Attachment preview */}
        {attachmentPreview && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ position: 'relative', width: 48, height: 48, borderRadius: 8, overflow: 'hidden', background: C.surface2, flexShrink: 0 }}>
              <img src={attachmentPreview.url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                onClick={clearAttachment}
                style={{
                  position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: 10,
                }}
              >
                x
              </button>
            </div>
            <span style={{ fontSize: 12, color: C.text3 }}>{attachmentPreview.file.name}</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: C.surface2,
              border: `1px solid ${C.border}`,
              color: C.text3,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Paperclip size={18} />
          </button>
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
            disabled={(!text.trim() && !attachmentPreview) || sending}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: (text.trim() || attachmentPreview) ? C.accent : C.surface2,
              border: 'none',
              color: '#fff',
              cursor: (text.trim() || attachmentPreview) ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {sending ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
