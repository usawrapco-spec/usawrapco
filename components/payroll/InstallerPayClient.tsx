'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Download, Lock, RefreshCw, DollarSign, Clock,
  ChevronDown, ChevronRight, AlertCircle, Check,
} from 'lucide-react'

interface VehicleMeasurement {
  id: string
  make: string
  model: string
  total_sqft: number
}

interface JobRow {
  id: string
  title: string
  customer_name: string
  revenue: number | null
  vehicle_desc: string | null
  installer_id: string | null
  installer_name: string
  install_date: string | null
  fin_data: any
  budgeted_hrs: number
  actual_hrs: string  // editable string
}

interface Props {
  profile: Profile
}

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

// ── Fuzzy vehicle match ───────────────────────────────────────────────────────
function matchVehicle(desc: string | null, vehicles: VehicleMeasurement[]): VehicleMeasurement | null {
  if (!desc || !vehicles.length) return null
  const d = desc.toLowerCase()
  // Score: count how many words in make+model appear in desc
  let best: VehicleMeasurement | null = null
  let bestScore = 0
  for (const v of vehicles) {
    const key = `${v.make} ${v.model}`.toLowerCase()
    const words = key.split(/\s+/).filter(w => w.length > 2)
    const score = words.filter(w => d.includes(w)).length
    if (score > bestScore) { bestScore = score; best = v }
  }
  return bestScore >= 1 ? best : null
}

function fmt$(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function defaultRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start: toDateStr(start), end: toDateStr(end) }
}

export default function InstallerPayClient({ profile }: Props) {
  const supabase = createClient()

  // ── State ───────────────────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState(defaultRange)
  const [loading, setLoading] = useState(false)
  const [vehicles, setVehicles] = useState<VehicleMeasurement[]>([])
  const [rules, setRules] = useState({ install_rate_hr: 35, production_speed: 35.71 })
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [gustoHours, setGustoHours] = useState<string>('')
  const [baseHourlyRate, setBaseHourlyRate] = useState<string>('25')
  const [locking, setLocking] = useState(false)
  const [locked, setLocked] = useState(false)
  const [groupByInstaller, setGroupByInstaller] = useState(false)

  // ── Load vehicles + rules on mount ──────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [vRes, rRes] = await Promise.all([
        supabase.from('vehicle_measurements').select('id,make,model,total_sqft').gt('total_sqft', 0),
        supabase.from('rate_card_settings').select('install_rate_hr,production_speed').eq('org_id', ORG_ID).single(),
      ])
      setVehicles(vRes.data || [])
      if (rRes.data) setRules(rRes.data)
    }
    load()
  }, [])

  // ── Load projects for period ─────────────────────────────────────────────────
  async function loadJobs() {
    setLoading(true)
    setLocked(false)
    try {
      const { data } = await supabase
        .from('projects')
        .select(`
          id, title, vehicle_desc, revenue, installer_id, install_date, fin_data,
          customer:customer_id(name),
          installer:installer_id(id, name)
        `)
        .eq('org_id', ORG_ID)
        .not('installer_id', 'is', null)
        .gte('updated_at', dateRange.start)
        .lte('updated_at', dateRange.end + 'T23:59:59')
        .order('install_date', { ascending: true })

      const rows: JobRow[] = (data || []).map((p: any) => {
        const matched = matchVehicle(p.vehicle_desc, vehicles)
        let budgeted_hrs = 0
        if (matched) {
          budgeted_hrs = matched.total_sqft / rules.production_speed
        } else {
          // Fallback: fin_data->installer_pay / install_rate
          const installerPay = parseFloat(p.fin_data?.installer_pay) || 0
          if (installerPay > 0) budgeted_hrs = installerPay / rules.install_rate_hr
          else budgeted_hrs = 0
        }
        return {
          id: p.id,
          title: p.title || `Job #${p.id.slice(0, 8)}`,
          customer_name: (p.customer as any)?.name || '—',
          revenue: p.revenue,
          vehicle_desc: p.vehicle_desc,
          installer_id: p.installer_id,
          installer_name: (p.installer as any)?.name || 'Unknown',
          install_date: p.install_date,
          fin_data: p.fin_data,
          budgeted_hrs,
          actual_hrs: '',
        }
      })
      setJobs(rows)
    } catch {}
    setLoading(false)
  }

  // ── Update actual hours for a job ────────────────────────────────────────────
  function setActualHrs(id: string, val: string) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, actual_hrs: val } : j))
  }

  // ── Calculations ─────────────────────────────────────────────────────────────
  const jobCalcs = useMemo(() => {
    return jobs.map(j => {
      const actual = parseFloat(j.actual_hrs) || 0
      const hrs_saved = Math.max(0, j.budgeted_hrs - actual)
      const flat_pay = j.budgeted_hrs * rules.install_rate_hr
      const speed_bonus = hrs_saved * rules.install_rate_hr
      const total_job_pay = flat_pay + speed_bonus
      return { ...j, actual, hrs_saved, flat_pay, speed_bonus, total_job_pay }
    })
  }, [jobs, rules.install_rate_hr])

  const totalJobPay = useMemo(() => jobCalcs.reduce((s, j) => s + j.total_job_pay, 0), [jobCalcs])
  const sumActualHrs = useMemo(() => jobCalcs.reduce((s, j) => s + j.actual, 0), [jobCalcs])

  const gusto = parseFloat(gustoHours) || 0
  const shopHours = Math.max(0, gusto - sumActualHrs)
  const hourlyRate = parseFloat(baseHourlyRate) || 25
  const regularPay = shopHours * hourlyRate
  const fica = regularPay * 0.0765
  const totalCagePay = totalJobPay + regularPay

  // ── Grouped by installer ─────────────────────────────────────────────────────
  const installerGroups = useMemo(() => {
    const m: Record<string, typeof jobCalcs> = {}
    for (const j of jobCalcs) {
      if (!m[j.installer_name]) m[j.installer_name] = []
      m[j.installer_name].push(j)
    }
    return m
  }, [jobCalcs])

  // ── Export CSV ───────────────────────────────────────────────────────────────
  function exportCSV() {
    const header = ['Invoice ID','Job Title','Customer','Installer','Revenue','Budgeted Hrs','Actual Hrs','Hrs Saved','Flat Pay','Speed Bonus','Total Pay']
    const rows = jobCalcs.map(j => [
      j.id.slice(0, 8),
      j.title,
      j.customer_name,
      j.installer_name,
      j.revenue?.toFixed(2) ?? '0',
      j.budgeted_hrs.toFixed(2),
      j.actual.toFixed(2),
      j.hrs_saved.toFixed(2),
      j.flat_pay.toFixed(2),
      j.speed_bonus.toFixed(2),
      j.total_job_pay.toFixed(2),
    ])
    rows.push([
      '','','','TOTALS','',
      jobCalcs.reduce((s,j) => s + j.budgeted_hrs, 0).toFixed(2),
      sumActualHrs.toFixed(2),
      '',
      jobCalcs.reduce((s,j) => s + j.flat_pay, 0).toFixed(2),
      jobCalcs.reduce((s,j) => s + j.speed_bonus, 0).toFixed(2),
      totalJobPay.toFixed(2),
    ])
    rows.push([])
    rows.push(['','','Gusto Total Hours','',gustoHours,'','','','','',''])
    rows.push(['','','Sum Actual Job Hrs','',sumActualHrs.toFixed(2),'','','','','',''])
    rows.push(['','','Regular Shop Hours','',shopHours.toFixed(2),'','','','','',''])
    rows.push(['','','Base Hourly Rate','','$'+hourlyRate,'','','','','',''])
    rows.push(['','','Regular Pay','','$'+regularPay.toFixed(2),'','','','','',''])
    rows.push(['','','Total Job-Based Pay','','$'+totalJobPay.toFixed(2),'','','','','',''])
    rows.push(['','','TOTAL CAGE PAY','','$'+totalCagePay.toFixed(2),'','','','','',''])

    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `installer-payroll-${dateRange.start}-${dateRange.end}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // ── Lock Period ──────────────────────────────────────────────────────────────
  async function lockPeriod() {
    setLocking(true)
    try {
      const breakdown = {
        jobs: jobCalcs.map(j => ({
          project_id: j.id,
          title: j.title,
          customer: j.customer_name,
          installer: j.installer_name,
          installer_id: j.installer_id,
          revenue: j.revenue,
          budgeted_hrs: j.budgeted_hrs,
          actual_hrs: j.actual,
          hrs_saved: j.hrs_saved,
          flat_pay: j.flat_pay,
          speed_bonus: j.speed_bonus,
          total_job_pay: j.total_job_pay,
        })),
        gusto_hours: gusto,
        sum_actual_hrs: sumActualHrs,
        shop_hours: shopHours,
        base_hourly_rate: hourlyRate,
        regular_pay: regularPay,
        fica,
        total_job_pay: totalJobPay,
        total_cage_pay: totalCagePay,
      }
      await supabase.from('installer_payroll_records').insert({
        org_id: ORG_ID,
        period_start: dateRange.start,
        period_end: dateRange.end,
        gusto_hours: gusto,
        base_hourly_rate: hourlyRate,
        breakdown,
        total_job_pay: totalJobPay,
        total_regular_pay: regularPay,
        total_fica: fica,
        total_cage_pay: totalCagePay,
        locked_at: new Date().toISOString(),
        locked_by: profile.id,
      })
      setLocked(true)
    } catch {}
    setLocking(false)
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const th: React.CSSProperties = {
    padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700,
    color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em',
    whiteSpace: 'nowrap', background: 'var(--surface)', borderBottom: '1px solid rgba(255,255,255,0.08)',
  }
  const thL: React.CSSProperties = { ...th, textAlign: 'left' }
  const td: React.CSSProperties = {
    padding: '7px 10px', textAlign: 'right', fontSize: 12, color: 'var(--text1)',
    borderBottom: '1px solid rgba(255,255,255,0.04)', fontFamily: 'JetBrains Mono, monospace',
  }
  const tdL: React.CSSProperties = { ...td, textAlign: 'left', fontFamily: 'inherit' }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--text1)', margin: 0, lineHeight: 1 }}>
            Installer Pay Calculator
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>
            Flat rate + speed bonus per job — CAGE pay formula
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={exportCSV}
            disabled={jobs.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: 'var(--surface2)', color: 'var(--text1)', fontSize: 12, fontWeight: 600,
              cursor: jobs.length === 0 ? 'not-allowed' : 'pointer', opacity: jobs.length === 0 ? 0.5 : 1,
            }}
          >
            <Download size={13} />
            Export CSV
          </button>
          <button
            onClick={lockPeriod}
            disabled={jobs.length === 0 || locked || locking}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: locked ? 'var(--green)' : 'var(--accent)',
              color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: jobs.length === 0 || locked ? 'not-allowed' : 'pointer',
              opacity: jobs.length === 0 ? 0.5 : 1,
            }}
          >
            {locking
              ? <div style={{ width: 12, height: 12, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              : locked ? <Check size={13} /> : <Lock size={13} />
            }
            {locked ? 'Period Locked' : 'Lock Period'}
          </button>
        </div>
      </div>

      {/* ── Pay Period Selector ─────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, padding: '14px 18px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={14} color="var(--accent)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Pay Period
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            style={{ background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: 'var(--text1)', outline: 'none' }}
          />
          <span style={{ color: 'var(--text3)', fontSize: 12 }}>to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            style={{ background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: 'var(--text1)', outline: 'none' }}
          />
        </div>

        <button
          onClick={loadJobs}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading
            ? <div style={{ width: 12, height: 12, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            : <RefreshCw size={13} />
          }
          Load Jobs
        </button>

        {jobs.length > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginLeft: 'auto', fontSize: 12, color: 'var(--text2)' }}>
            <input
              type="checkbox"
              checked={groupByInstaller}
              onChange={e => setGroupByInstaller(e.target.checked)}
              style={{ accentColor: 'var(--accent)' }}
            />
            Group by Installer
          </label>
        )}
      </div>

      {/* ── Jobs Table ──────────────────────────────────────────────────────── */}
      {jobs.length === 0 && !loading && (
        <div style={{
          background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: 40, textAlign: 'center', marginBottom: 20,
        }}>
          <Clock size={32} color="var(--text3)" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text3)', margin: 0, fontSize: 14 }}>
            Select a pay period and click "Load Jobs" to see installer jobs
          </p>
        </div>
      )}

      {jobs.length > 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, overflow: 'hidden', marginBottom: 20,
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thL}>Invoice #</th>
                  <th style={thL}>Job / Customer</th>
                  {groupByInstaller ? null : <th style={thL}>Installer</th>}
                  <th style={th}>Revenue</th>
                  <th style={th}>Budgeted Hrs</th>
                  <th style={th}>Actual Hrs</th>
                  <th style={th}>Hrs Saved</th>
                  <th style={{ ...th, color: 'var(--accent)' }}>Flat Pay</th>
                  <th style={{ ...th, color: 'var(--purple)' }}>Speed Bonus</th>
                  <th style={{ ...th, color: 'var(--green)' }}>Total Pay</th>
                </tr>
              </thead>
              <tbody>
                {groupByInstaller
                  ? Object.entries(installerGroups).map(([name, rows]) => {
                      const grpTotal = rows.reduce((s, r) => s + r.total_job_pay, 0)
                      return [
                        <tr key={`grp-${name}`}>
                          <td colSpan={9} style={{
                            padding: '6px 10px', background: 'rgba(255,255,255,0.03)',
                            fontSize: 11, fontWeight: 800, color: 'var(--accent)',
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                          }}>
                            {name} — {rows.length} job{rows.length !== 1 ? 's' : ''} — Total: {fmt$(grpTotal)}
                          </td>
                        </tr>,
                        ...rows.map(j => (
                          <JobTableRow key={j.id} j={j} groupByInstaller td={td} tdL={tdL}
                            onSetActualHrs={setActualHrs} />
                        )),
                      ]
                    })
                  : jobCalcs.map(j => (
                      <JobTableRow key={j.id} j={j} groupByInstaller={false} td={td} tdL={tdL}
                        onSetActualHrs={setActualHrs} />
                    ))
                }

                {/* Totals row */}
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <td colSpan={groupByInstaller ? 3 : 4} style={{ ...tdL, fontWeight: 700, color: 'var(--text2)', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                    TOTALS
                  </td>
                  <td style={{ ...td, fontWeight: 700, borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                    {jobCalcs.reduce((s, j) => s + j.budgeted_hrs, 0).toFixed(1)}h
                  </td>
                  <td style={{ ...td, fontWeight: 700, borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                    {sumActualHrs.toFixed(1)}h
                  </td>
                  <td style={{ ...td, fontWeight: 700, borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                    {jobCalcs.reduce((s, j) => s + j.hrs_saved, 0).toFixed(1)}h
                  </td>
                  <td style={{ ...td, color: 'var(--accent)', fontWeight: 700, borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                    {fmt$(jobCalcs.reduce((s, j) => s + j.flat_pay, 0))}
                  </td>
                  <td style={{ ...td, color: 'var(--purple)', fontWeight: 700, borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                    {fmt$(jobCalcs.reduce((s, j) => s + j.speed_bonus, 0))}
                  </td>
                  <td style={{ ...td, color: 'var(--green)', fontWeight: 800, borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                    {fmt$(totalJobPay)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CAGE Pay Summary ────────────────────────────────────────────────── */}
      {jobs.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20,
        }}>
          {/* Inputs */}
          <div style={{
            background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '20px 24px',
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>
              CAGE Pay Inputs
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', marginBottom: 4, fontWeight: 600 }}>
                  Total Hours from Gusto
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={gustoHours}
                  onChange={e => setGustoHours(e.target.value)}
                  placeholder="e.g. 80"
                  style={{
                    width: '100%', background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, padding: '8px 12px', fontSize: 14, color: 'var(--text1)', outline: 'none',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', marginBottom: 4, fontWeight: 600 }}>
                  Base Hourly Rate ($/hr)
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={baseHourlyRate}
                  onChange={e => setBaseHourlyRate(e.target.value)}
                  placeholder="25"
                  style={{
                    width: '100%', background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, padding: '8px 12px', fontSize: 14, color: 'var(--text1)', outline: 'none',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div style={{
            background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '20px 24px',
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>
              CAGE Pay Breakdown
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Total Hours (Gusto)', value: `${gusto.toFixed(1)} hrs`, color: 'var(--text1)' },
                { label: '− Actual Job Hours', value: `${sumActualHrs.toFixed(1)} hrs`, color: 'var(--text2)' },
                { label: '= Regular Shop Hours', value: `${shopHours.toFixed(1)} hrs`, color: 'var(--cyan)', bold: true },
                { label: `Regular Pay (${shopHours.toFixed(1)} hrs × $${hourlyRate}/hr)`, value: fmt$(regularPay), color: 'var(--text1)' },
                { label: 'Total Job-Based Pay', value: fmt$(totalJobPay), color: 'var(--accent)', bold: true },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{r.label}</span>
                  <span style={{ fontSize: 13, fontWeight: r.bold ? 700 : 400, color: r.color, fontFamily: 'JetBrains Mono, monospace' }}>
                    {r.value}
                  </span>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 4px' }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Employer FICA (7.65%)</span>
                <span style={{ fontSize: 12, color: 'var(--red)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {fmt$(fica)}
                </span>
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px', borderRadius: 8,
                background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.3)',
                marginTop: 4,
              }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)' }}>TOTAL CAGE PAY</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {fmt$(totalCagePay)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {locked && (
        <div style={{
          marginTop: 16, padding: '10px 16px', borderRadius: 8,
          background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.3)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Check size={14} color="var(--green)" />
          <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
            Period locked and saved to payroll records.
          </span>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Job table row sub-component ────────────────────────────────────────────────
function JobTableRow({ j, groupByInstaller, td, tdL, onSetActualHrs }: {
  j: any
  groupByInstaller: boolean
  td: React.CSSProperties
  tdL: React.CSSProperties
  onSetActualHrs: (id: string, val: string) => void
}) {
  return (
    <tr
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <td style={tdL}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text3)' }}>
          #{j.id.slice(0, 8)}
        </span>
      </td>
      <td style={tdL}>
        <div>
          <div style={{ fontWeight: 500, color: 'var(--text1)', fontSize: 12 }}>{j.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{j.customer_name}</div>
        </div>
      </td>
      {!groupByInstaller && (
        <td style={tdL}>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{j.installer_name}</span>
        </td>
      )}
      <td style={td}>{j.revenue != null ? `$${j.revenue.toLocaleString()}` : '—'}</td>
      <td style={td}>
        <span style={{ color: j.budgeted_hrs > 0 ? 'var(--text1)' : 'var(--text3)' }}>
          {j.budgeted_hrs > 0 ? j.budgeted_hrs.toFixed(1) : '—'}h
        </span>
      </td>
      <td style={{ ...td, padding: '4px 8px' }}>
        <input
          type="number"
          step="0.25"
          min="0"
          value={j.actual_hrs}
          onChange={e => onSetActualHrs(j.id, e.target.value)}
          placeholder="—"
          style={{
            width: 72, background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '4px 8px', fontSize: 12, color: 'var(--text1)',
            textAlign: 'right', outline: 'none', fontFamily: 'JetBrains Mono, monospace',
          }}
        />
      </td>
      <td style={{ ...td, color: j.hrs_saved > 0 ? 'var(--green)' : 'var(--text3)' }}>
        {j.actual > 0 ? (j.hrs_saved > 0 ? `+${j.hrs_saved.toFixed(1)}` : j.hrs_saved.toFixed(1)) : '—'}h
      </td>
      <td style={{ ...td, color: 'var(--accent)' }}>
        {j.budgeted_hrs > 0 ? `$${j.flat_pay.toFixed(0)}` : '—'}
      </td>
      <td style={{ ...td, color: j.speed_bonus > 0 ? 'var(--purple)' : 'var(--text3)' }}>
        {j.actual > 0 && j.budgeted_hrs > 0 ? `+$${j.speed_bonus.toFixed(0)}` : '—'}
      </td>
      <td style={{ ...td, color: 'var(--green)', fontWeight: 700 }}>
        {j.budgeted_hrs > 0 ? `$${j.total_job_pay.toFixed(0)}` : '—'}
      </td>
    </tr>
  )
}
