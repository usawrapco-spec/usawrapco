'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  DollarSign,
  Users,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Play,
  Download,
  Settings,
  AlertTriangle,
  Loader2,
  Calendar,
  Briefcase,
  Shield,
  CreditCard,
  Percent,
  Timer,
  FileText,
  Check,
  X,
  Edit3,
  Save,
  MoreVertical,
  RefreshCw,
} from 'lucide-react'

/* ─── Types ──────────────────────────────────────────────────────────── */

interface Props {
  profile: Profile
  employees: any[]
  projects: any[]
}

type TabId = 'periods' | 'settings'

type PayPeriodStatus = 'draft' | 'pending_approval' | 'approved' | 'processed' | 'paid'
type PayType = 'hourly' | 'salary' | 'commission_only' | 'hourly_commission'
type PayrollRecordStatus = 'pending' | 'approved' | 'processed'

interface PayPeriod {
  id: string
  org_id: string
  period_start: string
  period_end: string
  status: PayPeriodStatus
  total_hours: number
  total_gross_pay: number
  created_at: string
}

interface PayrollRecord {
  id: string
  pay_period_id: string
  user_id: string
  profile: { name: string } | null
  regular_hours: number
  overtime_hours: number
  pto_hours: number
  regular_pay: number
  total_gross_pay: number
  commission_pay: number
  deductions: number
  net_pay: number
  status: PayrollRecordStatus
  approved_by: string | null
  breakdown: any | null
  time_entries: TimeEntry[]
  commission_breakdown: CommissionItem[]
}

interface TimeEntry {
  id: string
  clock_in: string
  clock_out: string | null
  duration_minutes: number
  entry_type: string
  job_title: string | null
  project_notes: string | null
}

interface CommissionItem {
  job_title: string
  source_type: string
  gross_profit: number
  rate: number
  amount: number
}

interface EmployeePaySetting {
  id: string
  user_id: string
  profile: { name: string } | null
  pay_type: PayType
  hourly_rate: number
  salary_amount: number
  commission_rate: number
  overtime_eligible: boolean
  salary_period: string | null
  per_job_rate: number
  percent_job_rate: number
  pay_period_type: string | null
  worker_type: string | null
  auto_approve_expenses_under: number | null
  gusto_employee_id: string | null
}

/* ─── Constants ──────────────────────────────────────────────────────── */

const BIWEEKLY_MS = 14 * 24 * 60 * 60 * 1000
const ANCHOR_DATE = new Date(2026, 0, 5) // Jan 5, 2026 Monday

/* ─── Style Helpers ──────────────────────────────────────────────────── */

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

const sectionLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#8b95a5',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  marginBottom: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const btnPrimary: React.CSSProperties = {
  background: '#4f7fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  cursor: 'pointer',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  transition: 'all 200ms',
}

const btnGhost: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #1e2330',
  borderRadius: 8,
  padding: '8px 12px',
  cursor: 'pointer',
  color: '#8b95a5',
  fontSize: 13,
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  transition: 'all 200ms',
}

const btnSuccess: React.CSSProperties = {
  ...btnPrimary,
  background: '#22c07a',
}

const btnDanger: React.CSSProperties = {
  ...btnPrimary,
  background: '#f25a5a',
}

const colHeader: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#505a6b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
}

/* ─── Format Helpers ─────────────────────────────────────────────────── */

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

const fmtHrs = (n: number) => `${n.toFixed(1)} hrs`

function getPayPeriodStart(date: Date): Date {
  const diff = date.getTime() - ANCHOR_DATE.getTime()
  const periodsElapsed = Math.floor(diff / BIWEEKLY_MS)
  return new Date(ANCHOR_DATE.getTime() + periodsElapsed * BIWEEKLY_MS)
}

function getPayPeriodEnd(start: Date): Date {
  return new Date(start.getTime() + 13 * 24 * 60 * 60 * 1000)
}

function getPayDate(periodEnd: Date): Date {
  // Pay date is 5 days after period end (next Friday)
  return new Date(periodEnd.getTime() + 5 * 24 * 60 * 60 * 1000)
}

function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateShort(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatPeriodRange(start: Date | string, end: Date | string): string {
  return `${formatDateShort(start)} - ${formatDate(end)}`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function statusColor(status: PayPeriodStatus | PayrollRecordStatus): string {
  switch (status) {
    case 'draft': return '#8b95a5'
    case 'pending': return '#f59e0b'
    case 'pending_approval': return '#f59e0b'
    case 'approved': return '#4f7fff'
    case 'processed': return '#22c07a'
    case 'paid': return '#22c07a'
    default: return '#505a6b'
  }
}

function statusLabel(status: PayPeriodStatus | PayrollRecordStatus): string {
  switch (status) {
    case 'draft': return 'Draft'
    case 'pending': return 'Pending'
    case 'pending_approval': return 'Pending Approval'
    case 'approved': return 'Approved'
    case 'processed': return 'Processed'
    case 'paid': return 'Paid'
    default: return status
  }
}

function payTypeLabel(pt: PayType): string {
  switch (pt) {
    case 'hourly': return 'Hourly'
    case 'salary': return 'Salary'
    case 'commission_only': return 'Commission Only'
    case 'hourly_commission': return 'Hourly + Commission'
    default: return pt
  }
}


/* ─── Component ──────────────────────────────────────────────────────── */

export default function EnhancedPayrollClient({ profile, employees, projects }: Props) {
  const supabase = createClient()

  /* ── State ────────────────────────────────────────────────────── */
  const [tab, setTab] = useState<TabId>('periods')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Pay periods
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([])
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null)
  const [periodRecords, setPeriodRecords] = useState<Record<string, PayrollRecord[]>>({})
  const [expandedRecords, setExpandedRecords] = useState<Record<string, boolean>>({})

  // Pay settings
  const [paySettings, setPaySettings] = useState<EmployeePaySetting[]>([])
  const [editingSettingId, setEditingSettingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<EmployeePaySetting>>({})

  // Period nav for header
  const currentPeriodStart = useMemo(() => getPayPeriodStart(new Date()), [])
  const currentPeriodEnd = useMemo(() => getPayPeriodEnd(currentPeriodStart), [currentPeriodStart])

  /* ── Data Loading ─────────────────────────────────────────────── */

  const loadPayPeriods = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('pay_periods')
        .select('id, org_id, period_start, period_end, status, total_hours, total_gross_pay, created_at')
        .eq('org_id', profile.org_id)
        .order('period_start', { ascending: false })
        .limit(12)

      if (err) throw err
      setPayPeriods(data || [])
    } catch {
      setPayPeriods([])
    }
  }, [profile.org_id])

  const loadPayrollRecords = useCallback(async (periodId: string) => {
    if (periodId in periodRecords) return
    // Skip DB query for demo/local IDs (not real UUIDs)
    if (periodId.startsWith('new-') || periodId.startsWith('local-')) {
      setPeriodRecords(prev => ({ ...prev, [periodId]: [] }))
      return
    }

    try {
      const { data, error: err } = await supabase
        .from('payroll_records')
        .select('*, profile:user_id(name)')
        .eq('pay_period_id', periodId)
        .order('created_at', { ascending: true })

      if (err) throw err
      setPeriodRecords(prev => ({ ...prev, [periodId]: data || [] }))
    } catch {
      setPeriodRecords(prev => ({ ...prev, [periodId]: [] }))
    }
  }, [periodRecords])

  const loadPaySettings = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('employee_pay_settings')
        .select('*, profile:user_id(name)')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: true })

      if (err) throw err
      setPaySettings(data || [])
    } catch {
      setPaySettings([])
    }
  }, [profile.org_id])

  const loadTimeClockData = useCallback(async (periodId: string, startDate: string, endDate: string) => {
    try {
      const { data } = await supabase
        .from('time_clock_entries')
        .select('*')
        .eq('org_id', profile.org_id)
        .gte('clock_in', startDate)
        .lte('clock_in', endDate)
        .order('clock_in', { ascending: true })

      return data || []
    } catch {
      return []
    }
  }, [profile.org_id])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([loadPayPeriods(), loadPaySettings()])
      setLoading(false)
    }
    init()
  }, [loadPayPeriods, loadPaySettings])

  // Clear messages
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 4000)
      return () => clearTimeout(t)
    }
  }, [success])

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 6000)
      return () => clearTimeout(t)
    }
  }, [error])

  /* ── Computed ──────────────────────────────────────────────────── */

  const currentPeriod = payPeriods[0]
  const totalHoursThisPeriod = currentPeriod?.total_hours || 0
  const estimatedPayroll = currentPeriod?.total_gross_pay || 0
  const pendingApprovalCount = useMemo(() => {
    if (!expandedPeriod || !periodRecords[expandedPeriod]) return 0
    return periodRecords[expandedPeriod].filter(r => r.status === 'pending').length
  }, [expandedPeriod, periodRecords])

  const globalPendingCount = useMemo(() => {
    return payPeriods.filter(p => p.status === 'pending_approval' || p.status === 'draft').length
  }, [payPeriods])

  /* ── Actions ──────────────────────────────────────────────────── */

  const handleRunPayroll = async () => {
    setSaving(true)
    try {
      const start = currentPeriodStart
      const end = currentPeriodEnd
      const payDate = getPayDate(end)

      const newPeriod = {
        org_id: profile.org_id,
        period_start: start.toISOString().split('T')[0],
        period_end: end.toISOString().split('T')[0],
        status: 'draft',
        total_hours: 0,
      }

      const { data, error: err } = await supabase
        .from('pay_periods')
        .insert(newPeriod)
        .select()
        .single()

      if (err) {
        // If table doesn't exist, add to demo
        const demoPeriod: PayPeriod = {
          id: `new-${Date.now()}`,
          org_id: profile.org_id,
          period_start: start.toISOString().split('T')[0],
          period_end: end.toISOString().split('T')[0],
          status: 'draft',
          total_hours: 0,
          total_gross_pay: 0,
          created_at: new Date().toISOString(),
        }
        setPayPeriods(prev => [demoPeriod, ...prev])
        setSuccess('Pay period created (demo mode)')
      } else if (data) {
        setPayPeriods(prev => [data, ...prev])
        setSuccess('Pay period created successfully')
      }
    } catch {
      setError('Failed to create pay period')
    }
    setSaving(false)
  }

  const handleApproveRecord = async (periodId: string, recordId: string) => {
    setPeriodRecords(prev => ({
      ...prev,
      [periodId]: (prev[periodId] || []).map(r =>
        r.id === recordId
          ? { ...r, status: 'approved' as PayrollRecordStatus, approved_by: profile.id, approved_at: new Date().toISOString() }
          : r
      ),
    }))

    try {
      await supabase
        .from('payroll_records')
        .update({ status: 'approved' })
        .eq('id', recordId)
    } catch {
      // Graceful - already updated locally
    }
  }

  const handleApproveAll = async (periodId: string) => {
    setPeriodRecords(prev => ({
      ...prev,
      [periodId]: (prev[periodId] || []).map(r => ({
        ...r,
        status: 'approved' as PayrollRecordStatus,
        approved_by: profile.id,
        approved_at: new Date().toISOString(),
      })),
    }))

    if (!periodId.startsWith('new-') && !periodId.startsWith('local-')) {
      try {
        await supabase
          .from('payroll_records')
          .update({ status: 'approved' })
          .eq('pay_period_id', periodId)
      } catch {
        // Graceful
      }
    }

    setSuccess('All records approved')
  }

  const handleProcessPayroll = async (periodId: string) => {
    setSaving(true)

    // Update period status
    setPayPeriods(prev => prev.map(p =>
      p.id === periodId ? { ...p, status: 'processed' as PayPeriodStatus } : p
    ))

    // Update all records
    setPeriodRecords(prev => ({
      ...prev,
      [periodId]: (prev[periodId] || []).map(r => ({
        ...r,
        status: 'processed' as PayrollRecordStatus,
      })),
    }))

    if (!periodId.startsWith('new-') && !periodId.startsWith('local-')) {
      try {
        await supabase
          .from('pay_periods')
          .update({ status: 'processed' })
          .eq('id', periodId)

        await supabase
          .from('payroll_records')
          .update({ status: 'processed' })
          .eq('pay_period_id', periodId)
      } catch {
        // Graceful
      }
    }

    setSuccess('Payroll processed successfully')
    setSaving(false)
  }

  const handleSaveSetting = async (setting: EmployeePaySetting) => {
    setSaving(true)
    const updated = { ...setting, ...editForm }

    setPaySettings(prev => prev.map(s => s.id === setting.id ? { ...s, ...editForm } as EmployeePaySetting : s))
    setEditingSettingId(null)
    setEditForm({})

    try {
      await supabase
        .from('employee_pay_settings')
        .update(editForm)
        .eq('id', setting.id)
    } catch {
      // Graceful
    }

    setSuccess('Pay settings updated')
    setSaving(false)
  }

  const handleExportCSV = (periodId: string) => {
    const records = periodRecords[periodId] || []
    const header = 'Employee,Regular Hrs,OT Hrs,PTO,Gross Pay,Commission,Deductions,Net Pay,Status\n'
    const rows = records.map(r =>
      `"${r.profile?.name || r.user_id}",${r.regular_hours},${r.overtime_hours},0,${r.total_gross_pay.toFixed(2)},${(r.commission_pay || 0).toFixed(2)},${r.deductions.toFixed(2)},${r.net_pay.toFixed(2)},${r.status}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll-${periodId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── Toggle Helpers ───────────────────────────────────────────── */

  const togglePeriod = (id: string) => {
    if (expandedPeriod === id) {
      setExpandedPeriod(null)
    } else {
      setExpandedPeriod(id)
      loadPayrollRecords(id)
    }
  }

  const toggleRecord = (id: string) => {
    setExpandedRecords(prev => ({ ...prev, [id]: !prev[id] }))
  }

  /* ── Loading State ────────────────────────────────────────────── */

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
        <Loader2 size={28} color="#4f7fff" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ marginLeft: 12, fontSize: 14, color: '#8b95a5' }}>Loading payroll data...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  /* ── Render ───────────────────────────────────────────────────── */

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>

      {/* ── Toasts ──────────────────────────────────────────── */}
      {success && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: '#22c07a',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 4px 20px rgba(34,192,122,0.3)',
        }}>
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}
      {error && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: '#f25a5a',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 4px 20px rgba(242,90,90,0.3)',
        }}>
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: '#22c07a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <DollarSign size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{
              ...headerFont,
              fontSize: 26,
              color: '#fff',
              margin: 0,
              lineHeight: 1.1,
            }}>
              Enhanced Payroll
            </h1>
            <p style={{ fontSize: 13, color: '#8b95a5', margin: 0, marginTop: 2 }}>
              Pay periods, approvals, and employee compensation
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Tab switcher */}
          {(['periods', 'settings'] as TabId[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? '#4f7fff15' : '#161920',
                border: `1px solid ${tab === t ? '#4f7fff40' : '#1e2330'}`,
                borderRadius: 8,
                padding: '8px 16px',
                cursor: 'pointer',
                color: tab === t ? '#4f7fff' : '#8b95a5',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 200ms',
              }}
            >
              {t === 'periods' ? <Calendar size={14} /> : <Settings size={14} />}
              {t === 'periods' ? 'Pay Periods' : 'Pay Settings'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Header Stats Row ────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        {[
          {
            label: 'Current Pay Period',
            value: formatPeriodRange(currentPeriodStart, currentPeriodEnd),
            icon: Calendar,
            color: '#4f7fff',
            useMono: false,
          },
          {
            label: 'Total Hours This Period',
            value: fmtHrs(totalHoursThisPeriod),
            icon: Clock,
            color: '#22d3ee',
            useMono: true,
          },
          {
            label: 'Estimated Payroll',
            value: fmt(estimatedPayroll),
            icon: DollarSign,
            color: '#22c07a',
            useMono: true,
          },
          {
            label: 'Pending Approval',
            value: `${globalPendingCount} period${globalPendingCount !== 1 ? 's' : ''}`,
            icon: AlertTriangle,
            color: globalPendingCount > 0 ? '#f59e0b' : '#22c07a',
            useMono: false,
          },
        ].map(stat => (
          <div key={stat.label} style={{ ...card, padding: 20, transition: 'all 200ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#8b95a5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {stat.label}
              </span>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `${stat.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <stat.icon size={16} color={stat.color} />
              </div>
            </div>
            <div style={{
              ...(stat.useMono ? mono : {}),
              fontSize: stat.useMono ? 22 : 16,
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.2,
            }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────── */}

      {tab === 'periods' && (
        <>
          {/* ── Pay Periods Table ──────────────────────────── */}
          <div style={{ ...card, overflow: 'hidden', marginBottom: 24 }}>

            {/* Table header bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid #1e2330',
            }}>
              <div style={{ ...sectionLabel, marginBottom: 0 }}>
                <FileText size={14} />
                Pay Periods
              </div>
              <button
                onClick={handleRunPayroll}
                disabled={saving}
                style={{
                  ...btnPrimary,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
                Run Payroll
              </button>
            </div>

            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2.2fr 1.2fr 1fr 1fr 1.2fr 1.2fr 40px',
              padding: '12px 20px',
              borderBottom: '1px solid #1e2330',
              background: '#13151c',
              gap: 8,
            }}>
              {['Period', 'Pay Date', 'Status', 'Total Hours', 'Gross Pay', 'Actions', ''].map(h => (
                <div key={h} style={colHeader}>{h}</div>
              ))}
            </div>

            {/* Period rows */}
            {payPeriods.map(period => {
              const isExpanded = expandedPeriod === period.id
              const recordsLoaded = period.id in periodRecords
              const records = periodRecords[period.id] ?? []
              const allApproved = records.length > 0 && records.every(r => r.status === 'approved' || r.status === 'processed')
              const anyPending = records.some(r => r.status === 'pending')

              return (
                <div key={period.id}>
                  {/* Period row */}
                  <div
                    onClick={() => togglePeriod(period.id)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2.2fr 1.2fr 1fr 1fr 1.2fr 1.2fr 40px',
                      padding: '14px 20px',
                      borderBottom: '1px solid #1e2330',
                      cursor: 'pointer',
                      transition: 'background 200ms',
                      background: isExpanded ? '#1a1d27' : 'transparent',
                      gap: 8,
                      alignItems: 'center',
                    }}
                    onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = '#1a1d2780' }}
                    onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div style={{ ...mono, fontSize: 13, fontWeight: 600, color: '#fff' }}>
                      {formatPeriodRange(period.period_start, period.period_end)}
                    </div>
                    <div style={{ ...mono, fontSize: 13, color: '#e8eaed' }}>
                      {formatDate(period.created_at)}
                    </div>
                    <div>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: statusColor(period.status),
                        background: `${statusColor(period.status)}15`,
                        padding: '3px 8px',
                        borderRadius: 4,
                      }}>
                        {statusLabel(period.status)}
                      </span>
                    </div>
                    <div style={{ ...mono, fontSize: 13, color: '#e8eaed' }}>
                      {fmtHrs(0)}
                    </div>
                    <div style={{ ...mono, fontSize: 14, fontWeight: 700, color: '#fff' }}>
                      {fmt(period.total_gross_pay)}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleExportCSV(period.id)}
                        title="Export CSV"
                        style={{
                          ...btnGhost,
                          padding: '6px 10px',
                          fontSize: 11,
                        }}
                      >
                        <Download size={12} />
                        CSV
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#505a6b' }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Expanded: Employee Payroll Table */}
                  {isExpanded && (
                    <div style={{
                      background: '#13151c',
                      borderBottom: '1px solid #1e2330',
                      padding: '20px 24px',
                    }}>
                      {/* Action bar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 16,
                      }}>
                        <div style={{ ...sectionLabel, marginBottom: 0 }}>
                          <Users size={14} />
                          Employee Payroll - {records.length} employee{records.length !== 1 ? 's' : ''}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {anyPending && (
                            <button
                              onClick={() => handleApproveAll(period.id)}
                              style={btnSuccess}
                            >
                              <CheckCircle2 size={14} />
                              Approve All
                            </button>
                          )}
                          {allApproved && period.status !== 'processed' && period.status !== 'paid' && (
                            <button
                              onClick={() => handleProcessPayroll(period.id)}
                              disabled={saving}
                              style={{
                                ...btnPrimary,
                                background: '#8b5cf6',
                                opacity: saving ? 0.6 : 1,
                              }}
                            >
                              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
                              Process Payroll
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Employee table header */}
                      <div style={{
                        ...cardInner,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 0.8fr 0.7fr 0.6fr 1fr 0.9fr 0.9fr 1fr 0.8fr 0.8fr 36px',
                          padding: '10px 16px',
                          background: '#1a1d27',
                          gap: 6,
                        }}>
                          {['Employee', 'Reg Hrs', 'OT Hrs', 'PTO', 'Gross Pay', 'Commission', 'Deductions', 'Net Pay', 'Status', 'Actions', ''].map(h => (
                            <div key={h} style={colHeader}>{h}</div>
                          ))}
                        </div>

                        {/* Employee rows */}
                        {records.map(record => {
                          const isRecordExpanded = expandedRecords[record.id] || false

                          return (
                            <div key={record.id}>
                              <div
                                onClick={() => toggleRecord(record.id)}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '2fr 0.8fr 0.7fr 0.6fr 1fr 0.9fr 0.9fr 1fr 0.8fr 0.8fr 36px',
                                  padding: '12px 16px',
                                  borderTop: '1px solid #1e2330',
                                  cursor: 'pointer',
                                  transition: 'background 200ms',
                                  background: isRecordExpanded ? '#161920' : 'transparent',
                                  gap: 6,
                                  alignItems: 'center',
                                }}
                                onMouseEnter={e => { if (!isRecordExpanded) (e.currentTarget as HTMLElement).style.background = '#16192080' }}
                                onMouseLeave={e => { if (!isRecordExpanded) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    background: '#4f7fff18',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: '#4f7fff',
                                    flexShrink: 0,
                                  }}>
                                    {(record.profile?.name || 'U').charAt(0)}
                                  </div>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                                    {record.profile?.name || record.user_id}
                                  </span>
                                </div>
                                <div style={{ ...mono, fontSize: 12, color: '#e8eaed' }}>
                                  {record.regular_hours.toFixed(1)}
                                </div>
                                <div style={{ ...mono, fontSize: 12, color: record.overtime_hours > 0 ? '#f59e0b' : '#505a6b' }}>
                                  {record.overtime_hours > 0 ? record.overtime_hours.toFixed(1) : '--'}
                                </div>
                                <div style={{ ...mono, fontSize: 12, color: record.pto_hours > 0 ? '#22d3ee' : '#505a6b' }}>
                                  {record.pto_hours > 0 ? record.pto_hours.toFixed(1) : '--'}
                                </div>
                                <div style={{ ...mono, fontSize: 13, fontWeight: 600, color: '#fff' }}>
                                  {fmt(record.total_gross_pay)}
                                </div>
                                <div style={{ ...mono, fontSize: 12, color: (record.commission_pay || 0) > 0 ? '#22c07a' : '#505a6b' }}>
                                  {(record.commission_pay || 0) > 0 ? fmt(record.commission_pay) : '--'}
                                </div>
                                <div style={{ ...mono, fontSize: 12, color: '#f25a5a' }}>
                                  {fmt(record.deductions)}
                                </div>
                                <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: '#22c07a' }}>
                                  {fmt(record.net_pay)}
                                </div>
                                <div>
                                  <span style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: statusColor(record.status),
                                    background: `${statusColor(record.status)}15`,
                                    padding: '2px 6px',
                                    borderRadius: 3,
                                  }}>
                                    {statusLabel(record.status)}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                                  {record.status === 'pending' && (
                                    <button
                                      onClick={() => handleApproveRecord(period.id, record.id)}
                                      title="Approve"
                                      style={{
                                        background: '#22c07a15',
                                        border: '1px solid #22c07a30',
                                        borderRadius: 6,
                                        padding: '4px 8px',
                                        cursor: 'pointer',
                                        color: '#22c07a',
                                        fontSize: 10,
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 3,
                                      }}
                                    >
                                      <Check size={10} />
                                    </button>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#505a6b' }}>
                                  {isRecordExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>
                              </div>

                              {/* Expanded record detail */}
                              {isRecordExpanded && (
                                <div style={{
                                  padding: '16px 20px',
                                  background: '#0d0f14',
                                  borderTop: '1px solid #1e2330',
                                }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                                    {/* Left: Time Entries */}
                                    <div>
                                      <div style={sectionLabel}>
                                        <Clock size={13} />
                                        Time Entries ({record.time_entries.length})
                                      </div>
                                      <div style={{ ...cardInner, overflow: 'hidden' }}>
                                        <div style={{
                                          display: 'grid',
                                          gridTemplateColumns: '1fr 1fr 1fr 0.8fr 2fr',
                                          padding: '8px 12px',
                                          background: '#1a1d27',
                                          gap: 6,
                                        }}>
                                          {['Date', 'In', 'Out', 'Hours', 'Job'].map(h => (
                                            <div key={h} style={{ ...colHeader, fontSize: 10 }}>{h}</div>
                                          ))}
                                        </div>
                                        {record.time_entries.length > 0 ? (
                                          record.time_entries.map((entry, i) => (
                                            <div key={entry.id} style={{
                                              display: 'grid',
                                              gridTemplateColumns: '1fr 1fr 1fr 0.8fr 2fr',
                                              padding: '8px 12px',
                                              borderTop: i > 0 ? '1px solid #1e2330' : 'none',
                                              gap: 6,
                                              alignItems: 'center',
                                            }}>
                                              <div style={{ ...mono, fontSize: 11, color: '#8b95a5' }}>
                                                {formatDateShort(entry.clock_in)}
                                              </div>
                                              <div style={{ ...mono, fontSize: 11, color: '#e8eaed' }}>
                                                {formatTime(entry.clock_in)}
                                              </div>
                                              <div style={{ ...mono, fontSize: 11, color: '#e8eaed' }}>
                                                {entry.clock_out ? formatTime(entry.clock_out) : '--'}
                                              </div>
                                              <div style={{ ...mono, fontSize: 11, color: '#fff', fontWeight: 600 }}>
                                                {(entry.duration_minutes / 60).toFixed(1)}
                                              </div>
                                              <div style={{ fontSize: 11, color: '#9299b5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {entry.job_title || '--'}
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <div style={{ padding: 16, textAlign: 'center', color: '#505a6b', fontSize: 12 }}>
                                            No time entries recorded
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Right: Commission Breakdown */}
                                    <div>
                                      <div style={sectionLabel}>
                                        <Briefcase size={13} />
                                        Commission Breakdown
                                      </div>
                                      {record.commission_breakdown.length > 0 ? (
                                        <div style={{ ...cardInner, overflow: 'hidden' }}>
                                          <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '2fr 1fr 1fr 0.7fr 1fr',
                                            padding: '8px 12px',
                                            background: '#1a1d27',
                                            gap: 6,
                                          }}>
                                            {['Job', 'Source', 'GP', 'Rate', 'Amount'].map(h => (
                                              <div key={h} style={{ ...colHeader, fontSize: 10 }}>{h}</div>
                                            ))}
                                          </div>
                                          {record.commission_breakdown.map((item, i) => (
                                            <div key={i} style={{
                                              display: 'grid',
                                              gridTemplateColumns: '2fr 1fr 1fr 0.7fr 1fr',
                                              padding: '8px 12px',
                                              borderTop: i > 0 ? '1px solid #1e2330' : 'none',
                                              gap: 6,
                                              alignItems: 'center',
                                            }}>
                                              <div style={{ fontSize: 11, color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {item.job_title}
                                              </div>
                                              <div>
                                                <span style={{
                                                  fontSize: 10,
                                                  fontWeight: 600,
                                                  color: item.source_type === 'outbound' ? '#22c07a' : item.source_type === 'inbound' ? '#4f7fff' : '#22d3ee',
                                                  background: `${item.source_type === 'outbound' ? '#22c07a' : item.source_type === 'inbound' ? '#4f7fff' : '#22d3ee'}15`,
                                                  padding: '2px 6px',
                                                  borderRadius: 3,
                                                  textTransform: 'capitalize',
                                                }}>
                                                  {item.source_type}
                                                </span>
                                              </div>
                                              <div style={{ ...mono, fontSize: 11, color: '#e8eaed' }}>
                                                {fmt(item.gross_profit)}
                                              </div>
                                              <div style={{ ...mono, fontSize: 11, color: '#8b95a5' }}>
                                                {(item.rate * 100).toFixed(1)}%
                                              </div>
                                              <div style={{ ...mono, fontSize: 11, fontWeight: 600, color: '#22c07a' }}>
                                                {fmt(item.amount)}
                                              </div>
                                            </div>
                                          ))}
                                          {/* Commission total */}
                                          <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '2fr 1fr 1fr 0.7fr 1fr',
                                            padding: '10px 12px',
                                            borderTop: '1px solid #1e2330',
                                            background: '#1a1d27',
                                            gap: 6,
                                            alignItems: 'center',
                                          }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#8b95a5', textTransform: 'uppercase' }}>
                                              Total Commission
                                            </div>
                                            <div />
                                            <div />
                                            <div />
                                            <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: '#22c07a' }}>
                                              {fmt(record.commission_breakdown.reduce((s, c) => s + c.amount, 0))}
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div style={{
                                          ...cardInner,
                                          padding: 20,
                                          textAlign: 'center',
                                          color: '#505a6b',
                                          fontSize: 12,
                                        }}>
                                          No commission jobs this period
                                        </div>
                                      )}

                                      {/* Quick actions */}
                                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                                        {record.status === 'pending' && (
                                          <button
                                            onClick={() => handleApproveRecord(period.id, record.id)}
                                            style={{
                                              ...btnSuccess,
                                              fontSize: 12,
                                              padding: '6px 12px',
                                            }}
                                          >
                                            <Check size={12} />
                                            Approve
                                          </button>
                                        )}
                                        <button
                                          onClick={() => {
                                            // Override action - could open a modal
                                            setSuccess('Override functionality coming soon')
                                          }}
                                          style={{
                                            ...btnGhost,
                                            fontSize: 12,
                                            padding: '6px 12px',
                                          }}
                                        >
                                          <Edit3 size={12} />
                                          Override
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {!recordsLoaded && (
                          <div style={{ padding: 32, textAlign: 'center', color: '#505a6b', fontSize: 13 }}>
                            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
                            <div>Loading employee records...</div>
                          </div>
                        )}
                        {recordsLoaded && records.length === 0 && (
                          <div style={{ padding: 32, textAlign: 'center', color: '#505a6b', fontSize: 13 }}>
                            No payroll records for this period
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {payPeriods.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: '#505a6b' }}>
                <Calendar size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No pay periods yet</div>
                <div style={{ fontSize: 12, color: '#505a6b' }}>Click "Run Payroll" to create your first pay period</div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'settings' && (
        <>
          {/* ── Employee Pay Settings ──────────────────────── */}
          <div style={{ ...card, overflow: 'hidden' }}>

            {/* Header bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid #1e2330',
            }}>
              <div style={{ ...sectionLabel, marginBottom: 0 }}>
                <Shield size={14} />
                Employee Pay Settings
              </div>
              <button
                onClick={() => loadPaySettings()}
                style={btnGhost}
              >
                <RefreshCw size={13} />
                Refresh
              </button>
            </div>

            {/* Settings cards */}
            <div style={{ padding: 20 }}>
              {paySettings.map(setting => {
                const isEditing = editingSettingId === setting.id

                return (
                  <div key={setting.id} style={{
                    ...cardInner,
                    marginBottom: 16,
                    overflow: 'hidden',
                  }}>
                    {/* Employee header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderBottom: '1px solid #1e2330',
                      background: '#1a1d27',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: '#4f7fff18',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#4f7fff',
                        }}>
                          {(setting.profile?.name || 'U').charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{setting.profile?.name || setting.user_id}</div>
                          <div style={{ fontSize: 11, color: '#505a6b' }}>
                            {payTypeLabel(setting.pay_type)}
                            {setting.overtime_eligible ? ' | OT Eligible' : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveSetting(setting)}
                              disabled={saving}
                              style={{
                                ...btnSuccess,
                                fontSize: 12,
                                padding: '6px 12px',
                              }}
                            >
                              <Save size={12} />
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingSettingId(null); setEditForm({}) }}
                              style={{
                                ...btnGhost,
                                fontSize: 12,
                                padding: '6px 10px',
                              }}
                            >
                              <X size={12} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingSettingId(setting.id)
                              setEditForm({
                                pay_type: setting.pay_type,
                                hourly_rate: setting.hourly_rate,
                                salary_amount: setting.salary_amount,
                                commission_rate: setting.commission_rate,
                                overtime_eligible: setting.overtime_eligible,
                              })
                            }}
                            style={{
                              ...btnGhost,
                              fontSize: 12,
                              padding: '6px 12px',
                            }}
                          >
                            <Edit3 size={12} />
                            Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Settings grid */}
                    <div style={{ padding: 16 }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: 16,
                      }}>
                        {/* Pay Type */}
                        <SettingField
                          label="Pay Type"
                          icon={<Briefcase size={12} color="#8b95a5" />}
                          isEditing={isEditing}
                          displayValue={payTypeLabel(setting.pay_type)}
                          editElement={
                            <select
                              value={(editForm.pay_type as string) || setting.pay_type}
                              onChange={e => setEditForm(prev => ({ ...prev, pay_type: e.target.value as PayType }))}
                              style={inputStyle}
                            >
                              <option value="hourly">Hourly</option>
                              <option value="salary">Salary</option>
                              <option value="commission_only">Commission Only</option>
                              <option value="hourly_commission">Hourly + Commission</option>
                            </select>
                          }
                        />

                        {/* Hourly Rate */}
                        <SettingField
                          label="Hourly Rate"
                          icon={<DollarSign size={12} color="#8b95a5" />}
                          isEditing={isEditing}
                          displayValue={fmt(setting.hourly_rate)}
                          editElement={
                            <input
                              type="number"
                              step="0.50"
                              value={editForm.hourly_rate ?? setting.hourly_rate}
                              onChange={e => setEditForm(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                              style={inputStyle}
                            />
                          }
                        />

                        {/* Salary Amount */}
                        <SettingField
                          label="Salary Amount"
                          icon={<DollarSign size={12} color="#8b95a5" />}
                          isEditing={isEditing}
                          displayValue={setting.salary_amount > 0 ? fmt(setting.salary_amount) : '--'}
                          editElement={
                            <input
                              type="number"
                              step="1000"
                              value={editForm.salary_amount ?? setting.salary_amount}
                              onChange={e => setEditForm(prev => ({ ...prev, salary_amount: parseFloat(e.target.value) || 0 }))}
                              style={inputStyle}
                            />
                          }
                        />

                        {/* Commission Rate */}
                        <SettingField
                          label="Commission Rate"
                          icon={<Percent size={12} color="#8b95a5" />}
                          isEditing={isEditing}
                          displayValue={setting.commission_rate > 0 ? `${(setting.commission_rate * 100).toFixed(1)}%` : '--'}
                          editElement={
                            <input
                              type="number"
                              step="0.5"
                              value={editForm.commission_rate !== undefined ? (editForm.commission_rate as number) * 100 : setting.commission_rate * 100}
                              onChange={e => setEditForm(prev => ({ ...prev, commission_rate: (parseFloat(e.target.value) || 0) / 100 }))}
                              style={inputStyle}
                              placeholder="%"
                            />
                          }
                        />

                        {/* OT Eligible */}
                        <SettingField
                          label="OT Eligible"
                          icon={<Timer size={12} color="#8b95a5" />}
                          isEditing={isEditing}
                          displayValue={setting.overtime_eligible ? 'Yes' : 'No'}
                          displayColor={setting.overtime_eligible ? '#22c07a' : '#f25a5a'}
                          editElement={
                            <div
                              onClick={() => setEditForm(prev => ({ ...prev, overtime_eligible: !(prev.overtime_eligible ?? setting.overtime_eligible) }))}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{
                                width: 36,
                                height: 20,
                                borderRadius: 10,
                                background: (editForm.overtime_eligible ?? setting.overtime_eligible) ? '#22c07a' : '#505a6b',
                                position: 'relative',
                                transition: 'background 200ms',
                              }}>
                                <div style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: '50%',
                                  background: '#fff',
                                  position: 'absolute',
                                  top: 2,
                                  left: (editForm.overtime_eligible ?? setting.overtime_eligible) ? 18 : 2,
                                  transition: 'left 200ms',
                                }} />
                              </div>
                              <span style={{ fontSize: 12, color: '#e8eaed' }}>
                                {(editForm.overtime_eligible ?? setting.overtime_eligible) ? 'Eligible' : 'Not Eligible'}
                              </span>
                            </div>
                          }
                        />

                      </div>
                    </div>
                  </div>
                )
              })}

              {paySettings.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: '#505a6b' }}>
                  <Users size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No employee pay settings</div>
                  <div style={{ fontSize: 12, color: '#505a6b' }}>Employee pay settings will appear here once configured</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  background: '#0d0f14',
  border: '1px solid #1e2330',
  borderRadius: 6,
  padding: '6px 10px',
  color: '#e8eaed',
  fontSize: 13,
  fontFamily: 'JetBrains Mono, monospace',
  width: '100%',
  outline: 'none',
  transition: 'border-color 200ms',
}

function SettingField({
  label,
  icon,
  isEditing,
  displayValue,
  displayColor,
  editElement,
}: {
  label: string
  icon: React.ReactNode
  isEditing: boolean
  displayValue: string
  displayColor?: string
  editElement?: React.ReactNode
}) {
  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 6,
      }}>
        {icon}
        <span style={{ fontSize: 10, fontWeight: 600, color: '#505a6b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
      </div>
      {isEditing && editElement ? (
        editElement
      ) : (
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13,
          fontWeight: 600,
          color: displayColor || '#e8eaed',
          padding: '6px 0',
        }}>
          {displayValue}
        </div>
      )}
    </div>
  )
}
