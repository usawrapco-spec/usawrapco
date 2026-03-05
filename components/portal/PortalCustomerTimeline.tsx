'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Clock } from 'lucide-react'
import type { TimelineMilestone } from '@/components/projects/JobTimeline'
import { C } from '@/lib/portal-theme'

// Customer-friendly labels for milestones
const CUSTOMER_LABELS: Record<string, string> = {
  job_created: 'Job Created',
  vehicle_complete: 'Vehicle Info Received',
  design_brief: 'Design Brief',
  intake_submitted: 'Intake Complete',
  mockup_approved: 'Design Approved',
  so_signed: 'Contract Signed',
  print_file_ready: 'Print File Ready',
  material_ordered: 'Materials Ordered',
  print_complete: 'Printing Complete',
  install_scheduled: 'Install Scheduled',
  vehicle_dropped: 'Vehicle Dropped Off',
  install_complete: 'Installation Complete',
  customer_signoff: 'Final Sign-Off',
  invoice_paid: 'Invoice Paid',
}

interface Props {
  milestones: TimelineMilestone[]
  compact?: boolean
}

export default function PortalCustomerTimeline({ milestones, compact }: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const doneCount = milestones.filter(m => m.status === 'done').length
  const totalCount = milestones.length
  const pct = Math.round((doneCount / totalCount) * 100)

  return (
    <div>
      {/* Completion header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: pct === 100 ? `${C.green}20` : `${C.accent}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 14,
            fontWeight: 800,
            color: pct === 100 ? C.green : C.accent,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {pct}%
          </span>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {pct === 100 ? 'All Done!' : pct >= 75 ? 'Almost There!' : pct >= 50 ? 'Halfway There' : 'Getting Started'}
          </div>
          <div style={{ fontSize: 12, color: C.text3 }}>
            {doneCount} of {totalCount} steps complete
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: C.surface2, borderRadius: 2, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: pct === 100 ? C.green : `linear-gradient(90deg, ${C.accent}, ${C.green})`,
          borderRadius: 2,
          transition: 'width 0.6s ease',
        }} />
      </div>

      {/* Vertical timeline */}
      <div style={{ position: 'relative' }}>
        {milestones.map((m, i) => {
          const isLast = i === milestones.length - 1
          const isDone = m.status === 'done'
          const isActive = m.status === 'in_progress'
          const color = isDone ? C.green : isActive ? '#f59e0b' : '#5a6080'
          const label = CUSTOMER_LABELS[m.key] || m.label
          const isExpanded = expandedKey === m.key

          return (
            <div
              key={m.key}
              onClick={() => setExpandedKey(isExpanded ? null : m.key)}
              style={{
                display: 'flex',
                gap: 12,
                cursor: 'pointer',
                position: 'relative',
                paddingBottom: isLast ? 0 : compact ? 12 : 16,
              }}
            >
              {/* Vertical line */}
              {!isLast && (
                <div style={{
                  position: 'absolute',
                  left: 11,
                  top: 24,
                  bottom: 0,
                  width: 2,
                  background: isDone ? `${C.green}40` : C.surface2,
                }} />
              )}

              {/* Orb */}
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: isDone ? `${C.green}20` : isActive ? 'rgba(245,158,11,0.15)' : 'rgba(90,96,128,0.1)',
                border: `2px solid ${color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: isActive
                  ? `0 0 0 4px rgba(245,158,11,0.2), 0 0 12px rgba(245,158,11,0.4)`
                  : isDone
                  ? `0 0 8px ${C.green}40`
                  : 'none',
                animation: isActive ? 'portalTimelinePulse 2s ease-in-out infinite' : 'none',
              }}>
                {isDone ? (
                  <CheckCircle2 size={13} color={C.green} />
                ) : isActive ? (
                  <Clock size={11} color="#f59e0b" />
                ) : (
                  <Circle size={11} color="#5a6080" />
                )}
              </div>

              {/* Label + details */}
              <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: isDone || isActive ? 600 : 400,
                  color: isDone ? C.text1 : isActive ? '#f59e0b' : C.text3,
                }}>
                  {label}
                </div>
                {isExpanded && m.completedAt && (
                  <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                    Completed {new Date(m.completedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                )}
                {isActive && !compact && (
                  <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>In progress</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes portalTimelinePulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(245,158,11,0.3), 0 0 8px rgba(245,158,11,0.4); }
          50% { box-shadow: 0 0 0 5px rgba(245,158,11,0.1), 0 0 16px rgba(245,158,11,0.6); }
        }
      `}</style>
    </div>
  )
}
