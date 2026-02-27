'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Edit2, Check, X, ChevronDown,
  User, Calendar, DollarSign, TrendingUp, Percent, Award,
  Building2, Car, Flag, Wrench, UserCheck,
  MessageSquare, Camera, FileImage, History,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Project, PipeStage, ProjectFinancials } from '@/types'
import JobChat from '@/components/chat/JobChat'
import JobPhotosTab from '@/components/projects/JobPhotosTab'
import ProofingPanel from '@/components/projects/ProofingPanel'

// ─── Extended types ────────────────────────────────────────────────────────────
interface CustomerRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  company_name: string | null
  lifetime_spend: number | null
}

export interface StageApproval {
  id: string
  project_id: string
  stage: string
  approved_by: string | null
  created_at: string
  approved_at?: string | null
  note?: string | null
  approver?: { name: string; avatar_url: string | null } | null
}

export interface JobDetailClientProps {
  profile: Profile
  project: Project
  teammates: Pick<Profile, 'id' | 'name' | 'role'>[]
  initialApprovals: StageApproval[]
}

// ─── Stage config ──────────────────────────────────────────────────────────────
const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  sales_in:    { label: 'Sales In',    color: '#4f7fff', bg: '#4f7fff20' },
  production:  { label: 'Production',  color: '#f59e0b', bg: '#f59e0b20' },
  install:     { label: 'Install',     color: '#22d3ee', bg: '#22d3ee20' },
  prod_review: { label: 'QC Review',   color: '#8b5cf6', bg: '#8b5cf620' },
  sales_close: { label: 'Sales Close', color: '#22c07a', bg: '#22c07a20' },
  done:        { label: 'Done',        color: '#22c07a', bg: '#22c07a20' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: '#f25a5a' },
  high:   { label: 'High',   color: '#f59e0b' },
  normal: { label: 'Normal', color: '#9299b5' },
  low:    { label: 'Low',    color: '#5a6080' },
}

const PIPE_STAGES: PipeStage[] = ['sales_in', 'production', 'install', 'prod_review', 'sales_close', 'done']

type Tab = 'overview' | 'timeline' | 'comments' | 'photos' | 'proofs'

// ─── Main component ────────────────────────────────────────────────────────────
export default function JobDetailClient({
  profile,
  project: initialProject,
  teammates,
  initialApprovals,
}: JobDetailClientProps) {
  const router = useRouter()
  const supabase = createClient()

  // project.customer at runtime has extra fields (phone, company_name, etc.)
  // beyond what the Project type declares — cast via unknown
  const [project, setProject] = useState(initialProject as unknown as Project & { customer?: CustomerRow | null })
  const [tab, setTab] = useState<Tab>('overview')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [approvals] = useState<StageApproval[]>(initialApprovals)
  const [stageOpen, setStageOpen] = useState(false)
  const [savingField, setSavingField] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const stageDropdownRef = useRef<HTMLDivElement>(null)

  // Bug fix: close stage dropdown when clicking outside
  useEffect(() => {
    if (!stageOpen) return
    const handler = (e: MouseEvent) => {
      if (stageDropdownRef.current && !stageDropdownRef.current.contains(e.target as Node)) {
        setStageOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [stageOpen])

  // Edit state
  const [editTitle, setEditTitle] = useState(project.title)
  const [editInstallDate, setEditInstallDate] = useState(project.install_date || '')
  const [editDueDate, setEditDueDate] = useState(project.due_date || '')

  const customer = (project.customer as unknown) as CustomerRow | null | undefined
  const stage = STAGE_CONFIG[project.pipe_stage] ?? STAGE_CONFIG.sales_in
  const priority = PRIORITY_CONFIG[project.priority] ?? PRIORITY_CONFIG.normal
  const fd = (project.form_data ?? {}) as Record<string, any>
  const fin = project.fin_data

  const installers = teammates.filter(t => t.role === 'installer')
  const agents = teammates.filter(t =>
    ['sales_agent', 'admin', 'owner'].includes(t.role)
  )

  const fmt$ = (v: number | null | undefined) =>
    v != null ? `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'
  const fmtPct = (v: number | null | undefined) =>
    v != null ? `${v.toFixed(1)}%` : '—'
  const fmtDate = (d: string | null | undefined) => {
    if (!d) return '—'
    // Parse date-only strings (e.g. "2024-01-15") at noon local time to prevent
    // UTC→local timezone shift causing off-by-one day in negative UTC offsets
    const parsed = d.includes('T') ? new Date(d) : new Date(d + 'T12:00:00')
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const saveEdits = async () => {
    setSaving(true)
    setSaveError(null)
    const updates = {
      title: editTitle,
      install_date: editInstallDate || null,
      due_date: editDueDate || null,
    }
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', project.id)
      .select()
      .single()
    if (!error && data) {
      setProject(p => ({ ...p, ...updates }))
      setEditing(false)  // only close on success
    } else {
      setSaveError('Save failed — please try again')
    }
    setSaving(false)
  }

  const cancelEdits = () => {
    setEditing(false)
    setEditTitle(project.title)
    setEditInstallDate(project.install_date || '')
    setEditDueDate(project.due_date || '')
  }

  const updateField = async (field: string, value: string | null) => {
    setSavingField(field)
    setFieldError(null)
    const { error } = await supabase
      .from('projects')
      .update({ [field]: value })
      .eq('id', project.id)
    if (!error) {
      // Bug fix: for joined fields, also update the joined object so the
      // Overview "Team" card reflects the new name without a page reload
      if (field === 'installer_id') {
        const mate = teammates.find(t => t.id === value)
        setProject(p => ({
          ...p,
          installer_id: value,
          installer: mate ? { id: mate.id, name: mate.name, email: '' } : undefined,
        }))
      } else if (field === 'agent_id') {
        const mate = teammates.find(t => t.id === value)
        setProject(p => ({
          ...p,
          agent_id: value,
          agent: mate ? { id: mate.id, name: mate.name, email: '' } : undefined,
        }))
      } else {
        setProject(p => ({ ...p, [field]: value }))
      }
    } else {
      setFieldError(`Failed to update ${field.replace('_', ' ')}`)
    }
    setSavingField(null)
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview',  label: 'Overview',  icon: <User size={14} /> },
    { key: 'timeline',  label: 'Timeline',  icon: <History size={14} /> },
    { key: 'comments',  label: 'Comments',  icon: <MessageSquare size={14} /> },
    { key: 'photos',    label: 'Photos',    icon: <Camera size={14} /> },
    { key: 'proofs',    label: 'Proofs',    icon: <FileImage size={14} /> },
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
        flexWrap: 'wrap', padding: '4px 0',
      }}>
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px',
            borderRadius: 8, border: '1px solid var(--surface2)', background: 'transparent',
            color: 'var(--text2)', cursor: 'pointer', fontSize: 13, flexShrink: 0,
          }}
        >
          <ArrowLeft size={15} /> Back
        </button>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 180 }}>
          {editing ? (
            <input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              style={{
                fontSize: 20, fontWeight: 800, color: 'var(--text1)',
                background: 'var(--surface)', border: '1px solid var(--accent)',
                borderRadius: 6, padding: '5px 10px', width: '100%',
                fontFamily: 'Barlow Condensed, sans-serif',
              }}
            />
          ) : (
            <h1 style={{
              margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text1)',
              fontFamily: 'Barlow Condensed, sans-serif',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {project.title}
            </h1>
          )}
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            padding: '4px 10px', borderRadius: 20, background: stage.bg,
            color: stage.color, fontSize: 11, fontWeight: 800,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {stage.label}
          </span>
          <span style={{
            padding: '4px 10px', borderRadius: 20,
            background: `${priority.color}18`, color: priority.color,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
            textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Flag size={9} /> {priority.label}
          </span>
          {project.division && (
            <span style={{
              padding: '4px 10px', borderRadius: 20, background: 'var(--surface2)',
              color: 'var(--text2)', fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
            }}>
              {project.division}
            </span>
          )}
        </div>

        {/* Edit / Save / Cancel */}
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={saveEdits}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
                  borderRadius: 8, border: 'none', background: 'var(--green)', color: '#fff',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1,
                }}
              >
                <Check size={14} /> Save
              </button>
              <button
                onClick={cancelEdits}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px',
                  borderRadius: 8, border: '1px solid var(--surface2)', background: 'transparent',
                  color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
                }}
              >
                <X size={14} />
              </button>
            </div>
            {saveError && (
              <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>{saveError}</div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 8, border: '1px solid var(--surface2)', background: 'transparent',
              color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
            }}
          >
            <Edit2 size={14} /> Edit
          </button>
        )}
      </div>

      {/* ── Body: tabs + sidebar ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Left: tab content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Tab bar */}
          <div style={{
            display: 'flex', gap: 2,
            borderBottom: '1px solid var(--surface2)',
            marginBottom: 20, overflowX: 'auto',
          }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 16px', borderRadius: '8px 8px 0 0',
                  border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: tab === t.key ? 'var(--surface)' : 'transparent',
                  color: tab === t.key ? 'var(--accent)' : 'var(--text2)',
                  borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                  whiteSpace: 'nowrap', transition: 'color 0.12s',
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Tab panels */}
          {tab === 'overview' && (
            <OverviewTab
              project={project}
              customer={customer}
              editing={editing}
              editInstallDate={editInstallDate}
              editDueDate={editDueDate}
              setEditInstallDate={setEditInstallDate}
              setEditDueDate={setEditDueDate}
              fin={fin}
              fd={fd}
              fmt$={fmt$}
              fmtPct={fmtPct}
              fmtDate={fmtDate}
            />
          )}
          {tab === 'timeline' && (
            <TimelineTab approvals={approvals} fmtDate={fmtDate} />
          )}
          {tab === 'comments' && (
            <JobChat
              projectId={project.id}
              orgId={project.org_id}
              currentUserId={profile.id}
              currentUserName={profile.name}
            />
          )}
          {tab === 'photos' && (
            <JobPhotosTab
              projectId={project.id}
              orgId={project.org_id}
              currentUserId={profile.id}
            />
          )}
          {tab === 'proofs' && (
            <ProofingPanel project={project} profile={profile} />
          )}
        </div>

        {/* ── Right: actions sidebar ─────────────────────────────────────── */}
        <div className="hidden md:flex" style={{ flexDirection: 'column', gap: 12, width: 260, flexShrink: 0 }}>

          {/* Stage */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--surface2)',
            borderRadius: 12, padding: 16,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
            }}>
              Stage
            </div>
            <div ref={stageDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setStageOpen(o => !o)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', padding: '8px 12px',
                  borderRadius: 8, border: '1px solid var(--surface2)',
                  background: 'var(--surface2)', color: 'var(--text1)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: stage.color, display: 'inline-block',
                  }} />
                  {stage.label}
                </span>
                <ChevronDown size={14} style={{ transform: stageOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>
              {stageOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  marginTop: 4, background: 'var(--surface)',
                  border: '1px solid var(--surface2)', borderRadius: 8,
                  overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  {PIPE_STAGES.map(s => {
                    const sc = STAGE_CONFIG[s]
                    const active = project.pipe_stage === s
                    return (
                      <button
                        key={s}
                        onClick={async () => { setStageOpen(false); await updateField('pipe_stage', s) }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                          padding: '9px 12px', border: 'none',
                          background: active ? 'var(--surface2)' : 'transparent',
                          color: active ? sc.color : 'var(--text1)',
                          cursor: 'pointer', fontSize: 13, textAlign: 'left',
                        }}
                      >
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: sc.color, flexShrink: 0,
                        }} />
                        {sc.label}
                        {active && <Check size={12} style={{ marginLeft: 'auto' }} />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Priority */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--surface2)',
            borderRadius: 12, padding: 16,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
            }}>
              Priority
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['urgent', 'high', 'normal', 'low'] as const).map(p => {
                const pc = PRIORITY_CONFIG[p]
                const active = project.priority === p
                return (
                  <button
                    key={p}
                    onClick={() => updateField('priority', p)}
                    disabled={savingField === 'priority'}
                    style={{
                      padding: '5px 10px', borderRadius: 6,
                      border: `1px solid ${active ? pc.color : 'var(--surface2)'}`,
                      background: active ? `${pc.color}20` : 'transparent',
                      color: active ? pc.color : 'var(--text3)',
                      cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    }}
                  >
                    {pc.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Installer */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--surface2)',
            borderRadius: 12, padding: 16,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Wrench size={11} /> Installer
            </div>
            <select
              value={project.installer_id || ''}
              onChange={e => updateField('installer_id', e.target.value || null)}
              disabled={savingField === 'installer_id'}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                border: '1px solid var(--surface2)', background: 'var(--surface2)',
                color: 'var(--text1)', fontSize: 13, cursor: 'pointer',
              }}
            >
              <option value="">Unassigned</option>
              {installers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>

          {/* Agent */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--surface2)',
            borderRadius: 12, padding: 16,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <UserCheck size={11} /> Sales Agent
            </div>
            <select
              value={project.agent_id || ''}
              onChange={e => updateField('agent_id', e.target.value || null)}
              disabled={savingField === 'agent_id'}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                border: '1px solid var(--surface2)', background: 'var(--surface2)',
                color: 'var(--text1)', fontSize: 13, cursor: 'pointer',
              }}
            >
              <option value="">Unassigned</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Field error feedback */}
          {fieldError && (
            <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, padding: '4px 8px' }}>
              {fieldError}
            </div>
          )}

          {/* Full pipeline link */}
          <Link
            href="/pipeline"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '10px 16px', borderRadius: 10,
              border: '1px solid var(--surface2)', background: 'transparent',
              color: 'var(--text2)', fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}
          >
            View Pipeline
          </Link>
        </div>
      </div>

      {/* ── Mobile actions (below content on small screens) ─────────────── */}
      <div className="md:hidden" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <MobileActions
          project={project}
          stage={stage}
          priority={priority}
          installers={installers}
          agents={agents}
          stageOpen={stageOpen}
          setStageOpen={setStageOpen}
          savingField={savingField}
          updateField={updateField}
        />
      </div>
    </div>
  )
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────
interface OverviewTabProps {
  project: Project
  customer: CustomerRow | null | undefined
  editing: boolean
  editInstallDate: string
  editDueDate: string
  setEditInstallDate: (v: string) => void
  setEditDueDate: (v: string) => void
  fin: ProjectFinancials | null
  fd: Record<string, any>
  fmt$: (v: number | null | undefined) => string
  fmtPct: (v: number | null | undefined) => string
  fmtDate: (d: string | null | undefined) => string
}

function OverviewTab({
  project, customer, editing,
  editInstallDate, editDueDate, setEditInstallDate, setEditDueDate,
  fin, fd, fmt$, fmtPct, fmtDate,
}: OverviewTabProps) {
  const revenue = fin?.sales ?? project.revenue
  const profit = fin?.profit ?? project.profit
  const gpm = fin?.gpm ?? project.gpm
  const commission = fin?.commission ?? project.commission

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Financial stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: 12,
      }}>
        {[
          { label: 'Revenue',    value: fmt$(revenue),    icon: <DollarSign size={15} />,  color: '#4f7fff' },
          { label: 'Profit',     value: fmt$(profit),     icon: <TrendingUp size={15} />,  color: '#22c07a' },
          { label: 'GPM',        value: fmtPct(gpm),      icon: <Percent size={15} />,     color: (gpm != null && gpm >= 73) ? '#22c07a' : '#f59e0b' },
          { label: 'Commission', value: fmt$(commission), icon: <Award size={15} />,       color: '#8b5cf6' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--surface)', border: '1px solid var(--surface2)',
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: stat.color, marginBottom: 8 }}>
              {stat.icon}
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {stat.label}
              </span>
            </div>
            <div style={{
              fontSize: 20, fontWeight: 800, color: 'var(--text1)',
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>

        {/* Customer */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--surface2)',
          borderRadius: 12, padding: 16,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Building2 size={11} /> Customer
          </div>
          {customer ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Link
                href={`/customers/${customer.id}`}
                style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}
              >
                {customer.name}
              </Link>
              {customer.company_name && (
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{customer.company_name}</div>
              )}
              {customer.phone && (
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{customer.phone}</div>
              )}
              {customer.email && (
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{customer.email}</div>
              )}
              {customer.lifetime_spend != null && (
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                  Lifetime:{' '}
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>
                    ${customer.lifetime_spend.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>No customer linked</div>
          )}
        </div>

        {/* Vehicle & Job */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--surface2)',
          borderRadius: 12, padding: 16,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Car size={11} /> Vehicle &amp; Job
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {project.vehicle_desc && (
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>
                {project.vehicle_desc}
              </div>
            )}
            {fd.vehicleColor != null && (
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                Color: {String(fd.vehicleColor)}
              </div>
            )}
            {project.type && (
              <div style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'capitalize' }}>
                Type: {project.type}
              </div>
            )}
            {fd.jobType != null && (
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                Job: {String(fd.jobType)}
              </div>
            )}
            {!project.vehicle_desc && fd.vehicleColor == null && !project.type && fd.jobType == null && (
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>No vehicle info</div>
            )}
          </div>
        </div>

        {/* Dates */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--surface2)',
          borderRadius: 12, padding: 16,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Calendar size={11} /> Dates
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Install Date</div>
              {editing ? (
                <input
                  type="date"
                  value={editInstallDate}
                  onChange={e => setEditInstallDate(e.target.value)}
                  style={{
                    padding: '6px 10px', borderRadius: 6,
                    border: '1px solid var(--surface2)', background: 'var(--surface2)',
                    color: 'var(--text1)', fontSize: 13, width: '100%',
                  }}
                />
              ) : (
                <div style={{ fontSize: 14, fontWeight: 600, color: project.install_date ? 'var(--text1)' : 'var(--text3)' }}>
                  {fmtDate(project.install_date)}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Due Date</div>
              {editing ? (
                <input
                  type="date"
                  value={editDueDate}
                  onChange={e => setEditDueDate(e.target.value)}
                  style={{
                    padding: '6px 10px', borderRadius: 6,
                    border: '1px solid var(--surface2)', background: 'var(--surface2)',
                    color: 'var(--text1)', fontSize: 13, width: '100%',
                  }}
                />
              ) : (
                <div style={{ fontSize: 14, fontWeight: 600, color: project.due_date ? 'var(--text1)' : 'var(--text3)' }}>
                  {fmtDate(project.due_date)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Team */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--surface2)',
          borderRadius: 12, padding: 16,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <User size={11} /> Team
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>Sales Agent</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: project.agent ? 'var(--text1)' : 'var(--text3)' }}>
                {project.agent?.name ?? 'Unassigned'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>Installer</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: project.installer ? 'var(--text1)' : 'var(--text3)' }}>
                {project.installer?.name ?? 'Unassigned'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {!!fd.notes && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--surface2)',
          borderRadius: 12, padding: 16,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
          }}>
            Notes
          </div>
          <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {String(fd.notes)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Timeline Tab ──────────────────────────────────────────────────────────────
function TimelineTab({
  approvals,
  fmtDate,
}: {
  approvals: StageApproval[]
  fmtDate: (d: string | null | undefined) => string
}) {
  if (approvals.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
        <History size={40} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 15, fontWeight: 600 }}>No stage history yet</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Stage changes will appear here as the job progresses.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingLeft: 8 }}>
      {approvals.map((approval, idx) => {
        const sc = STAGE_CONFIG[approval.stage] ?? STAGE_CONFIG.sales_in
        const ts = approval.approved_at || approval.created_at
        return (
          <div key={approval.id} style={{ display: 'flex', gap: 16, position: 'relative' }}>
            {/* Timeline line + dot */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: sc.bg, border: `2px solid ${sc.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: sc.color }} />
              </div>
              {idx < approvals.length - 1 && (
                <div style={{ width: 2, flex: 1, minHeight: 24, background: 'var(--surface2)' }} />
              )}
            </div>
            {/* Content */}
            <div style={{ flex: 1, paddingTop: 6, paddingBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: sc.color }}>{sc.label}</span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtDate(ts)}</span>
              </div>
              {approval.approver?.name && (
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  Approved by {approval.approver.name}
                </div>
              )}
              {approval.note && (
                <div style={{
                  fontSize: 12, color: 'var(--text2)', marginTop: 6,
                  padding: '8px 12px', borderRadius: 6, background: 'var(--surface)',
                  borderLeft: `3px solid ${sc.color}`, fontStyle: 'italic',
                }}>
                  {approval.note}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Mobile Actions (shown below content on small screens) ────────────────────
interface MobileActionsProps {
  project: Project
  stage: { label: string; color: string; bg: string }
  priority: { label: string; color: string }
  installers: Pick<Profile, 'id' | 'name' | 'role'>[]
  agents: Pick<Profile, 'id' | 'name' | 'role'>[]
  stageOpen: boolean
  setStageOpen: (v: boolean) => void
  savingField: string | null
  updateField: (field: string, value: string | null) => Promise<void>
}

function MobileActions({
  project, stage, priority, installers, agents,
  stageOpen, setStageOpen, savingField, updateField,
}: MobileActionsProps) {
  return (
    <>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--surface2)',
        borderRadius: 12, padding: 16,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text3)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
        }}>
          Stage
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setStageOpen(!stageOpen)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', padding: '8px 12px',
              borderRadius: 8, border: '1px solid var(--surface2)',
              background: 'var(--surface2)', color: 'var(--text1)',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
              {stage.label}
            </span>
            <ChevronDown size={14} />
          </button>
          {stageOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              marginTop: 4, background: 'var(--surface)',
              border: '1px solid var(--surface2)', borderRadius: 8,
              overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {PIPE_STAGES.map(s => {
                const sc = STAGE_CONFIG[s]
                const active = project.pipe_stage === s
                return (
                  <button
                    key={s}
                    onClick={async () => { setStageOpen(false); await updateField('pipe_stage', s) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '9px 12px', border: 'none',
                      background: active ? 'var(--surface2)' : 'transparent',
                      color: active ? sc.color : 'var(--text1)',
                      cursor: 'pointer', fontSize: 13, textAlign: 'left',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc.color, flexShrink: 0 }} />
                    {sc.label}
                    {active && <Check size={12} style={{ marginLeft: 'auto' }} />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--surface2)',
        borderRadius: 12, padding: 16,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text3)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
        }}>
          Priority
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['urgent', 'high', 'normal', 'low'] as const).map(p => {
            const pc = PRIORITY_CONFIG[p]
            const active = project.priority === p
            return (
              <button
                key={p}
                onClick={() => updateField('priority', p)}
                disabled={savingField === 'priority'}
                style={{
                  padding: '5px 10px', borderRadius: 6,
                  border: `1px solid ${active ? pc.color : 'var(--surface2)'}`,
                  background: active ? `${pc.color}20` : 'transparent',
                  color: active ? pc.color : 'var(--text3)',
                  cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                }}
              >
                {pc.label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Wrench size={11} /> Installer
          </div>
          <select
            value={project.installer_id || ''}
            onChange={e => updateField('installer_id', e.target.value || null)}
            disabled={savingField === 'installer_id'}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--surface2)', color: 'var(--text1)', fontSize: 13 }}
          >
            <option value="">Unassigned</option>
            {installers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
            <UserCheck size={11} /> Agent
          </div>
          <select
            value={project.agent_id || ''}
            onChange={e => updateField('agent_id', e.target.value || null)}
            disabled={savingField === 'agent_id'}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--surface2)', color: 'var(--text1)', fontSize: 13 }}
          >
            <option value="">Unassigned</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
    </>
  )
}
