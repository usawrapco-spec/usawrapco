'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Profile } from '@/types'
import {
  User, DollarSign, TrendingUp, Edit2, Check, X, Loader2, ChevronRight, Settings
} from 'lucide-react'

interface EmpRow {
  id: string
  name: string
  email: string
  role: string
  avatar_url: string | null
  pay_type: string
  hourly_rate: number
  salary_amount: number
  salary_period: string
  commission_rate: number
  percent_job_rate: number
  worker_type: string
  pay_period_type: string
  period_pay: number
  ytd_pay: number
  has_settings: boolean
}

const PAY_TYPES = ['hourly', 'salary', 'commission', 'per_job', 'hybrid']
const WORKER_TYPES = ['employee', '1099', 'subcontractor']

function fmt(n: number) { return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }

export default function EmployeePayClient({ profile, runId }: { profile: Profile; runId?: string }) {
  const [employees, setEmployees] = useState<EmpRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<EmpRow | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<EmpRow>>({})
  const [saving, setSaving] = useState(false)

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/payroll/employee-pay' + (runId ? `?run_id=${runId}` : ''))
    const data = await res.json()
    setEmployees(data.employees || [])
    setLoading(false)
  }, [runId])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  const startEdit = (emp: EmpRow) => {
    setEditForm({
      pay_type: emp.pay_type,
      hourly_rate: emp.hourly_rate,
      salary_amount: emp.salary_amount,
      salary_period: emp.salary_period,
      commission_rate: emp.commission_rate,
      percent_job_rate: emp.percent_job_rate,
      worker_type: emp.worker_type,
      pay_period_type: emp.pay_period_type,
    })
    setEditing(true)
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    const res = await fetch('/api/payroll/employee-pay', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: selected.id, ...editForm }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { alert(data.error || 'Failed to save'); return }
    setEditing(false)
    await fetchEmployees()
    const updated = employees.find(e => e.id === selected.id)
    if (updated) setSelected({ ...updated, ...editForm } as EmpRow)
  }

  const payRateDisplay = (emp: EmpRow) => {
    if (emp.pay_type === 'hourly') return `${fmt(emp.hourly_rate)}/hr`
    if (emp.pay_type === 'salary') return `${fmt(emp.salary_amount)}/${emp.salary_period === 'annual' ? 'yr' : 'mo'}`
    if (emp.pay_type === 'commission') return `${emp.commission_rate}% comm.`
    if (emp.pay_type === 'per_job') return `${emp.percent_job_rate || 0}% of rev`
    if (emp.pay_type === 'hybrid') return `${fmt(emp.hourly_rate)}/hr + ${emp.commission_rate}%`
    return '—'
  }

  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--surface2)', border: '1px solid #2a2d3a',
    borderRadius: 8, padding: '8px 12px', color: 'var(--text1)', fontSize: 13, outline: 'none'
  }
  const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--text2)', marginBottom: 4, display: 'block', fontWeight: 600, textTransform: 'uppercase' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, height: 'calc(100vh - 240px)' }}>
      {/* Employee list */}
      <div style={{ overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>
            Employee Pay ({employees.length})
          </h2>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Click a row to view & edit pay settings</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></div>
        ) : (
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                  {['Employee', 'Role', 'Pay Type', 'Rate', 'This Period', 'YTD Pay', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}
                    onClick={() => { setSelected(emp); setEditing(false) }}
                    style={{
                      borderBottom: '1px solid #1a1d27', cursor: 'pointer',
                      background: selected?.id === emp.id ? 'var(--accent)11' : 'transparent',
                      transition: 'background 0.1s'
                    }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)33', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={14} color="var(--accent)" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text1)' }}>{emp.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#2a2d3a', color: 'var(--text2)', fontWeight: 600 }}>
                        {(emp.role || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {emp.has_settings ? (
                        <span style={{ fontSize: 12, color: 'var(--text1)', textTransform: 'capitalize' }}>{(emp.pay_type || '').replace(/_/g, ' ')}</span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--amber)' }}>Not configured</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text1)' }}>
                      {emp.has_settings ? payRateDisplay(emp) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)' }}>
                      {emp.period_pay > 0 ? fmt(emp.period_pay) : <span style={{ color: 'var(--text3)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                      {emp.ytd_pay > 0 ? fmt(emp.ytd_pay) : <span style={{ color: 'var(--text3)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <ChevronRight size={14} color="var(--text3)" />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #2a2d3a', background: 'var(--surface2)' }}>
                  <td colSpan={4} style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text1)', fontSize: 13 }}>TOTALS</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
                    {fmt(employees.reduce((s, e) => s + e.period_pay, 0))}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                    {fmt(employees.reduce((s, e) => s + e.ytd_pay, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div style={{ overflowY: 'auto' }}>
        {!selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text2)' }}>
            <User size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div style={{ fontSize: 14 }}>Select an employee to view details</div>
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid #2a2d3a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)33', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={20} color="var(--accent)" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text1)' }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{(selected.role || '').replace(/_/g, ' ')} · {selected.worker_type}</div>
                </div>
              </div>
              {!editing && (
                <button onClick={() => startEdit(selected)} style={{
                  padding: '7px 12px', borderRadius: 8, border: '1px solid #2a2d3a', cursor: 'pointer',
                  background: 'transparent', color: 'var(--accent)', fontWeight: 600, fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  <Edit2 size={12} /> Edit Pay
                </button>
              )}
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, borderBottom: '1px solid #2a2d3a' }}>
              {[
                { label: 'This Period', value: fmt(selected.period_pay), color: 'var(--green)', icon: DollarSign },
                { label: 'YTD Pay', value: fmt(selected.ytd_pay), color: 'var(--accent)', icon: TrendingUp },
              ].map(s => {
                const Icon = s.icon
                return (
                  <div key={s.label} style={{ padding: '16px', background: 'var(--surface2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <Icon size={12} color={s.color} />
                      <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: s.color }}>{s.value}</div>
                  </div>
                )
              })}
            </div>

            {/* Pay settings (view or edit) */}
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Settings size={14} color="var(--text2)" />
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text1)' }}>Pay Settings</span>
              </div>

              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={lbl}>Pay Type</label>
                    <select value={editForm.pay_type || 'hourly'} onChange={e => setEditForm(p => ({ ...p, pay_type: e.target.value }))} style={inp}>
                      {PAY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  {['hourly', 'hybrid'].includes(editForm.pay_type || '') && (
                    <div>
                      <label style={lbl}>Hourly Rate ($)</label>
                      <input type="number" min="0" step="0.01" value={editForm.hourly_rate || ''} onChange={e => setEditForm(p => ({ ...p, hourly_rate: parseFloat(e.target.value) || 0 }))} style={inp} />
                    </div>
                  )}
                  {editForm.pay_type === 'salary' && (
                    <>
                      <div>
                        <label style={lbl}>Salary Amount ($)</label>
                        <input type="number" min="0" step="100" value={editForm.salary_amount || ''} onChange={e => setEditForm(p => ({ ...p, salary_amount: parseFloat(e.target.value) || 0 }))} style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>Salary Period</label>
                        <select value={editForm.salary_period || 'annual'} onChange={e => setEditForm(p => ({ ...p, salary_period: e.target.value }))} style={inp}>
                          <option value="annual">Annual</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    </>
                  )}
                  {['commission', 'hybrid'].includes(editForm.pay_type || '') && (
                    <div>
                      <label style={lbl}>Commission Rate (%)</label>
                      <input type="number" min="0" max="100" step="0.1" value={editForm.commission_rate || ''} onChange={e => setEditForm(p => ({ ...p, commission_rate: parseFloat(e.target.value) || 0 }))} style={inp} />
                    </div>
                  )}
                  {editForm.pay_type === 'per_job' && (
                    <div>
                      <label style={lbl}>Job Pay % (of revenue)</label>
                      <input type="number" min="0" max="100" step="0.1" value={editForm.percent_job_rate || ''} onChange={e => setEditForm(p => ({ ...p, percent_job_rate: parseFloat(e.target.value) || 0 }))} style={inp} />
                    </div>
                  )}
                  <div>
                    <label style={lbl}>Worker Type</label>
                    <select value={editForm.worker_type || 'employee'} onChange={e => setEditForm(p => ({ ...p, worker_type: e.target.value }))} style={inp}>
                      {WORKER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #2a2d3a', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <X size={13} /> Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '8px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />} Save Settings
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Pay Type', value: selected.pay_type.replace(/_/g, ' ') },
                    selected.pay_type === 'hourly' || selected.pay_type === 'hybrid' ? { label: 'Hourly Rate', value: fmt(selected.hourly_rate) } : null,
                    selected.pay_type === 'salary' ? { label: 'Salary', value: `${fmt(selected.salary_amount)} / ${selected.salary_period}` } : null,
                    selected.commission_rate > 0 ? { label: 'Commission Rate', value: `${selected.commission_rate}%` } : null,
                    selected.percent_job_rate > 0 ? { label: 'Job Pay %', value: `${selected.percent_job_rate}% of revenue` } : null,
                    { label: 'Worker Type', value: selected.worker_type },
                    { label: 'Pay Period', value: selected.pay_period_type },
                  ].filter(Boolean).map((row: any) => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a1d27' }}>
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{row.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', textTransform: 'capitalize' }}>{row.value}</span>
                    </div>
                  ))}
                  {!selected.has_settings && (
                    <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--amber)11', border: '1px solid var(--amber)44', borderRadius: 8, fontSize: 12, color: 'var(--amber)' }}>
                      No pay settings configured. Click "Edit Pay" to set up.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
