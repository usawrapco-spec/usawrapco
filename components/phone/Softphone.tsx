'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Phone, PhoneOff, PhoneIncoming, PhoneCall, Mic, MicOff,
  Hash, ChevronDown, Delete, Pause, Play, ArrowRightLeft,
  X, UserCheck, Search,
} from 'lucide-react'
import { usePhone } from './PhoneProvider'
import { createClient } from '@/lib/supabase/client'

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
]

function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

const btnBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 5, borderRadius: 10, cursor: 'pointer', fontWeight: 600,
  fontSize: 12, padding: '9px 0', border: 'none', transition: 'opacity 0.15s',
}

interface Teammate {
  id: string
  name: string
  phone: string | null
  role: string
}

export default function Softphone() {
  const phone = usePhone()
  const [expanded, setExpanded] = useState(false)
  const [dialNumber, setDialNumber] = useState('')
  const [showKeypad, setShowKeypad] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferTo, setTransferTo] = useState('')
  const [teammates, setTeammates] = useState<Teammate[]>([])
  const [tmSearch, setTmSearch] = useState('')
  const [transferring, setTransferring] = useState(false)
  const supabase = createClient()

  // Auto-expand on incoming
  useEffect(() => {
    if (phone?.callState === 'incoming') setExpanded(true)
  }, [phone?.callState])

  // Load teammates for transfer
  useEffect(() => {
    if (!showTransfer) return
    supabase
      .from('profiles')
      .select('id, name, phone, role')
      .not('phone', 'is', null)
      .order('name')
      .then(({ data }) => {
        if (data) setTeammates(data)
      })
  }, [showTransfer]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!phone) return null
  const {
    callState, activeNumber, activeName, isMuted, isReady, duration,
    makeCall, hangUp, answer, decline, toggleMute, toggleHold, transferCall, sendDigit,
  } = phone

  const isActive = callState !== 'idle'
  const inCall = callState === 'in-call' || callState === 'on-hold'

  function pressDigit(d: string) {
    if (inCall) sendDigit(d)
    else setDialNumber(p => p + d)
  }

  function handleCall() {
    if (dialNumber.trim() && isReady) {
      makeCall(dialNumber.trim())
      setDialNumber('')
    }
  }

  async function handleTransfer() {
    if (!transferTo.trim()) return
    setTransferring(true)
    await transferCall(transferTo.trim(), 'warm')
    setTransferring(false)
    setShowTransfer(false)
    setTransferTo('')
  }

  const filteredTeammates = teammates.filter(t =>
    !tmSearch || t.name.toLowerCase().includes(tmSearch.toLowerCase())
  )

  const panelStyle: React.CSSProperties = {
    width: 272,
    background: 'var(--surface)',
    border: '1px solid #2a2e3a',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    marginBottom: 8,
  }

  const headerStyle: React.CSSProperties = {
    padding: '10px 14px',
    background: 'var(--surface2)',
    borderBottom: '1px solid #2a2e3a',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }

  const digitBtnStyle: React.CSSProperties = {
    flex: 1, height: 44, borderRadius: 8,
    background: 'var(--surface2)', border: '1px solid #2a2e3a',
    color: 'var(--text1)', fontSize: 18, fontWeight: 600,
    cursor: 'pointer', transition: 'background 0.1s',
  }

  const actionBtn = (active: boolean, activeColor: string): React.CSSProperties => ({
    ...btnBase, flex: 1,
    background: active ? `${activeColor}22` : 'var(--surface2)',
    border: `1px solid ${active ? `${activeColor}44` : '#2a2e3a'}`,
    color: active ? activeColor : 'var(--text2)',
  })

  return (
    <div style={{
      position: 'fixed', bottom: 88, right: 96, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
    }}>
      {/* ── Expanded panel ── */}
      {expanded && (
        <div style={panelStyle}>
          {/* Header */}
          <div style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isReady ? 'var(--green)' : '#5a6080',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text2)',
                fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em',
              }}>
                SOFTPHONE {callState === 'on-hold' ? '· ON HOLD' : ''}
              </span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, borderRadius: 6 }}
            >
              <ChevronDown size={15} />
            </button>
          </div>

          {/* ── INCOMING ── */}
          {callState === 'incoming' && (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{
                width: 58, height: 58, borderRadius: '50%',
                background: '#22c07a22', border: '2px solid #22c07a44',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px', animation: 'sp-pulse 1.4s ease-in-out infinite',
              }}>
                <PhoneIncoming size={24} style={{ color: 'var(--green)' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>Incoming Call</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>
                {activeName && activeName !== activeNumber ? activeName : activeNumber}
              </div>
              {activeName && activeName !== activeNumber && (
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>{activeNumber}</div>
              )}
              <div style={{ height: activeName && activeName !== activeNumber ? 0 : 16 }} />
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={decline} style={{ ...btnBase, flex: 1, background: '#f25a5a22', border: '1px solid #f25a5a44', color: 'var(--red)' }}>
                  <PhoneOff size={15} /> Decline
                </button>
                <button onClick={answer} style={{ ...btnBase, flex: 1, background: 'var(--green)', color: '#000' }}>
                  <Phone size={15} /> Answer
                </button>
              </div>
            </div>
          )}

          {/* ── CONNECTING / RINGING ── */}
          {(callState === 'connecting' || callState === 'ringing') && (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{
                width: 58, height: 58, borderRadius: '50%',
                background: 'var(--accent)22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <PhoneCall size={24} style={{ color: 'var(--accent)' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>
                {callState === 'connecting' ? 'Connecting...' : 'Ringing...'}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text1)', marginBottom: 18 }}>
                {activeName || activeNumber}
              </div>
              <button onClick={hangUp} style={{ ...btnBase, width: '100%', background: 'var(--red)', color: '#fff' }}>
                <PhoneOff size={15} /> Cancel
              </button>
            </div>
          )}

          {/* ── IN CALL / ON HOLD ── */}
          {(callState === 'in-call' || callState === 'on-hold') && !showTransfer && (
            <div style={{ padding: 16 }}>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: callState === 'on-hold' ? 'var(--amber)' : 'var(--text3)', marginBottom: 3, fontWeight: 600 }}>
                  {callState === 'on-hold' ? 'Call On Hold' : 'In Call'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>
                  {activeName && activeName !== activeNumber ? activeName : activeNumber}
                </div>
                <div style={{
                  fontSize: 24, fontWeight: 700,
                  color: callState === 'on-hold' ? 'var(--amber)' : 'var(--green)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {formatDuration(duration)}
                </div>
              </div>

              {/* DTMF keypad overlay */}
              {showKeypad && (
                <div style={{ marginBottom: 10 }}>
                  {DIGIT_ROWS.map((row, ri) => (
                    <div key={ri} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      {row.map(d => (
                        <button key={d} onClick={() => pressDigit(d)} style={{ ...digitBtnStyle, height: 38, fontSize: 16 }}>{d}</button>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Row 1: Mute + Hold + Keypad */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <button onClick={toggleMute} style={actionBtn(isMuted, '#f59e0b')}>
                  {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
                  {isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button onClick={toggleHold} style={actionBtn(callState === 'on-hold', '#f59e0b')}>
                  {callState === 'on-hold' ? <Play size={13} /> : <Pause size={13} />}
                  {callState === 'on-hold' ? 'Resume' : 'Hold'}
                </button>
                <button onClick={() => setShowKeypad(p => !p)} style={actionBtn(showKeypad, 'var(--accent)')}>
                  <Hash size={13} />
                  Keys
                </button>
              </div>

              {/* Row 2: Transfer + End */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setShowTransfer(true)} style={actionBtn(false, 'var(--cyan)')}>
                  <ArrowRightLeft size={13} />
                  Transfer
                </button>
                <button onClick={hangUp} style={{ ...btnBase, flex: 1, background: 'var(--red)', color: '#fff' }}>
                  <PhoneOff size={14} /> End
                </button>
              </div>
            </div>
          )}

          {/* ── TRANSFER PANEL ── */}
          {(callState === 'in-call' || callState === 'on-hold') && showTransfer && (
            <div style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>Warm Transfer</span>
                <button
                  onClick={() => { setShowTransfer(false); setTransferTo(''); setTmSearch('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 2 }}
                >
                  <X size={14} />
                </button>
              </div>

              <input
                type="tel"
                value={transferTo}
                onChange={e => setTransferTo(e.target.value)}
                placeholder="+1 (206) 555-0100"
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  background: 'var(--bg)', border: '1px solid #2a2e3a',
                  color: 'var(--text1)', fontSize: 13,
                  fontFamily: 'JetBrains Mono, monospace', outline: 'none',
                  boxSizing: 'border-box', marginBottom: 8,
                }}
              />

              {/* Team member search */}
              <div style={{ position: 'relative', marginBottom: 6 }}>
                <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input
                  type="text"
                  placeholder="Search teammates..."
                  value={tmSearch}
                  onChange={e => setTmSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '6px 8px 6px 26px', borderRadius: 6,
                    background: 'var(--bg)', border: '1px solid #2a2e3a',
                    color: 'var(--text1)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 8 }}>
                {filteredTeammates.map(tm => (
                  <button
                    key={tm.id}
                    onClick={() => setTransferTo(tm.phone || '')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '6px 8px', borderRadius: 6, textAlign: 'left',
                      background: transferTo === tm.phone ? 'var(--accent)22' : 'none',
                      border: `1px solid ${transferTo === tm.phone ? 'var(--accent)44' : 'transparent'}`,
                      cursor: 'pointer', marginBottom: 2,
                    }}
                  >
                    <UserCheck size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)' }}>{tm.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{tm.phone || 'No phone'}</div>
                    </div>
                  </button>
                ))}
                {filteredTeammates.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', padding: '8px 0', textAlign: 'center' }}>
                    No teammates with phone numbers
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => { setShowTransfer(false); setTransferTo('') }}
                  style={{ ...btnBase, flex: 1, background: 'var(--surface2)', border: '1px solid #2a2e3a', color: 'var(--text2)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={!transferTo.trim() || transferring}
                  style={{
                    ...btnBase, flex: 2,
                    background: transferTo.trim() && !transferring ? 'var(--cyan)' : 'var(--surface2)',
                    color: transferTo.trim() && !transferring ? '#000' : 'var(--text3)',
                  }}
                >
                  <ArrowRightLeft size={13} />
                  {transferring ? 'Transferring...' : 'Transfer'}
                </button>
              </div>
            </div>
          )}

          {/* ── IDLE DIALPAD ── */}
          {callState === 'idle' && (
            <div style={{ padding: 14 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <input
                  type="tel"
                  value={dialNumber}
                  onChange={e => setDialNumber(e.target.value)}
                  placeholder="(206) 555-0100"
                  onKeyDown={e => e.key === 'Enter' && handleCall()}
                  style={{
                    flex: 1, padding: '9px 12px',
                    background: 'var(--surface2)', border: '1px solid #2a2e3a',
                    borderRadius: 10, color: 'var(--text1)', fontSize: 15,
                    fontFamily: 'JetBrains Mono, monospace', outline: 'none', minWidth: 0,
                  }}
                />
                {dialNumber && (
                  <button
                    onClick={() => setDialNumber(p => p.slice(0, -1))}
                    style={{
                      padding: '9px 12px', borderRadius: 10,
                      background: 'var(--surface2)', border: '1px solid #2a2e3a',
                      color: 'var(--text2)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <Delete size={15} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {DIGIT_ROWS.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', gap: 6 }}>
                    {row.map(d => (
                      <button key={d} onClick={() => pressDigit(d)} style={digitBtnStyle}>{d}</button>
                    ))}
                  </div>
                ))}
              </div>

              <button
                onClick={handleCall}
                disabled={!dialNumber.trim() || !isReady}
                style={{
                  ...btnBase, width: '100%', fontSize: 14,
                  background: dialNumber && isReady ? 'var(--green)' : 'var(--surface2)',
                  color: dialNumber && isReady ? '#000' : 'var(--text3)',
                  cursor: dialNumber && isReady ? 'pointer' : 'not-allowed',
                }}
              >
                <Phone size={16} /> Call
              </button>

              {!isReady && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
                  Softphone not connected — check Twilio config
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Floating toggle button ── */}
      <button
        onClick={() => setExpanded(p => !p)}
        title="Softphone"
        style={{
          width: 52, height: 52, borderRadius: '50%',
          background: callState === 'in-call' || callState === 'incoming' ? 'var(--green)' :
            callState === 'on-hold' ? 'var(--amber)' : 'var(--surface)',
          border: `2px solid ${isActive ? (callState === 'on-hold' ? 'var(--amber)' : 'var(--green)') : '#2a2e3a'}`,
          color: isActive ? '#000' : 'var(--text2)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isActive ? '0 0 20px rgba(34,192,122,0.3)' : '0 2px 12px rgba(0,0,0,0.5)',
          animation: callState === 'incoming' ? 'sp-pulse 1.4s ease-in-out infinite' : 'none',
          position: 'relative',
          transition: 'all 0.2s',
        }}
      >
        {callState === 'in-call' ? <Phone size={21} /> :
          callState === 'incoming' ? <PhoneIncoming size={21} /> :
          callState === 'on-hold' ? <Pause size={21} /> :
          callState !== 'idle' ? <PhoneCall size={21} /> :
          <Phone size={20} />}

        {/* Ready dot */}
        {isReady && callState === 'idle' && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--green)', border: '2px solid var(--surface)',
          }} />
        )}

        {/* Timer bubble */}
        {(callState === 'in-call' || callState === 'on-hold') && !expanded && (
          <span style={{
            position: 'absolute', top: -8, left: '50%',
            transform: 'translateX(-50%)',
            background: callState === 'on-hold' ? 'var(--amber)' : 'var(--green)',
            color: '#000',
            fontSize: 10, fontWeight: 700, padding: '2px 6px',
            borderRadius: 20, fontFamily: 'JetBrains Mono, monospace',
            whiteSpace: 'nowrap',
          }}>
            {formatDuration(duration)}
          </span>
        )}
      </button>

      <style>{`
        @keyframes sp-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,192,122,0.4); }
          50% { box-shadow: 0 0 0 10px transparent; }
        }
      `}</style>
    </div>
  )
}
