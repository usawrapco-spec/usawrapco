'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import KanbanBoard, { KanbanColumn } from '@/components/pipeline/KanbanBoard'
import { useRouter } from 'next/navigation'
import { Inbox, Mail, Phone, CheckCircle2, RefreshCw, DollarSign } from 'lucide-react'

interface SalesPipelineProps {
  orgId: string
  profileId: string
  role: string
}

const COLUMNS: KanbanColumn[] = [
  {
    key: 'new_lead',
    label: 'New Leads',
    color: '#4f7fff',
    icon: Inbox,
    filterFn: (p) => (p.pipe_stage === 'sales_in' && p.status === 'estimate'),
  },
  {
    key: 'estimate_sent',
    label: 'Estimate Sent',
    color: '#f59e0b',
    icon: Mail,
    filterFn: (p) => (p.pipe_stage === 'sales_in' && p.status === 'active'),
  },
  {
    key: 'follow_up',
    label: 'Follow Up',
    color: '#06b6d4',
    icon: Phone,
    filterFn: (p) => (p.pipe_stage === 'sales_in' && ['in_production'].includes(p.status)),
  },
  {
    key: 'won',
    label: 'Won — Ready to Hand Off',
    color: '#22c07a',
    icon: CheckCircle2,
    filterFn: (p) => (p.pipe_stage === 'production' && p.status === 'active'),
  },
  {
    key: 'handed_off',
    label: 'In Production / Install',
    color: '#8b5cf6',
    icon: RefreshCw,
    filterFn: (p) => (['install', 'prod_review'].includes(p.pipe_stage)),
  },
  {
    key: 'closing',
    label: 'Closing',
    color: '#a855f7',
    icon: DollarSign,
    filterFn: (p) => (p.pipe_stage === 'sales_close' || p.status === 'closing'),
  },
]

export default function SalesPipeline({ orgId, profileId, role }: SalesPipelineProps) {
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
        .neq('status', 'cancelled')
        .order('updated_at', { ascending: false })

      if (data) setProjects(data)
      setLoading(false)
    }
    load()

    // Realtime subscription
    const channel = supabase.channel('sales-pipeline')
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
    // Map column to actual stage/status
    const stageMap: Record<string, { pipe_stage: string; status: string }> = {
      new_lead: { pipe_stage: 'sales_in', status: 'estimate' },
      estimate_sent: { pipe_stage: 'sales_in', status: 'active' },
      follow_up: { pipe_stage: 'sales_in', status: 'in_production' },
      won: { pipe_stage: 'production', status: 'active' },
      closing: { pipe_stage: 'sales_close', status: 'closing' },
    }

    const update = stageMap[columnKey]
    if (!update) return

    await supabase.from('projects').update({
      ...update,
      updated_at: new Date().toISOString(),
    }).eq('id', projectId)

    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, ...update } : p
    ))
  }

  if (loading) return <LoadingState />

  // Filter: sales sees only their jobs unless admin
  const filtered = ['admin', 'owner'].includes(role)
    ? projects
    : projects.filter(p => {
        const fd = (p.form_data as any) || {}
        return fd.agent === profileId || p.agent_id === profileId
      })

  // Stats
  const totalRevenue = filtered.reduce((sum, p) => sum + (p.revenue || 0), 0)
  const wonJobs = filtered.filter(p => p.pipe_stage !== 'sales_in')
  const wonRevenue = wonJobs.reduce((sum, p) => sum + (p.revenue || 0), 0)

  return (
    <div>
      {/* Stats bar */}
      <div style={{
        display: 'flex', gap: 20, marginBottom: 16, padding: '12px 16px',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
      }}>
        <PipeStat label="Total Leads" value={filtered.length.toString()} color="var(--accent)" />
        <PipeStat label="Pipeline Value" value={`$${Math.round(totalRevenue / 1000)}k`} color="var(--text1)" />
        <PipeStat label="Won" value={wonJobs.length.toString()} color="var(--green)" />
        <PipeStat label="Won Revenue" value={`$${Math.round(wonRevenue / 1000)}k`} color="var(--green)" />
      </div>

      <KanbanBoard
        columns={COLUMNS}
        projects={filtered}
        department="sales"
        profileId={profileId}
        orgId={orgId}
        onProjectClick={(p) => router.push(`/dashboard/project/${p.id}`)}
        onStageChange={handleStageChange}
        showGhosts={true}
        allProjects={projects}
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
