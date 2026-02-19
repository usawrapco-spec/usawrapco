'use client'

import { useState, useMemo } from 'react'
import type { Profile, Project } from '@/types'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'

interface DesignClientProps {
  profile: Profile
  projects: Project[]
}

type DesignStatus = 'pending' | 'in_progress' | 'proof_sent' | 'revision' | 'approved'

interface DesignJob {
  projectId: string
  projectTitle: string
  customerName: string
  vehicleDesc: string
  type: string
  designStatus: DesignStatus
  proofVersion: number
  lastUpdated: string
  notes: string
}

const STATUS_CONFIG: Record<DesignStatus, { label: string; badge: string; icon: string }> = {
  pending:     { label: 'Pending',       badge: 'badge-gray',   icon: '⏳' },
  in_progress: { label: 'In Progress',  badge: 'badge-accent', icon: '🎨' },
  proof_sent:  { label: 'Proof Sent',   badge: 'badge-cyan',   icon: '📤' },
  revision:    { label: 'Revision Req',  badge: 'badge-amber',  icon: '🔄' },
  approved:    { label: 'Approved',      badge: 'badge-green',  icon: '✅' },
}

export function DesignClient({ profile, projects }: DesignClientProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  // Generate design jobs from projects
  const designJobs: DesignJob[] = useMemo(() =>
    projects.map(p => {
      // Infer design status from project state
      let designStatus: DesignStatus = 'pending'
      if (p.pipe_stage === 'production' || p.pipe_stage === 'install') designStatus = 'approved'
      else if (p.status === 'active' && p.pipe_stage === 'sales_in') designStatus = 'in_progress'
      else if (p.status === 'estimate') designStatus = 'pending'

      return {
        projectId: p.id,
        projectTitle: p.title,
        customerName: (p.customer as any)?.name || p.title,
        vehicleDesc: p.vehicle_desc || '—',
        type: p.type,
        designStatus,
        proofVersion: 1,
        lastUpdated: p.updated_at,
        notes: '',
      }
    }),
    [projects]
  )

  const filtered = useMemo(() => {
    let list = [...designJobs]
    if (statusFilter !== 'all') list = list.filter(j => j.designStatus === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(j =>
        j.customerName.toLowerCase().includes(q) ||
        j.vehicleDesc.toLowerCase().includes(q) ||
        j.projectTitle.toLowerCase().includes(q)
      )
    }
    return list
  }, [designJobs, statusFilter, search])

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {}
    designJobs.forEach(j => { c[j.designStatus] = (c[j.designStatus] || 0) + 1 })
    return c
  }, [designJobs])

  const selectedJob = selectedProject ? designJobs.find(j => j.projectId === selectedProject) : null

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-900 text-text1"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            🎨 Design Studio
          </h1>
          <p className="text-sm text-text3 mt-1">
            Manage proofs, revisions, and customer approvals
          </p>
        </div>
      </div>

      {/* Status pipeline */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter('all')}
          className={clsx(
            'px-4 py-2 rounded-lg text-sm font-700 transition-all whitespace-nowrap border',
            statusFilter === 'all' ? 'bg-accent/15 border-accent text-accent' : 'bg-surface border-border text-text3 hover:text-text1'
          )}
        >
          All ({designJobs.length})
        </button>
        {(Object.entries(STATUS_CONFIG) as [DesignStatus, typeof STATUS_CONFIG[DesignStatus]][]).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-700 transition-all whitespace-nowrap border',
              statusFilter === key ? 'bg-accent/15 border-accent text-accent' : 'bg-surface border-border text-text3 hover:text-text1'
            )}
          >
            {config.icon} {config.label} ({statusCounts[key] || 0})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Job list */}
        <div className="col-span-2">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                className="field pl-8"
                placeholder="Search design jobs…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text3">🔍</span>
            </div>
          </div>

          {/* Jobs grid */}
          {filtered.length === 0 ? (
            <div className="card text-center py-16">
              <div className="text-4xl mb-3">🎨</div>
              <div className="text-lg font-700 text-text1">No design jobs</div>
              <div className="text-sm text-text3 mt-1">Projects will appear here when they need design work.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map(job => {
                const config = STATUS_CONFIG[job.designStatus]
                const isSelected = selectedProject === job.projectId
                return (
                  <div
                    key={job.projectId}
                    className={clsx(
                      'card cursor-pointer transition-all hover:-translate-y-0.5',
                      isSelected ? 'border-accent bg-accent/5' : 'hover:border-accent/30'
                    )}
                    onClick={() => setSelectedProject(isSelected ? null : job.projectId)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{config.icon}</span>
                          <span className="text-sm font-800 text-text1">{job.customerName}</span>
                          <span className={config.badge}>{config.label}</span>
                          <span className="badge badge-gray capitalize">{job.type}</span>
                        </div>
                        <div className="text-xs text-text3">{job.vehicleDesc}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-text3 mono">v{job.proofVersion}</div>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-border anim-fade-up">
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="bg-surface2 rounded-lg p-3">
                            <div className="text-xs font-700 text-text3 uppercase mb-1">Proof Version</div>
                            <div className="text-lg font-800 text-accent">v{job.proofVersion}</div>
                          </div>
                          <div className="bg-surface2 rounded-lg p-3">
                            <div className="text-xs font-700 text-text3 uppercase mb-1">Design Status</div>
                            <div className="text-sm font-700 text-text1">{config.label}</div>
                          </div>
                          <div className="bg-surface2 rounded-lg p-3">
                            <div className="text-xs font-700 text-text3 uppercase mb-1">Project Type</div>
                            <div className="text-sm font-700 text-text1 capitalize">{job.type}</div>
                          </div>
                        </div>

                        {/* Design actions */}
                        <div className="flex gap-2 flex-wrap">
                          <button className="btn-primary btn-sm">📤 Upload Proof</button>
                          <button className="btn-ghost btn-sm">📧 Send to Customer</button>
                          <button className="btn-ghost btn-sm" onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/projects/${job.projectId}`)
                          }}>
                            Open Project →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar - Design workflow guide */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="section-label mb-3">📋 Design Workflow</div>
            <div className="flex flex-col gap-2">
              {[
                { num: 1, icon: '📥', label: 'Receive Brief', desc: 'Client details, vehicle info, brand guidelines' },
                { num: 2, icon: '🎨', label: 'Create Design', desc: 'Mockup in design software, prepare proof' },
                { num: 3, icon: '📤', label: 'Upload Proof', desc: 'Upload proof file to the project' },
                { num: 4, icon: '📧', label: 'Send for Approval', desc: 'Customer receives proof link with approve/revise options' },
                { num: 5, icon: '🔄', label: 'Handle Revisions', desc: 'Customer requests changes, upload new version' },
                { num: 6, icon: '✅', label: 'Final Approval', desc: 'Customer approves, job moves to production' },
              ].map(step => (
                <div key={step.num} className="flex items-start gap-2.5 p-2 rounded-lg bg-surface2/50">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-900 text-accent shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <div className="text-xs font-700 text-text1">{step.icon} {step.label}</div>
                    <div className="text-xs text-text3 mt-0.5">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="card">
            <div className="section-label mb-3">📊 Design Stats</div>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Pending', count: statusCounts['pending'] || 0, color: 'text-text3' },
                { label: 'In Progress', count: statusCounts['in_progress'] || 0, color: 'text-accent' },
                { label: 'Proofs Sent', count: statusCounts['proof_sent'] || 0, color: 'text-cyan' },
                { label: 'Needs Revision', count: statusCounts['revision'] || 0, color: 'text-amber' },
                { label: 'Approved', count: statusCounts['approved'] || 0, color: 'text-green' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-1">
                  <span className="text-xs font-600 text-text2">{s.label}</span>
                  <span className={clsx('mono text-sm font-800', s.color)}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
