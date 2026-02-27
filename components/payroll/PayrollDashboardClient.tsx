'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Profile } from '@/types'
import {
  DollarSign, Users, ChevronLeft, ChevronRight, Play, Download,
  Loader2, Clock, Briefcase, TrendingUp, AlertTriangle, Check,
  Lock, User, FileText, ChevronDown, ChevronUp,
} from 'lucide-react'

interface W2Employee {
  user_id: string
  name: string
  email: string
  role: string
  worker_type: 'w2'
  hourly_rate: number
  hours_worked: number
  base_pay: number
  commission_earned: number
  commission_bonus: number
  total_pay: number
  jobs_closed: {
    id: string
    title: string
    vehicle: string
    revenue: number
    profit: number
    gpm: number
    commission: number
    source: string
  }[]
  time_blocks: any[]
  status: 'pending' | 'approved' | 'exported'
  gusto_employee_id: string | null
}

interface Contractor {
  user_id: string
  name: string
  email: string
  role: string
  worker_type: '1099'
  hours_logged: number
  jobs_completed: {
    id: string
    title: string
    vehicle: string
    flat_rate: number
    hours_budget: number
  }[]
  total_jobs: number
  total_earned: number
  time_blocks: any[]
  status: 'pending' | 'approved' | 'exported'
  gusto_employee_id: string | null
}

interface CalcResult {
  period: { start: string; end: string }
  w2_employees: W2Employee[]
  contractors: Contractor[]
  totals: {
    w2_total: number
    contractor_total: number
    grand_total: number
    w2_count: number
    contractor_count: number
  }
}

// Get the Friday that starts the pay week containing a given date
function getFridayStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = (day - 5 + 7) % 7
  d.setDate(d.getDate() - diff)
  return d
}

function getThursdayEnd(fridayStart: Date): Date {
  const d = new Date(fridayStart)
  d.setDate(d.getDate() + 6)
  return d
}

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function fmtDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmt(n: number) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
function fmtK(n: number) {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function PayrollDashboardClient({ profile }: { profile: Profile }) {
  const [periodStart, setPeriodStart] = useState(() => {
    const fri = getFridayStart(new Date())
    return fmtDate(fri)
  })
  const [periodEnd, setPeriodEnd] = useState(() => {
    const fri = getFridayStart(new Date())
    return fmtDate(getThursdayEnd(fri))
  })

  const [workerType, setWorkerType] = useState<'w2' | '1099'>('w2')
  const [data, setData] = useState<CalcResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'done'>('idle')
  const [processedRunId, setProcessedRunId] = useState<string | null>(null)

  const navigatePeriod = (direction: number) => {
    const current = new Date(periodStart + 'T12:00:00')
    current.setDate(current.getDate() + direction * 7)
    const newStart = getFridayStart(current)
    setPeriodStart(fmtDate(newStart))
    setPeriodEnd(fmtDate(getThursdayEnd(newStart)))
    setData(null)
    setRunStatus('idle')
    setProcessedRunId(null)
  }

  const calculate = useCallback(async () => {
    setCalculating(true)
    try {
      const res = await fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_start: periodStart, period_end: periodEnd }),
      })
      const result = await res.json()
      if (res.ok) setData(result)
    } catch { /* ignore */ }
    setCalculating(false)
  }, [periodStart, periodEnd])

  // Auto-calculate when period changes
  useEffect(() => { calculate() }, [calculate])

  const handleRunPayroll = async () => {
    if (!data) return
    if (!confirm(`Run payroll for ${fmtDateShort(periodStart)} - ${fmtDateShort(periodEnd)}?\n\nThis will calculate and lock all pay for this period.`))
      return

    setRunStatus('running')

    // Create payroll run
    const createRes = await fetch('/api/payroll/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period_start: periodStart,
        period_end: periodEnd,
        notes: `Weekly payroll ${periodStart} to ${periodEnd}`,
      }),
    })
    const createData = await createRes.json()
    if (!createRes.ok) {
      alert(createData.error || 'Failed to create payroll run')
      setRunStatus('idle')
      return
    }

    const runId = createData.run.id

    // Build line items from calculated data
    const lineItems: any[] = []
    for (const emp of data.w2_employees) {
      lineItems.push({
        user_id: emp.user_id,
        type: 'regular_hours',
        hours: emp.hours_worked || 40,
        rate: emp.hourly_rate,
        amount: emp.base_pay,
        description: `Base pay (${emp.hours_worked || 40}hrs @ $${emp.hourly_rate}/hr, $800 min)`,
      })
      if (emp.commission_bonus > 0) {
        lineItems.push({
          user_id: emp.user_id,
          type: 'commission',
          amount: emp.commission_bonus,
          description: `Commission above guarantee (${emp.jobs_closed.length} jobs)`,
        })
      }
    }
    for (const inst of data.contractors) {
      if (inst.total_earned > 0) {
        lineItems.push({
          user_id: inst.user_id,
          type: 'per_job',
          amount: inst.total_earned,
          description: `${inst.total_jobs} jobs completed (1099 contractor)`,
        })
      }
    }

    // Process the run
    const processRes = await fetch(`/api/payroll/runs/${runId}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line_items: lineItems }),
    })

    if (processRes.ok) {
      setRunStatus('done')
      setProcessedRunId(runId)
    } else {
      const err = await processRes.json()
      alert(err.error || 'Failed to process payroll')
      setRunStatus('idle')
    }
  }

  const handleGustoExport = async (type: 'w2' | '1099' | 'hours') => {
    if (!data) return
    setExporting(true)

    const employees = type === '1099' ? data.contractors : data.w2_employees
    const res = await fetch('/api/payroll/gusto-export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        export_type: type,
        period_start: periodStart,
        period_end: periodEnd,
        payroll_run_id: processedRunId,
        employees,
      }),
    })

    const result = await res.json()
    if (res.ok && result.csv) {
      const blob = new Blob([result.csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.file_name
      a.click()
      URL.revokeObjectURL(url)
    }
    setExporting(false)
  }

  const statCards = data ? [
    { label: 'Grand Total', value: fmtK(data.totals.grand_total), icon: DollarSign, color: 'var(--green)' },
    { label: 'W2 Payroll', value: fmtK(data.totals.w2_total), sub: `${data.totals.w2_count} employees`, icon: Users, color: 'var(--accent)' },
    { label: '1099 Payouts', value: fmtK(data.totals.contractor_total), sub: `${data.totals.contractor_count} contractors`, icon: Briefcase, color: 'var(--cyan)' },
    { label: 'Period', value: `${fmtDateShort(periodStart)} - ${fmtDateShort(periodEnd)}`, sub: 'Fri – Thu', icon: Clock, color: 'var(--amber)' },
  ] : []

  return (
    <div>
      {/* ── Period Selector ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--surface)', borderRadius: 12, padding: '14px 20px',
        border: '1px solid #2a2d3a', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigatePeriod(-1)} style={{
            background: 'var(--surface2)', border: '1px solid #2a2d3a', borderRadius: 8,
            padding: '6px 8px', cursor: 'pointer', color: 'var(--text1)', display: 'flex',
          }}>
            <ChevronLeft size={18} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', fontFamily: 'var(--font-barlow)' }}>
              {fmtDateShort(periodStart)} — {fmtDateShort(periodEnd)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>Weekly Pay Period (Fri – Thu)</div>
          </div>
          <button onClick={() => navigatePeriod(1)} style={{
            background: 'var(--surface2)', border: '1px solid #2a2d3a', borderRadius: 8,
            padding: '6px 8px', cursor: 'pointer', color: 'var(--text1)', display: 'flex',
          }}>
            <ChevronRight size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {runStatus === 'done' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green)', fontWeight: 600, fontSize: 13, padding: '9px 14px' }}>
              <Lock size={14} /> Payroll Processed
            </div>
          ) : (
            <button onClick={handleRunPayroll} disabled={!data || runStatus === 'running' || calculating} style={{
              padding: '9px 18px', borderRadius: 8, border: 'none',
              cursor: (!data || runStatus === 'running') ? 'not-allowed' : 'pointer',
              background: 'var(--green)', color: '#fff', fontWeight: 700, fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 6, opacity: (!data || runStatus === 'running') ? 0.6 : 1,
            }}>
              {runStatus === 'running'
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                : <><Play size={14} /> Run Payroll</>}
            </button>
          )}

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => handleGustoExport(workerType === '1099' ? '1099' : 'w2')}
              disabled={!data || exporting}
              style={{
                padding: '9px 14px', borderRadius: 8, border: '1px solid #2a2d3a',
                cursor: !data ? 'not-allowed' : 'pointer',
                background: 'transparent', color: 'var(--text1)', fontWeight: 600, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 6, opacity: !data ? 0.5 : 1,
              }}
            >
              {exporting
                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : <Download size={14} />}
              Export to Gusto CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ────────────────────────────────────────────────────── */}
      {calculating ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--text2)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginRight: 10 }} />
          Calculating payroll...
        </div>
      ) : data ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            {statCards.map(s => {
              const Icon = s.icon
              return (
                <div key={s.label} style={{
                  background: 'var(--surface)', borderRadius: 12, padding: '16px 18px',
                  border: '1px solid #2a2d3a',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <Icon size={12} color={s.color} />
                    <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: s.color }}>{s.value}</div>
                  {s.sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.sub}</div>}
                </div>
              )
            })}
          </div>

          {/* ── W2 / 1099 Toggle ───────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            {(['w2', '1099'] as const).map(t => (
              <button key={t} onClick={() => setWorkerType(t)} style={{
                padding: '8px 18px', borderRadius: 8,
                border: `1px solid ${workerType === t ? 'var(--accent)' : '#2a2d3a'}`,
                background: workerType === t ? 'var(--accent)22' : 'var(--surface)',
                color: workerType === t ? 'var(--accent)' : 'var(--text2)',
                cursor: 'pointer', fontWeight: 700, fontSize: 13,
              }}>
                {t === 'w2' ? `W2 Employees (${data.totals.w2_count})` : `1099 Contractors (${data.totals.contractor_count})`}
              </button>
            ))}
          </div>

          {/* ── W2 Employee Table ──────────────────────────────────────────── */}
          {workerType === 'w2' && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #2a2d3a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={16} color="var(--accent)" />
                <span style={{ fontWeight: 700, color: 'var(--text1)' }}>W2 Employee Payroll</span>
                <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 'auto' }}>
                  WA Law: Base $800/wk + MAX(0, Commission - $800)
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                      {['', 'Employee', 'Role', 'Hours', 'Base Pay', 'Commission', 'Bonus', 'Total Pay', 'Status'].map(h => (
                        <th key={h} style={{
                          textAlign: h === 'Employee' || h === 'Role' || h === '' ? 'left' : 'right',
                          padding: '10px 12px', fontSize: 10, color: 'var(--text2)',
                          fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.w2_employees.map(emp => {
                      const isExpanded = expandedRow === emp.user_id
                      return (
                        <>
                          <tr key={emp.user_id} style={{ borderBottom: '1px solid #1a1d27', cursor: 'pointer' }}
                            onClick={() => setExpandedRow(isExpanded ? null : emp.user_id)}>
                            <td style={{ padding: '12px 8px 12px 12px', width: 24 }}>
                              {isExpanded ? <ChevronUp size={14} color="var(--text3)" /> : <ChevronDown size={14} color="var(--text3)" />}
                            </td>
                            <td style={{ padding: 12 }}>
                              <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 13 }}>{emp.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{emp.email}</div>
                            </td>
                            <td style={{ padding: 12, fontSize: 12, color: 'var(--text2)', textTransform: 'capitalize' }}>
                              {emp.role.replace(/_/g, ' ')}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', color: emp.hours_worked > 0 ? 'var(--text1)' : 'var(--text3)' }}>
                              {emp.hours_worked > 0 ? `${emp.hours_worked.toFixed(1)}h` : '—'}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text1)' }}>
                              {fmt(emp.base_pay)}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', color: emp.commission_earned > 0 ? 'var(--cyan)' : 'var(--text3)' }}>
                              {emp.commission_earned > 0 ? fmt(emp.commission_earned) : '—'}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', color: emp.commission_bonus > 0 ? 'var(--purple)' : 'var(--text3)' }}>
                              {emp.commission_bonus > 0 ? fmt(emp.commission_bonus) : '—'}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right', fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)' }}>
                              {fmt(emp.total_pay)}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right' }}>
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                                background: runStatus === 'done' ? 'var(--green)22' : 'var(--amber)22',
                                color: runStatus === 'done' ? 'var(--green)' : 'var(--amber)',
                                textTransform: 'uppercase',
                              }}>
                                {runStatus === 'done' ? 'Approved' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={emp.user_id + '-detail'} style={{ background: 'var(--surface2)' }}>
                              <td colSpan={9} style={{ padding: '12px 20px 16px' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase' }}>
                                  Commission Breakdown — {emp.jobs_closed.length} job{emp.jobs_closed.length !== 1 ? 's' : ''} closed
                                </div>
                                {emp.jobs_closed.length === 0 ? (
                                  <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>No jobs closed this period</div>
                                ) : (
                                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                                        {['Job', 'Vehicle', 'Revenue', 'Profit', 'GPM', 'Source', 'Commission'].map(h => (
                                          <th key={h} style={{
                                            textAlign: h === 'Job' || h === 'Vehicle' || h === 'Source' ? 'left' : 'right',
                                            padding: '6px 10px', fontSize: 10, color: 'var(--text3)', fontWeight: 600,
                                          }}>{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {emp.jobs_closed.map(job => (
                                        <tr key={job.id} style={{ borderBottom: '1px solid #1a1d2744' }}>
                                          <td style={{ padding: '6px 10px', fontSize: 12, color: 'var(--text1)' }}>{job.title}</td>
                                          <td style={{ padding: '6px 10px', fontSize: 12, color: 'var(--text2)' }}>{job.vehicle || '—'}</td>
                                          <td style={{ padding: '6px 10px', textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text1)' }}>{fmt(job.revenue)}</td>
                                          <td style={{ padding: '6px 10px', textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text1)' }}>{fmt(job.profit)}</td>
                                          <td style={{ padding: '6px 10px', textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)', color: job.gpm >= 73 ? 'var(--green)' : job.gpm >= 65 ? 'var(--amber)' : 'var(--red)' }}>
                                            {job.gpm.toFixed(1)}%
                                          </td>
                                          <td style={{ padding: '6px 10px', fontSize: 11, color: 'var(--text2)', textTransform: 'capitalize' }}>{(job.source || '').replace(/_/g, ' ')}</td>
                                          <td style={{ padding: '6px 10px', textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--cyan)' }}>{fmt(job.commission)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                                <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid #2a2d3a' }}>
                                  <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>WA State Payroll Calculation</div>
                                  <div style={{ display: 'flex', gap: 20, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                                    <span style={{ color: 'var(--text2)' }}>Guarantee: <strong style={{ color: 'var(--text1)' }}>{fmt(emp.base_pay)}</strong></span>
                                    <span style={{ color: 'var(--text2)' }}>Commission: <strong style={{ color: 'var(--cyan)' }}>{fmt(emp.commission_earned)}</strong></span>
                                    <span style={{ color: 'var(--text2)' }}>Bonus above base: <strong style={{ color: 'var(--purple)' }}>{fmt(emp.commission_bonus)}</strong></span>
                                    <span style={{ color: 'var(--text2)' }}>Total: <strong style={{ color: 'var(--green)' }}>{fmt(emp.total_pay)}</strong></span>
                                  </div>
                                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                                    Total = Base $800 + MAX(0, Commission - $800)
                                    {emp.commission_earned > emp.base_pay
                                      ? ' → Commission exceeds guarantee, paying full commission'
                                      : ' → Guarantee applies, commission below base'}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #2a2d3a', background: 'var(--surface2)' }}>
                      <td colSpan={4} style={{ padding: 12, fontWeight: 700, color: 'var(--text1)', fontSize: 13 }}>TOTALS</td>
                      <td style={{ padding: 12, textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text1)' }}>
                        {fmt(data.w2_employees.reduce((s, e) => s + e.base_pay, 0))}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>
                        {fmt(data.w2_employees.reduce((s, e) => s + e.commission_earned, 0))}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--purple)' }}>
                        {fmt(data.w2_employees.reduce((s, e) => s + e.commission_bonus, 0))}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--green)', fontSize: 16 }}>
                        {fmt(data.totals.w2_total)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── 1099 Contractor Table ─────────────────────────────────────── */}
          {workerType === '1099' && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #2a2d3a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Briefcase size={16} color="var(--cyan)" />
                <span style={{ fontWeight: 700, color: 'var(--text1)' }}>1099 Contractor Payouts</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                      {['', 'Contractor', 'Role', 'Jobs Completed', 'Hours Logged', 'Total Earned', 'Status'].map(h => (
                        <th key={h} style={{
                          textAlign: h === 'Contractor' || h === 'Role' || h === '' ? 'left' : 'right',
                          padding: '10px 12px', fontSize: 10, color: 'var(--text2)',
                          fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.contractors.map(inst => {
                      const isExpanded = expandedRow === inst.user_id
                      return (
                        <>
                          <tr key={inst.user_id} style={{ borderBottom: '1px solid #1a1d27', cursor: 'pointer' }}
                            onClick={() => setExpandedRow(isExpanded ? null : inst.user_id)}>
                            <td style={{ padding: '12px 8px 12px 12px', width: 24 }}>
                              {isExpanded ? <ChevronUp size={14} color="var(--text3)" /> : <ChevronDown size={14} color="var(--text3)" />}
                            </td>
                            <td style={{ padding: 12 }}>
                              <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 13 }}>{inst.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{inst.email}</div>
                            </td>
                            <td style={{ padding: 12, fontSize: 12, color: 'var(--text2)', textTransform: 'capitalize' }}>
                              {(inst.role || '').replace(/_/g, ' ')}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right', fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>
                              {inst.total_jobs}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', color: inst.hours_logged > 0 ? 'var(--text1)' : 'var(--text3)' }}>
                              {inst.hours_logged > 0 ? `${inst.hours_logged.toFixed(1)}h` : '—'}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right', fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)' }}>
                              {fmt(inst.total_earned)}
                            </td>
                            <td style={{ padding: 12, textAlign: 'right' }}>
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                                background: runStatus === 'done' ? 'var(--green)22' : 'var(--amber)22',
                                color: runStatus === 'done' ? 'var(--green)' : 'var(--amber)',
                                textTransform: 'uppercase',
                              }}>
                                {runStatus === 'done' ? 'Approved' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={inst.user_id + '-detail'} style={{ background: 'var(--surface2)' }}>
                              <td colSpan={7} style={{ padding: '12px 20px 16px' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase' }}>
                                  Jobs This Period
                                </div>
                                {inst.jobs_completed.length === 0 ? (
                                  <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>No jobs completed this period</div>
                                ) : (
                                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                                        {['Job', 'Vehicle', 'Hrs Budget', 'Flat Rate'].map(h => (
                                          <th key={h} style={{
                                            textAlign: h === 'Job' || h === 'Vehicle' ? 'left' : 'right',
                                            padding: '6px 10px', fontSize: 10, color: 'var(--text3)', fontWeight: 600,
                                          }}>{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {inst.jobs_completed.map(job => (
                                        <tr key={job.id} style={{ borderBottom: '1px solid #1a1d2744' }}>
                                          <td style={{ padding: '6px 10px', fontSize: 12, color: 'var(--text1)' }}>{job.title}</td>
                                          <td style={{ padding: '6px 10px', fontSize: 12, color: 'var(--text2)' }}>{job.vehicle || '—'}</td>
                                          <td style={{ padding: '6px 10px', textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>
                                            {job.hours_budget > 0 ? `${job.hours_budget}h` : '—'}
                                          </td>
                                          <td style={{ padding: '6px 10px', textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green)' }}>
                                            {fmt(job.flat_rate)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #2a2d3a', background: 'var(--surface2)' }}>
                      <td colSpan={3} style={{ padding: 12, fontWeight: 700, color: 'var(--text1)', fontSize: 13 }}>TOTALS</td>
                      <td style={{ padding: 12, textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                        {data.contractors.reduce((s, e) => s + e.total_jobs, 0)}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text1)' }}>
                        {data.contractors.reduce((s, e) => s + e.hours_logged, 0).toFixed(1)}h
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--green)', fontSize: 16 }}>
                        {fmt(data.totals.contractor_total)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── Gusto Export Hint ──────────────────────────────────────────── */}
          {runStatus === 'done' && (
            <div style={{
              marginTop: 16, padding: 16, borderRadius: 12,
              background: 'var(--accent)11', border: '1px solid var(--accent)33',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <FileText size={16} color="var(--accent)" />
                <span style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 14 }}>Ready to Export</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                Download the CSV and import into Gusto:
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => handleGustoExport('w2')} disabled={exporting} style={{
                  padding: '8px 14px', borderRadius: 8, border: '1px solid var(--accent)',
                  background: 'var(--accent)22', color: 'var(--accent)', fontWeight: 600,
                  fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Download size={13} /> W2 Payroll CSV
                </button>
                <button onClick={() => handleGustoExport('1099')} disabled={exporting} style={{
                  padding: '8px 14px', borderRadius: 8, border: '1px solid var(--cyan)',
                  background: 'var(--cyan)22', color: 'var(--cyan)', fontWeight: 600,
                  fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Download size={13} /> 1099 Contractor CSV
                </button>
                <button onClick={() => handleGustoExport('hours')} disabled={exporting} style={{
                  padding: '8px 14px', borderRadius: 8, border: '1px solid var(--amber)',
                  background: 'var(--amber)22', color: 'var(--amber)', fontWeight: 600,
                  fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Download size={13} /> Hours Summary CSV
                </button>
              </div>
              <ol style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10, paddingLeft: 16, lineHeight: 1.7 }}>
                <li>Download the CSV file above</li>
                <li>Log into Gusto at gusto.com</li>
                <li>Go to Payroll &gt; Run Payroll &gt; Import</li>
                <li>Upload the CSV file</li>
                <li>Review and submit payroll</li>
              </ol>
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--text2)' }}>
          <DollarSign size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>Select a pay period to calculate</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Use the arrows above to navigate between weeks</div>
        </div>
      )}
    </div>
  )
}
