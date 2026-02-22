'use client'

import { useState, useEffect } from 'react'
import { GitCommit, Zap, DollarSign, MessageSquare, Users, Settings, BarChart3, Palette, Wrench, CheckSquare, Star } from 'lucide-react'

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  ai:         { label: 'AI',         color: '#8b5cf6', bg: 'rgba(139,92,246,.12)', icon: Zap },
  finance:    { label: 'Finance',    color: '#22c07a', bg: 'rgba(34,192,122,.12)', icon: DollarSign },
  comms:      { label: 'Comms',      color: '#22d3ee', bg: 'rgba(34,211,238,.12)', icon: MessageSquare },
  sales:      { label: 'Sales',      color: '#4f7fff', bg: 'rgba(79,127,255,.12)', icon: Users },
  workflow:   { label: 'Workflow',   color: '#f59e0b', bg: 'rgba(245,158,11,.12)', icon: CheckSquare },
  production: { label: 'Production', color: '#f25a5a', bg: 'rgba(242,90,90,.12)', icon: Wrench },
  settings:   { label: 'Settings',  color: '#5a6080', bg: 'rgba(90,96,128,.12)', icon: Settings },
  analytics:  { label: 'Analytics', color: '#22d3ee', bg: 'rgba(34,211,238,.12)', icon: BarChart3 },
  ui:         { label: 'UI/UX',     color: '#f59e0b', bg: 'rgba(245,158,11,.12)', icon: Palette },
  fix:        { label: 'Fix',       color: '#f25a5a', bg: 'rgba(242,90,90,.12)', icon: Wrench },
  feature:    { label: 'Feature',   color: '#4f7fff', bg: 'rgba(79,127,255,.12)', icon: Star },
}

function relDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ChangelogClient() {
  const [commits, setCommits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetch('/api/changelog')
      .then(r => r.json())
      .then(d => { setCommits(d.commits || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const categories = ['all', ...Array.from(new Set(commits.map(c => c.category)))]
  const filtered = filter === 'all' ? commits : commits.filter(c => c.category === filter)

  // Group by date
  const grouped: Record<string, any[]> = {}
  filtered.forEach(c => {
    if (!grouped[c.date]) grouped[c.date] = []
    grouped[c.date].push(c)
  })

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 32, fontWeight: 900, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <GitCommit size={28} /> Development Changelog
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
          Auto-populated from git commits · {commits.length} entries tracked
        </div>
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {categories.map(cat => {
          const cfg = CATEGORY_CONFIG[cat]
          const active = filter === cat
          return (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              border: `1px solid ${active && cfg ? cfg.color : 'var(--border)'}22`,
              background: active && cfg ? cfg.bg : 'var(--surface)',
              color: active && cfg ? cfg.color : 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {cat === 'all' ? 'All' : (CATEGORY_CONFIG[cat]?.label || cat)}
              {cat === 'all' && <span style={{ marginLeft: 5, opacity: .6 }}>{commits.length}</span>}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 13 }}>Loading changelog...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 13 }}>No commits yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([date, dayCommits]) => (
            <div key={date}>
              {/* Date header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {relDate(date)}
                </div>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{date}</div>
              </div>

              {/* Commits for this date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dayCommits.map(c => {
                  const cfg = CATEGORY_CONFIG[c.category] || CATEGORY_CONFIG.feature
                  const Icon = cfg.icon
                  return (
                    <div key={c.hash} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={14} style={{ color: cfg.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 3 }}>
                          {c.subject}
                        </div>
                        {c.body && (
                          <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                            {c.body.substring(0, 200)}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '1px 7px', borderRadius: 4, textTransform: 'uppercase' }}>
                            {cfg.label}
                          </span>
                          <code style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                            {c.hash}
                          </code>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
