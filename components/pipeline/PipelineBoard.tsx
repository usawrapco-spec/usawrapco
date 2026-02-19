'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Project, PipeStage } from '@/types'
import { clsx } from 'clsx'
import { canAccess } from '@/types'

interface PipelineBoardProps {
  profile: Profile
  initialProjects: Project[]
}

const STAGES: { key: PipeStage; label: string; icon: string; color: string; bg: string }[] = [
  { key: 'sales_in',    label: 'Sales Intake',  icon: '💼', color: 'text-accent',  bg: 'bg-accent/5' },
  { key: 'production',  label: 'Production',    icon: '🖨', color: 'text-green',   bg: 'bg-green/5' },
  { key: 'install',     label: 'Install',       icon: '🔧', color: 'text-cyan',    bg: 'bg-cyan/5' },
  { key: 'prod_review', label: 'QC Review',     icon: '🔍', color: 'text-amber',   bg: 'bg-amber/5' },
  { key: 'sales_close', label: 'Sales Close',   icon: '✅', color: 'text-purple',  bg: 'bg-purple/5' },
]

export function PipelineBoard({ profile, initialProjects }: PipelineBoardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [agentFilter, setAgentFilter] = useState('all')
  const [installerFilter, setInstallerFilter] = useState('all')
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const supabase = createClient()

  const canSignOff = canAccess(profile.role, 'sign_off_sales') ||
                     canAccess(profile.role, 'sign_off_production') ||
                     canAccess(profile.role, 'sign_off_install')

  const filtered = useMemo(() => {
    let list = [...projects]
    if (agentFilter !== 'all') list = list.filter(p => p.agent_id === agentFilter)
    if (installerFilter !== 'all') list = list.filter(p => p.installer_id === installerFilter)
    return list
  }, [projects, agentFilter, installerFilter])

  async function advanceStage(project: Project) {
    const order: PipeStage[] = ['sales_in','production','install','prod_review','sales_close']
    const idx = order.indexOf(project.pipe_stage || 'sales_in')
    if (idx < 0) return

    const isLast = idx === order.length - 1
    const newStage: PipeStage = isLast ? 'done' : order[idx + 1]
    const newStatus = isLast ? 'closed' : project.status
    const newCheckout = { ...project.checkout, [project.pipe_stage]: true }

    const { error } = await supabase.from('projects').update({
      pipe_stage: newStage,
      status:     newStatus,
      checkout:   newCheckout,
      updated_at: new Date().toISOString(),
    }).eq('id', project.id)

    if (!error) {
      setProjects(prev => prev.map(p =>
        p.id === project.id
          ? { ...p, pipe_stage: newStage, status: newStatus, checkout: newCheckout }
          : p
      ))
      setLastUpdated(new Date())
    }
  }

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const agentMap = new Map<string, string>()
  projects.filter(p => p.agent_id && (p.agent as any)?.name)
    .forEach(p => agentMap.set(p.agent_id!, (p.agent as any).name))
  const agents = Array.from(agentMap.entries())

  const installerMap = new Map<string, string>()
  projects.filter(p => p.installer_id && (p.installer as any)?.name)
    .forEach(p => installerMap.set(p.installer_id!, (p.installer as any).name))
  const installers = Array.from(installerMap.entries())

  const sendbackCount = projects.filter(p => {
    const lastSB = p.send_backs?.[p.send_backs.length - 1]
    return lastSB && !p.checkout?.[p.pipe_stage]
  }).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-2xl font-900" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              🔄 Approval Process
            </h2>
            <span className="flex items-center gap-1.5 text-xs font-700 text-green bg-green/10 border border-green/30 px-2 py-1 rounded-full">
              <span className="live-dot" />LIVE
            </span>
          </div>
          <div className="text-xs text-text3 mt-1">
            Updated {lastUpdated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}
          </div>
        </div>

        {/* Send-back alert */}
        {sendbackCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red/15 border-2 border-red/60 rounded-xl anim-pulse-red">
            <span className="text-xl">🔴</span>
            <div>
              <div className="text-sm font-800 text-red">{sendbackCount} job(s) sent back</div>
              <div className="text-xs text-red/70">Action required — click the card</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 ml-auto">
          {agents.length > 0 && (
            <select className="field text-xs py-1.5 w-36"
              value={agentFilter} onChange={e => setAgentFilter(e.target.value)}>
              <option value="all">All Agents</option>
              {agents.map(([id, name]) => <option key={id!} value={id!}>{name}</option>)}
            </select>
          )}
          {installers.length > 0 && (
            <select className="field text-xs py-1.5 w-36"
              value={installerFilter} onChange={e => setInstallerFilter(e.target.value)}>
              <option value="all">All Installers</option>
              {installers.map(([id, name]) => <option key={id!} value={id!}>{name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const stageJobs = filtered.filter(p =>
            (p.pipe_stage || 'sales_in') === stage.key
          )
          return (
            <div
              key={stage.key}
              className={clsx('kanban-col shrink-0', stage.bg,
                'border border-white/5 rounded-xl p-3 min-h-32')}
            >
              {/* Column header */}
              <div className={clsx(
                'flex items-center justify-between mb-3 pb-2 border-b border-white/10',
                'text-xs font-800 uppercase tracking-wider', stage.color
              )}>
                <span>{stage.icon} {stage.label}</span>
                <span className="bg-white/10 px-2 py-0.5 rounded-full">{stageJobs.length}</span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2">
                {stageJobs.length === 0 ? (
                  <div className="text-xs text-text3 text-center py-6 opacity-50">
                    No jobs
                  </div>
                ) : stageJobs.map(project => {
                  const lastSB = project.send_backs?.[project.send_backs.length - 1]
                  const hasSendBack = lastSB && !project.checkout?.[project.pipe_stage]
                  const gpm = project.gpm || 0

                  return (
                    <div
                      key={project.id}
                      className={clsx(
                        'rounded-xl p-3 cursor-pointer transition-all duration-200',
                        'border hover:-translate-y-0.5 hover:shadow-lg',
                        hasSendBack
                          ? 'bg-red/10 border-red/60 anim-pulse-red'
                          : 'bg-surface border-border hover:border-accent/40'
                      )}
                    >
                      {/* Send-back banner */}
                      {hasSendBack && (
                        <div className="mb-2 -mx-3 -mt-3 px-3 py-2 bg-red/20 border-b border-red/40 rounded-t-xl">
                          <div className="text-xs font-900 text-red uppercase tracking-wide">
                            ⚠ Sent Back — Action Required
                          </div>
                          <div className="text-xs text-red/80 mt-0.5 font-500">
                            {lastSB.reason?.substring(0, 60)}
                          </div>
                        </div>
                      )}

                      {/* Stage progress dots */}
                      <div className="flex gap-0.5 mb-2">
                        {STAGES.map(s => (
                          <div key={s.key} className={clsx(
                            'flex-1 h-0.5 rounded-full transition-colors',
                            project.checkout?.[s.key] ? 'bg-green' :
                            s.key === stage.key ? 'bg-accent' : 'bg-white/10'
                          )} />
                        ))}
                      </div>

                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="text-sm font-800 text-text1 leading-tight">
                          {(project.customer as any)?.name || project.title}
                        </div>
                        {project.gpm != null && (
                          <span className={clsx(
                            'mono text-xs font-700 shrink-0',
                            gpm >= 70 ? 'text-green' : gpm >= 55 ? 'text-amber' : 'text-red'
                          )}>
                            {gpm.toFixed(0)}%
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-text3 mb-2 truncate">
                        {project.vehicle_desc || '—'}
                      </div>

                      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                        {(project.installer as any)?.name && (
                          <span className="badge badge-cyan text-xs">
                            {(project.installer as any).name}
                          </span>
                        )}
                        {project.revenue && (
                          <span className="text-xs font-600 text-green">
                            {fmtMoney(project.revenue)}
                          </span>
                        )}
                      </div>

                      {canSignOff && (
                        <button
                          onClick={() => advanceStage(project)}
                          className={clsx(
                            'w-full text-xs font-700 py-1.5 px-2 rounded-lg transition-all',
                            hasSendBack
                              ? 'bg-red text-white hover:bg-red/90'
                              : 'bg-accent/20 text-accent hover:bg-accent/30'
                          )}
                        >
                          {hasSendBack ? '🔴 Resolve Send-Back' : `✓ Sign Off ${stage.label}`}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
