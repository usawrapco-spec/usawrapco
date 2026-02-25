'use client'

import { X, Clock, AlertTriangle, TrendingUp, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface StageSidePanelProps {
  stage: {
    key: string
    label: string
    icon: any
    color: string
  }
  jobs: any[]
  onClose: () => void
}

export default function StageSidePanel({ stage, jobs, onClose }: StageSidePanelProps) {
  const router = useRouter()

  function getQuickActionsForStage(stageKey: string) {
    const nav = (path: string) => () => { onClose(); router.push(path) }
    switch (stageKey) {
      case 'sales_in':
        return [
          { label: 'Convert to Qualified', onClick: nav('/pipeline') },
          { label: 'Send Follow-Up',        onClick: nav('/inbox') },
        ]
      case 'production':
        return [
          { label: 'Send to Print Queue', onClick: nav('/production/print-schedule') },
          { label: 'Mark as Printed',     onClick: nav('/production') },
        ]
      case 'install':
        return [
          { label: 'Schedule Install',   onClick: nav('/calendar') },
          { label: 'Send to Installers', onClick: nav('/bids') },
        ]
      case 'prod_review':
        return [
          { label: 'Pass QC',         onClick: nav('/pipeline') },
          { label: 'Request Reprint', onClick: nav('/production') },
        ]
      case 'sales_close':
        return [
          { label: 'Generate Invoice', onClick: nav('/invoices') },
          { label: 'Mark as Paid',     onClick: nav('/invoices') },
        ]
      default:
        return []
    }
  }

  const calculateDaysInStage = (job: any) => {
    const now = new Date()
    const updated = new Date(job.updated_at)
    return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24))
  }

  const totalPipelineValue = jobs.reduce((sum, j) => sum + (j.revenue || 0), 0)
  const avgDays = jobs.length > 0
    ? jobs.reduce((sum, j) => sum + calculateDaysInStage(j), 0) / jobs.length
    : 0

  const oldestJob = jobs.length > 0
    ? jobs.reduce((oldest, j) =>
        calculateDaysInStage(j) > calculateDaysInStage(oldest) ? j : oldest
      , jobs[0])
    : null

  const bottleneckThreshold = 7
  const bottlenecks = jobs.filter(j => calculateDaysInStage(j) > bottleneckThreshold)

  const StageIcon = stage.icon

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  return (
    <div
      className="fixed inset-y-0 right-0 w-full max-w-xl z-50 flex flex-col"
      style={{ background: 'var(--bg)', boxShadow: '-4px 0 24px rgba(0,0,0,0.3)' }}
    >
      {/* Header */}
      <div className="p-6 border-b border-border" style={{ background: 'var(--surface)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-lg"
              style={{ background: `${stage.color}20`, color: stage.color }}
            >
              <StageIcon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-900 text-text1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                {stage.label}
              </h2>
              <p className="text-sm text-text3">{jobs.length} jobs • {formatMoney(totalPipelineValue)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stage Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg" style={{ background: 'var(--surface2)' }}>
            <div className="text-xs text-text3 mb-1">Avg Time</div>
            <div className="text-lg font-900 text-text1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {avgDays.toFixed(1)}d
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'var(--surface2)' }}>
            <div className="text-xs text-text3 mb-1">Oldest</div>
            <div className="text-lg font-900 text-text1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {oldestJob ? `${calculateDaysInStage(oldestJob)}d` : '—'}
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'var(--surface2)' }}>
            <div className="text-xs text-text3 mb-1">Value</div>
            <div className="text-lg font-900 text-text1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {formatMoney(totalPipelineValue)}
            </div>
          </div>
        </div>

        {/* Bottleneck Alert */}
        {bottlenecks.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-amber/10 border border-amber/30">
            <div className="flex items-center gap-2 text-amber text-sm font-600">
              <AlertTriangle size={16} />
              {bottlenecks.length} job{bottlenecks.length !== 1 ? 's' : ''} stuck longer than {bottleneckThreshold} days
            </div>
          </div>
        )}
      </div>

      {/* Jobs List */}
      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="text-sm font-700 text-text2 uppercase tracking-wide mb-3">
          Jobs in This Stage
        </h3>
        <div className="space-y-2">
          {jobs.length === 0 ? (
            <div className="text-center py-12 text-text3">
              <div className="text-sm">No jobs in this stage</div>
            </div>
          ) : (
            jobs.map((job) => {
              const daysInStage = calculateDaysInStage(job)
              const isBottleneck = daysInStage > bottleneckThreshold

              return (
                <div
                  key={job.id}
                  onClick={() => router.push(`/projects/${job.id}`)}
                  className="card p-4 hover:border-accent/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-700 text-text1 truncate">
                          {job.title || job.vehicle_desc || `Job #${job.id.slice(0, 8)}`}
                        </span>
                        {isBottleneck && (
                          <AlertTriangle size={14} className="text-amber shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text3">
                        {job.customer && (
                          <span>{(job.customer as any).name}</span>
                        )}
                        {job.vehicle_desc && (
                          <span>{job.vehicle_desc}</span>
                        )}
                        {job.agent && (
                          <span>Agent: {(job.agent as any).name}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-700 text-text1">
                        {formatMoney(job.revenue || 0)}
                      </div>
                      <div className={`text-xs ${isBottleneck ? 'text-amber' : 'text-text3'}`}>
                        <Clock size={10} className="inline mr-1" />
                        {daysInStage}d
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-6 border-t border-border" style={{ background: 'var(--surface)' }}>
        <h3 className="text-sm font-700 text-text2 uppercase tracking-wide mb-3">
          Quick Actions
        </h3>
        <div className="space-y-2">
          {getQuickActionsForStage(stage.key).map((action, idx) => (
            <button
              key={idx}
              className="btn-secondary text-sm w-full justify-between"
              onClick={action.onClick}
            >
              <span>{action.label}</span>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

