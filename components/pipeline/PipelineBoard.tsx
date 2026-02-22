'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Project, PipeStage } from '@/types'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'
import { Briefcase, Printer, Wrench, Search, CheckCircle, type LucideIcon } from 'lucide-react'
import OnboardingLinkPanel from './OnboardingLinkPanel'

interface PipelineBoardProps {
  profile: Profile
  initialProjects: Project[]
}

const STAGES: { key: PipeStage; label: string; icon: LucideIcon; color: string; bg: string }[] = [
  { key: 'sales_in',    label: 'Sales Intake',  icon: Briefcase,   color: 'text-accent',  bg: 'bg-accent/5' },
  { key: 'production',  label: 'Production',    icon: Printer,     color: 'text-green',   bg: 'bg-green/5' },
  { key: 'install',     label: 'Install',       icon: Wrench,      color: 'text-cyan',    bg: 'bg-cyan/5' },
  { key: 'prod_review', label: 'QC Review',     icon: Search,      color: 'text-amber',   bg: 'bg-amber/5' },
  { key: 'sales_close', label: 'Sales Close',   icon: CheckCircle, color: 'text-purple',  bg: 'bg-purple/5' },
]

export function PipelineBoard({ profile, initialProjects }: PipelineBoardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [agentFilter, setAgentFilter] = useState('all')
  const [installerFilter, setInstallerFilter] = useState('all')
  const supabase = createClient()
  const router = useRouter()

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('pipeline-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'projects',
        filter: `org_id=eq.${profile.org_id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setProjects(prev => [...prev, payload.new as Project])
        } else if (payload.eventType === 'UPDATE') {
          setProjects(prev => prev.map(p =>
            p.id === (payload.new as Project).id ? { ...p, ...payload.new } : p
          ))
        } else if (payload.eventType === 'DELETE') {
          setProjects(prev => prev.filter(p => p.id !== (payload.old as any).id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile.org_id])

  const filtered = useMemo(() => {
    let list = projects.filter(p => p.pipe_stage !== 'done' && p.status !== 'cancelled')
    if (agentFilter !== 'all') list = list.filter(p => p.agent_id === agentFilter)
    if (installerFilter !== 'all') list = list.filter(p => p.installer_id === installerFilter)
    return list
  }, [projects, agentFilter, installerFilter])

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  // Unique agents & installers for filters
  const agentMap = new Map<string, string>()
  projects.forEach(p => { if (p.agent_id && (p.agent as any)?.name) agentMap.set(p.agent_id, (p.agent as any).name) })
  const agents = Array.from(agentMap.entries())

  const installerMap = new Map<string, string>()
  projects.forEach(p => { if (p.installer_id && (p.installer as any)?.name) installerMap.set(p.installer_id, (p.installer as any).name) })
  const installers = Array.from(installerMap.entries())

  const totalPipelineValue = filtered.reduce((s, p) => s + (p.revenue || 0), 0)

  return (
    <div>
      {/* Onboarding Link Generator — TOP of pipeline per spec */}
      <OnboardingLinkPanel profile={profile} projects={projects} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-2xl font-900" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Job Board
            </h2>
            <span className="flex items-center gap-1.5 text-xs font-700 text-green bg-green/10 border border-green/30 px-2 py-1 rounded-full">
              <span className="live-dot" />LIVE
            </span>
            <span className="text-xs text-text3 font-600">
              {filtered.length} jobs · {fmtMoney(totalPipelineValue)} pipeline
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 ml-auto">
          {agents.length > 0 && (
            <select className="field text-xs py-1.5 w-36" value={agentFilter} onChange={e => setAgentFilter(e.target.value)}>
              <option value="all">All Agents</option>
              {agents.map(([id, name]) => <option key={id!} value={id!}>{name}</option>)}
            </select>
          )}
          {installers.length > 0 && (
            <select className="field text-xs py-1.5 w-36" value={installerFilter} onChange={e => setInstallerFilter(e.target.value)}>
              <option value="all">All Installers</option>
              {installers.map(([id, name]) => <option key={id!} value={id!}>{name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const stageJobs = filtered.filter(p => (p.pipe_stage || 'sales_in') === stage.key)
          const stageValue = stageJobs.reduce((s, p) => s + (p.revenue || 0), 0)
          return (
            <div key={stage.key}
              className={clsx('kanban-col shrink-0', stage.bg, 'border border-white/5 rounded-xl p-3 min-h-32')}>
              {/* Column header */}
              <div className={clsx(
                'flex items-center justify-between mb-3 pb-2 border-b border-white/10',
                'text-xs font-800 uppercase tracking-wider', stage.color
              )}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><stage.icon size={13} />{stage.label}</span>
                <div className="flex items-center gap-2">
                  {stageValue > 0 && <span className="text-text3 font-600 normal-case">{fmtMoney(stageValue)}</span>}
                  <span className="bg-white/10 px-2 py-0.5 rounded-full">{stageJobs.length}</span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2">
                {stageJobs.length === 0 ? (
                  <div className="text-xs text-text3 text-center py-6 opacity-50">No jobs</div>
                ) : stageJobs.map(project => {
                  const gpm = project.gpm || 0

                  return (
                    <div key={project.id}
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className={clsx(
                        'rounded-xl p-3 cursor-pointer transition-all duration-200',
                        'border hover:-translate-y-0.5 hover:shadow-lg',
                        'bg-surface border-border hover:border-accent/40'
                      )}>
                      {/* Progress dots */}
                      <div className="flex gap-0.5 mb-2">
                        {STAGES.map(s => (
                          <div key={s.key} className={clsx(
                            'flex-1 h-0.5 rounded-full',
                            project.checkout?.[s.key] ? 'bg-green' :
                            s.key === stage.key ? 'bg-accent' : 'bg-white/10'
                          )} />
                        ))}
                      </div>

                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="text-sm font-800 text-text1 leading-tight">
                          {(project.customer as any)?.name || (project.form_data as any)?.clientName || project.title}
                        </div>
                        {project.gpm != null && (
                          <span className={clsx('mono text-xs font-700 shrink-0',
                            gpm >= 70 ? 'text-green' : gpm >= 55 ? 'text-amber' : 'text-red'
                          )}>{gpm.toFixed(0)}%</span>
                        )}
                      </div>

                      <div className="text-xs text-text3 mb-2 truncate">{project.vehicle_desc || '—'}</div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(project.installer as any)?.name && (
                          <span className="badge badge-cyan text-xs">{(project.installer as any).name}</span>
                        )}
                        {(project.agent as any)?.name && (
                          <span className="badge badge-gray text-xs">{(project.agent as any).name}</span>
                        )}
                        {project.revenue ? (
                          <span className="text-xs font-600 text-green">{fmtMoney(project.revenue)}</span>
                        ) : null}
                      </div>
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
