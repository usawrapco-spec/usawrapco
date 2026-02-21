'use client'

import { useState, useMemo } from 'react'
import type { Profile, Project, UserRole } from '@/types'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'
import {
  ClipboardList, Phone, CheckCircle, CheckCircle2, Calendar, Building2, RefreshCw,
  DollarSign, AlertCircle, Printer, Search, Bell, Wrench, Ruler, RotateCcw,
  Timer, Camera, Target, Clock, Pin, ListTodo, type LucideIcon,
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
  projectId: string
  date: string
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
          person: agentName, personId: agentId, role:'sales_agent', projectId: p.id, date: today })
      } else if (stage === 'sales_in' && !p.checkout?.sales_in) {
        tasks.push({ id:`intake-${p.id}`, type:'intake', urgency:'normal', Icon:ClipboardList,
          desc:`Complete sales intake — ${p.title}`,
          sub: p.vehicle_desc || p.type,
          person: agentName, personId: agentId, role:'sales_agent', projectId: p.id, date: today })
      }

      if (p.status === 'estimate') {
        tasks.push({ id:`estimate-${p.id}`, type:'estimate', urgency:'today', Icon:Phone,
          desc:`Follow up on estimate — ${p.title}`,
          sub:`${p.vehicle_desc || ''} · ${p.revenue ? '$' + Math.round(p.revenue).toLocaleString() : 'No price yet'}`,
          person: agentName, personId: agentId, role:'sales_agent', projectId: p.id, date: today })
      }

      if (p.status === 'active' && !iDate) {
        tasks.push({ id:`appt-${p.id}`, type:'schedule', urgency:'today', Icon:Calendar,
          desc:`Schedule install date — ${p.title}`,
          sub:'No install date set on active order',
          person: agentName, personId: agentId, role:'sales_agent', projectId: p.id, date: today })
      }

      if (stage === 'sales_close' && !p.checkout?.sales_close) {
        tasks.push({ id:`close-${p.id}`, type:'close', urgency:'urgent', Icon:DollarSign,
          desc:`Final sign-off needed — ${p.title}`,
          sub:'All stages complete — awaiting your close',
          person: agentName, personId: agentId, role:'sales_agent', projectId: p.id, date: today })
      }
    }

    // Production tasks
    if (stage === 'production') {
      const prodPerson = teammates.find(t => t.role === 'production')
      if (prodPerson) {
        tasks.push({ id:`prod-${p.id}`, type:'production', urgency: hasSendBack ? 'urgent' : 'urgent', Icon: hasSendBack ? AlertCircle : Printer,
          desc: hasSendBack ? `Sent back to production — ${p.title}` : `Print queue — ${p.title}`,
          sub: p.vehicle_desc || '',
          person: prodPerson.name, personId: prodPerson.id, role:'production', projectId: p.id, date: today })
      }
    }

    if (stage === 'prod_review') {
      const prodPerson = teammates.find(t => t.role === 'production')
      if (prodPerson) {
        tasks.push({ id:`qc-${p.id}`, type:'qc', urgency:'today', Icon:Search,
          desc:`QC review needed — ${p.title}`,
          sub:'Check wrap quality, log final material used',
          person: prodPerson.name, personId: prodPerson.id, role:'production', projectId: p.id, date: today })
      }
    }

    // Installer tasks
    if (instId) {
      const bid = p.installer_bid
      if (bid?.status === 'pending') {
        tasks.push({ id:`bid-${p.id}`, type:'bid', urgency:'urgent', Icon:Bell,
          desc:`Bid pending — accept or decline — ${p.title}`,
          sub:`${p.revenue ? '$' + Math.round(p.revenue).toLocaleString() : ''} · ${iDate || 'No date'}`,
          person: instName, personId: instId, role:'installer', projectId: p.id, date: today })
      }
      if (stage === 'install' && isToday) {
        tasks.push({ id:`install-today-${p.id}`, type:'install', urgency:'today', Icon:Wrench,
          desc:`Install TODAY — ${p.title}`,
          sub: p.vehicle_desc || '',
          person: instName, personId: instId, role:'installer', projectId: p.id, date: today })
      } else if (stage === 'install' && iDate && iDate > today) {
        tasks.push({ id:`install-upcoming-${p.id}`, type:'install', urgency:'normal', Icon:ClipboardList,
          desc:`Upcoming install — ${p.title} on ${iDate}`,
          sub:'Pre-install checklist required day of',
          person: instName, personId: instId, role:'installer', projectId: p.id, date: iDate })
      }
    }
  })

  // Sort: urgent → today → normal, then by date
  const order = { urgent: 0, today: 1, normal: 2 }
  tasks.sort((a, b) => {
    const ud = order[a.urgency] - order[b.urgency]
    return ud !== 0 ? ud : a.date.localeCompare(b.date)
  })

  return tasks
}

interface TasksClientProps {
  profile: Profile
  projects: Project[]
  teammates: Teammate[]
}

export function TasksClient({ profile, projects, teammates }: TasksClientProps) {
  const [personFilter, setPersonFilter] = useState<string>(profile.id)
  const [roleFilter, setRoleFilter]     = useState<string>('all')
  const router = useRouter()

  const allTasks = useMemo(() => generateTasks(projects, teammates), [projects, teammates])

  const filtered = useMemo(() => {
    let list = [...allTasks]
    if (personFilter !== 'all') list = list.filter(t => t.personId === personFilter)
    if (roleFilter   !== 'all') list = list.filter(t => t.role === roleFilter)
    return list
  }, [allTasks, personFilter, roleFilter])

  const selectedPerson = teammates.find(t => t.id === personFilter)
  const selectedRole = selectedPerson?.role || null
  const guideKey = selectedRole === 'production' ? 'production'
    : selectedRole === 'installer' ? 'installer' : 'sales'
  const guide = WORKFLOW_GUIDES[guideKey]

  const urgent = filtered.filter(t => t.urgency === 'urgent')
  const today  = filtered.filter(t => t.urgency === 'today')
  const normal = filtered.filter(t => t.urgency === 'normal')
  const urgentCount = allTasks.filter(t => t.urgency === 'urgent').length

  function TaskCard({ task, num }: { task: GeneratedTask; num: number }) {
    const roleColors: Record<string, string> = {
      sales:'text-accent', production:'text-green', installer:'text-cyan'
    }
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
        {/* Number badge */}
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
            {task.urgency === 'urgent' && (
              <span className="badge badge-red text-xs">URGENT</span>
            )}
            {task.urgency === 'today' && (
              <span className="badge badge-amber text-xs">TODAY</span>
            )}
          </div>
          <div className="text-xs text-text3">{task.sub}</div>
        </div>

        <div className="text-right shrink-0">
          <div className={clsx('text-xs font-700', roleColors[task.role] || 'text-text3')}>
            {task.person}
          </div>
          <div className="text-xs text-text3 capitalize mt-0.5">{task.role}</div>
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

        <div className="flex gap-2 flex-wrap">
          <select
            className="field text-sm py-1.5 min-w-[160px]"
            value={personFilter}
            onChange={e => setPersonFilter(e.target.value)}
          >
            <option value="all">All Team Members</option>
            {teammates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            className="field text-sm py-1.5"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="sales">Sales</option>
            <option value="production">Production</option>
            <option value="installer">Installer</option>
          </select>
          {urgentCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red/10 border border-red/40 rounded-lg text-sm font-700 text-red">
              <AlertCircle size={14} /> {urgentCount} urgent
            </div>
          )}
        </div>
      </div>

      {/* Workflow guide — shows when a specific person is selected */}
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
    </div>
  )
}
