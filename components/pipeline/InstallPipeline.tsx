'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import KanbanBoard, { KanbanColumn } from '@/components/pipeline/KanbanBoard'
import { useRouter } from 'next/navigation'
import { ClipboardList, Bell, Check, Calendar, Wrench, CheckCircle } from 'lucide-react'

interface InstallPipelineProps {
  orgId: string
  profileId: string
  role: string
}

const COLUMNS: KanbanColumn[] = [
  {
    key: 'available',
    label: 'Available Jobs',
    color: '#4f7fff',
    icon: ClipboardList,
    filterFn: (p) => p.pipe_stage === 'install' && !getInstaller(p),
  },
  {
    key: 'bid_sent',
    label: 'Bids Sent',
    color: '#f59e0b',
    icon: Bell,
    filterFn: (p) => p.pipe_stage === 'install' && getInstallStatus(p) === 'bid_sent',
  },
  {
    key: 'accepted',
    label: 'Accepted',
    color: '#22c07a',
    icon: Check,
    filterFn: (p) => p.pipe_stage === 'install' && getInstaller(p) && getInstallStatus(p) !== 'bid_sent' && getInstallStatus(p) !== 'in_progress' && getInstallStatus(p) !== 'complete',
  },
  {
    key: 'scheduled',
    label: 'Scheduled',
    color: '#06b6d4',
    icon: Calendar,
    filterFn: (p) => p.pipe_stage === 'install' && !!p.install_date && getInstallStatus(p) !== 'in_progress' && getInstallStatus(p) !== 'complete' && !!getInstaller(p),
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    color: '#ec4899',
    icon: Wrench,
    filterFn: (p) => p.pipe_stage === 'install' && getInstallStatus(p) === 'in_progress',
  },
  {
    key: 'complete',
    label: 'Complete → QC',
    color: '#8b5cf6',
    icon: CheckCircle,
    filterFn: (p) => (p.pipe_stage === 'prod_review' || getInstallStatus(p) === 'complete'),
  },
]

function getInstaller(p: any): string {
  const fd = (p.form_data as any) || {}
  return fd.installer || p.installer_id || ''
}

function getInstallStatus(p: any): string {
  const fd = (p.form_data as any) || {}
  return fd.install_status || ''
}

export default function InstallPipeline({ orgId, profileId, role }: InstallPipelineProps) {
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
        .in('pipe_stage', ['install', 'prod_review'])
        .neq('status', 'cancelled')
        .order('install_date', { ascending: true, nullsFirst: false })

      if (data) setProjects(data)
      setLoading(false)
    }
    load()

    const channel = supabase.channel('install-pipeline')
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
      await supabase.from('projects').update({
        pipe_stage: 'prod_review',
        form_data: { ...fd, install_status: 'complete' },
        updated_at: new Date().toISOString(),
      }).eq('id', projectId)
    } else {
      await supabase.from('projects').update({
        form_data: { ...fd, install_status: columnKey === 'in_progress' ? 'in_progress' : columnKey === 'bid_sent' ? 'bid_sent' : '' },
        updated_at: new Date().toISOString(),
      }).eq('id', projectId)
    }
  }

  if (loading) return <LoadingState />

  // Filter for installer role
  const filtered = ['admin', 'owner', 'production'].includes(role)
    ? projects
    : projects.filter(p => {
        const fd = (p.form_data as any) || {}
        return fd.installer === profileId || p.installer_id === profileId || !getInstaller(p)
      })

  // Stats
  const available = filtered.filter(p => !getInstaller(p)).length
  const scheduled = filtered.filter(p => p.install_date).length
  const totalPay = filtered.reduce((sum, p) => {
    const fin = (p.fin_data as any) || {}
    return sum + (fin.labor || fin.install_pay || 0)
  }, 0)

  return (
    <div>
      <div style={{
        display: 'flex', gap: 20, marginBottom: 16, padding: '12px 16px',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
      }}>
        <PipeStat label="Total Jobs" value={filtered.length.toString()} color="var(--accent)" />
        <PipeStat label="Available" value={available.toString()} color="#4f7fff" />
        <PipeStat label="Scheduled" value={scheduled.toString()} color="#06b6d4" />
        <PipeStat label="Total Pay" value={`$${Math.round(totalPay).toLocaleString()}`} color="var(--green)" />
      </div>

      <KanbanBoard
        columns={COLUMNS}
        projects={filtered}
        department="install"
        profileId={profileId}
        orgId={orgId}
        onProjectClick={(p) => router.push(`/dashboard/project/${p.id}`)}
        onStageChange={handleStageChange}
        showGhosts={false}
      />
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
    <div style={{ display: 'flex', gap: 12 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ flex: 1, height: 300, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, opacity: 0.5 }} />
      ))}
    </div>
  )
}
