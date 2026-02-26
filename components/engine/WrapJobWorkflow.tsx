'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import ReactFlow, {
  Node, Edge, Background, Controls,
  MarkerType, Position, Handle,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  X, Wrench, PhoneIncoming, Phone, CreditCard, ClipboardList,
  Palette, CheckCircle, Printer, Scissors, Search, Calendar,
  Car, Camera, Star, type LucideIcon,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface WorkflowProps {
  profile: Profile
  initialProjects: any[]
}

interface WFStage {
  key: string
  label: string
  Icon: LucideIcon
  color: string
}

const WF_STAGES: WFStage[] = [
  { key: 'new_lead',      label: 'New Lead',     Icon: PhoneIncoming, color: '#4f7fff' },
  { key: 'qualified',     label: 'Qualified',    Icon: Phone,         color: '#8b5cf6' },
  { key: 'deposit_paid',  label: 'Deposit Paid', Icon: CreditCard,    color: '#22c07a' },
  { key: 'intake',        label: 'Intake',       Icon: ClipboardList, color: '#22d3ee' },
  { key: 'design',        label: 'Design',       Icon: Palette,       color: '#8b5cf6' },
  { key: 'proof_approved',label: 'Proof OK',     Icon: CheckCircle,   color: '#22c07a' },
  { key: 'print',         label: 'Print',        Icon: Printer,       color: '#22d3ee' },
  { key: 'cut_prep',      label: 'Cut & Prep',   Icon: Scissors,      color: '#f59e0b' },
  { key: 'qc',            label: 'QC',           Icon: Search,        color: '#f59e0b' },
  { key: 'scheduled',     label: 'Scheduled',    Icon: Calendar,      color: '#4f7fff' },
  { key: 'check_in',      label: 'Check-In',     Icon: Car,           color: '#22d3ee' },
  { key: 'installing',    label: 'Installing',   Icon: Wrench,        color: '#f59e0b' },
  { key: 'photos',        label: 'Photos',       Icon: Camera,        color: '#8b5cf6' },
  { key: 'complete',      label: 'Complete',     Icon: CheckCircle,   color: '#22c07a' },
  { key: 'review',        label: 'Review',       Icon: Star,          color: '#f59e0b' },
]

// Map pipeline stages to workflow stages
function mapPipeToWF(project: any): string {
  const pipe = project.pipe_stage || 'sales_in'
  const status = project.status
  const fd = project.form_data || {}

  if (status === 'closed' || pipe === 'done') return 'complete'
  if (pipe === 'sales_in') {
    if (fd.deposit) return 'deposit_paid'
    if (fd.contractSigned) return 'qualified'
    return 'new_lead'
  }
  if (pipe === 'production') {
    if (fd.linftPrinted) return 'cut_prep'
    return 'print'
  }
  if (pipe === 'install') {
    if (fd.actualHrs) return 'installing'
    if (fd.installDate) return 'scheduled'
    return 'check_in'
  }
  if (pipe === 'prod_review') return 'qc'
  if (pipe === 'sales_close') return 'photos'
  return 'new_lead'
}

function WFNode({ data }: { data: any }) {
  const count = data.count || 0
  const color = data.color
  const isStale = data.avgDays > 7
  const borderColor = count === 0 ? '#1a1d27' : isStale ? '#f25a5a' : color

  return (
    <div
      onClick={() => data.onOpen?.(data.key)}
      style={{
        width: 110, padding: '10px 8px', borderRadius: 12,
        background: count === 0 ? '#13151c' : `${borderColor}12`,
        border: `2px solid ${borderColor}`,
        cursor: 'pointer', textAlign: 'center', position: 'relative',
        animation: isStale && count > 0 ? 'pulse 2s infinite' : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: borderColor, width: 6, height: 6, border: 'none' }} />
      <Handle type="source" position={Position.Right} style={{ background: borderColor, width: 6, height: 6, border: 'none' }} />
      <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'center' }}>
        {data.Icon && <data.Icon size={20} color={borderColor} />}
      </div>
      <div style={{
        fontSize: 9, fontWeight: 800, color: borderColor,
        fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        {data.label}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 900, color: '#e8eaed',
        fontFamily: 'JetBrains Mono, monospace', marginTop: 2,
      }}>
        {count}
      </div>
      {data.avgDays > 0 && (
        <div style={{
          fontSize: 9, color: isStale ? '#f25a5a' : 'var(--text3)',
          fontFamily: 'JetBrains Mono, monospace', marginTop: 1,
        }}>
          ~{data.avgDays.toFixed(0)}d avg
        </div>
      )}
    </div>
  )
}

const nodeTypes = { wfNode: WFNode }

export default function WrapJobWorkflow({ profile, initialProjects }: WorkflowProps) {
  const supabase = createClient()
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>(initialProjects)
  const [drawerKey, setDrawerKey] = useState<string | null>(null)

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('workflow-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `org_id=eq.${profile.org_id}` }, (payload) => {
        if (payload.eventType === 'INSERT') setProjects(prev => [...prev, payload.new])
        else if (payload.eventType === 'UPDATE') setProjects(prev => prev.map(p => p.id === (payload.new as any).id ? { ...p, ...payload.new } : p))
        else if (payload.eventType === 'DELETE') setProjects(prev => prev.filter(p => p.id !== (payload.old as any).id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile.org_id])

  // Group projects by workflow stage
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {}
    WF_STAGES.forEach(s => { g[s.key] = [] })
    projects.filter(p => p.status !== 'cancelled').forEach(p => {
      const wf = mapPipeToWF(p)
      if (g[wf]) g[wf].push(p)
    })
    return g
  }, [projects])

  const nodes: Node[] = useMemo(() => {
    // Layout in 3 rows for better visibility
    return WF_STAGES.map((stage, i) => {
      const row = Math.floor(i / 5)
      const col = i % 5
      const jobs = grouped[stage.key] || []
      const now = Date.now()
      const avgDays = jobs.length > 0
        ? jobs.reduce((s, p) => s + (now - new Date(p.updated_at || p.created_at).getTime()) / 86400000, 0) / jobs.length
        : 0

      return {
        id: stage.key,
        type: 'wfNode',
        position: { x: col * 150, y: row * 140 },
        data: {
          ...stage,
          count: jobs.length,
          avgDays,
          records: jobs,
          onOpen: setDrawerKey,
        },
      }
    })
  }, [grouped])

  const edges: Edge[] = useMemo(() => {
    return WF_STAGES.slice(0, -1).map((stage, i) => ({
      id: `${stage.key}-${WF_STAGES[i + 1].key}`,
      source: stage.key,
      target: WF_STAGES[i + 1].key,
      animated: true,
      style: { stroke: stage.color + '60', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: WF_STAGES[i + 1].color },
    }))
  }, [])

  const drawerJobs = drawerKey ? (grouped[drawerKey] || []) : []
  const drawerStage = WF_STAGES.find(s => s.key === drawerKey)

  const totalJobs = projects.filter(p => p.status !== 'cancelled').length
  const totalRevenue = projects.reduce((s, p) => s + (p.revenue || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{
            fontSize: 22, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
            color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Wrench size={20} style={{ color: 'var(--cyan)' }} />
            WRAP JOB WORKFLOW
          </h1>
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text3)' }}>
            {totalJobs} jobs · ${totalRevenue.toLocaleString()} pipeline
          </span>
        </div>
      </div>

      {/* Flow */}
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          style={{ background: '#0d0f14' }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
        >
          <Background color="#1a1d27" gap={20} />
          <Controls showInteractive={false} style={{ background: '#13151c', border: '1px solid #1a1d27', borderRadius: 8 }} />
        </ReactFlow>

        {/* Drawer */}
        {drawerStage && (
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 380,
            background: 'var(--surface)', borderLeft: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', zIndex: 10,
            boxShadow: '-8px 0 24px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <drawerStage.Icon size={22} color={drawerStage.color} />
                <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: drawerStage.color, textTransform: 'uppercase' }}>
                  {drawerStage.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {drawerJobs.length} jobs
                </div>
              </div>
              <button onClick={() => setDrawerKey(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {drawerJobs.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>No jobs at this stage</div>
              )}
              {drawerJobs.map((job: any) => (
                <div
                  key={job.id}
                  onClick={() => router.push(`/projects/${job.id}`)}
                  style={{
                    padding: '10px 12px', background: 'var(--surface2)', borderRadius: 10,
                    border: '1px solid var(--border)', cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                    {(job.customer as any)?.name || job.title || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {job.vehicle_desc || '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11 }}>
                    {job.revenue && (
                      <span style={{ color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                        ${job.revenue.toLocaleString()}
                      </span>
                    )}
                    {(job.agent as any)?.name && (
                      <span style={{ color: 'var(--text3)' }}>{(job.agent as any).name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
