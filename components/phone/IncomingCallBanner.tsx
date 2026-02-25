'use client'

import { Phone, PhoneOff, PhoneIncoming, User } from 'lucide-react'
import { usePhone } from './PhoneProvider'

export default function IncomingCallBanner() {
  const phone = usePhone()

  if (!phone || phone.callState !== 'incoming') return null

  const { activeNumber, activeName, answer, decline } = phone
  const displayName = activeName && activeName !== activeNumber ? activeName : activeNumber
  const hasName = activeName && activeName !== activeNumber

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10001,
      background: 'linear-gradient(135deg, #0d1f0d 0%, #0a1a0f 100%)',
      borderBottom: '2px solid var(--green)',
      padding: '10px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16,
      boxShadow: '0 4px 32px rgba(34,192,122,0.25)',
      animation: 'banner-in 0.3s cubic-bezier(0.22,1,0.36,1)',
    }}>
      {/* Left: icon + caller info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: 'rgba(34,192,122,0.15)',
          border: '1.5px solid rgba(34,192,122,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          animation: 'banner-ring 1.1s ease-in-out infinite',
        }}>
          <PhoneIncoming size={20} style={{ color: 'var(--green)' }} />
        </div>
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--green)',
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 1,
          }}>
            Incoming Call
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text1)', lineHeight: 1.2 }}>
            {displayName}
          </div>
          {hasName && (
            <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
              {activeNumber}
            </div>
          )}
        </div>
      </div>

      {/* Right: action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button
          onClick={decline}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 18px', borderRadius: 8,
            background: 'rgba(242,90,90,0.12)', border: '1px solid rgba(242,90,90,0.35)',
            color: 'var(--red)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(242,90,90,0.22)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(242,90,90,0.12)' }}
        >
          <PhoneOff size={15} />
          Decline
        </button>
        <button
          onClick={answer}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 22px', borderRadius: 8,
            background: 'var(--green)', border: 'none',
            color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
        >
          <Phone size={15} />
          Answer
        </button>
      </div>

      <style>{`
        @keyframes banner-in {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes banner-ring {
          0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(34,192,122,0.4); }
          40%      { transform: scale(1.08); box-shadow: 0 0 0 8px transparent; }
        }
      `}</style>
    </div>
  )
}
