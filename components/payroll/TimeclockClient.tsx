'use client'
import { ORG_ID } from '@/lib/org'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Clock, Play, Square, Coffee, Download, AlertTriangle,
} from 'lucide-react'

interface TimeEntry {
  id: string
  employee_id: string
  clock_in: string
  clock_out: string | null
  break_minutes: number
  total_hours: number | null
  regular_hours: number | null
  overtime_hours: number | null
  notes: string | null
}

interface Props {
  profile: Profile
  todayEntries: TimeEntry[]
  weekEntries: TimeEntry[]
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function calcElapsed(start: string): string {
  const diffMs = Math.max(0, Date.now() - new Date(start).getTime())
  const hours = Math.floor(diffMs / 3_600_000)
  const mins = Math.floor((diffMs % 3_600_000) / 60_000)
  return `${hours}h ${mins}m`
}

const HOURLY_RATE = 20

export default function TimeclockClient({ profile, todayEntries, weekEntries }: Props) {
  const supabase = createClient()
  const [entries, setEntries] = useState<TimeEntry[]>(todayEntries)
  const [weekData] = useState<TimeEntry[]>(weekEntries)
  const [now, setNow] = useState(new Date())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const activeEntry = entries.find(e => !e.clock_out)
  const isClockedIn = !!activeEntry

  const todayHours = entries.reduce((sum, e) => {
    if (!e.clock_out) {
      const diffMs = Date.now() - new Date(e.clock_in).getTime()
      return sum + Math.max(0, (diffMs / 3_600_000) - (e.break_minutes / 60))
    }
    return sum + (e.total_hours || 0)
  }, 0)

  const weekTotal = weekData.reduce((s, e) => s + (e.total_hours || 0), 0)
  const weekRegular = Math.min(weekTotal, 40)
  const weekOvertime = Math.max(0, weekTotal - 40)
  const weekBasePay = weekRegular * HOURLY_RATE + weekOvertime * HOURLY_RATE * 1.5

  async function clockIn() {
    setSaving(true); setError('')
    try {
      const { data, error: err } = await supabase
        .from('time_entries')
        .insert({
          employee_id: profile.id,
          org_id: profile.org_id || ORG_ID,
          clock_in: new Date().toISOString(),
          break_minutes: 0,
        })
        .select()
        .single()
      if (err) throw err
      setEntries(prev => [data as TimeEntry, ...prev])
    } catch (e: any) {
      setError(e.message || 'Failed to clock in')
    } finally {
      setSaving(false)
    }
  }

  async function clockOut() {
    if (!activeEntry) return
    setSaving(true); setError('')
    try {
      const clockOutTime = new Date().toISOString()
      const diffMs = new Date(clockOutTime).getTime() - new Date(activeEntry.clock_in).getTime()
      const totalHours = Math.max(0, (diffMs / 3_600_000) - (activeEntry.break_minutes / 60))
      const regularHours = Math.min(totalHours, 8)
      const overtimeHours = Math.max(0, totalHours - 8)
      const { data, error: err } = await supabase
        .from('time_entries')
        .update({
          clock_out: clockOutTime,
          total_hours: Math.round(totalHours * 100) / 100,
          regular_hours: Math.round(regularHours * 100) / 100,
          overtime_hours: Math.round(overtimeHours * 100) / 100,
        })
        .eq('id', activeEntry.id)
        .select()
        .single()
      if (err) throw err
      setEntries(prev => prev.map(e => e.id === activeEntry.id ? data as TimeEntry : e))
    } catch (e: any) {
      setError(e.message || 'Failed to clock out')
    } finally {
      setSaving(false)
    }
  }

  async function addBreak(minutes: number) {
    if (!activeEntry) return
    setSaving(true)
    try {
      const { data, error: err } = await supabase
        .from('time_entries')
        .update({ break_minutes: (activeEntry.break_minutes || 0) + minutes })
        .eq('id', activeEntry.id)
        .select()
        .single()
      if (err) throw err
      setEntries(prev => prev.map(e => e.id === activeEntry.id ? data as TimeEntry : e))
    } catch { /* silent */ } finally {
      setSaving(false)
    }
  }

  // Build week days for timesheet
  const monday = new Date(now)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const entry = weekData.find(e => e.clock_in.startsWith(dateStr)) || null
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
      date: dateStr,
      isToday: dateStr === now.toISOString().split('T')[0],
      entry,
    }
  })

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <h1 style={{
        fontSize: 24, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
        color: 'var(--text1)', marginBottom: 20,
      }}>
        Time Clock
      </h1>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)',
          borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--red)',
        }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* ── Clock Widget ─────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20, padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>
              {profile.name || profile.email}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'capitalize', marginTop: 2 }}>
              {profile.role?.replace('_', ' ')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>
              {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
          padding: '10px 14px', borderRadius: 10,
          background: isClockedIn ? 'rgba(34,192,122,0.1)' : 'rgba(90,96,128,0.1)',
          border: `1px solid ${isClockedIn ? 'rgba(34,192,122,0.3)' : 'rgba(90,96,128,0.3)'}`,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isClockedIn ? 'var(--green)' : 'var(--text3)',
          }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: isClockedIn ? 'var(--green)' : 'var(--text3)' }}>
            {isClockedIn ? 'Clocked In' : 'Clocked Out'}
          </span>
          {isClockedIn && activeEntry && (
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>
              since {fmtTime(activeEntry.clock_in)} — {calcElapsed(activeEntry.clock_in)}
            </span>
          )}
          <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)' }}>
            Today: {todayHours.toFixed(2)}h
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {!isClockedIn ? (
            <button
              onClick={clockIn}
              disabled={saving}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 20px', borderRadius: 10,
                background: 'var(--green)', color: '#fff',
                fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Play size={16} /> Clock In
            </button>
          ) : (
            <>
              <button
                onClick={clockOut}
                disabled={saving}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 20px', borderRadius: 10,
                  background: 'var(--red)', color: '#fff',
                  fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <Square size={16} /> Clock Out
              </button>
              <button
                onClick={() => addBreak(30)}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '12px 16px', borderRadius: 10,
                  background: 'var(--surface2)', color: 'var(--text2)',
                  fontSize: 13, fontWeight: 600, border: '1px solid var(--border)', cursor: 'pointer',
                }}
              >
                <Coffee size={14} /> +30min Break
              </button>
            </>
          )}
        </div>

        {/* Today log */}
        {entries.length > 0 && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Today&apos;s Log
            </div>
            {entries.map(entry => (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13,
              }}>
                <Clock size={12} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                <span style={{ color: 'var(--text2)' }}>{fmtTime(entry.clock_in)}</span>
                <span style={{ color: 'var(--text3)' }}>—</span>
                <span style={{ color: entry.clock_out ? 'var(--text2)' : 'var(--green)', fontWeight: 600 }}>
                  {entry.clock_out ? fmtTime(entry.clock_out) : 'In Progress'}
                </span>
                {entry.break_minutes > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>Break: {entry.break_minutes}min</span>
                )}
                <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: 'var(--text1)' }}>
                  {entry.clock_out ? `${(entry.total_hours || 0).toFixed(2)}h` : calcElapsed(entry.clock_in)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Weekly Timesheet ────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>Weekly Timesheet</h2>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 7,
            background: 'var(--surface2)', border: '1px solid var(--border)',
            fontSize: 12, fontWeight: 600, color: 'var(--text2)', cursor: 'pointer',
          }}>
            <Download size={12} /> Export
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Day', 'In', 'Out', 'Break', 'Total', 'Regular', 'OT'].map(h => (
                  <th key={h} style={{
                    padding: '7px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700,
                    color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekDays.map(({ label, date, isToday, entry }) => {
                const totalH = entry?.total_hours || 0
                const regH = Math.min(totalH, 8)
                const otH = Math.max(0, totalH - 8)
                return (
                  <tr key={date} style={{ background: isToday ? 'rgba(79,127,255,0.05)' : 'transparent' }}>
                    <td style={{ padding: '7px 10px', fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--accent)' : 'var(--text2)', borderBottom: '1px solid var(--border)' }}>{label}</td>
                    <td style={{ padding: '7px 10px', fontSize: 12, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace', borderBottom: '1px solid var(--border)' }}>{entry ? fmtTime(entry.clock_in) : '—'}</td>
                    <td style={{ padding: '7px 10px', fontSize: 12, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace', borderBottom: '1px solid var(--border)' }}>{entry?.clock_out ? fmtTime(entry.clock_out) : entry ? '...' : '—'}</td>
                    <td style={{ padding: '7px 10px', fontSize: 12, color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>{entry?.break_minutes ? `${entry.break_minutes}m` : '—'}</td>
                    <td style={{ padding: '7px 10px', fontSize: 12, fontWeight: 600, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace', borderBottom: '1px solid var(--border)' }}>{totalH > 0 ? `${totalH.toFixed(2)}h` : '—'}</td>
                    <td style={{ padding: '7px 10px', fontSize: 12, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', borderBottom: '1px solid var(--border)' }}>{regH > 0 ? `${regH.toFixed(2)}h` : '—'}</td>
                    <td style={{ padding: '7px 10px', fontSize: 12, color: otH > 0 ? 'var(--amber)' : 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', borderBottom: '1px solid var(--border)' }}>{otH > 0 ? `${otH.toFixed(2)}h` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--surface2)' }}>
                <td colSpan={4} style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>Week Total</td>
                <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{weekTotal.toFixed(2)}h</td>
                <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 700, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>{weekRegular.toFixed(2)}h</td>
                <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 700, color: weekOvertime > 0 ? 'var(--amber)' : 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{weekOvertime.toFixed(2)}h</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pay estimate */}
        <div style={{
          marginTop: 16, padding: '12px 16px', borderRadius: 8, background: 'var(--surface2)',
          display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Regular Pay</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>${(weekRegular * HOURLY_RATE).toFixed(2)}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>{weekRegular.toFixed(1)}h × ${HOURLY_RATE}/hr</div>
          </div>
          {weekOvertime > 0 && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>OT Pay (1.5x)</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--amber)', fontFamily: 'JetBrains Mono, monospace' }}>${(weekOvertime * HOURLY_RATE * 1.5).toFixed(2)}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{weekOvertime.toFixed(1)}h × ${(HOURLY_RATE * 1.5).toFixed(2)}/hr</div>
            </div>
          )}
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Estimated Base Pay</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>${weekBasePay.toFixed(2)}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>Before commission + bonus</div>
          </div>
        </div>
      </div>
    </div>
  )
}
