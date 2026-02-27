'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Activity, DollarSign, FileText, Users, ChevronLeft, ChevronRight,
  RefreshCw, Bot
} from 'lucide-react'

const PAGE_SIZE = 25

export default function AILogPage() {
  const router = useRouter()
  const supabase = createClient()

  const [agentLogs, setAgentLogs] = useState<any[]>([])
  const [usageLogs, setUsageLogs] = useState<any[]>([])
  const [recaps, setRecaps] = useState<any[]>([])
  const [workSummaries, setWorkSummaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'agents' | 'usage' | 'recaps' | 'summaries'>('agents')
  const [page, setPage] = useState(0)
  const [totalSpend, setTotalSpend] = useState(0)
  const [totalCalls, setTotalCalls] = useState(0)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || (profile.role !== 'admin' && profile.role !== 'owner')) {
      router.push('/dashboard')
      return
    }
    loadData()
  }

  async function loadData() {
    setLoading(true)
    const [agentsRes, usageRes, recapsRes, summariesRes] = await Promise.all([
      supabase.from('ai_agents_log').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('ai_usage_log').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('ai_recaps').select('*').order('recap_date', { ascending: false }).limit(30),
      supabase.from('work_summaries').select('*, profile:user_id(name, email)').order('generated_at', { ascending: false }).limit(50),
    ])

    if (agentsRes.data) setAgentLogs(agentsRes.data)
    if (usageRes.data) {
      setUsageLogs(usageRes.data)
      const spend = usageRes.data.reduce((s: number, l: any) => s + (l.cost_usd || l.cost || 0), 0)
      const calls = usageRes.data.length
      setTotalSpend(spend)
      setTotalCalls(calls)
    }
    if (recapsRes.data) setRecaps(recapsRes.data)
    if (summariesRes.data) setWorkSummaries(summariesRes.data)
    setLoading(false)
  }

  const pagedAgentLogs = agentLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(agentLogs.length / PAGE_SIZE)

  const tabs = [
    { key: 'agents' as const, label: 'Agent Actions', icon: Bot },
    { key: 'usage' as const, label: 'Usage & Cost', icon: DollarSign },
    { key: 'recaps' as const, label: 'Daily Recaps', icon: FileText },
    { key: 'summaries' as const, label: 'Work Summaries', icon: Users },
  ]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 32, fontWeight: 900, color: 'var(--text1)', margin: 0 }}>
            AI Activity Log
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            All AI actions, usage, and daily recaps
          </p>
        </div>
        <button
          onClick={loadData}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard icon={<Activity size={18} />} label="Total AI Calls" value={totalCalls.toLocaleString()} color="var(--accent)" />
        <StatCard icon={<DollarSign size={18} />} label="Total Spend" value={`$${totalSpend.toFixed(4)}`} color="var(--green)" />
        <StatCard icon={<FileText size={18} />} label="Daily Recaps" value={recaps.length} color="var(--cyan)" />
        <StatCard icon={<Users size={18} />} label="Work Summaries" value={workSummaries.length} color="var(--purple)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(0) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', fontSize: 13, fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === t.key ? 'var(--accent)' : 'var(--text3)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
          Loading AI logs...
        </div>
      ) : (
        <>
          {/* Agent Logs */}
          {tab === 'agents' && (
            <div>
              <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                {pagedAgentLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
                    <Bot size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p>No agent actions logged yet</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Time', 'Agent', 'Action', 'Model', 'Tokens', 'Cost', 'Status'].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedAgentLogs.map((log: any) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={tdStyle}><span style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(log.created_at).toLocaleString()}</span></td>
                          <td style={tdStyle}><span style={{ fontSize: 12, color: 'var(--text2)' }}>{log.agent_name || '-'}</span></td>
                          <td style={tdStyle}><span style={{ fontSize: 12, color: 'var(--text1)', fontWeight: 600 }}>{log.action_type || '-'}</span></td>
                          <td style={tdStyle}><span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text2)' }}>{log.model || '-'}</span></td>
                          <td style={tdStyle}><span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text2)' }}>{(log.tokens_used || 0).toLocaleString()}</span></td>
                          <td style={tdStyle}><span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text1)' }}>${(log.cost_usd || 0).toFixed(6)}</span></td>
                          <td style={tdStyle}>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                              background: log.status === 'success' ? 'rgba(34,192,122,0.1)' : log.status === 'error' ? 'rgba(242,90,90,0.1)' : 'rgba(79,127,255,0.1)',
                              color: log.status === 'success' ? 'var(--green)' : log.status === 'error' ? 'var(--red)' : 'var(--accent)',
                            }}>
                              {log.status || 'success'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={pageBtn}>
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>Page {page + 1} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} style={pageBtn}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Usage Logs */}
          {tab === 'usage' && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
              {usageLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
                  <DollarSign size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p>No usage logs yet</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Time', 'Model', 'Feature', 'Input Tokens', 'Output Tokens', 'Cost'].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usageLogs.slice(0, 100).map((log: any) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={tdStyle}><span style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(log.created_at).toLocaleString()}</span></td>
                        <td style={tdStyle}><span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text2)' }}>{log.model || log.model_used || '-'}</span></td>
                        <td style={tdStyle}><span style={{ fontSize: 12, color: 'var(--text2)' }}>{log.feature || log.action || log.pipeline_step || '-'}</span></td>
                        <td style={tdStyle}><span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text2)' }}>{(log.input_tokens || 0).toLocaleString()}</span></td>
                        <td style={tdStyle}><span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text2)' }}>{(log.output_tokens || log.total_tokens || 0).toLocaleString()}</span></td>
                        <td style={tdStyle}><span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--green)' }}>${(log.cost_usd || log.cost || 0).toFixed(6)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Daily Recaps */}
          {tab === 'recaps' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recaps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <FileText size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p>No daily recaps generated yet</p>
                </div>
              ) : (
                recaps.map((recap: any) => (
                  <div key={recap.id} style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>
                        {new Date(recap.recap_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono', color: 'var(--green)' }}>
                        ${(recap.total_cost_usd || 0).toFixed(4)} spent
                      </div>
                    </div>
                    {recap.summary && (
                      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{recap.summary}</p>
                    )}
                    {recap.highlights && recap.highlights.length > 0 && (
                      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {recap.highlights.map((h: string, i: number) => (
                          <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(79,127,255,0.1)', color: 'var(--accent)', border: '1px solid rgba(79,127,255,0.2)' }}>
                            {h}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Work Summaries */}
          {tab === 'summaries' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {workSummaries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <Users size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p>No work summaries generated yet</p>
                </div>
              ) : (
                workSummaries.map((s: any) => (
                  <div key={s.id} style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>
                        {(s.profile as any)?.name || 'Unknown Employee'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                        {s.period_start && s.period_end && `${new Date(s.period_start).toLocaleDateString()} – ${new Date(s.period_end).toLocaleDateString()}`}
                      </div>
                    </div>
                    {s.summary && (
                      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{s.summary}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ color }}>{icon}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono' }}>
        {value}
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '12px 12px',
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  background: 'var(--surface)',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 12,
  color: 'var(--text2)',
  borderBottom: '1px solid var(--border)',
}

const pageBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 8,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  color: 'var(--text2)',
  cursor: 'pointer',
}
