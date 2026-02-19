'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile, Project, ProjectStatus, UserRole } from '@/types'
import { canAccess } from '@/types'
import { clsx } from 'clsx'
import { format } from 'date-fns'

interface Teammate { id: string; name: string; role: UserRole }

interface ProjectDetailProps {
  profile: Profile
  project: Project
  teammates: Teammate[]
}

type Tab = 'overview' | 'financials' | 'pipeline' | 'notes'

const STATUS_OPTIONS: ProjectStatus[] = [
  'estimate','active','in_production','install_scheduled',
  'installed','qc','closing','closed','cancelled',
]

export function ProjectDetail({ profile, project: initial, teammates }: ProjectDetailProps) {
  const [project, setProject] = useState<Project>(initial)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const canEdit    = canAccess(profile.role, 'edit_projects')
  const canFinance = canAccess(profile.role, 'view_financials')

  async function save(updates: Partial<Project>) {
    setSaving(true)
    setError('')
    const merged = { ...project, ...updates }
    const { error: err } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', project.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    setProject(merged)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function Field({
    label, value, onChange, type = 'text', placeholder = '', disabled = false,
  }: {
    label: string; value: string; onChange?: (v: string) => void
    type?: string; placeholder?: string; disabled?: boolean
  }) {
    return (
      <div>
        <label className="field-label">{label}</label>
        <input
          type={type}
          className="field"
          value={value}
          placeholder={placeholder}
          disabled={disabled || !canEdit}
          onChange={e => onChange?.(e.target.value)}
        />
      </div>
    )
  }

  const agents     = teammates.filter(t => t.role === 'sales' || t.role === 'admin')
  const installers = teammates.filter(t => t.role === 'installer')
  const customers  = teammates.filter(t => t.role === 'customer')

  const PIPE_STAGES = ['sales_in','production','install','prod_review','sales_close'] as const
  const PIPE_LABELS: Record<string, string> = {
    sales_in:'Sales Intake', production:'Production',
    install:'Install', prod_review:'QC Review', sales_close:'Sales Close',
  }
  const currentStageIdx = PIPE_STAGES.indexOf(project.pipe_stage as any)

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key:'overview',   label:'Overview',   show: true },
    { key:'financials', label:'Financials', show: canFinance },
    { key:'pipeline',   label:'Pipeline',   show: true },
    { key:'notes',      label:'Notes',      show: true },
  ]

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb + header */}
      <div className="flex items-center gap-2 text-sm text-text3 mb-4">
        <button onClick={() => router.push('/dashboard')} className="hover:text-text1 transition-colors">
          Dashboard
        </button>
        <span>/</span>
        <span className="text-text1 font-600">{project.title || 'Project'}</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-3xl font-900 text-text1"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              {(project.customer as any)?.name || project.title}
            </h1>
            <span className={clsx('badge text-sm',
              project.status === 'closed' ? 'badge-gray' :
              project.status === 'active' ? 'badge-accent' : 'badge-green'
            )}>
              {project.status.replace(/_/g,' ')}
            </span>
            {project.send_backs?.length > 0 && !project.checkout?.[project.pipe_stage] && (
              <span className="badge badge-red anim-pulse-red">🔴 Sent Back</span>
            )}
          </div>
          <div className="text-sm text-text3 mt-1">
            {project.vehicle_desc} · {project.type?.toUpperCase()} ·{' '}
            {project.install_date
              ? `Install: ${format(new Date(project.install_date), 'MMM d, yyyy')}`
              : 'No install date'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-sm text-green font-600 anim-fade-up">✓ Saved</span>
          )}
          {error && (
            <span className="text-sm text-red font-600">{error}</span>
          )}
          {canEdit && (
            <button
              className="btn-primary btn-sm"
              disabled={saving}
              onClick={() => save(project)}
            >
              {saving ? 'Saving…' : '💾 Save'}
            </button>
          )}
        </div>
      </div>

      {/* Send-back banner */}
      {(() => {
        const lastSB = project.send_backs?.[project.send_backs.length - 1]
        const hasSB = lastSB && !project.checkout?.[project.pipe_stage]
        return hasSB ? (
          <div className="mb-5 p-4 bg-red/10 border-2 border-red/50 rounded-xl anim-pulse-red">
            <div className="text-sm font-900 text-red uppercase tracking-wide mb-1">
              ⚠ This job was sent back — your action is required
            </div>
            <div className="text-sm text-text1 font-600">{lastSB.reason}</div>
            {lastSB.note && <div className="text-xs text-red/70 mt-1 italic">"{lastSB.note}"</div>}
            <div className="text-xs text-text3 mt-1">
              {(lastSB.from || '').replace(/_/g,' ')} → {(lastSB.to || '').replace(/_/g,' ')}
            </div>
          </div>
        ) : null
      })()}

      {/* Tabs */}
      <div className="flex border-b border-border mb-5">
        {tabs.filter(t => t.show).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'px-4 py-2.5 text-sm font-600 border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-accent text-accent'
                : 'border-transparent text-text3 hover:text-text1'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-5">
          <div className="card flex flex-col gap-4">
            <div className="section-label">Client Details</div>
            <Field label="Title / Business Name" value={project.title || ''}
              onChange={v => setProject(p => ({ ...p, title: v }))} />
            <Field label="Vehicle / Unit Description" value={project.vehicle_desc || ''}
              placeholder="2023 Ford Transit — White"
              onChange={v => setProject(p => ({ ...p, vehicle_desc: v }))} />
            <div>
              <label className="field-label">Status</label>
              <select
                className="field"
                value={project.status}
                disabled={!canEdit}
                onChange={e => {
                  const s = e.target.value as ProjectStatus
                  setProject(p => ({ ...p, status: s }))
                  save({ status: s })
                }}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
                ))}
              </select>
            </div>
            <Field
              label="Install Date" type="date"
              value={project.install_date || ''}
              onChange={v => setProject(p => ({ ...p, install_date: v }))}
            />
          </div>

          <div className="card flex flex-col gap-4">
            <div className="section-label">Assignments</div>
            <div>
              <label className="field-label">Sales Agent</label>
              <select className="field" value={project.agent_id || ''} disabled={!canEdit}
                onChange={e => { setProject(p => ({ ...p, agent_id: e.target.value })); save({ agent_id: e.target.value }) }}>
                <option value="">— Select agent —</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Installer</label>
              <select className="field" value={project.installer_id || ''} disabled={!canEdit}
                onChange={e => { setProject(p => ({ ...p, installer_id: e.target.value })); save({ installer_id: e.target.value }) }}>
                <option value="">— Select installer —</option>
                {installers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Customer Account</label>
              <select className="field" value={project.customer_id || ''} disabled={!canEdit}
                onChange={e => { setProject(p => ({ ...p, customer_id: e.target.value })); save({ customer_id: e.target.value }) }}>
                <option value="">— Link customer —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Field label="Referral Source" value={project.referral || ''}
              placeholder="Google, referral from Jane, etc."
              onChange={v => setProject(p => ({ ...p, referral: v }))} />
          </div>
        </div>
      )}

      {/* FINANCIALS TAB */}
      {activeTab === 'financials' && canFinance && (
        <div className="grid grid-cols-2 gap-5">
          <div className="card">
            <div className="section-label mb-4">Revenue & Profit</div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label:'Sale Price', key:'revenue', color:'text-green' },
                { label:'COGS',       key:'cogs',    color:'text-red' },
                { label:'Profit',     key:'profit',  color:'text-accent' },
                { label:'GPM %',      key:'gpm',     color: (project.gpm||0)>=70?'text-green':'text-amber' },
                { label:'Commission', key:'commission', color:'text-purple' },
                { label:'Labor Pay',  key:'labor',   color:'text-cyan' },
              ].map(f => (
                <div key={f.key} className="bg-surface2 rounded-lg p-3 text-center">
                  <div className="text-xs font-700 text-text3 uppercase mb-1">{f.label}</div>
                  <div className={clsx('mono text-xl font-800', f.color)}>
                    {f.key === 'gpm'
                      ? `${((project.fin_data as any)?.[f.key] || 0).toFixed(1)}%`
                      : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})
                          .format((project.fin_data as any)?.[f.key] || 0)
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="section-label mb-4">Override / Edit Financials</div>
            <div className="flex flex-col gap-3">
              {[
                { label:'Sale Price ($)', key:'revenue' },
                { label:'Material Cost ($)', key:'material' },
                { label:'Labor Pay ($)', key:'labor' },
                { label:'Design Fee ($)', key:'designFee' },
                { label:'Misc Costs ($)', key:'misc' },
              ].map(f => (
                <div key={f.key}>
                  <label className="field-label">{f.label}</label>
                  <input
                    type="number"
                    className="field"
                    disabled={!canEdit}
                    value={(project.fin_data as any)?.[f.key] || ''}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0
                      const fd = { ...(project.fin_data as any), [f.key]: val }
                      const rev = fd.revenue || 0
                      const cogs = (fd.material||0) + (fd.labor||0) + (fd.designFee||0) + (fd.misc||0)
                      fd.cogs = cogs
                      fd.profit = rev - cogs
                      fd.gpm = rev > 0 ? fd.profit / rev * 100 : 0
                      setProject(p => ({ ...p, fin_data: fd, revenue: fd.revenue, profit: fd.profit, gpm: fd.gpm }))
                    }}
                  />
                </div>
              ))}
              {canEdit && (
                <button className="btn-primary mt-2" onClick={() => save({ fin_data: project.fin_data, revenue: project.revenue, profit: project.profit, gpm: project.gpm })}>
                  {saving ? 'Saving…' : '💾 Save Financials'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PIPELINE TAB */}
      {activeTab === 'pipeline' && (
        <div className="card">
          <div className="section-label mb-5">Approval Stages</div>
          <div className="flex flex-col gap-3">
            {PIPE_STAGES.map((stageKey, idx) => {
              const done    = !!project.checkout?.[stageKey]
              const active  = project.pipe_stage === stageKey
              const locked  = idx > currentStageIdx + 1

              return (
                <div key={stageKey} className={clsx(
                  'flex items-center gap-4 p-4 rounded-xl border transition-colors',
                  done   ? 'border-green/30 bg-green/5' :
                  active ? 'border-accent/40 bg-accent/5' :
                           'border-border bg-surface2'
                )}>
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0',
                    done   ? 'bg-green/20' :
                    active ? 'bg-accent/20' : 'bg-surface'
                  )}>
                    {done ? '✅' : active ? '🔵' : '⭕'}
                  </div>
                  <div className="flex-1">
                    <div className={clsx('font-700 text-sm',
                      done ? 'text-green' : active ? 'text-accent' : 'text-text3'
                    )}>
                      {idx + 1}. {PIPE_LABELS[stageKey]}
                    </div>
                    {active && !done && (
                      <div className="text-xs text-text3 mt-0.5">Current stage — sign off to advance</div>
                    )}
                  </div>
                  {active && !done && canEdit && (
                    <button
                      className="btn-primary btn-sm"
                      onClick={async () => {
                        const order = [...PIPE_STAGES]
                        const nextIdx = idx + 1
                        const newStage = nextIdx < order.length ? order[nextIdx] : 'done'
                        const newCheckout = { ...project.checkout, [stageKey]: true }
                        const newStatus = newStage === 'done' ? 'closed' : project.status
                        await save({ pipe_stage: newStage as any, checkout: newCheckout, status: newStatus })
                      }}
                    >
                      ✓ Sign Off
                    </button>
                  )}
                  {done && (
                    <span className="text-xs text-green font-700">SIGNED OFF</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* NOTES TAB */}
      {activeTab === 'notes' && (
        <div className="card">
          <div className="section-label mb-4">Project Notes</div>
          <textarea
            className="field resize-none w-full"
            rows={12}
            placeholder="Internal notes, scoping details, special instructions…"
            disabled={!canEdit}
            value={(project.form_data as any)?.notes || ''}
            onChange={e => setProject(p => ({
              ...p,
              form_data: { ...(p.form_data as any), notes: e.target.value }
            }))}
          />
          {canEdit && (
            <button className="btn-primary mt-3" onClick={() => save({ form_data: project.form_data })}>
              {saving ? 'Saving…' : '💾 Save Notes'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
