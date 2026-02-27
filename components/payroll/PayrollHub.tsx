'use client'

import { useState, useEffect } from 'react'
import type { Profile } from '@/types'
import {
  DollarSign, Play, Wrench, Settings, Users, Briefcase,
  Link2, Brain, Calendar, TrendingUp, Loader2
} from 'lucide-react'
import dynamic from 'next/dynamic'

const EnhancedPayrollClient = dynamic(() => import('./EnhancedPayrollClient'), { ssr: false })
const PayrollRunsClient = dynamic(() => import('./PayrollRunsClient'), { ssr: false })
const InstallerPayClient = dynamic(() => import('./InstallerPayClient'), { ssr: false })
const EmployeePayClient = dynamic(() => import('./EmployeePayClient'), { ssr: false })
const JobBasedPayClient = dynamic(() => import('./JobBasedPayClient'), { ssr: false })
const QuickBooksClient = dynamic(() => import('./QuickBooksClient'), { ssr: false })
const AIBookkeeperClient = dynamic(() => import('./AIBookkeeperClient'), { ssr: false })

type HubTab = 'runs' | 'employees' | 'jobs' | 'installer' | 'quickbooks' | 'bookkeeper' | 'legacy'

interface Stats {
  currentPeriodTotal: number
  currentPeriodStatus: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  ytdTotal: number
  activeEmployees: number
  nextPayrollDate: string
}

function fmtK(n: number) { return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }

export default function PayrollHub({
  profile,
  employees,
  projects,
}: {
  profile: Profile
  employees: any[]
  projects: any[]
}) {
  const [tab, setTab] = useState<HubTab>('runs')
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/payroll/stats')
      .then(r => r.json())
      .then(d => { setStats(d); setStatsLoading(false) })
      .catch(() => setStatsLoading(false))
  }, [])

  const tabs: { id: HubTab; label: string; icon: typeof DollarSign }[] = [
    { id: 'runs', label: 'Pay Periods', icon: Calendar },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'jobs', label: 'Job Pay', icon: Briefcase },
    { id: 'installer', label: 'Installer Calc', icon: Wrench },
    { id: 'quickbooks', label: 'QuickBooks', icon: Link2 },
    { id: 'bookkeeper', label: 'AI Bookkeeper', icon: Brain },
    { id: 'legacy', label: 'Commissions', icon: Settings },
  ]

  const daysUntilPayroll = stats?.nextPayrollDate
    ? Math.max(0, Math.ceil((new Date(stats.nextPayrollDate).getTime() - Date.now()) / 86_400_000))
    : null

  return (
    <div style={{ minHeight: '100%' }}>
      {/* ── Stats bar ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          {
            label: 'Current Period',
            value: statsLoading ? null : fmtK(stats?.currentPeriodTotal || 0),
            sub: stats?.currentPeriodStart && stats?.currentPeriodEnd
              ? `${stats.currentPeriodStart} – ${stats.currentPeriodEnd}`
              : 'No active period',
            color: 'var(--green)', icon: DollarSign,
          },
          {
            label: 'YTD Payroll',
            value: statsLoading ? null : fmtK(stats?.ytdTotal || 0),
            sub: `${new Date().getFullYear()} total`,
            color: 'var(--accent)', icon: TrendingUp,
          },
          {
            label: 'Active Employees',
            value: statsLoading ? null : String(stats?.activeEmployees || 0),
            sub: 'on payroll',
            color: 'var(--cyan)', icon: Users,
          },
          {
            label: 'Next Payroll',
            value: statsLoading ? null : (stats?.nextPayrollDate || '—'),
            sub: daysUntilPayroll !== null ? `in ${daysUntilPayroll} day${daysUntilPayroll !== 1 ? 's' : ''}` : '',
            color: 'var(--amber)', icon: Calendar,
          },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 12, padding: '16px 18px', border: '1px solid #2a2d3a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                <Icon size={12} color={s.color} />
                <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</span>
              </div>
              {s.value === null
                ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--text3)' }} />
                : <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: s.color }}>{s.value}</div>
              }
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.sub}</div>
            </div>
          )
        })}
      </div>

      {/* ── Tab nav ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
              border: `1px solid ${active ? 'var(--accent)' : '#2a2d3a'}`,
              background: active ? 'var(--accent)22' : 'var(--surface)',
              color: active ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer', transition: 'all 0.15s'
            }}>
              <Icon size={13} />
              <span style={{ fontWeight: 700, fontSize: 13, color: active ? 'var(--accent)' : 'var(--text1)' }}>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {tab === 'runs' && <PayrollRunsClient profile={profile} employees={employees} projects={projects} />}
      {tab === 'employees' && <EmployeePayClient profile={profile} />}
      {tab === 'jobs' && <JobBasedPayClient profile={profile} />}
      {tab === 'installer' && <InstallerPayClient profile={profile} />}
      {tab === 'quickbooks' && <QuickBooksClient profile={profile} />}
      {tab === 'bookkeeper' && <AIBookkeeperClient profile={profile} />}
      {tab === 'legacy' && <EnhancedPayrollClient profile={profile} employees={employees} projects={projects} />}
    </div>
  )
}
