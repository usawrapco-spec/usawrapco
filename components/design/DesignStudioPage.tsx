'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  ChevronRight,
} from 'lucide-react'

interface DesignStudioPageProps {
  profile: any
}

type DesignStage = 'brief' | 'in_progress' | 'proof_sent' | 'approved'

interface DesignProject {
  id: string
  org_id: string
  client_name: string
  design_type: string
  description: string | null
  stage: DesignStage
  deadline: string | null
  designer_id: string | null
  project_id: string | null
  created_at: string
  updated_at: string
  designer?: { id: string; name: string } | null
  project?: { id: string; title: string } | null
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
  created_at: string
  sender_name?: string
}

const STAGES: { key: DesignStage; label: string; color: string }[] = [
  { key: 'brief',       label: 'Brief',       color: '#f59e0b' },
  { key: 'in_progress', label: 'In Progress', color: '#4f7fff' },
  { key: 'proof_sent',  label: 'Proof Sent',  color: '#22d3ee' },
  { key: 'approved',    label: 'Approved',     color: '#22c07a' },
]

const DESIGN_TYPES = [
  'Full Wrap', 'Partial Wrap', 'Color Change', 'Commercial Lettering',
  'Custom Graphics', 'Logo Design', 'PPF Template', 'Decal',
  'Fleet Design', 'Other',
]

function getStageIcon(stage: DesignStage, size = 14) {
  switch (stage) {
    case 'brief': return <FileText size={size} />
    case 'in_progress': return <Clock size={size} />
    case 'proof_sent': return <Send size={size} />
    case 'approved': return <CheckCircle size={size} />
  }
}

function getStageColor(stage: DesignStage): string {
  return STAGES.find(s => s.key === stage)?.color || '#5a6080'
}

export default function DesignStudioPage({ profile }: DesignStudioPageProps) {
  const router = useRouter()
  const supabase = createClient()
  const [projects, setProjects] = useState<DesignProject[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [jobRefs, setJobRefs] = useState<ProjectRef[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [formClientName, setFormClientName] = useState('')
  const [formDesignType, setFormDesignType] = useState('Full Wrap')
  const [formDescription, setFormDescription] = useState('')
  const [formDeadline, setFormDeadline] = useState('')
  const [formDesignerId, setFormDesignerId] = useState('')
  const [formProjectId, setFormProjectId] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  // Drawer state
  const [selectedProject, setSelectedProject] = useState<DesignProject | null>(null)
  const [drawerStage, setDrawerStage] = useState<DesignStage>('brief')
  const [drawerDesignerId, setDrawerDesignerId] = useState('')
  const [drawerClientName, setDrawerClientName] = useState('')
  const [drawerDesignType, setDrawerDesignType] = useState('')
  const [drawerDescription, setDrawerDescription] = useState('')
  const [drawerDeadline, setDrawerDeadline] = useState('')
  const [drawerSaving, setDrawerSaving] = useState(false)

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    const [designRes, teamRes, jobsRes] = await Promise.all([
      supabase
        .from('design_projects')
        .select('*, designer:designer_id(id, name), project:project_id(id, title)')
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

    if (designRes.data) setProjects(designRes.data as DesignProject[])
    if (teamRes.data) setTeam(teamRes.data)
    if (jobsRes.data) setJobRefs(jobsRes.data)

    setLoading(false)
  }

  // Group by stage
  const columnData = useMemo(() => {
    const result: Record<DesignStage, DesignProject[]> = {
      brief: [], in_progress: [], proof_sent: [], approved: [],
    }
    projects.forEach(dp => {
      if (result[dp.stage]) result[dp.stage].push(dp)
    })
    return result
  }, [projects])

  // Create new project
  function resetForm() {
    setFormClientName(''); setFormDesignType('Full Wrap'); setFormDescription('')
    setFormDeadline(''); setFormDesignerId(''); setFormProjectId('')
  }

  async function handleCreate() {
    if (!formClientName.trim()) return
    setFormSaving(true)

    const { data, error } = await supabase
      .from('design_projects')
      .insert({
        org_id: profile.org_id,
        client_name: formClientName.trim(),
        design_type: formDesignType,
        description: formDescription.trim() || null,
        deadline: formDeadline || null,
        designer_id: formDesignerId || null,
        project_id: formProjectId || null,
        stage: 'brief',
      })
      .select('*, designer:designer_id(id, name), project:project_id(id, title)')
      .single()

    if (!error && data) {
      setProjects(prev => [data as DesignProject, ...prev])

      // If no linked job, post notification comment
      if (!formProjectId) {
        await supabase.from('job_comments').insert({
          org_id: profile.org_id,
          project_id: null,
          user_id: profile.id,
          channel: `design_${data.id}`,
          message: `New design project created for "${formClientName.trim()}" (${formDesignType}) -- No job linked. Sales: please review and send a quote.`,
        })
      }
    }

    setFormSaving(false)
    setShowModal(false)
    resetForm()
  }

  // Open drawer
  function openDrawer(dp: DesignProject) {
    setSelectedProject(dp)
    setDrawerStage(dp.stage)
    setDrawerDesignerId(dp.designer_id || '')
    setDrawerClientName(dp.client_name)
    setDrawerDesignType(dp.design_type)
    setDrawerDescription(dp.description || '')
    setDrawerDeadline(dp.deadline || '')
    setChatMessages([])
    setChatInput('')
    loadChat(dp.id)
  }

  function closeDrawer() {
    setSelectedProject(null)
  }

  // Load chat
  async function loadChat(designProjectId: string) {
    const { data } = await supabase
      .from('job_comments')
      .select('id, user_id, message, created_at')
      .eq('channel', `design_${designProjectId}`)
      .order('created_at', { ascending: true })

    if (data) {
      // Enrich with sender names
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

  // Save drawer changes
  async function saveDrawer() {
    if (!selectedProject) return
    setDrawerSaving(true)

    const { error } = await supabase
      .from('design_projects')
      .update({
        stage: drawerStage,
        designer_id: drawerDesignerId || null,
        client_name: drawerClientName.trim(),
        design_type: drawerDesignType,
        description: drawerDescription.trim() || null,
        deadline: drawerDeadline || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedProject.id)

    if (!error) {
      // Update local state
      setProjects(prev => prev.map(p =>
        p.id === selectedProject.id
          ? {
              ...p,
              stage: drawerStage,
              designer_id: drawerDesignerId || null,
              client_name: drawerClientName.trim(),
              design_type: drawerDesignType,
              description: drawerDescription.trim() || null,
              deadline: drawerDeadline || null,
              designer: drawerDesignerId ? team.find(t => t.id === drawerDesignerId) ? { id: drawerDesignerId, name: team.find(t => t.id === drawerDesignerId)!.name } : p.designer : null,
            }
          : p
      ))
      closeDrawer()
    }

    setDrawerSaving(false)
  }

  const isOverdue = (dp: DesignProject) =>
    dp.deadline && new Date(dp.deadline) < new Date() && dp.stage !== 'approved'

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
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
            {projects.length} project{projects.length !== 1 ? 's' : ''} total
          </p>
        </div>
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
          New Design Project
        </button>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#5a6080', fontSize: 14 }}>Loading design projects...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {STAGES.map(stage => {
            const stageProjects = columnData[stage.key]
            return (
              <div key={stage.key} style={{ display: 'flex', flexDirection: 'column' }}>
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
                  <span style={{ fontSize: 13, fontWeight: 700, color: stage.color }}>{stage.label}</span>
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
                      No projects
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
                          transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${stage.color}40` }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1a1d27' }}
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
                          {dp.designer && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#9299b5' }}>
                              <User size={10} /> {dp.designer.name}
                            </span>
                          )}
                          {dp.project && (
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

      {/* ═══════════════ NEW PROJECT MODAL ═══════════════ */}
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
                New Design Project
              </h2>
              <button onClick={() => { setShowModal(false); resetForm() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080' }}>
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Client Name */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Client Name *</label>
                <input type="text" placeholder="Enter client name" value={formClientName} onChange={e => setFormClientName(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none' }} autoFocus />
              </div>

              {/* Design Type */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Design Type</label>
                <select value={formDesignType} onChange={e => setFormDesignType(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none' }}>
                  {DESIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Description</label>
                <textarea placeholder="Design brief, brand colors, requests..." value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} style={{ width: '100%', padding: '10px 12px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none', resize: 'vertical' }} />
              </div>

              {/* Deadline + Designer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Deadline</label>
                  <input type="date" value={formDeadline} onChange={e => setFormDeadline(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Designer</label>
                  <select value={formDesignerId} onChange={e => setFormDesignerId(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none' }}>
                    <option value="">Unassigned</option>
                    {team.filter(t => t.role === 'designer' || t.role === 'admin').map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Link to Job */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  Link to Job <span style={{ fontWeight: 400, textTransform: 'none', color: '#5a6080' }}>(optional)</span>
                </label>
                <select value={formProjectId} onChange={e => setFormProjectId(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none' }}>
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
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '12px 20px', borderTop: '1px solid #1a1d27' }}>
              <button onClick={() => { setShowModal(false); resetForm() }} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#9299b5', background: 'transparent', border: '1px solid #1a1d27', borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleCreate} disabled={!formClientName.trim() || formSaving} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 700, color: '#fff', background: '#4f7fff', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: (!formClientName.trim() || formSaving) ? 0.5 : 1 }}>
                {formSaving ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ SLIDE-OUT DRAWER ═══════════════ */}
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
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: 480,
              height: '100%',
              background: '#13151c',
              borderLeft: '1px solid #1a1d27',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1a1d27', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: getStageColor(drawerStage),
                  flexShrink: 0,
                }} />
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#e8eaed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {selectedProject.client_name}
                </h2>
              </div>
              <button onClick={closeDrawer} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080', flexShrink: 0, marginLeft: 8 }}>
                <X size={18} />
              </button>
            </div>

            {/* Stage Selector */}
            <div style={{ padding: '12px 20px', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {STAGES.map(s => {
                  const isActive = drawerStage === s.key
                  return (
                    <button
                      key={s.key}
                      onClick={() => setDrawerStage(s.key)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        padding: '8px 4px',
                        borderRadius: 8,
                        border: `1px solid ${isActive ? `${s.color}40` : '#1a1d27'}`,
                        background: isActive ? `${s.color}10` : 'transparent',
                        color: isActive ? s.color : '#5a6080',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {getStageIcon(s.key, 16)}
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Drawer Content (scrollable) */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 16px' }}>
              {/* Editable Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {/* Client Name */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Client Name</label>
                  <input type="text" value={drawerClientName} onChange={e => setDrawerClientName(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none' }} />
                </div>

                {/* Design Type */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Design Type</label>
                  <select value={drawerDesignType} onChange={e => setDrawerDesignType(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none' }}>
                    {DESIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Description</label>
                  <textarea value={drawerDescription} onChange={e => setDrawerDescription(e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none', resize: 'vertical' }} />
                </div>

                {/* Deadline + Designer */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Deadline</label>
                    <input type="date" value={drawerDeadline} onChange={e => setDrawerDeadline(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Designer</label>
                    <select value={drawerDesignerId} onChange={e => setDrawerDesignerId(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none' }}>
                      <option value="">Unassigned</option>
                      {team.filter(t => t.role === 'designer' || t.role === 'admin').map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Linked job info */}
                {selectedProject.project ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4f7fff' }}>
                    <LinkIcon size={12} />
                    Linked to: {selectedProject.project.title}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#f59e0b', background: 'rgba(245,158,11,0.08)', padding: '8px 10px', borderRadius: 8 }}>
                    <AlertTriangle size={14} />
                    No job linked -- sales should review and send quote
                  </div>
                )}
              </div>

              {/* Chat Section */}
              <div style={{ borderTop: '1px solid #1a1d27', paddingTop: 16, marginBottom: 16 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#5a6080',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontFamily: 'Barlow Condensed, sans-serif',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <MessageCircle size={14} style={{ color: '#4f7fff' }} />
                  Comments
                </div>

                {/* Messages */}
                <div style={{ maxHeight: 250, overflow: 'auto', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {chatMessages.length === 0 && (
                    <div style={{ fontSize: 12, color: '#5a6080', textAlign: 'center', padding: '16px 0' }}>
                      No comments yet.
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
                          padding: '8px 10px',
                          borderRadius: 10,
                          background: isMine ? 'rgba(79,127,255,0.15)' : '#1a1d27',
                          border: `1px solid ${isMine ? 'rgba(79,127,255,0.3)' : '#1a1d27'}`,
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: isMine ? '#4f7fff' : '#9299b5', marginBottom: 2 }}>
                            {msg.sender_name}
                          </div>
                          <div style={{ fontSize: 12, color: '#e8eaed', lineHeight: 1.5 }}>{msg.message}</div>
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
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) sendChat() }}
                    placeholder="Type a comment..."
                    style={{
                      flex: 1,
                      padding: '8px 10px',
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
                      padding: '8px 12px',
                      background: '#4f7fff',
                      color: '#fff',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      opacity: (chatSending || !chatInput.trim()) ? 0.4 : 1,
                    }}
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>

              {/* File uploads placeholder */}
              <div style={{ borderTop: '1px solid #1a1d27', paddingTop: 16, marginBottom: 16 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#5a6080',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontFamily: 'Barlow Condensed, sans-serif',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <Upload size={14} style={{ color: '#22d3ee' }} />
                  Files
                </div>
                <div style={{
                  border: '2px dashed #1a1d27',
                  borderRadius: 10,
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#5a6080',
                  fontSize: 12,
                }}>
                  <Upload size={20} style={{ margin: '0 auto 8px', display: 'block', color: '#5a6080' }} />
                  Drop files here or click to upload
                </div>
              </div>

              {/* Timestamps */}
              <div style={{ fontSize: 11, color: '#5a6080', borderTop: '1px solid #1a1d27', paddingTop: 12 }}>
                <div>Created: {new Date(selectedProject.created_at).toLocaleString()}</div>
                <div>Updated: {new Date(selectedProject.updated_at).toLocaleString()}</div>
              </div>
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
                  padding: '10px 20px',
                  background: '#22c07a',
                  color: '#0d1a10',
                  fontSize: 14,
                  fontWeight: 700,
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Palette size={16} />
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
                  padding: '10px 20px',
                  background: '#4f7fff',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  opacity: drawerSaving ? 0.6 : 1,
                }}
              >
                <Save size={16} />
                {drawerSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
