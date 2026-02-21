'use client'

import { useState, useEffect, useRef } from 'react'
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
  MessageCircle,
  Upload,
  Image,
  Trash2,
} from 'lucide-react'
import type { Profile } from '@/types'
import { useToast } from '@/components/shared/Toast'

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
          profile={profile}
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
  const { xpToast, badgeToast } = useToast()
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
          org_id: profile.org_id,
          project_id: null,
          user_id: profile.id,
          channel: `design_${dp.id}`,
          message: `New design project created for "${form.client_name}" (${form.design_type}) -- No job linked yet. Sales: please review and send quote if applicable.`,
        })
      }

      // Award create_design XP
      fetch('/api/xp/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_design', sourceType: 'design_project', sourceId: dp?.id }),
      })
        .then(r => r.ok ? r.json() : null)
        .then((res: {  amount?: number; leveledUp?: boolean; newLevel?: number; newBadges?: string[] } | null) => {
          if (res?.amount) xpToast(res.amount, 'Design created', res.leveledUp, res.newLevel)
          if (res?.newBadges?.length) badgeToast(res.newBadges)
        })
        .catch(() => {})

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
              <option value="">No linked job -- will flag sales</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.client_name} -- {p.name}</option>
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

/* ─── Chat Message Type ─── */
type ChatMessage = {
  id: string
  user_id: string
  message: string
  image_url?: string | null
  channel: string
  created_at: string
  profiles?: {
    name: string
    avatar_url?: string
    role?: string
  } | null
}

/* ─── Design File Type ─── */
type DesignFile = {
  id: string
  image_url: string
  file_name: string
  category: string
  file_size?: number
  created_at: string
}

/* ─── Drawer Tab: Chat ─── */
function DesignChat({ designProjectId, orgId, currentUserId, currentUserName }: {
  designProjectId: string
  orgId: string
  currentUserId: string
  currentUserName: string
}) {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const channel = `design_${designProjectId}`

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('job_comments')
        .select('*, profiles:user_id(name, avatar_url, role)')
        .eq('channel', channel)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMessages(data as ChatMessage[])
      }
    }

    fetchMessages()

    // Real-time subscription
    const sub = supabase
      .channel(`design-chat-${designProjectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_comments',
        },
        async (payload: any) => {
          if (payload.new.channel === channel) {
            const { data } = await supabase
              .from('job_comments')
              .select('*, profiles:user_id(name, avatar_url, role)')
              .eq('id', payload.new.id)
              .single()

            if (data) {
              setMessages(prev => {
                // Avoid duplicates
                if (prev.some(m => m.id === data.id)) return prev
                return [...prev, data as ChatMessage]
              })
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
    }
  }, [designProjectId, channel])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    setSending(true)

    const { error } = await supabase.from('job_comments').insert({
      org_id: orgId,
      project_id: null,
      user_id: currentUserId,
      channel,
      message: newMessage.trim(),
    })

    if (!error) {
      setNewMessage('')
    }
    setSending(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const fileExt = file.name.split('.').pop()
    const fileName = `design/${designProjectId}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('job-images')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload failed:', uploadError)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('job-images')
      .getPublicUrl(fileName)

    await supabase.from('job_comments').insert({
      org_id: orgId,
      project_id: null,
      user_id: currentUserId,
      channel,
      message: newMessage.trim() || file.name,
      image_url: urlData.publicUrl,
    })

    setNewMessage('')
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const getInitial = (name: string) => name?.charAt(0)?.toUpperCase() || '?'

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 320px)', minHeight: 360 }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-text3 text-sm py-12">
            No messages yet. Start the conversation!
          </div>
        )}

        {messages.map(msg => {
          const isSent = msg.user_id === currentUserId
          const senderName = msg.profiles?.name || (isSent ? currentUserName : 'Unknown')

          return (
            <div key={msg.id} className={clsx('flex gap-2.5 max-w-[85%]', isSent && 'ml-auto flex-row-reverse')}>
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-700 text-white shrink-0"
                style={{ backgroundColor: isSent ? 'var(--green)' : 'var(--accent)' }}
              >
                {getInitial(senderName)}
              </div>

              <div>
                {/* Bubble */}
                <div
                  className={clsx(
                    'px-3 py-2 border rounded-xl text-sm',
                    isSent
                      ? 'bg-accent/20 border-accent/30 rounded-br-sm'
                      : 'bg-surface2 border-border rounded-bl-sm'
                  )}
                >
                  <div className={clsx('text-[11px] font-700 mb-0.5', isSent ? 'text-accent' : 'text-text2')}>
                    {senderName}
                  </div>
                  <div className="text-text1 leading-relaxed">{msg.message}</div>
                  {msg.image_url && (
                    <img
                      src={msg.image_url}
                      alt="attachment"
                      className="mt-2 rounded-lg max-w-[200px] max-h-[150px] object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setLightboxUrl(msg.image_url || null)}
                    />
                  )}
                </div>
                <div className="text-[10px] text-text3 mt-0.5 px-1">
                  {formatTime(msg.created_at)}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-border">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-2.5 py-2 bg-surface2 border border-border rounded-lg text-text3 hover:text-accent hover:border-accent/30 transition-colors disabled:opacity-50"
          title="Attach image"
        >
          <Image size={16} />
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={uploading ? 'Uploading image...' : 'Type a message...'}
          disabled={uploading}
          className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text1 placeholder:text-text3 focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={sending || !newMessage.trim()}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-600 hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={14} />
        </button>
      </div>

      {/* Image lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X size={28} />
          </button>
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

/* ─── Drawer Tab: Files ─── */
function DesignFiles({ designProjectId, orgId, currentUserId, linkedProjectId }: {
  designProjectId: string
  orgId: string
  currentUserId: string
  linkedProjectId: string | null
}) {
  const supabase = createClient()
  const [files, setFiles] = useState<DesignFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch design files
  useEffect(() => {
    const fetchFiles = async () => {
      // Query files for this design project by category + tag filter
      const { data, error } = await supabase
        .from('job_images')
        .select('*')
        .eq('category', 'design')
        .contains('tags', [designProjectId])
        .order('created_at', { ascending: false })

      if (!error && data) {
        setFiles(data as DesignFile[])
      }
    }
    fetchFiles()
  }, [designProjectId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList?.length) return
    setUploading(true)

    for (const file of Array.from(fileList)) {
      const storagePath = `design/${designProjectId}/${Date.now()}_${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('job-images')
        .upload(storagePath, file)

      if (uploadError) {
        console.error('Upload failed:', uploadError)
        continue
      }

      const { data: urlData } = supabase.storage
        .from('job-images')
        .getPublicUrl(storagePath)

      // Insert record linking to design project via tags
      const { data: imgRecord, error: insertError } = await supabase
        .from('job_images')
        .insert({
          org_id: orgId,
          project_id: linkedProjectId || null,
          user_id: currentUserId,
          category: 'design',
          image_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          tags: [designProjectId, 'design-studio'],
        })
        .select()
        .single()

      if (!insertError && imgRecord) {
        setFiles(prev => [imgRecord as DesignFile, ...prev])
      }
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const deleteFile = async (fileId: string) => {
    if (!confirm('Delete this file?')) return
    await supabase.from('job_images').delete().eq('id', fileId)
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 320px)', minHeight: 360 }}>
      {/* Upload zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
        onDrop={e => {
          e.preventDefault()
          e.stopPropagation()
          if (e.dataTransfer.files?.length && fileInputRef.current) {
            // Programmatically assign files via DataTransfer
            const dt = new DataTransfer()
            Array.from(e.dataTransfer.files).forEach(f => dt.items.add(f))
            fileInputRef.current.files = dt.files
            fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }))
          }
        }}
        className={clsx(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-4',
          uploading
            ? 'border-accent bg-accent/5'
            : 'border-border hover:border-accent/50 hover:bg-accent/5'
        )}
      >
        <Upload size={24} className={clsx('mx-auto mb-2', uploading ? 'text-accent' : 'text-text3')} />
        <div className="text-sm font-600 text-text2">
          {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
        </div>
        <div className="text-xs text-text3 mt-1">
          Images, PDFs, design files -- max 25MB
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.ai,.psd,.svg,.eps"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* File grid */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="text-center text-text3 text-sm py-12">
            No files uploaded yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {files.map(file => {
              const isImage = /\.(jpg|jpeg|png|gif|webp|heic|svg)$/i.test(file.file_name) || file.image_url?.match(/\.(jpg|jpeg|png|gif|webp|heic|svg)/i)

              return (
                <div
                  key={file.id}
                  className="relative group rounded-lg overflow-hidden border border-border hover:border-accent/30 transition-colors"
                >
                  {isImage ? (
                    <div
                      className="aspect-square cursor-pointer"
                      onClick={() => setLightboxUrl(file.image_url)}
                    >
                      <img
                        src={file.image_url}
                        alt={file.file_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <a
                      href={file.image_url}
                      className="aspect-square flex flex-col items-center justify-center bg-surface2 cursor-pointer"
                    >
                      <FileText size={24} className="text-text3 mb-1" />
                      <span className="text-[10px] text-text3 px-1 text-center truncate w-full">{file.file_name}</span>
                    </a>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <div className="text-[10px] text-white font-600 truncate">{file.file_name}</div>
                    {file.file_size && (
                      <div className="text-[9px] text-white/60">{formatSize(file.file_size)}</div>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); deleteFile(file.id) }}
                      className="absolute top-1.5 right-1.5 p-1 bg-red/80 rounded text-white hover:bg-red transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X size={28} />
          </button>
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

/* ─── Project Detail Drawer ─── */
function DesignProjectDrawer({ project, profile, teamMembers, onClose, onUpdate }: {
  project: DesignProject
  profile: Profile
  teamMembers: TeamMember[]
  onClose: () => void
  onUpdate: () => void
}) {
  const supabase = createClient()
  const [stage, setStage] = useState(project.stage)
  const [designerId, setDesignerId] = useState(project.designer_id || '')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'files'>('details')
  const [toast, setToast] = useState<string | null>(null)

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const handleUpdate = async () => {
    setSaving(true)
    try {
      // Check if stage changed to approved and no linked project
      const stageChangedToApproved = stage === 'approved' && project.stage !== 'approved'
      const noLinkedJob = !project.project_id

      // Update design project
      await supabase.from('design_projects').update({
        stage,
        designer_id: designerId || null,
        updated_at: new Date().toISOString(),
      }).eq('id', project.id)

      // Auto-create draft job when approved + no linked job
      if (stageChangedToApproved && noLinkedJob) {
        const { data: newJob, error: jobError } = await supabase.from('projects').insert({
          org_id: project.org_id,
          type: 'wrap',
          title: `Design: ${project.client_name}`,
          status: 'estimate',
          pipe_stage: 'sales_in',
          division: 'wraps',
          priority: 'normal',
          form_data: {
            clientName: project.client_name,
            designType: project.design_type,
            designProjectId: project.id,
            sourceNote: 'Auto-created from Design Studio approval',
          },
          fin_data: null,
          actuals: {},
          checkout: {},
          send_backs: [],
        }).select().single()

        if (!jobError && newJob) {
          // Link design project to new job
          await supabase.from('design_projects').update({
            project_id: newJob.id,
          }).eq('id', project.id)

          // Post system message to design chat
          await supabase.from('job_comments').insert({
            org_id: project.org_id,
            project_id: newJob.id,
            user_id: profile.id,
            channel: `design_${project.id}`,
            message: `Design approved! Draft job created and linked for sales review. Job: "${newJob.title}"`,
          })

          setToast('Draft job created for sales review!')
        }
      }

      onUpdate()
    } catch (err) {
      console.error(err)
      setSaving(false)
    }
  }

  const currentStage = STAGES.find(s => s.key === stage)!
  const StageIcon = currentStage.icon

  const TABS = [
    { key: 'details' as const, label: 'Details', icon: FileText },
    { key: 'chat' as const,    label: 'Chat',    icon: MessageCircle },
    { key: 'files' as const,   label: 'Files',   icon: Image },
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface border-l border-border h-full overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={clsx('w-2 h-2 rounded-full shrink-0', currentStage.bg)}
              style={{
                backgroundColor: stage === 'brief' ? 'var(--amber)' :
                                 stage === 'in_progress' ? 'var(--accent)' :
                                 stage === 'proof_sent' ? 'var(--cyan)' :
                                 'var(--green)'
              }}
            />
            <h2 className="text-lg font-700 text-text1 truncate">{project.client_name}</h2>
          </div>
          <button onClick={onClose} className="text-text3 hover:text-text1 transition-colors shrink-0 ml-2">
            <X size={18} />
          </button>
        </div>

        {/* Stage Selector */}
        <div className="px-5 pt-4 pb-2 shrink-0">
          <div className="flex gap-2">
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

        {/* Tab Navigation */}
        <div className="flex gap-1 px-5 pb-3 pt-1 shrink-0">
          {TABS.map(tab => {
            const TabIcon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-600 border transition-all',
                  isActive
                    ? 'bg-accent/15 border-accent/30 text-accent'
                    : 'bg-transparent border-transparent text-text3 hover:text-text2 hover:bg-surface2'
                )}
              >
                <TabIcon size={13} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden px-5 pb-4">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="h-full overflow-y-auto space-y-5 pr-1">
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
                    No job linked -- {stage === 'approved' ? 'draft job will be created on save' : 'sales should review and send quote'}
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

              {/* Approved notice */}
              {stage === 'approved' && !project.project_id && project.stage !== 'approved' && (
                <div className="flex items-center gap-2 text-xs text-green bg-green/10 px-3 py-2 rounded-lg border border-green/20">
                  <CheckCircle size={14} />
                  Saving will auto-create a draft job for sales review
                </div>
              )}

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
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <DesignChat
              designProjectId={project.id}
              orgId={project.org_id}
              currentUserId={profile.id}
              currentUserName={profile.name}
            />
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <DesignFiles
              designProjectId={project.id}
              orgId={project.org_id}
              currentUserId={profile.id}
              linkedProjectId={project.project_id}
            />
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 bg-green text-white text-sm font-600 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
            <CheckCircle size={16} />
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}
