'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Project, PipeStage } from '@/types'
import { clsx } from 'clsx'
import { canAccess } from '@/types'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/shared/Toast'
import { ActionMenu, type ActionItem } from '@/components/shared/ActionMenu'

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

const STAGE_ORDER: PipeStage[] = ['sales_in','production','install','prod_review','sales_close']

export function PipelineBoard({ profile, initialProjects }: PipelineBoardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [agentFilter, setAgentFilter] = useState('all')
  const [installerFilter, setInstallerFilter] = useState('all')
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [sendBackTarget, setSendBackTarget] = useState<string | null>(null)
  const [sendBackReason, setSendBackReason] = useState('')
  const [sendBackNote, setSendBackNote] = useState('')
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  const canSignOff = canAccess(profile.role, 'sign_off_sales') ||
                     canAccess(profile.role, 'sign_off_production') ||
                     canAccess(profile.role, 'sign_off_install')

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

  async function advanceStage(project: Project) {
    const idx = STAGE_ORDER.indexOf(project.pipe_stage as PipeStage || 'sales_in')
    if (idx < 0) return
    const isLast = idx === STAGE_ORDER.length - 1
    const newStage: PipeStage = isLast ? 'done' : STAGE_ORDER[idx + 1]
    const newStatus = isLast ? 'closed' : project.status
    const newCheckout = { ...project.checkout, [project.pipe_stage]: true }

    const { error } = await supabase.from('projects').update({
      pipe_stage: newStage, status: newStatus, checkout: newCheckout,
      updated_at: new Date().toISOString(),
    }).eq('id', project.id)

    if (error) { toast(error.message, 'error'); return }
    setProjects(prev => prev.map(p =>
      p.id === project.id ? { ...p, pipe_stage: newStage, status: newStatus, checkout: newCheckout } : p
    ))
    toast(isLast ? '🎉 Job closed out!' : `Moved to ${STAGES.find(s => s.key === newStage)?.label}`, 'success')
  }

  async function sendBack(project: Project) {
    if (!sendBackReason) { toast('Reason is required', 'warning'); return }
    const idx = STAGE_ORDER.indexOf(project.pipe_stage as PipeStage || 'sales_in')
    const prevStage = idx > 0 ? STAGE_ORDER[idx - 1] : STAGE_ORDER[0]
    const newSendBacks = [...(project.send_backs || []), {
      from: project.pipe_stage, to: prevStage, reason: sendBackReason,
      note: sendBackNote, at: new Date().toISOString(),
    }]
    const newCheckout = { ...project.checkout }
    delete (newCheckout as any)[prevStage]

    const { error } = await supabase.from('projects').update({
      pipe_stage: prevStage, send_backs: newSendBacks, checkout: newCheckout,
      updated_at: new Date().toISOString(),
    }).eq('id', project.id)

    if (error) { toast(error.message, 'error'); return }
    setProjects(prev => prev.map(p =>
      p.id === project.id ? { ...p, pipe_stage: prevStage, send_backs: newSendBacks, checkout: newCheckout } : p
    ))
    toast('Job sent back', 'warning')
    setSendBackTarget(null)
    setSendBackReason('')
    setSendBackNote('')
  }

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  // Unique agents & installers
  const agentMap = new Map<string, string>()
  projects.forEach(p => { if (p.agent_id && (p.agent as any)?.name) agentMap.set(p.agent_id, (p.agent as any).name) })
  const agents = Array.from(agentMap.entries())

  const installerMap = new Map<string, string>()
  projects.forEach(p => { if (p.installer_id && (p.installer as any)?.name) installerMap.set(p.installer_id, (p.installer as any).name) })
  const installers = Array.from(installerMap.entries())

  const sendbackCount = filtered.filter(p => {
    const lastSB = p.send_backs?.[p.send_backs.length - 1]
    return lastSB && !p.checkout?.[p.pipe_stage]
  }).length

  const totalPipelineValue = filtered.reduce((s, p) => s + (p.revenue || 0), 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-2xl font-900" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              🔄 Approval Pipeline
            </h2>
            <span className="flex items-center gap-1.5 text-xs font-700 text-green bg-green/10 border border-green/30 px-2 py-1 rounded-full">
              <span className="live-dot" />LIVE
            </span>
            <span className="text-xs text-text3 font-600">
              {filtered.length} jobs · {fmtMoney(totalPipelineValue)} pipeline
            </span>
          </div>
        </div>

        {/* Send-back alert */}
        {sendbackCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red/15 border-2 border-red/60 rounded-xl anim-pulse-red">
            <span className="text-xl">🔴</span>
            <div>
              <div className="text-sm font-800 text-red">{sendbackCount} job(s) sent back</div>
              <div className="text-xs text-red/70">Action required</div>
            </div>
          </div>
        )}

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
                <span>{stage.icon} {stage.label}</span>
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
                  const lastSB = project.send_backs?.[project.send_backs.length - 1]
                  const hasSendBack = lastSB && !project.checkout?.[project.pipe_stage]
                  const gpm = project.gpm || 0
                  const expanded = expandedCard === project.id

                  const cardActions: ActionItem[] = [
                    { label: 'Open Project', icon: '📄', onClick: () => router.push(`/projects/${project.id}`) },
                    { label: 'Duplicate', icon: '📋', onClick: async () => {
                      const { data } = await supabase.from('projects').insert({
                        org_id: project.org_id, type: project.type,
                        title: `${project.title} (Copy)`, status: 'estimate',
                        agent_id: project.agent_id, division: project.division,
                        pipe_stage: 'sales_in', vehicle_desc: project.vehicle_desc,
                        form_data: project.form_data, fin_data: project.fin_data,
                        actuals: {}, checkout: {}, send_backs: [],
                      }).select().single()
                      if (data) toast('Duplicated — in Sales Intake', 'success')
                    }},
                    { label: 'Send Back', icon: '↩️', onClick: () => setSendBackTarget(project.id), divider: true },
                  ]

                  return (
                    <div key={project.id}
                      onClick={() => setExpandedCard(expanded ? null : project.id)}
                      className={clsx(
                        'rounded-xl p-3 cursor-pointer transition-all duration-200',
                        'border hover:-translate-y-0.5 hover:shadow-lg',
                        hasSendBack ? 'bg-red/10 border-red/60 anim-pulse-red'
                          : expanded ? 'bg-surface border-accent/40 shadow-lg'
                          : 'bg-surface border-border hover:border-accent/40'
                      )}>
                      {/* Send-back banner */}
                      {hasSendBack && (
                        <div className="mb-2 -mx-3 -mt-3 px-3 py-2 bg-red/20 border-b border-red/40 rounded-t-xl">
                          <div className="text-xs font-900 text-red uppercase tracking-wide">⚠ Sent Back</div>
                          <div className="text-xs text-red/80 mt-0.5">{lastSB.reason?.substring(0, 60)}</div>
                        </div>
                      )}

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
                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          {project.gpm != null && (
                            <span className={clsx('mono text-xs font-700',
                              gpm >= 70 ? 'text-green' : gpm >= 55 ? 'text-amber' : 'text-red'
                            )}>{gpm.toFixed(0)}%</span>
                          )}
                          <ActionMenu items={cardActions} />
                        </div>
                      </div>

                      <div className="text-xs text-text3 mb-2 truncate">{project.vehicle_desc || '—'}</div>

                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
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

                      {/* Expanded section */}
                      {expanded && (
                        <div className="mt-2 pt-2 border-t border-border space-y-2 anim-fade-up">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="text-text3">Type: <span className="text-text1 capitalize">{project.type}</span></div>
                            <div className="text-text3">Priority: <span className="text-text1 capitalize">{project.priority}</span></div>
                            {project.install_date && (
                              <div className="text-text3 col-span-2">
                                Install: <span className="text-text1">{new Date(project.install_date).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                          <button className="btn-ghost btn-xs w-full" onClick={e => { e.stopPropagation(); router.push(`/projects/${project.id}`) }}>
                            Open Full Detail →
                          </button>
                        </div>
                      )}

                      {/* Sign off button */}
                      {canSignOff && !expanded && (
                        <button
                          onClick={e => { e.stopPropagation(); advanceStage(project) }}
                          className={clsx(
                            'w-full text-xs font-700 py-1.5 px-2 rounded-lg transition-all',
                            hasSendBack ? 'bg-red text-white hover:bg-red/90' : 'bg-accent/20 text-accent hover:bg-accent/30'
                          )}>
                          {hasSendBack ? '🔴 Resolve & Advance' : `✓ Sign Off ${stage.label}`}
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

      {/* Send-back modal */}
      {sendBackTarget && (() => {
        const project = projects.find(p => p.id === sendBackTarget)
        if (!project) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setSendBackTarget(null)}>
            <div className="card max-w-md w-full anim-pop-in" onClick={e => e.stopPropagation()}>
              <div className="text-lg font-800 text-text1 mb-1">↩️ Send Back Job</div>
              <div className="text-sm text-text3 mb-4">
                Sending "{(project.customer as any)?.name || project.title}" back to previous stage
              </div>
              <div className="mb-3">
                <label className="field-label">Reason *</label>
                <select className="field" value={sendBackReason} onChange={e => setSendBackReason(e.target.value)}>
                  <option value="">— Select reason —</option>
                  <option value="Design revision needed">Design revision needed</option>
                  <option value="Material issue">Material issue</option>
                  <option value="Customer change request">Customer change request</option>
                  <option value="Quality concern">Quality concern</option>
                  <option value="Missing information">Missing information</option>
                  <option value="Pricing adjustment">Pricing adjustment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="field-label">Note (optional)</label>
                <textarea className="field resize-none" rows={2} placeholder="Additional context…"
                  value={sendBackNote} onChange={e => setSendBackNote(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button className="btn-ghost flex-1" onClick={() => setSendBackTarget(null)}>Cancel</button>
                <button className="btn-danger flex-1" onClick={() => sendBack(project)}>Send Back</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
