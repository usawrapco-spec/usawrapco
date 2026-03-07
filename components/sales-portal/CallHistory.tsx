'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Clock, Star, Zap, Search, ChevronRight,
} from 'lucide-react'
import { C } from '@/lib/portal-theme'

interface Call {
  id: string; direction: string; status: string
  caller_name: string | null; caller_number: string | null
  duration_seconds: number | null; recording_url: string | null
  created_at: string; analysis_status: string | null
  analysis: { score: number; sentiment: string; summary: string } | null
}

const fmtDuration = (s: number | null) => {
  if (!s) return '0:00'
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const scoreColor = (score: number) =>
  score >= 80 ? C.green : score >= 60 ? C.amber : score >= 40 ? C.accent : C.red

export default function CallHistory({ calls }: { calls: Call[] }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'analyzed' | 'unanalyzed'>('all')

  const filtered = calls.filter(c => {
    if (filter === 'analyzed' && !c.analysis) return false
    if (filter === 'unanalyzed' && c.analysis) return false
    if (!search) return true
    const q = search.toLowerCase()
    return c.caller_name?.toLowerCase().includes(q) || c.caller_number?.includes(q)
  })

  const avgScore = calls.filter(c => c.analysis).length > 0
    ? Math.round(calls.filter(c => c.analysis).reduce((s, c) => s + (c.analysis?.score || 0), 0) / calls.filter(c => c.analysis).length)
    : null

  return (
    <div style={{ padding: '20px 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text1, margin: '0 0 4px', fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
        Call History
      </h1>
      <p style={{ fontSize: 13, color: C.text3, margin: '0 0 16px' }}>
        Review calls and AI coaching feedback
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text1, fontFamily: 'JetBrains Mono, monospace' }}>
            {calls.length}
          </div>
          <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase' }}>Total Calls</div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text1, fontFamily: 'JetBrains Mono, monospace' }}>
            {calls.filter(c => c.analysis).length}
          </div>
          <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase' }}>Analyzed</div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
          <div style={{
            fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
            color: avgScore ? scoreColor(avgScore) : C.text3,
          }}>
            {avgScore ?? '—'}
          </div>
          <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase' }}>Avg Score</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} color={C.text3} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            style={{
              width: '100%', padding: '10px 14px 10px 34px', boxSizing: 'border-box',
              background: C.surface2, border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.text1, fontSize: 13, outline: 'none',
            }}
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['all', 'analyzed', 'unanalyzed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: filter === f ? `${C.accent}20` : C.surface2,
              border: `1px solid ${filter === f ? C.accent : C.border}`,
              color: filter === f ? C.accent : C.text3, cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Call List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map(call => {
          const isOut = call.direction === 'outbound'
          const isMissed = call.status === 'missed' || call.status === 'no-answer'
          const Icon = isMissed ? PhoneMissed : isOut ? PhoneOutgoing : PhoneIncoming
          const iconColor = isMissed ? C.red : isOut ? C.accent : C.green

          return (
            <Link
              key={call.id}
              href={`/sales-portal/calls/${call.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <Icon size={16} color={iconColor} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>
                    {call.caller_name || call.caller_number || 'Unknown'}
                  </div>
                  <div style={{ fontSize: 11, color: C.text3, display: 'flex', gap: 8, marginTop: 2 }}>
                    <span>{fmtDuration(call.duration_seconds)}</span>
                    <span>{new Date(call.created_at).toLocaleDateString()}</span>
                    {call.analysis && (
                      <span style={{ color: scoreColor(call.analysis.score), fontWeight: 700 }}>
                        {call.analysis.score}/100
                      </span>
                    )}
                  </div>
                </div>
                {call.analysis ? (
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: `${scoreColor(call.analysis.score)}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Star size={14} color={scoreColor(call.analysis.score)} />
                  </div>
                ) : call.analysis_status !== 'complete' ? (
                  <div style={{
                    padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    background: `${C.amber}15`, color: C.amber,
                  }}>
                    Needs Review
                  </div>
                ) : null}
                <ChevronRight size={14} color={C.text3} />
              </div>
            </Link>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: C.text3, fontSize: 13 }}>
            No calls found
          </div>
        )}
      </div>
    </div>
  )
}
