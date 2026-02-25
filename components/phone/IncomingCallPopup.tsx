'use client'

import { Phone, PhoneOff, X } from 'lucide-react'
import { usePhone } from './PhoneProvider'

function fmtPhone(num: string | null) {
  if (!num) return 'Unknown'
  const d = num.replace(/\D/g, '')
  if (d.length === 11 && d[0] === '1') return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  return num
}

export default function IncomingCallPopup() {
  const phone = usePhone()

  if (!phone || phone.callState !== 'incoming') return null

  const { activeNumber, activeName, answer, decline } = phone
  const displayName = activeName && activeName !== activeNumber ? activeName : fmtPhone(activeNumber)
  const displayNum = activeName && activeName !== activeNumber ? fmtPhone(activeNumber) : null

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 10000,
      background: 'var(--surface)', border: '1px solid rgba(34,192,122,0.5)',
      borderRadius: 14, padding: 16, width: 300,
      boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(34,192,122,0.15)',
      animation: 'slideInRight 0.2s ease',
    }}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes ringPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34,192,122,0.4); }
          50% { transform: scale(1.08); box-shadow: 0 0 0 10px rgba(34,192,122,0); }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, animation: 'ringPulse 1s ease infinite',
        }}>
          <Phone size={19} style={{ color: '#000' }} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 11, color: 'var(--green)', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2,
          }}>
            Incoming Call
          </div>
          <div style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 15, lineHeight: 1.2 }}>
            {displayName}
          </div>
          {displayNum && (
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              {displayNum}
            </div>
          )}
        </div>

        <button
          onClick={decline}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text3)', padding: 2, flexShrink: 0,
            display: 'flex', alignItems: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          onClick={decline}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: 'rgba(242,90,90,0.15)', color: 'var(--red)',
            fontSize: 13, fontWeight: 600,
          }}
        >
          <PhoneOff size={14} /> Decline
        </button>
        <button
          onClick={answer}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: 'var(--green)', color: '#000',
            fontSize: 13, fontWeight: 700,
          }}
        >
          <Phone size={14} /> Answer
        </button>
      </div>
    </div>
  )
}
