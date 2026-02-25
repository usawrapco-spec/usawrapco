'use client'

import { useState, useRef, useContext, createContext } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Eye, Pencil, Copy, Zap, User, Phone, MessageSquare,
  MoreVertical, Wrench, X, Calendar, Clock,
  CheckCircle, ExternalLink, ImagePlay,
} from 'lucide-react'
import { RaceTrackTimeline } from './RaceTrackTimeline'

// ─── Card Field Types (exported for KanbanBoard) ─────────────────────────────

export type CardField =
  | 'customer_name' | 'vehicle' | 'stage' | 'agent' | 'installer'
  | 'designer' | 'revenue' | 'due_date' | 'install_date' | 'contract_status'
  | 'priority' | 'division' | 'days_in_stage' | 'deposit_status' | 'photo_thumb'

export const FIELD_LABELS: Record<CardField, string> = {
  customer_name: 'Customer Name',
  vehicle: 'Vehicle',
  stage: 'Stage Badge',
  agent: 'Agent',
  installer: 'Installer',
  designer: 'Designer',
  revenue: 'Revenue / Financials',
  due_date: 'Due Date',
  install_date: 'Install Date',
  contract_status: 'Contract Status',
  priority: 'Priority Badge',
  division: 'Division Tag',
  days_in_stage: 'Days in Stage',
  deposit_status: 'Deposit Status',
  photo_thumb: 'Photo Thumbnail',
}

export const ALL_FIELDS: CardField[] = [
  'customer_name', 'vehicle', 'revenue', 'agent', 'installer', 'designer',
  'stage', 'install_date', 'due_date', 'contract_status', 'deposit_status',
  'priority', 'division', 'days_in_stage', 'photo_thumb',
]

export const DEPT_DEFAULT_FIELDS: Record<string, CardField[]> = {
  sales:      ['customer_name', 'vehicle', 'revenue', 'agent', 'stage', 'contract_status'],
  production: ['customer_name', 'vehicle', 'stage', 'due_date'],
  install:    ['customer_name', 'vehicle', 'installer', 'install_date', 'contract_status'],
  all:        ['customer_name', 'vehicle', 'revenue', 'agent', 'stage'],
}

// Context for card field visibility — provided by KanbanBoard
export const CardFieldsContext = createContext<CardField[]>([])

// ─── Constants ───────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  sales_in: '#4f7fff', production: '#22c07a', install: '#22d3ee',
  prod_review: '#f59e0b', sales_close: '#8b5cf6',
}

const STAGE_LABELS: Record<string, string> = {
  sales_in: 'Sales', production: 'Production', install: 'Install',
  prod_review: 'QC Review', sales_close: 'Close', done: 'Done',
}

const STATUS_COLORS: Record<string, string> = {
  estimate: '#f59e0b', active: '#22c55e', in_production: '#3b82f6',
  install_scheduled: '#06b6d4', installed: '#8b5cf6', qc: '#ef4444',
  closing: '#a855f7', closed: '#6b7280', cancelled: '#374151',
}

const PIPE_STAGES = [
  { key: 'sales_in',    label: 'Sales',      color: '#4f7fff' },
  { key: 'production',  label: 'Production', color: '#22c07a' },
  { key: 'install',     label: 'Install',    color: '#22d3ee' },
  { key: 'prod_review', label: 'QC',         color: '#f59e0b' },
  { key: 'sales_close', label: 'Close',      color: '#8b5cf6' },
]

const fM = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const fDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'

// ─── Props ───────────────────────────────────────────────────────────────────

interface PipelineJobCardProps {
  project: any
  department: 'sales' | 'production' | 'install'
  isGhost: boolean
  onClick?: () => void
  isDragging?: () => boolean
}

// ─── Small ActionBtn ─────────────────────────────────────────────────────────

function ActionBtn({
  icon: Icon, onClick, title, color = 'var(--text3)',
}: {
  icon: React.ElementType
  onClick: (e: React.MouseEvent) => void
  title: string
  color?: string
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
        background: hov ? 'rgba(79,127,255,0.1)' : 'var(--surface)',
        border: `1px solid ${hov ? 'var(--accent)' : 'var(--border)'}`,
        color: hov ? 'var(--accent)' : color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.12s', padding: 0,
      }}
    >
      <Icon size={12} />
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PipelineJobCard({
  project, department, isGhost, onClick, isDragging,
}: PipelineJobCardProps) {
  const router = useRouter()
  const supabase = createClient()

  const [showActions, setShowActions] = useState(false)
  const [recapPos, setRecapPos] = useState<{ top: number; left: number } | null>(null)
  const [stagePos, setStagePos] = useState<{ top: number; left: number } | null>(null)
  const [morePos, setMorePos] = useState<{ top: number; left: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copying, setCopying] = useState(false)

  const cardRef = useRef<HTMLDivElement>(null)
  const visibleFields = useContext(CardFieldsContext)

  // ── Data extraction ──────────────────────────────────────────────────────
  const fd = (project.form_data as any) || {}
  const stage = project.pipe_stage || 'sales_in'
  const stageColor = STAGE_COLORS[stage] || '#4f7fff'
  const statusColor = STATUS_COLORS[project.status] || '#6b7280'

  const customerName = (project.customer as any)?.name || fd.client || fd.clientName || project.title || 'Untitled'
  const vehicle = project.vehicle_desc || fd.vehicle || ''
  const jobType = fd.jobType || project.type || ''
  const revenue = project.revenue || 0
  const profit = project.profit || 0
  const gpm = project.gpm || 0
  const installDate = project.install_date || fd.installDate
  const agentName = (project.agent as any)?.name || fd.agent || ''
  const installerName = (project.installer as any)?.name || fd.installer || ''
  const designerName = (project.designer as any)?.name || fd.designer || ''
  const contractSigned = !!(fd.contractSigned || fd.contract_signed)
  const depositPaid = !!(fd.depositPaid || fd.deposit_paid || project.deposit_status === 'paid')
  const mockupUrl = fd.mockup_url || fd.mockupUrl || null
  const hasSendBack = (project.send_backs as any[])?.some?.((sb: any) => !sb.resolved)

  // ── Urgency ──────────────────────────────────────────────────────────────
  let urgency = ''; let urgencyColor = 'var(--text3)'
  if (installDate) {
    const days = Math.ceil((new Date(installDate).getTime() - Date.now()) / 86400000)
    if (days < 0) { urgency = `${Math.abs(days)}d overdue`; urgencyColor = '#ef4444' }
    else if (days === 0) { urgency = 'TODAY'; urgencyColor = '#ef4444' }
    else if (days <= 2) { urgency = `${days}d`; urgencyColor = '#f59e0b' }
    else if (days <= 5) { urgency = `${days}d`; urgencyColor = '#22c55e' }
    else { urgency = `${days}d`; urgencyColor = 'var(--text3)' }
  }

  const daysInStage = project.updated_at
    ? Math.floor((Date.now() - new Date(project.updated_at).getTime()) / 86400000)
    : 0

  // Effective visible fields (context or department default)
  const fields = visibleFields.length > 0
    ? visibleFields
    : (DEPT_DEFAULT_FIELDS[department] || DEPT_DEFAULT_FIELDS.all)

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleNavigate = () => {
    if (isDragging?.()) return
    if (onClick) onClick()
    else router.push(`/projects/${project.id}`)
  }

  const closeAll = () => {
    setRecapPos(null)
    setStagePos(null)
    setMorePos(null)
    setConfirmDelete(false)
  }

  const openRecap = (e: React.MouseEvent) => {
    e.stopPropagation()
    closeAll()
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      const top = Math.max(8, Math.min(rect.top, window.innerHeight - 440))
      const rightSpace = window.innerWidth - rect.right - 8
      const left = rightSpace >= 316 ? rect.right + 8 : rect.left - 316
      setRecapPos({ top, left: Math.max(8, left) })
    }
  }

  const openMoveStage = (e: React.MouseEvent) => {
    e.stopPropagation()
    closeAll()
    const btn = e.currentTarget as HTMLElement
    const rect = btn.getBoundingClientRect()
    const top = Math.min(rect.top, window.innerHeight - 240)
    const left = rect.right + 8
    setStagePos({ top, left: left + 168 > window.innerWidth ? rect.left - 176 : left })
  }

  const openMore = (e: React.MouseEvent) => {
    e.stopPropagation()
    closeAll()
    const btn = e.currentTarget as HTMLElement
    const rect = btn.getBoundingClientRect()
    const top = Math.min(rect.top, window.innerHeight - 200)
    const left = rect.right + 8
    setMorePos({ top, left: left + 168 > window.innerWidth ? rect.left - 176 : left })
  }

  const handleMoveStage = async (newStage: string) => {
    await supabase.from('projects').update({
      pipe_stage: newStage, updated_at: new Date().toISOString(),
    }).eq('id', project.id)
    setStagePos(null)
  }

  const handleCopyJob = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (copying) return
    setCopying(true)
    const { data } = await supabase.from('projects').insert({
      org_id: project.org_id,
      title: `Copy of ${project.title || customerName}`,
      status: 'estimate',
      pipe_stage: 'sales_in',
      type: project.type,
      revenue: project.revenue,
      vehicle_desc: project.vehicle_desc,
      form_data: { ...fd, client: `Copy of ${customerName}` },
      agent_id: project.agent_id,
    }).select('id').single()
    setCopying(false)
    if (data?.id) router.push(`/projects/${data.id}`)
  }

  const handleDelete = async () => {
    await supabase.from('projects').delete().eq('id', project.id)
    closeAll()
  }

  const handleArchive = async () => {
    await supabase.from('projects').update({
      status: 'cancelled', updated_at: new Date().toISOString(),
    }).eq('id', project.id)
    closeAll()
  }

  const handleCallCustomer = (e: React.MouseEvent) => {
    e.stopPropagation()
    const phone = fd.clientPhone || fd.phone || (project.customer as any)?.phone
    if (phone) {
      navigator.clipboard?.writeText(phone).catch(() => {})
    }
    router.push(`/projects/${project.id}`)
  }

  const handleMessage = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push('/inbox')
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/projects/${project.id}/edit`)
  }

  const handleAssign = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/projects/${project.id}`)
  }

  const hasPopup = !!(recapPos || stagePos || morePos)

  return (
    <>
      {/* Click-away backdrop */}
      {hasPopup && typeof window !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9990 }}
          onClick={closeAll}
        />,
        document.body
      )}

      {/* Outer wrapper: card body + action strip */}
      <div
        ref={cardRef}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}
        onMouseEnter={() => !isGhost && setShowActions(true)}
        onMouseLeave={() => !isGhost && setShowActions(false)}
      >
        {/* ── Card Body ──────────────────────────────────────────── */}
        <div
          onClick={handleNavigate}
          style={{
            flex: 1, minWidth: 0,
            background: isGhost ? 'transparent' : 'var(--surface2)',
            border: `1px solid ${hasSendBack ? '#ef444440' : 'var(--border)'}`,
            borderLeft: isGhost
              ? `3px dashed ${stageColor}30`
              : `3px solid ${stageColor}`,
            borderRadius: 10,
            padding: '10px 12px',
            cursor: 'pointer',
            opacity: isGhost ? 0.45 : 1,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
            position: 'relative',
          }}
          onMouseEnter={e => {
            if (!isGhost) {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = `0 4px 14px ${stageColor}20`
              e.currentTarget.style.borderColor = stageColor
            }
          }}
          onMouseLeave={e => {
            if (!isGhost) {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.borderColor = hasSendBack ? '#ef444440' : 'var(--border)'
            }
          }}
        >
          {/* Race track */}
          {!isGhost && <RaceTrackTimeline project={project} />}

          {/* Send-back badge */}
          {hasSendBack && !isGhost && (
            <div style={{
              position: 'absolute', top: -6, right: 8,
              background: '#ef4444', color: '#fff',
              fontSize: 9, fontWeight: 900, padding: '1px 6px', borderRadius: 4,
            }}>
              SENT BACK
            </div>
          )}

          {/* Ghost badge */}
          {isGhost && (
            <div style={{
              position: 'absolute', top: -6, right: 8,
              background: 'var(--surface2)', color: 'var(--text3)',
              fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
              border: '1px solid var(--border)',
            }}>
              IN {STAGE_LABELS[stage]?.toUpperCase()}
            </div>
          )}

          {/* Photo thumbnail */}
          {fields.includes('photo_thumb') && mockupUrl && (
            <div style={{ width: '100%', height: 72, borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
              <img src={mockupUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          {/* Customer name */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
            <div style={{
              fontSize: 13, fontWeight: 800, color: 'var(--text1)', lineHeight: 1.2,
              flex: 1, marginRight: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {customerName}
            </div>
            {urgency && fields.includes('install_date') && (
              <span style={{ fontSize: 10, fontWeight: 800, color: urgencyColor, whiteSpace: 'nowrap' }}>
                {urgency}
              </span>
            )}
          </div>

          {/* Vehicle + job type */}
          {fields.includes('vehicle') && (
            <div style={{
              fontSize: 11, color: 'var(--text3)', marginBottom: 6, lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {vehicle}{vehicle && jobType ? ' · ' : ''}{jobType}
              {fd.wrapDetail ? ` · ${fd.wrapDetail}` : ''}
            </div>
          )}

          {/* Revenue strip */}
          {fields.includes('revenue') && !isGhost && revenue > 0 && (
            <div style={{
              display: 'flex', gap: 10, marginBottom: 6,
              padding: '4px 0',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
            }}>
              <MiniStat label="Sale" value={fM(revenue)} color="var(--accent)" />
              <MiniStat label="Profit" value={fM(profit)} color={profit >= 0 ? 'var(--green)' : '#ef4444'} />
              <MiniStat label="GPM" value={`${Math.round(gpm)}%`} color={gpm >= 70 ? 'var(--green)' : gpm >= 55 ? '#f59e0b' : '#ef4444'} />
            </div>
          )}

          {/* Install date */}
          {fields.includes('install_date') && installDate && (
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>
              <Calendar size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
              {fDate(installDate)}
              {!fields.includes('revenue') && urgency && (
                <span style={{ marginLeft: 6, color: urgencyColor, fontWeight: 700 }}>{urgency}</span>
              )}
            </div>
          )}

          {/* Due date */}
          {fields.includes('due_date') && fd.dueDate && (
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>
              <Clock size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
              Due {fDate(fd.dueDate)}
            </div>
          )}

          {/* Badge row: people + status fields */}
          {(() => {
            const badges: React.ReactNode[] = []
            if (fields.includes('agent') && agentName) badges.push(
              <span key="agent" style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(79,127,255,0.1)', color: '#4f7fff' }}>
                {agentName.split(' ')[0]}
              </span>
            )
            if (fields.includes('installer') && installerName) badges.push(
              <span key="inst" style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(34,211,238,0.1)', color: '#22d3ee' }}>
                <Wrench size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> {installerName.split(' ')[0]}
              </span>
            )
            if (fields.includes('designer') && designerName) badges.push(
              <span key="des" style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                {designerName.split(' ')[0]}
              </span>
            )
            if (fields.includes('contract_status')) badges.push(
              <span key="ctr" style={{ fontSize: 9, fontWeight: 700, color: contractSigned ? '#22c07a' : '#f25a5a' }}>
                {contractSigned ? '● Contract' : '○ Contract'}
              </span>
            )
            if (fields.includes('deposit_status')) badges.push(
              <span key="dep" style={{ fontSize: 9, fontWeight: 700, color: depositPaid ? '#22c07a' : '#f59e0b' }}>
                {depositPaid ? '● Deposit' : '○ Deposit'}
              </span>
            )
            if (fields.includes('stage')) badges.push(
              <span key="stg" style={{
                fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4,
                background: `${stageColor}15`, color: stageColor, border: `1px solid ${stageColor}30`,
              }}>
                {STAGE_LABELS[stage] || stage}
              </span>
            )
            if (fields.includes('days_in_stage') && daysInStage > 0) badges.push(
              <span key="dis" style={{ fontSize: 9, fontWeight: 600, color: daysInStage > 7 ? '#ef4444' : 'var(--text3)' }}>
                {daysInStage}d
              </span>
            )
            return badges.length > 0
              ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>{badges}</div>
              : null
          })()}

          {/* Bid status */}
          {!isGhost && project.installer_bid && project.installer_bid.status !== 'none' && (
            <div style={{ marginBottom: 4 }}>
              <span style={{
                fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase',
                background: project.installer_bid.status === 'accepted' ? 'rgba(34,192,122,0.12)' : 'rgba(245,158,11,0.12)',
                color: project.installer_bid.status === 'accepted' ? '#22c07a' : '#f59e0b',
                border: `1px solid ${project.installer_bid.status === 'accepted' ? 'rgba(34,192,122,0.25)' : 'rgba(245,158,11,0.25)'}`,
              }}>
                BID {project.installer_bid.status}
              </span>
            </div>
          )}

          {/* Status + ID */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 5, textTransform: 'uppercase',
              background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30`,
            }}>
              {project.status?.replace(/_/g, ' ')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {!isGhost && (project.render_count as number) > 0 && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 4,
                  background: 'rgba(79,127,255,0.1)', color: 'var(--accent)',
                  border: '1px solid rgba(79,127,255,0.25)',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <ImagePlay size={9} /> {project.render_count}
                </span>
              )}
              <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                #{project.id?.slice(-6)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Action Buttons Strip ──────────────────────────────────── */}
        {!isGhost && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 3,
            opacity: showActions ? 1 : 0,
            transition: 'opacity 0.15s',
            width: 28, flexShrink: 0, paddingTop: 2,
            pointerEvents: showActions ? 'auto' : 'none',
          }}>
            <ActionBtn icon={Eye}            onClick={openRecap}          title="Quick Recap"       color="var(--accent)" />
            <ActionBtn icon={Pencil}         onClick={handleEdit}         title="Edit Job" />
            <ActionBtn icon={Copy}           onClick={handleCopyJob}      title={copying ? 'Copying…' : 'Copy Job'} />
            <ActionBtn icon={Zap}            onClick={openMoveStage}      title="Move Stage"        color="#f59e0b" />
            <ActionBtn icon={User}           onClick={handleAssign}       title="Assign Agent"      color="#8b5cf6" />
            <ActionBtn icon={Phone}          onClick={handleCallCustomer} title="Call Customer"     color="var(--green)" />
            <ActionBtn icon={MessageSquare}  onClick={handleMessage}      title="Message Customer"  color="var(--cyan)" />
            <ActionBtn icon={MoreVertical}   onClick={openMore}           title="More Options" />
          </div>
        )}
      </div>

      {/* ── Portals ────────────────────────────────────────────────────────── */}

      {/* Quick Recap popup */}
      {recapPos && typeof window !== 'undefined' && createPortal(
        <QuickRecapPopup
          project={project}
          pos={recapPos}
          onClose={closeAll}
          onNavigate={() => { closeAll(); router.push(`/projects/${project.id}`) }}
          onMoveStageClick={(e: React.MouseEvent) => {
            setRecapPos(null)
            // reuse cardRef position for stage popup
            if (cardRef.current) {
              const rect = cardRef.current.getBoundingClientRect()
              const left = rect.right + 8
              setStagePos({
                top: Math.min(rect.top + 80, window.innerHeight - 240),
                left: left + 168 > window.innerWidth ? rect.left - 176 : left,
              })
            }
          }}
          onMessage={() => { closeAll(); router.push('/inbox') }}
          customerName={customerName}
          vehicle={vehicle}
          revenue={revenue}
          agentName={agentName}
          installerName={installerName}
          installDate={installDate}
          stage={stage}
          stageColor={stageColor}
          contractSigned={contractSigned}
          depositPaid={depositPaid}
          hasSendBack={hasSendBack}
          checkout={project.checkout}
        />,
        document.body
      )}

      {/* Move Stage popup */}
      {stagePos && typeof window !== 'undefined' && createPortal(
        <MoveStagePopup
          currentStage={stage}
          pos={stagePos}
          onClose={() => setStagePos(null)}
          onSelect={handleMoveStage}
        />,
        document.body
      )}

      {/* More menu */}
      {morePos && typeof window !== 'undefined' && createPortal(
        <MoreMenu
          pos={morePos}
          confirmDelete={confirmDelete}
          setConfirmDelete={setConfirmDelete}
          onClose={closeAll}
          onDelete={handleDelete}
          onArchive={handleArchive}
          onPrint={() => { closeAll(); window.print() }}
          onShare={() => {
            navigator.clipboard?.writeText(`${window.location.origin}/projects/${project.id}`).catch(() => {})
            closeAll()
          }}
        />,
        document.body
      )}
    </>
  )
}

// ─── Quick Recap Popup ────────────────────────────────────────────────────────

function QuickRecapPopup({
  project, pos, onClose, onNavigate, onMoveStageClick, onMessage,
  customerName, vehicle, revenue, agentName, installerName,
  installDate, stage, stageColor, contractSigned, depositPaid,
  hasSendBack, checkout,
}: any) {
  const fmtRevenue = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const lastActivity = project.updated_at
    ? `${new Date(project.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${new Date(project.updated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : 'No activity'

  const installUrgencyColor = (() => {
    if (!installDate) return 'var(--text3)'
    const d = Math.ceil((new Date(installDate).getTime() - Date.now()) / 86400000)
    return d < 0 ? '#ef4444' : d <= 3 ? '#f59e0b' : 'var(--text3)'
  })()

  const stageOrder = ['sales_in', 'production', 'install', 'prod_review', 'sales_close']
  const currentIdx = stageOrder.indexOf(stage)

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed', top: pos.top, left: pos.left,
        zIndex: 9999, width: 308,
        background: 'var(--surface)',
        border: `1px solid ${stageColor}50`,
        borderRadius: 12,
        boxShadow: `0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px ${stageColor}15`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: `2px solid ${stageColor}30`,
        background: `${stageColor}08`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <div style={{
            fontSize: 9, fontWeight: 900, color: stageColor,
            textTransform: 'uppercase', letterSpacing: '.1em',
            fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 2,
          }}>
            JOB QUICK RECAP
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)', lineHeight: 1.2 }}>{customerName}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>{vehicle || 'No vehicle'}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '2px 4px' }}>
          <X size={14} />
        </button>
      </div>

      {/* Info grid */}
      <div style={{ padding: '10px 14px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 16px', marginBottom: 10 }}>
          <RecapRow label="Revenue"     value={revenue ? fmtRevenue(revenue) : '—'}  color="var(--green)" />
          <RecapRow label="Stage"       value={STAGE_LABELS[stage] || stage}          color={stageColor} />
          <RecapRow label="Agent"       value={agentName || '—'} />
          <RecapRow label="Installer"   value={installerName || '—'} />
          <RecapRow
            label="Contract"
            value={contractSigned ? 'Signed' : 'Not signed'}
            color={contractSigned ? '#22c07a' : '#f25a5a'}
          />
          <RecapRow
            label="Deposit"
            value={depositPaid ? 'Paid' : 'Unpaid'}
            color={depositPaid ? '#22c07a' : '#f59e0b'}
          />
          <RecapRow
            label="Install Date"
            value={installDate ? new Date(installDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            color={installUrgencyColor}
          />
          <RecapRow label="Job ID" value={`#${project.id?.slice(-6)}`} color="var(--text3)" />
        </div>

        {/* Mini pipeline progress */}
        <div style={{
          padding: '8px 0', marginBottom: 8,
          borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
            Pipeline Progress
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {PIPE_STAGES.map((s, i) => {
              const thisIdx = stageOrder.indexOf(s.key)
              const isDone = checkout?.[s.key] || thisIdx < currentIdx
              const isCurrent = s.key === stage
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div title={s.label} style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: isDone || isCurrent ? `${s.color}18` : 'var(--surface2)',
                    border: `2px solid ${isDone || isCurrent ? s.color : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isDone
                      ? <CheckCircle size={10} style={{ color: s.color }} />
                      : isCurrent
                        ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                        : <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border)' }} />
                    }
                  </div>
                  {i < PIPE_STAGES.length - 1 && (
                    <div style={{ flex: 1, height: 2, margin: '0 2px', background: isDone ? `${s.color}60` : 'var(--border)' }} />
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', marginTop: 4 }}>
            {PIPE_STAGES.map(s => (
              <div key={s.key} style={{
                flex: 1, fontSize: 7, fontWeight: 700, textAlign: 'center',
                color: s.key === stage ? s.color : 'var(--text3)',
              }}>
                {s.key === stage ? s.label : ''}
              </div>
            ))}
          </div>
        </div>

        {/* Last activity */}
        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 10 }}>
          <span style={{ fontWeight: 600 }}>Last activity: </span>{lastActivity}
          {hasSendBack && <span style={{ marginLeft: 6, color: '#ef4444', fontWeight: 700 }}>· SENT BACK</span>}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 5, padding: '0 14px 12px' }}>
        {[
          { label: 'Message', color: 'var(--cyan)', action: onMessage },
          { label: 'Move Stage', color: '#f59e0b', action: onMoveStageClick },
        ].map(btn => (
          <button
            key={btn.label}
            onClick={btn.action}
            style={{
              flex: 1, padding: '6px 0',
              background: 'transparent', border: `1px solid ${btn.color}40`,
              borderRadius: 6, color: btn.color,
              fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = `${btn.color}12`}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {btn.label}
          </button>
        ))}
        <button
          onClick={onNavigate}
          style={{
            flex: 1.5, padding: '6px 0',
            background: 'var(--accent)', border: 'none', borderRadius: 6,
            color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            transition: 'box-shadow 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(79,127,255,0.4)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
          <ExternalLink size={10} />
          Open Full Job
        </button>
      </div>
    </div>
  )
}

function RecapRow({ label, value, color = 'var(--text1)' }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

// ─── Move Stage Popup ─────────────────────────────────────────────────────────

function MoveStagePopup({ currentStage, pos, onClose, onSelect }: {
  currentStage: string
  pos: { top: number; left: number }
  onClose: () => void
  onSelect: (stage: string) => void
}) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed', top: pos.top, left: pos.left,
        zIndex: 9999,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '4px 4px 6px',
        boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
        minWidth: 168,
      }}
    >
      <div style={{
        fontSize: 8, fontWeight: 900, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '.1em',
        padding: '4px 10px 6px',
      }}>
        Move to Stage
      </div>
      {PIPE_STAGES.map(s => (
        <button
          key={s.key}
          onClick={() => onSelect(s.key)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 7, border: 'none',
            background: s.key === currentStage ? `${s.color}15` : 'transparent',
            color: s.key === currentStage ? s.color : 'var(--text2)',
            fontSize: 12, fontWeight: s.key === currentStage ? 800 : 600,
            cursor: s.key === currentStage ? 'default' : 'pointer',
            textAlign: 'left', transition: 'background 0.1s',
          }}
          onMouseEnter={e => { if (s.key !== currentStage) e.currentTarget.style.background = `${s.color}10` }}
          onMouseLeave={e => { if (s.key !== currentStage) e.currentTarget.style.background = 'transparent' }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
          {s.label}
          {s.key === currentStage && <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.6 }}>current</span>}
        </button>
      ))}
    </div>
  )
}

// ─── More Menu ────────────────────────────────────────────────────────────────

function MoreMenu({
  pos, onClose, onDelete, onArchive, onPrint, onShare, confirmDelete, setConfirmDelete,
}: {
  pos: { top: number; left: number }
  onClose: () => void
  onDelete: () => void
  onArchive: () => void
  onPrint: () => void
  onShare: () => void
  confirmDelete: boolean
  setConfirmDelete: (v: boolean) => void
}) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed', top: pos.top, left: pos.left,
        zIndex: 9999,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 4,
        boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
        minWidth: 168,
      }}
    >
      {confirmDelete ? (
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 12, color: 'var(--text1)', fontWeight: 700, marginBottom: 8 }}>
            Delete this job?
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={onDelete}
              style={{ flex: 1, padding: '6px 0', background: '#ef4444', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{ flex: 1, padding: '6px 0', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text2)', fontSize: 11, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {[
            { label: 'Print Job Sheet', action: onPrint },
            { label: 'Copy Link', action: onShare },
            { label: 'Archive Job', action: onArchive, color: '#f59e0b' },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                width: '100%', display: 'block', textAlign: 'left',
                padding: '7px 10px', borderRadius: 7, border: 'none',
                background: 'transparent', color: item.color || 'var(--text2)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {item.label}
            </button>
          ))}
          <div style={{ height: 1, background: 'var(--border)', margin: '3px 0' }} />
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              width: '100%', display: 'block', textAlign: 'left',
              padding: '7px 10px', borderRadius: 7, border: 'none',
              background: 'transparent', color: '#ef4444',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Delete Job
          </button>
        </>
      )}
    </div>
  )
}

// ─── Mini Stat ────────────────────────────────────────────────────────────────

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  )
}
