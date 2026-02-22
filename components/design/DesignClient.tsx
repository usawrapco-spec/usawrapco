'use client'

import { useState, useMemo, useCallback } from 'react'
import type { Profile, Project, DesignProject, DesignProjectStatus, DesignType } from '@/types'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, X, Palette, Clock, Send, CheckCircle2,
  Search, ArrowRight, LinkIcon, CalendarDays, GripVertical,
} from 'lucide-react'

interface DesignClientProps {
  profile: Profile
  projects: Project[]
  initialDesignProjects?: DesignProject[]
}

const KANBAN_COLUMNS: { key: DesignProjectStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { key: 'brief',       label: 'Brief',       color: 'text-text3',  icon: <Clock className="w-4 h-4" /> },
  { key: 'in_progress', label: 'In Progress', color: 'text-accent', icon: <Palette className="w-4 h-4" /> },
  { key: 'proof_sent',  label: 'Proof Sent',  color: 'text-cyan',   icon: <Send className="w-4 h-4" /> },
  { key: 'approved',    label: 'Approved',     color: 'text-green',  icon: <CheckCircle2 className="w-4 h-4" /> },
]

const DESIGN_TYPES: { value: DesignType; label: string }[] = [
  { value: 'full_wrap',     label: 'Full Wrap' },
  { value: 'partial_wrap',  label: 'Partial Wrap' },
  { value: 'decal',         label: 'Decal / Lettering' },
  { value: 'livery',        label: 'Fleet Livery' },
  { value: 'color_change',  label: 'Color Change' },
  { value: 'other',         label: 'Other' },
]

export function DesignClient({ profile, projects, initialDesignProjects = [] }: DesignClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [designProjects, setDesignProjects] = useState<DesignProject[]>(initialDesignProjects)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  // Form state
  const [formClientName, setFormClientName] = useState('')
  const [formDesignType, setFormDesignType] = useState<DesignType>('full_wrap')
  const [formDescription, setFormDescription] = useState('')
  const [formDeadline, setFormDeadline] = useState('')
  const [formLinkedJob, setFormLinkedJob] = useState('')

  const filteredProjects = useMemo(() => {
    if (!search) return designProjects
    const q = search.toLowerCase()
    return designProjects.filter(dp =>
      dp.client_name.toLowerCase().includes(q) ||
      dp.description?.toLowerCase().includes(q) ||
      dp.design_type.toLowerCase().includes(q)
    )
  }, [designProjects, search])

  const columnData = useMemo(() => {
    const result: Record<DesignProjectStatus, DesignProject[]> = {
      brief: [], in_progress: [], proof_sent: [], approved: [],
    }
    filteredProjects.forEach(dp => {
      result[dp.status].push(dp)
    })
    return result
  }, [filteredProjects])

  const resetForm = useCallback(() => {
    setFormClientName('')
    setFormDesignType('full_wrap')
    setFormDescription('')
    setFormDeadline('')
    setFormLinkedJob('')
  }, [])

  const handleCreate = async () => {
    if (!formClientName.trim()) return
    setSaving(true)

    // Auto-populate brief from linked job data
    let briefDescription = formDescription.trim() || null
    if (formLinkedJob && !briefDescription) {
      const linkedJob = projects.find(p => p.id === formLinkedJob)
      if (linkedJob) {
        const fd = (linkedJob.form_data as any) || {}
        const parts: string[] = []
        if (linkedJob.vehicle_desc) parts.push(`Vehicle: ${linkedJob.vehicle_desc}`)
        if (fd.vehicleColor) parts.push(`Color: ${fd.vehicleColor}`)
        if (fd.coverage) parts.push(`Coverage: ${fd.coverage}`)
        if (fd.brandColors) parts.push(`Brand Colors: ${fd.brandColors}`)
        if (fd.designNotes) parts.push(`Notes: ${fd.designNotes}`)
        if (fd.exclusions) parts.push(`Exclusions: ${fd.exclusions}`)
        if (fd.sqft) parts.push(`Est. SqFt: ${fd.sqft}`)
        if (parts.length > 0) briefDescription = parts.join('\n')
      }
    }

    const newProject = {
      org_id: profile.org_id,
      client_name: formClientName.trim(),
      design_type: formDesignType,
      description: briefDescription,
      deadline: formDeadline || null,
      status: 'brief' as DesignProjectStatus,
      linked_project_id: formLinkedJob || null,
      created_by: profile.id,
      assigned_to: profile.role === 'designer' ? profile.id : null,
    }

    const { data, error } = await supabase
      .from('design_projects')
      .insert(newProject)
      .select('*')
      .single()

    if (!error && data) {
      setDesignProjects(prev => [data as DesignProject, ...prev])

      // If no linked job, create a task for sales to review
      if (!formLinkedJob) {
        await supabase.from('tasks').insert({
          org_id: profile.org_id,
          title: `Review standalone design: ${formClientName.trim()}`,
          description: `A design project was created for "${formClientName.trim()}" without a linked job. Review and send a quote to the client.`,
          type: 'auto',
          status: 'open',
          priority: 'high',
          created_by: profile.id,
          source: 'design_studio',
        })
      }

      setShowModal(false)
      resetForm()
    }

    setSaving(false)
  }

  const moveCard = async (dp: DesignProject, newStatus: DesignProjectStatus) => {
    const { error } = await supabase
      .from('design_projects')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', dp.id)

    if (!error) {
      setDesignProjects(prev =>
        prev.map(p => p.id === dp.id ? { ...p, status: newStatus } : p)
      )
    }
  }

  const getNextStatus = (current: DesignProjectStatus): DesignProjectStatus | null => {
    const order: DesignProjectStatus[] = ['brief', 'in_progress', 'proof_sent', 'approved']
    const idx = order.indexOf(current)
    return idx < order.length - 1 ? order[idx + 1] : null
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-900 text-text1 flex items-center gap-2"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            <Palette className="w-7 h-7 text-accent" />
            Design Studio
          </h1>
          <p className="text-sm text-text3 mt-1">
            Manage design projects, proofs, and approvals
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Design Project
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 max-w-sm">
        <div className="relative">
          <input
            type="text"
            className="field pl-9"
            placeholder="Search design projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text3" />
        </div>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-4 gap-4 min-h-[60vh]">
        {KANBAN_COLUMNS.map(col => (
          <div key={col.key} className="flex flex-col">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className={col.color}>{col.icon}</span>
              <span className="text-sm font-800 text-text1">{col.label}</span>
              <span className="ml-auto text-xs font-700 text-text3 bg-surface2 px-2 py-0.5 rounded-full mono">
                {columnData[col.key].length}
              </span>
            </div>

            {/* Column body */}
            <div className="flex-1 bg-surface2/30 rounded-xl p-2 flex flex-col gap-2 border border-border/50">
              {columnData[col.key].length === 0 && (
                <div className="flex-1 flex items-center justify-center text-text3 text-xs py-8">
                  No projects
                </div>
              )}

              {columnData[col.key].map(dp => {
                const next = getNextStatus(dp.status)
                return (
                  <div
                    key={dp.id}
                    className="card p-3 hover:border-accent/30 transition-all cursor-default"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="text-sm font-800 text-text1 truncate">{dp.client_name}</div>
                      <GripVertical className="w-3.5 h-3.5 text-text3 shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <span className="badge badge-gray capitalize text-[10px]">
                        {dp.design_type.replace('_', ' ')}
                      </span>
                      {dp.linked_project_id && (
                        <span className="badge badge-accent text-[10px] flex items-center gap-0.5">
                          <LinkIcon className="w-2.5 h-2.5" /> Linked
                        </span>
                      )}
                    </div>
                    {dp.description && (
                      <p className="text-xs text-text3 mb-2 line-clamp-2">{dp.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1 text-text3">
                        {dp.deadline && (
                          <span className="text-[10px] flex items-center gap-0.5">
                            <CalendarDays className="w-3 h-3" />
                            {formatDate(dp.deadline)}
                          </span>
                        )}
                      </div>
                      {next && (
                        <button
                          onClick={() => moveCard(dp, next)}
                          className="text-[10px] font-700 text-accent hover:text-accent/80 flex items-center gap-0.5 transition-colors"
                          title={`Move to ${next.replace('_', ' ')}`}
                        >
                          Advance <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        onClick={() => router.push(`/design/${dp.id}`)}
                        className="text-[10px] font-700 text-green hover:text-green/80 transition-colors"
                      >
                        Open Canvas
                      </button>
                      {dp.linked_project_id && (
                        <button
                          onClick={() => router.push(`/projects/${dp.linked_project_id}`)}
                          className="text-[10px] font-600 text-text3 hover:text-accent transition-colors"
                        >
                          Open linked job
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* New Design Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => { setShowModal(false); resetForm() }}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-800 text-text1 flex items-center gap-2"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                <Plus className="w-5 h-5 text-accent" />
                New Design Project
              </h2>
              <button onClick={() => { setShowModal(false); resetForm() }} className="text-text3 hover:text-text1 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 flex flex-col gap-4">
              {/* Client Name */}
              <div>
                <label className="text-xs font-700 text-text2 uppercase mb-1.5 block">Client Name *</label>
                <input
                  type="text"
                  className="field"
                  placeholder="e.g. John's Auto Shop"
                  value={formClientName}
                  onChange={e => setFormClientName(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Design Type */}
              <div>
                <label className="text-xs font-700 text-text2 uppercase mb-1.5 block">Design Type</label>
                <select
                  className="field"
                  value={formDesignType}
                  onChange={e => setFormDesignType(e.target.value as DesignType)}
                >
                  {DESIGN_TYPES.map(dt => (
                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-700 text-text2 uppercase mb-1.5 block">Description</label>
                <textarea
                  className="field min-h-[80px] resize-y"
                  placeholder="Design brief, brand colors, reference links..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="text-xs font-700 text-text2 uppercase mb-1.5 block">Deadline</label>
                <input
                  type="date"
                  className="field"
                  value={formDeadline}
                  onChange={e => setFormDeadline(e.target.value)}
                />
              </div>

              {/* Linked Job */}
              <div>
                <label className="text-xs font-700 text-text2 uppercase mb-1.5 block">
                  Link to Existing Job <span className="text-text3 normal-case font-500">(optional)</span>
                </label>
                <select
                  className="field"
                  value={formLinkedJob}
                  onChange={e => setFormLinkedJob(e.target.value)}
                >
                  <option value="">No linked job (standalone)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} — {(p.customer as any)?.name || 'No customer'}
                    </option>
                  ))}
                </select>
                {!formLinkedJob && formClientName && (
                  <p className="text-[10px] text-amber mt-1">
                    A task will be auto-created for sales to review and send a quote.
                  </p>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 p-5 pt-0">
              <button
                onClick={() => { setShowModal(false); resetForm() }}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!formClientName.trim() || saving}
                className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40"
              >
                {saving ? 'Creating...' : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
