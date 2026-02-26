'use client'

import { AlertTriangle, Check, Camera, ChevronRight } from 'lucide-react'
import { STAGES, stageFor, gpmColor, formatK, type MobileJob } from './mobileConstants'
import type { PipeStage } from '@/types'

// ─── Job card sub-component ──────────────────────────────────
function MobileJobCard({
  job,
  onTap,
}: {
  job: MobileJob
  onTap: () => void
}) {
  const stage = stageFor(job.stage)

  return (
    <button
      onClick={onTap}
      style={{
        width: '100%',
        textAlign: 'left',
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 12,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text1)',
            fontFamily: 'Barlow Condensed, sans-serif',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {job.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
            {job.customer} &middot; {job.vehicle}
          </div>
        </div>
        <ChevronRight size={16} color="var(--text3)" style={{ flexShrink: 0, marginTop: 2 }} />
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 2, background: 'var(--border)' }}>
        <div style={{
          height: '100%',
          borderRadius: 2,
          width: `${job.progress}%`,
          background: stage.color,
        }} />
      </div>

      {/* Bottom row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 600,
            color: gpmColor(job.gpm),
            fontSize: 11,
          }}>
            {job.gpm.toFixed(1)}%
          </span>
          <span style={{ color: 'var(--text2)' }}>{formatK(job.revenue)}</span>
          {job.photoCount > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--text3)' }}>
              <Camera size={10} /> {job.photoCount}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {job.hasWarning ? (
            <AlertTriangle size={12} color="var(--amber)" />
          ) : job.progress === 100 ? (
            <Check size={12} color="var(--green)" />
          ) : null}
          {job.priority === 'high' || job.priority === 'urgent' ? (
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              color: job.priority === 'urgent' ? 'var(--red)' : 'var(--amber)',
              textTransform: 'uppercase',
            }}>
              {job.priority}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  )
}

// ─── Pipeline view ───────────────────────────────────────────
export default function MobilePipelineView({
  jobs,
  onOpenJob,
}: {
  jobs: MobileJob[]
  onOpenJob: (job: MobileJob) => void
}) {
  const activeStages = STAGES.filter(s => s.key !== 'done')
  const stageFilter: (PipeStage | 'all')[] = ['all', ...activeStages.map(s => s.key)]
  // For simplicity, show all jobs (no filter state — parent can add later)

  return (
    <div style={{
      flex: 1,
      overflow: 'auto',
      padding: '0 12px 12px',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 0 8px',
        fontFamily: 'Barlow Condensed, sans-serif',
        fontSize: 20,
        fontWeight: 700,
        color: 'var(--text1)',
      }}>
        Pipeline
      </div>

      {/* Filter pills */}
      <div style={{
        display: 'flex',
        gap: 6,
        marginBottom: 12,
        overflowX: 'auto',
        paddingBottom: 4,
      }}>
        {stageFilter.map(f => {
          const stage = f === 'all' ? null : stageFor(f)
          const count = f === 'all' ? jobs.length : jobs.filter(j => j.stage === f).length
          return (
            <div
              key={f}
              style={{
                padding: '4px 10px',
                borderRadius: 99,
                background: f === 'all' ? 'rgba(139,92,246,0.15)' : (stage?.bg ?? 'transparent'),
                color: f === 'all' ? 'var(--purple)' : (stage?.color ?? 'var(--text2)'),
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {f === 'all' ? 'All' : stage?.short} ({count})
            </div>
          )
        })}
      </div>

      {/* Grouped job list */}
      {STAGES.filter(s => jobs.some(j => j.stage === s.key)).map(stage => (
        <div key={stage.key} style={{ marginBottom: 16 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 8,
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: stage.color,
            }} />
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              color: stage.color,
              fontFamily: 'Barlow Condensed, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}>
              {stage.label}
            </span>
            <span style={{
              fontSize: 10,
              color: 'var(--text3)',
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              {jobs.filter(j => j.stage === stage.key).length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {jobs.filter(j => j.stage === stage.key).map(job => (
              <MobileJobCard key={job.id} job={job} onTap={() => onOpenJob(job)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
