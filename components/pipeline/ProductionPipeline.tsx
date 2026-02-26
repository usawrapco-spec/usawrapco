'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import KanbanBoard, { KanbanColumn } from '@/components/pipeline/KanbanBoard'
import { useRouter } from 'next/navigation'
import { Inbox, Palette, Pencil, Mail, CheckCircle, Printer, Package, ArrowRight } from 'lucide-react'

interface ProductionPipelineProps {
  orgId: string
  profileId: string
  role: string
}

const COLUMNS: KanbanColumn[] = [
  {
    key: 'intake',
    label: 'New from Sales',
    color: '#4f7fff',
    icon: Inbox,
    filterFn: (p) => p.pipe_stage === 'production' && !getDesignStatus(p),
  },
  {
    key: 'design_needed',
    label: 'Design Needed',
    color: '#ec4899',
    icon: Palette,
    filterFn: (p) => p.pipe_stage === 'production' && getDesignStatus(p) === 'needed',
  },
  {
    key: 'in_design',
    label: 'In Design',
    color: '#f59e0b',
    icon: Pencil,
    filterFn: (p) => p.pipe_stage === 'production' && getDesignStatus(p) === 'in_progress',
  },
  {
    key: 'proof_sent',
    label: 'Proof Sent',
    color: '#06b6d4',
    icon: Mail,
    filterFn: (p) => p.pipe_stage === 'production' && getDesignStatus(p) === 'proof_sent',
  },
  {
    key: 'approved',
    label: 'Design Approved',
    color: '#22c07a',
    icon: CheckCircle,
    filterFn: (p) => p.pipe_stage === 'production' && getDesignStatus(p) === 'approved',
  },
  {
    key: 'printing',
    label: 'Print & Prep',
    color: '#8b5cf6',
    icon: Printer,
    filterFn: (p) => p.pipe_stage === 'production' && getDesignStatus(p) === 'printing',
  },
  {
    key: 'ready',
    label: 'Ready for Install',
    color: '#22c55e',
    icon: Package,
    filterFn: (p) => p.pipe_stage === 'production' && getDesignStatus(p) === 'ready',
  },
  {
    key: 'complete',
    label: 'Sent to Install',
    color: '#6b7280',
    icon: ArrowRight,
    filterFn: (p) => p.pipe_stage === 'install',
  },
]

function getDesignStatus(project: any): string {
  const fd = (project.form_data as any) || {}
  return fd.production_status || fd.approvalStatus || ''
}

export default function ProductionPipeline({ orgId, profileId, role }: ProductionPipelineProps) {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('org_id', orgId)
        .in('pipe_stage', ['production', 'install'])
        .neq('status', 'cancelled')
        .order('updated_at', { ascending: false })

      if (data) setProjects(data)
      setLoading(false)
    }
    load()

    const channel = supabase.channel('prod-pipeline')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'projects',
        filter: `org_id=eq.${orgId}`,
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setProjects(prev => prev.map(p => p.id === payload.new.id ? payload.new : p))
        } else if (payload.eventType === 'INSERT') {
          setProjects(prev => [payload.new, ...prev])
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orgId])

  const handleStageChange = async (projectId: string, columnKey: string) => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return

    const fd = (project.form_data as any) || {}

    if (columnKey === 'complete') {
      // Move to install pipeline
      await supabase.from('projects').update({
        pipe_stage: 'install',
        updated_at: new Date().toISOString(),
      }).eq('id', projectId)
    } else {
      // Update production_status in form_data
      const statusMap: Record<string, string> = {
        intake: '',
        design_needed: 'needed',
        in_design: 'in_progress',
        proof_sent: 'proof_sent',
        approved: 'approved',
        printing: 'printing',
        ready: 'ready',
      }

      const newFd = { ...fd, production_status: statusMap[columnKey] || '' }

      await supabase.from('projects').update({
        form_data: newFd,
        updated_at: new Date().toISOString(),
      }).eq('id', projectId)
    }

    // Optimistic update
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p
      if (columnKey === 'complete') return { ...p, pipe_stage: 'install' }
      const fd2 = (p.form_data as any) || {}
      return { ...p, form_data: { ...fd2, production_status: columnKey === 'intake' ? '' : columnKey.replace('_', '') } }
    }))
  }

  if (loading) return <LoadingState />

  // Stats
  const inDesign = projects.filter(p => ['needed', 'in_progress'].includes(getDesignStatus(p))).length
  const awaitingApproval = projects.filter(p => getDesignStatus(p) === 'proof_sent').length
  const readyToPrint = projects.filter(p => ['approved', 'printing'].includes(getDesignStatus(p))).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Stats bar — fixed height, never scrolls */}
      <div style={{
        display: 'flex', gap: 20, marginBottom: 12, padding: '10px 16px',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
        flexShrink: 0,
      }}>
        <PipeStat label="Total in Production" value={projects.length.toString()} color="var(--accent)" />
        <PipeStat label="In Design" value={inDesign.toString()} color="#ec4899" />
        <PipeStat label="Awaiting Approval" value={awaitingApproval.toString()} color="#06b6d4" />
        <PipeStat label="Ready to Print" value={readyToPrint.toString()} color="#22c55e" />
      </div>

      {/* Kanban board — fills remaining height */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <KanbanBoard
          columns={COLUMNS}
          projects={projects}
          department="production"
          profileId={profileId}
          orgId={orgId}
          horizontal={true}
          onProjectClick={(p) => router.push(`/jobs/${p.id}`)}
          onStageChange={handleStageChange}
          showGhosts={false}
        />
      </div>
    </div>
  )
}

function PipeStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', height: '100%', minHeight: 200 }}>
      {[1,2,3,4,5,6,7].map(i => (
        <div key={i} style={{ flex: '1 1 0', minWidth: 155, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, opacity: 0.5 }} />
      ))}
    </div>
  )
}
