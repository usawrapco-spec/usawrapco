'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ChevronDown, ChevronUp, CheckCircle2, Circle,
  AlertCircle, FileText, Package, Truck, Brush,
  DollarSign, MapPin, Camera, Send, CornerDownLeft, Phone,
  Loader2, ExternalLink, Edit3, Check, X, ChevronLeft,
  MessageSquare
} from 'lucide-react'

type StageStatus = 'not_started' | 'in_progress' | 'complete' | 'blocked'
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'skipped'

interface StageApproval {
  id: string; stage: string; status: ApprovalStatus
  approved_by?: string; approved_at?: string; notes?: string
}
interface SendBack {
  id: string; from_stage: string; to_stage: string; reason: string
  reason_detail?: string; sent_by: string; resolved: boolean; created_at: string
}
interface Task { id: string; title: string; status: string; type: string; due_at?: string }
interface Comment { id: string; channel: string; message?: string; body?: string; author_id?: string; user_id?: string; created_at: string }
interface Profile { id: string; full_name?: string; name?: string; role?: string; avatar_url?: string }
interface LineItem { id: string; item_name?: string; name?: string; product_type?: string; sale_price?: number; sqft?: number; coverage?: string }
interface Project {
  id: string; title: string; status: string; pipe_stage: string
  stage_checklist: Record<string, boolean>; org_id?: string
  vehicle_desc?: string; vehicle_year?: string; vehicle_make?: string; vehicle_model?: string; vehicle_color?: string
  install_date?: string; due_date?: string; notes?: string
  revenue?: number; profit?: number; gpm?: number; sqft?: number; priority?: string
  is_mobile_install?: boolean; install_address?: string; design_link?: string
  agent_id?: string; designer_id?: string; installer_id?: string; production_manager_id?: string
  customer?: { id: string; name: string; email?: string; phone?: string; business_name?: string }
}

const DEPT_CONFIG = {
  sales: {
    label: 'Sales', color: '#2563EB',
    accent: '#2563EB', bg: 'rgb(239,246,255)',
    icon: DollarSign,
    checklist: [
      { id: 'quote_sent', label: 'Quote / estimate sent to customer', required: true },
      { id: 'deposit_collected', label: 'Design deposit collected', required: true },
      { id: 'design_intake_sent', label: 'Design intake form sent to customer', required: false },
      { id: 'design_intake_complete', label: 'Customer completed design intake', required: false },
      { id: 'install_date_confirmed', label: 'Install / drop-off date confirmed', required: true },
      { id: 'vehicle_info_complete', label: 'Vehicle info & job notes documented', required: true },
    ],
  },
  design: {
    label: 'Design', color: '#7C3AED',
    accent: '#7C3AED', bg: 'rgb(245,243,255)',
    icon: Brush,
    checklist: [
      { id: 'brief_received', label: 'Design brief / intake received', required: true },
      { id: 'brand_assets', label: 'Brand assets & logos collected', required: true },
      { id: 'design_started', label: 'Design work started', required: true },
      { id: 'internal_review', label: 'Internal quality review done', required: true },
      { id: 'proof_sent', label: 'Proof sent to customer', required: true },
      { id: 'proof_approved', label: 'Customer approved proof', required: true },
      { id: 'print_files_ready', label: 'Print-ready files exported', required: true },
      { id: 'design_handoff', label: 'Files handed off to production', required: true },
    ],
  },
  production: {
    label: 'Production', color: '#EA580C',
    accent: '#EA580C', bg: 'rgb(255,247,237)',
    icon: Package,
    checklist: [
      { id: 'material_confirmed', label: 'Material type & stock confirmed', required: true },
      { id: 'material_ordered', label: 'Material ordered (if needed)', required: false },
      { id: 'material_received', label: 'Material received / in shop', required: true },
      { id: 'files_to_print', label: 'Files queued to printer', required: true },
      { id: 'printed', label: 'Printed', required: true },
      { id: 'laminated', label: 'Laminated', required: true },
      { id: 'cut_weeded', label: 'Cut & weeded', required: true },
      { id: 'qc_passed', label: 'QC inspection passed', required: true },
      { id: 'panels_labeled', label: 'Panels labeled & kitted for install', required: true },
    ],
  },
  install: {
    label: 'Install', color: '#059669',
    accent: '#059669', bg: 'rgb(236,253,245)',
    icon: Truck,
    checklist: [
      { id: 'condition_report', label: 'Pre-install condition report completed', required: true },
      { id: 'installer_confirmed', label: 'Installer confirmed / assigned', required: true },
      { id: 'vehicle_checked_in', label: 'Vehicle checked in', required: true },
      { id: 'surface_prep', label: 'Surface prep complete', required: true },
      { id: 'install_started', label: 'Install started', required: true },
      { id: 'wrap_installed', label: 'Wrap fully installed', required: true },
      { id: 'final_qc', label: 'Final QC walk-around complete', required: true },
      { id: 'photos_taken', label: 'After photos taken', required: true },
      { id: 'customer_pickup', label: 'Vehicle delivered / customer picked up', required: true },
      { id: 'review_requested', label: 'Review request sent', required: false },
    ],
  },
} as const

type DeptKey = keyof typeof DEPT_CONFIG
const STAGE_ORDER: DeptKey[] = ['sales', 'design', 'production', 'install']

function stageStatus(checklist: Record<string, boolean>, dept: string): StageStatus {
  const cfg = DEPT_CONFIG[dept as DeptKey]
  if (!cfg) return 'not_started'
  const required = cfg.checklist.filter(i => i.required)
  const done = required.filter(i => checklist[`${dept}_${i.id}`])
  if (done.length === 0) return 'not_started'
  if (done.length === required.length) return 'complete'
  return 'in_progress'
}

function StatusPill({ status }: { status: StageStatus }) {
  const map: Record<StageStatus, { label: string; style: React.CSSProperties }> = {
    not_started: { label: 'Not Started', style: { background: '#f3f4f6', color: '#6b7280' } },
    in_progress:  { label: 'In Progress', style: { background: '#fef3c7', color: '#92400e' } },
    complete:     { label: 'Complete',    style: { background: '#d1fae5', color: '#065f46' } },
    blocked:      { label: 'Blocked',     style: { background: '#fee2e2', color: '#991b1b' } },
  }
  const { label, style } = map[status]
  return (
    <span style={{ ...style, fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
      {label}
    </span>
  )
}

function ApprovalPill({ status }: { status?: ApprovalStatus }) {
  if (!status || status === 'pending') {
    return (
      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 600, background: '#f3f4f6', color: '#9ca3af' }}>
        Awaiting Sign-off
      </span>
    )
  }
  if (status === 'approved') {
    return (
      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 600, background: '#d1fae5', color: '#065f46' }}>
        Signed Off
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 600, background: '#fee2e2', color: '#991b1b' }}>
        Rejected
      </span>
    )
  }
  return null
}

function ProgressRing({ checklist, dept, color }: { checklist: Record<string, boolean>; dept: string; color: string }) {
  const cfg = DEPT_CONFIG[dept as DeptKey]
  if (!cfg) return null
  const items = cfg.checklist
  const done = items.filter(i => checklist[`${dept}_${i.id}`]).length
  const pct = items.length > 0 ? done / items.length : 0
  const r = 14
  const c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
      <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={c} strokeDashoffset={c - pct * c}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color }}>
        {done}/{items.length}
      </span>
    </div>
  )
}

function AvatarBubble({ profile }: { profile: Profile }) {
  const initials = ((profile.full_name || profile.name || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase()).slice(0, 2)
  return (
    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#4b5563', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
      {profile.avatar_url
        ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
        : initials}
    </div>
  )
}

function SendBackBanner({ sendBacks, dept }: { sendBacks: SendBack[]; dept: string }) {
  const active = sendBacks.filter(s => s.to_stage === dept && !s.resolved)
  if (!active.length) return null
  return (
    <div style={{ margin: '12px 16px 0', display: 'flex', gap: 8, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12 }}>
      <CornerDownLeft style={{ width: 14, height: 14, color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', margin: 0 }}>Returned from {active[0].from_stage}</p>
        <p style={{ fontSize: 11, color: '#dc2626', margin: '2px 0 0' }}>{active[0].reason}{active[0].reason_detail ? ` — ${active[0].reason_detail}` : ''}</p>
      </div>
    </div>
  )
}

function WorksheetField({ label, value, highlight }: { label: string; value: string; highlight?: 'green' | 'red' }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 11, fontWeight: 700, margin: '2px 0 0', color: highlight === 'green' ? '#16a34a' : highlight === 'red' ? '#dc2626' : '#1f2937' }}>{value}</p>
    </div>
  )
}

function SalesWorksheet({ project, lineItems }: { project: Project; lineItems: LineItem[] }) {
  return (
    <div style={{ padding: '12px 16px', background: '#fff' }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Sales Info</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
        <WorksheetField label="Revenue" value={project.revenue ? `$${project.revenue.toLocaleString()}` : '—'} />
        <WorksheetField label="GPM" value={project.gpm ? `${project.gpm.toFixed(1)}%` : '—'} highlight={project.gpm && project.gpm >= 40 ? 'green' : project.gpm && project.gpm < 25 ? 'red' : undefined} />
        <WorksheetField label="Sqft" value={project.sqft ? `${project.sqft} sf` : '—'} />
        <WorksheetField label="Install Date" value={project.install_date ? new Date(project.install_date).toLocaleDateString() : '—'} />
        <WorksheetField label="Priority" value={project.priority || '—'} />
      </div>
      {lineItems.length > 0 && (
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>Line Items</p>
          {lineItems.map(li => (
            <div key={li.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{li.name || li.item_name || li.product_type}</span>
              {li.sale_price ? <span style={{ fontWeight: 700, color: '#111827', marginLeft: 8 }}>${li.sale_price.toLocaleString()}</span> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DesignWorksheet({ project }: { project: Project }) {
  return (
    <div style={{ padding: '12px 16px', background: '#fff' }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Design Info</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <WorksheetField label="Sqft" value={project.sqft ? `${project.sqft} sf` : '—'} />
        <WorksheetField label="Vehicle Color" value={project.vehicle_color || '—'} />
      </div>
      {project.design_link && (
        <a href={project.design_link} target="_blank" rel="noopener noreferrer"
          style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>
          <ExternalLink style={{ width: 12, height: 12 }} /> Open Design File
        </a>
      )}
    </div>
  )
}

function ProductionWorksheet({ project }: { project: Project }) {
  return (
    <div style={{ padding: '12px 16px', background: '#fff' }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Production Info</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <WorksheetField label="Print Sqft" value={project.sqft ? `${project.sqft} sf` : '—'} />
        <WorksheetField label="Due Date" value={project.due_date ? new Date(project.due_date).toLocaleDateString() : '—'} />
        <WorksheetField label="Install Date" value={project.install_date ? new Date(project.install_date).toLocaleDateString() : '—'} />
      </div>
      {project.notes && (
        <div style={{ marginTop: 8, padding: 8, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, fontSize: 11, color: '#374151' }}>{project.notes}</div>
      )}
    </div>
  )
}

function InstallWorksheet({ project }: { project: Project }) {
  return (
    <div style={{ padding: '12px 16px', background: '#fff' }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Install Info</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <WorksheetField label="Install Date" value={project.install_date ? new Date(project.install_date).toLocaleDateString() : '—'} />
        <WorksheetField label="Type" value={project.is_mobile_install ? 'Mobile Install' : 'Shop Install'} />
      </div>
      {project.is_mobile_install && project.install_address && (
        <a href={`https://maps.google.com/?q=${encodeURIComponent(project.install_address)}`}
          target="_blank" rel="noopener noreferrer"
          style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#059669', fontWeight: 600, textDecoration: 'none' }}>
          <MapPin style={{ width: 12, height: 12 }} /> {project.install_address}
        </a>
      )}
    </div>
  )
}

interface DeptProps {
  dept: DeptKey
  project: Project
  checklist: Record<string, boolean>
  approval?: StageApproval
  sendBacks: SendBack[]
  tasks: Task[]
  comments: Comment[]
  profiles: Profile[]
  assignedProfile?: Profile
  lineItems: LineItem[]
  onCheckItem: (key: string, val: boolean) => void
  onApprove: (dept: string, status: ApprovalStatus, notes?: string) => void
  onAddComment: (dept: string, msg: string) => void
  currentUserId?: string
}

function DeptSection({ dept, project, checklist, approval, sendBacks, tasks, comments, profiles, assignedProfile, lineItems, onCheckItem, onApprove, onAddComment }: DeptProps) {
  const [open, setOpen] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [showApprove, setShowApprove] = useState(false)
  const [approveNote, setApproveNote] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const cfg = DEPT_CONFIG[dept]
  const Icon = cfg.icon
  const status = stageStatus(checklist, dept)
  const deptTasks = tasks.filter(t => t.type === dept)
  const deptComments = comments.filter(c => c.channel === dept)

  const submitComment = () => {
    if (!commentText.trim()) return
    onAddComment(dept, commentText.trim())
    setCommentText('')
  }

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', borderLeft: `4px solid ${cfg.color}` }}>
      {/* Header */}
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#fff', cursor: 'pointer', border: 'none', textAlign: 'left' }}>
        <ProgressRing checklist={checklist} dept={dept} color={cfg.color} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Icon style={{ width: 14, height: 14, flexShrink: 0, color: cfg.color }} />
            <span style={{ fontWeight: 700, color: '#111827', fontSize: 13 }}>{cfg.label}</span>
            <StatusPill status={status} />
            <ApprovalPill status={approval?.status} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {assignedProfile && <AvatarBubble profile={assignedProfile} />}
          {open
            ? <ChevronUp style={{ width: 16, height: 16, color: '#9ca3af' }} />
            : <ChevronDown style={{ width: 16, height: 16, color: '#9ca3af' }} />}
        </div>
      </button>

      {open && (
        <>
          <SendBackBanner sendBacks={sendBacks} dept={dept} />

          {/* Checklist */}
          <div style={{ padding: '12px 16px', background: cfg.bg }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Checklist</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cfg.checklist.map(item => {
                const key = `${dept}_${item.id}`
                const done = !!checklist[key]
                return (
                  <button key={item.id} onClick={() => onCheckItem(key, !done)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <div style={{
                      flexShrink: 0, marginTop: 1, width: 16, height: 16, borderRadius: 4,
                      border: done ? 'none' : '2px solid #d1d5db',
                      background: done ? cfg.color : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s'
                    }}>
                      {done && <Check style={{ width: 10, height: 10, color: '#fff' }} strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 11, lineHeight: 1.5, color: done ? '#9ca3af' : '#374151', textDecoration: done ? 'line-through' : 'none' }}>
                      {item.label}
                      {item.required && !done && <span style={{ marginLeft: 4, color: '#f87171', fontWeight: 700 }}>*</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Worksheet */}
          {dept === 'sales' && <SalesWorksheet project={project} lineItems={lineItems} />}
          {dept === 'design' && <DesignWorksheet project={project} />}
          {dept === 'production' && <ProductionWorksheet project={project} />}
          {dept === 'install' && <InstallWorksheet project={project} />}

          {/* Tasks */}
          {deptTasks.length > 0 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', background: '#fff' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Tasks</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {deptTasks.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {t.status === 'done'
                      ? <CheckCircle2 style={{ width: 14, height: 14, color: '#22c55e', flexShrink: 0 }} />
                      : <Circle style={{ width: 14, height: 14, color: '#d1d5db', flexShrink: 0 }} />}
                    <span style={{ fontSize: 11, color: t.status === 'done' ? '#9ca3af' : '#374151', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</span>
                    {t.due_at && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9ca3af' }}>{new Date(t.due_at).toLocaleDateString()}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stage Sign-off */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Stage Sign-off</p>
              <ApprovalPill status={approval?.status} />
            </div>
            {approval?.approved_at && (
              <p style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>{new Date(approval.approved_at).toLocaleString()}</p>
            )}
            {approval?.notes && (
              <p style={{ fontSize: 11, color: '#374151', marginBottom: 8, padding: 8, background: '#f9fafb', borderRadius: 8 }}>{approval.notes}</p>
            )}
            {(!approval || approval.status === 'pending') && (
              showApprove ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <textarea value={approveNote} onChange={e => setApproveNote(e.target.value)}
                    placeholder="Notes (optional)..." rows={2}
                    style={{ width: '100%', fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { onApprove(dept, 'approved', approveNote); setShowApprove(false); setApproveNote('') }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 0', background: '#16a34a', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer' }}>
                      <Check style={{ width: 12, height: 12 }} /> Approve & Sign Off
                    </button>
                    <button onClick={() => { onApprove(dept, 'rejected', approveNote); setShowApprove(false); setApproveNote('') }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 0', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 700, borderRadius: 10, border: '1px solid #fecaca', cursor: 'pointer' }}>
                      <X style={{ width: 12, height: 12 }} /> Reject / Send Back
                    </button>
                    <button onClick={() => setShowApprove(false)}
                      style={{ padding: '8px 12px', fontSize: 11, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 10 }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowApprove(true)}
                  style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 2 }}>
                  Sign off on this stage →
                </button>
              )
            )}
          </div>

          {/* Notes / Comments */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', background: '#fff' }}>
            <button onClick={() => setShowNotes(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <MessageSquare style={{ width: 12, height: 12 }} />
              {cfg.label} Notes {deptComments.length > 0 && `(${deptComments.length})`}
              {showNotes
                ? <ChevronUp style={{ width: 12, height: 12, marginLeft: 'auto' }} />
                : <ChevronDown style={{ width: 12, height: 12, marginLeft: 'auto' }} />}
            </button>
            {showNotes && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {deptComments.map(c => {
                  const p = profiles.find(pr => pr.id === (c.author_id || c.user_id))
                  return (
                    <div key={c.id} style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 10, padding: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        {p && <AvatarBubble profile={p} />}
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{p?.full_name || p?.name || 'Team'}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9ca3af' }}>{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: 11, color: '#4b5563', margin: 0 }}>{c.message || c.body}</p>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input value={commentText} onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()}
                    placeholder={`${cfg.label} note...`}
                    style={{ flex: 1, fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', outline: 'none', fontFamily: 'inherit' }} />
                  <button onClick={submitComment}
                    style={{ padding: 8, color: '#fff', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: cfg.color }}>
                    <Send style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function PipelineBar({ checklist, approvals }: { checklist: Record<string, boolean>; approvals: StageApproval[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e5e7eb', gap: 0 }}>
      {STAGE_ORDER.map((dept, i) => {
        const cfg = DEPT_CONFIG[dept]
        const status = stageStatus(checklist, dept)
        const approval = approvals.find(a => a.stage === dept)
        const isDone = status === 'complete'
        const isActive = status === 'in_progress'
        return (
          <div key={dept} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDone ? cfg.color : isActive ? `${cfg.color}25` : '#f3f4f6',
                color: isDone ? '#fff' : cfg.color,
                transition: 'all 0.2s'
              }}>
                {isDone
                  ? <Check style={{ width: 14, height: 14 }} strokeWidth={3} />
                  : <span style={{ fontSize: 11, fontWeight: 700 }}>{i + 1}</span>}
              </div>
              <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 500, display: 'none' }} className="sm:block">{cfg.label}</span>
              {approval?.status === 'approved' && <span style={{ fontSize: 9, color: '#16a34a' }}>Done</span>}
            </div>
            {i < STAGE_ORDER.length - 1 && (
              <div style={{ height: 2, width: 16, flexShrink: 0, borderRadius: 999, background: isDone ? cfg.color : '#e5e7eb', transition: 'background 0.2s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Header skeleton */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#e5e7eb' }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: '60%', height: 14, background: '#e5e7eb', borderRadius: 6, marginBottom: 6 }} />
          <div style={{ width: '40%', height: 10, background: '#f3f4f6', borderRadius: 6 }} />
        </div>
      </div>
      {/* Pipeline bar skeleton */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 16px', display: 'flex', gap: 8 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, height: 28, background: '#f3f4f6', borderRadius: 14 }} />
        ))}
      </div>
      <div style={{ maxWidth: 672, margin: '0 auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Summary card skeleton */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ padding: 8, background: '#f9fafb', borderRadius: 10, height: 48 }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ width: 70, height: 30, background: '#f3f4f6', borderRadius: 10 }} />
            ))}
          </div>
        </div>
        {/* Dept section skeletons */}
        {[1,2,3,4].map(i => (
          <div key={i} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', borderLeft: '4px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f3f4f6' }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: '30%', height: 12, background: '#e5e7eb', borderRadius: 6, marginBottom: 6 }} />
                <div style={{ width: '20%', height: 10, background: '#f3f4f6', borderRadius: 6 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const jobId = params?.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [approvals, setApprovals] = useState<StageApproval[]>([])
  const [sendBacks, setSendBacks] = useState<SendBack[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>()
  const [unresolvedSendBacks, setUnresolvedSendBacks] = useState(false)
  const [alertDismissed, setAlertDismissed] = useState(false)

  const load = useCallback(async () => {
    if (!jobId) return
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id)

      const { data: proj } = await supabase
        .from('projects')
        .select('*, customer:customer_id(id, name, email, phone, business_name)')
        .eq('id', jobId).single()
      if (proj) { setProject(proj as Project); setChecklist((proj.stage_checklist as Record<string, boolean>) || {}) }

      const [{ data: approvalsData }, { data: sbData }, { data: tasksData }, { data: commentsData }, { data: profilesData }, { data: liData }] = await Promise.all([
        supabase.from('stage_approvals').select('*').eq('project_id', jobId),
        supabase.from('send_backs').select('*').eq('project_id', jobId).order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').eq('project_id', jobId).order('created_at', { ascending: true }),
        supabase.from('job_comments').select('*').eq('project_id', jobId).order('created_at', { ascending: true }),
        supabase.from('profiles').select('id, full_name, name, role, avatar_url').eq('active', true),
        supabase.from('estimator_line_items').select('*').eq('project_id', jobId),
      ])
      setApprovals((approvalsData as StageApproval[]) || [])
      const sb = (sbData as SendBack[]) || []
      setSendBacks(sb)
      setUnresolvedSendBacks(sb.some(s => !s.resolved))
      setTasks((tasksData as Task[]) || [])
      setComments((commentsData as Comment[]) || [])
      setProfiles((profilesData as Profile[]) || [])
      setLineItems((liData as LineItem[]) || [])
    } finally { setLoading(false) }
  }, [jobId, supabase])

  useEffect(() => { load() }, [load])

  const saveChecklist = useCallback(async (next: Record<string, boolean>) => {
    if (!jobId) return
    setSaving(true)
    await supabase.from('projects').update({ stage_checklist: next }).eq('id', jobId)
    setSaving(false)
  }, [jobId, supabase])

  const handleCheckItem = useCallback((key: string, val: boolean) => {
    setChecklist(prev => {
      const next = { ...prev, [key]: val }
      saveChecklist(next)
      return next
    })
  }, [saveChecklist])

  const handleApprove = useCallback(async (dept: string, status: ApprovalStatus, notes?: string) => {
    if (!jobId || !currentUserId) return
    const existing = approvals.find(a => a.stage === dept)
    const payload = { status, notes: notes || null, approved_by: currentUserId, approved_at: new Date().toISOString() }
    if (existing) {
      const { data } = await supabase.from('stage_approvals').update(payload).eq('id', existing.id).select().single()
      if (data) setApprovals(prev => prev.map(a => a.id === (data as StageApproval).id ? (data as StageApproval) : a))
    } else {
      const { data } = await supabase.from('stage_approvals')
        .insert({ project_id: jobId, org_id: project?.org_id, stage: dept, ...payload }).select().single()
      if (data) setApprovals(prev => [...prev, data as StageApproval])
    }
    if (status === 'rejected' && dept !== 'sales') {
      const idx = STAGE_ORDER.indexOf(dept as DeptKey)
      const prevStage = STAGE_ORDER[idx - 1]
      if (prevStage) {
        await supabase.from('send_backs').insert({
          project_id: jobId, org_id: project?.org_id,
          from_stage: dept, to_stage: prevStage,
          reason: notes || 'Rejected at sign-off', sent_by: currentUserId, resolved: false,
        })
        const { data: sb } = await supabase.from('send_backs').select('*').eq('project_id', jobId).order('created_at', { ascending: false })
        const sbArr = (sb as SendBack[]) || []
        setSendBacks(sbArr)
        setUnresolvedSendBacks(sbArr.some(s => !s.resolved))
      }
    }
    // Auto-advance pipe_stage when all required items complete and approved
    if (status === 'approved') {
      const deptStatus = stageStatus(checklist, dept)
      if (deptStatus === 'complete') {
        const idx = STAGE_ORDER.indexOf(dept as DeptKey)
        const nextStage = STAGE_ORDER[idx + 1]
        if (nextStage && project) {
          await supabase.from('projects').update({ pipe_stage: nextStage }).eq('id', jobId)
          await supabase.from('activity_log').insert({
            project_id: jobId, org_id: project.org_id,
            actor_id: currentUserId, action: 'stage_advanced',
            entity_type: 'project',
            details: { from: dept, to: nextStage },
          })
        }
      }
    }
  }, [jobId, currentUserId, approvals, project, checklist, supabase])

  const handleAddComment = useCallback(async (dept: string, msg: string) => {
    if (!jobId || !currentUserId) return
    const { data } = await supabase.from('job_comments')
      .insert({ project_id: jobId, org_id: project?.org_id, author_id: currentUserId, user_id: currentUserId, channel: dept, message: msg, body: msg })
      .select().single()
    if (data) setComments(prev => [...prev, data as Comment])
  }, [jobId, currentUserId, project, supabase])

  if (loading) return <LoadingSkeleton />

  if (!project) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
      <AlertCircle style={{ width: 32, height: 32, color: '#9ca3af' }} />
      <p style={{ color: '#6b7280', fontSize: 14 }}>Job not found</p>
      <button onClick={() => router.push('/jobs')} style={{ fontSize: 13, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Back to Jobs</button>
    </div>
  )

  const vehicle = [project.vehicle_year, project.vehicle_make, project.vehicle_model].filter(Boolean).join(' ') || project.vehicle_desc || 'Vehicle TBD'
  const assigned: Record<DeptKey, Profile | undefined> = {
    sales: profiles.find(p => p.id === project.agent_id),
    design: profiles.find(p => p.id === project.designer_id),
    production: profiles.find(p => p.id === project.production_manager_id),
    install: profiles.find(p => p.id === project.installer_id),
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Send-back alert banner */}
      {unresolvedSendBacks && !alertDismissed && (
        <div style={{ background: '#fef2f2', borderBottom: '2px solid #fca5a5', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle style={{ width: 16, height: 16, color: '#dc2626', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', flex: 1 }}>This job has been sent back — review flagged stages below</span>
          <button onClick={() => setAlertDismissed(true)}
            style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#fff', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
          <button onClick={() => router.push('/jobs')}
            style={{ padding: 6, borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft style={{ width: 20, height: 20, color: '#374151' }} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontWeight: 800, color: '#111827', fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.title}</h1>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.customer?.name || '—'} · {vehicle}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {saving && <Loader2 style={{ width: 14, height: 14, color: '#9ca3af', animation: 'spin 1s linear infinite' }} />}
            <Link href={`/projects/${jobId}/edit`}
              style={{ padding: 6, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>
              <Edit3 style={{ width: 16, height: 16 }} />
            </Link>
          </div>
        </div>
        <PipelineBar checklist={checklist} approvals={approvals} />
      </div>

      <div style={{ maxWidth: 672, margin: '0 auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Summary card */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Revenue', value: project.revenue ? `$${project.revenue.toLocaleString()}` : '—', color: '' },
              { label: 'GPM', value: project.gpm ? `${project.gpm.toFixed(1)}%` : '—', color: project.gpm && project.gpm >= 40 ? '#16a34a' : project.gpm && project.gpm < 25 ? '#dc2626' : '' },
              { label: 'Sqft', value: project.sqft ? `${project.sqft}` : '—', color: '' },
              { label: 'Install', value: project.install_date ? new Date(project.install_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—', color: '' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center', padding: 8, background: '#f9fafb', borderRadius: 10 }}>
                <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 2px' }}>{label}</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: color || '#111827', margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
            {[
              { href: `/projects/${jobId}`, icon: FileText, label: 'Job' },
              { href: `/design`, icon: Brush, label: 'Design' },
              { href: `/projects/${jobId}`, icon: Camera, label: 'Photos' },
              { href: `/projects/${jobId}`, icon: Package, label: 'Files' },
            ].map(({ href, icon: Icon, label }) => (
              <Link key={label} href={href}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#374151', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 10px', textDecoration: 'none', fontWeight: 600 }}>
                <Icon style={{ width: 12, height: 12 }} /> {label}
              </Link>
            ))}
            {project.customer?.phone && (
              <a href={`tel:${project.customer.phone}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#374151', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 10px', textDecoration: 'none', fontWeight: 600 }}>
                <Phone style={{ width: 12, height: 12 }} /> Call
              </a>
            )}
          </div>
        </div>

        {/* Dept sections */}
        {STAGE_ORDER.map(dept => (
          <DeptSection
            key={dept}
            dept={dept}
            project={project}
            checklist={checklist}
            approval={approvals.find(a => a.stage === dept)}
            sendBacks={sendBacks}
            tasks={tasks}
            comments={comments}
            profiles={profiles}
            assignedProfile={assigned[dept]}
            lineItems={lineItems}
            onCheckItem={handleCheckItem}
            onApprove={handleApprove}
            onAddComment={handleAddComment}
            currentUserId={currentUserId}
          />
        ))}

        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
