'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Clock } from 'lucide-react'

export interface TimelineMilestone {
  key: string
  label: string
  status: 'done' | 'in_progress' | 'pending'
  completedAt?: string | null
  completedBy?: string | null
}

interface Props {
  milestones: TimelineMilestone[]
  onMilestoneClick?: (key: string) => void
}

const DEFAULT_MILESTONES: TimelineMilestone[] = [
  { key: 'job_created',       label: 'Job Created',           status: 'pending' },
  { key: 'vehicle_complete',  label: 'Vehicle Info',          status: 'pending' },
  { key: 'design_brief',      label: 'Design Brief',          status: 'pending' },
  { key: 'intake_submitted',  label: 'Customer Intake',       status: 'pending' },
  { key: 'mockup_approved',   label: 'Mockup Approved',       status: 'pending' },
  { key: 'so_signed',         label: 'SO Signed',             status: 'pending' },
  { key: 'print_file_ready',  label: 'Print File',            status: 'pending' },
  { key: 'material_ordered',  label: 'Material Ordered',      status: 'pending' },
  { key: 'print_complete',    label: 'Print Done',            status: 'pending' },
  { key: 'install_scheduled', label: 'Install Scheduled',     status: 'pending' },
  { key: 'vehicle_dropped',   label: 'Vehicle Dropped Off',   status: 'pending' },
  { key: 'install_complete',  label: 'Install Complete',      status: 'pending' },
  { key: 'customer_signoff',  label: 'Customer Sign-Off',     status: 'pending' },
  { key: 'invoice_paid',      label: 'Invoice Paid',          status: 'pending' },
]

export function buildMilestones(formData: Record<string, any>, projectCreatedAt?: string): TimelineMilestone[] {
  const ms = DEFAULT_MILESTONES.map(m => ({ ...m }))

  function set(key: string, status: TimelineMilestone['status'], at?: string, by?: string) {
    const m = ms.find(x => x.key === key)
    if (m) { m.status = status; m.completedAt = at; m.completedBy = by }
  }

  // Job Created — always done
  set('job_created', 'done', projectCreatedAt)

  // Vehicle complete
  if (formData.vehicle_year && formData.vehicle_make && formData.vehicle_model) {
    set('vehicle_complete', 'done')
  } else {
    set('vehicle_complete', 'in_progress')
  }

  // Design brief
  if (formData.design_brief?.trim()) {
    set('design_brief', 'done')
  }

  // Customer intake submitted
  if (formData.intake_submitted_at) {
    set('intake_submitted', 'done', formData.intake_submitted_at)
  }

  // Mockup approved
  if (formData.mockup_approved_at) {
    set('mockup_approved', 'done', formData.mockup_approved_at)
  }

  // SO signed (signoff_confirmed)
  if (formData.signoff_confirmed && formData.signoff_name) {
    set('so_signed', 'done')
  }

  // Production data
  const prod = formData.production_data || {}
  if (prod.print_file_ref) set('print_file_ready', 'done')
  if (prod.material_ordered_at) set('material_ordered', 'done', prod.material_ordered_at)
  if (prod.print_complete_at) set('print_complete', 'done', prod.print_complete_at)

  // Install
  const ic = formData.install_contact || {}
  if (ic.name) set('install_scheduled', 'in_progress')
  if (formData.dropoff_inspection?.received_at) set('vehicle_dropped', 'done', formData.dropoff_inspection.received_at)
  if (formData.install_checklist?.install_complete) set('install_complete', 'done')
  if (formData.signoff_confirmed && formData.dropoff_inspection?.customer_signed) set('customer_signoff', 'done')
  if (formData.invoice_paid_at) set('invoice_paid', 'done', formData.invoice_paid_at)

  return ms
}

const STATUS_COLOR: Record<string, string> = {
  done: '#22c07a',
  in_progress: '#f59e0b',
  pending: '#5a6080',
}

const STATUS_BG: Record<string, string> = {
  done: 'rgba(34,192,122,0.15)',
  in_progress: 'rgba(245,158,11,0.15)',
  pending: 'rgba(90,96,128,0.1)',
}

export default function JobTimeline({ milestones, onMilestoneClick }: Props) {
  const [tooltip, setTooltip] = useState<string | null>(null)
  const doneCount = milestones.filter(m => m.status === 'done').length
  const totalCount = milestones.length
  const pct = Math.round((doneCount / totalCount) * 100)

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '14px 20px',
      marginBottom: 16,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            fontSize: 10, fontWeight: 800, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.12em',
            fontFamily: 'Barlow Condensed, sans-serif',
          }}>
            Job Timeline
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
            background: pct === 100 ? 'rgba(34,192,122,0.15)' : 'rgba(79,127,255,0.12)',
            color: pct === 100 ? 'var(--green)' : 'var(--accent)',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {doneCount}/{totalCount} · {pct}%
          </span>
        </div>
      </div>

      {/* Track */}
      <div style={{ position: 'relative', paddingBottom: 28 }}>
        {/* Connector line background */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          height: 3,
          background: 'var(--surface2)',
          borderRadius: 2,
          zIndex: 0,
        }} />
        {/* Connector line fill */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          width: `calc(${pct}% - 12px)`,
          height: 3,
          background: 'linear-gradient(90deg, #4f7fff, #22c07a)',
          borderRadius: 2,
          zIndex: 1,
          transition: 'width 0.6s ease',
          boxShadow: pct > 0 ? '0 0 8px rgba(34,192,122,0.5)' : 'none',
        }} />

        {/* Nodes */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 2,
          overflowX: 'auto',
          gap: 0,
        }}>
          {milestones.map((m, i) => {
            const color = STATUS_COLOR[m.status]
            const bg = STATUS_BG[m.status]
            const isActive = m.status === 'in_progress'
            const isDone = m.status === 'done'

            return (
              <div
                key={m.key}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: onMilestoneClick ? 'pointer' : 'default', flexShrink: 0, minWidth: 0, position: 'relative' }}
                onClick={() => onMilestoneClick?.(m.key)}
                onMouseEnter={() => setTooltip(m.key)}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Node circle */}
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: bg,
                  border: `2px solid ${color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: isActive
                    ? `0 0 0 4px ${color}30, 0 0 12px ${color}60`
                    : isDone
                    ? `0 0 8px ${color}40`
                    : 'none',
                  animation: isActive ? 'pulse 2s ease-in-out infinite' : 'none',
                }}>
                  {isDone
                    ? <CheckCircle2 size={13} style={{ color }} />
                    : isActive
                    ? <Clock size={11} style={{ color }} />
                    : <Circle size={11} style={{ color: 'var(--text3)' }} />
                  }
                </div>

                {/* Label */}
                <div style={{
                  position: 'absolute',
                  top: 28,
                  fontSize: 9,
                  fontWeight: 700,
                  color: isDone ? 'var(--green)' : isActive ? '#f59e0b' : 'var(--text3)',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  fontFamily: 'Barlow Condensed, sans-serif',
                  maxWidth: 60,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {m.label}
                </div>

                {/* Tooltip */}
                {tooltip === m.key && m.completedAt && (
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: 8,
                    background: 'var(--surface)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 6,
                    padding: '5px 8px',
                    fontSize: 10,
                    color: 'var(--text2)',
                    whiteSpace: 'nowrap',
                    zIndex: 100,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  }}>
                    {m.completedBy && <span style={{ color: 'var(--text1)', fontWeight: 700 }}>{m.completedBy} · </span>}
                    {new Date(m.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(245,158,11,0.3), 0 0 8px rgba(245,158,11,0.4); }
          50% { box-shadow: 0 0 0 5px rgba(245,158,11,0.1), 0 0 16px rgba(245,158,11,0.6); }
        }
      `}</style>
    </div>
  )
}
