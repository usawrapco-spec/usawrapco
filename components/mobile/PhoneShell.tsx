'use client'

import { Wifi, Battery, Signal } from 'lucide-react'

export default function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: 24,
    }}>
      <div style={{
        width: 375,
        height: 812,
        borderRadius: 40,
        background: 'var(--surface)',
        border: '2px solid var(--border)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Status bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 20px',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text2)',
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>9:41</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Signal size={12} />
            <Wifi size={12} />
            <Battery size={12} />
          </div>
        </div>

        {/* App content */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}>
          {children}
        </div>

        {/* Home indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '6px 0 8px',
          flexShrink: 0,
        }}>
          <div style={{
            width: 134,
            height: 5,
            borderRadius: 3,
            background: 'var(--text3)',
          }} />
        </div>
      </div>
    </div>
  )
}
