'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, MessageSquare, Phone, Mail, Send,
  User, Clock, DollarSign, Car, Briefcase,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const C = {
  bg: '#0d0f14', surface: '#13151c', surface2: '#1a1d27', border: '#2a2f3d',
  accent: '#4f7fff', green: '#22c07a', red: '#f25a5a', cyan: '#22d3ee',
  amber: '#f59e0b', purple: '#8b5cf6', text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  submitted:   { label: 'Submitted',     color: C.text2 },
  estimate:    { label: 'Estimating',    color: C.accent },
  approved:    { label: 'Approved',      color: C.cyan },
  deposit:     { label: 'Deposit In',    color: C.cyan },
  production:  { label: 'In Production', color: C.purple },
  install:     { label: 'Installing',    color: C.purple },
  complete:    { label: 'Complete',      color: C.green },
  paid:        { label: 'Paid',          color: C.green },
  cancelled:   { label: 'Cancelled',     color: C.red },
}

const STAGES = ['submitted', 'estimate', 'approved', 'deposit', 'production', 'install', 'complete', 'paid']

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

interface Message {
  id: string; channel: string; sender_type: string; sender_name: string
  body: string; created_at: string
}

interface Referral {
  id: string; customer_name: string | null; customer_phone: string | null
  customer_email: string | null; vehicle_desc: string | null
  vehicle_year: string | null; vehicle_make: string | null; vehicle_model: string | null
  service_type: string; status: string; commission_amount: number | null
  notes: string | null; created_at: string
}

export default function ReferralDetail({
  referral,
  messages: initial,
  agentName,
}: {
  referral: Referral
  messages: Message[]
  agentName: string
}) {
  const [messages, setMessages] = useState(initial)
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [tab, setTab] = useState<'details' | 'messages'>('details')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const meta = STATUS_META[referral.status] ?? STATUS_META.submitted
  const stageIdx = STAGES.indexOf(referral.status)

  // Realtime messages
  useEffect(() => {
    const channel = supabase.channel(`agent-messages-${referral.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sales_agent_messages',
        filter: `referral_id=eq.${referral.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [referral.id, supabase])

  useEffect(() => {
    if (tab === 'messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, tab])

  async function sendMessage() {
    if (!newMsg.trim()) return
    setSending(true)
    await fetch(`/api/sales-portal/referrals/${referral.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: newMsg.trim(), channel: 'agent_shop' }),
    })
    setNewMsg('')
    setSending(false)
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 120px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Link href="/sales-portal/referrals" style={{ color: C.text3, textDecoration: 'none' }}>
          <ArrowLeft size={20} />
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text1, fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
            {referral.customer_name || 'Unnamed'}
          </div>
          <div style={{ fontSize: 12, color: meta.color, fontWeight: 600, marginTop: 2 }}>{meta.label}</div>
        </div>
        {referral.commission_amount && (
          <div style={{
            padding: '5px 12px', borderRadius: 20,
            background: `${C.green}15`, border: `1px solid ${C.green}30`,
            fontSize: 13, fontWeight: 700, color: C.green,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {money(referral.commission_amount)}
          </div>
        )}
      </div>

      {/* Status Pipeline */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 20,
        padding: '12px 14px', background: C.surface,
        border: `1px solid ${C.border}`, borderRadius: 10,
      }}>
        {STAGES.map((stage, idx) => {
          const done = idx <= stageIdx
          const current = idx === stageIdx
          return (
            <div key={stage} style={{
              flex: 1, height: 6, borderRadius: 3,
              background: done ? (current ? meta.color : C.green) : C.border,
              transition: 'background 0.3s',
            }} />
          )
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 16 }}>
        {(['details', 'messages'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '12px', background: 'none', border: 'none',
              borderBottom: tab === t ? `2px solid ${C.accent}` : '2px solid transparent',
              color: tab === t ? C.accent : C.text3, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)',
              letterSpacing: '.04em', textTransform: 'capitalize',
            }}
          >
            {t === 'messages' ? `Messages (${messages.length})` : 'Details'}
          </button>
        ))}
      </div>

      {/* Details Tab */}
      {tab === 'details' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Customer Info */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              Customer
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={14} color={C.text3} />
                <span style={{ fontSize: 14, color: C.text1 }}>{referral.customer_name || 'N/A'}</span>
              </div>
              {referral.customer_phone && (
                <a href={`tel:${referral.customer_phone}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.cyan, textDecoration: 'none' }}>
                  <Phone size={14} />
                  <span style={{ fontSize: 13 }}>{referral.customer_phone}</span>
                </a>
              )}
              {referral.customer_email && (
                <a href={`mailto:${referral.customer_email}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.accent, textDecoration: 'none' }}>
                  <Mail size={14} />
                  <span style={{ fontSize: 13 }}>{referral.customer_email}</span>
                </a>
              )}
            </div>
          </div>

          {/* Vehicle Info */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              Vehicle & Service
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Car size={14} color={C.text3} />
                <span style={{ fontSize: 14, color: C.text1 }}>
                  {referral.vehicle_desc || [referral.vehicle_year, referral.vehicle_make, referral.vehicle_model].filter(Boolean).join(' ') || 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Briefcase size={14} color={C.text3} />
                <span style={{ fontSize: 13, color: C.text2 }}>{referral.service_type}</span>
              </div>
            </div>
          </div>

          {referral.notes && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                Notes
              </div>
              <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5 }}>{referral.notes}</div>
            </div>
          )}

          <div style={{ fontSize: 11, color: C.text3, textAlign: 'center', marginTop: 8 }}>
            Submitted {new Date(referral.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      )}

      {/* Messages Tab */}
      {tab === 'messages' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Message list */}
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: C.text3, fontSize: 13 }}>
                No messages yet. Send a message to the shop.
              </div>
            )}
            {messages.filter(m => m.channel === 'agent_shop').map(m => {
              const isAgent = m.sender_type === 'agent'
              return (
                <div key={m.id} style={{
                  alignSelf: isAgent ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                }}>
                  <div style={{
                    padding: '10px 14px',
                    background: isAgent ? `${C.accent}20` : C.surface2,
                    border: `1px solid ${isAgent ? `${C.accent}30` : C.border}`,
                    borderRadius: isAgent ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: isAgent ? C.accent : C.green, marginBottom: 4 }}>
                      {m.sender_name}
                    </div>
                    <div style={{ fontSize: 13, color: C.text1, lineHeight: 1.4 }}>{m.body}</div>
                  </div>
                  <div style={{ fontSize: 9, color: C.text3, marginTop: 2, textAlign: isAgent ? 'right' : 'left' }}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Message the shop..."
              style={{
                flex: 1, padding: '10px 14px', minHeight: 44, maxHeight: 100,
                background: C.surface2, border: `1px solid ${C.border}`,
                borderRadius: 10, color: C.text1, fontSize: 13,
                resize: 'none', outline: 'none',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!newMsg.trim() || sending}
              style={{
                width: 44, height: 44, borderRadius: 10,
                background: newMsg.trim() ? C.accent : C.surface2,
                border: 'none', cursor: newMsg.trim() ? 'pointer' : 'default',
                color: newMsg.trim() ? '#fff' : C.text3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
