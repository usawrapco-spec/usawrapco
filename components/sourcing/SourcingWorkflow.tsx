'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import ReactFlow, {
  Node, Edge, Background, Controls,
  MarkerType, Position, Handle,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { X, Globe, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SourcingProps {
  profile: Profile
  initialOrders: any[]
}

interface SrcStage {
  key: string
  label: string
  icon: string
  color: string
  statusMatch: string[]
}

const SRC_STAGES: SrcStage[] = [
  { key: 'monitor', label: 'MONITOR', icon: '👁️', color: '#4f7fff', statusMatch: ['new'] },
  { key: 'match', label: 'MATCH', icon: '🎯', color: '#8b5cf6', statusMatch: ['matched'] },
  { key: 'quote', label: 'QUOTE', icon: '💲', color: '#22d3ee', statusMatch: ['quoted'] },
  { key: 'accepted', label: 'ACCEPTED', icon: '🤝', color: '#22c07a', statusMatch: ['accepted'] },
  { key: 'source', label: 'SOURCE', icon: '🏭', color: '#f59e0b', statusMatch: ['sourcing', 'manufacturing', 'shipped'] },
  { key: 'fulfill', label: 'FULFILL', icon: '📦', color: '#22d3ee', statusMatch: ['customs', 'delivered'] },
  { key: 'collect', label: 'COLLECT', icon: '💰', color: '#22c07a', statusMatch: ['invoiced', 'paid'] },
]

function SrcNode({ data }: { data: any }) {
  const count = data.count || 0
  const color = data.color
  const borderColor = count === 0 ? '#1a1d27' : color

  return (
    <div
      onClick={() => data.onOpen?.(data.key)}
      style={{
        width: 120, padding: '12px 8px', borderRadius: 14,
        background: count === 0 ? '#13151c' : `${borderColor}12`,
        border: `2px solid ${borderColor}`,
        cursor: 'pointer', textAlign: 'center', position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: borderColor, width: 6, height: 6, border: 'none' }} />
      <Handle type="source" position={Position.Right} style={{ background: borderColor, width: 6, height: 6, border: 'none' }} />
      <div style={{ fontSize: 26, marginBottom: 4 }}>{data.icon}</div>
      <div style={{
        fontSize: 10, fontWeight: 800, color: borderColor,
        fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        {data.label}
      </div>
      <div style={{
        fontSize: 24, fontWeight: 900, color: '#e8eaed',
        fontFamily: 'JetBrains Mono, monospace', marginTop: 2,
      }}>
        {count}
      </div>
      {data.value > 0 && (
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#22c07a',
          fontFamily: 'JetBrains Mono, monospace', marginTop: 1,
        }}>
          ${data.value.toLocaleString()}
        </div>
      )}
    </div>
  )
}

const nodeTypes = { srcNode: SrcNode }

export default function SourcingWorkflow({ profile, initialOrders }: SourcingProps) {
  const supabase = createClient()
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>(initialOrders)
  const [drawerKey, setDrawerKey] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('sourcing-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sourcing_orders', filter: `org_id=eq.${profile.org_id}` }, (payload) => {
        if (payload.eventType === 'INSERT') setOrders(prev => [...prev, payload.new])
        else if (payload.eventType === 'UPDATE') setOrders(prev => prev.map(o => o.id === (payload.new as any).id ? { ...o, ...payload.new } : o))
        else if (payload.eventType === 'DELETE') setOrders(prev => prev.filter(o => o.id !== (payload.old as any).id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile.org_id])

  // Group by stage
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {}
    SRC_STAGES.forEach(s => { g[s.key] = [] })
    orders.forEach(o => {
      const stage = SRC_STAGES.find(s => s.statusMatch.includes(o.status))
      if (stage) g[stage.key].push(o)
    })
    return g
  }, [orders])

  const nodes: Node[] = useMemo(() => {
    return SRC_STAGES.map((stage, i) => {
      const records = grouped[stage.key] || []
      const value = records.reduce((s, o) => s + (o.estimated_value || o.our_sell_price || 0), 0)
      return {
        id: stage.key,
        type: 'srcNode',
        position: { x: i * 170, y: i % 2 === 0 ? 0 : 50 },
        data: {
          ...stage,
          count: records.length,
          value,
          records,
          onOpen: setDrawerKey,
        },
      }
    })
  }, [grouped])

  const edges: Edge[] = useMemo(() => {
    return SRC_STAGES.slice(0, -1).map((stage, i) => ({
      id: `${stage.key}-${SRC_STAGES[i + 1].key}`,
      source: stage.key,
      target: SRC_STAGES[i + 1].key,
      animated: true,
      style: { stroke: stage.color + '60', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: SRC_STAGES[i + 1].color },
    }))
  }, [])

  const drawerStage = SRC_STAGES.find(s => s.key === drawerKey)
  const drawerRecords = drawerKey ? (grouped[drawerKey] || []) : []

  const totalOrders = orders.length
  const totalValue = orders.reduce((s, o) => s + (o.our_sell_price || o.estimated_value || 0), 0)
  const totalMargin = orders.reduce((s, o) => s + ((o.our_sell_price || 0) - (o.our_landed_cost || 0)), 0)

  // Add RFQ form state
  const [rfqForm, setRfqForm] = useState({
    source_platform: 'manual', rfq_title: '', description: '',
    quantity: '', specs: '', buyer_name: '', buyer_location: '',
    category: '', deadline: '', estimated_value: '',
  })
  const [rfqSaving, setRfqSaving] = useState(false)

  async function handleAddRFQ() {
    if (!rfqForm.rfq_title.trim()) return
    setRfqSaving(true)
    const { data, error } = await supabase.from('sourcing_orders').insert({
      org_id: profile.org_id,
      source_platform: rfqForm.source_platform,
      rfq_title: rfqForm.rfq_title,
      description: rfqForm.description,
      quantity: rfqForm.quantity,
      specs: rfqForm.specs,
      buyer_name: rfqForm.buyer_name,
      buyer_location: rfqForm.buyer_location,
      category: rfqForm.category,
      deadline: rfqForm.deadline || null,
      estimated_value: parseFloat(rfqForm.estimated_value) || 0,
      status: 'new',
    }).select().single()

    if (!error && data) {
      setOrders(prev => [data, ...prev])
      setShowAddModal(false)
      setRfqForm({ source_platform: 'manual', rfq_title: '', description: '', quantity: '', specs: '', buyer_name: '', buyer_location: '', category: '', deadline: '', estimated_value: '' })
    }
    setRfqSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{
            fontSize: 22, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
            color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Globe size={20} style={{ color: 'var(--green)' }} />
            AI SOURCING BROKER
          </h1>
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text3)' }}>
            {totalOrders} orders · ${totalValue.toLocaleString()} value · ${totalMargin.toLocaleString()} margin
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/sourcing/monitor')} style={{
            padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            RFQ Feed
          </button>
          <button onClick={() => router.push('/sourcing/suppliers')} style={{
            padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            Suppliers
          </button>
          <button onClick={() => setShowAddModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 14px', borderRadius: 6, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            <Plus size={14} /> Add RFQ
          </button>
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
                <div style={{ fontSize: 22 }}>{drawerStage.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: drawerStage.color, textTransform: 'uppercase' }}>
                  {drawerStage.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{drawerRecords.length} orders</div>
              </div>
              <button onClick={() => setDrawerKey(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {drawerRecords.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>No orders at this stage</div>
              )}
              {drawerRecords.map((order: any) => (
                <div key={order.id} style={{
                  padding: '10px 12px', background: 'var(--surface2)', borderRadius: 10,
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{order.rfq_title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {order.source_platform} · {order.category || 'General'} · {order.buyer_name || '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11 }}>
                    {order.estimated_value > 0 && (
                      <span style={{ color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                        ${order.estimated_value.toLocaleString()}
                      </span>
                    )}
                    {order.margin_estimate > 0 && (
                      <span style={{ color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                        {order.margin_estimate}% margin
                      </span>
                    )}
                    <span style={{
                      padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                      background: 'rgba(79,127,255,0.1)', color: 'var(--accent)', textTransform: 'uppercase',
                    }}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add RFQ Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false) }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)',
            width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', textTransform: 'uppercase' }}>Add RFQ</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <RfqField label="Source Platform" type="select" value={rfqForm.source_platform} onChange={v => setRfqForm(f => ({ ...f, source_platform: v }))}
                options={['manual', 'mfg.com', 'rfqmatch.com', 'thomasnet', 'sam.gov', 'other']} />
              <RfqField label="RFQ Title *" value={rfqForm.rfq_title} onChange={v => setRfqForm(f => ({ ...f, rfq_title: v }))} placeholder="Product or service needed" />
              <RfqField label="Description" value={rfqForm.description} onChange={v => setRfqForm(f => ({ ...f, description: v }))} placeholder="Full RFQ details..." multiline />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <RfqField label="Quantity" value={rfqForm.quantity} onChange={v => setRfqForm(f => ({ ...f, quantity: v }))} placeholder="e.g. 500 units" />
                <RfqField label="Category" type="select" value={rfqForm.category} onChange={v => setRfqForm(f => ({ ...f, category: v }))}
                  options={['', 'branded_merch', 'packaging', 'promotional', 'signage', 'plastics', 'ppe', 'cleaning', 'furniture', 'led', 'apparel', 'marine_decking', 'vehicle_accessories', 'other']} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <RfqField label="Buyer Name" value={rfqForm.buyer_name} onChange={v => setRfqForm(f => ({ ...f, buyer_name: v }))} placeholder="Company name" />
                <RfqField label="Buyer Location" value={rfqForm.buyer_location} onChange={v => setRfqForm(f => ({ ...f, buyer_location: v }))} placeholder="City, State" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <RfqField label="Estimated Value ($)" value={rfqForm.estimated_value} onChange={v => setRfqForm(f => ({ ...f, estimated_value: v }))} placeholder="5000" />
                <RfqField label="Deadline" value={rfqForm.deadline} onChange={v => setRfqForm(f => ({ ...f, deadline: v }))} type="date" />
              </div>
              <RfqField label="Specs" value={rfqForm.specs} onChange={v => setRfqForm(f => ({ ...f, specs: v }))} placeholder="Technical specifications..." multiline />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddRFQ} disabled={rfqSaving || !rfqForm.rfq_title.trim()} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (rfqSaving || !rfqForm.rfq_title.trim()) ? 0.5 : 1 }}>
                {rfqSaving ? 'Saving...' : 'Add RFQ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RfqField({ label, value, onChange, placeholder, type, multiline, options }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; multiline?: boolean; options?: string[]
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    background: 'var(--surface2)', border: '1px solid var(--border)',
    color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)',
        marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em',
        fontFamily: 'Barlow Condensed, sans-serif',
      }}>{label}</label>
      {type === 'select' && options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
          {options.map(o => <option key={o} value={o}>{o || '—'}</option>)}
        </select>
      ) : multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          style={{ ...inputStyle, resize: 'vertical' }} />
      ) : (
        <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={inputStyle} />
      )}
    </div>
  )
}
