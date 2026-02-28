'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Plus,
  X,
  Palette,
  Clock,
  Send,
  CheckCircle,
  FileText,
  Calendar,
  User,
  Link as LinkIcon,
  AlertTriangle,
  MessageCircle,
  Upload,
  Save,
  Trash2,
  ExternalLink,
  Copy,
  Image,
  Filter,
  ChevronDown,
  Search,
  Eye,
  Download,
  RotateCcw,
  RotateCw,
  Hash,
} from 'lucide-react'

/* ─── Types ─── */
interface DesignStudioPageProps {
  profile: Profile
}

type DesignStatus = 'brief' | 'in_progress' | 'proof_sent' | 'revision' | 'approved'

interface DesignProject {
  id: string
  org_id: string
  client_name: string
  design_type: string
  description: string | null
  status: DesignStatus
  deadline: string | null
  designer_id: string | null
  assigned_to?: string | null
  project_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

interface TeamMember {
  id: string
  name: string
  role: string
}

interface ProjectRef {
  id: string
  title: string
}

interface ChatMessage {
  id: string
  user_id: string
  message: string
  image_url?: string | null
  created_at: string
  sender_name?: string
}

interface DesignFile {
  id: string
  name: string
  url: string
  version: number
  created_at: string
  file_type?: string
  file_size?: number
}

/* ─── Constants ─── */
const STAGES: { key: DesignStatus; label: string; color: string }[] = [
  { key: 'brief',       label: 'Brief',       color: '#f59e0b' },
  { key: 'in_progress', label: 'In Progress', color: '#4f7fff' },
  { key: 'proof_sent',  label: 'Proof Sent',  color: '#22d3ee' },
  { key: 'revision',    label: 'Revision',    color: '#f97316' },
  { key: 'approved',    label: 'Approved',    color: '#22c07a' },
]

const DESIGN_TYPES = [
  'Full Wrap', 'Partial Wrap', 'Color Change', 'Commercial Lettering',
  'Custom Graphics', 'Logo Design', 'PPF Template', 'Decal',
  'Fleet Design', 'Other',
]

function getStageIcon(stage: DesignStatus, size = 14) {
  switch (stage) {
    case 'brief': return <FileText size={size} />
    case 'in_progress': return <Clock size={size} />
    case 'proof_sent': return <Send size={size} />
    case 'revision': return <RotateCw size={size} />
    case 'approved': return <CheckCircle size={size} />
  }
}

function daysInStage(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000)
}

function getStageColor(stage: DesignStatus): string {
  return STAGES.find(s => s.key === stage)?.color || '#5a6080'
}

function isImageFile(name: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|heic)$/i.test(name)
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/* ─── Main Component ─── */
export default function DesignStudioPage({ profile }: DesignStudioPageProps) {
  const router = useRouter()
  const supabase = createClient()
  const [projects, setProjects] = useState<DesignProject[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [jobRefs, setJobRefs] = useState<ProjectRef[]>([])
  const [loading, setLoading] = useState(true)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDesigner, setFilterDesigner] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterDeadline, setFilterDeadline] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [formClientName, setFormClientName] = useState('')
  const [formDesignType, setFormDesignType] = useState('Full Wrap')
  const [formDescription, setFormDescription] = useState('')
  const [showFormDescription, setShowFormDescription] = useState(false)
  const [formDeadline, setFormDeadline] = useState('')
  const [formDesignerId, setFormDesignerId] = useState('')
  const [formProjectId, setFormProjectId] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Drawer state
  const [selectedProject, setSelectedProject] = useState<DesignProject | null>(null)
  const [drawerTab, setDrawerTab] = useState<'details' | 'chat' | 'files' | 'proof'>('details')
  const [drawerStatus, setDrawerStatus] = useState<DesignStatus>('brief')
  const [drawerDesignerId, setDrawerDesignerId] = useState('')
  const [drawerClientName, setDrawerClientName] = useState('')
  const [drawerDesignType, setDrawerDesignType] = useState('')
  const [drawerDescription, setDrawerDescription] = useState('')
  const [showDrawerDescription, setShowDrawerDescription] = useState(false)
  const [drawerDeadline, setDrawerDeadline] = useState('')
  const [drawerSaving, setDrawerSaving] = useState(false)

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<DesignFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Proof link state
  const [proofLink, setProofLink] = useState<string | null>(null)
  const [proofCopied, setProofCopied] = useState(false)
  const [proofStatus, setProofStatus] = useState<string | null>(null)

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Version map: design_project_id -> max version number
  const [versionMap, setVersionMap] = useState<Record<string, number>>({})

  // Drag-and-drop state
  const [dragProjectId, setDragProjectId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<DesignStatus | null>(null)

  // ─── Load data ───
  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    setLoading(true)

    const [designRes, teamRes, jobsRes] = await Promise.all([
      supabase
        .from('design_projects')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, name, role')
        .eq('org_id', profile.org_id)
        .eq('active', true),
      supabase
        .from('projects')
        .select('id, title')
        .eq('org_id', profile.org_id)
        .not('status', 'in', '("closed","cancelled")')
        .order('created_at', { ascending: false }),
    ])

    if (designRes.error) console.error('Design projects load error:', designRes.error)
    if (designRes.data) setProjects(designRes.data as DesignProject[])
    if (teamRes.data) setTeam(teamRes.data)
    if (jobsRes.data) setJobRefs(jobsRes.data)

    // Load max file version per design project
    if (designRes.data && designRes.data.length > 0) {
      const ids = designRes.data.map((d: any) => d.id)
      const { data: fileVersions } = await supabase
        .from('design_project_files')
        .select('design_project_id, version')
        .in('design_project_id', ids)
      if (fileVersions) {
        const vMap: Record<string, number> = {}
        fileVersions.forEach((f: any) => {
          if (!vMap[f.design_project_id] || f.version > vMap[f.design_project_id]) {
            vMap[f.design_project_id] = f.version
          }
        })
        setVersionMap(vMap)
      }
    }

    setLoading(false)
  }

  // ─── Drag handlers ───
  function handleCardDragStart(e: React.DragEvent, projectId: string) {
    setDragProjectId(projectId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('projectId', projectId)
  }

  function handleColumnDragOver(e: React.DragEvent, stageKey: DesignStatus) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(stageKey)
  }

  function handleColumnDragLeave() {
    setDragOverColumn(null)
  }

  async function handleColumnDrop(e: React.DragEvent, targetStage: DesignStatus) {
    e.preventDefault()
    setDragOverColumn(null)
    const projectId = e.dataTransfer.getData('projectId') || dragProjectId
    setDragProjectId(null)
    if (!projectId) return
    const project = projects.find(p => p.id === projectId)
    if (!project || project.status === targetStage) return
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, status: targetStage, updated_at: new Date().toISOString() } : p
    ))
    await supabase
      .from('design_projects')
      .update({ status: targetStage, updated_at: new Date().toISOString() })
      .eq('id', projectId)
  }

  // ─── Filtered + grouped by stage ───
  const filteredProjects = useMemo(() => {
    let result = [...projects]

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(dp =>
        dp.client_name.toLowerCase().includes(q) ||
        dp.design_type.toLowerCase().includes(q) ||
        dp.description?.toLowerCase().includes(q)
      )
    }

    // Filter by designer
    if (filterDesigner !== 'all') {
      if (filterDesigner === 'unassigned') {
        result = result.filter(dp => !dp.designer_id)
      } else {
        result = result.filter(dp => dp.designer_id === filterDesigner)
      }
    }

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter(dp => dp.status === filterStatus)
    }

    // Filter by deadline
    if (filterDeadline !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      if (filterDeadline === 'overdue') {
        result = result.filter(dp => dp.deadline && new Date(dp.deadline) < today && dp.status !== 'approved')
      } else if (filterDeadline === 'this_week') {
        const weekEnd = new Date(today)
        weekEnd.setDate(weekEnd.getDate() + 7)
        result = result.filter(dp => dp.deadline && new Date(dp.deadline) >= today && new Date(dp.deadline) <= weekEnd)
      } else if (filterDeadline === 'this_month') {
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        result = result.filter(dp => dp.deadline && new Date(dp.deadline) >= today && new Date(dp.deadline) <= monthEnd)
      } else if (filterDeadline === 'no_deadline') {
        result = result.filter(dp => !dp.deadline)
      }
    }

    return result
  }, [projects, searchQuery, filterDesigner, filterStatus, filterDeadline])

  const columnData = useMemo(() => {
    const result: Record<DesignStatus, DesignProject[]> = {
      brief: [], in_progress: [], proof_sent: [], revision: [], approved: [],
    }
    filteredProjects.forEach(dp => {
      if (result[dp.status]) result[dp.status].push(dp)
    })
    return result
  }, [filteredProjects])

  const activeFilterCount = useMemo(() => {
    let c = 0
    if (filterDesigner !== 'all') c++
    if (filterStatus !== 'all') c++
    if (filterDeadline !== 'all') c++
    if (searchQuery.trim()) c++
    return c
  }, [filterDesigner, filterStatus, filterDeadline, searchQuery])

  // ─── Designers list for filter ───
  const designers = useMemo(() => {
    return team.filter(t => t.role === 'designer' || t.role === 'admin' || t.role === 'owner')
  }, [team])

  // ─── Create new project ───
  function resetForm() {
    setFormClientName(''); setFormDesignType('Full Wrap'); setFormDescription('')
    setFormDeadline(''); setFormDesignerId(''); setFormProjectId(''); setCreateError(null)
  }

  async function handleCreate() {
    if (!formClientName.trim()) return
    setFormSaving(true)

    let briefDescription = formDescription.trim() || null
    if (formProjectId && !briefDescription) {
      const linkedJob = jobRefs.find(j => j.id === formProjectId)
      if (linkedJob) {
        const { data: fullJob } = await supabase.from('projects')
          .select('vehicle_desc, form_data').eq('id', formProjectId).single()
        if (fullJob) {
          const fd = (fullJob.form_data as Record<string, unknown>) || {}
          const parts: string[] = []
          if (fullJob.vehicle_desc) parts.push(`Vehicle: ${fullJob.vehicle_desc}`)
          if (fd.vehicleColor) parts.push(`Color: ${fd.vehicleColor}`)
          if (fd.coverage) parts.push(`Coverage: ${fd.coverage}`)
          if (fd.brandColors) parts.push(`Brand Colors: ${fd.brandColors}`)
          if (fd.designNotes) parts.push(`Notes: ${fd.designNotes}`)
          if (fd.exclusions) parts.push(`Exclusions: ${fd.exclusions}`)
          if (fd.sqft) parts.push(`Est. SqFt: ${fd.sqft}`)
          if (parts.length > 0) briefDescription = parts.join('\n')
        }
      }
    }

    const insertPayload: Record<string, unknown> = {
      org_id: profile.org_id,
      client_name: formClientName.trim(),
      title: formClientName.trim(),
      design_type: formDesignType,
      description: briefDescription,
      notes: briefDescription,
      deadline: formDeadline || null,
      designer_id: formDesignerId || null,
      project_id: formProjectId || null,
      created_by: profile.id,
      status: 'brief',
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any = null
    let error: { message: string } | null = null

    // Try insert — if it fails (e.g. column mismatch), retry with minimal payload
    const res1 = await supabase
      .from('design_projects')
      .insert(insertPayload)
      .select('*')
      .single()

    if (res1.error) {
      // Retry with minimal columns (handles schema variants)
      const minimalPayload: Record<string, unknown> = {
        org_id: profile.org_id,
        title: formClientName.trim(),
        status: 'brief',
        designer_id: formDesignerId || null,
        created_by: profile.id,
      }
      const res2 = await supabase
        .from('design_projects')
        .insert(minimalPayload)
        .select('*')
        .single()
      data = res2.data
      error = res2.error
    } else {
      data = res1.data
      error = null
    }

    if (error) {
      console.error('Design canvas create error:', error)
      setCreateError(error.message || 'Failed to create canvas. Please try again.')
      setFormSaving(false)
      return
    }
    if (!error && data) {
      setProjects(prev => [data as DesignProject, ...prev])

      if (!formProjectId) {
        await supabase.from('job_comments').insert({
          org_id: profile.org_id,
          project_id: null,
          user_id: profile.id,
          channel: `design_${data.id}`,
          message: `New design canvas created for "${formClientName.trim()}" (${formDesignType}) -- No job linked. Sales: please review and send a quote.`,
        })
      }

      setFormSaving(false)
      setShowModal(false)
      resetForm()
      // Navigate immediately to the new design canvas
      router.push(`/design/${data.id}`)
      return
    }

    setFormSaving(false)
    setShowModal(false)
    resetForm()
  }

  // ─── Open drawer ───
  function openDrawer(dp: DesignProject) {
    setSelectedProject(dp)
    setDrawerTab('details')
    setDrawerStatus(dp.status)
    setDrawerDesignerId(dp.designer_id || '')
    setDrawerClientName(dp.client_name)
    setDrawerDesignType(dp.design_type)
    setDrawerDescription(dp.description || '')
    setShowDrawerDescription(!!(dp.description))
    setDrawerDeadline(dp.deadline || '')
    setChatMessages([])
    setChatInput('')
    setUploadedFiles([])
    setProofLink(null)
    setProofCopied(false)
    setProofStatus(null)
    setShowDeleteConfirm(false)
    setLightboxUrl(null)
    loadChat(dp.id)
    loadFiles(dp.id)
    loadProofStatus(dp.id)
  }

  function closeDrawer() {
    setSelectedProject(null)
    setLightboxUrl(null)
  }

  // ─── Load chat ───
  async function loadChat(designProjectId: string) {
    const { data } = await supabase
      .from('job_comments')
      .select('id, user_id, message, image_url, created_at')
      .eq('channel', `design_${designProjectId}`)
      .order('created_at', { ascending: true })

    if (data) {
      const enriched: ChatMessage[] = data.map(m => {
        const sender = team.find(t => t.id === m.user_id)
        return { ...m, sender_name: sender?.name || 'Unknown' }
      })
      setChatMessages(enriched)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  async function sendChat() {
    if (!chatInput.trim() || !selectedProject) return
    setChatSending(true)

    const { data, error } = await supabase
      .from('job_comments')
      .insert({
        org_id: profile.org_id,
        project_id: null,
        user_id: profile.id,
        channel: `design_${selectedProject.id}`,
        message: chatInput.trim(),
      })
      .select()
      .single()

    if (!error && data) {
      setChatMessages(prev => [...prev, {
        id: data.id,
        user_id: data.user_id,
        message: data.message,
        created_at: data.created_at,
        sender_name: profile.name,
      }])
      setChatInput('')
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }

    setChatSending(false)
  }

  // ─── Load files ───
  async function loadFiles(designProjectId: string) {
    const { data } = await supabase
      .from('design_project_files')
      .select('id, file_name, file_url, version, created_at, file_type, file_size')
      .eq('design_project_id', designProjectId)
      .order('version', { ascending: false })

    if (data) {
      setUploadedFiles(data.map(f => ({
        id: f.id,
        name: f.file_name,
        url: f.file_url,
        version: f.version,
        created_at: f.created_at,
        file_type: f.file_type,
        file_size: f.file_size,
      })))
    } else {
      setUploadedFiles([])
    }
  }

  // ─── File upload (supports drag-and-drop) ───
  const processFiles = useCallback(async (files: FileList | File[]) => {
    if (!selectedProject) return
    setUploading(true)

    const nextVersion = uploadedFiles.length > 0 ? Math.max(...uploadedFiles.map(f => f.version)) + 1 : 1

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop() || 'png'
      const path = `design/${selectedProject.id}/v${nextVersion}_${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(path, file, { upsert: false })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        continue
      }

      const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path)
      const publicUrl = urlData?.publicUrl || ''

      const { data: inserted } = await supabase.from('design_project_files').insert({
        design_project_id: selectedProject.id,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        version: nextVersion,
        uploaded_by: profile.id,
      }).select('id').single()

      setUploadedFiles(prev => [{
        id: inserted?.id || crypto.randomUUID(),
        name: file.name,
        url: publicUrl,
        version: nextVersion,
        created_at: new Date().toISOString(),
        file_type: file.type,
        file_size: file.size,
      }, ...prev])
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [selectedProject, uploadedFiles, supabase, profile.id])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    await processFiles(e.target.files)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (e.dataTransfer.files?.length) {
      await processFiles(e.dataTransfer.files)
    }
  }

  // ─── Delete file ───
  async function handleDeleteFile(fileId: string) {
    await supabase.from('design_project_files').delete().eq('id', fileId)
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  // ─── Load proof status ───
  async function loadProofStatus(designProjectId: string) {
    const { data } = await supabase
      .from('proofing_tokens')
      .select('token, status, created_at, expires_at')
      .eq('design_project_id', designProjectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      setProofLink(`${window.location.origin}/proof/${data.token}`)
      setProofStatus(data.status)
    }
  }

  // ─── Send Proof ───
  async function handleSendProof() {
    if (!selectedProject) return

    const { data: existingToken } = await supabase
      .from('proofing_tokens')
      .select('token')
      .eq('design_project_id', selectedProject.id)
      .eq('status', 'pending')
      .single()

    if (existingToken) {
      const link = `${window.location.origin}/proof/${existingToken.token}`
      setProofLink(link)
      setProofStatus('pending')
      return
    }

    const token = crypto.randomUUID()
    const { error } = await supabase.from('proofing_tokens').insert({
      token,
      design_project_id: selectedProject.id,
      org_id: profile.org_id,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    if (!error) {
      const link = `${window.location.origin}/proof/${token}`
      setProofLink(link)
      setProofStatus('pending')

      if (drawerStatus !== 'proof_sent' && drawerStatus !== 'approved') {
        setDrawerStatus('proof_sent')
        await supabase.from('design_projects')
          .update({ status: 'proof_sent', updated_at: new Date().toISOString() })
          .eq('id', selectedProject.id)
        setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, status: 'proof_sent' as DesignStatus } : p))
      }

      await supabase.from('job_comments').insert({
        org_id: profile.org_id,
        project_id: null,
        user_id: profile.id,
        channel: `design_${selectedProject.id}`,
        message: `Proof link generated and ready to send to client.`,
      })
    }
  }

  // ─── Save drawer ───
  async function saveDrawer() {
    if (!selectedProject) return
    setDrawerSaving(true)

    const { error } = await supabase
      .from('design_projects')
      .update({
        status: drawerStatus,
        designer_id: drawerDesignerId || null,
        client_name: drawerClientName.trim(),
        design_type: drawerDesignType,
        description: drawerDescription.trim() || null,
        deadline: drawerDeadline || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedProject.id)

    if (!error) {
      setProjects(prev => prev.map(p =>
        p.id === selectedProject.id
          ? {
              ...p,
              status: drawerStatus,
              designer_id: drawerDesignerId || null,
              client_name: drawerClientName.trim(),
              design_type: drawerDesignType,
              description: drawerDescription.trim() || null,
              deadline: drawerDeadline || null,
            }
          : p
      ))
      closeDrawer()
    }

    setDrawerSaving(false)
  }

  // ─── Delete project ───
  async function handleDeleteProject() {
    if (!selectedProject) return
    setDeleting(true)

    // Delete related records first
    await Promise.all([
      supabase.from('design_project_files').delete().eq('design_project_id', selectedProject.id),
      supabase.from('job_comments').delete().eq('channel', `design_${selectedProject.id}`),
      supabase.from('proofing_tokens').delete().eq('design_project_id', selectedProject.id),
    ])

    const { error } = await supabase.from('design_projects').delete().eq('id', selectedProject.id)

    if (!error) {
      setProjects(prev => prev.filter(p => p.id !== selectedProject.id))
      closeDrawer()
    }

    setDeleting(false)
    setShowDeleteConfirm(false)
  }

  const isOverdue = (dp: DesignProject) =>
    dp.deadline && new Date(dp.deadline) < new Date() && dp.status !== 'approved'

  // ─── Version groups for file display ───
  const versionGroups = useMemo(() => {
    const groups: Record<number, DesignFile[]> = {}
    uploadedFiles.forEach(f => {
      if (!groups[f.version]) groups[f.version] = []
      groups[f.version].push(f)
    })
    return Object.entries(groups)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([version, files]) => ({ version: Number(version), files }))
  }, [uploadedFiles])

  // ─── Clear all filters ───
  function clearFilters() {
    setSearchQuery('')
    setFilterDesigner('all')
    setFilterStatus('all')
    setFilterDeadline('all')
  }

  // ─── Styles ───
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', background: '#0d0f14',
    border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed',
    fontSize: 13, outline: 'none',
  }

  const selectStyle: React.CSSProperties = {
    ...fieldStyle,
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%235a6080' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 8px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '16px 16px',
    paddingRight: 28,
  }

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 28,
            fontWeight: 900,
            color: '#e8eaed',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <Palette size={26} style={{ color: '#4f7fff' }} />
            Design Studio
          </h1>
          <p style={{ fontSize: 13, color: '#5a6080', marginTop: 4 }}>
            {filteredProjects.length} canvas{filteredProjects.length !== 1 ? 'es' : ''}
            {activeFilterCount > 0 && ` (filtered from ${projects.length})`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: activeFilterCount > 0 ? 'rgba(79,127,255,0.12)' : 'transparent',
              color: activeFilterCount > 0 ? '#4f7fff' : '#9299b5',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              border: `1px solid ${activeFilterCount > 0 ? 'rgba(79,127,255,0.3)' : '#1a1d27'}`,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Filter size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span style={{
                background: '#4f7fff',
                color: '#fff',
                fontSize: 10,
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: 10,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              background: '#4f7fff',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            New Canvas
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      {showFilters && (
        <div style={{
          display: 'flex',
          gap: 12,
          padding: '14px 16px',
          background: '#13151c',
          border: '1px solid #1a1d27',
          borderRadius: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}>
          {/* Search */}
          <div style={{ flex: '1 1 200px', minWidth: 180 }}>
            <label style={labelStyle}>Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5a6080' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Client, type, description..."
                style={{ ...fieldStyle, paddingLeft: 30 }}
              />
            </div>
          </div>

          {/* Designer filter */}
          <div style={{ flex: '0 1 180px', minWidth: 150 }}>
            <label style={labelStyle}>Designer</label>
            <select value={filterDesigner} onChange={e => setFilterDesigner(e.target.value)} style={selectStyle}>
              <option value="all">All Designers</option>
              <option value="unassigned">Unassigned</option>
              {designers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div style={{ flex: '0 1 160px', minWidth: 140 }}>
            <label style={labelStyle}>Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
              <option value="all">All Statuses</option>
              {STAGES.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Deadline filter */}
          <div style={{ flex: '0 1 160px', minWidth: 140 }}>
            <label style={labelStyle}>Deadline</label>
            <select value={filterDeadline} onChange={e => setFilterDeadline(e.target.value)} style={selectStyle}>
              <option value="all">Any Deadline</option>
              <option value="overdue">Overdue</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="no_deadline">No Deadline</option>
            </select>
          </div>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '8px 12px',
                background: 'transparent',
                border: '1px solid #1a1d27',
                borderRadius: 8,
                color: '#9299b5',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: 0,
                alignSelf: 'flex-end',
              }}
            >
              <RotateCcw size={12} />
              Clear
            </button>
          )}
        </div>
      )}

      {/* Kanban Board */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#5a6080', fontSize: 14 }}>Loading canvases...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 16 }}>
          {STAGES.map(stage => {
            const stageProjects = columnData[stage.key]
            // If filtering by status and this column doesnt match, still show it but dimmed
            const isDimmed = filterStatus !== 'all' && filterStatus !== stage.key
            return (
              <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', opacity: isDimmed ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                {/* Column Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: '8px 8px 0 0',
                  background: `${stage.color}10`,
                  borderBottom: `2px solid ${stage.color}30`,
                }}>
                  <span style={{ color: stage.color }}>{getStageIcon(stage.key, 16)}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: stage.color, fontFamily: 'Barlow Condensed, sans-serif' }}>{stage.label}</span>
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#5a6080',
                    background: '#1a1d27',
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {stageProjects.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: 8,
                  minHeight: 200,
                  background: 'rgba(26,29,39,0.3)',
                  borderRadius: '0 0 8px 8px',
                  border: '1px solid rgba(26,29,39,0.5)',
                  borderTop: 'none',
                }}>
                  {stageProjects.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      color: '#5a6080',
                      fontSize: 12,
                      padding: '32px 0',
                      border: '1px dashed #1a1d27',
                      borderRadius: 8,
                    }}>
                      No canvases
                    </div>
                  )}

                  {stageProjects.map(dp => {
                    const overdue = isOverdue(dp)
                    return (
                      <button
                        key={dp.id}
                        onClick={() => openDrawer(dp)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          background: '#13151c',
                          border: '1px solid #1a1d27',
                          borderRadius: 10,
                          padding: 12,
                          cursor: 'pointer',
                          transition: 'border-color 0.15s, transform 0.1s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = `${stage.color}40`;
                          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = '#1a1d27';
                          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                        }}
                      >
                        {/* Top row: name + overdue */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {dp.client_name}
                          </span>
                          {overdue && <AlertTriangle size={14} style={{ color: '#f25a5a', flexShrink: 0 }} />}
                        </div>

                        {/* Design type badge */}
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          background: '#1a1d27',
                          color: '#9299b5',
                          marginTop: 6,
                        }}>
                          {dp.design_type}
                        </span>

                        {/* Bottom row: designer, job link, deadline */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                          {dp.designer_id && team.find(t => t.id === dp.designer_id) ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#9299b5' }}>
                              <User size={10} /> {team.find(t => t.id === dp.designer_id)!.name}
                            </span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#5a6080', fontStyle: 'italic' }}>
                              <User size={10} /> Unassigned
                            </span>
                          )}
                          {dp.project_id && jobRefs.some(j => j.id === dp.project_id) && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#4f7fff' }}>
                              <LinkIcon size={10} /> Job
                            </span>
                          )}
                          {dp.deadline && (
                            <span style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              fontSize: 11,
                              color: overdue ? '#f25a5a' : '#5a6080',
                              marginLeft: 'auto',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}>
                              <Calendar size={10} />
                              {new Date(dp.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══════ NEW PROJECT MODAL ═══════ */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => { setShowModal(false); resetForm() }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 540,
              background: '#13151c',
              border: '1px solid #1a1d27',
              borderRadius: 16,
              overflow: 'hidden',
              margin: 16,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1a1d27' }}>
              <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 900, color: '#e8eaed', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Palette size={18} style={{ color: '#4f7fff' }} />
                New Design Canvas
              </h2>
              <button onClick={() => { setShowModal(false); resetForm() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080' }}>
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Project Title */}
              <div>
                <label style={labelStyle}>Project Title *</label>
                <input type="text" placeholder="Enter project title" value={formClientName} onChange={e => setFormClientName(e.target.value)} style={fieldStyle} autoFocus />
              </div>

              {/* Linked Job */}
              <div>
                <label style={labelStyle}>
                  Linked Job <span style={{ fontWeight: 400, textTransform: 'none', color: '#5a6080' }}>(optional)</span>
                </label>
                <select value={formProjectId} onChange={e => setFormProjectId(e.target.value)} style={selectStyle}>
                  <option value="">No linked job</option>
                  {jobRefs.map(j => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
                {!formProjectId && formClientName.trim() && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 6,
                    fontSize: 11,
                    color: '#f59e0b',
                  }}>
                    <AlertTriangle size={12} />
                    Sales will be notified to review and send a quote
                  </div>
                )}
              </div>

              {/* Assigned Designer */}
              <div>
                <label style={labelStyle}>Assigned Designer</label>
                <select value={formDesignerId} onChange={e => setFormDesignerId(e.target.value)} style={selectStyle}>
                  <option value="">Unassigned</option>
                  {designers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Design Type + Deadline */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Design Type</label>
                  <select value={formDesignType} onChange={e => setFormDesignType(e.target.value)} style={selectStyle}>
                    {DESIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Deadline</label>
                  <input type="date" value={formDeadline} onChange={e => setFormDeadline(e.target.value)} style={fieldStyle} />
                </div>
              </div>

              {/* Notes */}
              <div>
                {!showFormDescription ? (
                  <button onClick={() => setShowFormDescription(true)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0' }}>
                    + Add Notes
                  </button>
                ) : (
                  <>
                    <label style={labelStyle}>Notes</label>
                    <textarea placeholder="Design brief, brand colors, requests..." value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} style={{ ...fieldStyle, resize: 'vertical' as const }} />
                  </>
                )}
              </div>
            </div>

            {/* Error message */}
            {createError && (
              <div style={{
                margin: '0 20px',
                padding: '10px 12px',
                background: 'rgba(242,90,90,0.08)',
                border: '1px solid rgba(242,90,90,0.25)',
                borderRadius: 8,
                fontSize: 12,
                color: '#f25a5a',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                {createError}
              </div>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '12px 20px', borderTop: '1px solid #1a1d27' }}>
              <button onClick={() => { setShowModal(false); resetForm() }} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#9299b5', background: 'transparent', border: '1px solid #1a1d27', borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleCreate} disabled={!formClientName.trim() || formSaving} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 700, color: '#fff', background: '#4f7fff', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: (!formClientName.trim() || formSaving) ? 0.5 : 1 }}>
                {formSaving ? 'Creating...' : 'Create Canvas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ SLIDE-OUT DRAWER ═══════ */}
      {selectedProject && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={closeDrawer}
        >
          <div
            className="w-full sm:w-[520px]"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              height: '100%',
              background: '#13151c',
              borderLeft: '1px solid #1a1d27',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'slideInRight 0.2s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #1a1d27', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: getStageColor(drawerStatus),
                  flexShrink: 0,
                }} />
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#e8eaed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {drawerClientName || selectedProject.client_name}
                </h2>
              </div>
              <button onClick={closeDrawer} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080', flexShrink: 0, marginLeft: 8 }}>
                <X size={18} />
              </button>
            </div>

            {/* Stage Selector */}
            <div style={{ padding: '10px 20px', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {STAGES.map(s => {
                  const isActive = drawerStatus === s.key
                  return (
                    <button
                      key={s.key}
                      onClick={() => setDrawerStatus(s.key)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 3,
                        padding: '6px 4px',
                        borderRadius: 8,
                        border: `1px solid ${isActive ? `${s.color}40` : '#1a1d27'}`,
                        background: isActive ? `${s.color}10` : 'transparent',
                        color: isActive ? s.color : '#5a6080',
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {getStageIcon(s.key, 14)}
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: 2, padding: '0 20px 8px', flexShrink: 0, borderBottom: '1px solid #1a1d27' }}>
              {([
                { key: 'details' as const, label: 'Details', icon: <FileText size={13} /> },
                { key: 'files' as const, label: `Files${uploadedFiles.length > 0 ? ` (${uploadedFiles.length})` : ''}`, icon: <Image size={13} /> },
                { key: 'chat' as const, label: `Chat${chatMessages.length > 0 ? ` (${chatMessages.length})` : ''}`, icon: <MessageCircle size={13} /> },
                { key: 'proof' as const, label: 'Proof', icon: <Send size={13} /> },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setDrawerTab(tab.key)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    padding: '8px 4px',
                    borderRadius: '8px 8px 0 0',
                    border: 'none',
                    background: drawerTab === tab.key ? 'rgba(79,127,255,0.08)' : 'transparent',
                    color: drawerTab === tab.key ? '#4f7fff' : '#5a6080',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    borderBottom: drawerTab === tab.key ? '2px solid #4f7fff' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Drawer Content (scrollable) */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>

              {/* ─── DETAILS TAB ─── */}
              {drawerTab === 'details' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Client Name */}
                  <div>
                    <label style={labelStyle}>Client Name</label>
                    <input type="text" value={drawerClientName} onChange={e => setDrawerClientName(e.target.value)} style={fieldStyle} />
                  </div>

                  {/* Design Type */}
                  <div>
                    <label style={labelStyle}>Design Type</label>
                    <select value={drawerDesignType} onChange={e => setDrawerDesignType(e.target.value)} style={selectStyle}>
                      {DESIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    {!showDrawerDescription ? (
                      <button onClick={() => setShowDrawerDescription(true)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0' }}>
                        + Add Description / Brief
                      </button>
                    ) : (
                      <>
                        <label style={labelStyle}>Description / Brief</label>
                        <textarea value={drawerDescription} onChange={e => setDrawerDescription(e.target.value)} rows={4} style={{ ...fieldStyle, resize: 'vertical' as const }} placeholder="Design brief, brand colors, requests..." />
                      </>
                    )}
                  </div>

                  {/* Deadline + Designer */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>Deadline</label>
                      <input type="date" value={drawerDeadline} onChange={e => setDrawerDeadline(e.target.value)} style={fieldStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Designer</label>
                      <select value={drawerDesignerId} onChange={e => setDrawerDesignerId(e.target.value)} style={selectStyle}>
                        <option value="">Unassigned</option>
                        {designers.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Linked job info */}
                  {(() => {
                    const linkedJob = selectedProject.project_id ? jobRefs.find(j => j.id === selectedProject.project_id) : null
                    return linkedJob ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 12px', background: 'rgba(79,127,255,0.06)',
                      border: '1px solid rgba(79,127,255,0.15)', borderRadius: 8,
                    }}>
                      <LinkIcon size={14} style={{ color: '#4f7fff', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: '#5a6080', fontWeight: 600 }}>Linked Job</div>
                        <div style={{ fontSize: 13, color: '#4f7fff', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{linkedJob.title}</div>
                      </div>
                      <button
                        onClick={() => router.push(`/projects/${linkedJob.id}`)}
                        style={{
                          padding: '4px 10px', background: 'rgba(79,127,255,0.12)',
                          border: '1px solid rgba(79,127,255,0.2)', borderRadius: 6,
                          color: '#4f7fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        View
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 12, color: '#f59e0b',
                      background: 'rgba(245,158,11,0.08)',
                      padding: '10px 12px', borderRadius: 8,
                      border: '1px solid rgba(245,158,11,0.15)',
                    }}>
                      <AlertTriangle size={14} />
                      No job linked -- sales should review and send quote
                    </div>
                  )
                  })()}

                  {/* Timestamps */}
                  <div style={{ fontSize: 11, color: '#5a6080', borderTop: '1px solid #1a1d27', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div>Created: {new Date(selectedProject.created_at).toLocaleString()}</div>
                    <div>Updated: {new Date(selectedProject.updated_at).toLocaleString()}</div>
                  </div>

                  {/* Delete project */}
                  <div style={{ borderTop: '1px solid #1a1d27', paddingTop: 12 }}>
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '8px 12px', background: 'transparent',
                          border: '1px solid rgba(242,90,90,0.2)', borderRadius: 8,
                          color: '#f25a5a', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          width: '100%', justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={13} />
                        Delete Canvas
                      </button>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: 'rgba(242,90,90,0.06)', border: '1px solid rgba(242,90,90,0.2)', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: '#f25a5a', fontWeight: 600 }}>
                          Are you sure? This will delete the canvas, files, comments, and proof links.
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            style={{ flex: 1, padding: '6px 12px', background: 'transparent', border: '1px solid #1a1d27', borderRadius: 6, color: '#9299b5', fontSize: 12, cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleDeleteProject}
                            disabled={deleting}
                            style={{ flex: 1, padding: '6px 12px', background: '#f25a5a', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}
                          >
                            {deleting ? 'Deleting...' : 'Yes, Delete'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── FILES TAB (Version History + Drag-Drop Upload) ─── */}
              {drawerTab === 'files' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Upload area (drag-drop) */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.ai,.psd,.svg,.eps"
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragOver ? '#4f7fff' : '#2a2f3d'}`,
                      borderRadius: 12,
                      padding: '24px 16px',
                      textAlign: 'center',
                      color: dragOver ? '#4f7fff' : '#5a6080',
                      fontSize: 12,
                      background: dragOver ? 'rgba(79,127,255,0.05)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {uploading ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <div style={{
                          width: 16, height: 16, border: '2px solid #4f7fff', borderTopColor: 'transparent',
                          borderRadius: '50%', animation: 'spin 0.6s linear infinite',
                        }} />
                        Uploading...
                      </div>
                    ) : (
                      <>
                        <Upload size={22} style={{ margin: '0 auto 8px', display: 'block', color: dragOver ? '#4f7fff' : '#5a6080' }} />
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>
                          {dragOver ? 'Drop files here' : 'Drag & drop files or click to upload'}
                        </div>
                        <div style={{ fontSize: 11, color: '#5a6080' }}>
                          Images, PDFs, AI, PSD, SVG, EPS
                        </div>
                      </>
                    )}
                  </div>

                  {/* Version History */}
                  {versionGroups.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 700, color: '#9299b5',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        fontFamily: 'Barlow Condensed, sans-serif',
                      }}>
                        Version History
                      </div>
                      {versionGroups.map(group => (
                        <div key={group.version} style={{
                          background: '#0d0f14',
                          border: '1px solid #1a1d27',
                          borderRadius: 10,
                          overflow: 'hidden',
                        }}>
                          {/* Version header */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 12px',
                            background: group.version === versionGroups[0]?.version ? 'rgba(79,127,255,0.06)' : 'transparent',
                            borderBottom: '1px solid #1a1d27',
                          }}>
                            <span style={{
                              fontSize: 12, fontWeight: 800, color: group.version === versionGroups[0]?.version ? '#4f7fff' : '#9299b5',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}>
                              v{group.version}
                            </span>
                            {group.version === versionGroups[0]?.version && (
                              <span style={{
                                fontSize: 9, fontWeight: 700, color: '#4f7fff',
                                background: 'rgba(79,127,255,0.12)', padding: '1px 6px', borderRadius: 4,
                                textTransform: 'uppercase',
                              }}>
                                Latest
                              </span>
                            )}
                            <span style={{
                              marginLeft: 'auto', fontSize: 10, color: '#5a6080',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}>
                              {group.files.length} file{group.files.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* File thumbnails / list */}
                          <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {/* Thumbnail grid for images */}
                            {group.files.some(f => isImageFile(f.name)) && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6, marginBottom: 4 }}>
                                {group.files.filter(f => isImageFile(f.name)).map(file => (
                                  <div
                                    key={file.id}
                                    style={{
                                      position: 'relative',
                                      aspectRatio: '1',
                                      borderRadius: 8,
                                      overflow: 'hidden',
                                      border: '1px solid #1a1d27',
                                      cursor: 'pointer',
                                    }}
                                    onClick={() => setLightboxUrl(file.url)}
                                  >
                                    <img
                                      src={file.url}
                                      alt={file.name}
                                      style={{
                                        width: '100%', height: '100%',
                                        objectFit: 'cover',
                                      }}
                                    />
                                    {/* Hover overlay */}
                                    <div
                                      style={{
                                        position: 'absolute', inset: 0,
                                        background: 'rgba(0,0,0,0.5)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        opacity: 0, transition: 'opacity 0.15s',
                                      }}
                                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                      onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                                    >
                                      <Eye size={18} style={{ color: '#fff' }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* File rows */}
                            {group.files.map(file => (
                              <div key={file.id} style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '6px 8px', background: '#13151c', borderRadius: 6,
                              }}>
                                {isImageFile(file.name) ? (
                                  <Image size={13} style={{ color: '#22d3ee', flexShrink: 0 }} />
                                ) : (
                                  <FileText size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: 11, fontWeight: 600, color: '#e8eaed',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>{file.name}</div>
                                  <div style={{ fontSize: 9, color: '#5a6080', fontFamily: "'JetBrains Mono', monospace" }}>
                                    {formatFileSize(file.file_size)}
                                    {file.file_size ? ' -- ' : ''}
                                    {new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      width: 26, height: 26, borderRadius: 6,
                                      background: 'rgba(79,127,255,0.08)', color: '#4f7fff',
                                      border: 'none', cursor: 'pointer', textDecoration: 'none',
                                    }}
                                    title="Open in new tab"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                  <button
                                    onClick={() => handleDeleteFile(file.id)}
                                    style={{
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      width: 26, height: 26, borderRadius: 6,
                                      background: 'rgba(242,90,90,0.08)', color: '#f25a5a',
                                      border: 'none', cursor: 'pointer',
                                    }}
                                    title="Delete file"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#5a6080', fontSize: 12, padding: '24px 0' }}>
                      No files uploaded yet. Upload your first design file above.
                    </div>
                  )}
                </div>
              )}

              {/* ─── CHAT TAB ─── */}
              {drawerTab === 'chat' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Messages */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}>
                    {chatMessages.length === 0 && (
                      <div style={{ fontSize: 12, color: '#5a6080', textAlign: 'center', padding: '32px 0' }}>
                        No comments yet. Start the conversation.
                      </div>
                    )}
                    {chatMessages.map(msg => {
                      const isMine = msg.user_id === profile.id
                      return (
                        <div key={msg.id} style={{
                          maxWidth: '85%',
                          alignSelf: isMine ? 'flex-end' : 'flex-start',
                        }}>
                          <div style={{
                            padding: '8px 12px',
                            borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                            background: isMine ? 'rgba(79,127,255,0.12)' : '#1a1d27',
                            border: `1px solid ${isMine ? 'rgba(79,127,255,0.2)' : '#1a1d27'}`,
                          }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: isMine ? '#4f7fff' : '#9299b5', marginBottom: 3 }}>
                              {msg.sender_name}
                            </div>
                            <div style={{ fontSize: 12, color: '#e8eaed', lineHeight: 1.5 }}>{msg.message}</div>
                            {msg.image_url && (
                              <img
                                src={msg.image_url}
                                alt="attachment"
                                style={{
                                  marginTop: 6, borderRadius: 6, maxWidth: 180, maxHeight: 120,
                                  objectFit: 'cover', border: '1px solid #1a1d27', cursor: 'pointer',
                                }}
                                onClick={() => setLightboxUrl(msg.image_url || null)}
                              />
                            )}
                          </div>
                          <div style={{ fontSize: 9, color: '#5a6080', marginTop: 2, textAlign: isMine ? 'right' : 'left', padding: '0 4px' }}>
                            {new Date(msg.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </div>
                        </div>
                      )
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #1a1d27', paddingTop: 12 }}>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) sendChat() }}
                      placeholder="Type a comment..."
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        background: '#0d0f14',
                        border: '1px solid #1a1d27',
                        borderRadius: 8,
                        color: '#e8eaed',
                        fontSize: 12,
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={sendChat}
                      disabled={chatSending || !chatInput.trim()}
                      style={{
                        padding: '10px 14px',
                        background: '#4f7fff',
                        color: '#fff',
                        borderRadius: 8,
                        border: 'none',
                        cursor: 'pointer',
                        opacity: (chatSending || !chatInput.trim()) ? 0.4 : 1,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* ─── PROOF TAB ─── */}
              {drawerTab === 'proof' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Approval Status */}
                  <div style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: proofStatus === 'approved'
                      ? 'rgba(34,192,122,0.08)'
                      : proofStatus === 'rejected'
                      ? 'rgba(242,90,90,0.08)'
                      : 'rgba(34,211,238,0.06)',
                    border: `1px solid ${
                      proofStatus === 'approved'
                        ? 'rgba(34,192,122,0.2)'
                        : proofStatus === 'rejected'
                        ? 'rgba(242,90,90,0.2)'
                        : 'rgba(34,211,238,0.15)'
                    }`,
                  }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.06em', marginBottom: 4,
                      color: proofStatus === 'approved' ? '#22c07a' : proofStatus === 'rejected' ? '#f25a5a' : '#22d3ee',
                    }}>
                      Client Approval Status
                    </div>
                    <div style={{
                      fontSize: 16, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif',
                      color: proofStatus === 'approved' ? '#22c07a' : proofStatus === 'rejected' ? '#f25a5a' : proofLink ? '#22d3ee' : '#5a6080',
                    }}>
                      {proofStatus === 'approved' ? 'Approved' :
                       proofStatus === 'rejected' ? 'Revision Requested' :
                       proofStatus === 'pending' ? 'Pending Client Review' :
                       'No proof sent yet'}
                    </div>
                  </div>

                  {/* Generate / view proof link */}
                  <div>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: '#9299b5',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 8,
                    }}>
                      Proof Link
                    </div>

                    {uploadedFiles.length === 0 && (
                      <div style={{
                        padding: '12px 14px', borderRadius: 8,
                        background: 'rgba(245,158,11,0.06)',
                        border: '1px solid rgba(245,158,11,0.15)',
                        fontSize: 12, color: '#f59e0b',
                        display: 'flex', alignItems: 'center', gap: 8,
                        marginBottom: 10,
                      }}>
                        <AlertTriangle size={14} />
                        Upload design files first before sending a proof.
                      </div>
                    )}

                    <button
                      onClick={handleSendProof}
                      disabled={uploadedFiles.length === 0}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 8, padding: '12px 16px',
                        background: uploadedFiles.length === 0 ? '#1a1d27' : 'rgba(34,211,238,0.1)',
                        border: `1px solid ${uploadedFiles.length === 0 ? '#1a1d27' : 'rgba(34,211,238,0.3)'}`,
                        borderRadius: 10, color: uploadedFiles.length === 0 ? '#5a6080' : '#22d3ee',
                        fontSize: 13, fontWeight: 700, cursor: uploadedFiles.length === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Send size={14} />
                      {proofLink ? 'Regenerate Proof Link' : 'Generate Proof Link'}
                    </button>

                    {proofLink && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginTop: 10,
                        padding: '10px 12px', background: 'rgba(34,192,122,0.06)',
                        border: '1px solid rgba(34,192,122,0.15)', borderRadius: 10,
                      }}>
                        <input
                          type="text"
                          readOnly
                          value={proofLink}
                          style={{
                            flex: 1, background: 'transparent', border: 'none',
                            color: '#22c07a', fontSize: 11, outline: 'none',
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(proofLink)
                            setProofCopied(true)
                            setTimeout(() => setProofCopied(false), 2000)
                          }}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: proofCopied ? '#22c07a' : '#9299b5', flexShrink: 0,
                            display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          <Copy size={12} />
                          {proofCopied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Latest file preview */}
                  {uploadedFiles.length > 0 && (
                    <div>
                      <div style={{
                        fontSize: 12, fontWeight: 700, color: '#9299b5',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 8,
                      }}>
                        Latest Version Preview
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                        gap: 8,
                      }}>
                        {uploadedFiles
                          .filter(f => f.version === versionGroups[0]?.version && isImageFile(f.name))
                          .map(file => (
                            <div
                              key={file.id}
                              style={{
                                aspectRatio: '1',
                                borderRadius: 8,
                                overflow: 'hidden',
                                border: '1px solid #1a1d27',
                                cursor: 'pointer',
                              }}
                              onClick={() => setLightboxUrl(file.url)}
                            >
                              <img
                                src={file.url}
                                alt={file.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div style={{
                    padding: '12px 14px', borderRadius: 8,
                    background: '#0d0f14', border: '1px solid #1a1d27',
                    fontSize: 11, color: '#5a6080', lineHeight: 1.6,
                  }}>
                    <div style={{ fontWeight: 700, color: '#9299b5', marginBottom: 4 }}>How proofing works:</div>
                    1. Upload design files in the Files tab<br />
                    2. Generate a proof link above<br />
                    3. Share the link with your client<br />
                    4. Client can approve or request revisions<br />
                    5. Status updates automatically
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons (fixed at bottom) */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #1a1d27', flexShrink: 0, display: 'flex', gap: 8 }}>
              <button
                onClick={() => router.push(`/design/${selectedProject.id}`)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  background: 'rgba(34,192,122,0.1)',
                  color: '#22c07a',
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 8,
                  border: '1px solid rgba(34,192,122,0.2)',
                  cursor: 'pointer',
                }}
              >
                <Palette size={15} />
                Open Canvas
              </button>
              <button
                onClick={saveDrawer}
                disabled={drawerSaving}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  background: '#4f7fff',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  opacity: drawerSaving ? 0.6 : 1,
                }}
              >
                <Save size={15} />
                {drawerSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ LIGHTBOX ═══════ */}
      {lightboxUrl && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff',
            }}
          >
            <X size={24} />
          </button>
          <img
            src={lightboxUrl}
            alt="Preview"
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              objectFit: 'contain', borderRadius: 8,
            }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* ═══════ Global CSS ═══════ */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
