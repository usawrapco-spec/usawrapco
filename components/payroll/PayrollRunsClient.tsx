'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Profile } from '@/types'
import {
  DollarSign, Clock, Car, Receipt, Plus, Download, Check, X,
  ChevronDown, ChevronUp, AlertTriangle, Loader2, Play, Lock,
  User, TrendingUp, FileText, BarChart2, CreditCard, RefreshCw
} from 'lucide-react'

interface PayrollRun {
  id: string
  period_start: string
  period_end: string
  pay_date: string | null
  status: 'open' | 'reviewing' | 'processing' | 'processed' | 'paid' | 'cancelled'
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
  reference_type: string | null
  notes: string | null
  user?: { id: string; name: string; role: string; avatar_url: string | null }
}

interface EmployeePaySummary {
  user_id: string
  name: string
  role: string
  payType: string
  hourlyRate: number
  regularHours: number
  overtimeHours: number
  regularPay: number
  overtimePay: number
  commission: number
  mileage: number
  expenses: number
  bonuses: number
  advances: number
  gross: number
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
  holiday_pay: 'Holiday Pay', pto: 'PTO', other: 'Other'
}

function fmt(n: number) { return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }
function fmtHrs(h: number) { return h.toFixed(2) + 'h' }

export default function PayrollRunsClient({
  profile,
  employees,
  projects,
}: {
  profile: Profile
  employees: any[]
  projects: any[]
}) {
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null)
  const [runLineItems, setRunLineItems] = useState<LineItem[]>([])
  const [runLoading, setRunLoading] = useState(false)
  const [showCreateRun, setShowCreateRun] = useState(false)
  const [creating, setCreating] = useState(false)

  // Employee summaries for the selected run (editable)
  const [empSummaries, setEmpSummaries] = useState<EmployeePaySummary[]>([])
  const [bonusInputs, setBonusInputs] = useState<Record<string, string>>({})
  const [advanceInputs, setAdvanceInputs] = useState<Record<string, string>>({})
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({})

  // Pending mileage/expenses for the period
  const [pendingMileage, setPendingMileage] = useState<any[]>([])
  const [pendingExpenses, setPendingExpenses] = useState<any[]>([])
  const [pendingAdvances, setPendingAdvances] = useState<any[]>([])

  // Create run form
  const [newRunForm, setNewRunForm] = useState({
    period_start: '',
    period_end: '',
    pay_date: '',
    notes: '',
  })

  const [processing, setProcessing] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const fetchRuns = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/payroll/runs')
    const data = await res.json()
    setRuns(data.runs || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchRuns() }, [fetchRuns])

  const fetchRunDetail = async (run: PayrollRun) => {
    setSelectedRun(run)
    setRunLoading(true)
    const [runRes, mileageRes, expenseRes, advancesRes] = await Promise.all([
      fetch(`/api/payroll/runs/${run.id}`),
      fetch(`/api/mileage?status=approved&from=${run.period_start}&to=${run.period_end}`),
      fetch(`/api/expenses?status=approved&from=${run.period_start}&to=${run.period_end}`),
      fetch(`/api/advances`),
    ])
    const [runData, mileageData, expenseData, advData] = await Promise.all([
      runRes.json(), mileageRes.json(), expenseRes.json(), advancesRes.json()
    ])

    setRunLineItems(runData.line_items || [])
    setPendingMileage(mileageData.logs || [])
    setPendingExpenses(expenseData.expenses || [])
    setPendingAdvances((advData.advances || []).filter((a: any) => !a.fully_repaid))

    // Build employee summaries from time clock data (simplified - use existing timesheet data)
    // Group mileage and expenses by user
    const mileageByUser: Record<string, number> = {}
    for (const m of mileageData.logs || []) {
      mileageByUser[m.user_id] = (mileageByUser[m.user_id] || 0) + m.total_amount
    }
    const expenseByUser: Record<string, number> = {}
    for (const e of expenseData.expenses || []) {
      expenseByUser[e.user_id] = (expenseByUser[e.user_id] || 0) + e.amount
    }
    const advanceByUser: Record<string, number> = {}
    for (const a of advData.advances || []) {
      if (!a.fully_repaid) {
        const deduction = a.deduction_per_period || a.remaining_balance
        advanceByUser[a.user_id] = (advanceByUser[a.user_id] || 0) + deduction
      }
    }

    const summaries: EmployeePaySummary[] = employees.map(emp => {
      const mileage = mileageByUser[emp.id] || 0
      const expenses = expenseByUser[emp.id] || 0
      const advances = advanceByUser[emp.id] || 0
      // Stub hours — in production, load from time_clock_entries for the period
      const regularHours = 80 // placeholder biweekly
      const overtimeHours = 0
      const hourlyRate = 20 // would come from employee_pay_settings
      const regularPay = regularHours * hourlyRate
      const overtimePay = overtimeHours * hourlyRate * 1.5
      const gross = regularPay + overtimePay + mileage + expenses - advances
      return {
        user_id: emp.id,
        name: emp.name,
        role: emp.role,
        payType: 'hourly',
        hourlyRate,
        regularHours,
        overtimeHours,
        regularPay,
        overtimePay,
        commission: 0,
        mileage,
        expenses,
        bonuses: 0,
        advances,
        gross,
      }
    })
    setEmpSummaries(summaries)
    setRunLoading(false)
  }

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    const res = await fetch('/api/payroll/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRunForm),
    })
    const data = await res.json()
    setCreating(false)
    if (!res.ok) { alert(data.error || 'Failed to create'); return }
    setShowCreateRun(false)
    setNewRunForm({ period_start: '', period_end: '', pay_date: '', notes: '' })
    fetchRuns()
    if (data.run) fetchRunDetail(data.run)
  }

  const buildLineItems = () => {
    const items: any[] = []
    for (const emp of empSummaries) {
      if (emp.regularHours > 0) items.push({ user_id: emp.user_id, type: 'regular_hours', hours: emp.regularHours, rate: emp.hourlyRate, amount: emp.regularPay, description: 'Regular hours' })
      if (emp.overtimeHours > 0) items.push({ user_id: emp.user_id, type: 'overtime_hours', hours: emp.overtimeHours, rate: emp.hourlyRate * 1.5, amount: emp.overtimePay, description: 'Overtime' })
      if (emp.commission > 0) items.push({ user_id: emp.user_id, type: 'commission', amount: emp.commission, description: 'Sales commission' })
      if (emp.mileage > 0) items.push({ user_id: emp.user_id, type: 'mileage', amount: emp.mileage, description: 'Mileage reimbursement', reference_type: 'mileage_log' })
      if (emp.expenses > 0) items.push({ user_id: emp.user_id, type: 'expense', amount: emp.expenses, description: 'Expense reimbursement', reference_type: 'expense_report' })
      const bonus = parseFloat(bonusInputs[emp.user_id] || '0') || 0
      if (bonus > 0) items.push({ user_id: emp.user_id, type: 'bonus', amount: bonus, description: noteInputs[emp.user_id] || 'Bonus', notes: noteInputs[emp.user_id] || null })
      if (emp.advances > 0) items.push({ user_id: emp.user_id, type: 'advance_deduction', amount: -emp.advances, description: 'Advance repayment' })
    }
    return items
  }

  const handleProcess = async () => {
    if (!selectedRun) return
    if (!confirm(`Process payroll for ${selectedRun.period_start} – ${selectedRun.period_end}? This will lock the period and mark all approved items as paid.`)) return
    setProcessing(true)
    const lineItems = buildLineItems()
    const res = await fetch(`/api/payroll/runs/${selectedRun.id}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line_items: lineItems }),
    })
    const data = await res.json()
    setProcessing(false)
    if (!res.ok) { alert(data.error || 'Failed to process'); return }
    fetchRuns()
    if (data.run) setSelectedRun(data.run)
  }

  const handleExportCSV = async () => {
    if (!selectedRun) return
    setExportLoading(true)
    const res = await fetch(`/api/payroll/runs/${selectedRun.id}/export?format=csv`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll_${selectedRun.period_start}_${selectedRun.period_end}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--surface)', border: '1px solid #2a2d3a',
    borderRadius: 8, padding: '9px 12px', color: 'var(--text1)', fontSize: 14, outline: 'none'
  }
  const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }

  const pill = (status: string) => {
    const cfg = STATUS_CONFIG[status] || { label: status, color: 'var(--text2)' }
    return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: cfg.color + '22', color: cfg.color, textTransform: 'uppercase' }}>{cfg.label}</span>
  }

  const isProcessed = selectedRun?.status === 'processed' || selectedRun?.status === 'paid'

  const empGrossWithBonus = (emp: EmployeePaySummary) => {
    const bonus = parseFloat(bonusInputs[emp.user_id] || '0') || 0
    return emp.regularPay + emp.overtimePay + emp.commission + emp.mileage + emp.expenses + bonus - emp.advances
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, height: 'calc(100vh - 180px)' }}>
      {/* ── LEFT: Run list ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>Pay Periods</h2>
          <button onClick={() => setShowCreateRun(true)} style={{
            padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4
          }}>
            <Plus size={14} /> New Run
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text2)' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></div>
        ) : runs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)', fontSize: 13 }}>
            No payroll runs yet. Create one to get started.
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {runs.map(run => (
              <button key={run.id} onClick={() => fetchRunDetail(run)} style={{
                background: selectedRun?.id === run.id ? 'var(--accent)22' : 'var(--surface)',
                border: `1px solid ${selectedRun?.id === run.id ? 'var(--accent)' : '#2a2d3a'}`,
                borderRadius: 10, padding: 14, cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'all 0.15s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                    {run.period_start} – {run.period_end}
                  </div>
                  {pill(run.status)}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--green)', marginBottom: 2 }}>
                  {fmt(run.total_gross)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {run.employee_count} employee{run.employee_count !== 1 ? 's' : ''}
                  {run.pay_date && ` · Pay ${run.pay_date}`}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── RIGHT: Run detail ─────────────────────────────────────────────── */}
      <div style={{ overflowY: 'auto' }}>
        {!selectedRun ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text2)' }}>
            <FileText size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>Select a pay period to review</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Or create a new payroll run</div>
          </div>
        ) : runLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
          </div>
        ) : (
          <div>
            {/* Run header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, background: 'var(--surface)', borderRadius: 12, padding: 20, border: '1px solid #2a2d3a' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text1)', fontFamily: 'var(--font-barlow)' }}>
                  {selectedRun.period_start} — {selectedRun.period_end}
                </h2>
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  {pill(selectedRun.status)}
                  {selectedRun.pay_date && <span style={{ fontSize: 12, color: 'var(--text2)' }}>Pay date: {selectedRun.pay_date}</span>}
                  {selectedRun.processed_at && <span style={{ fontSize: 12, color: 'var(--text2)' }}>Processed: {selectedRun.processed_at.split('T')[0]}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {isProcessed && (
                  <button onClick={handleExportCSV} disabled={exportLoading} style={{
                    padding: '9px 14px', borderRadius: 8, border: '1px solid #2a2d3a', cursor: 'pointer',
                    background: 'transparent', color: 'var(--text1)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6
                  }}>
                    {exportLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />} Export CSV
                  </button>
                )}
                {!isProcessed && selectedRun.status === 'open' && (
                  <button onClick={handleProcess} disabled={processing} style={{
                    padding: '9px 18px', borderRadius: 8, border: 'none', cursor: processing ? 'not-allowed' : 'pointer',
                    background: 'var(--green)', color: '#fff', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6
                  }}>
                    {processing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
                    {processing ? 'Processing...' : 'Process Payroll'}
                  </button>
                )}
                {isProcessed && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green)', fontWeight: 600, fontSize: 13 }}>
                    <Lock size={14} /> Period Locked
                  </div>
                )}
              </div>
            </div>

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Gross', value: fmt(empSummaries.reduce((s, e) => s + empGrossWithBonus(e), 0)), icon: DollarSign, color: 'var(--green)' },
                { label: 'Employees', value: empSummaries.length, icon: User, color: 'var(--accent)' },
                { label: 'Mileage Reimb.', value: fmt(empSummaries.reduce((s, e) => s + e.mileage, 0)), icon: Car, color: 'var(--cyan)' },
                { label: 'Expense Reimb.', value: fmt(empSummaries.reduce((s, e) => s + e.expenses, 0)), icon: Receipt, color: 'var(--amber)' },
              ].map(stat => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} style={{ background: 'var(--surface)', borderRadius: 10, padding: '14px 16px', border: '1px solid #2a2d3a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Icon size={14} color={stat.color} />
                      <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase' }}>{stat.label}</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: stat.color }}>{stat.value}</div>
                  </div>
                )
              })}
            </div>

            {/* Pending items notice */}
            {!isProcessed && (pendingMileage.length > 0 || pendingExpenses.length > 0) && (
              <div style={{ background: 'var(--green)11', border: '1px solid var(--green)44', borderRadius: 10, padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Check size={16} color="var(--green)" />
                <span style={{ fontSize: 13, color: 'var(--text1)' }}>
                  Ready to include: <strong>{pendingMileage.length} mileage</strong> and <strong>{pendingExpenses.length} expense</strong> items approved for this period
                </span>
              </div>
            )}

            {/* Employee breakdown table */}
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a', overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #2a2d3a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart2 size={16} color="var(--accent)" />
                <span style={{ fontWeight: 700, color: 'var(--text1)' }}>Employee Pay Breakdown</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                      {['Employee', 'Reg Hrs', 'OT Hrs', 'Base Pay', 'Commission', 'Mileage', 'Expenses', 'Bonus', 'Advances', 'GROSS'].map(h => (
                        <th key={h} style={{ textAlign: h === 'Employee' ? 'left' : 'right', padding: '10px 12px', fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {empSummaries.map(emp => {
                      const bonus = parseFloat(bonusInputs[emp.user_id] || '0') || 0
                      const gross = empGrossWithBonus(emp)
                      return (
                        <tr key={emp.user_id} style={{ borderBottom: '1px solid #1a1d27' }}>
                          <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 13 }}>{emp.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text2)' }}>{emp.role.replace(/_/g, ' ')}</div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text1)' }}>{fmtHrs(emp.regularHours)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', color: emp.overtimeHours > 0 ? 'var(--amber)' : 'var(--text3)' }}>{fmtHrs(emp.overtimeHours)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text1)' }}>{fmt(emp.regularPay + emp.overtimePay)}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text1)' }}>{emp.commission > 0 ? fmt(emp.commission) : '—'}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', color: emp.mileage > 0 ? 'var(--cyan)' : 'var(--text3)' }}>{emp.mileage > 0 ? fmt(emp.mileage) : '—'}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', color: emp.expenses > 0 ? 'var(--amber)' : 'var(--text3)' }}>{emp.expenses > 0 ? fmt(emp.expenses) : '—'}</td>
                          <td style={{ padding: '12px' }}>
                            {!isProcessed ? (
                              <input type="number" step="0.01" min="0"
                                value={bonusInputs[emp.user_id] || ''}
                                onChange={e => setBonusInputs(p => ({ ...p, [emp.user_id]: e.target.value }))}
                                placeholder="0"
                                style={{ width: 80, background: 'var(--surface2)', border: '1px solid #2a2d3a', borderRadius: 6, padding: '4px 8px', color: 'var(--text1)', fontSize: 12, textAlign: 'right', outline: 'none' }}
                              />
                            ) : (
                              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: bonus > 0 ? 'var(--purple)' : 'var(--text3)' }}>{bonus > 0 ? fmt(bonus) : '—'}</span>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', color: emp.advances > 0 ? 'var(--red)' : 'var(--text3)' }}>
                            {emp.advances > 0 ? '-' + fmt(emp.advances) : '—'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)' }}>
                            {fmt(gross)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #2a2d3a', background: 'var(--surface2)' }}>
                      <td colSpan={3} style={{ padding: '12px', fontWeight: 700, color: 'var(--text1)', fontSize: 13 }}>TOTALS</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text1)' }}>{fmt(empSummaries.reduce((s, e) => s + e.regularPay + e.overtimePay, 0))}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text1)' }}>{fmt(empSummaries.reduce((s, e) => s + e.commission, 0))}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>{fmt(empSummaries.reduce((s, e) => s + e.mileage, 0))}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>{fmt(empSummaries.reduce((s, e) => s + e.expenses, 0))}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--purple)' }}>{fmt(empSummaries.reduce((s, e) => s + (parseFloat(bonusInputs[e.user_id] || '0') || 0), 0))}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>-{fmt(empSummaries.reduce((s, e) => s + e.advances, 0))}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--green)', fontSize: 16 }}>
                        {fmt(empSummaries.reduce((s, e) => s + empGrossWithBonus(e), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Existing line items (after processing) */}
            {isProcessed && runLineItems.length > 0 && (
              <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #2a2d3a' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text1)' }}>Processed Line Items ({runLineItems.length})</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                      {['Employee', 'Type', 'Hours', 'Rate', 'Amount', 'Notes'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {runLineItems.map(li => (
                      <tr key={li.id} style={{ borderBottom: '1px solid #1a1d27' }}>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text1)' }}>{li.user?.name || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text2)' }}>{TYPE_LABELS[li.type] || li.type}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>{li.hours ? fmtHrs(li.hours) : '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>{li.rate ? fmt(li.rate) : '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, color: li.amount < 0 ? 'var(--red)' : 'var(--green)' }}>{fmt(li.amount)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text3)' }}>{li.description || li.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CREATE RUN MODAL ──────────────────────────────────────────────── */}
      {showCreateRun && (
        <div style={{ position: 'fixed', inset: 0, background: '#000a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 32, width: 420, border: '1px solid #2a2d3a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>New Pay Period</h2>
              <button onClick={() => setShowCreateRun(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateRun}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Period Start *</label>
                <input type="date" value={newRunForm.period_start} onChange={e => setNewRunForm(p => ({ ...p, period_start: e.target.value }))} style={inputStyle} required />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Period End *</label>
                <input type="date" value={newRunForm.period_end} onChange={e => setNewRunForm(p => ({ ...p, period_end: e.target.value }))} style={inputStyle} required />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Pay Date</label>
                <input type="date" value={newRunForm.pay_date} onChange={e => setNewRunForm(p => ({ ...p, pay_date: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Notes</label>
                <input value={newRunForm.notes} onChange={e => setNewRunForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowCreateRun(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #2a2d3a', cursor: 'pointer', background: 'transparent', color: 'var(--text2)', fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={creating} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--accent)', color: '#fff', fontWeight: 700 }}>
                  {creating ? 'Creating...' : 'Create Pay Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
