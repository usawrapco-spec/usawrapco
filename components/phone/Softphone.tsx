'use client'

import { useState, useEffect } from 'react'
import { Phone, PhoneOff, PhoneIncoming, PhoneCall, Mic, MicOff, Hash, ChevronDown, Delete } from 'lucide-react'
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

const btnBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 5, borderRadius: 10, cursor: 'pointer', fontWeight: 600,
  fontSize: 12, padding: '9px 0', border: 'none', transition: 'opacity 0.15s',
}

export default function Softphone() {
  const phone = usePhone()
  const [expanded, setExpanded] = useState(false)
  const [dialNumber, setDialNumber] = useState('')
  const [showKeypad, setShowKeypad] = useState(false)

  // Auto-expand on incoming
  useEffect(() => {
    if (phone?.callState === 'incoming') setExpanded(true)
  }, [phone?.callState])

  if (!phone) return null
  const { callState, activeNumber, activeName, isMuted, isReady, duration,
    makeCall, hangUp, answer, decline, toggleMute, sendDigit } = phone

  const isActive = callState !== 'idle'

  function pressDigit(d: string) {
    if (callState === 'in-call') {
      sendDigit(d)
    } else {
      setDialNumber(p => p + d)
    }
  }

  function handleCall() {
    if (dialNumber.trim() && isReady) {
      makeCall(dialNumber.trim())
      setDialNumber('')
    }
  }

  const panelStyle: React.CSSProperties = {
    width: 268,
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

  return (
    <div style={{
      position: 'fixed', bottom: 80, right: 20, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
    }}>
      {/* Expanded panel */}
      {expanded && (
        <div style={panelStyle}>
          {/* Header */}
          <div style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isReady ? 'var(--green)' : '#5a6080',
              }} />
              <span style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text2)',
                fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em',
              }}>
                SOFTPHONE
              </span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, borderRadius: 6 }}
            >
              <ChevronDown size={15} />
            </button>
          </div>

          {/* ── INCOMING CALL ── */}
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
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={decline} style={{
                  ...btnBase, flex: 1,
                  background: '#f25a5a22', border: '1px solid #f25a5a44', color: 'var(--red)',
                }}>
                  <PhoneOff size={15} /> Decline
                </button>
                <button onClick={answer} style={{
                  ...btnBase, flex: 1,
                  background: 'var(--green)', color: '#000',
                }}>
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

          {/* ── IN CALL ── */}
          {callState === 'in-call' && (
            <div style={{ padding: 16 }}>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>In Call</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>
                  {activeName && activeName !== activeNumber ? activeName : activeNumber}
                </div>
                <div style={{
                  fontSize: 24, fontWeight: 700, color: 'var(--green)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {formatDuration(duration)}
                </div>
              </div>

              {/* Keypad overlay during call */}
              {showKeypad && (
                <div style={{ marginBottom: 10 }}>
                  {DIGIT_ROWS.map((row, ri) => (
                    <div key={ri} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      {row.map(d => (
                        <button key={d} onClick={() => pressDigit(d)} style={{
                          ...digitBtnStyle, height: 38, fontSize: 16,
                        }}>{d}</button>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={toggleMute} style={{
                  ...btnBase, flex: 1,
                  background: isMuted ? '#f59e0b22' : 'var(--surface2)',
                  border: `1px solid ${isMuted ? '#f59e0b44' : '#2a2e3a'}`,
                  color: isMuted ? 'var(--amber)' : 'var(--text2)',
                }}>
                  {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                  {isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button onClick={() => setShowKeypad(p => !p)} style={{
                  ...btnBase, flex: 1,
                  background: showKeypad ? 'var(--accent)22' : 'var(--surface2)',
                  border: `1px solid ${showKeypad ? 'var(--accent)44' : '#2a2e3a'}`,
                  color: showKeypad ? 'var(--accent)' : 'var(--text2)',
                }}>
                  <Hash size={14} /> Keypad
                </button>
                <button onClick={hangUp} style={{
                  ...btnBase, flex: 1,
                  background: 'var(--red)', color: '#fff',
                }}>
                  <PhoneOff size={14} /> End
                </button>
              </div>
            </div>
          )}

          {/* ── IDLE DIALPAD ── */}
          {callState === 'idle' && (
            <div style={{ padding: 14 }}>
              {/* Number input */}
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

              {/* Digit grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {DIGIT_ROWS.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', gap: 6 }}>
                    {row.map(d => (
                      <button key={d} onClick={() => pressDigit(d)} style={digitBtnStyle}>{d}</button>
                    ))}
                  </div>
                ))}
              </div>

              {/* Call button */}
              <button
                onClick={handleCall}
                disabled={!dialNumber.trim() || !isReady}
                style={{
                  ...btnBase, width: '100%', fontSize: 14,
                  background: dialNumber && isReady ? 'var(--green)' : 'var(--surface2)',
                  color: dialNumber && isReady ? '#000' : 'var(--text3)',
                  cursor: dialNumber && isReady ? 'pointer' : 'not-allowed',
                  border: 'none',
                }}
              >
                <Phone size={16} /> Call
              </button>

              {!isReady && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
                  {/* Show nothing if token not configured, show connecting if loading */}
                  Softphone not connected
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setExpanded(p => !p)}
        title="Softphone"
        style={{
          width: 52, height: 52, borderRadius: '50%',
          background: callState === 'in-call' ? 'var(--green)' :
            callState === 'incoming' ? 'var(--green)' : 'var(--surface)',
          border: `2px solid ${isActive ? 'var(--green)' : '#2a2e3a'}`,
          color: callState !== 'idle' ? '#000' : 'var(--text2)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isActive ? '0 0 20px #22c07a44' : '0 2px 12px rgba(0,0,0,0.5)',
          animation: callState === 'incoming' ? 'sp-pulse 1.4s ease-in-out infinite' : 'none',
          position: 'relative',
          transition: 'all 0.2s',
        }}
      >
        {callState === 'in-call' ? <Phone size={21} /> :
          callState === 'incoming' ? <PhoneIncoming size={21} /> :
            callState !== 'idle' ? <PhoneCall size={21} /> :
              <Phone size={20} />}

        {/* Ready indicator dot */}
        {isReady && callState === 'idle' && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--green)', border: '2px solid var(--surface)',
          }} />
        )}

        {/* In-call timer bubble */}
        {callState === 'in-call' && !expanded && (
          <span style={{
            position: 'absolute', top: -8, left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--green)', color: '#000',
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
          0%, 100% { box-shadow: 0 0 0 0 #22c07a44; }
          50% { box-shadow: 0 0 0 10px transparent; }
        }
      `}</style>
    </div>
  )
}
