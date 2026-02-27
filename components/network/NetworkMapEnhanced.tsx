'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { X, TrendingUp, Users, Link2, Zap } from 'lucide-react'

interface NetworkMapEnhancedProps {
  profile: Profile
  customers: any[]
  connections: any[]
}

export default function NetworkMapEnhanced({
  profile,
  customers,
  connections,
}: NetworkMapEnhancedProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [nodeData, setNodeData] = useState<any[]>([])
  const [linkData, setLinkData] = useState<any[]>([])
  const [filterTier, setFilterTier] = useState<string>('all')
  const [filterAgent, setFilterAgent] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    // Build network data
    const nodes: any[] = []
    const links: any[] = []

    // Add customer nodes
    customers.forEach((customer) => {
      nodes.push({
        id: `customer-${customer.id}`,
        type: 'customer',
        name: customer.name,
        data: customer,
        lifetimeSpend: customer.lifetime_spend || 0,
        tier: customer.loyalty_tier || 'bronze',
        jobsCount: customer.jobs_completed || 0,
      })
    })

    // Add referral connections
    connections.forEach((conn) => {
      links.push({
        source: `customer-${conn.from_customer_id}`,
        target: `customer-${conn.to_customer_id}`,
        type: 'referral',
      })
    })

    setNodeData(nodes)
    setLinkData(links)
  }, [customers, connections])

  useEffect(() => {
    if (!svgRef.current || nodeData.length === 0) return

    // Simple force-directed graph simulation (simplified for demo)
    // In production, use d3-force for full physics simulation
    const svg = svgRef.current
    const width = svg.clientWidth
    const height = svg.clientHeight
    const centerX = width / 2
    const centerY = height / 2

    // Position nodes in a circle
    const radius = Math.min(width, height) / 3
    nodeData.forEach((node, i) => {
      const angle = (i / nodeData.length) * 2 * Math.PI
      node.x = centerX + radius * Math.cos(angle)
      node.y = centerY + radius * Math.sin(angle)
    })

    // Render (simplified - use d3.js for full implementation)
    renderGraph()
  }, [nodeData, linkData, filterTier, filterAgent])

  const renderGraph = () => {
    // This is a simplified placeholder
    // Full implementation would use d3-force, d3-zoom, d3-drag
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return '#e5e4e2'
      case 'gold': return '#ffd700'
      case 'silver': return '#c0c0c0'
      default: return '#cd7f32'
    }
  }

  const handleNodeClick = (node: any) => {
    setSelectedNode(node)
  }

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="relative w-full h-full">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          className="field text-xs py-2"
        >
          <option value="all">All Tiers</option>
          <option value="platinum">Platinum</option>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
          <option value="bronze">Bronze</option>
        </select>

        <select
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="field text-xs py-2"
        >
          <option value="all">All Agents</option>
        </select>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 card p-3">
        <div className="text-xs font-700 text-text2 uppercase mb-2">Legend</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#cd7f32' }}></div>
            <span>Bronze Tier</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#c0c0c0' }}></div>
            <span>Silver Tier</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#ffd700' }}></div>
            <span>Gold Tier</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#e5e4e2' }}></div>
            <span>Platinum Tier</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-green opacity-50" style={{ borderStyle: 'dashed' }}></div>
            <span>Referral</span>
          </div>
        </div>
      </div>

      {/* Graph SVG */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ background: 'var(--bg)' }}
      >
        {/* Links */}
        <g className="links">
          {linkData.map((link, i) => {
            const source = nodeData.find(n => n.id === link.source)
            const target = nodeData.find(n => n.id === link.target)
            if (!source || !target) return null

            return (
              <line
                key={i}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="#22c07a"
                strokeWidth={2}
                strokeDasharray="4 4"
                opacity={0.5}
              />
            )
          })}
        </g>

        {/* Nodes */}
        <g className="nodes">
          {nodeData.map((node) => {
            const nodeRadius = 8 + Math.sqrt(node.lifetimeSpend) / 50
            const tierColor = getTierColor(node.tier)

            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                onClick={() => handleNodeClick(node)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  r={nodeRadius}
                  fill={tierColor}
                  stroke="#fff"
                  strokeWidth={2}
                  opacity={0.9}
                />
                <text
                  y={nodeRadius + 12}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--text-text2)"
                >
                  {node.name.split(' ')[0]}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      {/* Node Detail Panel */}
      {selectedNode && (
        <div
          className="fixed inset-y-0 right-0 w-full max-w-md z-50"
          style={{ background: 'var(--surface)', boxShadow: '-4px 0 24px rgba(0,0,0,0.3)' }}
        >
          <div className="p-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-900 text-text1">{selectedNode.name}</h3>
              <button onClick={() => setSelectedNode(null)} className="p-2 hover:bg-surface2 rounded">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Tier Badge */}
              <div>
                <span
                  className="inline-block px-3 py-1 rounded-full text-xs font-700"
                  style={{
                    background: `${getTierColor(selectedNode.tier)}30`,
                    color: getTierColor(selectedNode.tier),
                  }}
                >
                  {selectedNode.tier.toUpperCase()}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-3">
                  <div className="text-xs text-text3 mb-1">Lifetime Spend</div>
                  <div className="text-lg font-900 text-text1">{formatMoney(selectedNode.lifetimeSpend)}</div>
                </div>
                <div className="card p-3">
                  <div className="text-xs text-text3 mb-1">Jobs</div>
                  <div className="text-lg font-900 text-text1">{selectedNode.jobsCount}</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <button className="btn-primary text-sm w-full">
                  New Estimate
                </button>
                <button className="btn-secondary text-sm w-full">
                  Send Message
                </button>
                <button className="btn-secondary text-sm w-full">
                  View All Jobs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="card p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xs text-text3 mb-1">Total Customers</div>
              <div className="text-lg font-900 text-text1">{nodeData.length}</div>
            </div>
            <div>
              <div className="text-xs text-text3 mb-1">Referrals</div>
              <div className="text-lg font-900 text-text1">{linkData.length}</div>
            </div>
            <div>
              <div className="text-xs text-text3 mb-1">Avg LTV</div>
              <div className="text-lg font-900 text-text1">
                {formatMoney(
                  nodeData.length > 0
                    ? nodeData.reduce((sum, n) => sum + n.lifetimeSpend, 0) / nodeData.length
                    : 0
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-text3 mb-1">Top Referrer</div>
              <div className="text-sm font-700 text-text1">—</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
