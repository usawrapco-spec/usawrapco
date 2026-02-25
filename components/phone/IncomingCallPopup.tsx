'use client'

import { useState, useEffect } from 'react'
import { Phone, X } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface LiveCall {
  id: string
  from_number: string | null
  caller_name: string | null
  status: string
  started_at: string
  department?: { name: string } | null
}

export default function IncomingCallPopup() {
  const supabase = createClient()
  const [call, setCall] = useState<LiveCall | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel('incoming_call_popup')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'call_logs', filter: 'direction=eq.inbound' },
        (payload) => {
          const newCall = payload.new as LiveCall
          if (['initiated', 'ringing'].includes(newCall.status)) {
            setCall(newCall)
            // Auto-dismiss after 30 seconds
            setTimeout(() => setCall(c => c?.id === newCall.id ? null : c), 30000)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (!call) return null

  function fmtPhone(num: string | null) {
    if (!num) return 'Unknown'
    const d = num.replace(/\D/g, '')
    if (d.length === 11 && d[0] === '1') return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
    return num
  }

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      background: 'var(--surface)', border: '1px solid var(--green)',
      borderRadius: 14, padding: 16, width: 300,
      boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
      animation: 'slideInRight 0.2s ease',
    }}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes ringPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34,192,122,0.4); }
          50% { transform: scale(1.08); box-shadow: 0 0 0 10px rgba(34,192,122,0); }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          animation: 'ringPulse 1s ease infinite',
        }}>
          <Phone size={18} style={{ color: '#fff' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            Incoming Call
          </div>
          <div style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 15, lineHeight: 1.2 }}>
            {call.caller_name || fmtPhone(call.from_number)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            {fmtPhone(call.from_number)}
            {call.department?.name && <span> &rarr; {call.department.name}</span>}
          </div>
        </div>
        <button
          onClick={() => setCall(null)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, flexShrink: 0 }}
        >
          <X size={16} />
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Link
          href="/phone"
          onClick={() => setCall(null)}
          style={{ flex: 1, textAlign: 'center', background: 'var(--green)', color: '#fff', borderRadius: 8, padding: '7px 0', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
        >
          View Call
        </Link>
        <button
          onClick={() => setCall(null)}
          style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--surface2)', border: 'none', color: 'var(--text2)', fontSize: 12, cursor: 'pointer' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
