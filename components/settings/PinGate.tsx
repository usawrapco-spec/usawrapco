'use client'

import { useState, useEffect, useCallback } from 'react'
import { Lock, Unlock, KeyRound, Eye, EyeOff } from 'lucide-react'

interface Props {
  orgId: string
  sectionKey: string   // unique key per section, e.g. 'commission' | 'overhead' | 'defaults'
  sectionLabel: string
  children: React.ReactNode
}

const SALT = 'usawrapco_pin_v1'

async function hashPin(pin: string, orgId: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`${SALT}:${orgId}:${pin}`)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function PinGate({ orgId, sectionKey, sectionLabel, children }: Props) {
  const storageKey   = `usawrap_pin_${orgId}_${sectionKey}`
  const sessionKey   = `usawrap_unlocked_${orgId}_${sectionKey}`

  const [mode, setMode]           = useState<'locked' | 'set' | 'unlocked'>('locked')
  const [input, setInput]         = useState('')
  const [confirm, setConfirm]     = useState('')
  const [show, setShow]           = useState(false)
  const [error, setError]         = useState('')
  const [pinExists, setPinExists] = useState(false)

  // Check on mount
  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    setPinExists(!!stored)

    // If already unlocked this session
    const session = sessionStorage.getItem(sessionKey)
    if (session === 'true') setMode('unlocked')
  }, [storageKey, sessionKey])

  async function handleSet() {
    setError('')
    if (input.length < 4 || input.length > 6) { setError('PIN must be 4–6 digits'); return }
    if (!/^\d+$/.test(input)) { setError('Digits only'); return }
    if (input !== confirm) { setError('PINs do not match'); return }

    const hash = await hashPin(input, orgId)
    localStorage.setItem(storageKey, hash)
    sessionStorage.setItem(sessionKey, 'true')
    setPinExists(true)
    setMode('unlocked')
    setInput(''); setConfirm('')
  }

  const handleVerify = useCallback(async () => {
    setError('')
    const stored = localStorage.getItem(storageKey)
    if (!stored) { setMode('set'); return }
    const hash = await hashPin(input, orgId)
    if (hash === stored) {
      sessionStorage.setItem(sessionKey, 'true')
      setMode('unlocked')
      setInput('')
    } else {
      setError('Incorrect PIN')
      setInput('')
    }
  }, [input, orgId, storageKey, sessionKey])

  function handleLock() {
    sessionStorage.removeItem(sessionKey)
    setMode('locked')
    setInput('')
  }

  function handleReset() {
    localStorage.removeItem(storageKey)
    sessionStorage.removeItem(sessionKey)
    setPinExists(false)
    setMode('set')
    setInput(''); setConfirm('')
  }

  if (mode === 'unlocked') {
    return (
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 16, justifyContent: 'flex-end',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Section unlocked</span>
          <button onClick={handleLock} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 7, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text3)', fontSize: 11,
            fontWeight: 700, cursor: 'pointer',
          }}>
            <Lock size={12} /> Lock
          </button>
          <button onClick={handleReset} style={{
            padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(242,90,90,0.3)',
            background: 'transparent', color: 'var(--red)', fontSize: 11,
            fontWeight: 700, cursor: 'pointer',
          }}>
            Reset PIN
          </button>
        </div>
        {children}
      </div>
    )
  }

  if (!pinExists || mode === 'set') {
    // Set new PIN
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 32, maxWidth: 380, margin: '0 auto', textAlign: 'center',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', margin: '0 auto 16px',
          background: 'rgba(79,127,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <KeyRound size={22} style={{ color: 'var(--accent)' }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', marginBottom: 6 }}>
          Set Access PIN
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 24, lineHeight: 1.5 }}>
          Protect <strong style={{ color: 'var(--text2)' }}>{sectionLabel}</strong> with a 4–6 digit PIN.
          Anyone with admin access will need it to view or edit these settings.
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, textAlign: 'left' }}>
            New PIN (4–6 digits)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={show ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={6}
              value={input}
              onChange={e => setInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && confirm && handleSet()}
              placeholder="• • • •"
              style={{
                width: '100%', padding: '10px 40px 10px 14px', boxSizing: 'border-box',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text1)', fontSize: 20, letterSpacing: 8,
                textAlign: 'center', outline: 'none', fontFamily: 'JetBrains Mono, monospace',
              }}
            />
            <button onClick={() => setShow(!show)} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex',
            }}>
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, textAlign: 'left' }}>
            Confirm PIN
          </label>
          <input
            type={show ? 'text' : 'password'}
            inputMode="numeric"
            maxLength={6}
            value={confirm}
            onChange={e => setConfirm(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleSet()}
            placeholder="• • • •"
            style={{
              width: '100%', padding: '10px 14px', boxSizing: 'border-box',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text1)', fontSize: 20, letterSpacing: 8,
              textAlign: 'center', outline: 'none', fontFamily: 'JetBrains Mono, monospace',
            }}
          />
        </div>

        {error && (
          <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 14, fontWeight: 600 }}>{error}</div>
        )}

        <button
          onClick={handleSet}
          disabled={!input || !confirm}
          style={{
            width: '100%', padding: '11px', borderRadius: 9, border: 'none',
            background: input && confirm ? 'var(--accent)' : 'var(--surface2)',
            color: input && confirm ? '#fff' : 'var(--text3)',
            fontSize: 13, fontWeight: 700, cursor: input && confirm ? 'pointer' : 'not-allowed',
          }}
        >
          Set PIN &amp; Unlock
        </button>
      </div>
    )
  }

  // Enter PIN to unlock
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 32, maxWidth: 340, margin: '0 auto', textAlign: 'center',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%', margin: '0 auto 16px',
        background: 'rgba(242,90,90,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Lock size={22} style={{ color: 'var(--red)' }} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', marginBottom: 6 }}>
        {sectionLabel} is Locked
      </div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 24 }}>
        Enter your PIN to access this section.
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <input
          type={show ? 'text' : 'password'}
          inputMode="numeric"
          maxLength={6}
          value={input}
          onChange={e => setInput(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && handleVerify()}
          placeholder="Enter PIN"
          autoFocus
          style={{
            width: '100%', padding: '12px 44px 12px 14px', boxSizing: 'border-box',
            background: 'var(--surface2)', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
            borderRadius: 8, color: 'var(--text1)', fontSize: 22, letterSpacing: 10,
            textAlign: 'center', outline: 'none', fontFamily: 'JetBrains Mono, monospace',
          }}
        />
        <button onClick={() => setShow(!show)} style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex',
        }}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12, fontWeight: 600 }}>{error}</div>
      )}

      <button
        onClick={handleVerify}
        disabled={!input}
        style={{
          width: '100%', padding: '11px', borderRadius: 9, border: 'none',
          background: input ? 'var(--accent)' : 'var(--surface2)',
          color: input ? '#fff' : 'var(--text3)',
          fontSize: 13, fontWeight: 700, cursor: input ? 'pointer' : 'not-allowed',
          marginBottom: 12,
        }}
      >
        <Unlock size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
        Unlock
      </button>

      <button onClick={() => { setInput(''); handleReset() }} style={{
        background: 'none', border: 'none', fontSize: 11, color: 'var(--text3)',
        cursor: 'pointer', textDecoration: 'underline',
      }}>
        Forgot PIN? Reset access
      </button>
    </div>
  )
}
