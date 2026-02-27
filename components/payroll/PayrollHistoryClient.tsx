'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Profile } from '@/types'
import {
  Clock, DollarSign, Users, Download, Loader2, ChevronDown,
  ChevronUp, FileText, Check, Lock,
} from 'lucide-react'

interface PayrollRun {
  id: string
  period_start: string
  period_end: string
  pay_date: string | null
  status: string
  total_gross: number
  total_net: number
  total_hours: number
  employee_count: number
  notes: string | null
  processed_at: string | null
  processor?: { id: string; name: string } | null
  created_at: string
}

interface LineItem {
  id: string
  user_id: string
  type: string
  description: string | null
  hours: number | null
  rate: number | null
  amount: number
  user?: { id: string; name: string; role: string }
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'var(--green)' },
  reviewing: { label: 'Reviewing', color: 'var(--amber)' },
  processing: { label: 'Processing', color: 'var(--cyan)' },
  processed: { label: 'Processed', color: 'var(--accent)' },
  paid: { label: 'Paid', color: 'var(--purple)' },
  cancelled: { label: 'Cancelled', color: 'var(--red)' },
}

const TYPE_LABELS: Record<string, string> = {
  regular_hours: 'Regular Hours', overtime_hours: 'Overtime', salary: 'Salary',
  per_job: 'Per-Job Pay', commission: 'Commission', mileage: 'Mileage Reimb.',
  expense: 'Expense Reimb.', bonus: 'Bonus', advance_deduction: 'Advance Deduction',
  holiday_pay: 'Holiday Pay', pto: 'PTO', other: 'Other',
}

function fmt(n: number) { return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }
function fmtDateShort(s: string): string {
  const d = new Date(s + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PayrollHistoryClient({ profile }: { profile: Profile }) {
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [lineItems, setLineItems] = useState<Record<string, LineItem[]>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/payroll/runs')
      .then(r => r.json())
      .then(d => { setRuns(d.runs || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const fetchDetail = async (runId: string) => {
    if (lineItems[runId]) {
      setExpandedRun(expandedRun === runId ? null : runId)
      return
    }
    setExpandedRun(runId)
    setDetailLoading(runId)
    try {
      const res = await fetch(`/api/payroll/runs/${runId}`)
      const data = await res.json()
      setLineItems(prev => ({ ...prev, [runId]: data.line_items || [] }))
    } catch { /* ignore */ }
    setDetailLoading(null)
  }

  const handleExport = async (run: PayrollRun) => {
    setExporting(run.id)
    try {
      const res = await fetch(`/api/payroll/runs/${run.id}/export?format=csv`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payroll_${run.period_start}_${run.period_end}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
    setExporting(null)
  }

  const pill = (status: string) => {
    const cfg = STATUS_CONFIG[status] || { label: status, color: 'var(--text2)' }
    return (
      <span style={{
        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
        background: cfg.color + '22', color: cfg.color, textTransform: 'uppercase',
      }}>{cfg.label}</span>
    )
  }

  // Group line items by employee
  const groupByEmployee = (items: LineItem[]) => {
    const groups: Record<string, { name: string; role: string; items: LineItem[]; total: number }> = {}
    for (const li of items) {
      const uid = li.user_id
      if (!groups[uid]) {
        groups[uid] = { name: li.user?.name || 'Unknown', role: li.user?.role || '', items: [], total: 0 }
      }
      groups[uid].items.push(li)
      groups[uid].total += li.amount
    }
    return Object.values(groups).sort((a, b) => b.total - a.total)
  }

  // YTD stats
  const ytdTotal = runs
    .filter(r => r.status === 'processed' || r.status === 'paid')
    .reduce((s, r) => s + (r.total_gross || 0), 0)
  const processedCount = runs.filter(r => r.status === 'processed' || r.status === 'paid').length

  return (
    <div>
      {/* ── Summary ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'YTD Payroll', value: fmt(ytdTotal), icon: DollarSign, color: 'var(--green)' },
          { label: 'Periods Processed', value: processedCount, icon: Check, color: 'var(--accent)' },
          { label: 'Total Runs', value: runs.length, icon: Clock, color: 'var(--cyan)' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 12, padding: '16px 18px', border: '1px solid #2a2d3a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                <Icon size={12} color={s.color} />
                <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: s.color }}>{s.value}</div>
            </div>
          )
        })}
      </div>

      {/* ── History Table ────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--text2)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginRight: 10 }} />
          Loading history...
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #2a2d3a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color="var(--accent)" />
            <span style={{ fontWeight: 700, color: 'var(--text1)' }}>Payroll History</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                {['', 'Period', 'Status', 'Employees', 'Total Gross', 'Pay Date', 'Processed', 'Actions'].map(h => (
                  <th key={h} style={{
                    textAlign: h === 'Period' || h === '' ? 'left' : h === 'Actions' ? 'center' : 'right',
                    padding: '10px 12px', fontSize: 10, color: 'var(--text2)',
                    fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map(run => {
                const isExpanded = expandedRun === run.id
                const items = lineItems[run.id]
                const groups = items ? groupByEmployee(items) : []
                return (
                  <>
                    <tr key={run.id} style={{ borderBottom: '1px solid #1a1d27', cursor: 'pointer' }}
                      onClick={() => fetchDetail(run.id)}>
                      <td style={{ padding: '12px 8px 12px 12px', width: 24 }}>
                        {isExpanded ? <ChevronUp size={14} color="var(--text3)" /> : <ChevronDown size={14} color="var(--text3)" />}
                      </td>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 13 }}>
                          {fmtDateShort(run.period_start)} — {fmtDateShort(run.period_end)}
                        </div>
                        {run.notes && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{run.notes}</div>}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right' }}>{pill(run.status)}</td>
                      <td style={{ padding: 12, textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text1)' }}>
                        {run.employee_count}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)' }}>
                        {fmt(run.total_gross)}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', fontSize: 12, color: 'var(--text2)' }}>
                        {run.pay_date ? fmtDateShort(run.pay_date) : '—'}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', fontSize: 12, color: 'var(--text2)' }}>
                        {run.processed_at ? fmtDateShort(run.processed_at.split('T')[0]) : '—'}
                        {run.processor && <span style={{ marginLeft: 4, color: 'var(--text3)' }}>by {run.processor.name}</span>}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleExport(run) }}
                          disabled={exporting === run.id}
                          style={{
                            padding: '5px 10px', borderRadius: 6, border: '1px solid #2a2d3a',
                            background: 'transparent', color: 'var(--text2)', fontSize: 12,
                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}>
                          {exporting === run.id
                            ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                            : <Download size={12} />}
                          CSV
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={run.id + '-detail'} style={{ background: 'var(--surface2)' }}>
                        <td colSpan={8} style={{ padding: '12px 20px 16px' }}>
                          {detailLoading === run.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 20, color: 'var(--text2)' }}>
                              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading details...
                            </div>
                          ) : groups.length === 0 ? (
                            <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>
                              No line items recorded for this period
                            </div>
                          ) : (
                            <>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase' }}>
                                Per-Employee Breakdown
                              </div>
                              {groups.map(g => (
                                <div key={g.name} style={{ marginBottom: 10, padding: '10px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid #2a2d3a' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <div>
                                      <span style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 13 }}>{g.name}</span>
                                      <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6, textTransform: 'capitalize' }}>{(g.role || '').replace(/_/g, ' ')}</span>
                                    </div>
                                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--green)', fontSize: 14 }}>
                                      {fmt(g.total)}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {g.items.map(li => (
                                      <span key={li.id} style={{
                                        fontSize: 11, padding: '2px 8px', borderRadius: 4,
                                        background: '#1a1d27', color: 'var(--text2)',
                                      }}>
                                        {TYPE_LABELS[li.type] || li.type}: {fmt(li.amount)}
                                        {li.hours ? ` (${li.hours}h)` : ''}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                    No payroll history yet. Run your first payroll from the Dashboard tab.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
