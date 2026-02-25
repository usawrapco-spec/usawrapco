'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Project, PipeStage } from '@/types'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Briefcase, Printer, Wrench, Search, CheckCircle,
  LayoutGrid, List, X, ChevronRight, Clock, DollarSign, User,
  Filter, ArrowUpDown,
  type LucideIcon,
} from 'lucide-react'
import OnboardingLinkPanel from './OnboardingLinkPanel'

interface PipelineBoardProps {
  profile: Profile
  initialProjects: Project[]
}

const STAGE_COLORS: Record<string, string> = {
  sales_in: '#4f7fff', production: '#22c07a', install: '#22d3ee',
  prod_review: '#f59e0b', sales_close: '#8b5cf6',
}

const STAGES: { key: PipeStage; label: string; icon: LucideIcon; color: string }[] = [
  { key: 'sales_in',    label: 'Sales Intake',  icon: Briefcase,   color: '#4f7fff' },
  { key: 'production',  label: 'Production',    icon: Printer,     color: '#22c07a' },
  { key: 'install',     label: 'Install',       icon: Wrench,      color: '#22d3ee' },
  { key: 'prod_review', label: 'QC Review',     icon: Search,      color: '#f59e0b' },
  { key: 'sales_close', label: 'Sales Close',   icon: CheckCircle, color: '#8b5cf6' },
]

type ViewMode = 'kanban' | 'list'
type SortKey = 'customer' | 'vehicle' | 'value' | 'stage' | 'days'
type DeptView = 'all' | 'sales' | 'production' | 'install'

const DEPT_TABS: { key: DeptView; label: string; icon: LucideIcon; color: string }[] = [
  { key: 'all',        label: 'All Jobs',            icon: LayoutGrid, color: '#8b5cf6' },
  { key: 'sales',      label: 'Sales',               icon: Briefcase,  color: '#4f7fff' },
  { key: 'production', label: 'Production / Design', icon: Printer,    color: '#22c07a' },
  { key: 'install',    label: 'Install',             icon: Wrench,     color: '#22d3ee' },
]

const DEPT_STAGES: Record<DeptView, string[]> = {
  all:        ['sales_in', 'production', 'install', 'prod_review', 'sales_close'],
  sales:      ['sales_in', 'sales_close'],
  production: ['production', 'prod_review'],
  install:    ['install'],
}

export function PipelineBoard({ profile, initialProjects }: PipelineBoardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [agentFilter, setAgentFilter] = useState('all')
  const [installerFilter, setInstallerFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [sortKey, setSortKey] = useState<SortKey>('stage')
  const [sortAsc, setSortAsc] = useState(true)
  const [drawerProject, setDrawerProject] = useState<Project | null>(null)
  const [deptView, setDeptView] = useState<DeptView>(getDefaultDept(profile.role))
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
    if (deptView !== 'all') list = list.filter(p => DEPT_STAGES[deptView].includes(p.pipe_stage || 'sales_in'))
    if (agentFilter !== 'all') list = list.filter(p => p.agent_id === agentFilter)
    if (installerFilter !== 'all') list = list.filter(p => p.installer_id === installerFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.vehicle_desc?.toLowerCase().includes(q) ||
        (p.customer as any)?.name?.toLowerCase().includes(q) ||
        (p.agent as any)?.name?.toLowerCase().includes(q) ||
        (p.form_data as any)?.clientName?.toLowerCase().includes(q)
      )
    }
    return list
  }, [projects, deptView, agentFilter, installerFilter, searchQuery])

  const deptCounts = useMemo(() => {
    const base = projects.filter(p => p.pipe_stage !== 'done' && p.status !== 'cancelled')
    return {
      all:        base.length,
      sales:      base.filter(p => DEPT_STAGES.sales.includes(p.pipe_stage || 'sales_in')).length,
      production: base.filter(p => DEPT_STAGES.production.includes(p.pipe_stage || 'sales_in')).length,
      install:    base.filter(p => DEPT_STAGES.install.includes(p.pipe_stage || 'sales_in')).length,
    }
  }, [projects])

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const daysOpen = (p: Project) => {
    const created = p.created_at ? new Date(p.created_at).getTime() : Date.now()
    return Math.floor((Date.now() - created) / 86400000)
  }

  // Unique agents & installers for filters
  const agentMap = new Map<string, string>()
  projects.forEach(p => { if (p.agent_id && (p.agent as any)?.name) agentMap.set(p.agent_id, (p.agent as any).name) })
  const agents = Array.from(agentMap.entries())

  const installerMap = new Map<string, string>()
  projects.forEach(p => { if (p.installer_id && (p.installer as any)?.name) installerMap.set(p.installer_id, (p.installer as any).name) })
  const installers = Array.from(installerMap.entries())

  const totalPipelineValue = filtered.reduce((s, p) => s + (p.revenue || 0), 0)

  // Sorted list for table view
  const sortedList = useMemo(() => {
    const list = [...filtered]
    const stageOrder = STAGES.map(s => s.key)
    list.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'customer': cmp = ((a.customer as any)?.name || a.title || '').localeCompare((b.customer as any)?.name || b.title || ''); break
        case 'vehicle': cmp = (a.vehicle_desc || '').localeCompare(b.vehicle_desc || ''); break
        case 'value': cmp = (a.revenue || 0) - (b.revenue || 0); break
        case 'stage': cmp = stageOrder.indexOf(a.pipe_stage || 'sales_in') - stageOrder.indexOf(b.pipe_stage || 'sales_in'); break
        case 'days': cmp = daysOpen(a) - daysOpen(b); break
      }
      return sortAsc ? cmp : -cmp
    })
    return list
  }, [filtered, sortKey, sortAsc])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  const openDrawer = (p: Project) => {
    setDrawerProject(p)
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* ── DEPARTMENT FILTER TABS ─────────────────────────────── */}
      <div style={{ overflowX: 'auto', marginBottom: 20, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <div style={{
          display: 'flex', gap: 6, padding: 6,
          background: 'var(--surface)', borderRadius: 16,
          border: '1px solid var(--card-border)', minWidth: 'max-content',
        }}>
          {DEPT_TABS.filter(dept => shouldShowDeptTab(dept.key, profile.role)).map(dept => {
            const isActive = deptView === dept.key
            const count = deptCounts[dept.key]
            return (
              <button
                key={dept.key}
                onClick={() => setDeptView(dept.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '11px 22px', borderRadius: 11,
                  border: 'none', cursor: 'pointer',
                  fontSize: 15, fontWeight: isActive ? 800 : 600,
                  fontFamily: 'Barlow Condensed, sans-serif',
                  letterSpacing: '0.03em', textTransform: 'uppercase',
                  background: isActive ? dept.color : 'transparent',
                  color: isActive ? '#fff' : 'var(--text3)',
                  transition: 'all 0.15s ease', whiteSpace: 'nowrap',
                  boxShadow: isActive ? `0 4px 20px ${dept.color}50` : 'none',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = `${dept.color}18`
                    e.currentTarget.style.color = dept.color
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text3)'
                  }
                }}
              >
                <dept.icon size={17} />
                {dept.label}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 24, height: 22, padding: '0 7px', borderRadius: 11,
                  fontSize: 12, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
                  background: isActive ? 'rgba(255,255,255,0.22)' : `${dept.color}25`,
                  color: isActive ? '#fff' : dept.color,
                }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <OnboardingLinkPanel profile={profile} projects={projects} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, fontWeight: 900,
            color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.03em',
          }}>
            Pipeline
          </h2>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 700, color: 'var(--green)',
            background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.2)',
            padding: '3px 10px', borderRadius: 20,
          }}>
            <span className="live-dot" />LIVE
          </span>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
            {filtered.length} jobs &middot; {fmtMoney(totalPipelineValue)}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search pipeline..."
              style={{
                padding: '6px 10px 6px 30px', borderRadius: 8,
                background: 'var(--surface2)', border: '1px solid var(--card-border)',
                color: 'var(--text1)', fontSize: 12, width: 180, outline: 'none',
                transition: 'all 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--card-border)'}
            />
          </div>

          {/* Filters */}
          {agents.length > 0 && (
            <select className="field text-xs py-1.5" style={{ width: 140 }} value={agentFilter} onChange={e => setAgentFilter(e.target.value)}>
              <option value="all">All Agents</option>
              {agents.map(([id, name]) => <option key={id!} value={id!}>{name}</option>)}
            </select>
          )}
          {installers.length > 0 && (
            <select className="field text-xs py-1.5" style={{ width: 140 }} value={installerFilter} onChange={e => setInstallerFilter(e.target.value)}>
              <option value="all">All Installers</option>
              {installers.map(([id, name]) => <option key={id!} value={id!}>{name}</option>)}
            </select>
          )}

          {/* View toggle */}
          <div style={{
            display: 'flex', gap: 2, padding: 3, background: 'var(--surface2)',
            borderRadius: 8, border: '1px solid var(--card-border)',
          }}>
            <button
              onClick={() => setViewMode('kanban')}
              style={{
                padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: viewMode === 'kanban' ? 'var(--card-bg)' : 'transparent',
                color: viewMode === 'kanban' ? 'var(--text1)' : 'var(--text3)',
                display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
                boxShadow: viewMode === 'kanban' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <LayoutGrid size={13} /> Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: viewMode === 'list' ? 'var(--card-bg)' : 'transparent',
                color: viewMode === 'list' ? 'var(--text1)' : 'var(--text3)',
                display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <List size={13} /> List
            </button>
          </div>
        </div>
      </div>

      {/* ── KANBAN VIEW ────────────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
          {STAGES.map(stage => {
            const stageJobs = filtered.filter(p => (p.pipe_stage || 'sales_in') === stage.key)
            const stageValue = stageJobs.reduce((s, p) => s + (p.revenue || 0), 0)
            const Icon = stage.icon
            return (
              <div key={stage.key} style={{
                flex: '1 0 260px', maxWidth: 320, minHeight: 200,
                background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                borderRadius: 16, padding: 14,
              }}>
                {/* Column header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 12, paddingBottom: 10,
                  borderBottom: `2px solid ${stage.color}20`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: `${stage.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={12} style={{ color: stage.color }} />
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 800, color: stage.color,
                      fontFamily: 'Barlow Condensed, sans-serif',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {stage.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {stageValue > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {fmtMoney(stageValue)}
                      </span>
                    )}
                    <span style={{
                      fontSize: 10, fontWeight: 800, color: stage.color,
                      background: `${stage.color}15`, padding: '2px 8px',
                      borderRadius: 10, fontFamily: 'JetBrains Mono, monospace',
                    }}>
                      {stageJobs.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stageJobs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--text3)', opacity: 0.5 }}>No jobs</div>
                  ) : stageJobs.map((project, idx) => {
                    const gpm = project.gpm || 0
                    const days = daysOpen(project)
                    return (
                      <div key={project.id}
                        onClick={() => openDrawer(project)}
                        style={{
                          borderRadius: 12, padding: 12, cursor: 'pointer',
                          background: 'var(--surface)', border: '1px solid var(--card-border)',
                          transition: 'all 0.15s',
                          animation: `staggerIn .3s ease ${idx * 0.04}s both`,
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = `${stage.color}60`
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = `0 4px 16px ${stage.color}15`
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--card-border)'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        {/* Progress bar */}
                        <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                          {STAGES.map(s => (
                            <div key={s.key} style={{
                              flex: 1, height: 2, borderRadius: 1,
                              background: project.checkout?.[s.key] ? 'var(--green)' :
                                s.key === stage.key ? stage.color : 'var(--surface2)',
                              transition: 'background 0.2s',
                            }} />
                          ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, marginBottom: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', lineHeight: 1.2 }}>
                            {(project.customer as any)?.name || (project.form_data as any)?.clientName || project.title}
                          </div>
                          {gpm > 0 && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                              color: gpm >= 70 ? 'var(--green)' : gpm >= 55 ? 'var(--amber)' : 'var(--red)',
                              flexShrink: 0,
                            }}>
                              {gpm.toFixed(0)}%
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {project.vehicle_desc || '\u2014'}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {(project.agent as any)?.name && (
                            <span style={{
                              fontSize: 10, fontWeight: 600, color: 'var(--text3)',
                              background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4,
                            }}>
                              {(project.agent as any).name}
                            </span>
                          )}
                          {project.revenue ? (
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
                              {fmtMoney(project.revenue)}
                            </span>
                          ) : null}
                          {days > 0 && (
                            <span style={{
                              fontSize: 10, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
                              color: days > 14 ? 'var(--red)' : days > 7 ? 'var(--amber)' : 'var(--text3)',
                              marginLeft: 'auto',
                            }}>
                              {days}d
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── LIST VIEW ──────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: 16, overflow: 'hidden',
        }}>
          <table className="data-table">
            <thead>
              <tr>
                {[
                  { key: 'customer' as SortKey, label: 'Customer' },
                  { key: 'vehicle' as SortKey, label: 'Vehicle' },
                  { key: 'value' as SortKey, label: 'Value' },
                  { key: 'stage' as SortKey, label: 'Stage' },
                  { key: 'days' as SortKey, label: 'Days Open' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {col.label}
                      {sortKey === col.key && (
                        <ArrowUpDown size={10} style={{ color: 'var(--accent)' }} />
                      )}
                    </span>
                  </th>
                ))}
                <th>Assigned</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {sortedList.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>No jobs found</td></tr>
              ) : sortedList.map((project, idx) => {
                const stage = STAGES.find(s => s.key === (project.pipe_stage || 'sales_in'))
                const days = daysOpen(project)
                return (
                  <tr
                    key={project.id}
                    onClick={() => openDrawer(project)}
                    style={{
                      cursor: 'pointer',
                      animation: `staggerIn .25s ease ${idx * 0.02}s both`,
                    }}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--text1)' }}>
                      {(project.customer as any)?.name || (project.form_data as any)?.clientName || project.title}
                    </td>
                    <td>{project.vehicle_desc || '\u2014'}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--green)' }}>
                      {project.revenue ? fmtMoney(project.revenue) : '\u2014'}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                        padding: '3px 8px', borderRadius: 6,
                        background: `${stage?.color || '#4f7fff'}15`,
                        color: stage?.color || '#4f7fff',
                      }}>
                        {stage?.label || 'Unknown'}
                      </span>
                    </td>
                    <td style={{
                      fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
                      color: days > 14 ? 'var(--red)' : days > 7 ? 'var(--amber)' : 'var(--text3)',
                    }}>
                      {days}d
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {(project.agent as any)?.name || '\u2014'}
                    </td>
                    <td>
                      <ChevronRight size={14} style={{ color: 'var(--text3)' }} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── JOB DETAIL DRAWER ──────────────────────────────────────── */}
      {drawerProject && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerProject(null)} />
          <div className="drawer-panel">
            {/* Drawer header */}
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid var(--card-border)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', marginBottom: 4 }}>
                  {(drawerProject.customer as any)?.name || (drawerProject.form_data as any)?.clientName || drawerProject.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {drawerProject.vehicle_desc || 'No vehicle description'}
                </div>
                {(() => {
                  const stage = STAGES.find(s => s.key === (drawerProject.pipe_stage || 'sales_in'))
                  return stage ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      padding: '3px 10px', borderRadius: 6, marginTop: 8,
                      background: `${stage.color}15`, color: stage.color,
                    }}>
                      {stage.label}
                    </span>
                  ) : null
                })()}
              </div>
              <button onClick={() => setDrawerProject(null)} style={{
                background: 'var(--surface2)', border: '1px solid var(--card-border)',
                borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--text3)',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text1)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {/* Financial summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface2)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>Revenue</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {fmtMoney(drawerProject.revenue || 0)}
                  </div>
                </div>
                <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface2)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>GPM</div>
                  <div style={{
                    fontSize: 22, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
                    color: (drawerProject.gpm || 0) >= 70 ? 'var(--green)' : (drawerProject.gpm || 0) >= 55 ? 'var(--amber)' : 'var(--red)',
                  }}>
                    {(drawerProject.gpm || 0).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Sales Agent', value: (drawerProject.agent as any)?.name, icon: User, color: 'var(--accent)' },
                  { label: 'Installer', value: (drawerProject.installer as any)?.name, icon: Wrench, color: 'var(--cyan)' },
                  { label: 'Install Date', value: (drawerProject.form_data as any)?.install_date || drawerProject.install_date, icon: Clock, color: 'var(--amber)' },
                  { label: 'Days Open', value: `${daysOpen(drawerProject)} days`, icon: Clock, color: 'var(--text3)' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: `${item.color}12`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <item.icon size={13} style={{ color: item.color }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase' }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{item.value || '\u2014'}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pipeline progress */}
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Pipeline Progress
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {STAGES.map(s => {
                    const isActive = (drawerProject.pipe_stage || 'sales_in') === s.key
                    const isComplete = drawerProject.checkout?.[s.key]
                    return (
                      <div key={s.key} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                        borderRadius: 8,
                        background: isActive ? `${s.color}10` : 'transparent',
                        border: isActive ? `1px solid ${s.color}30` : '1px solid transparent',
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: isComplete ? s.color : isActive ? `${s.color}30` : 'var(--surface2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isComplete && <CheckCircle size={12} style={{ color: '#fff' }} />}
                        </div>
                        <span style={{
                          fontSize: 12, fontWeight: isActive ? 700 : 500,
                          color: isActive ? s.color : isComplete ? 'var(--text2)' : 'var(--text3)',
                        }}>
                          {s.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Drawer footer */}
            <div style={{
              padding: '14px 24px', borderTop: '1px solid var(--card-border)',
              display: 'flex', gap: 8,
            }}>
              <Link
                href={`/projects/${drawerProject.id}`}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 10,
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  textDecoration: 'none', textAlign: 'center',
                  transition: 'all 0.15s',
                  display: 'block',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(79,127,255,0.35)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                Open Full Detail
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function getDefaultDept(role: string): DeptView {
  switch (role) {
    case 'installer': return 'install'
    case 'production':
    case 'designer': return 'production'
    case 'sales_agent': return 'sales'
    default: return 'all'
  }
}

function shouldShowDeptTab(tab: DeptView, role: string): boolean {
  if (['admin', 'owner'].includes(role)) return true
  if (tab === 'all') return true
  if (tab === 'sales' && role === 'sales_agent') return true
  if (tab === 'production' && ['production', 'designer'].includes(role)) return true
  if (tab === 'install' && ['installer', 'production'].includes(role)) return true
  return false
}
