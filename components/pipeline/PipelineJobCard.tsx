'use client'

import { useState } from 'react'

interface PipelineJobCardProps {
  project: any
  department: 'sales' | 'production' | 'install'
  isGhost: boolean
  onClick: () => void
}

const fM = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const STATUS_COLORS: Record<string, string> = {
  estimate: '#f59e0b',
  active: '#22c55e',
  in_production: '#3b82f6',
  install_scheduled: '#06b6d4',
  installed: '#8b5cf6',
  qc: '#ef4444',
  closing: '#a855f7',
  closed: '#6b7280',
  cancelled: '#374151',
}

const STAGE_COLORS: Record<string, string> = {
  sales_in: '#4f7fff',
  production: '#22c07a',
  install: '#22d3ee',
  prod_review: '#f59e0b',
  sales_close: '#8b5cf6',
}

const STAGE_LABELS: Record<string, string> = {
  sales_in: 'Sales',
  production: 'Production',
  install: 'Install',
  prod_review: 'QC',
  sales_close: 'Close',
}

export default function PipelineJobCard({ project, department, isGhost, onClick }: PipelineJobCardProps) {
  const [showQuickChat, setShowQuickChat] = useState(false)

  const fd = (project.form_data as any) || {}
  const stage = project.pipe_stage || 'sales_in'
  const stageColor = STAGE_COLORS[stage] || '#4f7fff'
  const statusColor = STATUS_COLORS[project.status] || '#6b7280'

  const title = fd.client || project.title || 'Untitled Job'
  const vehicle = fd.vehicle || project.vehicle_desc || ''
  const jobType = fd.jobType || 'Commercial'
  const revenue = project.revenue || 0
  const profit = project.profit || 0
  const gpm = project.gpm || 0
  const installDate = fd.installDate || project.install_date
  const agent = fd.agent || ''
  const installer = fd.installer || ''

  // Check for send-backs
  const hasSendBack = (project.send_backs as any[])?.some?.((sb: any) => !sb.resolved)

  // Urgency: days until install
  let urgency = ''
  let urgencyColor = 'var(--text3)'
  if (installDate) {
    const days = Math.ceil((new Date(installDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (days < 0) { urgency = `${Math.abs(days)}d overdue`; urgencyColor = '#ef4444' }
    else if (days === 0) { urgency = 'TODAY'; urgencyColor = '#ef4444' }
    else if (days <= 2) { urgency = `${days}d`; urgencyColor = '#f59e0b' }
    else if (days <= 5) { urgency = `${days}d`; urgencyColor = '#22c55e' }
    else { urgency = `${days}d`; urgencyColor = 'var(--text3)' }
  }

  return (
    <div
      onClick={onClick}
      style={{
        background: isGhost ? 'transparent' : 'var(--surface2)',
        border: `1px solid ${isGhost ? 'var(--border)' : hasSendBack ? '#ef444440' : 'var(--border)'}`,
        borderLeft: isGhost ? `3px dashed ${stageColor}30` : `3px solid ${stageColor}`,
        borderRadius: 10,
        padding: '10px 12px',
        cursor: 'pointer',
        opacity: isGhost ? 0.45 : 1,
        transition: 'all 0.15s ease',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!isGhost) (e.currentTarget as HTMLElement).style.borderColor = stageColor }}
      onMouseLeave={e => { if (!isGhost) (e.currentTarget as HTMLElement).style.borderColor = hasSendBack ? '#ef444440' : 'var(--border)' }}
    >
      {/* Send-back alert */}
      {hasSendBack && !isGhost && (
        <div style={{
          position: 'absolute', top: -6, right: 8,
          background: '#ef4444', color: '#fff',
          fontSize: 9, fontWeight: 900, padding: '1px 6px',
          borderRadius: 4, letterSpacing: '.04em',
        }}>
          SENT BACK
        </div>
      )}

      {/* Ghost badge */}
      {isGhost && (
        <div style={{
          position: 'absolute', top: -6, right: 8,
          background: 'var(--surface2)', color: 'var(--text3)',
          fontSize: 8, fontWeight: 800, padding: '1px 6px',
          borderRadius: 4, letterSpacing: '.06em',
          border: '1px solid var(--border)',
        }}>
          IN {STAGE_LABELS[stage]?.toUpperCase()}
        </div>
      )}

      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text1)', lineHeight: 1.2, flex: 1, marginRight: 8 }}>
          {title}
        </div>
        {urgency && (
          <span style={{
            fontSize: 10, fontWeight: 800, color: urgencyColor,
            whiteSpace: 'nowrap',
          }}>
            {urgency}
          </span>
        )}
      </div>

      {/* Vehicle + type */}
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, lineHeight: 1.3 }}>
        {vehicle && <span>{vehicle} · </span>}
        {jobType}{fd.wrapDetail ? ` · ${fd.wrapDetail}` : ''}
      </div>

      {/* Financial strip */}
      {!isGhost && revenue > 0 && (
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

      {/* Bottom row: people + stage */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {agent && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
              background: 'rgba(79,127,255,0.1)', color: '#4f7fff',
            }}>
              {agent.split(' ')[0]}
            </span>
          )}
          {installer && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
              background: 'rgba(34,211,238,0.1)', color: '#22d3ee',
            }}>
              🔧 {installer.split(' ')[0]}
            </span>
          )}
        </div>

        {/* Quick chat button */}
        {!isGhost && (
          <button
            onClick={e => { e.stopPropagation(); setShowQuickChat(!showQuickChat) }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, padding: '2px 4px', opacity: 0.5,
            }}
            title="Quick chat"
          >
            💬
          </button>
        )}
      </div>

      {/* Bid status badge */}
      {!isGhost && project.installer_bid && project.installer_bid.status !== 'none' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, marginTop: 4,
          padding: '3px 0',
        }}>
          <span style={{
            fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
            background: project.installer_bid.status === 'accepted' ? 'rgba(34,192,122,0.12)' :
                        project.installer_bid.status === 'pending' ? 'rgba(245,158,11,0.12)' :
                        'rgba(242,90,90,0.12)',
            color: project.installer_bid.status === 'accepted' ? '#22c07a' :
                   project.installer_bid.status === 'pending' ? '#f59e0b' : '#f25a5a',
            border: `1px solid ${project.installer_bid.status === 'accepted' ? 'rgba(34,192,122,0.25)' :
                     project.installer_bid.status === 'pending' ? 'rgba(245,158,11,0.25)' : 'rgba(242,90,90,0.25)'}`,
            textTransform: 'uppercase', letterSpacing: '.04em',
          }}>
            BID {project.installer_bid.status}
          </span>
          {project.installer_bid.acceptedBy && (
            <span style={{ fontSize: 8, color: '#22c07a', fontWeight: 700 }}>
              ✓ Assigned
            </span>
          )}
        </div>
      )}

      {/* Status badge */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6,
      }}>
        <span style={{
          fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 5,
          background: `${statusColor}15`, color: statusColor,
          border: `1px solid ${statusColor}30`,
          textTransform: 'uppercase', letterSpacing: '.04em',
        }}>
          {project.status?.replace(/_/g, ' ')}
        </span>
        <span style={{
          fontSize: 9, color: 'var(--text3)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          #{project.id?.slice(-6)}
        </span>
      </div>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}
