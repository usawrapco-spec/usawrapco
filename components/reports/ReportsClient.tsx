'use client'

import { useState } from 'react'
import { FileText, Download, BarChart3, DollarSign, Users, Package, Printer, TrendingUp } from 'lucide-react'
import type { Profile } from '@/types'
import { useToast } from '@/components/shared/Toast'

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
  const { toast } = useToast()

  // Period filter
  const now        = new Date()
  const periodDays = { week: 7, month: 30, quarter: 90, year: 365 }[period]
  const filtered   = projects.filter(p => {
    const d = new Date(p.updated_at)
    return (now.getTime() - d.getTime()) / 86400000 <= periodDays
  })

  // Aggregate stats
  const closedProjects = filtered.filter(p => p.pipe_stage === 'done' || p.status === 'closed')
  const totalRevenue   = closedProjects.reduce((s, p) => s + (p.revenue || 0), 0)
  const totalProfit    = closedProjects.reduce((s, p) => s + (p.profit || 0), 0)
  const avgGPM         = totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(1) : '0'

  async function downloadReport(type: string) {
    if (!selectedProject) {
      toast('Please select a project first', 'warning')
      return
    }
    setLoading(type)
    try {
      const res  = await fetch(`/api/reports/${type}?projectId=${selectedProject}`)
      const data = await res.json()
      // Open JSON data in new tab (printable via browser)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${type}-${selectedProject.slice(0, 8)}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch {
      toast('Failed to generate report', 'error')
    }
    setLoading(null)
  }

  async function viewReport(type: string) {
    if (!selectedProject) {
      toast('Please select a project first', 'warning')
      return
    }
    setLoading(`view-${type}`)
    try {
      const res  = await fetch(`/api/reports/${type}?projectId=${selectedProject}`)
      const data = await res.json()
      // Print via hidden iframe — avoids window.open
      const html   = buildPrintHtml(type, data.report)
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;width:0;height:0;border:none;opacity:0'
      document.body.appendChild(iframe)
      iframe.contentDocument!.write(html)
      iframe.contentDocument!.close()
      iframe.contentWindow!.focus()
      iframe.contentWindow!.print()
      setTimeout(() => document.body.removeChild(iframe), 5000)
    } catch {
      toast('Failed to generate report', 'error')
    }
    setLoading(null)
  }

  const reportTypes = [
    {
      id:          'sales-order',
      title:       'Sales Order',
      description: 'Customer-facing sales order with financial breakdown, commission, and job details',
      icon:        DollarSign,
      color:       '#22c07a',
      internal:    true,
    },
    {
      id:          'production-brief',
      title:       'Production Brief',
      description: 'Internal production document with panel measurements, material specs, and scope of work',
      icon:        Package,
      color:       '#4f7fff',
      internal:    true,
    },
    {
      id:          'installer-work-order',
      title:       'Installer Work Order',
      description: 'Installer document with pay breakdown, panel measurements, and liability sign-off form',
      icon:        Printer,
      color:       '#f59e0b',
      internal:    true,
    },
    {
      id:          'customer-report',
      title:       'Customer Summary',
      description: 'Customer-friendly job status report with milestones, scope, and contact info. No internal financials.',
      icon:        Users,
      color:       '#22d3ee',
      internal:    false,
    },
  ]

  const isAdmin = profile.role === 'owner' || profile.role === 'admin'

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', marginBottom: 4 }}>
          Reports
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>Generate and download project reports</p>
      </div>

      {/* Period toggle */}
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

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Revenue',     val: fM(totalRevenue),           icon: DollarSign,   color: '#22c07a' },
          { label: 'Net Profit',  val: fM(totalProfit),            icon: TrendingUp,   color: '#4f7fff' },
          { label: 'Avg GPM',     val: `${avgGPM}%`,               icon: BarChart3,    color: '#8b5cf6' },
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
              <option key={p.id} value={p.id}>{p.title}{p.vehicle_desc ? ` · ${p.vehicle_desc}` : ''}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {reportTypes.filter(r => !r.internal || isAdmin || profile.role === 'sales_agent').map(r => (
            <div key={r.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${r.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <r.icon size={16} style={{ color: r.color }} />
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{r.title}</span>
                  {!r.internal && (
                    <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(34,211,238,0.12)', color: '#22d3ee', fontWeight: 700 }}>
                      Customer
                    </span>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.5 }}>{r.description}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => viewReport(r.id)}
                  disabled={!selectedProject || loading === `view-${r.id}`}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 7, border: `1px solid ${selectedProject ? r.color : 'var(--border)'}`,
                    background: 'transparent',
                    color: selectedProject ? r.color : 'var(--text3)',
                    fontSize: 12, fontWeight: 700, cursor: selectedProject ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Printer size={12} />
                  {loading === `view-${r.id}` ? 'Loading...' : 'Print'}
                </button>
                <button
                  onClick={() => downloadReport(r.id)}
                  disabled={!selectedProject || loading === r.id}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 7, border: 'none',
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
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Simple HTML print view ──────────────────────────────────────────────────
function buildPrintHtml(type: string, report: Record<string, unknown>): string {
  const job = (report.job as Record<string, string>) || {}
  const customer = (report.customer as Record<string, string>) || {}
  const agent    = (report.agent as Record<string, string>) || {}
  const milestones = (report.milestones as Array<{ label: string; done: boolean }>) || []

  const title =
    type === 'sales-order'          ? 'Sales Order' :
    type === 'production-brief'     ? 'Production Brief' :
    type === 'installer-work-order' ? 'Installer Work Order' :
    'Customer Job Summary'

  const rows = Object.entries(report)
    .filter(([k]) => !['generatedAt', 'company', 'agent', 'customer', 'job', 'milestones'].includes(k))
    .map(([k, v]) => `<tr><td style="padding:4px 8px;border:1px solid #ddd;font-weight:600;text-transform:capitalize">${k.replace(/_/g,' ')}</td><td style="padding:4px 8px;border:1px solid #ddd">${JSON.stringify(v)}</td></tr>`)
    .join('')

  const milestonesHtml = milestones.map(m =>
    `<li style="margin:4px 0;color:${m.done ? '#16a34a' : '#888'}">${m.done ? '&#10003;' : '&#9675;'} ${m.label}</li>`
  ).join('')

  return `<!DOCTYPE html><html><head><title>${title}</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#222;font-size:14px}
h1{font-size:24px;margin-bottom:4px}h2{font-size:16px;margin-top:24px;margin-bottom:8px;border-bottom:1px solid #ddd;padding-bottom:4px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
.label{font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.05em}
.value{font-size:14px;font-weight:600}
table{border-collapse:collapse;width:100%}
@media print{button{display:none}}
</style></head><body>
<div class="header">
  <div><h1>${title}</h1><div class="label">USA WRAP CO · Ref: ${String(report.ref || '')}</div></div>
  <div style="text-align:right"><div class="label">Generated</div><div class="value">${new Date().toLocaleDateString()}</div></div>
</div>
<h2>Job Details</h2>
<table><tr><td style="padding:4px 8px;border:1px solid #ddd;font-weight:600">Title</td><td style="padding:4px 8px;border:1px solid #ddd">${job.title || ''}</td></tr>
<tr><td style="padding:4px 8px;border:1px solid #ddd;font-weight:600">Vehicle</td><td style="padding:4px 8px;border:1px solid #ddd">${job.vehicleDesc || ''}</td></tr>
<tr><td style="padding:4px 8px;border:1px solid #ddd;font-weight:600">Status</td><td style="padding:4px 8px;border:1px solid #ddd">${job.statusLabel || job.stageLabel || ''}</td></tr>
<tr><td style="padding:4px 8px;border:1px solid #ddd;font-weight:600">Install Date</td><td style="padding:4px 8px;border:1px solid #ddd">${job.installDate ? new Date(job.installDate).toLocaleDateString() : 'TBD'}</td></tr>
</table>
<h2>Contact</h2>
<table><tr><td style="padding:4px 8px;border:1px solid #ddd;font-weight:600">Customer</td><td style="padding:4px 8px;border:1px solid #ddd">${customer.name || ''}</td></tr>
<tr><td style="padding:4px 8px;border:1px solid #ddd;font-weight:600">Agent</td><td style="padding:4px 8px;border:1px solid #ddd">${agent.name || ''}</td></tr>
</table>
${milestones.length ? `<h2>Milestones</h2><ul style="list-style:none;padding:0">${milestonesHtml}</ul>` : ''}
${rows ? `<h2>Additional Data</h2><table>${rows}</table>` : ''}
<div style="margin-top:40px;padding-top:16px;border-top:1px solid #ddd;font-size:11px;color:#888">
  USA WRAP CO · Generated ${new Date().toLocaleString()} · Confidential
</div>
</body></html>`
}
