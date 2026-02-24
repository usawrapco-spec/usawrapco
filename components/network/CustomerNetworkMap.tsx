'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'
import {
  Search, X, Users, DollarSign, Star, Eye,
  ZoomIn, ZoomOut, Maximize2, Filter,
} from 'lucide-react'

interface Customer {
  id: string
  name?: string
  contact_name?: string
  company_name?: string
  email?: string
  phone?: string
  company?: string
  status?: string
  lifetime_spend?: number
  referral_source?: string
  created_at?: string
}

interface Connection {
  id: string
  from_customer_id: string
  to_customer_id: string
  connection_type: string
}

interface GraphNode {
  id: string
  label: string
  tier: 'prospect' | 'active' | 'vip' | 'referral_source'
  ltv: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  connections: number
}

interface GraphEdge {
  source: string
  target: string
  type: string
}

interface Props {
  profile: Profile
  customers: Customer[]
  connections: Connection[]
  projects: any[]
  referrals: any[]
}

const TIER_COLORS: Record<string, string> = {
  prospect: '#5a6080',
  active: '#4f7fff',
  vip: '#f59e0b',
  referral_source: '#22c07a',
}

const TIER_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  active: 'Active',
  vip: 'VIP',
  referral_source: 'Referral Source',
}

export default function CustomerNetworkMap({ profile, customers, connections, projects, referrals }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [filterTier, setFilterTier] = useState<string>('all')

  // Build graph data
  const { nodes, edges } = useMemo(() => {
    // Calculate LTV per customer from projects
    const ltvMap: Record<string, number> = {}
    projects.forEach(p => {
      if (p.customer_id && p.revenue) {
        ltvMap[p.customer_id] = (ltvMap[p.customer_id] || 0) + p.revenue
      }
    })

    // Build referral connections
    const referralEdges: GraphEdge[] = []
    referrals.forEach((r: any) => {
      if (r.referrer_customer_id && r.referred_customer_id) {
        referralEdges.push({
          source: r.referrer_customer_id,
          target: r.referred_customer_id,
          type: 'referral',
        })
      }
    })

    // Count connections per customer
    const connectionCount: Record<string, number> = {}
    const allEdges: GraphEdge[] = [
      ...connections.map(c => ({ source: c.from_customer_id, target: c.to_customer_id, type: c.connection_type })),
      ...referralEdges,
    ]
    allEdges.forEach(e => {
      connectionCount[e.source] = (connectionCount[e.source] || 0) + 1
      connectionCount[e.target] = (connectionCount[e.target] || 0) + 1
    })

    // Build nodes
    const graphNodes: GraphNode[] = customers.map((c, i) => {
      const ltv = c.lifetime_spend || ltvMap[c.id] || 0
      const conns = connectionCount[c.id] || 0
      let tier: GraphNode['tier'] = 'prospect'
      if (conns >= 3 || (referrals.some((r: any) => r.referrer_customer_id === c.id))) {
        tier = 'referral_source'
      } else if (ltv >= 10000) {
        tier = 'vip'
      } else if (c.status === 'active' || ltv > 0) {
        tier = 'active'
      }

      // Radius based on LTV
      const minR = 8
      const maxR = 40
      const maxLtv = 50000
      const radius = Math.max(minR, Math.min(maxR, minR + (ltv / maxLtv) * (maxR - minR)))

      // Initial position in a circle with some randomization
      const angle = (i / Math.max(customers.length, 1)) * Math.PI * 2
      const spread = 300 + Math.random() * 200
      return {
        id: c.id,
        label: c.contact_name || c.name || c.company_name || c.company || c.email || 'Unknown',
        tier,
        ltv,
        x: Math.cos(angle) * spread + (Math.random() - 0.5) * 100,
        y: Math.sin(angle) * spread + (Math.random() - 0.5) * 100,
        vx: 0,
        vy: 0,
        radius,
        connections: conns,
      }
    })

    return { nodes: graphNodes, edges: allEdges }
  }, [customers, connections, projects, referrals])

  // Force simulation
  const nodesRef = useRef<GraphNode[]>([])

  useEffect(() => {
    nodesRef.current = nodes.map(n => ({ ...n }))
  }, [nodes])

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const nodeMap: Record<string, GraphNode> = {}
    nodesRef.current.forEach(n => { nodeMap[n.id] = n })

    let iteration = 0
    const maxIterations = 300

    const simulate = () => {
      if (iteration >= maxIterations) {
        draw()
        animFrameRef.current = requestAnimationFrame(simulate)
        return
      }
      iteration++

      const ns = nodesRef.current
      const alpha = Math.max(0.01, 0.3 * (1 - iteration / maxIterations))

      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x
          const dy = ns[j].y - ns[i].y
          const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
          const force = (800 / (dist * dist)) * alpha
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          ns[i].vx -= fx
          ns[i].vy -= fy
          ns[j].vx += fx
          ns[j].vy += fy
        }
      }

      // Attraction (edges)
      edges.forEach(e => {
        const s = nodeMap[e.source]
        const t = nodeMap[e.target]
        if (!s || !t) return
        const dx = t.x - s.x
        const dy = t.y - s.y
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
        const force = (dist - 120) * 0.005 * alpha
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        s.vx += fx
        s.vy += fy
        t.vx -= fx
        t.vy -= fy
      })

      // Center gravity
      ns.forEach(n => {
        n.vx -= n.x * 0.0005 * alpha
        n.vy -= n.y * 0.0005 * alpha
        n.vx *= 0.85
        n.vy *= 0.85
        n.x += n.vx
        n.y += n.vy
      })

      draw()
      animFrameRef.current = requestAnimationFrame(simulate)
    }

    const draw = () => {
      const rect = container.getBoundingClientRect()
      const w = rect.width
      const h = rect.height

      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.save()
      ctx.translate(w / 2 + pan.x, h / 2 + pan.y)
      ctx.scale(zoom, zoom)

      const ns = nodesRef.current
      const nodeMap2: Record<string, GraphNode> = {}
      ns.forEach(n => { nodeMap2[n.id] = n })

      // Draw edges
      edges.forEach(e => {
        const s = nodeMap2[e.source]
        const t = nodeMap2[e.target]
        if (!s || !t) return

        if (filterTier !== 'all') {
          if (s.tier !== filterTier && t.tier !== filterTier) return
        }

        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(t.x, t.y)
        ctx.strokeStyle = e.type === 'referral' ? 'rgba(34, 192, 122, 0.25)' : 'rgba(79, 127, 255, 0.12)'
        ctx.lineWidth = e.type === 'referral' ? 1.5 : 0.8
        ctx.stroke()
      })

      // Draw nodes
      ns.forEach(n => {
        if (filterTier !== 'all' && n.tier !== filterTier) {
          // Draw dimmed
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(26, 29, 39, 0.5)'
          ctx.fill()
          return
        }

        const color = TIER_COLORS[n.tier]
        const isHovered = hoveredNode?.id === n.id
        const isSelected = selectedNode?.id === n.id
        const matchesSearch = search && n.label.toLowerCase().includes(search.toLowerCase())

        // Glow
        if (isSelected || isHovered || matchesSearch) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.radius + 8, 0, Math.PI * 2)
          const glow = ctx.createRadialGradient(n.x, n.y, n.radius, n.x, n.y, n.radius + 8)
          glow.addColorStop(0, color + '40')
          glow.addColorStop(1, color + '00')
          ctx.fillStyle = glow
          ctx.fill()
        }

        // Node circle
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
        const grad = ctx.createRadialGradient(
          n.x - n.radius * 0.3, n.y - n.radius * 0.3, 0,
          n.x, n.y, n.radius
        )
        grad.addColorStop(0, color + 'cc')
        grad.addColorStop(1, color + '60')
        ctx.fillStyle = grad
        ctx.fill()

        if (isSelected || isHovered) {
          ctx.strokeStyle = color
          ctx.lineWidth = 2
          ctx.stroke()
        }

        // Initials
        const initials = n.label.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        ctx.fillStyle = '#fff'
        ctx.font = `${Math.max(8, n.radius * 0.55)}px 'Barlow Condensed', sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(initials, n.x, n.y)

        // Label (if large enough or hovered)
        if (n.radius >= 16 || isHovered || isSelected || matchesSearch) {
          ctx.font = '10px Inter, sans-serif'
          ctx.fillStyle = '#e8eaed'
          ctx.fillText(n.label, n.x, n.y + n.radius + 14)
          if (n.ltv > 0) {
            ctx.font = '9px JetBrains Mono, monospace'
            ctx.fillStyle = '#22c07a'
            ctx.fillText('$' + n.ltv.toLocaleString(), n.x, n.y + n.radius + 26)
          }
        }
      })

      ctx.restore()
    }

    simulate()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [nodes, edges, zoom, pan, hoveredNode, selectedNode, search, filterTier])

  // Mouse handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    if (isDragging) {
      setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }))
      return
    }

    const rect = container.getBoundingClientRect()
    const mx = (e.clientX - rect.left - rect.width / 2 - pan.x) / zoom
    const my = (e.clientY - rect.top - rect.height / 2 - pan.y) / zoom

    let found: GraphNode | null = null
    nodesRef.current.forEach(n => {
      const dx = n.x - mx
      const dy = n.y - my
      if (Math.sqrt(dx * dx + dy * dy) < n.radius + 4) {
        found = n
      }
    })
    setHoveredNode(found)
    canvas.style.cursor = found ? 'pointer' : isDragging ? 'grabbing' : 'grab'
  }, [isDragging, zoom, pan])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (hoveredNode) {
      setSelectedNode(hoveredNode)
    } else {
      setSelectedNode(null)
    }
  }, [hoveredNode])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.max(0.2, Math.min(5, z * delta)))
  }, [])

  // Stats
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { prospect: 0, active: 0, vip: 0, referral_source: 0 }
    nodes.forEach(n => { counts[n.tier] = (counts[n.tier] || 0) + 1 })
    return counts
  }, [nodes])

  const totalLtv = useMemo(() => nodes.reduce((s, n) => s + n.ltv, 0), [nodes])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px',
        background: 'linear-gradient(180deg, var(--card-bg), var(--surface))',
        borderBottom: '1px solid var(--card-border)',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
              <Users size={18} style={{ color: 'var(--accent)' }} />
            </div>
            Customer Network
          </h1>

          {/* Tier legend */}
          <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
            {Object.entries(TIER_COLORS).map(([tier, color]) => (
              <button
                key={tier}
                onClick={() => setFilterTier(f => f === tier ? 'all' : tier)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: filterTier === tier ? `${color}20` : 'transparent',
                  border: filterTier === tier ? `1px solid ${color}40` : '1px solid transparent',
                  borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                  color: filterTier === tier || filterTier === 'all' ? color : 'var(--text3)',
                  fontWeight: 700, transition: 'all 0.15s',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                {TIER_LABELS[tier]} ({tierCounts[tier] || 0})
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>
            Network LTV: ${totalLtv.toLocaleString()}
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customers..."
              style={{
                padding: '7px 12px 7px 32px', borderRadius: 8,
                background: 'var(--surface2)', border: '1px solid var(--card-border)',
                color: 'var(--text1)', fontSize: 12, width: 200,
                outline: 'none', transition: 'all 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--card-border)'}
            />
          </div>

          {/* Zoom controls */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--card-border)' }}>
            <button onClick={() => setZoom(z => Math.min(5, z * 1.2))} style={{
              padding: 6, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer',
            }}><ZoomIn size={14} /></button>
            <button onClick={() => setZoom(z => Math.max(0.2, z / 1.2))} style={{
              padding: 6, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer',
            }}><ZoomOut size={14} /></button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} style={{
              padding: 6, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer',
            }}><Maximize2 size={14} /></button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={e => {
            if (!hoveredNode) {
              setIsDragging(true)
              setDragStart({ x: e.clientX, y: e.clientY })
            }
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => { setIsDragging(false); setHoveredNode(null) }}
          onClick={handleClick}
          onWheel={handleWheel}
          style={{ width: '100%', height: '100%', cursor: 'grab' }}
        />

        {/* Selected customer drawer */}
        {selectedNode && (
          <div style={{
            position: 'absolute', top: 16, right: 16, width: 320,
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16, padding: 20,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            animation: 'slideInRight .25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${TIER_COLORS[selectedNode.tier]}20`,
                  border: `1.5px solid ${TIER_COLORS[selectedNode.tier]}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800, color: TIER_COLORS[selectedNode.tier],
                  fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 8,
                }}>
                  {selectedNode.label.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>
                  {selectedNode.label}
                </div>
                <div style={{
                  display: 'inline-flex', padding: '2px 8px', borderRadius: 6, marginTop: 4,
                  background: `${TIER_COLORS[selectedNode.tier]}15`,
                  color: TIER_COLORS[selectedNode.tier],
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                }}>
                  {TIER_LABELS[selectedNode.tier]}
                </div>
              </div>
              <button onClick={() => setSelectedNode(null)} style={{
                background: 'var(--surface2)', border: '1px solid var(--card-border)',
                borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text3)',
              }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div style={{ padding: 10, borderRadius: 10, background: 'var(--surface2)' }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Lifetime Value</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
                  ${selectedNode.ltv.toLocaleString()}
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 10, background: 'var(--surface2)' }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Connections</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {selectedNode.connections}
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push(`/customers/${selectedNode.id}`)}
              style={{
                width: '100%', padding: '10px 16px', borderRadius: 10,
                background: 'var(--accent)', color: '#fff', border: 'none',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(79,127,255,0.35)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              View Customer Profile
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
