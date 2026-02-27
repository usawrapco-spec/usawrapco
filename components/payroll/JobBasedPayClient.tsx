'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Profile } from '@/types'
import { Loader2, Wrench, TrendingUp, DollarSign, Users, RefreshCw } from 'lucide-react'

interface JobRow {
  id: string
  title: string
  pipe_stage: string
  revenue: number
  installer_id: string
  installer_name: string
  installer_email: string | null
  pay_pct: number
  per_job_rate: number
  installer_pay_type: string
  earnings: number
  updated_at: string
}

interface InstallerSummary {
  name: string
  email: string | null
  jobs: number
  total_revenue: number
  total_earnings: number
}

function fmt(n: number) { return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }
function biweeklyRange() {
  const anchor = new Date('2026-01-05')
  const today = new Date()
  const days = Math.floor((today.getTime() - anchor.getTime()) / 86_400_000)
  const period = Math.floor(days / 14)
  const start = new Date(anchor.getTime() + period * 14 * 86_400_000)
  const end = new Date(start.getTime() + 13 * 86_400_000)
  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0],
  }
}

const STAGE_LABELS: Record<string, string> = {
  install: 'Install', prod_review: 'QC Review', sales_close: 'Sales Close', done: 'Done'
}

export default function JobBasedPayClient({ profile }: { profile: Profile }) {
  const range = biweeklyRange()
  const [from, setFrom] = useState(range.from)
  const [to, setTo] = useState(range.to)
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [byInstaller, setByInstaller] = useState<Record<string, InstallerSummary>>({})
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'jobs' | 'summary'>('summary')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/payroll/jobs-pay?from=${from}&to=${to}`)
    const data = await res.json()
    setJobs(data.jobs || [])
    setByInstaller(data.by_installer || {})
    setLoading(false)
  }, [from, to])

  useEffect(() => { fetchData() }, [fetchData])

  const totalEarnings = jobs.reduce((s, j) => s + j.earnings, 0)
  const totalRevenue = jobs.reduce((s, j) => s + (j.revenue || 0), 0)

  const inp: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid #2a2d3a',
    borderRadius: 8, padding: '7px 12px', color: 'var(--text1)', fontSize: 13, outline: 'none'
  }

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>FROM</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inp} />
          <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>TO</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inp} />
          <button onClick={fetchData} style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {(['summary', 'jobs'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid #2a2d3a', cursor: 'pointer',
              background: view === v ? 'var(--accent)' : 'transparent', color: view === v ? '#fff' : 'var(--text2)',
              fontWeight: 600, fontSize: 12, textTransform: 'capitalize'
            }}>{v === 'summary' ? 'By Installer' : 'Job Detail'}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Installer Pay', value: fmt(totalEarnings), color: 'var(--green)', icon: DollarSign },
          { label: 'Total Revenue', value: fmt(totalRevenue), color: 'var(--accent)', icon: TrendingUp },
          { label: 'Jobs in Period', value: jobs.length, color: 'var(--cyan)', icon: Wrench },
          { label: 'Installers', value: Object.keys(byInstaller).length, color: 'var(--purple)', icon: Users },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 10, padding: '14px 16px', border: '1px solid #2a2d3a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Icon size={13} color={s.color} />
                <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: s.color }}>{s.value}</div>
            </div>
          )
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
      ) : view === 'summary' ? (
        /* By Installer summary */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(byInstaller).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)', background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a' }}>
              No installer jobs found for this period.
            </div>
          ) : Object.entries(byInstaller).map(([uid, inst]) => (
            <div key={uid} style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)', marginBottom: 4 }}>{inst.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{inst.email || 'No email'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{fmt(inst.total_earnings)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>owed this period</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 16, borderTop: '1px solid #1a1d27' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase' }}>Jobs</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', fontFamily: 'var(--font-mono)' }}>{inst.jobs}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase' }}>Revenue Generated</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{fmt(inst.total_revenue)}</div>
                </div>
                {inst.total_revenue > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase' }}>Effective Pay %</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                      {((inst.total_earnings / inst.total_revenue) * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
              {/* Jobs for this installer */}
              <div style={{ marginTop: 12 }}>
                {jobs.filter(j => j.installer_id === uid).map(job => (
                  <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #1a1d27' }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 500 }}>{job.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {STAGE_LABELS[job.pipe_stage] || job.pipe_stage} · {job.updated_at?.split('T')[0]}
                        {job.pay_pct > 0 ? ` · ${job.pay_pct}% of revenue` : job.per_job_rate > 0 ? ` · flat ${fmt(job.per_job_rate)}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)' }}>{job.earnings > 0 ? fmt(job.earnings) : '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fmt(job.revenue || 0)} rev</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Job detail table */
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a', overflow: 'hidden' }}>
          {jobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>No jobs found for this period.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                  {['Job', 'Stage', 'Installer', 'Revenue', 'Pay %', 'Earnings'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} style={{ borderBottom: '1px solid #1a1d27' }}>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{job.title}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text2)' }}>{STAGE_LABELS[job.pipe_stage] || job.pipe_stage}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--text1)' }}>{job.installer_name}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{fmt(job.revenue || 0)}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text2)' }}>
                      {job.pay_pct > 0 ? `${job.pay_pct}%` : job.per_job_rate > 0 ? fmt(job.per_job_rate) + ' flat' : '—'}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)' }}>
                      {job.earnings > 0 ? fmt(job.earnings) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #2a2d3a', background: 'var(--surface2)' }}>
                  <td colSpan={3} style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text1)', fontSize: 13 }}>TOTALS</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{fmt(totalRevenue)}</td>
                  <td />
                  <td style={{ padding: '12px 14px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--green)', fontSize: 15 }}>{fmt(totalEarnings)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
