'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Shield,
  AlertTriangle,
  Loader2,
  User,
  Briefcase,
  Play,
  Check,
  X,
  CreditCard,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Props {
  profile: Profile
  period: any
  records: any[]
  timeEntries: any[]
  workSummaries: any[]
  paySettings: any[]
}

/* ------------------------------------------------------------------ */
/*  Style Helpers                                                     */
/* ------------------------------------------------------------------ */

const mono: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontVariantNumeric: 'tabular-nums',
}

const headerFont: React.CSSProperties = {
  fontFamily: 'Barlow Condensed, sans-serif',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
}

const card: React.CSSProperties = {
  background: '#161920',
  border: '1px solid #1e2330',
  borderRadius: 12,
}

const cardInner: React.CSSProperties = {
  background: '#13151c',
  border: '1px solid #1e2330',
  borderRadius: 8,
}

const btn = (bg: string, color = '#fff'): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  borderRadius: 8,
  border: 'none',
  background: bg,
  color,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'opacity .15s',
})

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n)
}

function fmtDate(d: string | null): string {
  if (!d) return '--'
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return d
  }
}

function fmtTime(d: string | null): string {
  if (!d) return '--'
  try {
    return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return d
  }
}

function fmtHours(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

const statusColors: Record<string, { bg: string; text: string }> = {
  open: { bg: 'rgba(79,127,255,0.15)', text: '#4f7fff' },
  processing: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  paid: { bg: 'rgba(34,192,122,0.15)', text: '#22c07a' },
  cancelled: { bg: 'rgba(242,90,90,0.15)', text: '#f25a5a' },
  draft: { bg: 'rgba(90,96,128,0.15)', text: '#5a6080' },
  approved: { bg: 'rgba(34,211,238,0.15)', text: '#22d3ee' },
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function PayPeriodDetailClient({
  profile,
  period,
  records,
  timeEntries,
  workSummaries,
  paySettings,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<string | null>(null)
  const [processingAll, setProcessingAll] = useState(false)
  const [processingPayroll, setProcessingPayroll] = useState(false)

  // Group time entries and summaries by user
  const entriesByUser = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const entry of timeEntries) {
      const uid = entry.user_id
      if (!map.has(uid)) map.set(uid, [])
      map.get(uid)!.push(entry)
    }
    return map
  }, [timeEntries])

  const summariesByUser = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const s of workSummaries) {
      const uid = s.user_id
      if (!map.has(uid)) map.set(uid, [])
      map.get(uid)!.push(s)
    }
    return map
  }, [workSummaries])

  // Totals
  const totals = useMemo(() => {
    let regularHrs = 0, otHrs = 0, ptoHrs = 0, gross = 0, commission = 0, deductions = 0, net = 0
    for (const r of records) {
      regularHrs += r.regular_hours || 0
      otHrs += r.overtime_hours || 0
      ptoHrs += r.pto_hours || 0
      gross += r.gross_pay || 0
      commission += r.commission_pay || 0
      deductions += parseFloat(r.deductions?.reduce?.((s: number, d: any) => s + (d.amount || 0), 0) || 0)
      net += r.net_pay || 0
    }
    return { regularHrs, otHrs, ptoHrs, gross, commission, deductions, net }
  }, [records])

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function approveRecord(recordId: string) {
    setLoading(recordId)
    try {
      await supabase
        .from('payroll_records')
        .update({ status: 'approved' })
        .eq('id', recordId)
      router.refresh()
    } catch (err) {
      console.error('Failed to approve record:', err)
    }
    setLoading(null)
  }

  async function bulkApproveAll() {
    setProcessingAll(true)
    try {
      const draftIds = records.filter((r) => r.status === 'draft').map((r) => r.id)
      if (draftIds.length > 0) {
        await supabase
          .from('payroll_records')
          .update({ status: 'approved' })
          .in('id', draftIds)
      }
      router.refresh()
    } catch (err) {
      console.error('Failed to bulk approve:', err)
    }
    setProcessingAll(false)
  }

  async function processPayroll() {
    setProcessingPayroll(true)
    try {
      // Update period status
      await supabase
        .from('pay_periods')
        .update({ status: 'processing' })
        .eq('id', period.id)

      // Mark all approved records as paid
      const approvedIds = records.filter((r) => r.status === 'approved').map((r) => r.id)
      if (approvedIds.length > 0) {
        await supabase
          .from('payroll_records')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .in('id', approvedIds)
      }

      // Update period totals and status
      await supabase
        .from('pay_periods')
        .update({
          status: 'paid',
          total_gross: totals.gross,
          total_net: totals.net,
        })
        .eq('id', period.id)

      router.refresh()
    } catch (err) {
      console.error('Failed to process payroll:', err)
    }
    setProcessingPayroll(false)
  }

  const statusStyle = statusColors[period.status] || statusColors.open
  const draftCount = records.filter((r) => r.status === 'draft').length
  const approvedCount = records.filter((r) => r.status === 'approved').length

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Back button */}
      <button
        onClick={() => router.push('/payroll')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', color: 'var(--text2)',
          fontSize: 13, cursor: 'pointer', marginBottom: 16,
        }}
      >
        <ArrowLeft size={16} /> Back to Payroll
      </button>

      {/* Period Header */}
      <div style={{ ...card, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ ...headerFont, fontSize: 28, color: 'var(--text1)', margin: 0 }}>
              Pay Period
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text2)', fontSize: 14 }}>
                <Calendar size={14} />
                {fmtDate(period.period_start)} - {fmtDate(period.period_end)}
              </span>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  background: statusStyle.bg,
                  color: statusStyle.text,
                  textTransform: 'uppercase',
                }}
              >
                {period.status}
              </span>
            </div>
            {period.pay_date && (
              <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 6 }}>
                <CreditCard size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                Pay Date: {fmtDate(period.pay_date)}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {draftCount > 0 && (
              <button
                onClick={bulkApproveAll}
                disabled={processingAll}
                style={{ ...btn('#4f7fff'), opacity: processingAll ? 0.6 : 1 }}
              >
                {processingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Approve All ({draftCount})
              </button>
            )}
            {approvedCount > 0 && period.status !== 'paid' && (
              <button
                onClick={processPayroll}
                disabled={processingPayroll}
                style={{ ...btn('#22c07a'), opacity: processingPayroll ? 0.6 : 1 }}
              >
                {processingPayroll ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Process Payroll
              </button>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 20 }}>
          {[
            { label: 'Employees', value: String(records.length), icon: User, color: '#4f7fff' },
            { label: 'Regular Hrs', value: totals.regularHrs.toFixed(1), icon: Clock, color: '#22d3ee' },
            { label: 'OT Hrs', value: totals.otHrs.toFixed(1), icon: AlertTriangle, color: '#f59e0b' },
            { label: 'PTO Hrs', value: totals.ptoHrs.toFixed(1), icon: Calendar, color: '#8b5cf6' },
            { label: 'Gross Pay', value: fmt(totals.gross), icon: DollarSign, color: '#22c07a' },
            { label: 'Commission', value: fmt(totals.commission), icon: Briefcase, color: '#4f7fff' },
            { label: 'Net Pay', value: fmt(totals.net), icon: DollarSign, color: '#22c07a' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                ...cardInner,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <stat.icon size={18} style={{ color: stat.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </div>
                <div style={{ ...mono, fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>
                  {stat.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Employee Rows Table */}
      <div style={{ ...card, overflow: 'hidden' }}>
        {/* Table Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 0.8fr 0.8fr 1fr 1fr 1fr 1fr 0.8fr 0.8fr',
            padding: '12px 16px',
            background: '#1a1d27',
            borderBottom: '1px solid #1e2330',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            gap: 8,
          }}
        >
          <span>Employee</span>
          <span style={{ textAlign: 'right' }}>Reg Hrs</span>
          <span style={{ textAlign: 'right' }}>OT</span>
          <span style={{ textAlign: 'right' }}>PTO</span>
          <span style={{ textAlign: 'right' }}>Gross</span>
          <span style={{ textAlign: 'right' }}>Commission</span>
          <span style={{ textAlign: 'right' }}>Deductions</span>
          <span style={{ textAlign: 'right' }}>Net</span>
          <span style={{ textAlign: 'center' }}>Status</span>
          <span style={{ textAlign: 'center' }}>Actions</span>
        </div>

        {records.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
            No payroll records for this period.
          </div>
        )}

        {records.map((record) => {
          const isExpanded = expandedRows.has(record.id)
          const emp = record.employee || {}
          const userEntries = entriesByUser.get(record.user_id) || []
          const userSummaries = summariesByUser.get(record.user_id) || []
          const recordDeductions = Array.isArray(record.deductions) ? record.deductions : []
          const totalDeductions = recordDeductions.reduce((s: number, d: any) => s + (d.amount || 0), 0)
          const recStatus = statusColors[record.status] || statusColors.draft

          return (
            <div key={record.id}>
              {/* Row */}
              <div
                onClick={() => toggleRow(record.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 0.8fr 0.8fr 1fr 1fr 1fr 1fr 0.8fr 0.8fr',
                  padding: '14px 16px',
                  borderBottom: '1px solid #1e2330',
                  cursor: 'pointer',
                  gap: 8,
                  alignItems: 'center',
                  transition: 'background .15s',
                  background: isExpanded ? 'rgba(79,127,255,0.04)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isExpanded ? <ChevronUp size={14} color="var(--text3)" /> : <ChevronDown size={14} color="var(--text3)" />}
                  <div>
                    <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 14 }}>{emp.name || 'Unknown'}</div>
                    <div style={{ color: 'var(--text3)', fontSize: 12 }}>{emp.role || '--'}</div>
                  </div>
                </div>
                <div style={{ ...mono, textAlign: 'right', color: 'var(--text1)', fontSize: 13 }}>
                  {(record.regular_hours || 0).toFixed(1)}
                </div>
                <div style={{ ...mono, textAlign: 'right', color: record.overtime_hours > 0 ? '#f59e0b' : 'var(--text2)', fontSize: 13 }}>
                  {(record.overtime_hours || 0).toFixed(1)}
                </div>
                <div style={{ ...mono, textAlign: 'right', color: record.pto_hours > 0 ? '#8b5cf6' : 'var(--text2)', fontSize: 13 }}>
                  {(record.pto_hours || 0).toFixed(1)}
                </div>
                <div style={{ ...mono, textAlign: 'right', color: 'var(--text1)', fontSize: 13 }}>
                  {fmt(record.gross_pay || 0)}
                </div>
                <div style={{ ...mono, textAlign: 'right', color: record.commission_pay > 0 ? '#4f7fff' : 'var(--text2)', fontSize: 13 }}>
                  {fmt(record.commission_pay || 0)}
                </div>
                <div style={{ ...mono, textAlign: 'right', color: 'var(--text2)', fontSize: 13 }}>
                  {fmt(totalDeductions)}
                </div>
                <div style={{ ...mono, textAlign: 'right', color: '#22c07a', fontWeight: 700, fontSize: 13 }}>
                  {fmt(record.net_pay || 0)}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      background: recStatus.bg,
                      color: recStatus.text,
                      textTransform: 'uppercase',
                    }}
                  >
                    {record.status}
                  </span>
                </div>
                <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 4 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {record.status === 'draft' && (
                    <button
                      onClick={() => approveRecord(record.id)}
                      disabled={loading === record.id}
                      title="Approve"
                      style={{
                        background: 'rgba(34,192,122,0.15)',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        color: '#22c07a',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {loading === record.id ? <Loader2 size={14} /> : <Check size={14} />}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      window.location.href = `/api/pdf/pay-stub/${record.id}`
                    }}
                    title="Pay Stub PDF"
                    style={{
                      background: 'rgba(79,127,255,0.15)',
                      border: 'none',
                      borderRadius: 6,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      color: '#4f7fff',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <FileText size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div style={{ background: 'rgba(79,127,255,0.02)', borderBottom: '1px solid #1e2330', padding: '16px 24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {/* Time Entries */}
                    <div>
                      <h4 style={{ ...headerFont, fontSize: 14, color: 'var(--text1)', margin: '0 0 12px' }}>
                        <Clock size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                        Time Entries ({userEntries.length})
                      </h4>
                      {userEntries.length === 0 ? (
                        <div style={{ color: 'var(--text3)', fontSize: 13 }}>No time entries for this period.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {userEntries.map((entry: any) => {
                            const duration = entry.duration_minutes ? fmtHours(entry.duration_minutes) : '--'
                            const entryDate = new Date(entry.clock_in).toLocaleDateString('en-US', {
                              weekday: 'short', month: 'short', day: 'numeric',
                            })
                            const matchingSummary = userSummaries.find(
                              (s: any) => s.summary_date === new Date(entry.clock_in).toISOString().split('T')[0]
                            )

                            return (
                              <div
                                key={entry.id}
                                style={{
                                  ...cardInner,
                                  padding: '10px 12px',
                                  fontSize: 12,
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                  <span style={{ color: 'var(--text1)', fontWeight: 600 }}>{entryDate}</span>
                                  <span style={{
                                    ...mono,
                                    fontSize: 11,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: entry.entry_type === 'overtime'
                                      ? 'rgba(245,158,11,0.15)'
                                      : entry.entry_type === 'pto'
                                        ? 'rgba(139,92,246,0.15)'
                                        : 'rgba(79,127,255,0.1)',
                                    color: entry.entry_type === 'overtime'
                                      ? '#f59e0b'
                                      : entry.entry_type === 'pto'
                                        ? '#8b5cf6'
                                        : '#4f7fff',
                                  }}>
                                    {entry.entry_type}
                                  </span>
                                </div>
                                <div style={{ color: 'var(--text2)', marginBottom: 2 }}>
                                  {fmtTime(entry.clock_in)} - {entry.clock_out ? fmtTime(entry.clock_out) : 'Active'}
                                  <span style={{ ...mono, marginLeft: 8, color: 'var(--text1)' }}>{duration}</span>
                                </div>
                                {entry.job && (
                                  <div style={{ color: 'var(--accent)', fontSize: 11 }}>
                                    <Briefcase size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                    {entry.job.title} {entry.job.vehicle_desc ? `(${entry.job.vehicle_desc})` : ''}
                                  </div>
                                )}
                                {entry.project_notes && (
                                  <div style={{ color: 'var(--text2)', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                                    {entry.project_notes}
                                  </div>
                                )}
                                {(entry.ai_summary || matchingSummary?.ai_summary) && (
                                  <div style={{
                                    marginTop: 6,
                                    padding: '6px 8px',
                                    background: 'rgba(79,127,255,0.06)',
                                    borderRadius: 6,
                                    fontSize: 11,
                                    color: 'var(--text2)',
                                    borderLeft: '2px solid var(--accent)',
                                  }}>
                                    <Shield size={10} style={{ display: 'inline', marginRight: 4, color: 'var(--accent)' }} />
                                    AI Summary: {entry.ai_summary || matchingSummary?.ai_summary}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Commission Breakdown */}
                    <div>
                      <h4 style={{ ...headerFont, fontSize: 14, color: 'var(--text1)', margin: '0 0 12px' }}>
                        <DollarSign size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                        Earnings Breakdown
                      </h4>
                      <div style={{ ...cardInner, padding: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text2)', fontSize: 13 }}>Regular Pay ({(record.regular_hours || 0).toFixed(1)}h x {fmt(record.hourly_rate || 0)}/hr)</span>
                            <span style={{ ...mono, color: 'var(--text1)', fontSize: 13 }}>
                              {fmt((record.regular_hours || 0) * (record.hourly_rate || 0))}
                            </span>
                          </div>
                          {record.overtime_hours > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#f59e0b', fontSize: 13 }}>Overtime ({record.overtime_hours.toFixed(1)}h x {fmt((record.overtime_rate || (record.hourly_rate || 0) * 1.5))}/hr)</span>
                              <span style={{ ...mono, color: '#f59e0b', fontSize: 13 }}>
                                {fmt(record.overtime_hours * (record.overtime_rate || (record.hourly_rate || 0) * 1.5))}
                              </span>
                            </div>
                          )}
                          {record.commission_pay > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#4f7fff', fontSize: 13 }}>Commission</span>
                              <span style={{ ...mono, color: '#4f7fff', fontSize: 13 }}>{fmt(record.commission_pay)}</span>
                            </div>
                          )}
                          {record.bonus_pay > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#22d3ee', fontSize: 13 }}>Bonus</span>
                              <span style={{ ...mono, color: '#22d3ee', fontSize: 13 }}>{fmt(record.bonus_pay)}</span>
                            </div>
                          )}
                          {record.pto_hours > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#8b5cf6', fontSize: 13 }}>PTO ({record.pto_hours.toFixed(1)}h)</span>
                              <span style={{ ...mono, color: '#8b5cf6', fontSize: 13 }}>
                                {fmt(record.pto_hours * (record.hourly_rate || 0))}
                              </span>
                            </div>
                          )}

                          <div style={{ borderTop: '1px solid #1e2330', marginTop: 4, paddingTop: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                              <span style={{ color: 'var(--text1)', fontSize: 13 }}>Gross Pay</span>
                              <span style={{ ...mono, color: 'var(--text1)', fontSize: 14 }}>{fmt(record.gross_pay || 0)}</span>
                            </div>
                          </div>

                          {/* Deductions */}
                          {recordDeductions.length > 0 && (
                            <>
                              <div style={{ ...headerFont, fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>Deductions</div>
                              {recordDeductions.map((d: any, i: number) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text2)', fontSize: 12 }}>{d.name || d.type || 'Deduction'}</span>
                                  <span style={{ ...mono, color: '#f25a5a', fontSize: 12 }}>-{fmt(d.amount || 0)}</span>
                                </div>
                              ))}
                            </>
                          )}

                          {/* Taxes */}
                          {Array.isArray(record.taxes) && record.taxes.length > 0 && (
                            <>
                              <div style={{ ...headerFont, fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>Taxes</div>
                              {record.taxes.map((t: any, i: number) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text2)', fontSize: 12 }}>{t.name || t.type || 'Tax'}</span>
                                  <span style={{ ...mono, color: '#f25a5a', fontSize: 12 }}>-{fmt(t.amount || 0)}</span>
                                </div>
                              ))}
                            </>
                          )}

                          <div style={{ borderTop: '1px solid #1e2330', marginTop: 4, paddingTop: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                              <span style={{ color: '#22c07a', fontSize: 14 }}>Net Pay</span>
                              <span style={{ ...mono, color: '#22c07a', fontSize: 16, fontWeight: 700 }}>{fmt(record.net_pay || 0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        {record.status === 'draft' && (
                          <button
                            onClick={() => approveRecord(record.id)}
                            disabled={loading === record.id}
                            style={btn('#22c07a')}
                          >
                            {loading === record.id ? <Loader2 size={14} /> : <CheckCircle2 size={14} />}
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => {
                            window.location.href = `/api/pdf/pay-stub/${record.id}`
                          }}
                          style={btn('rgba(79,127,255,0.15)', '#4f7fff')}
                        >
                          <Download size={14} /> Pay Stub
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
