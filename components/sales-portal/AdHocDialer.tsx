'use client'

import Link from 'next/link'
import { Phone, Users, ChevronRight, Upload } from 'lucide-react'

const C = {
  bg: '#0d0f14', surface: '#13151c', surface2: '#1a1d27', border: '#2a2f3d',
  accent: '#4f7fff', green: '#22c07a', red: '#f25a5a', cyan: '#22d3ee',
  amber: '#f59e0b', text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
}

interface ListItem {
  id: string; name: string; total_count: number; called_count: number
}

export default function AdHocDialer({ lists }: { lists: ListItem[] }) {
  return (
    <div style={{ padding: '20px 16px' }}>
      <h1 style={{
        fontSize: 22, fontWeight: 700, color: C.text1, margin: '0 0 8px',
        fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)',
      }}>
        Power Dialer
      </h1>
      <p style={{ fontSize: 13, color: C.text3, margin: '0 0 24px' }}>
        Pick a list to start power dialing through leads
      </p>

      {lists.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.text3 }}>
          <Phone size={40} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 16, color: C.text2, marginBottom: 8, fontWeight: 600 }}>No active lists</div>
          <div style={{ fontSize: 13, marginBottom: 24 }}>Upload a lead list to start power dialing</div>
          <Link href="/sales-portal/leads" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 10,
            background: C.accent, color: '#fff',
            fontSize: 14, fontWeight: 700, textDecoration: 'none',
          }}>
            <Upload size={16} /> Upload List
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lists.map(l => {
            const remaining = l.total_count - l.called_count
            return (
              <Link key={l.id} href={`/sales-portal/leads/${l.id}/dialer`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 12, padding: '18px 20px',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: `${C.green}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Phone size={20} color={C.green} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text1 }}>{l.name}</div>
                    <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>
                      {remaining} leads remaining
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 14px', borderRadius: 8,
                    background: `${C.green}15`, border: `1px solid ${C.green}30`,
                    color: C.green, fontSize: 13, fontWeight: 700,
                  }}>
                    Start
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
