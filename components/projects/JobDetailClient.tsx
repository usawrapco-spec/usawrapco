'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Edit2, Check, X, ChevronDown,
  User, Calendar, DollarSign, TrendingUp, Percent, Award,
  Building2, Car, Flag, Wrench, UserCheck,
  MessageSquare, Camera, FileImage, History,
  Users, Palette, Receipt, ShoppingCart, CreditCard, FileText, Pencil,
  MoreHorizontal, Copy, Archive, Trash2, Link2, DollarSign as TransactionIcon,
  ChevronRight, Loader2, Truck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Project, PipeStage, ProjectFinancials } from '@/types'
import JobChat from '@/components/chat/JobChat'
import JobPhotosTab from '@/components/projects/JobPhotosTab'
import ProofingPanel from '@/components/projects/ProofingPanel'
import CustomerSearchModal, { type CustomerRow } from '@/components/shared/CustomerSearchModal'

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

interface ConnectedJob {
  id: string
  connection_type: string
  notes: string | null
  created_at: string
  connected: {
    id: string
    title: string
    pipe_stage: string
    vehicle_desc: string | null
    customer?: { name: string; company_name: string | null } | null
  } | null
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

  // Connected jobs
  const [connectedJobs, setConnectedJobs] = useState<ConnectedJob[]>([])

  // Three-dot menu
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Modals
  const [copyModal, setCopyModal] = useState(false)
  const [stageSubmenu, setStageSubmenu] = useState(false)
  const [transactionPanel, setTransactionPanel] = useState(false)
  const [connectModal, setConnectModal] = useState(false)
  const [archiveConfirm, setArchiveConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteText, setDeleteText] = useState('')

  // Copy modal state
  const [copyParts, setCopyParts] = useState({
    customer: true, line_items: true, vehicle_info: true, notes: true,
  })
  const [copying, setCopying] = useState(false)

  // Transaction panel state
  const [txAmount, setTxAmount] = useState('')
  const [txType, setTxType] = useState('payment')
  const [txMethod, setTxMethod] = useState('card')
  const [txNotes, setTxNotes] = useState('')
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10))
  const [txSaving, setTxSaving] = useState(false)
  const [txSuccess, setTxSuccess] = useState(false)

  // Connect modal state
  const [connectSearch, setConnectSearch] = useState('')
  const [connectResults, setConnectResults] = useState<any[]>([])
  const [connectSearching, setConnectSearching] = useState(false)
  const [connectSaving, setConnectSaving] = useState(false)

  // Stage dropdown (close on outside click)
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

  // Three-dot menu (close on outside click)
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // Edit state
  const [editTitle, setEditTitle] = useState(project.title)
  const [editInstallDate, setEditInstallDate] = useState(project.install_date || '')
  const [editDueDate, setEditDueDate] = useState(project.due_date || '')

  const initialCustomer = (project.customer as unknown) as CustomerRow | null | undefined
  const [linkedCustomer, setLinkedCustomer] = useState<CustomerRow | null>(initialCustomer ?? null)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const customer = linkedCustomer
  const stage = STAGE_CONFIG[project.pipe_stage] ?? STAGE_CONFIG.sales_in
  const priority = PRIORITY_CONFIG[project.priority] ?? PRIORITY_CONFIG.normal
  const fd = (project.form_data ?? {}) as Record<string, any>
  const fin = project.fin_data

  const installers = teammates.filter(t => t.role === 'installer')
  const agents = teammates.filter(t => ['sales_agent', 'admin', 'owner'].includes(t.role))
  const designers = teammates.filter(t => ['designer', 'admin', 'owner'].includes(t.role))
  const managers = teammates.filter(t => ['production', 'admin', 'owner'].includes(t.role))

  const [salesRepIds, setSalesRepIds] = useState<string[]>(
    project.agent_id ? [project.agent_id] : []
  )
  const [installerIds, setInstallerIds] = useState<string[]>(
    project.installer_id ? [project.installer_id] : []
  )
  const [designerIds, setDesignerIds] = useState<string[]>(
    project.designer_id ? [project.designer_id] : []
  )
  const [productionMgrIds, setProductionMgrIds] = useState<string[]>(
    project.production_manager_id ? [project.production_manager_id] : []
  )
  const [vehicleYear, setVehicleYear] = useState<string>((fd.vehicle_year as string) || '')
  const [vehicleMake, setVehicleMake] = useState<string>((fd.vehicle_make as string) || '')
  const [vehicleModel, setVehicleModel] = useState<string>((fd.vehicle_model as string) || '')
  const [vehicleVin, setVehicleVin] = useState<string>((fd.vehicle_vin as string) || '')
  const [vehicleColor, setVehicleColor] = useState<string>(project.vehicle_color || (fd.vehicleColor as string) || '')

  const [relatedDocs, setRelatedDocs] = useState({ estimates: 0, salesOrders: 0, invoices: 0, payments: 0 })

  useEffect(() => {
    const pid = project.id
    Promise.all([
      supabase.from('estimates').select('id', { count: 'exact', head: true }).eq('project_id', pid),
      supabase.from('sales_orders').select('id', { count: 'exact', head: true }).eq('project_id', pid),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('project_id', pid),
      supabase.from('payments').select('id, invoice:invoice_id!inner(project_id)', { count: 'exact', head: true }).eq('invoice.project_id', pid),
    ]).then(([e, s, i, p]) => {
      setRelatedDocs({
        estimates: e.count ?? 0,
        salesOrders: s.count ?? 0,
        invoices: i.count ?? 0,
        payments: p.count ?? 0,
      })
    })
  }, [project.id])

  // Load connected jobs
  const loadConnectedJobs = useCallback(async () => {
    const res = await fetch(`/api/jobs/${project.id}/connections`)
    if (res.ok) {
      const { connections } = await res.json()
      setConnectedJobs(connections || [])
    }
  }, [project.id])

  useEffect(() => { loadConnectedJobs() }, [loadConnectedJobs])

  const fmt$ = (v: number | null | undefined) =>
    v != null ? `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'
  const fmtPct = (v: number | null | undefined) =>
    v != null ? `${v.toFixed(1)}%` : '—'
  const fmtDate = (d: string | null | undefined) => {
    if (!d) return '—'
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
      .from('projects').update(updates).eq('id', project.id).select().single()
    if (!error && data) {
      setProject(p => ({ ...p, ...updates }))
      setEditing(false)
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
    const { error } = await supabase.from('projects').update({ [field]: value }).eq('id', project.id)
    if (!error) {
      if (field === 'installer_id') {
        const mate = teammates.find(t => t.id === value)
        setProject(p => ({ ...p, installer_id: value, installer: mate ? { id: mate.id, name: mate.name, email: '' } : undefined }))
      } else if (field === 'agent_id') {
        const mate = teammates.find(t => t.id === value)
        setProject(p => ({ ...p, agent_id: value, agent: mate ? { id: mate.id, name: mate.name, email: '' } : undefined }))
      } else if (field === 'designer_id') {
        setProject(p => ({ ...p, designer_id: value as string | null }))
      } else if (field === 'production_manager_id') {
        setProject(p => ({ ...p, production_manager_id: value as string | null }))
      } else {
        setProject(p => ({ ...p, [field]: value }))
      }
    } else {
      setFieldError(`Failed to update ${field.replace('_', ' ')}`)
    }
    setSavingField(null)
  }

  const updateArrayField = async (arrayField: string, ids: string[], singleField?: string) => {
    const updates: Record<string, any> = { [arrayField]: ids }
    if (singleField) updates[singleField] = ids[0] || null
    await supabase.from('projects').update(updates).eq('id', project.id)
  }

  const saveVehicle = async () => {
    await supabase.from('projects').update({
      vehicle_year: vehicleYear || null,
      vehicle_make: vehicleMake || null,
      vehicle_model: vehicleModel || null,
      vehicle_vin: vehicleVin || null,
      vehicle_color: vehicleColor || null,
    }).eq('id', project.id)
  }

  // ── Copy job ──
  const copyJob = async () => {
    setCopying(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({
        org_id: project.org_id,
        title: `COPY — ${project.title}`,
        pipe_stage: 'sales_in',
        customer_id: copyParts.customer ? project.customer_id : null,
        vehicle_desc: copyParts.vehicle_info ? project.vehicle_desc : null,
        form_data: copyParts.notes ? { ...(project.form_data as Record<string, unknown> || {}), line_items: undefined } : {},
        priority: project.priority,
        type: project.type,
      })
      .select('id')
      .single()
    setCopying(false)
    if (data?.id) {
      router.push(`/projects/${data.id}`)
      setCopyModal(false)
    }
  }

  // ── Save transaction ──
  const saveTransaction = async () => {
    if (!txAmount) return
    setTxSaving(true)
    const res = await fetch(`/api/jobs/${project.id}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: project.org_id,
        amount: parseFloat(txAmount),
        type: txType,
        method: txMethod,
        notes: txNotes,
        payment_date: txDate,
        recorded_by: profile.id,
      }),
    })
    if (res.ok) {
      setTxSuccess(true)
      setTimeout(() => { setTxSuccess(false); setTransactionPanel(false); setTxAmount(''); setTxNotes('') }, 1500)
    }
    setTxSaving(false)
  }

  // ── Search for job to connect ──
  const searchJobs = useCallback(async (q: string) => {
    if (q.length < 2) { setConnectResults([]); return }
    setConnectSearching(true)
    const { data } = await supabase
      .from('projects')
      .select('id, title, pipe_stage, vehicle_desc, customer:customer_id(name, company_name)')
      .eq('org_id', project.org_id)
      .neq('id', project.id)
      .ilike('title', `%${q}%`)
      .limit(8)
    setConnectResults(data || [])
    setConnectSearching(false)
  }, [supabase, project.org_id, project.id])

  useEffect(() => {
    const timer = setTimeout(() => searchJobs(connectSearch), 300)
    return () => clearTimeout(timer)
  }, [connectSearch, searchJobs])

  const connectJob = async (targetId: string) => {
    setConnectSaving(true)
    const res = await fetch(`/api/jobs/${project.id}/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetJobId: targetId, org_id: project.org_id }),
    })
    if (res.ok) {
      await loadConnectedJobs()
      setConnectModal(false)
      setConnectSearch('')
      setConnectResults([])
    }
    setConnectSaving(false)
  }

  const disconnectJob = async (connectionId: string) => {
    await fetch(`/api/jobs/${project.id}/connections?connectionId=${connectionId}`, { method: 'DELETE' })
    setConnectedJobs(prev => prev.filter(c => c.id !== connectionId))
  }

  // ── Archive / Delete ──
  const archiveJob = async () => {
    await supabase.from('projects').update({ pipe_stage: 'done' }).eq('id', project.id)
    setArchiveConfirm(false)
    router.push('/jobs')
  }

  const deleteJob = async () => {
    if (deleteText !== 'DELETE') return
    await supabase.from('projects').delete().eq('id', project.id)
    router.push('/jobs')
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

        {/* Edit / Save / Cancel + Three-dot menu */}
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
          <div style={{ display: 'flex', gap: 6 }}>
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

            {/* ── Three-dot menu ── */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36, borderRadius: 8,
                  border: '1px solid var(--surface2)', background: menuOpen ? 'var(--surface2)' : 'transparent',
                  color: 'var(--text2)', cursor: 'pointer',
                }}
              >
                <MoreHorizontal size={16} />
              </button>
              {menuOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, zIndex: 200,
                  marginTop: 4, background: 'var(--surface)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                  overflow: 'visible', boxShadow: '0 10px 32px rgba(0,0,0,0.5)',
                  minWidth: 220, padding: '4px 0',
                }}>
                  {/* Edit Job Details */}
                  <MenuButton
                    icon={<Edit2 size={13} />}
                    label="Edit Job Details"
                    onClick={() => { setMenuOpen(false); setEditing(true) }}
                  />

                  {/* Copy Job */}
                  <MenuButton
                    icon={<Copy size={13} />}
                    label="Copy Job"
                    onClick={() => { setMenuOpen(false); setCopyModal(true) }}
                  />

                  {/* Move to Stage */}
                  <div style={{ position: 'relative' }}>
                    <MenuButton
                      icon={<ChevronRight size={13} />}
                      label="Move to Pipeline Stage"
                      onClick={() => setStageSubmenu(s => !s)}
                      rightIcon={<ChevronRight size={11} />}
                    />
                    {stageSubmenu && (
                      <div style={{
                        position: 'absolute', top: 0, right: '100%',
                        background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        minWidth: 160, zIndex: 201,
                      }}>
                        {PIPE_STAGES.map(s => {
                          const sc = STAGE_CONFIG[s]
                          return (
                            <button
                              key={s}
                              onClick={() => { updateField('pipe_stage', s); setStageSubmenu(false); setMenuOpen(false) }}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                                padding: '9px 12px', border: 'none',
                                background: project.pipe_stage === s ? 'var(--surface2)' : 'transparent',
                                color: project.pipe_stage === s ? sc.color : 'var(--text1)',
                                cursor: 'pointer', fontSize: 13, textAlign: 'left',
                              }}
                            >
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc.color, flexShrink: 0 }} />
                              {sc.label}
                              {project.pipe_stage === s && <Check size={11} style={{ marginLeft: 'auto' }} />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Add Transaction */}
                  <MenuButton
                    icon={<TransactionIcon size={13} />}
                    label="Add Transaction"
                    onClick={() => { setMenuOpen(false); setTransactionPanel(true) }}
                  />

                  {/* Connect Job */}
                  <MenuButton
                    icon={<Link2 size={13} />}
                    label="Connect Job"
                    onClick={() => { setMenuOpen(false); setConnectModal(true) }}
                  />

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />

                  {/* Archive */}
                  <MenuButton
                    icon={<Archive size={13} />}
                    label="Archive Job"
                    onClick={() => { setMenuOpen(false); setArchiveConfirm(true) }}
                  />

                  {/* Delete */}
                  <MenuButton
                    icon={<Trash2 size={13} />}
                    label="Delete Job"
                    onClick={() => { setMenuOpen(false); setDeleteConfirm(true) }}
                    danger
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Connected Jobs Row ───────────────────────────────────────────── */}
      {connectedJobs.length > 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <Truck size={13} style={{ color: 'var(--cyan)' }} />
            <span style={{
              fontSize: 10, fontWeight: 800, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              Fleet Package:
            </span>
          </div>
          {connectedJobs.map(conn => {
            if (!conn.connected) return null
            const sc = STAGE_CONFIG[conn.connected.pipe_stage] ?? STAGE_CONFIG.sales_in
            return (
              <div key={conn.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <Link
                  href={`/projects/${conn.connected.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: '6px 0 0 6px',
                    background: `${sc.color}18`, border: `1px solid ${sc.color}40`,
                    color: sc.color, fontSize: 11, fontWeight: 700, textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color, flexShrink: 0 }} />
                  {conn.connected.title}
                  {conn.connected.customer?.name && (
                    <span style={{ color: `${sc.color}90`, fontSize: 10 }}>
                      — {conn.connected.customer.name}
                    </span>
                  )}
                </Link>
                <button
                  onClick={() => disconnectJob(conn.id)}
                  title="Disconnect"
                  style={{
                    padding: '4px 7px', borderRadius: '0 6px 6px 0',
                    background: `${sc.color}10`, border: `1px solid ${sc.color}40`,
                    borderLeft: 'none', color: `${sc.color}80`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            )
          })}
          <button
            onClick={() => setConnectModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 6,
              border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent',
              color: 'var(--text3)', cursor: 'pointer', fontSize: 11, fontWeight: 600,
            }}
          >
            + Connect Another
          </button>
        </div>
      )}

      {/* ── Job Team Panel ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: '14px 20px', marginBottom: 16,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 800, color: 'var(--text3)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14,
          fontFamily: 'Barlow Condensed, sans-serif',
        }}>
          <Users size={13} /> Job Team
        </div>

        {/* Customer row */}
        <div style={{ background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Customer</div>
          {customer ? (
            <div>
              <Link href={`/customers/${customer.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#4f7fff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                    {(customer.name || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{customer.name}</div>
                    {customer.company_name && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{customer.company_name}</div>
                    )}
                    {customer.phone && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{customer.phone}</div>
                    )}
                  </div>
                </div>
              </Link>
              <button
                onClick={() => setCustomerModalOpen(true)}
                style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 600 }}
              >
                Change
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCustomerModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(79,127,255,0.1)', border: '1px dashed rgba(79,127,255,0.3)', borderRadius: 6, padding: '8px 12px', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}
            >
              <User size={12} /> Add Customer
            </button>
          )}
          <CustomerSearchModal
            open={customerModalOpen}
            onClose={() => setCustomerModalOpen(false)}
            orgId={project.org_id}
            onSelect={async (c) => {
              setLinkedCustomer(c)
              setCustomerModalOpen(false)
              await supabase.from('projects').update({ customer_id: c.id }).eq('id', project.id)
            }}
          />
        </div>

        {/* Team multi-select grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, overflowX: 'auto' }}>
          <TeamMultiSelect
            label="Sales Rep"
            roleColor="#22c07a"
            options={agents}
            selectedIds={salesRepIds}
            onSave={(ids) => { setSalesRepIds(ids); updateArrayField('sales_rep_ids', ids, 'agent_id') }}
          />
          <TeamMultiSelect
            label="Installer"
            roleColor="#22d3ee"
            options={installers}
            selectedIds={installerIds}
            onSave={(ids) => { setInstallerIds(ids); updateArrayField('installer_ids', ids, 'installer_id') }}
          />
          <TeamMultiSelect
            label="Designer"
            roleColor="#8b5cf6"
            options={designers}
            selectedIds={designerIds}
            onSave={(ids) => { setDesignerIds(ids); updateArrayField('designer_ids', ids, 'designer_id') }}
          />
          <TeamMultiSelect
            label="Prod Mgr"
            roleColor="#f59e0b"
            options={managers}
            selectedIds={productionMgrIds}
            onSave={(ids) => { setProductionMgrIds(ids); updateArrayField('production_manager_ids', ids, 'production_manager_id') }}
          />
        </div>

        {/* Related Documents chips */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4 }}>Docs:</span>
          {[
            { label: 'Estimates', count: relatedDocs.estimates, icon: <FileText size={11} />, color: '#4f7fff' },
            { label: 'Sales Orders', count: relatedDocs.salesOrders, icon: <ShoppingCart size={11} />, color: '#22c07a' },
            { label: 'Invoices', count: relatedDocs.invoices, icon: <Receipt size={11} />, color: '#f59e0b' },
            { label: 'Payments', count: relatedDocs.payments, icon: <CreditCard size={11} />, color: '#8b5cf6' },
          ].map(d => (
            <span key={d.label} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20,
              background: `${d.color}18`, border: `1px solid ${d.color}40`,
              color: d.color, fontSize: 11, fontWeight: 700,
            }}>
              {d.icon} {d.count} {d.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Body: tabs + sidebar ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Left: tab content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--surface2)', marginBottom: 20, overflowX: 'auto' }}>
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
              project={project} customer={customer} editing={editing}
              editInstallDate={editInstallDate} editDueDate={editDueDate}
              setEditInstallDate={setEditInstallDate} setEditDueDate={setEditDueDate}
              fin={fin} fd={fd} fmt$={fmt$} fmtPct={fmtPct} fmtDate={fmtDate}
            />
          )}
          {tab === 'timeline' && <TimelineTab approvals={approvals} fmtDate={fmtDate} />}
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
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Stage</div>
            <div ref={stageDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setStageOpen(o => !o)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 8, border: '1px solid var(--surface2)',
                  background: 'var(--surface2)', color: 'var(--text1)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, display: 'inline-block' }} />
                  {stage.label}
                </span>
                <ChevronDown size={14} style={{ transform: stageOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>
              {stageOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  marginTop: 4, background: 'var(--surface)', border: '1px solid var(--surface2)',
                  borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
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

          {/* Priority */}
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Priority</div>
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

          {/* Vehicle */}
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Car size={11} /> Vehicle
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Year',  value: vehicleYear,  set: setVehicleYear },
                { label: 'Make',  value: vehicleMake,  set: setVehicleMake },
                { label: 'Model', value: vehicleModel, set: setVehicleModel },
                { label: 'VIN',   value: vehicleVin,   set: setVehicleVin },
                { label: 'Color', value: vehicleColor, set: setVehicleColor },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                  <input
                    value={value}
                    onChange={e => set(e.target.value)}
                    onBlur={saveVehicle}
                    placeholder={label}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--surface2)', background: 'var(--surface2)', color: 'var(--text1)', fontSize: 12, boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {fieldError && (
            <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, padding: '4px 8px' }}>{fieldError}</div>
          )}

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

      {/* ── Mobile actions ─────────────────────────────────────────────────── */}
      <div className="md:hidden" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <MobileActions
          project={project} stage={stage} priority={priority}
          installers={installers} agents={agents}
          stageOpen={stageOpen} setStageOpen={setStageOpen}
          savingField={savingField} updateField={updateField}
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════════════════════ */}

      {/* ── Copy Job Modal ── */}
      {copyModal && (
        <Modal title="Copy Job" onClose={() => setCopyModal(false)}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
            Choose what to copy to the new job. It will be prefixed with <strong style={{ color: 'var(--text1)' }}>COPY —</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {(Object.entries(copyParts) as [keyof typeof copyParts, boolean][]).map(([key, val]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={val}
                  onChange={e => setCopyParts(p => ({ ...p, [key]: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, color: 'var(--text1)', textTransform: 'capitalize' }}>
                  {key.replace(/_/g, ' ')}
                </span>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setCopyModal(false)} style={cancelBtnStyle}>Cancel</button>
            <button onClick={copyJob} disabled={copying} style={primaryBtnStyle}>
              {copying ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Copying…</> : <><Copy size={13} /> Copy Job</>}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Add Transaction Panel ── */}
      {transactionPanel && (
        <Modal title="Add Transaction" onClose={() => setTransactionPanel(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormField label="Amount ($)">
              <input
                type="number"
                value={txAmount}
                onChange={e => setTxAmount(e.target.value)}
                placeholder="0.00"
                style={inputStyle}
              />
            </FormField>
            <FormField label="Type">
              <select value={txType} onChange={e => setTxType(e.target.value)} style={inputStyle}>
                <option value="payment">Payment</option>
                <option value="deposit">Deposit</option>
                <option value="refund">Refund</option>
                <option value="charge">Charge</option>
              </select>
            </FormField>
            <FormField label="Method">
              <select value={txMethod} onChange={e => setTxMethod(e.target.value)} style={inputStyle}>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="ach">ACH</option>
              </select>
            </FormField>
            <FormField label="Date">
              <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} style={inputStyle} />
            </FormField>
            <FormField label="Notes (optional)">
              <input
                type="text"
                value={txNotes}
                onChange={e => setTxNotes(e.target.value)}
                placeholder="e.g. 50% deposit — check #1234"
                style={inputStyle}
              />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setTransactionPanel(false)} style={cancelBtnStyle}>Cancel</button>
            <button onClick={saveTransaction} disabled={!txAmount || txSaving} style={primaryBtnStyle}>
              {txSuccess
                ? <><Check size={13} /> Saved!</>
                : txSaving
                  ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                  : <><TransactionIcon size={13} /> Add Transaction</>
              }
            </button>
          </div>
        </Modal>
      )}

      {/* ── Connect Job Modal ── */}
      {connectModal && (
        <Modal title="Connect Job" onClose={() => { setConnectModal(false); setConnectSearch(''); setConnectResults([]) }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
            Link this job to other jobs in a fleet package. Connected jobs show as chips at the top of each job page.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, background: 'var(--bg)', borderRadius: 8, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <FileText size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
            <input
              value={connectSearch}
              onChange={e => setConnectSearch(e.target.value)}
              placeholder="Search by job title or customer…"
              autoFocus
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text1)', fontSize: 13, outline: 'none' }}
            />
            {connectSearching && <Loader2 size={13} style={{ color: 'var(--text3)', animation: 'spin 1s linear infinite' }} />}
          </div>

          {connectResults.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
              {connectResults.map(job => {
                const sc = STAGE_CONFIG[job.pipe_stage] ?? STAGE_CONFIG.sales_in
                const alreadyConnected = connectedJobs.some(c => c.connected?.id === job.id)
                return (
                  <div
                    key={job.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8,
                      background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {job.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {sc.label}
                        {job.customer?.name && ` · ${job.customer.name}`}
                      </div>
                    </div>
                    {alreadyConnected ? (
                      <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>Connected</span>
                    ) : (
                      <button
                        onClick={() => connectJob(job.id)}
                        disabled={connectSaving}
                        style={{
                          padding: '5px 12px', borderRadius: 6, border: 'none',
                          background: 'var(--accent)', color: '#fff',
                          cursor: 'pointer', fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}
                      >
                        Connect
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : connectSearch.length >= 2 && !connectSearching ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text3)', fontSize: 13 }}>
              No jobs found matching "{connectSearch}"
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button onClick={() => { setConnectModal(false); setConnectSearch(''); setConnectResults([]) }} style={cancelBtnStyle}>
              Done
            </button>
          </div>
        </Modal>
      )}

      {/* ── Archive Confirm ── */}
      {archiveConfirm && (
        <Modal title="Archive Job" onClose={() => setArchiveConfirm(false)}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
            This will move the job to <strong style={{ color: 'var(--green)' }}>Done</strong> status. You can still access it from the pipeline.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setArchiveConfirm(false)} style={cancelBtnStyle}>Cancel</button>
            <button onClick={archiveJob} style={{ ...primaryBtnStyle, background: '#f59e0b' }}>
              <Archive size={13} /> Archive
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <Modal title="Delete Job" onClose={() => { setDeleteConfirm(false); setDeleteText('') }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
            This action is <strong style={{ color: 'var(--red)' }}>permanent and cannot be undone</strong>.
            Type <strong style={{ color: 'var(--red)', letterSpacing: '0.1em' }}>DELETE</strong> to confirm.
          </div>
          <input
            value={deleteText}
            onChange={e => setDeleteText(e.target.value)}
            placeholder="Type DELETE to confirm"
            style={{ ...inputStyle, marginBottom: 16, borderColor: deleteText === 'DELETE' ? 'var(--red)' : undefined }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setDeleteConfirm(false); setDeleteText('') }} style={cancelBtnStyle}>Cancel</button>
            <button
              onClick={deleteJob}
              disabled={deleteText !== 'DELETE'}
              style={{ ...primaryBtnStyle, background: 'var(--red)', opacity: deleteText !== 'DELETE' ? 0.5 : 1 }}
            >
              <Trash2 size={13} /> Delete Job
            </button>
          </div>
        </Modal>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ─── Shared modal styles ───────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'var(--bg)', color: 'var(--text1)',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
const primaryBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 8, border: 'none',
  background: 'var(--accent)', color: '#fff',
  cursor: 'pointer', fontSize: 13, fontWeight: 700,
}
const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
  color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
}

// ─── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: 'rgba(0,0,0,0.75)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.1)',
        padding: 24, width: '100%', maxWidth: 480,
        boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {title}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Form field helper ─────────────────────────────────────────────────────────
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// ─── Menu Button helper ────────────────────────────────────────────────────────
function MenuButton({
  icon, label, onClick, danger, rightIcon,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; rightIcon?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px', border: 'none',
        background: 'transparent',
        color: danger ? 'var(--red)' : 'var(--text1)',
        cursor: 'pointer', fontSize: 13, textAlign: 'left',
      }}
    >
      <span style={{ color: danger ? 'var(--red)' : 'var(--text3)', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {rightIcon && <span style={{ color: 'var(--text3)' }}>{rightIcon}</span>}
    </button>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        {[
          { label: 'Revenue',    value: fmt$(revenue),    icon: <DollarSign size={15} />,  color: '#4f7fff' },
          { label: 'Profit',     value: fmt$(profit),     icon: <TrendingUp size={15} />,  color: '#22c07a' },
          { label: 'GPM',        value: fmtPct(gpm),      icon: <Percent size={15} />,     color: (gpm != null && gpm >= 73) ? '#22c07a' : '#f59e0b' },
          { label: 'Commission', value: fmt$(commission), icon: <Award size={15} />,       color: '#8b5cf6' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: stat.color, marginBottom: 8 }}>
              {stat.icon}
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {/* Customer */}
        <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Building2 size={11} /> Customer
          </div>
          {customer ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Link href={`/customers/${customer.id}`} style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>
                {customer.name}
              </Link>
              {customer.company_name && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{customer.company_name}</div>}
              {customer.phone && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{customer.phone}</div>}
              {customer.email && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{customer.email}</div>}
              {customer.lifetime_spend != null && (
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                  Lifetime: <span style={{ color: 'var(--green)', fontWeight: 700 }}>${customer.lifetime_spend.toLocaleString()}</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>No customer linked</div>
          )}
        </div>

        {/* Vehicle & Job */}
        <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Car size={11} /> Vehicle &amp; Job
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(fd.vehicle_year || fd.vehicle_make || fd.vehicle_model) ? (
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>
                {[fd.vehicle_year, fd.vehicle_make, fd.vehicle_model].filter(Boolean).join(' ')}
              </div>
            ) : project.vehicle_desc ? (
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>{project.vehicle_desc}</div>
            ) : null}
            {fd.vehicle_vin && <div style={{ fontSize: 12, color: 'var(--text2)' }}>VIN: {fd.vehicle_vin}</div>}
            {(project.vehicle_color || fd.vehicleColor != null) && (
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Color: {project.vehicle_color || String(fd.vehicleColor)}</div>
            )}
            {project.type && <div style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'capitalize' }}>Type: {project.type}</div>}
            {fd.jobType != null && <div style={{ fontSize: 12, color: 'var(--text2)' }}>Job: {String(fd.jobType)}</div>}
            {!fd.vehicle_year && !fd.vehicle_make && !project.vehicle_desc && !project.vehicle_color && fd.vehicleColor == null && !project.type && fd.jobType == null && (
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>No vehicle info</div>
            )}
          </div>
        </div>

        {/* Dates */}
        <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Calendar size={11} /> Dates
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Install Date</div>
              {editing ? (
                <input type="date" value={editInstallDate} onChange={e => setEditInstallDate(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--surface2)', background: 'var(--surface2)', color: 'var(--text1)', fontSize: 13, width: '100%' }} />
              ) : (
                <div style={{ fontSize: 14, fontWeight: 600, color: project.install_date ? 'var(--text1)' : 'var(--text3)' }}>
                  {fmtDate(project.install_date)}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Due Date</div>
              {editing ? (
                <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--surface2)', background: 'var(--surface2)', color: 'var(--text1)', fontSize: 13, width: '100%' }} />
              ) : (
                <div style={{ fontSize: 14, fontWeight: 600, color: project.due_date ? 'var(--text1)' : 'var(--text3)' }}>
                  {fmtDate(project.due_date)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Team */}
        <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
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
        <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Notes</div>
          <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{String(fd.notes)}</div>
        </div>
      )}
    </div>
  )
}

// ─── Timeline Tab ──────────────────────────────────────────────────────────────
function TimelineTab({ approvals, fmtDate }: { approvals: StageApproval[]; fmtDate: (d: string | null | undefined) => string }) {
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: sc.bg, border: `2px solid ${sc.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: sc.color }} />
              </div>
              {idx < approvals.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 24, background: 'var(--surface2)' }} />}
            </div>
            <div style={{ flex: 1, paddingTop: 6, paddingBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: sc.color }}>{sc.label}</span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtDate(ts)}</span>
              </div>
              {approval.approver?.name && (
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Approved by {approval.approver.name}</div>
              )}
              {approval.note && (
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6, padding: '8px 12px', borderRadius: 6, background: 'var(--surface)', borderLeft: `3px solid ${sc.color}`, fontStyle: 'italic' }}>
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

// ─── Team Slot ─────────────────────────────────────────────────────────────────
// ─── Team Multi-Select ─────────────────────────────────────────────────────────
interface TeamMultiSelectProps {
  label: string
  roleColor: string
  options: Pick<Profile, 'id' | 'name' | 'role'>[]
  selectedIds: string[]
  onSave: (ids: string[]) => void
}

function TeamMultiSelect({ label, roleColor, options, selectedIds, onSave }: TeamMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [local, setLocal] = useState<string[]>(selectedIds)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setLocal(selectedIds) }, [selectedIds])

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onSave(local)
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, local, onSave])

  const toggle = (id: string) => setLocal(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id])

  return (
    <div
      ref={ref}
      style={{ background: 'var(--bg)', border: '1px solid var(--surface2)', borderRadius: 10, padding: '10px 12px', position: 'relative' }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: 4, minHeight: 28, alignItems: 'center' }}
      >
        {local.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px dashed var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={13} style={{ color: 'var(--text3)' }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>Assign {label}</span>
          </div>
        ) : local.map(id => {
          const m = options.find(o => o.id === id)
          if (!m) return null
          return (
            <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: `${roleColor}20`, border: `1px solid ${roleColor}40`, color: roleColor, fontSize: 11, fontWeight: 700 }}>
              {m.name}
              <button
                onClick={(e) => { e.stopPropagation(); const n = local.filter(x => x !== id); setLocal(n); onSave(n) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: roleColor, padding: 0, display: 'flex', lineHeight: 1 }}
              >
                <X size={10} />
              </button>
            </span>
          )
        })}
        <Pencil size={11} style={{ color: 'var(--text3)', marginLeft: 'auto', flexShrink: 0 }} />
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          marginTop: 4, background: 'var(--surface)', border: '1px solid var(--surface2)',
          borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {options.map(opt => {
            const sel = local.includes(opt.id)
            return (
              <button
                key={opt.id}
                onClick={() => toggle(opt.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 12px', border: 'none',
                  background: sel ? 'var(--surface2)' : 'transparent',
                  color: sel ? roleColor : 'var(--text1)',
                  cursor: 'pointer', fontSize: 13, textAlign: 'left',
                }}
              >
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: sel ? roleColor : 'var(--surface2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                  {(opt.name || '?')[0].toUpperCase()}
                </div>
                {opt.name}
                {sel && <Check size={12} style={{ marginLeft: 'auto' }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface TeamSlotProps {
  label: string
  fieldKey: string
  currentId: string | null | undefined
  currentName: string | null | undefined
  options: Pick<Profile, 'id' | 'name' | 'role'>[]
  avatarColor: string
  teamDropdown: string | null
  setTeamDropdown: (v: string | null) => void
  dropdownRef: React.RefObject<HTMLDivElement>
  onSelect: (id: string | null) => void
}

function TeamSlot({ label, fieldKey, currentId, currentName, options, avatarColor, teamDropdown, setTeamDropdown, dropdownRef, onSelect }: TeamSlotProps) {
  const isOpen = teamDropdown === fieldKey
  return (
    <div
      ref={isOpen ? dropdownRef : undefined}
      style={{ background: 'var(--bg)', border: '1px solid var(--surface2)', borderRadius: 10, padding: '10px 12px', position: 'relative', cursor: 'pointer' }}
      onClick={() => setTeamDropdown(isOpen ? null : fieldKey)}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      {currentId && currentName ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
            {(currentName || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentName}</div>
          </div>
          <Pencil size={12} style={{ color: 'var(--text3)', flexShrink: 0 }} />
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px dashed var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={14} style={{ color: 'var(--text3)' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>Assign {label}</div>
        </div>
      )}
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 100, minWidth: 180,
          marginTop: 4, background: 'var(--surface)', border: '1px solid var(--surface2)',
          borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(null) }}
            style={{ width: '100%', padding: '9px 12px', border: 'none', background: !currentId ? 'var(--surface2)' : 'transparent', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, textAlign: 'left', fontStyle: 'italic' }}
          >
            Unassign
          </button>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={(e) => { e.stopPropagation(); onSelect(opt.id) }}
              style={{
                width: '100%', padding: '9px 12px', border: 'none',
                background: currentId === opt.id ? 'var(--surface2)' : 'transparent',
                color: currentId === opt.id ? avatarColor : 'var(--text1)',
                cursor: 'pointer', fontSize: 13, textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: avatarColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                {(opt.name || '?')[0].toUpperCase()}
              </div>
              {opt.name}
              {currentId === opt.id && <Check size={12} style={{ marginLeft: 'auto' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Mobile Actions ────────────────────────────────────────────────────────────
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

function MobileActions({ project, stage, priority, installers, agents, stageOpen, setStageOpen, savingField, updateField }: MobileActionsProps) {
  return (
    <>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Stage</div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setStageOpen(!stageOpen)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--surface2)', background: 'var(--surface2)', color: 'var(--text1)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
              {stage.label}
            </span>
            <ChevronDown size={14} />
          </button>
          {stageOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
              {PIPE_STAGES.map(s => {
                const sc = STAGE_CONFIG[s]
                const active = project.pipe_stage === s
                return (
                  <button
                    key={s}
                    onClick={async () => { setStageOpen(false); await updateField('pipe_stage', s) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: 'none', background: active ? 'var(--surface2)' : 'transparent', color: active ? sc.color : 'var(--text1)', cursor: 'pointer', fontSize: 13, textAlign: 'left' }}
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
      <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Priority</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['urgent', 'high', 'normal', 'low'] as const).map(p => {
            const pc = PRIORITY_CONFIG[p]
            const active = project.priority === p
            return (
              <button
                key={p}
                onClick={() => updateField('priority', p)}
                disabled={savingField === 'priority'}
                style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${active ? pc.color : 'var(--surface2)'}`, background: active ? `${pc.color}20` : 'transparent', color: active ? pc.color : 'var(--text3)', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}
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
