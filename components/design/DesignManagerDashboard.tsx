'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, DesignBriefData, DesignQualityChecklist, DesignRevision } from '@/types'
import {
  LayoutGrid, List, Users, BarChart2, Plus, X,
  AlertTriangle, Clock, CheckCircle, Send, Palette, Flag,
  Calendar, Zap, ArrowRight, Edit3, Save, RotateCcw,
  ShieldCheck, FileText, Timer, DollarSign, AlertCircle, ArrowLeft,
  Search, ExternalLink, Hash, Loader2,
  TrendingUp, Target, PauseCircle,
} from 'lucide-react'

// ─── Local Types ────────────────────────────────────────────────────────────

type DStatus = 'brief' | 'in_progress' | 'review_needed' | 'revision' | 'approved' | 'sent_to_client'
type Priority = 'low' | 'normal' | 'high' | 'urgent'
type ViewMode = 'kanban' | 'queue' | 'designers' | 'metrics'
type PanelTab = 'brief' | 'checklist' | 'revisions' | 'actions'

interface DProject {
  id: string
  org_id: string
  title: string | null
  client_name: string
  design_type: string
  description: string | null
  status: DStatus
  deadline: string | null
  designer_id: string | null
  priority: Priority
  brief_data: DesignBriefData
  quality_checklist: DesignQualityChecklist
  revision_count: number
  revision_limit: number
  hold_reason: string | null
  escalated: boolean
  rush_fee: number
  project_id: string | null
  design_started_at: string | null
  created_at: string
  updated_at: string
  designer?: { id: string; name: string } | null
}

interface Designer {
  id: string
  name: string
  role: string
  design_capacity: number
  design_specialties: string[]
  active_count: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COLUMNS: { key: DStatus; label: string; accent: string }[] = [
  { key: 'brief',         label: 'Brief',           accent: 'var(--text3)' },
  { key: 'in_progress',   label: 'In Design',        accent: 'var(--accent)' },
  { key: 'review_needed', label: 'Review Needed',    accent: 'var(--amber)' },
  { key: 'revision',      label: 'Revision',         accent: 'var(--red)' },
  { key: 'approved',      label: 'Approved',         accent: 'var(--green)' },
  { key: 'sent_to_client',label: 'Sent to Client',  accent: 'var(--purple)' },
]

const PRIORITY_CFG: Record<Priority, { label: string; color: string }> = {
  low:    { label: 'Low',    color: 'var(--text3)' },
  normal: { label: 'Normal', color: 'var(--accent)' },
  high:   { label: 'High',   color: 'var(--amber)' },
  urgent: { label: 'Urgent', color: 'var(--red)' },
}

const SPECIALTIES = [
  'vehicles', 'logos', 'trade_show', 'fleet', 'color_change',
  'marine', 'signage', 'decals', 'murals', 'ppf',
]

const DEFAULT_CHECKLIST: DesignQualityChecklist = {
  bleed_respected: false, safe_zone_respected: false, spell_checked: false,
  logo_vector: false, colors_match_brand: false, contact_info_verified: false,
  resolution_ok: false, color_mode_cmyk: false, proof_looks_correct: false,
}

const CHECKLIST_ITEMS: { key: keyof DesignQualityChecklist; label: string }[] = [
  { key: 'bleed_respected',       label: 'Bleed lines respected' },
  { key: 'safe_zone_respected',   label: 'Safe zone respected' },
  { key: 'spell_checked',         label: 'All text spell-checked' },
  { key: 'logo_vector',           label: 'Logo provided in vector format' },
  { key: 'colors_match_brand',    label: 'Colors match brand guidelines' },
  { key: 'contact_info_verified', label: 'Phone / website / address verified correct' },
  { key: 'resolution_ok',         label: 'Resolution ≥ 150 dpi at print size' },
  { key: 'color_mode_cmyk',       label: 'File saved in CMYK color mode' },
  { key: 'proof_looks_correct',   label: 'Proof generated and looks correct' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeStatus(s: string): DStatus {
  if (s === 'proof_sent') return 'sent_to_client'
  return s as DStatus
}

function deadlineColor(deadline: string | null): string {
  if (!deadline) return 'var(--text3)'
  const diff = (new Date(deadline).getTime() - Date.now()) / 86400000
  if (diff < 0) return 'var(--red)'
  if (diff < 3) return 'var(--amber)'
  return 'var(--green)'
}

function daysLabel(deadline: string | null): string {
  if (!deadline) return ''
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Due today'
  return `${diff}d left`
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DesignManagerDashboard({ profile }: { profile: Profile }) {
  const router = useRouter()
  const supabase = createClient()
  const isManager = ['owner', 'admin', 'production'].includes(profile.role)

  // ── Data state ─────────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<DProject[]>([])
  const [designers, setDesigners] = useState<Designer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // ── View state ─────────────────────────────────────────────────────────────
  const [view, setView] = useState<ViewMode>('kanban')
  const [selected, setSelected] = useState<DProject | null>(null)
  const [panelTab, setPanelTab] = useState<PanelTab>('brief')

  // ── Panel state ────────────────────────────────────────────────────────────
  const [revisions, setRevisions] = useState<DesignRevision[]>([])
  const [briefForm, setBriefForm] = useState<DesignBriefData>({})
  const [checklist, setChecklist] = useState<DesignQualityChecklist>(DEFAULT_CHECKLIST)
  const [saving, setSaving] = useState(false)
  const [revNotes, setRevNotes] = useState('')
  const [revChanged, setRevChanged] = useState('')
  const [revTime, setRevTime] = useState(0)
  const [addingRev, setAddingRev] = useState(false)
  const [holdReason, setHoldReason] = useState('')
  const [rushFee, setRushFee] = useState(0)
  const [overrideDeadline, setOverrideDeadline] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)

  // New project form
  const [newClient, setNewClient] = useState('')
  const [newType, setNewType] = useState('full_wrap')
  const [newPriority, setNewPriority] = useState<Priority>('normal')
  const [newDeadline, setNewDeadline] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [showNewDescription, setShowNewDescription] = useState(false)
  const [creatingNew, setCreatingNew] = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)

    const [{ data: projs }, { data: dsgns }] = await Promise.all([
      supabase
        .from('design_projects')
        .select('*, designer:designer_id(id, name)')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, name, role, design_capacity, design_specialties')
        .eq('org_id', profile.org_id)
        .in('role', ['designer', 'owner', 'admin']),
    ])

    const normalized = (projs || []).map(p => ({
      ...p,
      status: normalizeStatus(p.status),
      brief_data: p.brief_data || {},
      quality_checklist: p.quality_checklist || DEFAULT_CHECKLIST,
      revision_count: p.revision_count || 0,
      revision_limit: p.revision_limit ?? 3,
      escalated: p.escalated || false,
      rush_fee: p.rush_fee || 0,
      priority: (p.priority || 'normal') as Priority,
    })) as DProject[]

    setProjects(normalized)

    if (dsgns) {
      const activeCounts: Record<string, number> = {}
      normalized.forEach(p => {
        if (p.designer_id && !['approved', 'sent_to_client'].includes(p.status)) {
          activeCounts[p.designer_id] = (activeCounts[p.designer_id] || 0) + 1
        }
      })
      setDesigners(dsgns.map(d => ({
        ...d,
        design_capacity: d.design_capacity || 5,
        design_specialties: d.design_specialties || [],
        active_count: activeCounts[d.id] || 0,
      })))
    }

    setLoading(false)
  }, [profile.org_id])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Open panel ────────────────────────────────────────────────────────────
  const openPanel = async (p: DProject) => {
    setSelected(p)
    setBriefForm(p.brief_data || {})
    setChecklist(p.quality_checklist || DEFAULT_CHECKLIST)
    setHoldReason(p.hold_reason || '')
    setRushFee(p.rush_fee || 0)
    setOverrideDeadline(p.deadline ? p.deadline.split('T')[0] : '')
    setPanelTab('brief')

    const { data } = await supabase
      .from('design_revisions')
      .select('*, requester:requested_by(id, name)')
      .eq('design_project_id', p.id)
      .order('round', { ascending: false })
    setRevisions((data || []) as DesignRevision[])
  }

  // ── Update project ─────────────────────────────────────────────────────────
  const updateProject = useCallback(async (id: string, updates: Record<string, unknown>) => {
    setSaving(true)
    const { data, error } = await supabase
      .from('design_projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, designer:designer_id(id, name)')
      .single()

    if (!error && data) {
      const updated = {
        ...data,
        status: normalizeStatus(data.status),
        brief_data: data.brief_data || {},
        quality_checklist: data.quality_checklist || DEFAULT_CHECKLIST,
        revision_count: data.revision_count || 0,
        revision_limit: data.revision_limit ?? 3,
        escalated: data.escalated || false,
        rush_fee: data.rush_fee || 0,
        priority: (data.priority || 'normal') as Priority,
      } as DProject
      setProjects(prev => prev.map(p => p.id === id ? updated : p))
      if (selected?.id === id) setSelected(updated)
    }
    setSaving(false)
    return !error
  }, [selected])

  // ── Actions ───────────────────────────────────────────────────────────────
  const saveBrief = () => updateProject(selected!.id, { brief_data: briefForm })
  const saveChecklist = () => updateProject(selected!.id, { quality_checklist: checklist })

  const moveStatus = async (p: DProject, status: DStatus) => {
    const extra: Record<string, unknown> = {}
    if (status === 'in_progress' && !p.design_started_at) extra.design_started_at = new Date().toISOString()
    if (status === 'sent_to_client') extra.proof_sent_at = new Date().toISOString()
    if (status === 'approved') extra.approved_at = new Date().toISOString()
    await updateProject(p.id, { status, ...extra })
  }

  const addRevision = async () => {
    if (!selected) return
    setAddingRev(true)
    const nextRound = (revisions[0]?.round || 0) + 1
    const { data } = await supabase
      .from('design_revisions')
      .insert({
        org_id: profile.org_id,
        design_project_id: selected.id,
        round: nextRound,
        notes: revNotes || null,
        what_changed: revChanged || null,
        time_spent_minutes: revTime || 0,
        requested_by: profile.id,
      })
      .select('*, requester:requested_by(id, name)')
      .single()

    if (data) {
      setRevisions(prev => [data as DesignRevision, ...prev])
      await updateProject(selected.id, { revision_count: nextRound, status: 'revision' })
      setRevNotes(''); setRevChanged(''); setRevTime(0)
    }
    setAddingRev(false)
  }

  const autoAssign = async (projectId: string) => {
    const eligible = designers
      .filter(d => d.active_count < d.design_capacity && d.role === 'designer')
      .sort((a, b) => a.active_count - b.active_count)
    if (eligible.length > 0) {
      await updateProject(projectId, { designer_id: eligible[0].id })
    }
  }

  const createProject = async () => {
    if (!newClient.trim()) return
    setCreatingNew(true)
    const { data } = await supabase
      .from('design_projects')
      .insert({
        org_id: profile.org_id,
        client_name: newClient.trim(),
        design_type: newType,
        description: newDescription || null,
        deadline: newDeadline || null,
        status: 'brief',
        priority: newPriority,
        designer_id: profile.role === 'designer' ? profile.id : null,
        created_by: profile.id,
        revision_limit: 3,
        revision_count: 0,
        brief_data: {},
        quality_checklist: DEFAULT_CHECKLIST,
      })
      .select('*, designer:designer_id(id, name)')
      .single()
    if (data) {
      const p = {
        ...data,
        status: normalizeStatus(data.status),
        brief_data: data.brief_data || {},
        quality_checklist: data.quality_checklist || DEFAULT_CHECKLIST,
        revision_count: 0, revision_limit: 3,
        escalated: false, rush_fee: 0, priority: newPriority,
      } as DProject
      setProjects(prev => [p, ...prev])
      setShowNewProject(false)
      setNewClient(''); setNewType('full_wrap'); setNewPriority('normal'); setNewDeadline(''); setNewDescription('')
    }
    setCreatingNew(false)
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search) return projects
    const q = search.toLowerCase()
    return projects.filter(p =>
      p.client_name.toLowerCase().includes(q) ||
      p.design_type.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    )
  }, [projects, search])

  const columnData = useMemo(() => {
    const result = {} as Record<DStatus, DProject[]>
    COLUMNS.forEach(c => { result[c.key] = [] })
    filtered.forEach(p => { if (result[p.status]) result[p.status].push(p) })
    return result
  }, [filtered])

  const stats = useMemo(() => {
    const now = Date.now()
    const weekAgo = now - 7 * 86400000
    return {
      active: projects.filter(p => !['approved', 'sent_to_client'].includes(p.status)).length,
      reviewWaiting: projects.filter(p => p.status === 'review_needed').length,
      overdue: projects.filter(p =>
        p.deadline && new Date(p.deadline).getTime() < now &&
        !['approved', 'sent_to_client'].includes(p.status)
      ).length,
      completedWeek: projects.filter(p =>
        ['approved', 'sent_to_client'].includes(p.status) &&
        new Date(p.updated_at).getTime() > weekAgo
      ).length,
    }
  }, [projects])

  const metrics = useMemo(() => {
    const done = projects.filter(p => ['approved', 'sent_to_client'].includes(p.status))
    const now = new Date()
    const avgRev = done.length > 0
      ? (done.reduce((s, p) => s + p.revision_count, 0) / done.length).toFixed(1)
      : '0.0'
    const thisMonth = projects.filter(p => {
      const d = new Date(p.updated_at)
      return ['approved', 'sent_to_client'].includes(p.status) &&
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    const byDesigner = designers.map(d => ({
      ...d,
      completed: done.filter(p => p.designer_id === d.id).length,
      avgRev: done.filter(p => p.designer_id === d.id).length > 0
        ? (done.filter(p => p.designer_id === d.id).reduce((s, p) => s + p.revision_count, 0) /
           done.filter(p => p.designer_id === d.id).length).toFixed(1)
        : '0.0',
    }))
    return { avgRev, thisMonth, totalDone: done.length, byDesigner }
  }, [projects, designers])

  const checklistDoneCount = Object.values(checklist).filter(Boolean).length
  const checklistAllDone = checklistDoneCount === CHECKLIST_ITEMS.length

  // ── Styles ────────────────────────────────────────────────────────────────
  const S = {
    container: { display: 'flex', flexDirection: 'column' as const, gap: 16 },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' as const },
    statCard: {
      background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 10, padding: '12px 16px', flex: '1 1 120px', minWidth: 110,
    },
    viewBtn: (active: boolean) => ({
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
      borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
      background: active ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
      color: active ? '#fff' : 'var(--text2)',
      transition: 'all 0.15s',
    }),
    kanbanCol: (accent: string) => ({
      flex: '0 0 220px', display: 'flex', flexDirection: 'column' as const,
      borderTop: `2px solid ${accent}`, paddingTop: 8,
    }),
    card: {
      background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
      transition: 'border-color 0.15s, transform 0.1s',
    },
    badge: (color: string) => ({
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700,
      color, border: `1px solid ${color}30`, background: `${color}15`,
    }),
    field: {
      width: '100%', padding: '8px 10px', borderRadius: 7, fontSize: 13,
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
      color: 'var(--text1)', outline: 'none', boxSizing: 'border-box' as const,
    },
    btn: (variant: 'primary' | 'ghost' | 'danger' | 'amber' | 'green' | 'purple') => {
      const colors = {
        primary: { bg: 'var(--accent)', color: '#fff' },
        ghost: { bg: 'rgba(255,255,255,0.06)', color: 'var(--text2)' },
        danger: { bg: 'rgba(242,90,90,0.15)', color: 'var(--red)' },
        amber: { bg: 'rgba(245,158,11,0.15)', color: 'var(--amber)' },
        green: { bg: 'rgba(34,192,122,0.15)', color: 'var(--green)' },
        purple: { bg: 'rgba(139,92,246,0.15)', color: 'var(--purple)' },
      }
      return {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: 600, ...colors[variant], transition: 'opacity 0.15s',
      }
    },
  }

  // ── Kanban Card ───────────────────────────────────────────────────────────
  const KanbanCard = ({ p }: { p: DProject }) => {
    const pc = PRIORITY_CFG[p.priority]
    const dc = deadlineColor(p.deadline)
    const dl = daysLabel(p.deadline)
    const isOverLimit = p.revision_count > p.revision_limit
    return (
      <div
        style={S.card}
        onClick={() => openPanel(p)}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(79,127,255,0.4)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)' }}
      >
        {/* Priority + escalated */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={S.badge(pc.color)}>{pc.label}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {p.escalated && <AlertCircle size={13} color="var(--red)" />}
            {p.rush_fee > 0 && <Zap size={13} color="var(--amber)" />}
          </div>
        </div>

        {/* Client name */}
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 2, lineHeight: 1.3 }}>
          {p.client_name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
          {p.design_type.replace(/_/g, ' ')}
        </div>

        {/* Deadline */}
        {p.deadline && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
            <Calendar size={11} color={dc} />
            <span style={{ fontSize: 11, color: dc, fontWeight: 600 }}>{dl}</span>
          </div>
        )}

        {/* Designer + revisions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700,
            }}>
              {p.designer?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              {p.designer?.name || 'Unassigned'}
            </span>
          </div>
          {p.revision_count > 0 && (
            <span style={S.badge(isOverLimit ? 'var(--red)' : 'var(--text3)')}>
              <RotateCcw size={9} /> Rev {p.revision_count}
            </span>
          )}
        </div>
      </div>
    )
  }

  // ── Kanban View ───────────────────────────────────────────────────────────
  const KanbanView = () => (
    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
      {COLUMNS.map(col => (
        <div key={col.key} style={S.kanbanCol(col.accent)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: col.accent }}>{col.label}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text3)',
              background: 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 20,
            }}>
              {columnData[col.key]?.length || 0}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            {(columnData[col.key] || []).map(p => (
              <div key={p.id} style={{ marginBottom: 8 }}>{KanbanCard({ p })}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  // ── Queue View ────────────────────────────────────────────────────────────
  const QueueView = () => {
    const reviewProjects = filtered.filter(p => p.status === 'review_needed')
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>
          {reviewProjects.length} project{reviewProjects.length !== 1 ? 's' : ''} waiting for review
        </div>
        {reviewProjects.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
            <CheckCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <div>No projects awaiting review</div>
          </div>
        )}
        {reviewProjects.map(p => {
          const pc = PRIORITY_CFG[p.priority]
          return (
            <div
              key={p.id}
              onClick={() => openPanel(p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px',
                background: 'var(--surface)', border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 10, cursor: 'pointer', transition: 'border-color 0.15s',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{p.client_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{p.design_type.replace(/_/g, ' ')}</div>
              </div>
              <span style={S.badge(pc.color)}>{pc.label}</span>
              <div style={{ fontSize: 12, color: deadlineColor(p.deadline) }}>
                {daysLabel(p.deadline) || 'No deadline'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {p.designer?.name || 'Unassigned'}
              </div>
              <span style={S.badge('var(--amber)')}>Rev {p.revision_count}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={e => { e.stopPropagation(); moveStatus(p, 'approved') }}
                  style={S.btn('green')}
                >
                  <CheckCircle size={13} /> Approve
                </button>
                <button
                  onClick={e => { e.stopPropagation(); openPanel(p) }}
                  style={S.btn('amber')}
                >
                  <RotateCcw size={13} /> Revise
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Designer Workload View ─────────────────────────────────────────────────
  const DesignerView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {designers.map(d => {
        const pct = Math.min(100, Math.round(d.active_count / d.design_capacity * 100))
        const barColor = pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--amber)' : 'var(--green)'
        const designerProjects = filtered.filter(p =>
          p.designer_id === d.id && !['approved', 'sent_to_client'].includes(p.status)
        )
        return (
          <div key={d.id} style={{
            background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, color: '#fff', fontWeight: 700, flexShrink: 0,
              }}>
                {d.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'capitalize' }}>{d.role}</div>
              </div>
              <span style={S.badge(barColor)}>{d.active_count}/{d.design_capacity}</span>
            </div>

            {/* Capacity bar */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>
                Capacity: {pct}%
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.3s' }} />
              </div>
            </div>

            {/* Specialties */}
            {d.design_specialties.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {d.design_specialties.map(s => (
                  <span key={s} style={{
                    padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                    background: 'rgba(79,127,255,0.1)', color: 'var(--accent)',
                    border: '1px solid rgba(79,127,255,0.2)',
                  }}>
                    {s.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}

            {/* Active projects */}
            {designerProjects.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Active</div>
                {designerProjects.slice(0, 3).map(p => (
                  <div
                    key={p.id}
                    onClick={() => openPanel(p)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }}
                  >
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: COLUMNS.find(c => c.key === p.status)?.accent || 'var(--text3)',
                    }} />
                    <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.client_name}
                    </span>
                    {p.deadline && (
                      <span style={{ fontSize: 11, color: deadlineColor(p.deadline), flexShrink: 0 }}>
                        {daysLabel(p.deadline)}
                      </span>
                    )}
                  </div>
                ))}
                {designerProjects.length > 3 && (
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>+{designerProjects.length - 3} more</div>
                )}
              </div>
            )}

            {/* Edit capacity */}
            {isManager && (
              <button
                onClick={async () => {
                  const cap = prompt('Set max jobs capacity:', String(d.design_capacity))
                  if (cap && !isNaN(Number(cap))) {
                    await supabase.from('profiles').update({ design_capacity: Number(cap) }).eq('id', d.id)
                    setDesigners(prev => prev.map(dd => dd.id === d.id ? { ...dd, design_capacity: Number(cap) } : dd))
                  }
                }}
                style={{ ...S.btn('ghost'), fontSize: 11, marginTop: 10, padding: '4px 10px' }}
              >
                <Edit3 size={11} /> Set Capacity
              </button>
            )}
          </div>
        )
      })}
    </div>
  )

  // ── Metrics View ──────────────────────────────────────────────────────────
  const MetricsView = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Avg Revision Rounds', value: metrics.avgRev, icon: <RotateCcw size={16} color="var(--amber)" />, color: 'var(--amber)' },
          { label: 'Total Completed', value: metrics.totalDone, icon: <CheckCircle size={16} color="var(--green)" />, color: 'var(--green)' },
          { label: 'Completed This Month', value: metrics.thisMonth, icon: <TrendingUp size={16} color="var(--accent)" />, color: 'var(--accent)' },
          { label: 'Waiting Review', value: stats.reviewWaiting, icon: <Clock size={16} color="var(--purple)" />, color: 'var(--purple)' },
          { label: 'Overdue', value: stats.overdue, icon: <AlertTriangle size={16} color="var(--red)" />, color: 'var(--red)' },
          { label: 'Completed This Week', value: stats.completedWeek, icon: <Target size={16} color="var(--cyan)" />, color: 'var(--cyan)' },
        ].map(m => (
          <div key={m.label} style={{ ...S.statCard, borderLeft: `3px solid ${m.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>{m.icon}<span style={{ fontSize: 11, color: 'var(--text3)' }}>{m.label}</span></div>
            <div style={{ fontSize: 26, fontWeight: 800, color: m.color, fontFamily: 'JetBrains Mono, monospace' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Per-designer table */}
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
          Designer Performance
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
              {['Designer', 'Active', 'Completed', 'Avg Revisions', 'Capacity'].map(h => (
                <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.byDesigner.map(d => (
              <tr key={d.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>
                      {d.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text1)' }}>{d.name}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text2)' }}>{d.active_count}</td>
                <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--green)' }}>{d.completed}</td>
                <td style={{ padding: '10px 16px', fontSize: 13, color: Number(d.avgRev) > 3 ? 'var(--red)' : 'var(--text2)' }}>{d.avgRev}</td>
                <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text2)' }}>{d.active_count}/{d.design_capacity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  // ── Right Panel ───────────────────────────────────────────────────────────
  const Panel = () => {
    if (!selected) return null
    const col = COLUMNS.find(c => c.key === selected.status)
    const isOverLimit = selected.revision_count > selected.revision_limit

    return (
      <>
        {/* Backdrop */}
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }}
        />

        {/* Panel */}
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 560,
          background: 'var(--surface)', borderLeft: '1px solid rgba(255,255,255,0.08)',
          zIndex: 101, display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}>
          {/* Panel header */}
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected.client_name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={S.badge(col?.accent || 'var(--text3)')}>{col?.label}</span>
                <span style={S.badge(PRIORITY_CFG[selected.priority].color)}>{PRIORITY_CFG[selected.priority].label}</span>
                {selected.escalated && <span style={S.badge('var(--red)')}><AlertCircle size={9} /> Escalated</span>}
                {selected.hold_reason && <span style={S.badge('var(--text3)')}><PauseCircle size={9} /> On Hold</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {selected.project_id && (
                <button onClick={() => router.push(`/projects/${selected.project_id}`)} style={S.btn('ghost')}>
                  <ExternalLink size={13} /> Job
                </button>
              )}
              <button onClick={() => router.push(`/design/${selected.id}`)} style={S.btn('ghost')}>
                <Palette size={13} /> Canvas
              </button>
              <button onClick={() => setSelected(null)} style={{ ...S.btn('ghost'), padding: '7px' }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Panel tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
            {([
              { key: 'brief', label: 'Brief', icon: <FileText size={13} /> },
              { key: 'checklist', label: 'Checklist', icon: <ShieldCheck size={13} /> },
              { key: 'revisions', label: `Revisions (${selected.revision_count})`, icon: <RotateCcw size={13} /> },
              { key: 'actions', label: 'Actions', icon: <Zap size={13} /> },
            ] as { key: PanelTab; label: string; icon: React.ReactNode }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setPanelTab(tab.key)}
                style={{
                  flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  background: 'transparent',
                  color: panelTab === tab.key ? 'var(--accent)' : 'var(--text3)',
                  borderBottom: panelTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'color 0.15s',
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Panel body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

            {/* ── BRIEF TAB ─────────────────────────────────────────────── */}
            {panelTab === 'brief' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: -4 }}>
                  Fill in the design brief. Auto-populates from customer intake.
                </div>

                {[
                  { label: 'Vehicle / Product Type', key: 'vehicle_type', placeholder: 'e.g. Cargo Van, Box Truck, Trailer' },
                  { label: 'Dimensions', key: 'dimensions', placeholder: 'e.g. 192" L × 75" H' },
                  { label: 'Font Preferences', key: 'font_preferences', placeholder: 'e.g. Barlow Condensed for headers' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>{label}</label>
                    <input
                      style={S.field}
                      placeholder={placeholder}
                      value={(briefForm as Record<string, string>)[key] || ''}
                      onChange={e => setBriefForm(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                ))}

                {/* Brand Colors */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Brand Colors</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(briefForm.brand_colors || []).map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '4px 8px' }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, background: c, border: '1px solid rgba(255,255,255,0.2)' }} />
                        <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>{c}</span>
                        <button onClick={() => setBriefForm(prev => ({ ...prev, brand_colors: prev.brand_colors?.filter((_, ii) => ii !== i) }))} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 0 }}><X size={11} /></button>
                      </div>
                    ))}
                    <input
                      type="color"
                      style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', padding: 2 }}
                      onChange={e => setBriefForm(prev => ({ ...prev, brand_colors: [...(prev.brand_colors || []), e.target.value] }))}
                      title="Add brand color"
                    />
                  </div>
                </div>

                {/* Text areas */}
                {[
                  { label: 'Copy / Text to Include', key: 'copy_text', placeholder: 'Exact text: phone, website, tagline, address...' },
                  { label: 'Must Include', key: 'must_include', placeholder: 'Elements that MUST appear in the design...' },
                  { label: 'Must Avoid', key: 'must_avoid', placeholder: "Colors, elements, styles to avoid (competitor colors, etc)..." },
                  { label: 'Special Instructions', key: 'special_instructions', placeholder: 'Any additional notes for the designer...' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>{label}</label>
                    <textarea
                      rows={3}
                      style={{ ...S.field, resize: 'vertical' as const }}
                      placeholder={placeholder}
                      value={(briefForm as Record<string, string>)[key] || ''}
                      onChange={e => setBriefForm(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                ))}

                <button onClick={saveBrief} disabled={saving} style={S.btn('primary')}>
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Save Brief
                </button>
              </div>
            )}

            {/* ── CHECKLIST TAB ─────────────────────────────────────────── */}
            {panelTab === 'checklist' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Progress */}
                <div style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>Quality Checklist</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: checklistAllDone ? 'var(--green)' : 'var(--text3)' }}>
                      {checklistDoneCount} / {CHECKLIST_ITEMS.length}
                    </span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${checklistDoneCount / CHECKLIST_ITEMS.length * 100}%`, height: '100%', background: checklistAllDone ? 'var(--green)' : 'var(--accent)', transition: 'width 0.3s' }} />
                  </div>
                </div>

                {!checklistAllDone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, fontSize: 12, color: 'var(--amber)' }}>
                    <AlertTriangle size={13} /> Complete all items before marking "Ready for Review"
                  </div>
                )}

                {checklistAllDone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.25)', borderRadius: 8, fontSize: 12, color: 'var(--green)' }}>
                    <CheckCircle size={13} /> All items complete — ready for review!
                  </div>
                )}

                {CHECKLIST_ITEMS.map(item => (
                  <label
                    key={item.key}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 12px', borderRadius: 8, background: checklist[item.key] ? 'rgba(34,192,122,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${checklist[item.key] ? 'rgba(34,192,122,0.2)' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.15s' }}
                  >
                    <input
                      type="checkbox"
                      checked={checklist[item.key]}
                      onChange={e => setChecklist(prev => ({ ...prev, [item.key]: e.target.checked }))}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--green)' }}
                    />
                    <span style={{ fontSize: 13, color: checklist[item.key] ? 'var(--text1)' : 'var(--text2)' }}>{item.label}</span>
                    {checklist[item.key] && <CheckCircle size={14} color="var(--green)" style={{ marginLeft: 'auto' }} />}
                  </label>
                ))}

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={saveChecklist} disabled={saving} style={S.btn('primary')}>
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
                  </button>
                  {checklistAllDone && selected.status === 'in_progress' && (
                    <button
                      onClick={async () => { await saveChecklist(); await moveStatus(selected, 'review_needed') }}
                      style={S.btn('green')}
                    >
                      <Send size={13} /> Mark Ready for Review
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── REVISIONS TAB ─────────────────────────────────────────── */}
            {panelTab === 'revisions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Limit warning */}
                {isOverLimit && (
                  <div style={{ padding: '12px 16px', background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)', borderRadius: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={14} /> Revision Limit Exceeded
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
                      This job has used {selected.revision_count} of {selected.revision_limit} included revisions.
                    </div>
                    <button style={{ ...S.btn('danger'), fontSize: 12 }}>
                      <DollarSign size={12} /> Upsell: Additional Revision ($75)
                    </button>
                  </div>
                )}

                {/* Add revision (manager only) */}
                {isManager && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 10 }}>Request Revision</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea
                        rows={2}
                        style={{ ...S.field, resize: 'vertical' as const }}
                        placeholder="Revision notes / feedback for designer..."
                        value={revNotes}
                        onChange={e => setRevNotes(e.target.value)}
                      />
                      <textarea
                        rows={2}
                        style={{ ...S.field, resize: 'vertical' as const }}
                        placeholder="What needs to change (specific elements)..."
                        value={revChanged}
                        onChange={e => setRevChanged(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Time Spent (min)</label>
                          <input
                            type="number"
                            style={{ ...S.field, width: 100 }}
                            value={revTime}
                            onChange={e => setRevTime(Number(e.target.value))}
                            min={0}
                          />
                        </div>
                        <button
                          onClick={addRevision}
                          disabled={addingRev || !revNotes}
                          style={{ ...S.btn('amber'), marginTop: 18, opacity: !revNotes ? 0.4 : 1 }}
                        >
                          {addingRev ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                          Request Revision
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Revision history */}
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  History ({revisions.length})
                </div>
                {revisions.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text3)', fontSize: 13 }}>
                    No revisions yet
                  </div>
                )}
                {revisions.map(r => (
                  <div key={r.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={S.badge('var(--amber)')}><Hash size={9} /> Rev {r.round}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmt(r.created_at)}</span>
                      {r.time_spent_minutes > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Timer size={11} /> {r.time_spent_minutes}m
                        </span>
                      )}
                    </div>
                    {r.notes && <div style={{ fontSize: 13, color: 'var(--text1)', marginBottom: 6 }}>{r.notes}</div>}
                    {r.what_changed && (
                      <div style={{ fontSize: 12, color: 'var(--text3)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 6, marginTop: 4 }}>
                        {r.what_changed}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── ACTIONS TAB ───────────────────────────────────────────── */}
            {panelTab === 'actions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Assignment */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                    Designer Assignment
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      style={{ ...S.field, flex: 1 }}
                      value={selected.designer_id || ''}
                      onChange={e => updateProject(selected.id, { designer_id: e.target.value || null })}
                    >
                      <option value="">Unassigned</option>
                      {designers.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.active_count}/{d.design_capacity} active)
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => autoAssign(selected.id)}
                      style={S.btn('primary')}
                      title="Auto-assign based on workload"
                    >
                      <Zap size={13} /> Auto
                    </button>
                  </div>

                  {/* Designer specialties hint */}
                  {selected.designer_id && (
                    (() => {
                      const d = designers.find(dd => dd.id === selected.designer_id)
                      return d?.design_specialties.length ? (
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {d.design_specialties.map(s => (
                            <span key={s} style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: 'rgba(79,127,255,0.1)', color: 'var(--accent)' }}>
                              {s.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      ) : null
                    })()
                  )}
                </div>

                {/* Status controls */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                    Status Control
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button onClick={() => moveStatus(selected, 'in_progress')} style={S.btn('primary')}><Palette size={13} /> Start Design</button>
                    <button onClick={() => moveStatus(selected, 'review_needed')} style={S.btn('amber')} disabled={!checklistAllDone && !isManager}>
                      <Send size={13} /> Ready for Review
                    </button>
                    <button onClick={() => moveStatus(selected, 'approved')} style={S.btn('green')}><CheckCircle size={13} /> Approve</button>
                    <button onClick={() => moveStatus(selected, 'sent_to_client')} style={S.btn('purple')}><Send size={13} /> Send to Client</button>
                    <button
                      onClick={() => router.push(`/projects/${selected.project_id}`)}
                      disabled={!selected.project_id}
                      style={{ ...S.btn('ghost'), opacity: selected.project_id ? 1 : 0.4 }}
                    >
                      <ArrowLeft size={13} /> Send Back to Sales
                    </button>
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Priority</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(['low', 'normal', 'high', 'urgent'] as Priority[]).map(p => (
                      <button
                        key={p}
                        onClick={() => updateProject(selected.id, { priority: p })}
                        style={{
                          ...S.btn('ghost'),
                          borderColor: selected.priority === p ? PRIORITY_CFG[p].color : 'transparent',
                          border: `1px solid ${selected.priority === p ? PRIORITY_CFG[p].color : 'rgba(255,255,255,0.1)'}`,
                          color: selected.priority === p ? PRIORITY_CFG[p].color : 'var(--text3)',
                        }}
                      >
                        {p === 'urgent' && <Flag size={12} />} {PRIORITY_CFG[p].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deadline override */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Override Deadline</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="date"
                      style={{ ...S.field, flex: 1 }}
                      value={overrideDeadline}
                      onChange={e => setOverrideDeadline(e.target.value)}
                    />
                    <button
                      onClick={() => updateProject(selected.id, { deadline: overrideDeadline || null })}
                      style={S.btn('primary')}
                    >
                      <Save size={13} /> Set
                    </button>
                  </div>
                </div>

                {/* Revision limit */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Revision Limit</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="number"
                      style={{ ...S.field, width: 80 }}
                      defaultValue={selected.revision_limit}
                      min={0}
                      max={20}
                      onChange={e => updateProject(selected.id, { revision_limit: Number(e.target.value) })}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                      ({selected.revision_count} used)
                    </span>
                  </div>
                </div>

                {/* Rush fee */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Rush Fee</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 14 }}>$</span>
                      <input
                        type="number"
                        style={{ ...S.field, paddingLeft: 24 }}
                        value={rushFee}
                        onChange={e => setRushFee(Number(e.target.value))}
                        min={0}
                      />
                    </div>
                    <button onClick={() => updateProject(selected.id, { rush_fee: rushFee })} style={S.btn('amber')}>
                      <Zap size={13} /> Apply
                    </button>
                  </div>
                </div>

                {/* Hold */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Put on Hold</div>
                  <textarea
                    rows={2}
                    style={{ ...S.field, marginBottom: 8, resize: 'vertical' as const }}
                    placeholder="Reason for hold..."
                    value={holdReason}
                    onChange={e => setHoldReason(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => updateProject(selected.id, { hold_reason: holdReason })}
                      style={S.btn('ghost')}
                      disabled={!holdReason}
                    >
                      <PauseCircle size={13} /> Hold
                    </button>
                    {selected.hold_reason && (
                      <button onClick={() => { updateProject(selected.id, { hold_reason: null }); setHoldReason('') }} style={S.btn('green')}>
                        <ArrowRight size={13} /> Release Hold
                      </button>
                    )}
                  </div>
                </div>

                {/* Escalate */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Escalation</div>
                  <button
                    onClick={() => updateProject(selected.id, { escalated: !selected.escalated })}
                    style={selected.escalated ? S.btn('danger') : S.btn('ghost')}
                  >
                    <AlertCircle size={13} />
                    {selected.escalated ? 'Remove Escalation' : 'Escalate to Owner'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  // ── New Project Modal ─────────────────────────────────────────────────────
  const NewProjectModal = () => (
    <>
      <div onClick={() => setShowNewProject(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 480, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14, zIndex: 201, overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif' }}>New Design Project</span>
          <button onClick={() => setShowNewProject(false)} style={{ ...S.btn('ghost'), padding: 6 }}><X size={16} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Client Name *</label>
            <input style={S.field} placeholder="e.g. Smith Plumbing" value={newClient} onChange={e => setNewClient(e.target.value)} autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Design Type</label>
              <select style={S.field} value={newType} onChange={e => setNewType(e.target.value)}>
                {[['full_wrap', 'Full Wrap'], ['partial_wrap', 'Partial Wrap'], ['decal', 'Decal / Lettering'], ['livery', 'Fleet Livery'], ['color_change', 'Color Change'], ['other', 'Other']].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Priority</label>
              <select style={S.field} value={newPriority} onChange={e => setNewPriority(e.target.value as Priority)}>
                {(['low', 'normal', 'high', 'urgent'] as Priority[]).map(p => <option key={p} value={p}>{PRIORITY_CFG[p].label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Deadline</label>
            <input type="date" style={S.field} value={newDeadline} onChange={e => setNewDeadline(e.target.value)} />
          </div>
          <div>
            {!showNewDescription ? (
              <button onClick={() => setShowNewDescription(true)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0' }}>
                + Add Description
              </button>
            ) : (
              <>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Description</label>
                <textarea rows={2} style={{ ...S.field, resize: 'vertical' as const }} placeholder="Brief description..." value={newDescription} onChange={e => setNewDescription(e.target.value)} />
              </>
            )}
          </div>
        </div>
        <div style={{ padding: '0 20px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => setShowNewProject(false)} style={S.btn('ghost')}>Cancel</button>
          <button onClick={createProject} disabled={!newClient.trim() || creatingNew} style={{ ...S.btn('primary'), opacity: !newClient.trim() ? 0.4 : 1 }}>
            {creatingNew ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Create
          </button>
        </div>
      </div>
    </>
  )

  // ── Main Render ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 10, color: 'var(--text3)' }}>
        <Loader2 size={20} className="animate-spin" />
        <span>Loading design projects...</span>
      </div>
    )
  }

  return (
    <div style={S.container}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 900, color: 'var(--text1)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Palette size={22} color="var(--accent)" /> Design Manager
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', margin: '2px 0 0' }}>Full pipeline control for design projects</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const }}>
          {/* View switcher */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3 }}>
            {([
              { key: 'kanban', label: 'Kanban', icon: <LayoutGrid size={13} /> },
              { key: 'queue',  label: 'Queue',  icon: <List size={13} /> },
              { key: 'designers', label: 'Designers', icon: <Users size={13} /> },
              { key: 'metrics', label: 'Metrics', icon: <BarChart2 size={13} /> },
            ] as { key: ViewMode; label: string; icon: React.ReactNode }[]).map(v => (
              <button key={v.key} onClick={() => setView(v.key)} style={S.viewBtn(view === v.key)}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowNewProject(true)} style={S.btn('primary')}>
            <Plus size={14} /> New Project
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
        {[
          { label: 'Active', value: stats.active, color: 'var(--accent)', icon: <Palette size={14} /> },
          { label: 'Needs Review', value: stats.reviewWaiting, color: 'var(--amber)', icon: <Clock size={14} /> },
          { label: 'Overdue', value: stats.overdue, color: 'var(--red)', icon: <AlertTriangle size={14} /> },
          { label: 'Done This Week', value: stats.completedWeek, color: 'var(--green)', icon: <CheckCircle size={14} /> },
        ].map(s => (
          <div key={s.label} style={{ ...S.statCard, borderLeft: `3px solid ${s.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ color: s.color }}>{s.icon}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
          </div>
        ))}

        {/* Search */}
        <div style={{ flex: '1 1 200px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            style={{ ...S.field, paddingLeft: 32, height: '100%' }}
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* View */}
      {view === 'kanban' && KanbanView()}
      {view === 'queue' && QueueView()}
      {view === 'designers' && DesignerView()}
      {view === 'metrics' && MetricsView()}

      {/* Panel */}
      {selected && Panel()}

      {/* New project modal */}
      {showNewProject && NewProjectModal()}
    </div>
  )
}
