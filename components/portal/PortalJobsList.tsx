'use client'

import { usePortal } from '@/lib/portal-context'
import { C, STAGE_CONFIG, stageProgress, fmt } from '@/lib/portal-theme'
import Link from 'next/link'
import { ChevronRight, Car } from 'lucide-react'

interface Job {
  id: string
  title: string
  vehicle_desc: string | null
  pipe_stage: string
  install_date: string | null
  created_at: string
  revenue: number | null
  type: string | null
}

export default function PortalJobsList({ jobs }: { jobs: Job[] }) {
  const { token } = usePortal()
  const base = `/portal/${token}`

  const active = jobs.filter(j => j.pipe_stage !== 'done')
  const completed = jobs.filter(j => j.pipe_stage === 'done')

  return (
    <div style={{ padding: '20px 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
        My Projects
      </h1>

      {jobs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.text3 }}>
          <Car size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>No projects yet</div>
        </div>
      )}

      {active.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: C.text3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            In Progress ({active.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {active.map((job) => (
              <JobCard key={job.id} job={job} base={base} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: C.text3, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            Completed ({completed.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {completed.map((job) => (
              <JobCard key={job.id} job={job} base={base} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function JobCard({ job, base }: { job: Job; base: string }) {
  const stage = STAGE_CONFIG[job.pipe_stage] || STAGE_CONFIG.sales_in
  const progress = stageProgress(job.pipe_stage)

  return (
    <Link href={`${base}/jobs/${job.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{job.title}</div>
            {job.vehicle_desc && (
              <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{job.vehicle_desc}</div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 6,
              background: `${stage.color}18`,
              color: stage.color,
            }}>
              {stage.label}
            </div>
            <ChevronRight size={16} color={C.text3} />
          </div>
        </div>
        <div style={{ height: 4, background: C.surface2, borderRadius: 2, overflow: 'hidden', marginTop: 12 }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: stage.color,
            borderRadius: 2,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: C.text3 }}>{progress}% complete</span>
          <span style={{ fontSize: 11, color: C.text3 }}>{fmt(job.created_at)}</span>
        </div>
      </div>
    </Link>
  )
}
