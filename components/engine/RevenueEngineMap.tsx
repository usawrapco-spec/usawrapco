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
  X, TrendingUp, Users, DollarSign, Palette, Printer,
  Wrench, CheckCircle, Star, Camera, Scissors, ClipboardCheck,
  Calendar, Truck, Search, Mail, MessageSquare, Download,
  ArrowRight,
} from 'lucide-react'

interface EngineMapProps {
  profile: Profile
}

interface StageData {
  key: string
  label: string
  iconName: string
  count: number
  value: number
  color: string
  records: any[]
  avgDays?: number
}

const ICON_MAP: Record<string, any> = {
  Download, Search, DollarSign, ClipboardCheck, Palette,
  CheckCircle, Printer, Scissors, ClipboardCheck2: ClipboardCheck,
  Calendar, Truck, Wrench, Camera, Star, Mail,
}

const STAGES: { key: string; label: string; iconName: string; lucideIcon: any }[] = [
  { key: 'new_lead',         label: 'NEW LEAD',          iconName: 'Download',       lucideIcon: Download },
  { key: 'qualified',        label: 'QUALIFIED',         iconName: 'Search',         lucideIcon: Search },
  { key: 'deposit_paid',     label: 'DEPOSIT PAID',      iconName: 'DollarSign',     lucideIcon: DollarSign },
  { key: 'intake_complete',  label: 'INTAKE COMPLETE',   iconName: 'ClipboardCheck', lucideIcon: ClipboardCheck },
  { key: 'design',           label: 'DESIGN',            iconName: 'Palette',        lucideIcon: Palette },
  { key: 'proof_approved',   label: 'PROOF APPROVED',    iconName: 'CheckCircle',    lucideIcon: CheckCircle },
  { key: 'print_queue',      label: 'PRINT QUEUE',       iconName: 'Printer',        lucideIcon: Printer },
  { key: 'cut_prep',         label: 'CUT & PREP',        iconName: 'Scissors',       lucideIcon: Scissors },
  { key: 'qc_check',         label: 'QC CHECK',          iconName: 'ClipboardCheck', lucideIcon: ClipboardCheck },
  { key: 'install_scheduled',label: 'INSTALL SCHED.',    iconName: 'Calendar',       lucideIcon: Calendar },
  { key: 'vehicle_checkin',  label: 'VEHICLE CHECK-IN',  iconName: 'Truck',          lucideIcon: Truck },
  { key: 'installing',       label: 'INSTALLING',        iconName: 'Wrench',         lucideIcon: Wrench },
  { key: 'final_photos',     label: 'FINAL PHOTOS',      iconName: 'Camera',         lucideIcon: Camera },
  { key: 'complete',         label: 'COMPLETE',          iconName: 'CheckCircle',    lucideIcon: CheckCircle },
  { key: 'review_requested', label: 'REVIEW REQ.',       iconName: 'Star',           lucideIcon: Star },
]

const STAGE_COLORS: Record<string, string> = {
  new_lead: '#4f7fff',
  qualified: '#8b5cf6',
  deposit_paid: '#22c07a',
  intake_complete: '#22d3ee',
  design: '#8b5cf6',
  proof_approved: '#22c07a',
  print_queue: '#f59e0b',
  cut_prep: '#f59e0b',
  qc_check: '#22d3ee',
  install_scheduled: '#4f7fff',
  vehicle_checkin: '#f59e0b',
  installing: '#22c07a',
  final_photos: '#8b5cf6',
  complete: '#22c07a',
  review_requested: '#f59e0b',
}

function getNodeStatus(count: number): 'empty' | 'active' | 'healthy' | 'attention' {
  if (count === 0) return 'empty'
  if (count >= 10) return 'healthy'
  if (count >= 5) return 'attention'
  return 'active'
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'empty': return '#1e2330'
    case 'healthy': return '#22c07a'
    case 'attention': return '#f59e0b'
    case 'active': return '#4f7fff'
    default: return '#1e2330'
  }
}

function StageNode({ data }: { data: StageData & { onOpen: (key: string) => void } }) {
  const status = getNodeStatus(data.count)
  const statusColor = getStatusColor(status)
  const stageColor = data.color || '#4f7fff'
  const LucideIcon = STAGES.find(s => s.key === data.key)?.lucideIcon || CheckCircle
  const isStuck = data.avgDays && data.avgDays > 7

  return (
    <div
      onClick={() => data.onOpen(data.key)}
      style={{
        width: 130, padding: '16px 8px', borderRadius: 16,
        background: `linear-gradient(135deg, ${statusColor}10, ${statusColor}05)`,
        border: `1.5px solid ${stageColor}40`,
        cursor: 'pointer', textAlign: 'center', position: 'relative',
        transition: 'all 0.2s ease',
        boxShadow: status !== 'empty' ? `0 4px 20px ${stageColor}15` : 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.05)'
        e.currentTarget.style.borderColor = stageColor
        e.currentTarget.style.boxShadow = `0 8px 32px ${stageColor}30`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.borderColor = `${stageColor}40`
        e.currentTarget.style.boxShadow = status !== 'empty' ? `0 4px 20px ${stageColor}15` : 'none'
      }}
      title={data.avgDays ? `Avg ${data.avgDays.toFixed(1)} days at stage` : undefined}
    >
      <Handle type="target" position={Position.Left} style={{ background: stageColor, width: 6, height: 6, border: 'none' }} />
      <Handle type="source" position={Position.Right} style={{ background: stageColor, width: 6, height: 6, border: 'none' }} />

      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${stageColor}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 8px',
      }}>
        <LucideIcon size={18} style={{ color: stageColor }} />
      </div>

      <div style={{
        fontSize: 9, fontWeight: 800, color: stageColor,
        fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase',
        letterSpacing: '0.1em', lineHeight: 1.2,
      }}>
        {data.label}
      </div>

      <div style={{
        fontSize: 26, fontWeight: 900, color: '#e8eaed',
        fontFamily: 'JetBrains Mono, monospace', marginTop: 4,
        lineHeight: 1,
      }}>
        {data.count}
      </div>

      {data.value > 0 && (
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#22c07a',
          fontFamily: 'JetBrains Mono, monospace', marginTop: 2,
        }}>
          ${data.value.toLocaleString()}
        </div>
      )}

      {/* Pulse indicator for active stages */}
      {data.count > 0 && (
        <div style={{
          position: 'absolute', top: -3, right: -3,
          width: 8, height: 8, borderRadius: '50%',
          background: statusColor,
        }}>
          {(isStuck || status === 'attention') && (
            <div style={{
              position: 'absolute', inset: -4,
              borderRadius: '50%',
              border: `2px solid ${isStuck ? '#f25a5a' : statusColor}`,
              animation: 'pulseRing 2s infinite',
            }} />
          )}
        </div>
      )}
    </div>
  )
}

const nodeTypes = { stageNode: StageNode }

export default function RevenueEngineMap({ profile }: EngineMapProps) {
  const supabase = createClient()
  const [stageData, setStageData] = useState<Record<string, StageData>>({})
  const [drawerKey, setDrawerKey] = useState<string | null>(null)
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month')

  const loadData = useCallback(async () => {
    const orgId = profile.org_id

    const [prospectsRes, projectsRes] = await Promise.all([
      supabase.from('prospects').select('id, status, score, business_name, company, name, email, estimated_revenue, created_at')
        .eq('org_id', orgId).order('created_at', { ascending: false }).limit(500),
      supabase.from('projects').select('id, title, status, pipe_stage, revenue, profit, form_data, customer:customer_id(name), agent:agent_id(name), created_at, updated_at')
        .eq('org_id', orgId).order('created_at', { ascending: false }).limit(500),
    ])

    const prospects = prospectsRes.data || []
    const projects = projectsRes.data || []

    const data: Record<string, StageData> = {}
    const sumRev = (arr: any[]) => arr.reduce((s, p) => s + (p.revenue || p.estimated_revenue || 0), 0)
    const avgDaysCalc = (arr: any[]) => {
      if (arr.length === 0) return 0
      const now = Date.now()
      const total = arr.reduce((s, p) => {
        const updated = new Date(p.updated_at || p.created_at).getTime()
        return s + (now - updated) / (1000 * 60 * 60 * 24)
      }, 0)
      return total / arr.length
    }

    // Map records to stages
    const newLeads = prospects.filter(p => p.status === 'new')
    const qualified = prospects.filter(p => ['hot', 'warm'].includes(p.status) || (p.score && p.score >= 50))
    const depositPaid = projects.filter(p => p.pipe_stage === 'sales_in')
    const intakeComplete = projects.filter(p => {
      const fd = p.form_data as any
      return p.pipe_stage === 'sales_in' && fd?.intake_completed
    })
    const designPhase = projects.filter(p => p.pipe_stage === 'production' && !(p.form_data as any)?.design_approved)
    const proofApproved = projects.filter(p => p.pipe_stage === 'production' && (p.form_data as any)?.design_approved)
    const printQueue = projects.filter(p => p.pipe_stage === 'production' && (p.form_data as any)?.vinyl_approved)
    const cutPrep = projects.filter(p => p.pipe_stage === 'install' && !(p.form_data as any)?.install_date)
    const qcCheck = projects.filter(p => p.pipe_stage === 'prod_review')
    const installScheduled = projects.filter(p => p.pipe_stage === 'install' && (p.form_data as any)?.install_date)
    const vehicleCheckin = projects.filter(p => p.pipe_stage === 'install' && (p.form_data as any)?.vehicle_checked_in)
    const installing = projects.filter(p => p.pipe_stage === 'install' && (p.form_data as any)?.install_started)
    const finalPhotos = projects.filter(p => p.pipe_stage === 'sales_close')
    const complete = projects.filter(p => p.pipe_stage === 'done' || p.status === 'closed')
    const reviewReq = projects.filter(p => (p.form_data as any)?.review_requested)

    const stageRecords: Record<string, any[]> = {
      new_lead: newLeads, qualified, deposit_paid: depositPaid,
      intake_complete: intakeComplete, design: designPhase,
      proof_approved: proofApproved, print_queue: printQueue,
      cut_prep: cutPrep, qc_check: qcCheck,
      install_scheduled: installScheduled, vehicle_checkin: vehicleCheckin,
      installing, final_photos: finalPhotos, complete, review_requested: reviewReq,
    }

    STAGES.forEach(stage => {
      const records = stageRecords[stage.key] || []
      data[stage.key] = {
        key: stage.key,
        label: stage.label,
        iconName: stage.iconName,
        count: records.length,
        value: sumRev(records),
        color: STAGE_COLORS[stage.key],
        records: records.slice(0, 50),
        avgDays: avgDaysCalc(records),
      }
    })

    setStageData(data)
  }, [profile.org_id, period])

  useEffect(() => { loadData() }, [loadData])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('engine-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prospects', filter: `org_id=eq.${profile.org_id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `org_id=eq.${profile.org_id}` }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile.org_id, loadData])

  // Position nodes in 3 rows for better layout
  const nodes: Node[] = useMemo(() => {
    const ROW_HEIGHT = 140
    const COL_WIDTH = 170
    const rows = [
      STAGES.slice(0, 5),    // Row 1: Lead -> Intake
      STAGES.slice(5, 10),   // Row 2: Design -> Install Sched
      STAGES.slice(10, 15),  // Row 3: Vehicle -> Review
    ]

    const allNodes: Node[] = []
    rows.forEach((row, rowIdx) => {
      row.forEach((stage, colIdx) => {
        allNodes.push({
          id: stage.key,
          type: 'stageNode',
          position: { x: colIdx * COL_WIDTH, y: rowIdx * ROW_HEIGHT },
          data: {
            ...(stageData[stage.key] || {
              key: stage.key, label: stage.label, iconName: stage.iconName,
              count: 0, value: 0, color: STAGE_COLORS[stage.key], records: [], avgDays: 0,
            }),
            onOpen: setDrawerKey,
          },
        })
      })
    })
    return allNodes
  }, [stageData])

  const edges: Edge[] = useMemo(() => {
    return STAGES.slice(0, -1).map((stage, i) => {
      const next = STAGES[i + 1]
      // Handle row transitions (4->5 goes down, 9->10 goes down)
      const isRowTransition = i === 4 || i === 9

      return {
        id: `${stage.key}-${next.key}`,
        source: stage.key,
        target: next.key,
        animated: true,
        style: {
          stroke: STAGE_COLORS[stage.key],
          strokeWidth: 2,
          opacity: 0.6,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: STAGE_COLORS[next.key], width: 12, height: 12 },
        type: isRowTransition ? 'smoothstep' : 'default',
      }
    })
  }, [])

  const drawerData = drawerKey ? stageData[drawerKey] : null

  // Summary stats
  const totalFound = stageData.new_lead?.count || 0
  const totalQualified = stageData.qualified?.count || 0
  const totalDeposits = stageData.deposit_paid?.count || 0
  const depositValue = stageData.deposit_paid?.value || 0
  const totalComplete = stageData.complete?.count || 0
  const completeValue = stageData.complete?.value || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Summary Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px',
        background: 'linear-gradient(180deg, var(--card-bg), var(--surface))',
        borderBottom: '1px solid var(--card-border)',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <h1 style={{
            fontSize: 22, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
            color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(79,127,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
            </div>
            Revenue Engine
          </h1>
          <div style={{
            display: 'flex', gap: 20, fontSize: 12, fontWeight: 700,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            <span><span style={{ color: 'var(--text3)' }}>Leads </span><span style={{ color: 'var(--accent)' }}>{totalFound}</span></span>
            <span><span style={{ color: 'var(--text3)' }}>Qualified </span><span style={{ color: 'var(--purple)' }}>{totalQualified}</span></span>
            <span><span style={{ color: 'var(--text3)' }}>Deposits </span><span style={{ color: 'var(--green)' }}>{totalDeposits} (${depositValue.toLocaleString()})</span></span>
            <span><span style={{ color: 'var(--text3)' }}>Complete </span><span style={{ color: 'var(--green)' }}>{totalComplete} (${completeValue.toLocaleString()})</span></span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--card-border)' }}>
          {(['today', 'week', 'month'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
                border: 'none',
                background: period === p ? 'var(--card-bg)' : 'transparent',
                color: period === p ? 'var(--text1)' : 'var(--text3)',
                fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
                transition: 'all 0.15s',
                boxShadow: period === p ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Flow Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          proOptions={{ hideAttribution: true }}
          style={{ background: '#0d0f14' }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
        >
          <Background color="#1a1d2720" gap={24} size={1} />
          <Controls
            showInteractive={false}
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}
          />
        </ReactFlow>

        {/* Stage Drawer */}
        {drawerData && (
          <>
            <div
              onClick={() => setDrawerKey(null)}
              style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.3)',
                backdropFilter: 'blur(4px)',
                zIndex: 9,
              }}
            />
            <div style={{
              position: 'absolute', top: 0, right: 0, bottom: 0, width: 400,
              background: 'var(--surface)',
              borderLeft: '1px solid var(--card-border)',
              display: 'flex', flexDirection: 'column', zIndex: 10,
              boxShadow: '-12px 0 48px rgba(0,0,0,0.4)',
              animation: 'slideInRight .3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', borderBottom: '1px solid var(--card-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${drawerData.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {(() => {
                      const Icon = STAGES.find(s => s.key === drawerData.key)?.lucideIcon || CheckCircle
                      return <Icon size={20} style={{ color: drawerData.color }} />
                    })()}
                  </div>
                  <div>
                    <div style={{
                      fontSize: 16, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif',
                      color: drawerData.color, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {drawerData.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {drawerData.count} records &middot; ${drawerData.value.toLocaleString()}
                    </div>
                  </div>
                </div>
                <button onClick={() => setDrawerKey(null)} style={{
                  background: 'var(--surface2)', border: '1px solid var(--card-border)',
                  color: 'var(--text3)', cursor: 'pointer', padding: 8, borderRadius: 8,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text1)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
                >
                  <X size={16} />
                </button>
              </div>

              {drawerData.avgDays != null && drawerData.avgDays > 0 && (
                <div style={{
                  padding: '8px 20px', borderBottom: '1px solid var(--card-border)',
                  fontSize: 11, color: drawerData.avgDays > 7 ? 'var(--red)' : 'var(--text3)',
                  fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
                }}>
                  Avg time at stage: {drawerData.avgDays.toFixed(1)} days
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {drawerData.records.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)', fontSize: 13 }}>
                    No records at this stage
                  </div>
                )}
                {drawerData.records.map((r: any, idx: number) => (
                  <div key={r.id} style={{
                    padding: '12px 14px', background: 'var(--card-bg)', borderRadius: 12,
                    border: '1px solid var(--card-border)',
                    animation: `staggerIn .3s ease ${idx * 0.03}s both`,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.transform = 'translateX(4px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--card-border)'
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                      {r.business_name || r.company || r.title || r.name || '\u2014'}
                    </div>
                    {(r.email || (r.customer as any)?.name) && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        {(r.customer as any)?.name || r.email || ''}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 11, alignItems: 'center' }}>
                      {r.score != null && (
                        <span style={{
                          color: r.score >= 60 ? 'var(--green)' : 'var(--amber)',
                          fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                        }}>
                          Score: {r.score}
                        </span>
                      )}
                      {r.revenue != null && r.revenue > 0 && (
                        <span style={{
                          color: 'var(--green)',
                          fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                        }}>
                          ${r.revenue.toLocaleString()}
                        </span>
                      )}
                      {r.estimated_revenue != null && r.estimated_revenue > 0 && (
                        <span style={{
                          color: 'var(--cyan)',
                          fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                        }}>
                          ~${r.estimated_revenue.toLocaleString()}
                        </span>
                      )}
                      {r.status && (
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                          background: `${drawerData.color}15`, color: drawerData.color,
                          textTransform: 'uppercase',
                        }}>
                          {r.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
