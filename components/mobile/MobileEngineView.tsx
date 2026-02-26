'use client'

import { useState } from 'react'
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  BarChart3,
} from 'lucide-react'
import { STAGES, stageFor, gpmColor, formatK, type MobileJob } from './mobileConstants'

function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  sub?: string
  icon: typeof DollarSign
  color: string
}) {
  return (
    <div style={{
      flex: 1,
      background: 'var(--surface2)',
      borderRadius: 10,
      padding: 12,
      border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={14} color={color} />
        <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <div style={{
        fontSize: 20,
        fontWeight: 700,
        color: 'var(--text1)',
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export default function MobileEngineView({ jobs }: { jobs: MobileJob[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const activeJobs = jobs.filter(j => j.stage !== 'done')
  const totalRevenue = activeJobs.reduce((s, j) => s + j.revenue, 0)
  const avgGpm = activeJobs.length
    ? activeJobs.reduce((s, j) => s + j.gpm, 0) / activeJobs.length
    : 0
  const attentionJobs = activeJobs.filter(j => j.hasWarning || j.priority === 'urgent' || j.priority === 'high')

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
        Revenue Engine
      </div>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <KPICard
          label="Pipeline"
          value={formatK(totalRevenue)}
          sub={`${activeJobs.length} active jobs`}
          icon={DollarSign}
          color="var(--green)"
        />
        <KPICard
          label="Avg GPM"
          value={`${avgGpm.toFixed(1)}%`}
          sub={avgGpm >= 65 ? 'Healthy' : 'Below target'}
          icon={TrendingUp}
          color={gpmColor(avgGpm)}
        />
        <KPICard
          label="Attention"
          value={String(attentionJobs.length)}
          sub="Need action"
          icon={AlertTriangle}
          color="var(--amber)"
        />
      </div>

      {/* Stage bubbles */}
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--text2)',
        fontFamily: 'Barlow Condensed, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
      }}>
        Stages
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        marginBottom: 16,
      }}>
        {STAGES.filter(s => s.key !== 'done').map(stage => {
          const count = jobs.filter(j => j.stage === stage.key).length
          const isOpen = expanded === stage.key
          return (
            <button
              key={stage.key}
              onClick={() => setExpanded(isOpen ? null : stage.key)}
              style={{
                background: isOpen ? stage.bg : 'var(--surface2)',
                border: `1px solid ${isOpen ? stage.color : 'var(--border)'}`,
                borderRadius: 10,
                padding: 10,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{
                fontSize: 20,
                fontWeight: 700,
                color: stage.color,
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                {count}
              </span>
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--text2)',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                {stage.short}
              </span>
            </button>
          )
        })}
      </div>

      {/* Expanded stage detail */}
      {expanded && (
        <div style={{
          background: 'var(--surface2)',
          borderRadius: 10,
          border: '1px solid var(--border)',
          padding: 12,
          marginBottom: 16,
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: stageFor(expanded as any).color,
            fontFamily: 'Barlow Condensed, sans-serif',
            marginBottom: 8,
          }}>
            {stageFor(expanded as any).label} Jobs
          </div>
          {jobs.filter(j => j.stage === expanded).map(job => (
            <div key={job.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
              borderBottom: '1px solid var(--border)',
              fontSize: 11,
            }}>
              <span style={{ color: 'var(--text1)' }}>{job.title}</span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                color: gpmColor(job.gpm),
              }}>
                {job.gpm.toFixed(1)}%
              </span>
            </div>
          ))}
          {jobs.filter(j => j.stage === expanded).length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', padding: 12 }}>
              No jobs in this stage
            </div>
          )}
        </div>
      )}

      {/* Needs attention */}
      {attentionJobs.length > 0 && (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 8,
          }}>
            <AlertTriangle size={14} color="var(--amber)" />
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text2)',
              fontFamily: 'Barlow Condensed, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}>
              Needs Attention
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {attentionJobs.map(job => {
              const stage = stageFor(job.stage)
              return (
                <div key={job.id} style={{
                  background: 'var(--surface2)',
                  borderRadius: 10,
                  padding: 10,
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)' }}>
                      {job.title}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--amber)', marginTop: 2 }}>
                      {job.warningMsg || `${job.priority} priority`}
                    </div>
                  </div>
                  <div style={{
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: stage.bg,
                    color: stage.color,
                    fontSize: 9,
                    fontWeight: 700,
                  }}>
                    {stage.short}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
