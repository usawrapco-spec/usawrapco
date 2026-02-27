'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Profile } from '@/types'
import {
  Clock, User, AlertTriangle, ChevronLeft, ChevronRight,
  Loader2, ChevronDown, ChevronUp, Plus, Check, X,
} from 'lucide-react'

interface TimeBlock {
  id: string
  user_id: string
  project_id: string | null
  title: string
  block_type: string
  start_at: string
  end_at: string
  notes: string | null
  hours: number
  date: string
  project_title: string | null
  vehicle_desc: string | null
}

interface EmployeeHours {
  user_id: string
  name: string
  role: string
  total_hours: number
  days_worked: number
  blocks: TimeBlock[]
  gaps: string[]
}

function getFridayStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = (day - 5 + 7) % 7
  d.setDate(d.getDate() - diff)
  return d
}

function getThursdayEnd(fri: Date): Date {
  const d = new Date(fri)
  d.setDate(d.getDate() + 6)
  return d
}

function fmtDate(d: Date): string { return d.toISOString().split('T')[0] }
function fmtDateShort(s: string): string {
  const d = new Date(s + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtDayName(s: string): string {
  const d = new Date(s + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}
function fmt(n: number) { return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }

export default function HoursTrackingClient({ profile }: { profile: Profile }) {
  const [periodStart, setPeriodStart] = useState(() => fmtDate(getFridayStart(new Date())))
  const [periodEnd, setPeriodEnd] = useState(() => fmtDate(getThursdayEnd(getFridayStart(new Date()))))
  const [employees, setEmployees] = useState<EmployeeHours[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [showAdjust, setShowAdjust] = useState<string | null>(null)
  const [adjustForm, setAdjustForm] = useState({ date: '', hours: '', reason: '' })
  const [adjusting, setAdjusting] = useState(false)

  const navigatePeriod = (dir: number) => {
    const current = new Date(periodStart + 'T12:00:00')
    current.setDate(current.getDate() + dir * 7)
    const newStart = getFridayStart(current)
    setPeriodStart(fmtDate(newStart))
    setPeriodEnd(fmtDate(getThursdayEnd(newStart)))
  }

  const fetchHours = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll/hours?from=${periodStart}&to=${periodEnd}`)
      const data = await res.json()
      if (res.ok) setEmployees(data.employees || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [periodStart, periodEnd])

  useEffect(() => { fetchHours() }, [fetchHours])

  const handleAdjust = async (userId: string) => {
    if (!adjustForm.date || !adjustForm.hours || !adjustForm.reason) return
    setAdjusting(true)
    try {
      const res = await fetch('/api/payroll/hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          date: adjustForm.date,
          hours: parseFloat(adjustForm.hours),
          reason: adjustForm.reason,
        }),
      })
      if (res.ok) {
        setShowAdjust(null)
        setAdjustForm({ date: '', hours: '', reason: '' })
        fetchHours()
      }
    } catch { /* ignore */ }
    setAdjusting(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--surface)', border: '1px solid #2a2d3a',
    borderRadius: 6, padding: '6px 10px', color: 'var(--text1)', fontSize: 13, outline: 'none',
  }

  return (
    <div>
      {/* ── Period Selector ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--surface)', borderRadius: 12, padding: '14px 20px',
        border: '1px solid #2a2d3a', marginBottom: 16,
      }}>
        <button onClick={() => navigatePeriod(-1)} style={{
          background: 'var(--surface2)', border: '1px solid #2a2d3a', borderRadius: 8,
          padding: '6px 8px', cursor: 'pointer', color: 'var(--text1)', display: 'flex',
        }}>
          <ChevronLeft size={18} />
        </button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', fontFamily: 'var(--font-barlow)' }}>
            {fmtDateShort(periodStart)} — {fmtDateShort(periodEnd)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)' }}>Hours Tracking (Fri – Thu)</div>
        </div>
        <button onClick={() => navigatePeriod(1)} style={{
          background: 'var(--surface2)', border: '1px solid #2a2d3a', borderRadius: 8,
          padding: '6px 8px', cursor: 'pointer', color: 'var(--text1)', display: 'flex',
        }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── Employee Hours Table ─────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--text2)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginRight: 10 }} />
          Loading hours...
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #2a2d3a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color="var(--accent)" />
            <span style={{ fontWeight: 700, color: 'var(--text1)' }}>Employee Hours</span>
            <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 'auto' }}>
              Click a row to view time entries and add adjustments
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                {['', 'Employee', 'Role', 'Total Hours', 'Days Worked', 'Avg Hrs/Day', 'Gaps'].map(h => (
                  <th key={h} style={{
                    textAlign: h === 'Employee' || h === 'Role' || h === '' ? 'left' : 'right',
                    padding: '10px 12px', fontSize: 10, color: 'var(--text2)',
                    fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const isExpanded = expandedRow === emp.user_id
                const avgPerDay = emp.days_worked > 0 ? emp.total_hours / emp.days_worked : 0
                const hasGaps = emp.gaps.length > 0
                return (
                  <>
                    <tr key={emp.user_id} style={{ borderBottom: '1px solid #1a1d27', cursor: 'pointer' }}
                      onClick={() => setExpandedRow(isExpanded ? null : emp.user_id)}>
                      <td style={{ padding: '12px 8px 12px 12px', width: 24 }}>
                        {isExpanded ? <ChevronUp size={14} color="var(--text3)" /> : <ChevronDown size={14} color="var(--text3)" />}
                      </td>
                      <td style={{ padding: 12, fontWeight: 600, color: 'var(--text1)', fontSize: 13 }}>{emp.name}</td>
                      <td style={{ padding: 12, fontSize: 12, color: 'var(--text2)', textTransform: 'capitalize' }}>
                        {(emp.role || '').replace(/_/g, ' ')}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text1)' }}>
                        {emp.total_hours.toFixed(1)}h
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text1)' }}>
                        {emp.days_worked}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>
                        {avgPerDay.toFixed(1)}h
                      </td>
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        {hasGaps ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--amber)', padding: '2px 8px', borderRadius: 20, background: 'var(--amber)22' }}>
                            <AlertTriangle size={11} /> {emp.gaps.length} missing
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--green)', padding: '2px 8px', borderRadius: 20, background: 'var(--green)22' }}>
                            <Check size={11} /> Complete
                          </span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={emp.user_id + '-detail'} style={{ background: 'var(--surface2)' }}>
                        <td colSpan={7} style={{ padding: '12px 20px 16px' }}>
                          {/* Time entries list */}
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase' }}>
                            Time Entries — {emp.blocks.length} entries
                          </div>
                          {emp.blocks.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                                  {['Date', 'Day', 'Type', 'Job / Title', 'Start', 'End', 'Hours', 'Notes'].map(h => (
                                    <th key={h} style={{
                                      textAlign: h === 'Hours' ? 'right' : 'left',
                                      padding: '6px 8px', fontSize: 10, color: 'var(--text3)', fontWeight: 600,
                                    }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {emp.blocks.map(b => (
                                  <tr key={b.id} style={{ borderBottom: '1px solid #1a1d2744' }}>
                                    <td style={{ padding: '6px 8px', fontSize: 12, color: 'var(--text1)' }}>{fmtDateShort(b.date)}</td>
                                    <td style={{ padding: '6px 8px', fontSize: 12, color: 'var(--text2)' }}>{fmtDayName(b.date)}</td>
                                    <td style={{ padding: '6px 8px' }}>
                                      <span style={{
                                        fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                                        background: b.block_type === 'install' ? 'var(--cyan)22' : b.block_type === 'production' ? 'var(--purple)22' : 'var(--text3)22',
                                        color: b.block_type === 'install' ? 'var(--cyan)' : b.block_type === 'production' ? 'var(--purple)' : 'var(--text3)',
                                        textTransform: 'uppercase',
                                      }}>{b.block_type}</span>
                                    </td>
                                    <td style={{ padding: '6px 8px', fontSize: 12, color: 'var(--text1)' }}>
                                      {b.project_title || b.title || '—'}
                                      {b.vehicle_desc && <span style={{ color: 'var(--text3)', marginLeft: 4 }}>({b.vehicle_desc})</span>}
                                    </td>
                                    <td style={{ padding: '6px 8px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>
                                      {new Date(b.start_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ padding: '6px 8px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>
                                      {new Date(b.end_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text1)' }}>
                                      {b.hours.toFixed(2)}h
                                    </td>
                                    <td style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text3)' }}>{b.notes || ''}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', marginBottom: 12 }}>
                              No time entries for this period
                            </div>
                          )}

                          {/* Gaps warning */}
                          {emp.gaps.length > 0 && (
                            <div style={{
                              padding: '10px 12px', borderRadius: 8, marginBottom: 12,
                              background: 'var(--amber)11', border: '1px solid var(--amber)33',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <AlertTriangle size={13} color="var(--amber)" />
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber)' }}>Missing time entries</span>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                                {emp.gaps.map(g => `${fmtDayName(g)} ${fmtDateShort(g)}`).join(', ')}
                              </div>
                            </div>
                          )}

                          {/* Manual adjustment */}
                          {showAdjust === emp.user_id ? (
                            <div style={{ padding: 12, borderRadius: 8, background: 'var(--surface)', border: '1px solid #2a2d3a' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', marginBottom: 8 }}>Manual Hour Adjustment</div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                  <label style={{ fontSize: 10, color: 'var(--text2)', display: 'block', marginBottom: 2 }}>Date</label>
                                  <input type="date" value={adjustForm.date}
                                    onChange={e => setAdjustForm(p => ({ ...p, date: e.target.value }))}
                                    style={inputStyle} />
                                </div>
                                <div style={{ width: 80 }}>
                                  <label style={{ fontSize: 10, color: 'var(--text2)', display: 'block', marginBottom: 2 }}>Hours</label>
                                  <input type="number" step="0.25" value={adjustForm.hours}
                                    onChange={e => setAdjustForm(p => ({ ...p, hours: e.target.value }))}
                                    style={inputStyle} />
                                </div>
                                <div style={{ flex: 2 }}>
                                  <label style={{ fontSize: 10, color: 'var(--text2)', display: 'block', marginBottom: 2 }}>Reason *</label>
                                  <input value={adjustForm.reason}
                                    onChange={e => setAdjustForm(p => ({ ...p, reason: e.target.value }))}
                                    placeholder="e.g. Forgot to clock in"
                                    style={inputStyle} />
                                </div>
                                <button onClick={() => handleAdjust(emp.user_id)} disabled={adjusting} style={{
                                  padding: '7px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                  background: 'var(--green)', color: '#fff', fontWeight: 600, fontSize: 12,
                                  display: 'flex', alignItems: 'center', gap: 4,
                                }}>
                                  {adjusting ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={12} />}
                                  Save
                                </button>
                                <button onClick={() => setShowAdjust(null)} style={{
                                  padding: '7px 8px', borderRadius: 6, border: '1px solid #2a2d3a', cursor: 'pointer',
                                  background: 'transparent', color: 'var(--text2)', display: 'flex',
                                }}>
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); setShowAdjust(emp.user_id) }} style={{
                              padding: '6px 12px', borderRadius: 6, border: '1px solid #2a2d3a',
                              background: 'transparent', color: 'var(--text2)', fontSize: 12, fontWeight: 600,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                              <Plus size={12} /> Manual Adjustment
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                    No time entries found for this period
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
