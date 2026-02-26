'use client'
import { ORG_ID } from '@/lib/org'


/**
 * InboxSoftphone — embedded softphone panel in the inbox left sidebar.
 * Features: dialpad · incoming/ringing/in-call states · mute/hold/keypad/transfer
 *           call notes (auto-saved as internal note on hang-up)
 *           contact search while dialing · recent calls for one-click redial
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Phone, PhoneOff, PhoneIncoming, PhoneCall,
  Mic, MicOff, Hash, Delete, Search,
  PauseCircle, PlayCircle, ArrowRightLeft,
  X, Check, User, ChevronUp, ChevronDown,
  StickyNote, Clock, MessageSquare, Send,
} from 'lucide-react'
import { usePhone } from '@/components/phone/PhoneProvider'
import { createClient } from '@/lib/supabase/client'

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
]

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function fmtPhone(num: string) {
  const d = num.replace(/\D/g, '')
  if (d.length === 11 && d[0] === '1')
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  if (d.length === 10)
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  return num
}

interface Agent {
  id: string
  display_name: string | null
  cell_number: string
  extension: string | null
  is_available: boolean
  profile: { id: string; name: string; role: string } | null
  department: { id: string; name: string } | null
}

interface RecentCall {
  id: string
  contact_name: string | null
  contact_phone: string
  direction: string
  created_at: string
}

interface ContactMatch {
  id: string
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
}

const btn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 5, borderRadius: 8, cursor: 'pointer', fontWeight: 600,
  fontSize: 12, padding: '8px 0', border: 'none', transition: 'opacity 0.15s',
}

export function InboxSoftphone() {
  const phone = usePhone()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [dialNumber, setDialNumber] = useState('')
  const [showKeypad, setShowKeypad] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [transferring, setTransferring] = useState<string | null>(null)
  const [transferDone, setTransferDone] = useState(false)
  const [transferError, setTransferError] = useState('')

  // Call notes
  const [callNote, setCallNote] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)

  // SMS during call
  const [showSms, setShowSms] = useState(false)
  const [smsText, setSmsText] = useState('')
  const [smsSending, setSmsSending] = useState(false)
  const [smsSent, setSmsSent] = useState(false)

  // Contact search + recent calls
  const [contactResults, setContactResults] = useState<ContactMatch[]>([])
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Keep the active number while in-call so we can save the note after hang-up
  const prevNumberRef = useRef('')
  const prevNameRef = useRef('')
  // Ref keeps callNote in sync so the hang-up effect sees the latest value
  const callNoteRef = useRef('')

  // ── Track active number before it resets ──────────────────
  useEffect(() => {
    if (phone && phone.callState !== 'idle') {
      if (phone.activeNumber) prevNumberRef.current = phone.activeNumber
      if (phone.activeName) prevNameRef.current = phone.activeName
    }
  }, [phone?.activeNumber, phone?.callState])

  // ── Keep callNoteRef in sync with callNote state ─────────
  useEffect(() => { callNoteRef.current = callNote }, [callNote])

  // ── Auto-open on active call ──────────────────────────────
  useEffect(() => {
    if (phone?.callState === 'incoming' || phone?.callState === 'in-call') setOpen(true)
  }, [phone?.callState])

  // ── Reset transfer state + save note on call end ──────────
  useEffect(() => {
    if (phone?.callState === 'idle') {
      setShowTransfer(false)
      setTransferDone(false)
      setTransferError('')
      setTransferring(null)
      setShowKeypad(false)
      setShowSms(false)
      setSmsText('')
      setSmsSent(false)

      // Auto-save call note if one was written (use ref to avoid stale closure)
      if (callNoteRef.current.trim() && prevNumberRef.current) {
        saveCallNote(prevNumberRef.current, callNoteRef.current.trim())
        setCallNote('')
        callNoteRef.current = ''
      }
    }
  }, [phone?.callState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch recent calls on mount ───────────────────────────
  useEffect(() => {
    fetchRecentCalls()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search contacts as user types ─────────────────────────
  useEffect(() => {
    const q = dialNumber.trim()
    if (q.length < 2) { setContactResults([]); return }
    const t = setTimeout(() => searchContacts(q), 250)
    return () => clearTimeout(t)
  }, [dialNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchRecentCalls() {
    const { data } = await supabase
      .from('conversation_messages')
      .select('id, conversation:conversation_id(contact_name, contact_phone), direction, created_at')
      .eq('org_id', ORG_ID)
      .eq('channel', 'call')
      .order('created_at', { ascending: false })
      .limit(6)
    if (data) {
      const mapped: RecentCall[] = data
        .filter((m: any) => m.conversation?.contact_phone)
        .map((m: any) => ({
          id: m.id,
          contact_name: m.conversation?.contact_name || null,
          contact_phone: m.conversation?.contact_phone,
          direction: m.direction,
          created_at: m.created_at,
        }))
      // Deduplicate by phone number
      const seen = new Set<string>()
      setRecentCalls(mapped.filter(r => {
        if (seen.has(r.contact_phone)) return false
        seen.add(r.contact_phone)
        return true
      }).slice(0, 5))
    }
  }

  async function searchContacts(q: string) {
    setSearchLoading(true)
    const { data } = await supabase
      .from('conversations')
      .select('id, contact_name, contact_phone, contact_email')
      .eq('org_id', ORG_ID)
      .or(`contact_name.ilike.%${q}%,contact_phone.ilike.%${q}%`)
      .limit(5)
    setContactResults((data as ContactMatch[]) || [])
    setSearchLoading(false)
  }

  async function saveCallNote(phone_number: string, note: string) {
    // Find the conversation for this phone number
    const { data: convo } = await supabase
      .from('conversations')
      .select('id')
      .eq('org_id', ORG_ID)
      .eq('contact_phone', phone_number)
      .maybeSingle()
    if (!convo?.id) return

    await supabase.from('conversation_messages').insert({
      org_id: ORG_ID,
      conversation_id: convo.id,
      channel: 'note',
      direction: 'internal',
      body: `Call note: ${note}`,
      status: 'delivered',
      open_count: 0,
    })
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 3000)
  }

  const openTransfer = useCallback(async () => {
    setShowTransfer(true)
    setTransferError('')
    setTransferDone(false)
    if (agents.length === 0) {
      const res = await fetch('/api/phone/agents')
      if (res.ok) setAgents(await res.json())
    }
  }, [agents.length])

  const doTransfer = useCallback(async (agent: Agent, type: 'warm' | 'blind') => {
    if (!phone) return
    setTransferring(agent.id)
    setTransferError('')
    const result = await phone.transferCall({
      transferToAgentId: agent.id,
      transferToNumber: agent.cell_number,
      transferType: type,
      callerName: phone.activeName || phone.activeNumber,
    })
    setTransferring(null)
    if (result.success) {
      setTransferDone(true)
      setShowTransfer(false)
    } else {
      setTransferError(result.error || 'Transfer failed')
    }
  }, [phone])

  const sendSms = useCallback(async () => {
    if (!smsText.trim() || !phone?.activeNumber) return
    setSmsSending(true)
    try {
      await fetch('/api/inbox/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'sms',
          to_phone: phone.activeNumber,
          contact_name: phone.activeName || phone.activeNumber,
          body: smsText.trim(),
        }),
      })
      setSmsText('')
      setSmsSent(true)
      setTimeout(() => { setSmsSent(false); setShowSms(false) }, 2500)
    } finally {
      setSmsSending(false)
    }
  }, [smsText, phone?.activeNumber, phone?.activeName])

  if (!phone) return null

  const {
    callState, activeNumber, activeName, isMuted, isOnHold, isReady,
    duration, makeCall, hangUp, answer, decline, toggleMute, toggleHold, sendDigit,
  } = phone

  const isActive = callState !== 'idle'

  function pressDigit(d: string) {
    if (callState === 'in-call') { sendDigit(d) } else { setDialNumber(p => p + d) }
  }

  function handleCall(number?: string, name?: string) {
    const n = (number || dialNumber).trim()
    if (n && isReady) { makeCall(n, name); setDialNumber(''); setContactResults([]) }
  }

  const digitBtn: React.CSSProperties = {
    flex: 1, height: 38, borderRadius: 6,
    background: 'var(--surface)', border: '1px solid var(--border)',
    color: 'var(--text1)', fontSize: 16, fontWeight: 600,
    cursor: 'pointer', transition: 'background 0.1s',
  }

  const dotColor =
    callState === 'in-call'  ? 'var(--green)' :
    callState === 'incoming' ? 'var(--amber)' :
    isReady                  ? 'var(--green)' : '#5a6080'

  const headerLabel =
    callState === 'in-call'    ? `In Call · ${fmt(duration)}` :
    callState === 'incoming'   ? 'Incoming Call' :
    callState === 'connecting' ? 'Connecting...' :
    callState === 'ringing'    ? 'Ringing...' :
    isReady                    ? 'Phone Ready' : 'Phone'

  return (
    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>

      {/* ── Header / toggle ───────────────────────────────── */}
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          gap: 8, padding: '9px 14px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{
          width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0,
          boxShadow: isActive ? `0 0 6px ${dotColor}` : 'none',
          animation: callState === 'incoming' ? 'sp-blink 0.9s step-end infinite' : 'none',
        }} />
        <span style={{
          flex: 1, fontSize: 11, fontWeight: 700,
          color: isActive ? 'var(--text1)' : 'var(--text2)',
          fontFamily: 'Barlow Condensed, sans-serif',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          {headerLabel}
        </span>
        {callState === 'in-call' && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: 'var(--green)',
            fontFamily: 'JetBrains Mono, monospace',
            background: 'rgba(34,192,122,0.1)', padding: '2px 6px', borderRadius: 4,
          }}>
            {fmt(duration)}
          </span>
        )}
        {open
          ? <ChevronDown size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
          : <ChevronUp   size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />}
      </button>

      {/* ── Expanded body ─────────────────────────────────── */}
      {open && (
        <div style={{ padding: '0 12px 12px' }}>

          {/* ═══════════════════════════════════════════════ */}
          {/* INCOMING CALL                                   */}
          {/* ═══════════════════════════════════════════════ */}
          {callState === 'incoming' && (
            <div style={{ textAlign: 'center', paddingBottom: 4 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'rgba(34,192,122,0.12)', border: '2px solid rgba(34,192,122,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '4px auto 10px', animation: 'sp-ring 1.4s ease-in-out infinite',
              }}>
                <PhoneIncoming size={22} style={{ color: 'var(--green)' }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Incoming Call</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>
                {activeName && activeName !== activeNumber ? activeName : fmtPhone(activeNumber)}
              </div>
              {activeName && activeName !== activeNumber && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1, marginBottom: 10 }}>
                  {fmtPhone(activeNumber)}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={decline} style={{ ...btn, flex: 1, background: 'rgba(242,90,90,0.12)', border: '1px solid rgba(242,90,90,0.3)', color: 'var(--red)' }}>
                  <PhoneOff size={14} /> Decline
                </button>
                <button onClick={answer} style={{ ...btn, flex: 1, background: 'var(--green)', color: '#000' }}>
                  <Phone size={14} /> Answer
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* CONNECTING / RINGING                            */}
          {/* ═══════════════════════════════════════════════ */}
          {(callState === 'connecting' || callState === 'ringing') && (
            <div style={{ textAlign: 'center', paddingBottom: 4 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'rgba(79,127,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '4px auto 10px',
              }}>
                <PhoneCall size={22} style={{ color: 'var(--accent)', animation: 'sp-pulse 1s ease-in-out infinite' }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>
                {callState === 'connecting' ? 'Connecting...' : 'Ringing...'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>
                {activeName || fmtPhone(activeNumber)}
              </div>
              <button onClick={hangUp} style={{ ...btn, width: '100%', background: 'var(--red)', color: '#fff' }}>
                <PhoneOff size={14} /> Cancel
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* IN CALL — controls + notes                      */}
          {/* ═══════════════════════════════════════════════ */}
          {callState === 'in-call' && !showTransfer && (
            <div>
              {/* Contact + timer */}
              <div style={{ textAlign: 'center', padding: '4px 0 10px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 1 }}>
                  {activeName && activeName !== activeNumber ? activeName : fmtPhone(activeNumber)}
                </div>
                {activeName && activeName !== activeNumber && (
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtPhone(activeNumber)}</div>
                )}
                <div style={{
                  fontSize: 26, fontWeight: 700, marginTop: 4,
                  color: isOnHold ? 'var(--amber)' : 'var(--green)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {fmt(duration)}
                </div>
                {isOnHold && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', letterSpacing: '0.1em' }}>
                    ON HOLD
                  </div>
                )}
              </div>

              {/* Transfer success toast */}
              {transferDone && (
                <div style={{
                  marginBottom: 8, padding: '7px 10px', borderRadius: 7,
                  background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.25)',
                  color: 'var(--green)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <Check size={12} /> Transfer initiated
                </div>
              )}

              {/* DTMF keypad */}
              {showKeypad && (
                <div style={{ marginBottom: 8 }}>
                  {DIGIT_ROWS.map((row, ri) => (
                    <div key={ri} style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
                      {row.map(d => (
                        <button key={d} onClick={() => pressDigit(d)} style={digitBtn}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
                          {d}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Row 1: Mute + Keypad */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <button onClick={toggleMute} style={{
                  ...btn, flex: 1,
                  background: isMuted ? 'rgba(245,158,11,0.12)' : 'var(--surface2)',
                  border: `1px solid ${isMuted ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
                  color: isMuted ? 'var(--amber)' : 'var(--text2)',
                }}>
                  {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
                  {isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button onClick={() => setShowKeypad(p => !p)} style={{
                  ...btn, flex: 1,
                  background: showKeypad ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                  border: `1px solid ${showKeypad ? 'rgba(79,127,255,0.3)' : 'var(--border)'}`,
                  color: showKeypad ? 'var(--accent)' : 'var(--text2)',
                }}>
                  <Hash size={13} /> Keypad
                </button>
              </div>

              {/* Row 2: Hold + Transfer + SMS */}
              <div style={{ display: 'flex', gap: 6, marginBottom: showSms ? 0 : 8 }}>
                <button onClick={toggleHold} style={{
                  ...btn, flex: 1,
                  background: isOnHold ? 'rgba(245,158,11,0.12)' : 'var(--surface2)',
                  border: `1px solid ${isOnHold ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
                  color: isOnHold ? 'var(--amber)' : 'var(--text2)',
                }}>
                  {isOnHold ? <PlayCircle size={13} /> : <PauseCircle size={13} />}
                  {isOnHold ? 'Resume' : 'Hold'}
                </button>
                <button onClick={openTransfer} style={{
                  ...btn, flex: 1, background: 'var(--surface2)',
                  border: '1px solid var(--border)', color: 'var(--text2)',
                }}>
                  <ArrowRightLeft size={13} /> Transfer
                </button>
                <button
                  onClick={() => { setShowSms(p => !p); setSmsSent(false) }}
                  style={{
                    ...btn, flex: 1,
                    background: showSms ? 'rgba(34,211,238,0.12)' : 'var(--surface2)',
                    border: `1px solid ${showSms ? 'rgba(34,211,238,0.3)' : 'var(--border)'}`,
                    color: showSms ? 'var(--cyan)' : 'var(--text2)',
                  }}
                >
                  <MessageSquare size={13} /> SMS
                </button>
              </div>

              {/* ── SMS compose panel ──────────────────────── */}
              {showSms && (
                <div style={{
                  margin: '8px 0',
                  padding: '10px',
                  borderRadius: 8,
                  background: 'rgba(34,211,238,0.06)',
                  border: '1px solid rgba(34,211,238,0.2)',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 10, fontWeight: 600, color: 'var(--cyan)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
                  }}>
                    <MessageSquare size={11} />
                    Send SMS to {activeName && activeName !== activeNumber ? activeName : fmtPhone(activeNumber)}
                  </div>

                  {smsSent ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 10px', borderRadius: 7,
                      background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.25)',
                      color: 'var(--green)', fontSize: 12, fontWeight: 600,
                    }}>
                      <Check size={14} /> Message sent!
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={smsText}
                        onChange={e => setSmsText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendSms()
                        }}
                        placeholder="Type a message..."
                        rows={3}
                        autoFocus
                        style={{
                          width: '100%', padding: '7px 9px',
                          background: 'var(--bg)', border: '1px solid var(--border)',
                          borderRadius: 7, color: 'var(--text1)', fontSize: 12,
                          resize: 'none', outline: 'none', fontFamily: 'inherit',
                          lineHeight: 1.5, boxSizing: 'border-box',
                          marginBottom: 6,
                        }}
                      />
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button
                          onClick={() => { setShowSms(false); setSmsText('') }}
                          style={{
                            padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
                            background: 'none', color: 'var(--text3)', fontSize: 11,
                            cursor: 'pointer', fontWeight: 600,
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={sendSms}
                          disabled={!smsText.trim() || smsSending}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 5, padding: '6px 0', borderRadius: 6, border: 'none',
                            background: smsText.trim() && !smsSending ? 'var(--cyan)' : 'var(--surface2)',
                            color: smsText.trim() && !smsSending ? '#000' : 'var(--text3)',
                            fontSize: 12, fontWeight: 700,
                            cursor: smsText.trim() && !smsSending ? 'pointer' : 'not-allowed',
                          }}
                        >
                          <Send size={12} />
                          {smsSending ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 5, textAlign: 'right' }}>
                        {smsText.length}/160 · ⌘↵ to send
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Call notes ─────────────────────────────── */}
              <div style={{ marginBottom: 8 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 10, fontWeight: 600, color: 'var(--text3)',
                  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  <StickyNote size={11} />
                  Call Notes
                  {noteSaved && (
                    <span style={{ color: 'var(--green)', fontWeight: 700, marginLeft: 4 }}>
                      <Check size={10} /> Saved
                    </span>
                  )}
                </div>
                <textarea
                  value={callNote}
                  onChange={e => setCallNote(e.target.value)}
                  placeholder="Jot notes during the call... saved automatically on hang-up."
                  rows={3}
                  style={{
                    width: '100%', padding: '7px 9px',
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 7, color: 'var(--text1)', fontSize: 12,
                    resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                    lineHeight: 1.5,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* End call */}
              <button onClick={hangUp} style={{ ...btn, width: '100%', background: 'var(--red)', color: '#fff' }}>
                <PhoneOff size={13} /> End Call
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* TRANSFER PANEL                                  */}
          {/* ═══════════════════════════════════════════════ */}
          {callState === 'in-call' && showTransfer && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>Transfer Call</span>
                <button onClick={() => setShowTransfer(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 3 }}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 8, lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text2)' }}>Announce</strong> = warm handoff &nbsp;·&nbsp;
                <strong style={{ color: 'var(--text2)' }}>Blind</strong> = direct transfer
              </div>
              {transferError && (
                <div style={{ marginBottom: 8, padding: '6px 8px', borderRadius: 6, background: 'rgba(242,90,90,0.1)', color: 'var(--red)', fontSize: 11 }}>
                  {transferError}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 220, overflowY: 'auto', marginBottom: 8 }}>
                {agents.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, padding: '12px 0' }}>Loading team...</div>
                ) : agents.map(agent => {
                  const name = agent.display_name || agent.profile?.name || agent.cell_number
                  const busy = transferring === agent.id
                  return (
                    <div key={agent.id} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={12} style={{ color: 'var(--text3)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', gap: 5 }}>
                            {agent.department?.name && <span>{agent.department.name}</span>}
                            {agent.extension && <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>ext.{agent.extension}</span>}
                            <span style={{ color: agent.is_available ? 'var(--green)' : 'var(--text3)' }}>
                              {agent.is_available ? '● Available' : '○ Away'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => doTransfer(agent, 'warm')} disabled={!!transferring} style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: 'none', background: busy ? 'rgba(79,127,255,0.3)' : 'rgba(79,127,255,0.15)', color: 'var(--accent)', fontSize: 11, fontWeight: 600, cursor: transferring ? 'wait' : 'pointer' }}>
                          {busy ? 'Transferring...' : 'Announce'}
                        </button>
                        <button onClick={() => doTransfer(agent, 'blind')} disabled={!!transferring} style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: 'none', background: 'var(--surface)', color: 'var(--text2)', fontSize: 11, fontWeight: 600, cursor: transferring ? 'wait' : 'pointer' }}>
                          Blind
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button onClick={hangUp} style={{ ...btn, width: '100%', background: 'var(--red)', color: '#fff' }}>
                <PhoneOff size={13} /> End Call
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* IDLE — dialpad + contact search + recent calls  */}
          {/* ═══════════════════════════════════════════════ */}
          {callState === 'idle' && (
            <div>
              {/* Search / dial input */}
              <div style={{ position: 'relative', marginBottom: 6 }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={13} style={{
                      position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--text3)', pointerEvents: 'none',
                    }} />
                    <input
                      type="tel"
                      value={dialNumber}
                      onChange={e => setDialNumber(e.target.value)}
                      placeholder="Search or dial..."
                      onKeyDown={e => e.key === 'Enter' && handleCall()}
                      style={{
                        width: '100%', padding: '8px 10px 8px 28px',
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 8, color: 'var(--text1)',
                        fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
                        outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  {dialNumber && (
                    <button
                      onClick={() => { setDialNumber(''); setContactResults([]) }}
                      style={{ padding: '8px 9px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <Delete size={14} />
                    </button>
                  )}
                </div>

                {/* Contact search results */}
                {contactResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 3,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 8, overflow: 'hidden',
                    boxShadow: '0 6px 18px rgba(0,0,0,0.3)', zIndex: 10,
                  }}>
                    {contactResults.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleCall(c.contact_phone || '', c.contact_name || undefined)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '8px 12px', textAlign: 'left',
                          background: 'none', border: 'none',
                          borderBottom: '1px solid var(--border)', cursor: 'pointer',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(79,127,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: 'Barlow Condensed, sans-serif' }}>
                          {(c.contact_name || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.contact_name || c.contact_email || 'Unknown'}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                            {c.contact_phone ? fmtPhone(c.contact_phone) : ''}
                          </div>
                        </div>
                        <Phone size={13} style={{ color: 'var(--green)', flexShrink: 0 }} />
                      </button>
                    ))}
                    {searchLoading && (
                      <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>Searching...</div>
                    )}
                  </div>
                )}
              </div>

              {/* Keypad */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
                {DIGIT_ROWS.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', gap: 5 }}>
                    {row.map(d => (
                      <button key={d} onClick={() => pressDigit(d)} style={digitBtn}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
                        {d}
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              {/* Call button */}
              <button
                onClick={() => handleCall()}
                disabled={!dialNumber.trim() || !isReady}
                style={{
                  ...btn, width: '100%', fontSize: 13, marginBottom: 10,
                  background: dialNumber && isReady ? 'var(--green)' : 'var(--surface2)',
                  color: dialNumber && isReady ? '#000' : 'var(--text3)',
                  cursor: dialNumber && isReady ? 'pointer' : 'not-allowed',
                }}
              >
                <Phone size={15} /> Call
              </button>

              {!isReady && (
                <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', marginBottom: 10 }}>
                  Softphone not connected
                </div>
              )}

              {/* Recent calls */}
              {recentCalls.length > 0 && !dialNumber && (
                <div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 10, fontWeight: 600, color: 'var(--text3)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
                  }}>
                    <Clock size={11} /> Recent
                  </div>
                  {recentCalls.map(r => (
                    <button
                      key={r.id}
                      onClick={() => handleCall(r.contact_phone, r.contact_name || undefined)}
                      disabled={!isReady}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '6px 8px', borderRadius: 7,
                        background: 'none', border: 'none', cursor: isReady ? 'pointer' : 'not-allowed',
                        textAlign: 'left', marginBottom: 2,
                      }}
                      onMouseEnter={e => { if (isReady) e.currentTarget.style.background = 'var(--surface2)' }}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                        background: r.direction === 'inbound' ? 'var(--green)' : 'var(--accent)',
                        transform: r.direction === 'inbound' ? 'none' : 'rotate(180deg)',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.contact_name || fmtPhone(r.contact_phone)}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {fmtPhone(r.contact_phone)}
                        </div>
                      </div>
                      <Phone size={12} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      <style>{`
        @keyframes sp-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,192,122,0.5); }
          50% { box-shadow: 0 0 0 10px transparent; }
        }
        @keyframes sp-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes sp-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
