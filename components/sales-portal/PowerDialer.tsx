'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePhone } from '@/components/phone/PhoneProvider'
import {
  Phone, PhoneOff, Mic, MicOff, Pause, Play, SkipForward,
  ArrowLeft, ChevronRight, Clock, ThumbsUp, ThumbsDown,
  MessageSquare, Mail, Save, Building2, User, X,
} from 'lucide-react'

const C = {
  bg: '#0d0f14', surface: '#13151c', surface2: '#1a1d27', border: '#2a2f3d',
  accent: '#4f7fff', green: '#22c07a', red: '#f25a5a', cyan: '#22d3ee',
  amber: '#f59e0b', purple: '#8b5cf6', text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
}

interface Lead {
  id: string; name: string; company: string | null; phone: string | null
  email: string | null; status: string; notes: string | null
  call_count: number; custom_fields: Record<string, string>
}

interface ListItem {
  id: string; name: string; total_count: number; called_count: number
}

const DISPOSITIONS = [
  { key: 'interested', label: 'Interested', color: C.green, icon: ThumbsUp },
  { key: 'callback', label: 'Callback', color: C.cyan, icon: Clock },
  { key: 'no_answer', label: 'No Answer', color: C.amber, icon: Phone },
  { key: 'not_interested', label: 'Not Interested', color: C.red, icon: ThumbsDown },
  { key: 'converted', label: 'Converted!', color: C.green, icon: ThumbsUp },
  { key: 'skipped', label: 'Skip', color: C.text3, icon: SkipForward },
]

export default function PowerDialer({ list, leads: initial }: { list: ListItem; leads: Lead[] }) {
  const router = useRouter()
  const phone = usePhone()
  const [leads, setLeads] = useState(initial)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [notes, setNotes] = useState('')
  const [showDisposition, setShowDisposition] = useState(false)
  const [callStartTime, setCallStartTime] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [callbackDate, setCallbackDate] = useState('')
  const [saving, setSaving] = useState(false)

  const current = leads[currentIdx] ?? null
  const remaining = leads.length - currentIdx
  const isInCall = phone?.callState === 'in-call' || phone?.callState === 'connecting' || phone?.callState === 'ringing'

  // Timer
  useEffect(() => {
    if (!callStartTime) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - callStartTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [callStartTime])

  // Watch for call end -> show disposition
  useEffect(() => {
    if (phone?.callState === 'idle' && callStartTime) {
      setCallStartTime(null)
      setShowDisposition(true)
    }
  }, [phone?.callState, callStartTime])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  async function handleCall() {
    if (!current?.phone || !phone) return
    try {
      await phone.makeCall(current.phone, current.name)
      setCallStartTime(Date.now())
      setElapsed(0)
    } catch (err) {
      console.error('Call failed:', err)
    }
  }

  function handleHangup() {
    phone?.hangUp()
  }

  async function handleDisposition(status: string) {
    if (!current) return
    setSaving(true)

    const updates: Record<string, any> = {
      status,
      notes: notes.trim() || current.notes || null,
      call_count: current.call_count + 1,
      last_called_at: new Date().toISOString(),
    }

    if (status === 'callback' && callbackDate) {
      updates.next_callback = new Date(callbackDate).toISOString()
    }

    await fetch(`/api/sales-portal/leads/${current.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    // Move to next lead
    setLeads(prev => prev.map((l, i) => i === currentIdx ? { ...l, ...updates } : l))
    setNotes('')
    setShowDisposition(false)
    setCallbackDate('')
    setElapsed(0)

    // Advance to next pending lead
    let nextIdx = currentIdx + 1
    while (nextIdx < leads.length && !['pending', 'no_answer', 'callback'].includes(leads[nextIdx].status)) {
      nextIdx++
    }
    setCurrentIdx(nextIdx)
    setSaving(false)
  }

  if (!current) {
    return (
      <div style={{ padding: '20px 16px' }}>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.text3 }}>
          <Phone size={40} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 16, color: C.text2, marginBottom: 8, fontWeight: 600 }}>List complete!</div>
          <div style={{ fontSize: 13, marginBottom: 24 }}>You&apos;ve gone through all leads in this list</div>
          <Link href={`/sales-portal/leads/${list.id}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 10,
            background: C.accent, color: '#fff',
            fontSize: 14, fontWeight: 700, textDecoration: 'none',
          }}>
            <ArrowLeft size={16} /> Back to List
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px', minHeight: 'calc(100dvh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Link href={`/sales-portal/leads/${list.id}`} style={{ color: C.text3, textDecoration: 'none' }}>
          <ArrowLeft size={20} />
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            Power Dialer
          </div>
          <div style={{ fontSize: 14, color: C.text2, marginTop: 1 }}>
            {list.name} &middot; {remaining} remaining
          </div>
        </div>
        {isInCall && (
          <div style={{
            padding: '5px 12px', borderRadius: 20,
            background: `${C.green}15`, border: `1px solid ${C.green}30`,
            fontSize: 13, fontWeight: 700, color: C.green,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {formatTime(elapsed)}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ height: 4, borderRadius: 2, background: C.border, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2, background: C.accent,
            width: `${Math.round(((currentIdx + 1) / leads.length) * 100)}%`,
            transition: 'width 0.3s',
          }} />
        </div>
        <div style={{ fontSize: 10, color: C.text3, marginTop: 4, textAlign: 'right' }}>
          {currentIdx + 1} of {leads.length}
        </div>
      </div>

      {/* Current Lead Card */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: '24px 20px', marginBottom: 16, flex: 1,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: `${C.accent}15`, border: `2px solid ${C.accent}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <User size={28} color={C.accent} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text1, fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
            {current.name}
          </div>
          {current.company && (
            <div style={{ fontSize: 14, color: C.text2, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Building2 size={14} /> {current.company}
            </div>
          )}
          {current.phone && (
            <div style={{ fontSize: 16, color: C.cyan, marginTop: 8, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
              {current.phone}
            </div>
          )}
          {current.email && (
            <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>{current.email}</div>
          )}
        </div>

        {/* Previous notes */}
        {current.notes && (
          <div style={{
            padding: '10px 14px', background: C.surface2,
            border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 16,
            fontSize: 12, color: C.text2, fontStyle: 'italic',
          }}>
            Previous notes: {current.notes}
          </div>
        )}

        {/* Custom fields */}
        {Object.keys(current.custom_fields || {}).length > 0 && (
          <div style={{
            padding: '10px 14px', background: C.surface2,
            border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 16,
          }}>
            {Object.entries(current.custom_fields).map(([k, v]) => (
              <div key={k} style={{ fontSize: 11, color: C.text3, marginBottom: 2 }}>
                <span style={{ fontWeight: 600, color: C.text2 }}>{k}:</span> {v}
              </div>
            ))}
          </div>
        )}

        {/* Notes Input */}
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Take notes during call..."
          style={{
            width: '100%', padding: '12px 14px', minHeight: 80,
            background: C.surface2, border: `1px solid ${C.border}`,
            borderRadius: 10, color: C.text1, fontSize: 13,
            resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            marginBottom: 16,
          }}
        />

        {/* Call Controls */}
        {!showDisposition && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            {!isInCall ? (
              <>
                <button
                  onClick={() => handleDisposition('skipped')}
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: C.surface2, border: `1px solid ${C.border}`,
                    color: C.text3, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  title="Skip"
                >
                  <SkipForward size={22} />
                </button>
                <button
                  onClick={handleCall}
                  disabled={!current.phone || !phone}
                  style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: C.green, border: 'none',
                    color: '#fff', cursor: current.phone ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: current.phone ? 1 : 0.4,
                    boxShadow: `0 0 24px ${C.green}40`,
                  }}
                  title="Call"
                >
                  <Phone size={28} />
                </button>
                <button
                  onClick={() => setShowDisposition(true)}
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: C.surface2, border: `1px solid ${C.border}`,
                    color: C.text3, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  title="Disposition without calling"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => phone?.toggleMute()}
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: phone?.isMuted ? `${C.amber}20` : C.surface2,
                    border: `1px solid ${phone?.isMuted ? C.amber : C.border}`,
                    color: phone?.isMuted ? C.amber : C.text2, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {phone?.isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </button>
                <button
                  onClick={handleHangup}
                  style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: C.red, border: 'none',
                    color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 24px ${C.red}40`,
                  }}
                >
                  <PhoneOff size={28} />
                </button>
                <button
                  onClick={() => phone?.toggleHold()}
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: phone?.isOnHold ? `${C.cyan}20` : C.surface2,
                    border: `1px solid ${phone?.isOnHold ? C.cyan : C.border}`,
                    color: phone?.isOnHold ? C.cyan : C.text2, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {phone?.isOnHold ? <Play size={22} /> : <Pause size={22} />}
                </button>
              </>
            )}
          </div>
        )}

        {/* Disposition Panel */}
        {showDisposition && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              What happened?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {DISPOSITIONS.map(d => {
                const Icon = d.icon
                return (
                  <button
                    key={d.key}
                    onClick={() => {
                      if (d.key === 'callback') {
                        setCallbackDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16))
                        return
                      }
                      handleDisposition(d.key)
                    }}
                    disabled={saving}
                    style={{
                      padding: '14px 12px', borderRadius: 10,
                      background: `${d.color}10`, border: `1px solid ${d.color}25`,
                      color: d.color, fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <Icon size={16} /> {d.label}
                  </button>
                )
              })}
            </div>

            {/* Callback date picker */}
            {callbackDate && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 4, textTransform: 'uppercase' }}>
                  Callback Date/Time
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="datetime-local"
                    value={callbackDate}
                    onChange={e => setCallbackDate(e.target.value)}
                    style={{
                      flex: 1, padding: '8px 12px',
                      background: C.surface2, border: `1px solid ${C.border}`,
                      borderRadius: 6, color: C.text1, fontSize: 13,
                    }}
                  />
                  <button
                    onClick={() => handleDisposition('callback')}
                    disabled={saving}
                    style={{
                      padding: '8px 16px', borderRadius: 6,
                      background: C.cyan, color: '#fff', border: 'none',
                      fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    Set Callback
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => { setShowDisposition(false); setCallbackDate('') }}
              style={{
                width: '100%', padding: '10px', borderRadius: 8,
                background: 'none', border: `1px solid ${C.border}`,
                color: C.text3, fontSize: 12, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Upcoming leads preview */}
      {leads.length > currentIdx + 1 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Up Next
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
            {leads.slice(currentIdx + 1, currentIdx + 4).map(l => (
              <div key={l.id} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '8px 12px', minWidth: 120, flexShrink: 0,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>{l.name}</div>
                {l.company && <div style={{ fontSize: 10, color: C.text3 }}>{l.company}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
