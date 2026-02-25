'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Phone, PhoneOff, PhoneIncoming, PhoneCall,
  Mic, MicOff, Hash, ChevronDown, Delete,
  PauseCircle, PlayCircle, ArrowRightLeft, X, Check, User,
} from 'lucide-react'
import { usePhone } from './PhoneProvider'

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

function fmtPhone(num: string) {
  const d = num.replace(/\D/g, '')
  if (d.length === 11 && d[0] === '1') return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  return num
}

const btnBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 5, borderRadius: 10, cursor: 'pointer', fontWeight: 600,
  fontSize: 12, padding: '9px 0', border: 'none', transition: 'opacity 0.15s',
}

interface PhoneAgent {
  id: string
  display_name: string | null
  cell_number: string
  extension: string | null
  is_available: boolean
  profile: { id: string; name: string; role: string } | null
  department: { id: string; name: string } | null
}

export default function Softphone() {
  const phone = usePhone()
  const [expanded, setExpanded] = useState(false)
  const [dialNumber, setDialNumber] = useState('')
  const [showKeypad, setShowKeypad] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [agents, setAgents] = useState<PhoneAgent[]>([])
  const [transferring, setTransferring] = useState<string | null>(null)
  const [transferDone, setTransferDone] = useState(false)
  const [transferError, setTransferError] = useState('')

  useEffect(() => {
    if (phone?.callState === 'incoming') setExpanded(true)
  }, [phone?.callState])

  useEffect(() => {
    if (phone?.callState === 'idle') {
      setShowTransfer(false)
      setTransferDone(false)
      setTransferError('')
      setTransferring(null)
    }
  }, [phone?.callState])

  const openTransfer = useCallback(async () => {
    setShowTransfer(true)
    setTransferError('')
    setTransferDone(false)
    if (agents.length === 0) {
      const res = await fetch('/api/phone/agents')
      if (res.ok) setAgents(await res.json())
    }
  }, [agents.length])

  const doTransfer = useCallback(async (agent: PhoneAgent, type: 'warm' | 'blind') => {
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

  if (!phone) return null
  const {
    callState, activeNumber, activeName, isMuted, isOnHold, isReady, duration,
    makeCall, hangUp, answer, decline, toggleMute, toggleHold, sendDigit,
  } = phone

  const isActive = callState !== 'idle'

  function pressDigit(d: string) {
    if (callState === 'in-call') sendDigit(d)
    else setDialNumber(p => p + d)
  }

  function handleCall() {
    if (dialNumber.trim() && isReady) { makeCall(dialNumber.trim()); setDialNumber('') }
  }

  const panelStyle: React.CSSProperties = {
    width: 278, background: 'var(--surface)', border: '1px solid #2a2e3a',
    borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', marginBottom: 8,
  }

  const digitBtnStyle: React.CSSProperties = {
    flex: 1, height: 44, borderRadius: 8, background: 'var(--surface2)', border: '1px solid #2a2e3a',
    color: 'var(--text1)', fontSize: 18, fontWeight: 600, cursor: 'pointer', transition: 'background 0.1s',
  }

  return (
    <div style={{ position: 'fixed', bottom: 80, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      {expanded && (
        <div style={panelStyle}>
          {/* Header */}
          <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderBottom: '1px solid #2a2e3a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: isReady ? 'var(--green)' : '#5a6080' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}>
                SOFTPHONE
              </span>
              {isOnHold && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', background: 'var(--amber)22', padding: '1px 6px', borderRadius: 99 }}>ON HOLD</span>}
            </div>
            <button onClick={() => setExpanded(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, borderRadius: 6 }}>
              <ChevronDown size={15} />
            </button>
          </div>

          {/* INCOMING */}
          {callState === 'incoming' && (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#22c07a22', border: '2px solid #22c07a44', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', animation: 'sp-pulse 1.4s ease-in-out infinite' }}>
                <PhoneIncoming size={24} style={{ color: 'var(--green)' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>Incoming Call</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>
                {activeName && activeName !== activeNumber ? activeName : fmtPhone(activeNumber)}
              </div>
              {activeName && activeName !== activeNumber && (
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{fmtPhone(activeNumber)}</div>
              )}
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

          {/* CONNECTING / RINGING */}
          {(callState === 'connecting' || callState === 'ringing') && (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'var(--accent)22', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <PhoneCall size={24} style={{ color: 'var(--accent)' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>
                {callState === 'connecting' ? 'Connecting...' : 'Ringing...'}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text1)', marginBottom: 18 }}>
                {activeName || fmtPhone(activeNumber)}
              </div>
              <button onClick={hangUp} style={{ ...btnBase, width: '100%', background: 'var(--red)', color: '#fff' }}>
                <PhoneOff size={15} /> Cancel
              </button>
            </div>
          )}

          {/* IN CALL — controls */}
          {callState === 'in-call' && !showTransfer && (
            <div style={{ padding: 16 }}>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: isOnHold ? 'var(--amber)' : 'var(--text3)', fontWeight: isOnHold ? 700 : 400, marginBottom: 3 }}>
                  {isOnHold ? 'On Hold' : 'In Call'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>
                  {activeName && activeName !== activeNumber ? activeName : fmtPhone(activeNumber)}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: isOnHold ? 'var(--amber)' : 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {formatDuration(duration)}
                </div>
              </div>

              {transferDone && (
                <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--green)22', border: '1px solid var(--green)44', color: 'var(--green)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Check size={13} /> Transfer initiated — agent is being notified
                </div>
              )}

              {/* Keypad overlay */}
              {showKeypad && (
                <div style={{ marginBottom: 10 }}>
                  {DIGIT_ROWS.map((row, ri) => (
                    <div key={ri} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      {row.map(d => <button key={d} onClick={() => pressDigit(d)} style={{ ...digitBtnStyle, height: 38, fontSize: 16 }}>{d}</button>)}
                    </div>
                  ))}
                </div>
              )}

              {/* Row 1: Mute + Keypad */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button onClick={toggleMute} style={{ ...btnBase, flex: 1, background: isMuted ? '#f59e0b22' : 'var(--surface2)', border: `1px solid ${isMuted ? '#f59e0b44' : '#2a2e3a'}`, color: isMuted ? 'var(--amber)' : 'var(--text2)' }}>
                  {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                  {isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button onClick={() => setShowKeypad(p => !p)} style={{ ...btnBase, flex: 1, background: showKeypad ? 'var(--accent)22' : 'var(--surface2)', border: `1px solid ${showKeypad ? 'var(--accent)44' : '#2a2e3a'}`, color: showKeypad ? 'var(--accent)' : 'var(--text2)' }}>
                  <Hash size={14} /> Keypad
                </button>
              </div>

              {/* Row 2: Hold + Transfer */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button onClick={toggleHold} style={{ ...btnBase, flex: 1, background: isOnHold ? 'var(--amber)22' : 'var(--surface2)', border: `1px solid ${isOnHold ? 'var(--amber)44' : '#2a2e3a'}`, color: isOnHold ? 'var(--amber)' : 'var(--text2)' }}>
                  {isOnHold ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
                  {isOnHold ? 'Resume' : 'Hold'}
                </button>
                <button onClick={openTransfer} style={{ ...btnBase, flex: 1, background: 'var(--surface2)', border: '1px solid #2a2e3a', color: 'var(--text2)' }}>
                  <ArrowRightLeft size={14} /> Transfer
                </button>
              </div>

              <button onClick={hangUp} style={{ ...btnBase, width: '100%', background: 'var(--red)', color: '#fff' }}>
                <PhoneOff size={14} /> End Call
              </button>
            </div>
          )}

          {/* TRANSFER PANEL */}
          {callState === 'in-call' && showTransfer && (
            <div style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>Transfer Call</span>
                <button onClick={() => setShowTransfer(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}>
                  <X size={15} />
                </button>
              </div>

              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>
                <strong style={{ color: 'var(--text2)' }}>Announce</strong> = agent hears who&rsquo;s calling before connecting &nbsp;&bull;&nbsp;
                <strong style={{ color: 'var(--text2)' }}>Blind</strong> = direct transfer
              </div>

              {transferError && (
                <div style={{ marginBottom: 10, padding: '7px 10px', borderRadius: 8, background: 'var(--red)22', color: 'var(--red)', fontSize: 12 }}>
                  {transferError}
                </div>
              )}

              {agents.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '16px 0' }}>Loading team...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                  {agents.map(agent => {
                    const name = agent.display_name || agent.profile?.name || agent.cell_number
                    const busy = transferring === agent.id
                    return (
                      <div key={agent.id} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid #2a2e3a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <User size={13} style={{ color: 'var(--text3)' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                            <div style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {agent.department?.name && <span>{agent.department.name}</span>}
                              {agent.extension && <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>ext.{agent.extension}</span>}
                              <span style={{ color: agent.is_available ? 'var(--green)' : 'var(--text3)' }}>
                                {agent.is_available ? 'Available' : 'Away'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => doTransfer(agent, 'warm')} disabled={!!transferring} style={{ flex: 1, padding: '5px 0', borderRadius: 7, border: 'none', background: busy ? 'var(--accent)55' : 'var(--accent)22', color: 'var(--accent)', fontSize: 11, fontWeight: 600, cursor: transferring ? 'wait' : 'pointer' }}>
                            {busy ? 'Transferring...' : 'Announce'}
                          </button>
                          <button onClick={() => doTransfer(agent, 'blind')} disabled={!!transferring} style={{ flex: 1, padding: '5px 0', borderRadius: 7, border: 'none', background: 'var(--surface)', color: 'var(--text2)', fontSize: 11, fontWeight: 600, cursor: transferring ? 'wait' : 'pointer' }}>
                            Blind
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <button onClick={hangUp} style={{ ...btnBase, width: '100%', background: 'var(--red)', color: '#fff', marginTop: 10 }}>
                <PhoneOff size={14} /> End Call
              </button>
            </div>
          )}

          {/* IDLE DIALPAD */}
          {callState === 'idle' && (
            <div style={{ padding: 14 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <input
                  type="tel"
                  value={dialNumber}
                  onChange={e => setDialNumber(e.target.value)}
                  placeholder="(206) 555-0100"
                  onKeyDown={e => e.key === 'Enter' && handleCall()}
                  style={{ flex: 1, padding: '9px 12px', background: 'var(--surface2)', border: '1px solid #2a2e3a', borderRadius: 10, color: 'var(--text1)', fontSize: 15, fontFamily: 'JetBrains Mono, monospace', outline: 'none', minWidth: 0 }}
                />
                {dialNumber && (
                  <button onClick={() => setDialNumber(p => p.slice(0, -1))} style={{ padding: '9px 12px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid #2a2e3a', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Delete size={15} />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {DIGIT_ROWS.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', gap: 6 }}>
                    {row.map(d => <button key={d} onClick={() => pressDigit(d)} style={digitBtnStyle}>{d}</button>)}
                  </div>
                ))}
              </div>
              <button onClick={handleCall} disabled={!dialNumber.trim() || !isReady} style={{ ...btnBase, width: '100%', fontSize: 14, background: dialNumber && isReady ? 'var(--green)' : 'var(--surface2)', color: dialNumber && isReady ? '#000' : 'var(--text3)', cursor: dialNumber && isReady ? 'pointer' : 'not-allowed' }}>
                <Phone size={16} /> Call
              </button>
              {!isReady && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>Softphone not connected</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setExpanded(p => !p)}
        title="Softphone"
        style={{
          width: 52, height: 52, borderRadius: '50%',
          background: callState === 'in-call' || callState === 'incoming' ? 'var(--green)' : 'var(--surface)',
          border: `2px solid ${isActive ? 'var(--green)' : '#2a2e3a'}`,
          color: callState !== 'idle' ? '#000' : 'var(--text2)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isActive ? '0 0 20px #22c07a44' : '0 2px 12px rgba(0,0,0,0.5)',
          animation: callState === 'incoming' ? 'sp-pulse 1.4s ease-in-out infinite' : 'none',
          position: 'relative', transition: 'all 0.2s',
        }}
      >
        {callState === 'in-call' ? <Phone size={21} /> :
          callState === 'incoming' ? <PhoneIncoming size={21} /> :
            callState !== 'idle' ? <PhoneCall size={21} /> : <Phone size={20} />}

        {isOnHold && callState === 'in-call' && (
          <span style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', background: 'var(--amber)', color: '#000', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 20, whiteSpace: 'nowrap' }}>
            HOLD
          </span>
        )}

        {isReady && callState === 'idle' && (
          <span style={{ position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--surface)' }} />
        )}

        {callState === 'in-call' && !expanded && !isOnHold && (
          <span style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', background: 'var(--green)', color: '#000', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20, fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
            {formatDuration(duration)}
          </span>
        )}
      </button>

      <style>{`
        @keyframes sp-pulse {
          0%, 100% { box-shadow: 0 0 0 0 #22c07a44; }
          50% { box-shadow: 0 0 0 10px transparent; }
        }
      `}</style>
    </div>
  )
}
