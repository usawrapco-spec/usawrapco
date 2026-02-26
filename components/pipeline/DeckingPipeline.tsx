'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Project } from '@/types'
import { useRouter } from 'next/navigation'
import {
  Plus, Waves, Search, X, CheckCircle2, Wrench,
  Ruler, Anchor, Factory, Briefcase, Layers,
  type LucideIcon,
} from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import NewJobModal from '@/components/modals/NewJobModal'

interface Stage {
  id: string
  label: string
  color: string
  icon: LucideIcon
  description: string
}

const DECKING_STAGES: Stage[] = [
  { id: 'sales_in',    label: 'Intake',       color: '#4f7fff', icon: Briefcase,    description: 'New decking inquiry' },
  { id: 'measurement', label: 'Measurement',  color: '#8b5cf6', icon: Ruler,        description: 'Measuring boat sections' },
  { id: 'design_cut',  label: 'Design / Cut', color: '#22d3ee', icon: Layers,       description: 'Cut files being prepared' },
  { id: 'production',  label: 'Production',   color: '#22c07a', icon: Factory,      description: 'DekWave cutting in progress' },
  { id: 'install',     label: 'Install',      color: '#f59e0b', icon: Wrench,       description: 'Installation at marina/shop' },
  { id: 'prod_review', label: 'QC',           color: '#f25a5a', icon: CheckCircle2, description: 'Final inspection' },
  { id: 'sales_close', label: 'Closed',       color: '#22c07a', icon: CheckCircle2, description: 'Job complete' },
]

const fM = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

function daysSince(iso?: string | null) {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

function DeckingJobCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const days = daysSince(project.updated_at)
  const stale = days > 5
  const title = project.title || 'Untitled Job'
  const customer = (project as any).customer?.name || (project as any).form_data?.clientName || '—'
  const formData = (project as any).form_data || {}
  const boatInfo = formData.boatYear
    ? `${formData.boatYear} ${formData.boatMake || ''} ${formData.boatModel || ''}`.trim()
    : (project as any).vehicle_desc || '—'
  const sqft = formData.deckingSqft || formData.totalSqft || null

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
        borderLeft: '3px solid #22d3ee',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#22d3ee'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderLeftColor = '#22d3ee' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Anchor size={10} /> {boatInfo}
          </div>
        </div>
        {(project.revenue ?? 0) > 0 && (
          <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#22d3ee', flexShrink: 0, marginLeft: 8 }}>
            {fM(project.revenue ?? 0)}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{customer}</span>
        {sqft && (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#22d3ee', background: 'rgba(34,211,238,0.1)', padding: '1px 6px', borderRadius: 4 }}>
            {sqft} sqft
          </span>
        )}
        {stale && <span style={{ fontSize: 10, color: '#f59e0b', marginLeft: 'auto' }}>{days}d</span>}
      </div>
    </div>
  )
}

function StageColumn({ stage, projects, onJobClick }: {
  stage: Stage
  projects: Project[]
  onJobClick: (id: string) => void
}) {
  const Icon = stage.icon
  return (
    <div style={{ minWidth: 250, flex: '0 0 250px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
        borderTop: `3px solid ${stage.color}`,
      }}>
        <Icon size={14} style={{ color: stage.color }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', flex: 1 }}>{stage.label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: stage.color, background: `${stage.color}22`, padding: '1px 8px', borderRadius: 12 }}>
          {projects.length}
        </span>
      </div>
      {projects.map(p => (
        <DeckingJobCard key={p.id} project={p} onClick={() => onJobClick(p.id)} />
      ))}
      {projects.length === 0 && (
        <div style={{ padding: '20px 12px', border: '1px dashed var(--border)', borderRadius: 10, textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
          {stage.description}
        </div>
      )}
    </div>
  )
}

export default function DeckingPipelineClient({ profile, initialProjects, orgId }: {
  profile: Profile
  initialProjects: Project[]
  orgId: string
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [search, setSearch] = useState('')
  const [newJobOpen, setNewJobOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const ch = supabase.channel('decking-pipeline')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `org_id=eq.${orgId}` }, payload => {
        if (payload.eventType === 'INSERT') {
          const p = payload.new as Project
          if ((p as any).service_division === 'decking') setProjects(prev => [...prev, p])
        } else if (payload.eventType === 'UPDATE') {
          setProjects(prev => prev.map(p => p.id === (payload.new as Project).id ? { ...p, ...payload.new } : p))
        } else if (payload.eventType === 'DELETE') {
          setProjects(prev => prev.filter(p => p.id !== (payload.old as any).id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [orgId])

  const filtered = useMemo(() => {
    if (!search) return projects
    const q = search.toLowerCase()
    return projects.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      (p as any).customer?.name?.toLowerCase().includes(q) ||
      (p as any).vehicle_desc?.toLowerCase().includes(q)
    )
  }, [projects, search])

  const byStage = useMemo(() => {
    const map: Record<string, Project[]> = {}
    DECKING_STAGES.forEach(s => { map[s.id] = [] })
    filtered.forEach(p => {
      const stage = p.pipe_stage || 'sales_in'
      if (map[stage]) map[stage].push(p)
      else map['sales_in'].push(p)
    })
    return map
  }, [filtered])

  const totalValue = projects.reduce((s, p) => s + (p.revenue || 0), 0)
  const activeJobs = projects.filter(p => p.pipe_stage !== 'sales_close' && p.pipe_stage !== 'done').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          padding: '14px 20px 10px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          background: 'var(--surface)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Waves size={22} style={{ color: '#22d3ee' }} />
            <h1 style={{ fontSize: 22, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', margin: 0 }}>
              DekWave Decking Pipeline
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 16, marginLeft: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: '#22d3ee' }}>{activeJobs}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>Active</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: '#22c07a' }}>{fM(totalValue)}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>Pipeline Value</div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search decking jobs..."
              style={{ paddingLeft: 30, paddingRight: 10, height: 34, borderRadius: 8, width: 220, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text1)', fontSize: 13, outline: 'none' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                <X size={12} />
              </button>
            )}
          </div>
          <button
            onClick={() => setNewJobOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: '#22d3ee', color: '#0a2540', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            <Plus size={15} /> New Decking Job
          </button>
        </div>

        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {DECKING_STAGES.map(stage => (
            <StageColumn
              key={stage.id}
              stage={stage}
              projects={byStage[stage.id] || []}
              onJobClick={id => router.push(`/projects/${id}`)}
            />
          ))}
        </div>
      </div>

      <div className="md:hidden"><MobileNav /></div>

      <NewJobModal
        isOpen={newJobOpen}
        onClose={() => setNewJobOpen(false)}
        orgId={orgId}
        currentUserId={profile.id}
        onJobCreated={job => {
          if (job) setProjects(prev => [...prev, job])
          setNewJobOpen(false)
        }}
      />
    </div>
  )
}
