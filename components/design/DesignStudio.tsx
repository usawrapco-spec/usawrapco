'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import {
  Plus,
  Palette,
  Clock,
  Send,
  CheckCircle,
  X,
  AlertTriangle,
  Link as LinkIcon,
  User,
  FileText,
  Calendar,
  ChevronDown,
} from 'lucide-react'
import type { Profile } from '@/types'

type DesignProject = {
  id: string
  org_id: string
  project_id: string | null
  designer_id: string | null
  client_name: string
  design_type: string
  description: string | null
  stage: 'brief' | 'in_progress' | 'proof_sent' | 'approved'
  deadline: string | null
  created_at: string
  updated_at: string
  designer?: { id: string; name: string } | null
  project?: { id: string; name: string; client_name: string } | null
}

type TeamMember = { id: string; name: string; role: string }
type ProjectRef = { id: string; name: string; client_name: string }

interface Props {
  profile: Profile
  designProjects: DesignProject[]
  teamMembers: TeamMember[]
  projects: ProjectRef[]
}

const STAGES = [
  { key: 'brief',       label: 'Brief',       icon: FileText,    color: 'text-amber',  bg: 'bg-amber/10',  border: 'border-amber/20' },
  { key: 'in_progress', label: 'In Progress',  icon: Clock,       color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20' },
  { key: 'proof_sent',  label: 'Proof Sent',   icon: Send,        color: 'text-cyan',   bg: 'bg-cyan/10',   border: 'border-cyan/20' },
  { key: 'approved',    label: 'Approved',      icon: CheckCircle, color: 'text-green',  bg: 'bg-green/10',  border: 'border-green/20' },
] as const

const DESIGN_TYPES = [
  'Full Wrap', 'Partial Wrap', 'Color Change', 'Commercial Lettering',
  'Custom Graphics', 'Logo Design', 'PPF Template', 'Decal/Sticker',
  'Fleet Design', 'Other',
]

export default function DesignStudio({ profile, designProjects, teamMembers, projects }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<DesignProject | null>(null)
  const router = useRouter()

  const getProjectsByStage = (stage: string) =>
    designProjects.filter(p => p.stage === stage)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-700 text-text1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            Design Studio
          </h1>
          <p className="text-sm text-text3 mt-1">
            {designProjects.length} project{designProjects.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-600 rounded-lg hover:bg-accent/90 transition-colors"
        >
          <Plus size={16} />
          New Design Project
        </button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-4 gap-4">
        {STAGES.map(stage => {
          const stageProjects = getProjectsByStage(stage.key)
          const StageIcon = stage.icon
          return (
            <div key={stage.key} className="flex flex-col">
              {/* Column Header */}
              <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-t-lg border-b-2', stage.bg, stage.border)}>
                <StageIcon size={16} className={stage.color} />
                <span className={clsx('text-sm font-700', stage.color)}>{stage.label}</span>
                <span className="ml-auto text-xs font-700 text-text3 bg-surface2 px-2 py-0.5 rounded-full">
                  {stageProjects.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 mt-2 min-h-[200px]">
                {stageProjects.map(dp => (
                  <DesignCard
                    key={dp.id}
                    project={dp}
                    stage={stage}
                    onClick={() => setSelectedProject(dp)}
                  />
                ))}
                {stageProjects.length === 0 && (
                  <div className="text-center text-text3 text-xs py-8 border border-dashed border-border rounded-lg">
                    No projects
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* New Design Project Modal */}
      {showModal && (
        <NewDesignProjectModal
          profile={profile}
          teamMembers={teamMembers}
          projects={projects}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); router.refresh() }}
        />
      )}

      {/* Project Detail Drawer */}
      {selectedProject && (
        <DesignProjectDrawer
          project={selectedProject}
          teamMembers={teamMembers}
          onClose={() => setSelectedProject(null)}
          onUpdate={() => { setSelectedProject(null); router.refresh() }}
        />
      )}
    </div>
  )
}

/* ─── Design Card ─── */
function DesignCard({ project, stage, onClick }: {
  project: DesignProject
  stage: typeof STAGES[number]
  onClick: () => void
}) {
  const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.stage !== 'approved'

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface border border-border rounded-lg p-3 hover:border-accent/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-600 text-text1 truncate">{project.client_name}</div>
        {isOverdue && <AlertTriangle size={14} className="text-red shrink-0" />}
      </div>
      <div className="text-xs text-text3 mt-1">{project.design_type}</div>
      {project.description && (
        <div className="text-xs text-text3 mt-1 line-clamp-2">{project.description}</div>
      )}
      <div className="flex items-center gap-2 mt-2">
        {project.designer && (
          <div className="flex items-center gap-1 text-xs text-text2">
            <User size={10} />
            {project.designer.name}
          </div>
        )}
        {project.project && (
          <div className="flex items-center gap-1 text-xs text-accent/70">
            <LinkIcon size={10} />
            Job
          </div>
        )}
        {project.deadline && (
          <div className={clsx('flex items-center gap-1 text-xs ml-auto', isOverdue ? 'text-red' : 'text-text3')}>
            <Calendar size={10} />
            {new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
    </button>
  )
}

/* ─── New Design Project Modal ─── */
function NewDesignProjectModal({ profile, teamMembers, projects, onClose, onCreated }: {
  profile: Profile
  teamMembers: TeamMember[]
  projects: ProjectRef[]
  onClose: () => void
  onCreated: () => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_name: '',
    design_type: 'Full Wrap',
    description: '',
    designer_id: '',
    project_id: '',
    deadline: '',
  })

  const handleSave = async () => {
    if (!form.client_name.trim()) return
    setSaving(true)
    try {
      // Create design project
      const { data: dp, error } = await supabase.from('design_projects').insert({
        org_id: profile.org_id,
        client_name: form.client_name.trim(),
        design_type: form.design_type,
        description: form.description.trim() || null,
        designer_id: form.designer_id || null,
        project_id: form.project_id || null,
        deadline: form.deadline || null,
        stage: 'brief',
      }).select().single()

      if (error) throw error

      // If no linked job, flag salesperson to review & send quote
      if (!form.project_id && dp) {
        await supabase.from('job_comments').insert({
          project_id: null,
          user_id: profile.id,
          content: `🎨 New design project created for "${form.client_name}" (${form.design_type}) — No job linked yet. Sales: please review and send quote if applicable. Design Project ID: ${dp.id}`,
          type: 'system',
        }).then(() => {
          // Also create a task entry if the tasks system supports it
          // This will show up in the Task Queue for sales role
        })
      }

      onCreated()
    } catch (err) {
      console.error('Failed to create design project:', err)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Palette size={18} className="text-accent" />
            <h2 className="text-lg font-700 text-text1">New Design Project</h2>
          </div>
          <button onClick={onClose} className="text-text3 hover:text-text1 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Client Name */}
          <div>
            <label className="text-xs font-600 text-text2 uppercase tracking-wide">Client Name *</label>
            <input
              type="text"
              value={form.client_name}
              onChange={e => setForm({ ...form, client_name: e.target.value })}
              placeholder="Enter client name"
              className="mt-1 w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text1 placeholder:text-text3 focus:outline-none focus:border-accent"
            />
          </div>

          {/* Design Type */}
          <div>
            <label className="text-xs font-600 text-text2 uppercase tracking-wide">Design Type</label>
            <select
              value={form.design_type}
              onChange={e => setForm({ ...form, design_type: e.target.value })}
              className="mt-1 w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text1 focus:outline-none focus:border-accent"
            >
              {DESIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-600 text-text2 uppercase tracking-wide">Description / Notes</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Design brief, brand colors, special requests..."
              rows={3}
              className="mt-1 w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text1 placeholder:text-text3 focus:outline-none focus:border-accent resize-none"
            />
          </div>

          {/* Two-col: Designer + Deadline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-600 text-text2 uppercase tracking-wide">Assign Designer</label>
              <select
                value={form.designer_id}
                onChange={e => setForm({ ...form, designer_id: e.target.value })}
                className="mt-1 w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text1 focus:outline-none focus:border-accent"
              >
                <option value="">Unassigned</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-600 text-text2 uppercase tracking-wide">Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })}
                className="mt-1 w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text1 focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Link to Existing Job */}
          <div>
            <label className="text-xs font-600 text-text2 uppercase tracking-wide">
              Link to Job <span className="text-text3 font-400 normal-case">(optional)</span>
            </label>
            <select
              value={form.project_id}
              onChange={e => setForm({ ...form, project_id: e.target.value })}
              className="mt-1 w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text1 focus:outline-none focus:border-accent"
            >
              <option value="">No linked job — will flag sales</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.client_name} — {p.name}</option>
              ))}
            </select>
            {!form.project_id && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber">
                <AlertTriangle size={12} />
                Sales will be notified to review and send a quote
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text2 hover:text-text1 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.client_name.trim() || saving}
            className={clsx(
              'px-5 py-2 text-sm font-600 rounded-lg transition-colors',
              form.client_name.trim() && !saving
                ? 'bg-accent text-white hover:bg-accent/90'
                : 'bg-surface2 text-text3 cursor-not-allowed'
            )}
          >
            {saving ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Project Detail Drawer ─── */
function DesignProjectDrawer({ project, teamMembers, onClose, onUpdate }: {
  project: DesignProject
  teamMembers: TeamMember[]
  onClose: () => void
  onUpdate: () => void
}) {
  const supabase = createClient()
  const [stage, setStage] = useState(project.stage)
  const [designerId, setDesignerId] = useState(project.designer_id || '')
  const [saving, setSaving] = useState(false)

  const handleUpdate = async () => {
    setSaving(true)
    try {
      await supabase.from('design_projects').update({
        stage,
        designer_id: designerId || null,
        updated_at: new Date().toISOString(),
      }).eq('id', project.id)
      onUpdate()
    } catch (err) {
      console.error(err)
      setSaving(false)
    }
  }

  const currentStage = STAGES.find(s => s.key === stage)!
  const StageIcon = currentStage.icon

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface border-l border-border h-full overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface z-10">
          <h2 className="text-lg font-700 text-text1 truncate">{project.client_name}</h2>
          <button onClick={onClose} className="text-text3 hover:text-text1">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Stage */}
          <div>
            <label className="text-xs font-600 text-text2 uppercase tracking-wide">Stage</label>
            <div className="flex gap-2 mt-2">
              {STAGES.map(s => {
                const SIcon = s.icon
                const isActive = stage === s.key
                return (
                  <button
                    key={s.key}
                    onClick={() => setStage(s.key as typeof stage)}
                    className={clsx(
                      'flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs font-600 transition-colors',
                      isActive
                        ? `${s.bg} ${s.border} ${s.color}`
                        : 'border-border text-text3 hover:border-text3'
                    )}
                  >
                    <SIcon size={16} />
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text3">Type</span>
              <span className="text-text1 font-600">{project.design_type}</span>
            </div>
            {project.deadline && (
              <div className="flex justify-between text-sm">
                <span className="text-text3">Deadline</span>
                <span className={clsx('font-600',
                  new Date(project.deadline) < new Date() && stage !== 'approved' ? 'text-red' : 'text-text1'
                )}>
                  {new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
            {project.project && (
              <div className="flex justify-between text-sm">
                <span className="text-text3">Linked Job</span>
                <span className="text-accent font-600">{project.project.client_name}</span>
              </div>
            )}
            {!project.project && (
              <div className="flex items-center gap-1.5 text-xs text-amber bg-amber/10 px-3 py-2 rounded-lg">
                <AlertTriangle size={14} />
                No job linked — sales should review and send quote
              </div>
            )}
          </div>

          {/* Description */}
          {project.description && (
            <div>
              <label className="text-xs font-600 text-text2 uppercase tracking-wide">Description</label>
              <p className="text-sm text-text2 mt-1 leading-relaxed">{project.description}</p>
            </div>
          )}

          {/* Assign Designer */}
          <div>
            <label className="text-xs font-600 text-text2 uppercase tracking-wide">Designer</label>
            <select
              value={designerId}
              onChange={e => setDesignerId(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text1 focus:outline-none focus:border-accent"
            >
              <option value="">Unassigned</option>
              {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Save */}
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="w-full px-4 py-2.5 bg-accent text-white text-sm font-600 rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {/* Timestamps */}
          <div className="text-xs text-text3 space-y-1 pt-2 border-t border-border">
            <div>Created: {new Date(project.created_at).toLocaleString()}</div>
            <div>Updated: {new Date(project.updated_at).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
