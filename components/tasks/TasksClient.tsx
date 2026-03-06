'use client'

import { useState, useMemo, useCallback } from 'react'
import type { Profile, Project, UserRole, TaskDepartment } from '@/types'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'
import {
  ClipboardList, Phone, CheckCircle, CheckCircle2, Calendar, Building2, RefreshCw,
  DollarSign, AlertCircle, Printer, Search, Bell, Wrench, Ruler, RotateCcw,
  Timer, Camera, Target, Clock, Pin, ListTodo, Plus, X, type LucideIcon,
  Paintbrush, Hammer, ShoppingCart, Settings, Layers,
} from 'lucide-react'

interface Teammate { id: string; name: string; role: UserRole }

interface GeneratedTask {
  id: string
  type: string
  urgency: 'urgent' | 'today' | 'normal'
  Icon: LucideIcon
  desc: string
  sub: string
  person: string
  personId: string
  role: UserRole
  department: TaskDepartment
  projectId: string
  date: string
}

const DEPT_CONFIG: Record<TaskDepartment, { label: string; color: string; Icon: LucideIcon }> = {
  sales:      { label: 'Sales',       color: 'text-accent  bg-accent/10  border-accent/30',      Icon: DollarSign  },
  design:     { label: 'Design',      color: 'text-purple  bg-purple/10  border-purple/30',      Icon: Paintbrush  },
  production: { label: 'Production',  color: 'text-green   bg-green/10   border-green/30',       Icon: Printer     },
  install:    { label: 'Install',     color: 'text-cyan    bg-cyan/10    border-cyan/30',        Icon: Hammer      },
  admin:      { label: 'Admin',       color: 'text-amber   bg-amber/10   border-amber/30',       Icon: Settings    },
  general:    { label: 'General',     color: 'text-text3   bg-surface2   border-border',         Icon: Layers      },
}

const ROLE_DEPT: Record<UserRole, TaskDepartment> = {
  owner:       'admin',
  admin:       'admin',
  sales_agent: 'sales',
  designer:    'design',
  production:  'production',
  installer:   'install',
  viewer:      'general',
}

const WORKFLOW_GUIDES: Record<string, { num: number; Icon: LucideIcon; label: string; detail: string }[]> = {
  sales: [
    { num:1, Icon:ClipboardList, label:'Check your task queue daily',      detail:'Start here — urgent items first, then today, then upcoming.' },
    { num:2, Icon:Phone,         label:'Follow up on open estimates',       detail:'Call or text clients 48h after sending. Log results in the project.' },
    { num:3, Icon:CheckCircle,   label:'Convert estimate to Sales Order',   detail:'Once they say yes — open project, set status to Active, confirm details.' },
    { num:4, Icon:Calendar,      label:'Schedule install appointment',      detail:'Every active order needs an install date. Book it and enter it in the project.' },
    { num:5, Icon:Building2,     label:'Complete Sales Intake sign-off',    detail:'Open Approval board, find your job, sign off the Sales Intake stage.' },
    { num:6, Icon:RefreshCw,     label:'Monitor job through pipeline',      detail:'Check progress in Approval. You will be notified if anything is sent back.' },
    { num:7, Icon:DollarSign,    label:'Final close sign-off',              detail:'When all stages pass, sign Sales Approval to lock commission.' },
  ],
  production: [
    { num:1, Icon:AlertCircle,   label:'Check for sent-back jobs first',    detail:'Red cards in the pipeline need your attention before anything else.' },
    { num:2, Icon:Printer,       label:'Queue and print jobs',              detail:'Jobs in Production stage are ready to print. Check sqft and material.' },
    { num:3, Icon:Ruler,         label:'Log linear feet printed',           detail:'After printing, enter linft in the sign-off panel for tracking.' },
    { num:4, Icon:CheckCircle,   label:'Sign off Production stage',         detail:'Open Approval board, enter linft, click Sign Off Production.' },
    { num:5, Icon:Search,        label:'Run QC after install',              detail:'When jobs come back for QC, check wrap quality and log final material.' },
    { num:6, Icon:RotateCcw,     label:'Log any reprints',                  detail:'Enter reprint cost in QC sign-off — it will be deducted from job profit.' },
  ],
  installer: [
    { num:1, Icon:Bell,          label:'Check for pending bids',            detail:'Open Tasks or Calendar. A pending bid means you need to accept or decline.' },
    { num:2, Icon:CheckCircle,   label:'Accept or decline job bids',        detail:'Click the project, select your name, click Accept.' },
    { num:3, Icon:Search,        label:'Pre-install vinyl check',           detail:'Day of install: complete the 4-point vinyl checklist before starting.' },
    { num:4, Icon:Timer,         label:'Start your install timer',          detail:'Tap Start Timer in the project. It tracks actual hours for your pay.' },
    { num:5, Icon:Camera,        label:'Complete post-install checklist',   detail:'After wrapping: heat applied, edges, no bubbles, seams, clean, photos.' },
    { num:6, Icon:Wrench,        label:'Sign off Install stage',            detail:'Enter actual hours, the date, and your name. Click Sign Off Install.' },
  ],
}

function generateTasks(projects: Project[], teammates: Teammate[]): GeneratedTask[] {
  const tasks: GeneratedTask[] = []
  const today = new Date().toISOString().split('T')[0]

  projects.forEach(p => {
    const stage = p.pipe_stage || 'sales_in'
    if (stage === 'done') return

    const iDate = p.install_date || ''
    const isToday = iDate === today
    const lastSB = p.send_backs?.[p.send_backs.length - 1]
    const hasSendBack = !!lastSB && !p.checkout?.[stage]

    const agentName = (p.agent as any)?.name || ''
    const agentId = p.agent_id || ''
    const instName = (p.installer as any)?.name || ''
    const instId = p.installer_id || ''

    // Sales tasks
    if (agentId) {
      if (stage === 'sales_in' && hasSendBack) {
        tasks.push({ id:`sb-sales-${p.id}`, type:'send_back', urgency:'urgent', Icon:AlertCircle,
          desc:`${p.title} — sent back, action required`,
          sub:`Reason: ${lastSB!.reason?.substring(0,60)}`,
          person: agentName, personId: agentId, role:'sales_agent', department:'sales', projectId: p.id, date: today })
      } else if (stage === 'sales_in' && !p.checkout?.sales_in) {
        tasks.push({ id:`intake-${p.id}`, type:'intake', urgency:'normal', Icon:ClipboardList,
          desc:`Complete sales intake — ${p.title}`,
          sub: p.vehicle_desc || p.type,
          person: agentName, personId: agentId, role:'sales_agent', department:'sales', projectId: p.id, date: today })
      }

      if (p.status === 'estimate') {
        tasks.push({ id:`estimate-${p.id}`, type:'estimate', urgency:'today', Icon:Phone,
          desc:`Follow up on estimate — ${p.title}`,
          sub:`${p.vehicle_desc || ''} · ${p.revenue ? '$' + Math.round(p.revenue).toLocaleString() : 'No price yet'}`,
          person: agentName, personId: agentId, role:'sales_agent', department:'sales', projectId: p.id, date: today })
      }

      if (p.status === 'active' && !iDate) {
        tasks.push({ id:`appt-${p.id}`, type:'schedule', urgency:'today', Icon:Calendar,
          desc:`Schedule install date — ${p.title}`,
          sub:'No install date set on active order',
          person: agentName, personId: agentId, role:'sales_agent', department:'sales', projectId: p.id, date: today })
      }

      if (stage === 'sales_close' && !p.checkout?.sales_close) {
        tasks.push({ id:`close-${p.id}`, type:'close', urgency:'urgent', Icon:DollarSign,
          desc:`Final sign-off needed — ${p.title}`,
          sub:'All stages complete — awaiting your close',
          person: agentName, personId: agentId, role:'sales_agent', department:'sales', projectId: p.id, date: today })
      }
    }

    // Production tasks
    if (stage === 'production') {
      const prodPerson = teammates.find(t => t.role === 'production')
      if (prodPerson) {
        tasks.push({ id:`prod-${p.id}`, type:'production', urgency:'urgent', Icon: hasSendBack ? AlertCircle : Printer,
          desc: hasSendBack ? `Sent back to production — ${p.title}` : `Print queue — ${p.title}`,
          sub: p.vehicle_desc || '',
          person: prodPerson.name, personId: prodPerson.id, role:'production', department:'production', projectId: p.id, date: today })
      }
    }

    if (stage === 'prod_review') {
      const prodPerson = teammates.find(t => t.role === 'production')
      if (prodPerson) {
        tasks.push({ id:`qc-${p.id}`, type:'qc', urgency:'today', Icon:Search,
          desc:`QC review needed — ${p.title}`,
          sub:'Check wrap quality, log final material used',
          person: prodPerson.name, personId: prodPerson.id, role:'production', department:'production', projectId: p.id, date: today })
      }
    }

    // Installer tasks
    if (instId) {
      const bid = p.installer_bid
      if (bid?.status === 'pending') {
        tasks.push({ id:`bid-${p.id}`, type:'bid', urgency:'urgent', Icon:Bell,
          desc:`Bid pending — accept or decline — ${p.title}`,
          sub:`${p.revenue ? '$' + Math.round(p.revenue).toLocaleString() : ''} · ${iDate || 'No date'}`,
          person: instName, personId: instId, role:'installer', department:'install', projectId: p.id, date: today })
      }
      if (stage === 'install' && isToday) {
        tasks.push({ id:`install-today-${p.id}`, type:'install', urgency:'today', Icon:Wrench,
          desc:`Install TODAY — ${p.title}`,
          sub: p.vehicle_desc || '',
          person: instName, personId: instId, role:'installer', department:'install', projectId: p.id, date: today })
      } else if (stage === 'install' && iDate && iDate > today) {
        tasks.push({ id:`install-upcoming-${p.id}`, type:'install', urgency:'normal', Icon:ClipboardList,
          desc:`Upcoming install — ${p.title} on ${iDate}`,
          sub:'Pre-install checklist required day of',
          person: instName, personId: instId, role:'installer', department:'install', projectId: p.id, date: iDate })
      }
    }
  })

  const order = { urgent: 0, today: 1, normal: 2 }
  tasks.sort((a, b) => {
    const ud = order[a.urgency] - order[b.urgency]
    return ud !== 0 ? ud : a.date.localeCompare(b.date)
  })

  return tasks
}

// ── Add Task Modal ──────────────────────────────────────────────────────────────

interface AddTaskModalProps {
  teammates: Teammate[]
  projects: Project[]
  onClose: () => void
  onCreated: () => void
}

function AddTaskModal({ teammates, projects, onClose, onCreated }: AddTaskModalProps) {
  const [title, setTitle]           = useState('')
  const [description, setDesc]      = useState('')
  const [department, setDept]       = useState<TaskDepartment>('general')
  const [priority, setPriority]     = useState('normal')
  const [assignedTo, setAssignedTo] = useState('')
  const [projectId, setProjectId]   = useState('')
  const [dueAt, setDueAt]           = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const handleSave = useCallback(async () => {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, department, priority, assigned_to: assignedTo || null, project_id: projectId || null, due_at: dueAt || null }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to create task'); return }
      onCreated()
      onClose()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }, [title, description, department, priority, assignedTo, projectId, dueAt, onCreated, onClose])

  const deptEntries = Object.entries(DEPT_CONFIG) as [TaskDepartment, typeof DEPT_CONFIG[TaskDepartment]][]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 24, width: '100%', maxWidth: 540,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 900, color: 'var(--text1)' }}>
              Add New Task
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Department selector */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Department
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {deptEntries.map(([key, cfg]) => {
              const selected = department === key
              return (
                <button
                  key={key}
                  onClick={() => setDept(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 20, border: '1px solid',
                    cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                    background: selected ? 'var(--surface2)' : 'transparent',
                    borderColor: selected ? 'var(--accent)' : 'var(--border)',
                    color: selected ? 'var(--accent)' : 'var(--text3)',
                  }}
                >
                  <cfg.Icon size={12} />
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 12 }}>
          <input
            className="field"
            placeholder="Task title *"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ width: '100%' }}
            autoFocus
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 12 }}>
          <textarea
            className="field"
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDesc(e.target.value)}
            rows={3}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        {/* Row: Assignee + Priority */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <select className="field" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
            <option value="">Assignee (optional)</option>
            {teammates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="field" value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Row: Project + Due date */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <select className="field" value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">Link to job (optional)</option>
            {projects.slice(0, 100).map(p => (
              <option key={p.id} value={p.id}>{p.title || p.vehicle_desc || p.id.slice(0,8)}</option>
            ))}
          </select>
          <input
            type="date"
            className="field"
            value={dueAt}
            onChange={e => setDueAt(e.target.value)}
            placeholder="Due date"
          />
        </div>

        {error && (
          <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface TasksClientProps {
  profile: Profile
  projects: Project[]
  teammates: Teammate[]
}

export function TasksClient({ profile, projects, teammates }: TasksClientProps) {
  const [personFilter, setPersonFilter]   = useState<string>(profile.id)
  const [roleFilter, setRoleFilter]       = useState<string>('all')
  const [deptFilter, setDeptFilter]       = useState<string>('all')
  const [showAddModal, setShowAddModal]   = useState(false)
  const [taskVersion, setTaskVersion]     = useState(0)
  const router = useRouter()

  const allTasks = useMemo(() => generateTasks(projects, teammates), [projects, teammates, taskVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let list = [...allTasks]
    if (personFilter !== 'all') list = list.filter(t => t.personId === personFilter)
    if (roleFilter   !== 'all') list = list.filter(t => t.role === roleFilter)
    if (deptFilter   !== 'all') list = list.filter(t => t.department === deptFilter)
    return list
  }, [allTasks, personFilter, roleFilter, deptFilter])

  const selectedPerson = teammates.find(t => t.id === personFilter)
  const selectedRole = selectedPerson?.role || null
  const guideKey = selectedRole === 'production' ? 'production'
    : selectedRole === 'installer' ? 'installer' : 'sales'
  const guide = WORKFLOW_GUIDES[guideKey]

  const urgent = filtered.filter(t => t.urgency === 'urgent')
  const today  = filtered.filter(t => t.urgency === 'today')
  const normal = filtered.filter(t => t.urgency === 'normal')
  const urgentCount = allTasks.filter(t => t.urgency === 'urgent').length

  // Dept summary counts (all tasks, no filter)
  const deptCounts = useMemo(() => {
    const counts: Partial<Record<TaskDepartment, number>> = {}
    allTasks.forEach(t => { counts[t.department] = (counts[t.department] || 0) + 1 })
    return counts
  }, [allTasks])

  function TaskCard({ task, num }: { task: GeneratedTask; num: number }) {
    const deptCfg = DEPT_CONFIG[task.department]
    return (
      <div
        className={clsx(
          'flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:-translate-y-0.5',
          task.urgency === 'urgent' ? 'border-red/40 bg-red/5 hover:border-red/60'
          : task.urgency === 'today' ? 'border-amber/30 bg-amber/5 hover:border-amber/50'
          : 'border-border bg-surface hover:border-accent/30'
        )}
        onClick={() => router.push(`/projects/${task.projectId}`)}
      >
        <div className={clsx(
          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-900 shrink-0',
          task.urgency === 'urgent' ? 'bg-red/20 text-red'
          : task.urgency === 'today' ? 'bg-amber/20 text-amber'
          : 'bg-surface2 text-text3'
        )}>
          {num}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <task.Icon size={15} className="shrink-0 text-text3" />
            <span className="text-sm font-700 text-text1">{task.desc}</span>
            {task.urgency === 'urgent' && <span className="badge badge-red text-xs">URGENT</span>}
            {task.urgency === 'today'  && <span className="badge badge-amber text-xs">TODAY</span>}
          </div>
          <div className="text-xs text-text3">{task.sub}</div>
        </div>

        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          {/* Dept badge */}
          <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-700 border', deptCfg.color)}>
            <deptCfg.Icon size={10} />
            {deptCfg.label}
          </span>
          <div className="text-xs text-text3 capitalize mt-0.5">{task.person}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-900 text-text1 flex items-center gap-3"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            <ListTodo size={26} className="text-accent" /> Task Queue
          </h1>
          <p className="text-sm text-text3 mt-1">
            Ordered by priority · Complete top-to-bottom · Click any task to open the job
          </p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {/* Dept filter */}
          <select className="field text-sm py-1.5" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="all">All Departments</option>
            {(Object.entries(DEPT_CONFIG) as [TaskDepartment, typeof DEPT_CONFIG[TaskDepartment]][]).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}{deptCounts[key] ? ` (${deptCounts[key]})` : ''}</option>
            ))}
          </select>

          <select className="field text-sm py-1.5 min-w-[160px]" value={personFilter} onChange={e => setPersonFilter(e.target.value)}>
            <option value="all">All Team Members</option>
            {teammates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <select className="field text-sm py-1.5" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="sales_agent">Sales</option>
            <option value="production">Production</option>
            <option value="installer">Installer</option>
          </select>

          {urgentCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red/10 border border-red/40 rounded-lg text-sm font-700 text-red">
              <AlertCircle size={14} /> {urgentCount} urgent
            </div>
          )}

          <button
            className="btn btn-primary flex items-center gap-1.5"
            style={{ padding: '6px 14px', fontSize: 13 }}
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={14} /> Add Task
          </button>
        </div>
      </div>

      {/* Dept summary strip */}
      {Object.keys(deptCounts).length > 0 && (
        <div className="flex gap-2 flex-wrap mb-5">
          {(Object.entries(deptCounts) as [TaskDepartment, number][]).map(([dept, count]) => {
            const cfg = DEPT_CONFIG[dept]
            const active = deptFilter === dept
            return (
              <button
                key={dept}
                onClick={() => setDeptFilter(active ? 'all' : dept)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-700 transition-all',
                  active ? cfg.color + ' opacity-100' : 'border-border text-text3 bg-surface hover:border-accent/30'
                )}
              >
                <cfg.Icon size={11} />
                {cfg.label}
                <span className="rounded-full bg-white/10 px-1.5 py-0.5">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Workflow guide */}
      {personFilter !== 'all' && selectedPerson && (
        <div className="card mb-5 p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-accent/5 border-b border-border">
            <div className="text-sm font-800 text-accent flex items-center gap-1.5">
              <ClipboardList size={14} /> {selectedPerson.name}'s Workflow Guide
            </div>
            <div className="text-xs text-text3 capitalize">{selectedPerson.role}</div>
          </div>
          <div className="p-4 grid gap-2">
            {guide.map(step => (
              <div key={step.num} className="flex items-start gap-3 p-2 rounded-lg bg-surface2/50">
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-900 text-accent shrink-0">
                  {step.num}
                </div>
                <div>
                  <div className="text-sm font-700 text-text1 flex items-center gap-1.5"><step.Icon size={13} className="text-text3" /> {step.label}</div>
                  <div className="text-xs text-text3 mt-0.5">{step.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next action callout */}
      {filtered.length > 0 && personFilter !== 'all' && (
        <div className="mb-5 p-4 bg-accent/8 border-2 border-accent rounded-xl">
          <div className="text-xs font-900 text-accent uppercase tracking-wider mb-2 flex items-center gap-1.5"><Target size={12} /> Do This First</div>
          <div className="text-base font-800 text-text1">{filtered[0].desc}</div>
          <div className="text-sm text-text3 mt-1">{filtered[0].sub}</div>
        </div>
      )}

      {/* Task groups */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-green" />
          <div className="text-lg font-700 text-text1">All clear!</div>
          <div className="text-sm text-text3 mt-1">No open tasks right now.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {urgent.length > 0 && (
            <div>
              <div className="text-xs font-900 text-red uppercase tracking-widest mb-3 pl-1 flex items-center gap-1.5">
                <AlertCircle size={12} /> Urgent — Do Now ({urgent.length})
              </div>
              <div className="flex flex-col gap-2">
                {urgent.map((t, i) => <TaskCard key={t.id} task={t} num={i+1} />)}
              </div>
            </div>
          )}
          {today.length > 0 && (
            <div>
              <div className="text-xs font-900 text-amber uppercase tracking-widest mb-3 pl-1 flex items-center gap-1.5">
                <Clock size={12} /> Today's Actions ({today.length})
              </div>
              <div className="flex flex-col gap-2">
                {today.map((t, i) => <TaskCard key={t.id} task={t} num={urgent.length+i+1} />)}
              </div>
            </div>
          )}
          {normal.length > 0 && (
            <div>
              <div className="text-xs font-900 text-text3 uppercase tracking-widest mb-3 pl-1 flex items-center gap-1.5">
                <Pin size={12} /> Upcoming ({normal.length})
              </div>
              <div className="flex flex-col gap-2">
                {normal.map((t, i) => <TaskCard key={t.id} task={t} num={urgent.length+today.length+i+1} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Task modal */}
      {showAddModal && (
        <AddTaskModal
          teammates={teammates}
          projects={projects}
          onClose={() => setShowAddModal(false)}
          onCreated={() => setTaskVersion(v => v + 1)}
        />
      )}
    </div>
  )
}
