'use client'

import { useState, useEffect } from 'react'
import { X, Send, MessageSquare, Mail, Search, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  contact_name?: string
}

interface Template {
  id: string
  name: string
  body: string
  category: string
}

interface Props {
  onClose: () => void
  onSent: () => void
  defaultCustomerId?: string
  defaultProjectId?: string
  defaultChannel?: 'sms' | 'email'
}

function applyTemplateVars(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (str, [k, v]) => str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v),
    template
  )
}

export default function ComposeModal({ onClose, onSent, defaultCustomerId, defaultProjectId, defaultChannel }: Props) {
  const supabase = createClient()

  const [channel, setChannel] = useState<'sms' | 'email'>(defaultChannel || 'sms')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const charLimit = 160
  const segmentCount = Math.ceil(body.length / charLimit) || 1

  useEffect(() => {
    // Load templates
    supabase.from('sms_templates').select('*').order('category').then(({ data }) => {
      if (data) setTemplates(data)
    })

    // If defaultCustomerId, load that customer
    if (defaultCustomerId) {
      supabase.from('customers').select('id, name, email, phone')
        .eq('id', defaultCustomerId).single().then(({ data }) => {
          if (data) {
            setSelectedCustomer(data)
            setTo(channel === 'sms' ? (data.phone || '') : (data.email || ''))
          }
        })
    }
  }, [])

  useEffect(() => {
    if (customerSearch.length < 2) { setCustomers([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('customers')
        .select('id, name, email, phone')
        .or(`name.ilike.%${customerSearch}%,email.ilike.%${customerSearch}%`)
        .limit(8)
      setCustomers(data || [])
    }, 250)
    return () => clearTimeout(t)
  }, [customerSearch])

  function selectCustomer(c: Customer) {
    setSelectedCustomer(c)
    setCustomerSearch('')
    setCustomers([])
    setShowCustomerDropdown(false)
    setTo(channel === 'sms' ? (c.phone || '') : (c.email || ''))
  }

  function applyTemplate(t: Template) {
    const vars = {
      customer_name: selectedCustomer?.contact_name || selectedCustomer?.name || 'there',
      vehicle: 'your vehicle',
      estimate_link: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'}/estimate`,
    }
    setBody(applyTemplateVars(t.body, vars))
    setShowTemplates(false)
  }

  async function handleSend() {
    if (!to || !body) { setError('Fill in recipient and message'); return }
    if (channel === 'email' && !subject) { setError('Email subject is required'); return }
    setError(null)
    setSending(true)
    try {
      const endpoint = channel === 'sms' ? '/api/comms/sms/send' : '/api/comms/email/send'
      const payload: Record<string, string | undefined> = {
        to,
        body,
        customer_id: selectedCustomer?.id || defaultCustomerId,
        project_id: defaultProjectId,
        ...(channel === 'email' ? { subject } : {}),
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Send failed')
      onSent()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column',
        maxHeight: '90vh', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 900, color: 'var(--text1)' }}>
            New Message
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          {/* Channel toggle */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['sms', 'email'] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => { setChannel(ch); if (selectedCustomer) setTo(ch === 'sms' ? (selectedCustomer.phone || '') : (selectedCustomer.email || '')) }}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${channel === ch ? 'var(--accent)' : 'var(--border)'}`,
                  background: channel === ch ? 'rgba(79,127,255,0.12)' : 'transparent',
                  color: channel === ch ? 'var(--accent)' : 'var(--text2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 13, fontWeight: 600,
                }}
              >
                {ch === 'sms' ? <MessageSquare size={14} /> : <Mail size={14} />}
                {ch.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Customer search */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Customer
            </label>
            {selectedCustomer ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>
                  {selectedCustomer.contact_name || selectedCustomer.name}
                </span>
                <button onClick={() => { setSelectedCustomer(null); setTo('') }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
                <input
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Search customers..."
                  className="field"
                  style={{ paddingLeft: 30 }}
                />
                {showCustomerDropdown && customers.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                    {customers.map(c => (
                      <button key={c.id} onClick={() => selectCustomer(c)} style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
                        background: 'none', border: 'none', color: 'var(--text1)', cursor: 'pointer',
                        fontSize: 13, borderBottom: '1px solid var(--surface2)',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <div style={{ fontWeight: 600 }}>{c.contact_name || c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{c.phone} · {c.email}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* To field */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {channel === 'sms' ? 'Phone Number' : 'Email Address'}
            </label>
            <input
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder={channel === 'sms' ? '+1 (555) 000-0000' : 'customer@email.com'}
              type={channel === 'email' ? 'email' : 'tel'}
              className="field"
            />
          </div>

          {/* Email subject */}
          {channel === 'email' && (
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Subject
              </label>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject..." className="field" />
            </div>
          )}

          {/* Message body */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Message
              </label>
              {channel === 'sms' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setShowTemplates(v => !v)} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Templates <ChevronDown size={11} />
                  </button>
                  <span style={{ fontSize: 11, color: body.length > charLimit * segmentCount * 0.9 ? 'var(--amber)' : 'var(--text3)', fontFamily: 'JetBrains Mono' }}>
                    {body.length}/{charLimit * segmentCount} ({segmentCount} seg)
                  </span>
                </div>
              )}
            </div>
            {showTemplates && templates.length > 0 && (
              <div style={{ marginBottom: 8, background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                {templates.map(t => (
                  <button key={t.id} onClick={() => applyTemplate(t)} style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                    background: 'none', border: 'none', borderBottom: '1px solid var(--border)',
                    color: 'var(--text1)', cursor: 'pointer', fontSize: 12,
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div style={{ color: 'var(--text3)', fontSize: 11, marginTop: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.body.slice(0, 80)}...</div>
                  </button>
                ))}
              </div>
            )}
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={channel === 'sms' ? 'Type your message...' : 'Write your email...'}
              rows={channel === 'sms' ? 4 : 7}
              style={{
                width: '100%', padding: '10px 12px',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text1)', fontSize: 13,
                resize: 'vertical', outline: 'none', lineHeight: 1.5,
              }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'rgba(242,90,90,0.1)', borderRadius: 6 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-ghost btn-sm">Cancel</button>
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1,
            }}
          >
            <Send size={13} /> {sending ? 'Sending...' : `Send ${channel.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  )
}
