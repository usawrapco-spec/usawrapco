'use client'

import { useState } from 'react'
import { Users, TrendingUp, Calendar, ArrowRight, Globe, ExternalLink } from 'lucide-react'

interface FunnelSession {
  id: string
  session_token: string
  vehicle_year: number | null
  vehicle_make: string | null
  vehicle_model: string | null
  wrap_coverage: string | null
  estimated_price_low: number | null
  estimated_price_high: number | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  business_name: string | null
  step_reached: number
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  ref_code: string | null
  converted_at: string | null
  booked_appointment_at: string | null
  appointment_note: string | null
  created_at: string
  project_id: string | null
}

interface Props {
  sessions: FunnelSession[]
}

const STEP_LABELS = ['Vehicle', 'Brand', 'Generating', 'Signup Gate', 'Converted']

export default function FunnelDashboard({ sessions }: Props) {
  const [tab, setTab] = useState<'overview' | 'leads' | 'sources'>('overview')

  const total = sessions.length
  const converted = sessions.filter(s => s.converted_at).length
  const booked = sessions.filter(s => s.booked_appointment_at).length
  const convRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0'

  // Step funnel counts
  const stepCounts = [1, 2, 3, 4, 5].map(step =>
    sessions.filter(s => s.step_reached >= step).length
  )

  // UTM source breakdown
  const sourceMap: Record<string, number> = {}
  sessions.forEach(s => {
    const src = s.utm_source || 'direct'
    sourceMap[src] = (sourceMap[src] || 0) + 1
  })
  const sources = Object.entries(sourceMap).sort((a, b) => b[1] - a[1])

  // Leads = converted sessions
  const leads = sessions
    .filter(s => s.contact_email)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const st = {
    page: { padding: '0 0 40px' },
    statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 },
    stat: {
      background: 'var(--surface)',
      border: '1px solid var(--surface2)',
      borderRadius: 12,
      padding: '20px 20px',
    },
    statLabel: { fontSize: 12, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: 8 },
    statVal: { fontSize: 28, fontWeight: 800, color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace" },
    statSub: { fontSize: 13, color: 'var(--text2)', marginTop: 4 },
    tabRow: { display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--surface2)', paddingBottom: 0 },
    tab: (active: boolean) => ({
      padding: '10px 18px',
      fontSize: 14,
      fontWeight: 600,
      border: 'none',
      background: 'none',
      color: active ? 'var(--accent)' : 'var(--text2)',
      cursor: 'pointer',
      borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      marginBottom: -1,
    }),
    card: {
      background: 'var(--surface)',
      border: '1px solid var(--surface2)',
      borderRadius: 12,
      overflow: 'hidden',
    },
    row: {
      display: 'flex',
      alignItems: 'center',
      padding: '14px 20px',
      borderBottom: '1px solid var(--surface2)',
      gap: 12,
    },
    badge: (color: string) => ({
      fontSize: 11,
      fontWeight: 700,
      padding: '3px 8px',
      borderRadius: 6,
      background: color + '20',
      color: color,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    }),
  }

  return (
    <div style={st.page}>
      {/* Stat cards */}
      <div style={st.statGrid}>
        <div style={st.stat}>
          <div style={st.statLabel}>Total Sessions</div>
          <div style={st.statVal}>{total}</div>
          <div style={st.statSub}>All-time funnel visitors</div>
        </div>
        <div style={st.stat}>
          <div style={st.statLabel}>Converted</div>
          <div style={{ ...st.statVal, color: 'var(--green)' }}>{converted}</div>
          <div style={st.statSub}>{convRate}% conversion rate</div>
        </div>
        <div style={st.stat}>
          <div style={st.statLabel}>Consultations Booked</div>
          <div style={{ ...st.statVal, color: 'var(--accent)' }}>{booked}</div>
          <div style={st.statSub}>Of {converted} converted leads</div>
        </div>
        <div style={st.stat}>
          <div style={st.statLabel}>Avg Est. Value</div>
          <div style={{ ...st.statVal, color: 'var(--amber)' }}>
            {converted > 0
              ? `$${Math.round(leads.filter(l => l.estimated_price_low).reduce((sum, l) => sum + ((l.estimated_price_low! + (l.estimated_price_high || l.estimated_price_low!)) / 2), 0) / Math.max(leads.filter(l => l.estimated_price_low).length, 1)).toLocaleString()}`
              : '—'
            }
          </div>
          <div style={st.statSub}>Per converted lead</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={st.tabRow}>
        {(['overview', 'leads', 'sources'] as const).map(t => (
          <button key={t} style={st.tab(tab === t)} onClick={() => setTab(t)}>
            {t === 'overview' ? 'Funnel Drop-off' : t === 'leads' ? 'All Leads' : 'UTM Sources'}
          </button>
        ))}
      </div>

      {/* Overview: Step funnel */}
      {tab === 'overview' && (
        <div style={st.card}>
          <div style={{ padding: '20px 20px 6px', fontSize: 15, fontWeight: 700 }}>Step-by-Step Drop-off</div>
          <div style={{ padding: '8px 20px 24px' }}>
            {STEP_LABELS.map((label, i) => {
              const count = stepCounts[i] || 0
              const pct = total > 0 ? (count / total) * 100 : 0
              const dropPct = i > 0 && stepCounts[i - 1] > 0
                ? (((stepCounts[i - 1] - count) / stepCounts[i - 1]) * 100).toFixed(0)
                : null
              return (
                <div key={label} style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: i < 4 ? 'var(--accent)' : 'var(--green)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>{i + 1}</span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>Step {i + 1}: {label}</span>
                      {dropPct && Number(dropPct) > 0 && (
                        <span style={{ fontSize: 12, color: 'var(--red)', background: '#f25a5a20', padding: '2px 7px', borderRadius: 5 }}>
                          -{dropPct}% drop
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                      {count} <span style={{ color: 'var(--text2)', fontWeight: 400 }}>({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: i < 3 ? 'var(--accent)' : 'var(--green)',
                      borderRadius: 4,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Leads table */}
      {tab === 'leads' && (
        <div style={st.card}>
          {leads.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>No leads yet</div>
          ) : (
            leads.map((lead, i) => (
              <div key={lead.id} style={{ ...st.row, background: i % 2 === 0 ? 'transparent' : '#ffffff04' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                    {lead.contact_name || '—'}
                    {lead.business_name && <span style={{ color: 'var(--text2)', fontWeight: 400 }}> · {lead.business_name}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                    {lead.contact_email}
                    {lead.contact_phone && ` · ${lead.contact_phone}`}
                  </div>
                </div>
                <div style={{ minWidth: 160, fontSize: 13 }}>
                  <div style={{ color: 'var(--text1)' }}>
                    {[lead.vehicle_year, lead.vehicle_make, lead.vehicle_model].filter(Boolean).join(' ') || '—'}
                  </div>
                  {lead.wrap_coverage && (
                    <div style={{ color: 'var(--text2)', textTransform: 'capitalize' }}>{lead.wrap_coverage} wrap</div>
                  )}
                </div>
                <div style={{ minWidth: 120, fontSize: 13, textAlign: 'right' as const }}>
                  {lead.estimated_price_low ? (
                    <div style={{ color: 'var(--amber)', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                      ${lead.estimated_price_low.toLocaleString()}–${lead.estimated_price_high?.toLocaleString()}
                    </div>
                  ) : '—'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 4 }}>
                  <span style={st.badge(lead.converted_at ? 'var(--green)' : 'var(--text2)')}>
                    {lead.converted_at ? 'converted' : `step ${lead.step_reached}`}
                  </span>
                  {lead.booked_appointment_at && (
                    <span style={st.badge('var(--accent)')}>booked</span>
                  )}
                </div>
                {lead.project_id && (
                  <a
                    href={`/projects/${lead.project_id}`}
                    style={{ color: 'var(--accent)', flexShrink: 0 }}
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* UTM Sources */}
      {tab === 'sources' && (
        <div style={st.card}>
          {sources.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>No UTM data yet</div>
          ) : (
            <>
              <div style={{ padding: '20px 20px 6px', fontSize: 15, fontWeight: 700 }}>Traffic Sources</div>
              <div style={{ padding: '8px 20px 24px' }}>
                {sources.map(([src, count]) => {
                  const pct = total > 0 ? (count / total) * 100 : 0
                  const srcConverted = sessions.filter(s => (s.utm_source || 'direct') === src && s.converted_at).length
                  return (
                    <div key={src} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Globe size={14} style={{ color: 'var(--accent)' }} />
                          <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{src}</span>
                          <span style={{ fontSize: 12, color: 'var(--green)' }}>{srcConverted} converted</span>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                          {count} <span style={{ color: 'var(--text2)', fontWeight: 400 }}>({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: 'var(--accent)',
                          borderRadius: 4,
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
