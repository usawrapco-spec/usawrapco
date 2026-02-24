'use client'

import type { Prospect } from './ProspectorApp'
import { X, TrendingUp, Users, Phone, FileText, Award, MapPin } from 'lucide-react'

interface Props {
  prospects: Prospect[]
  onClose: () => void
}

export function StatsPanel({ prospects, onClose }: Props) {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const thisWeek = prospects.filter(p => new Date(p.created_at) > weekAgo)
  const contacted = prospects.filter(p => p.status !== 'uncontacted')
  const won = prospects.filter(p => p.status === 'won')
  const quoted = prospects.filter(p => p.status === 'quoted')
  const interested = prospects.filter(p => p.status === 'interested')
  const contactedWeek = prospects.filter(p => p.last_contacted_at && new Date(p.last_contacted_at) > weekAgo)

  const conversionRate = contacted.length > 0 ? ((won.length / contacted.length) * 100).toFixed(1) : '0'

  // Best business type
  const typeCounts: Record<string, number> = {}
  won.forEach(p => {
    const t = p.business_type || 'Unknown'
    typeCounts[t] = (typeCounts[t] || 0) + 1
  })
  const bestType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

  // Uncontacted by priority
  const hotUncontacted = prospects.filter(p => p.status === 'uncontacted' && p.priority === 'hot').length

  return (
    <div style={{
      position: 'absolute', top: 74, left: '50%', transform: 'translateX(-50%)', zIndex: 12,
      background: 'rgba(19,21,28,0.95)', backdropFilter: 'blur(20px)', borderRadius: 16,
      border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      padding: 20, maxWidth: 680, width: 'calc(100vw - 40px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={18} style={{ color: 'var(--accent)' }} /> Prospecting Stats
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}><X size={16} /></button>
      </div>

      {/* This Week */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>This Week</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
          <StatCard label="Prospects Added" value={String(thisWeek.length)} color="#4f7fff" />
          <StatCard label="Contacted" value={String(contactedWeek.length)} color="#f59e0b" />
          <StatCard label="Interested" value={String(interested.length)} color="#22c07a" />
          <StatCard label="Quotes Sent" value={String(quoted.length)} color="#8b5cf6" />
          <StatCard label="Won" value={String(won.length)} color="#ffd700" />
        </div>
      </div>

      {/* Pipeline */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Pipeline</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
          <StatCard label="Conversion Rate" value={`${conversionRate}%`} color="#22c07a" />
          <StatCard label="Best Business Type" value={bestType} color="#8b5cf6" small />
          <StatCard label="Total Prospects" value={String(prospects.length)} color="#4f7fff" />
          <StatCard label="Hot Uncontacted" value={String(hotUncontacted)} color="#f25a5a" />
        </div>
      </div>

      {/* Status breakdown */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Status Breakdown</div>
        <div style={{ display: 'flex', gap: 4, height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
          {[
            { status: 'uncontacted', color: '#4f7fff' },
            { status: 'contacted', color: '#f59e0b' },
            { status: 'interested', color: '#22c07a' },
            { status: 'quoted', color: '#8b5cf6' },
            { status: 'won', color: '#ffd700' },
            { status: 'lost', color: '#505a6b' },
          ].map(({ status, color }) => {
            const count = prospects.filter(p => p.status === status).length
            const pct = prospects.length > 0 ? (count / prospects.length) * 100 : 0
            if (pct === 0) return null
            return (
              <div key={status} style={{ width: `${pct}%`, background: color, minWidth: pct > 0 ? 4 : 0 }}
                title={`${status}: ${count}`} />
            )
          })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { status: 'uncontacted', color: '#4f7fff' },
            { status: 'contacted', color: '#f59e0b' },
            { status: 'interested', color: '#22c07a' },
            { status: 'quoted', color: '#8b5cf6' },
            { status: 'won', color: '#ffd700' },
            { status: 'lost', color: '#505a6b' },
          ].map(({ status, color }) => {
            const count = prospects.filter(p => p.status === status).length
            return (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text3)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                <span style={{ textTransform: 'capitalize' }}>{status.replace('_', ' ')}</span>
                <span style={{ fontWeight: 600, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, small }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 8, background: `${color}0A`, border: `1px solid ${color}22`,
    }}>
      <div style={{
        fontSize: small ? 13 : 20, fontWeight: 800, color,
        fontFamily: small ? undefined : 'JetBrains Mono, monospace',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{label}</div>
    </div>
  )
}
