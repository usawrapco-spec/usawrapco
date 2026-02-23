'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import ReactFlow, {
  Node, Edge, Background, Controls,
  MarkerType, Position, Handle,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { X, TrendingUp, Search, Mail, MessageSquare, DollarSign, Palette, Printer, Wrench, CheckCircle } from 'lucide-react'

interface EngineMapProps {
  profile: Profile
}

interface StageData {
  key: string
  label: string
  icon: string
  count: number
  value: number
  color: string
  records: any[]
}

const STAGES: { key: string; label: string; icon: any; queryFn: string }[] = [
  { key: 'discover', label: 'DISCOVER', icon: '🔍', queryFn: 'prospects_new' },
  { key: 'score', label: 'SCORE', icon: '📊', queryFn: 'prospects_scored' },
  { key: 'outreach', label: 'OUTREACH', icon: '📧', queryFn: 'prospects_contacted' },
  { key: 'conversation', label: 'CONVERSATION', icon: '💬', queryFn: 'prospects_replied' },
  { key: 'deposit', label: 'DEPOSIT', icon: '💰', queryFn: 'projects_deposit' },
  { key: 'design', label: 'DESIGN', icon: '🎨', queryFn: 'projects_design' },
  { key: 'production', label: 'PRODUCTION', icon: '🖨️', queryFn: 'projects_production' },
  { key: 'install', label: 'INSTALL', icon: '🔧', queryFn: 'projects_install' },
  { key: 'complete', label: 'COMPLETE', icon: '✅', queryFn: 'projects_complete' },
]

const STAGE_COLORS: Record<string, string> = {
  discover: '#4f7fff',
  score: '#8b5cf6',
  outreach: '#22d3ee',
  conversation: '#f59e0b',
  deposit: '#22c07a',
  design: '#8b5cf6',
  production: '#22d3ee',
  install: '#f59e0b',
  complete: '#22c07a',
}

function getNodeColor(count: number): string {
  if (count === 0) return '#1a1d27' // gray/empty
  if (count >= 10) return '#22c07a' // green/healthy
  if (count >= 3) return '#f59e0b' // yellow/attention
  return '#4f7fff' // blue/active
}

function StageNode({ data }: { data: StageData }) {
  const bgColor = getNodeColor(data.count)
  const borderColor = data.color || bgColor

  return (
    <div
      onClick={() => data.records && (data as any).onOpen?.(data.key)}
      style={{
        width: 140, padding: '14px 10px', borderRadius: 14,
        background: `${bgColor}15`, border: `2px solid ${borderColor}`,
        cursor: 'pointer', transition: 'all 0.2s',
        textAlign: 'center', position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: borderColor, width: 8, height: 8, border: 'none' }} />
      <Handle type="source" position={Position.Right} style={{ background: borderColor, width: 8, height: 8, border: 'none' }} />
      <div style={{ fontSize: 28, marginBottom: 6 }}>{data.icon}</div>
      <div style={{
        fontSize: 11, fontWeight: 800, color: borderColor,
        fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {data.label}
      </div>
      <div style={{
        fontSize: 28, fontWeight: 900, color: '#e8eaed',
        fontFamily: 'JetBrains Mono, monospace', marginTop: 4,
      }}>
        {data.count}
      </div>
      {data.value > 0 && (
        <div style={{
          fontSize: 11, fontWeight: 700, color: '#22c07a',
          fontFamily: 'JetBrains Mono, monospace', marginTop: 2,
        }}>
          ${data.value.toLocaleString()}
        </div>
      )}
      {data.count > 0 && (
        <div style={{
          position: 'absolute', top: -4, right: -4,
          width: 10, height: 10, borderRadius: '50%',
          background: bgColor,
          animation: data.count > 5 ? 'pulse 2s infinite' : undefined,
        }} />
      )}
    </div>
  )
}

const nodeTypes = { stageNode: StageNode }

export default function RevenueEngineMap({ profile }: EngineMapProps) {
  const supabase = createClient()
  const [stageData, setStageData] = useState<Record<string, StageData>>({})
  const [drawerKey, setDrawerKey] = useState<string | null>(null)
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')

  const loadData = useCallback(async () => {
    const orgId = profile.org_id
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const since = period === 'today' ? startOfDay : period === 'week' ? startOfWeek : startOfMonth

    // Load prospects counts by status
    const [prospectsRes, projectsRes] = await Promise.all([
      supabase.from('prospects').select('id, status, score, business_name, company, name, email, estimated_revenue, created_at')
        .eq('org_id', orgId).order('created_at', { ascending: false }).limit(500),
      supabase.from('projects').select('id, title, status, pipe_stage, revenue, profit, customer:customer_id(name), agent:agent_id(name), created_at')
        .eq('org_id', orgId).order('created_at', { ascending: false }).limit(500),
    ])

    const prospects = prospectsRes.data || []
    const projects = projectsRes.data || []

    const data: Record<string, StageData> = {}

    // Prospects stages
    const newProspects = prospects.filter(p => ['new', 'hot', 'warm', 'cold'].includes(p.status))
    const scoredProspects = prospects.filter(p => p.score != null && p.score > 0)
    const contactedProspects = prospects.filter(p => p.status === 'contacted')
    const repliedProspects = prospects.filter(p => ['replied', 'interested'].includes(p.status))

    // Project stages
    const depositPaid = projects.filter(p => p.pipe_stage === 'sales_in')
    const designPhase = projects.filter(p => p.pipe_stage === 'production' && p.status !== 'closed')
    const productionPhase = projects.filter(p => p.pipe_stage === 'install')
    const installPhase = projects.filter(p => ['prod_review', 'sales_close'].includes(p.pipe_stage || ''))
    const complete = projects.filter(p => p.pipe_stage === 'done' || p.status === 'closed')

    const sumRev = (arr: any[]) => arr.reduce((s, p) => s + (p.revenue || p.estimated_revenue || 0), 0)

    STAGES.forEach(stage => {
      let records: any[] = []
      let count = 0
      let value = 0

      switch (stage.key) {
        case 'discover': records = newProspects; break
        case 'score': records = scoredProspects; break
        case 'outreach': records = contactedProspects; break
        case 'conversation': records = repliedProspects; break
        case 'deposit': records = depositPaid; break
        case 'design': records = designPhase; break
        case 'production': records = productionPhase; break
        case 'install': records = installPhase; break
        case 'complete': records = complete; break
      }

      count = records.length
      value = sumRev(records)

      data[stage.key] = {
        key: stage.key,
        label: stage.label,
        icon: stage.icon,
        count,
        value,
        color: STAGE_COLORS[stage.key],
        records: records.slice(0, 50),
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

  const nodes: Node[] = useMemo(() => {
    return STAGES.map((stage, i) => ({
      id: stage.key,
      type: 'stageNode',
      position: { x: i * 180, y: i % 2 === 0 ? 0 : 60 },
      data: {
        ...(stageData[stage.key] || { key: stage.key, label: stage.label, icon: stage.icon, count: 0, value: 0, color: STAGE_COLORS[stage.key], records: [] }),
        onOpen: setDrawerKey,
      },
    }))
  }, [stageData])

  const edges: Edge[] = useMemo(() => {
    return STAGES.slice(0, -1).map((stage, i) => ({
      id: `${stage.key}-${STAGES[i + 1].key}`,
      source: stage.key,
      target: STAGES[i + 1].key,
      animated: true,
      style: { stroke: STAGE_COLORS[stage.key], strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: STAGE_COLORS[STAGES[i + 1].key] },
    }))
  }, [])

  const drawerData = drawerKey ? stageData[drawerKey] : null

  // Summary stats
  const totalFound = stageData.discover?.count || 0
  const totalEmailed = stageData.outreach?.count || 0
  const totalReplied = stageData.conversation?.count || 0
  const totalDeposits = stageData.deposit?.count || 0
  const depositValue = stageData.deposit?.value || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Summary Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <h1 style={{
            fontSize: 22, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
            color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <TrendingUp size={20} style={{ color: 'var(--accent)' }} />
            REVENUE ENGINE
          </h1>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
            <span style={{ color: 'var(--accent)' }}>{totalFound} found</span>
            <span style={{ color: 'var(--cyan)' }}>{totalEmailed} emailed</span>
            <span style={{ color: 'var(--amber)' }}>{totalReplied} replied</span>
            <span style={{ color: 'var(--green)' }}>{totalDeposits} deposits (${depositValue.toLocaleString()})</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['today', 'week', 'month'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
                border: period === p ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: period === p ? 'rgba(79,127,255,0.15)' : 'transparent',
                color: period === p ? 'var(--accent)' : 'var(--text3)',
                fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
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
          <Controls
            showInteractive={false}
            style={{ background: '#13151c', border: '1px solid #1a1d27', borderRadius: 8 }}
          />
        </ReactFlow>

        {/* Stage Drawer */}
        {drawerData && (
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
                <div style={{ fontSize: 22 }}>{drawerData.icon}</div>
                <div style={{
                  fontSize: 16, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif',
                  color: drawerData.color, textTransform: 'uppercase',
                }}>
                  {drawerData.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {drawerData.count} records · ${drawerData.value.toLocaleString()}
                </div>
              </div>
              <button onClick={() => setDrawerKey(null)} style={{
                background: 'transparent', border: 'none', color: 'var(--text3)',
                cursor: 'pointer', padding: 4,
              }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {drawerData.records.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>
                  No records at this stage
                </div>
              )}
              {drawerData.records.map((r: any) => (
                <div key={r.id} style={{
                  padding: '10px 12px', background: 'var(--surface2)', borderRadius: 10,
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                    {r.business_name || r.company || r.title || r.name || '—'}
                  </div>
                  {(r.email || (r.customer as any)?.name) && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {r.email || (r.customer as any)?.name || ''}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11 }}>
                    {r.score != null && (
                      <span style={{ color: r.score >= 60 ? 'var(--green)' : 'var(--amber)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                        Score: {r.score}
                      </span>
                    )}
                    {r.revenue != null && (
                      <span style={{ color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                        ${r.revenue.toLocaleString()}
                      </span>
                    )}
                    {r.estimated_revenue != null && r.estimated_revenue > 0 && (
                      <span style={{ color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                        ~${r.estimated_revenue.toLocaleString()}
                      </span>
                    )}
                    {r.status && (
                      <span style={{
                        padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        background: 'rgba(79,127,255,0.1)', color: 'var(--accent)',
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
        )}
      </div>
    </div>
  )
}
