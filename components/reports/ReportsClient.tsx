'use client'

import { useState } from 'react'
import { FileText, Download, BarChart3, DollarSign, Users, Package, Printer } from 'lucide-react'
import type { Profile } from '@/types'

interface Project {
  id: string
  title: string
  vehicle_desc: string
  status: string
  pipe_stage: string
  revenue: number
  profit: number
  created_at: string
  updated_at: string
  agent_id: string
}

interface Props {
  profile: Profile
  projects: Project[]
}

const fM = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

export default function ReportsClient({ profile, projects }: Props) {
  const [selectedProject, setSelectedProject] = useState('')
  const [loading, setLoading]                 = useState<string | null>(null)
  const [period, setPeriod]                   = useState<'week' | 'month' | 'quarter' | 'year'>('month')

  // Period filter
  const now = new Date()
  const periodDays = { week: 7, month: 30, quarter: 90, year: 365 }[period]
  const filtered = projects.filter(p => {
    const d = new Date(p.updated_at)
    return (now.getTime() - d.getTime()) / 86400000 <= periodDays
  })

  // Aggregate stats
  const closedProjects = filtered.filter(p => p.pipe_stage === 'done' || p.status === 'closed')
  const totalRevenue = closedProjects.reduce((s, p) => s + (p.revenue || 0), 0)
  const totalProfit = closedProjects.reduce((s, p) => s + (p.profit || 0), 0)
  const avgGPM = totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(1) : '0'

  async function downloadReport(type: string) {
    if (!selectedProject) {
      alert('Please select a project first')
      return
    }
    setLoading(type)
    try {
      const res = await fetch(`/api/reports/${type}?projectId=${selectedProject}`)
      const data = await res.json()
      // Open in new tab as JSON for now (PDF renderer not installed)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch {
      alert('Failed to generate report')
    }
    setLoading(null)
  }

  const reportTypes = [
    {
      id: 'sales-order',
      title: 'Sales Order',
      description: 'Customer-facing sales order with financial breakdown, commission, and job details',
      icon: DollarSign,
      color: '#22c07a',
    },
    {
      id: 'production-brief',
      title: 'Production Brief',
      description: 'Internal production document with panel measurements, material specs, and scope of work',
      icon: Package,
      color: '#4f7fff',
    },
    {
      id: 'installer-work-order',
      title: 'Installer Work Order',
      description: 'Installer document with pay breakdown, panel measurements, and liability sign-off form',
      icon: Printer,
      color: '#f59e0b',
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', marginBottom: 4 }}>
          Reports
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>Generate and download project reports</p>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['week', 'month', 'quarter', 'year'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '6px 14px', borderRadius: 7, cursor: 'pointer',
              background: period === p ? 'var(--accent)' : 'var(--surface)',
              border: period === p ? 'none' : '1px solid var(--border)',
              color: period === p ? '#fff' : 'var(--text3)',
              fontSize: 12, fontWeight: period === p ? 700 : 400,
              textTransform: 'capitalize',
            } as React.CSSProperties}
          >
            {p}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Revenue', val: fM(totalRevenue), icon: DollarSign, color: '#22c07a' },
          { label: 'Net Profit', val: fM(totalProfit), icon: TrendingUp, color: '#4f7fff' },
          { label: 'Avg GPM', val: `${avgGPM}%`, icon: BarChart3, color: '#8b5cf6' },
          { label: 'Jobs Closed', val: closedProjects.length.toString(), icon: FileText, color: '#22d3ee' },
        ].map(({ label, val, icon: Icon, color }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Icon size={16} style={{ color }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Report Generator */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>Generate Project Report</h2>
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Select Project
          </label>
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            style={{ width: '100%', maxWidth: 400, padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none' }}
          >
            <option value="">Choose a project...</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title} {p.vehicle_desc ? `· ${p.vehicle_desc}` : ''}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {reportTypes.map(r => (
            <div key={r.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${r.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <r.icon size={16} style={{ color: r.color }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{r.title}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.5 }}>{r.description}</p>
              <button
                onClick={() => downloadReport(r.id)}
                disabled={!selectedProject || loading === r.id}
                style={{
                  width: '100%', padding: '8px', borderRadius: 7, border: 'none',
                  background: selectedProject ? r.color : 'var(--border)',
                  color: selectedProject ? '#fff' : 'var(--text3)',
                  fontSize: 12, fontWeight: 700, cursor: selectedProject ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Download size={12} />
                {loading === r.id ? 'Generating...' : 'Download'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Missing import
function TrendingUp({ size, style }: { size: number; style: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
      <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
  )
}
