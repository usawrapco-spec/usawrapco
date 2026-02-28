'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Phone, PhoneOff, Mic, MicOff, Pause, Play, X,
  User, Briefcase, DollarSign, Loader2, Grid3X3,
  ChevronUp, ChevronDown, ExternalLink, Volume2,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type CallStatus = 'idle' | 'connecting' | 'ringing' | 'connected' | 'disconnected'

interface RecognizedCustomer {
  id: string
  name: string
  phone: string | null
  email: string | null
  company_name: string | null
  last_job: { id: string; title: string; pipe_stage: string } | null
  balance: number
}

// ── Twilio Device (lazy import) ──────────────────────────────────────────────

let TwilioDevice: any = null
let TwilioCall: any = null

try {
  const voiceSdk = require('@twilio/voice-sdk')
  TwilioDevice = voiceSdk.Device
  TwilioCall = voiceSdk.Call
} catch {
  // SDK not installed -- widget will work in demo/placeholder mode
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

const DIALPAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
]

// ═════════════════════════════════════════════════════════════════════════════
// ── CallWidget ──────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

export default function CallWidget({
  profile,
  onClose,
}: {
  profile: Profile
  onClose: () => void
}) {
  const router = useRouter()
  const supabase = createClient()

  // ── State ──────────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<CallStatus>('idle')
  const [muted, setMuted] = useState(false)
  const [held, setHeld] = useState(false)
  const [duration, setDuration] = useState(0)
  const [callerId, setCallerId] = useState('')
  const [showDialpad, setShowDialpad] = useState(false)
  const [dialpadInput, setDialpadInput] = useState('')
  const [customer, setCustomer] = useState<RecognizedCustomer | null>(null)
  const [loadingCustomer, setLoadingCustomer] = useState(false)
  const [minimized, setMinimized] = useState(false)

  const deviceRef = useRef<any>(null)
  const callRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status])

  // ── Initialize Twilio Device ───────────────────────────────────────────────
  useEffect(() => {
    if (!TwilioDevice) return

    async function initDevice() {
      try {
        const res = await fetch('/api/twilio/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identity: profile.id }),
        })
        const data = await res.json()
        if (!data.token) return

        const device = new TwilioDevice(data.token, {
          codecPreferences: ['opus', 'pcmu'],
          logLevel: 'warn',
        })

        device.on('registered', () => {
          setStatus('idle')
        })

        device.on('incoming', (call: any) => {
          setStatus('ringing')
          setCallerId(call.parameters?.From || 'Unknown')
          callRef.current = call
          lookupCustomer(call.parameters?.From || '')

          call.on('accept', () => {
            setStatus('connected')
            setDuration(0)
          })
          call.on('disconnect', () => {
            setStatus('disconnected')
            callRef.current = null
          })
          call.on('cancel', () => {
            setStatus('idle')
            callRef.current = null
          })

          // Auto-accept for now (or could show accept/reject UI)
          call.accept()
        })

        device.on('error', (err: any) => {
          console.error('Twilio Device error:', err)
        })

        await device.register()
        deviceRef.current = device
      } catch (err) {
        console.error('Failed to initialize Twilio device:', err)
      }
    }

    initDevice()

    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy()
        deviceRef.current = null
      }
    }
  }, [profile.id])

  // ── Lookup customer by phone ───────────────────────────────────────────────
  const lookupCustomer = async (phone: string) => {
    if (!phone) return
    setLoadingCustomer(true)

    try {
      // Clean phone number
      const cleaned = phone.replace(/\D/g, '').slice(-10)

      const { data: cust } = await supabase
        .from('customers')
        .select('id, name, phone, email, company_name')
        .or(`phone.ilike.%${cleaned}%`)
        .eq('org_id', profile.org_id)
        .limit(1)
        .single()

      if (cust) {
        // Get last job
        const { data: jobs } = await supabase
          .from('projects')
          .select('id, title, pipe_stage')
          .eq('customer_id', cust.id)
          .order('created_at', { ascending: false })
          .limit(1)

        // Get balance (unpaid invoices)
        const { data: invoices } = await supabase
          .from('invoices')
          .select('balance_due')
          .eq('customer_id', cust.id)
          .in('status', ['open', 'sent', 'partial', 'overdue'])

        const totalBalance = (invoices || []).reduce((sum: number, inv: any) => sum + (inv.balance_due || 0), 0)

        setCustomer({
          id: cust.id,
          name: cust.name,
          phone: cust.phone,
          email: cust.email,
          company_name: cust.company_name,
          last_job: jobs && jobs.length > 0 ? jobs[0] : null,
          balance: totalBalance,
        })
      }
    } catch (err) {
      console.error('Customer lookup failed:', err)
    }
    setLoadingCustomer(false)
  }

  // ── Call actions ───────────────────────────────────────────────────────────
  const makeCall = async (number: string) => {
    if (!deviceRef.current || status !== 'idle') return
    setStatus('connecting')
    setCallerId(number)
    lookupCustomer(number)

    try {
      const call = await deviceRef.current.connect({
        params: { To: number },
      })
      callRef.current = call

      call.on('ringing', () => setStatus('ringing'))
      call.on('accept', () => {
        setStatus('connected')
        setDuration(0)
      })
      call.on('disconnect', () => {
        setStatus('disconnected')
        callRef.current = null
      })
      call.on('error', () => {
        setStatus('disconnected')
        callRef.current = null
      })
    } catch (err) {
      console.error('Failed to make call:', err)
      setStatus('idle')
    }
  }

  const hangUp = () => {
    if (callRef.current) {
      callRef.current.disconnect()
    }
    setStatus('disconnected')
    callRef.current = null
  }

  const toggleMute = () => {
    if (callRef.current) {
      callRef.current.mute(!muted)
    }
    setMuted(!muted)
  }

  const toggleHold = () => {
    // Twilio doesn't have native hold; this is a UI indication
    // In production, you'd use a TwiML <Enqueue> or conference hold
    setHeld(!held)
    if (callRef.current) {
      callRef.current.mute(!held)
    }
  }

  const sendDtmf = (digit: string) => {
    if (callRef.current) {
      callRef.current.sendDigits(digit)
    }
    setDialpadInput(prev => prev + digit)
  }

  // ── Status indicator ───────────────────────────────────────────────────────
  const statusConfig: Record<CallStatus, { label: string; color: string; pulse: boolean }> = {
    idle:         { label: 'Ready',         color: 'var(--text3)',  pulse: false },
    connecting:   { label: 'Connecting...',  color: 'var(--amber)',  pulse: true },
    ringing:      { label: 'Ringing...',     color: 'var(--amber)',  pulse: true },
    connected:    { label: 'Connected',      color: 'var(--green)',  pulse: false },
    disconnected: { label: 'Disconnected',   color: 'var(--red)',    pulse: false },
  }

  const currentStatus = statusConfig[status]

  // ── Only show when in a call state (not idle) ──────────────────────────────
  if (status === 'idle') return null

  // ── Minimized view ─────────────────────────────────────────────────────────
  if (minimized) {
    return (
      <div style={{
        position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 16px', borderRadius: 20,
        background: 'var(--surface)', border: '1px solid var(--border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        {/* Status dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: currentStatus.color,
          animation: currentStatus.pulse ? 'pulse 1.5s infinite' : 'none',
        }} />

        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)' }}>
          {customer?.name || callerId || 'Call'}
        </span>

        {status === 'connected' && (
          <span style={{
            fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--green)', fontWeight: 700,
          }}>
            {formatDuration(duration)}
          </span>
        )}

        <button
          onClick={() => setMinimized(false)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text3)', display: 'flex', padding: 2,
          }}
        >
          <ChevronDown size={14} />
        </button>

        <button
          onClick={hangUp}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--red)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <PhoneOff size={12} color="#fff" />
        </button>
      </div>
    )
  }

  // ── Full widget ────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, width: 360,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: status === 'connected' ? 'rgba(34,192,122,0.08)' :
                    status === 'ringing' || status === 'connecting' ? 'rgba(245,158,11,0.08)' :
                    'rgba(242,90,90,0.08)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Status indicator */}
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: currentStatus.color,
            animation: currentStatus.pulse ? 'pulse 1.5s infinite' : 'none',
          }} />
          <span style={{
            fontSize: 12, fontWeight: 700, color: currentStatus.color,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {currentStatus.label}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setMinimized(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text3)', display: 'flex', padding: 4,
            }}
            title="Minimize"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text3)', display: 'flex', padding: 4,
            }}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Caller Info */}
      <div style={{ padding: '16px', textAlign: 'center' }}>
        {/* Avatar */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%', margin: '0 auto 10px',
          background: customer ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
          border: `2px solid ${customer ? 'var(--accent)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {loadingCustomer ? (
            <Loader2 size={20} color="var(--text3)" className="animate-spin" />
          ) : customer ? (
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>
              {customer.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </span>
          ) : (
            <User size={22} color="var(--text3)" />
          )}
        </div>

        {/* Name / Number */}
        <div style={{
          fontSize: 16, fontWeight: 700, color: 'var(--text1)',
          fontFamily: 'Barlow Condensed, sans-serif',
        }}>
          {customer?.name || 'Unknown Caller'}
        </div>
        {customer?.company_name && (
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            {customer.company_name}
          </div>
        )}
        <div style={{
          fontSize: 13, color: 'var(--text3)',
          fontFamily: 'JetBrains Mono, monospace', marginTop: 4,
        }}>
          {callerId || 'No caller ID'}
        </div>

        {/* Duration */}
        {status === 'connected' && (
          <div style={{
            fontSize: 24, fontWeight: 700, color: 'var(--green)',
            fontFamily: 'JetBrains Mono, monospace', marginTop: 8,
          }}>
            {formatDuration(duration)}
          </div>
        )}
      </div>

      {/* Customer context (if recognized) */}
      {customer && (
        <div style={{
          padding: '0 16px 12px',
          display: 'flex', gap: 8,
        }}>
          {/* Last job */}
          {customer.last_job && (
            <div style={{
              flex: 1, padding: '8px 10px', borderRadius: 8,
              background: 'rgba(79,127,255,0.06)',
              border: '1px solid rgba(79,127,255,0.12)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 9, fontWeight: 700, color: 'var(--accent)',
                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3,
              }}>
                <Briefcase size={9} />
                Last Job
              </div>
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text1)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {customer.last_job.title}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                {customer.last_job.pipe_stage.replace('_', ' ')}
              </div>
            </div>
          )}

          {/* Balance */}
          <div style={{
            flex: 1, padding: '8px 10px', borderRadius: 8,
            background: customer.balance > 0 ? 'rgba(242,90,90,0.06)' : 'rgba(34,192,122,0.06)',
            border: `1px solid ${customer.balance > 0 ? 'rgba(242,90,90,0.12)' : 'rgba(34,192,122,0.12)'}`,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 9, fontWeight: 700,
              color: customer.balance > 0 ? 'var(--red)' : 'var(--green)',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3,
            }}>
              <DollarSign size={9} />
              Balance
            </div>
            <div style={{
              fontSize: 14, fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
              color: customer.balance > 0 ? 'var(--red)' : 'var(--green)',
            }}>
              ${customer.balance.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Open customer record link */}
      {customer && (
        <div style={{
          padding: '0 16px 12px', textAlign: 'center',
        }}>
          <button
            onClick={() => router.push(`/customers/${customer.id}`)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 12px', borderRadius: 6,
              background: 'rgba(79,127,255,0.08)',
              border: '1px solid rgba(79,127,255,0.15)',
              color: 'var(--accent)', fontSize: 11, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <ExternalLink size={11} />
            Open Customer Record
          </button>
        </div>
      )}

      {/* Dialpad */}
      {showDialpad && (
        <div style={{
          padding: '0 16px 12px',
        }}>
          {/* Dialpad input display */}
          <div style={{
            textAlign: 'center', marginBottom: 8,
            fontSize: 16, fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 600, color: 'var(--text1)',
            minHeight: 24,
          }}>
            {dialpadInput}
          </div>

          {/* Dialpad grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 6, maxWidth: 200, margin: '0 auto',
          }}>
            {DIALPAD_KEYS.flat().map(key => (
              <button
                key={key}
                onClick={() => sendDtmf(key)}
                style={{
                  width: '100%', aspectRatio: '1.4', borderRadius: 10,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text1)', fontSize: 18, fontWeight: 600,
                  fontFamily: 'JetBrains Mono, monospace',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,127,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface2)'}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{
        padding: '12px 16px 16px',
        display: 'flex', justifyContent: 'center', gap: 12,
        borderTop: '1px solid var(--border)',
      }}>
        {/* Mute */}
        <button
          onClick={toggleMute}
          disabled={status !== 'connected'}
          title={muted ? 'Unmute' : 'Mute'}
          style={{
            width: 48, height: 48, borderRadius: '50%',
            background: muted ? 'rgba(242,90,90,0.15)' : 'var(--surface2)',
            border: `1px solid ${muted ? 'var(--red)' : 'var(--border)'}`,
            cursor: status === 'connected' ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: status === 'connected' ? 1 : 0.4,
            transition: 'all 0.15s',
          }}
        >
          {muted ? (
            <MicOff size={18} color="var(--red)" />
          ) : (
            <Mic size={18} color="var(--text2)" />
          )}
        </button>

        {/* Hold */}
        <button
          onClick={toggleHold}
          disabled={status !== 'connected'}
          title={held ? 'Resume' : 'Hold'}
          style={{
            width: 48, height: 48, borderRadius: '50%',
            background: held ? 'rgba(245,158,11,0.15)' : 'var(--surface2)',
            border: `1px solid ${held ? 'var(--amber)' : 'var(--border)'}`,
            cursor: status === 'connected' ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: status === 'connected' ? 1 : 0.4,
            transition: 'all 0.15s',
          }}
        >
          {held ? (
            <Play size={18} color="var(--amber)" />
          ) : (
            <Pause size={18} color="var(--text2)" />
          )}
        </button>

        {/* Dialpad toggle */}
        <button
          onClick={() => setShowDialpad(!showDialpad)}
          title="Dialpad"
          style={{
            width: 48, height: 48, borderRadius: '50%',
            background: showDialpad ? 'rgba(79,127,255,0.15)' : 'var(--surface2)',
            border: `1px solid ${showDialpad ? 'var(--accent)' : 'var(--border)'}`,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >
          <Grid3X3 size={18} color={showDialpad ? 'var(--accent)' : 'var(--text2)'} />
        </button>

        {/* Hang Up */}
        <button
          onClick={hangUp}
          title="Hang Up"
          style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--red)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(242,90,90,0.4)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(242,90,90,0.5)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(242,90,90,0.4)'}
        >
          <PhoneOff size={20} color="#fff" />
        </button>
      </div>

      {/* Pulse animation (injected once) */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
