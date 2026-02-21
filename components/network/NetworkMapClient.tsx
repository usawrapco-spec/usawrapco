'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Search, Filter, Plus, X, Users, Link2, DollarSign,
  Truck, User, Building2, Mail, Phone, ArrowRight,
  ChevronRight, GitBranch, Network, Eye, EyeOff, Save, Loader2
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  org_id: string
  from_customer_id: string
  to_customer_id: string
  connection_type: string
  notes?: string
  created_at?: string
}

interface Props {
  profile: Profile
  customers: Customer[]
  connections: Connection[]
}

type CustomerStatus = 'active' | 'past' | 'prospect' | 'fleet'
type ConnectionType = 'referral' | 'knows' | 'fleet' | 'works_with' | 'family'

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_CUSTOMERS: Customer[] = [
  { id: 'demo-1',  contact_name: 'Bob Martinez',      company_name: "Bob's Pizza",       email: 'bob@bobspizza.com',       phone: '555-0101', status: 'active',   lifetime_spend: 14200, referral_source: 'inbound' },
  { id: 'demo-2',  contact_name: 'Joe Kowalski',      company_name: "Joe's Plumbing",    email: 'joe@joesplumbing.com',    phone: '555-0102', status: 'active',   lifetime_spend: 8900,  referral_source: 'referral' },
  { id: 'demo-3',  contact_name: 'Maria Santos',      company_name: 'Metro Cleaning Co', email: 'maria@metrocleaning.com', phone: '555-0103', status: 'active',   lifetime_spend: 22400, referral_source: 'referral' },
  { id: 'demo-4',  contact_name: 'Dave Chen',         company_name: 'ABC Landscaping',   email: 'dave@abclandscape.com',   phone: '555-0104', status: 'fleet',    lifetime_spend: 45600, referral_source: 'outbound' },
  { id: 'demo-5',  contact_name: 'Rachel Nguyen',     company_name: 'XYZ Electric',      email: 'rachel@xyzelectric.com',  phone: '555-0105', status: 'fleet',    lifetime_spend: 38100, referral_source: 'outbound' },
  { id: 'demo-6',  contact_name: 'Tom Bradley',       company_name: 'Bradley HVAC',      email: 'tom@bradleyhvac.com',     phone: '555-0106', status: 'active',   lifetime_spend: 6700,  referral_source: 'referral' },
  { id: 'demo-7',  contact_name: 'Sarah Kim',         company_name: 'Kim Realty Group',  email: 'sarah@kimrealty.com',     phone: '555-0107', status: 'prospect', lifetime_spend: 0,     referral_source: 'walk_in' },
  { id: 'demo-8',  contact_name: 'Mike Johnson',      company_name: "Mike's Auto Detail", email: 'mike@mikesauto.com',     phone: '555-0108', status: 'active',   lifetime_spend: 11300, referral_source: 'inbound' },
  { id: 'demo-9',  contact_name: 'Lisa Park',         company_name: 'Park Construction', email: 'lisa@parkconst.com',      phone: '555-0109', status: 'past',     lifetime_spend: 3200,  referral_source: 'referral' },
  { id: 'demo-10', contact_name: 'Carlos Rivera',     company_name: 'Rivera Catering',   email: 'carlos@riveracater.com',  phone: '555-0110', status: 'active',   lifetime_spend: 9800,  referral_source: 'referral' },
  { id: 'demo-11', contact_name: 'Jenny Walsh',       company_name: 'Walsh Fitness',     email: 'jenny@walshfit.com',      phone: '555-0111', status: 'prospect', lifetime_spend: 0,     referral_source: 'walk_in' },
  { id: 'demo-12', contact_name: 'Frank DeLuca',      company_name: "DeLuca's Deli",     email: 'frank@delucasdeli.com',   phone: '555-0112', status: 'active',   lifetime_spend: 5500,  referral_source: 'referral' },
  { id: 'demo-13', contact_name: 'Amanda Torres',     company_name: 'Torres Roofing',    email: 'amanda@torresroof.com',   phone: '555-0113', status: 'fleet',    lifetime_spend: 28700, referral_source: 'outbound' },
  { id: 'demo-14', contact_name: 'Greg Hoffman',      company_name: 'Hoffman Dental',    email: 'greg@hoffmandental.com',  phone: '555-0114', status: 'active',   lifetime_spend: 7100,  referral_source: 'referral' },
  { id: 'demo-15', contact_name: 'Nina Patel',        company_name: 'Patel Pharmacy',    email: 'nina@patelpharma.com',    phone: '555-0115', status: 'prospect', lifetime_spend: 0,     referral_source: 'inbound' },
]

const DEMO_CONNECTIONS: Connection[] = [
  // Bob's Pizza referred Joe's Plumbing and Metro Cleaning
  { id: 'dc-1',  org_id: '', from_customer_id: 'demo-1',  to_customer_id: 'demo-2',  connection_type: 'referral', notes: "Bob sent Joe our way after his fleet wrap" },
  { id: 'dc-2',  org_id: '', from_customer_id: 'demo-1',  to_customer_id: 'demo-3',  connection_type: 'referral', notes: "Bob recommended us to Maria" },
  // ABC Landscaping and XYZ Electric in same fleet group
  { id: 'dc-3',  org_id: '', from_customer_id: 'demo-4',  to_customer_id: 'demo-5',  connection_type: 'fleet',    notes: "Both part of Northeast fleet contract" },
  // Torres Roofing also in fleet with ABC Landscaping
  { id: 'dc-4',  org_id: '', from_customer_id: 'demo-4',  to_customer_id: 'demo-13', connection_type: 'fleet',    notes: "Fleet group - commercial vehicles" },
  // Joe's Plumbing referred Bradley HVAC (2nd level referral chain)
  { id: 'dc-5',  org_id: '', from_customer_id: 'demo-2',  to_customer_id: 'demo-6',  connection_type: 'referral', notes: "Joe sent Tom after seeing our work" },
  // Bradley HVAC referred Hoffman Dental (3rd level referral chain)
  { id: 'dc-6',  org_id: '', from_customer_id: 'demo-6',  to_customer_id: 'demo-14', connection_type: 'referral', notes: "Tom recommended us to his dentist" },
  // Metro Cleaning referred Rivera Catering
  { id: 'dc-7',  org_id: '', from_customer_id: 'demo-3',  to_customer_id: 'demo-10', connection_type: 'referral', notes: "Maria referred Carlos" },
  // Rivera Catering referred DeLuca's Deli
  { id: 'dc-8',  org_id: '', from_customer_id: 'demo-10', to_customer_id: 'demo-12', connection_type: 'referral', notes: "Carlos and Frank are business neighbors" },
  // Mike's Auto Detail knows Bob's Pizza
  { id: 'dc-9',  org_id: '', from_customer_id: 'demo-8',  to_customer_id: 'demo-1',  connection_type: 'knows',    notes: "Mike details Bob's delivery vehicles" },
  // Sarah Kim knows Lisa Park
  { id: 'dc-10', org_id: '', from_customer_id: 'demo-7',  to_customer_id: 'demo-9',  connection_type: 'knows',    notes: "Real estate and construction contacts" },
  // Lisa Park works_with Torres Roofing
  { id: 'dc-11', org_id: '', from_customer_id: 'demo-9',  to_customer_id: 'demo-13', connection_type: 'works_with', notes: "Subcontractor relationship" },
  // Carlos Rivera and Frank DeLuca are family
  { id: 'dc-12', org_id: '', from_customer_id: 'demo-10', to_customer_id: 'demo-12', connection_type: 'family',   notes: "Brothers-in-law" },
  // Jenny Walsh knows Greg Hoffman
  { id: 'dc-13', org_id: '', from_customer_id: 'demo-11', to_customer_id: 'demo-14', connection_type: 'knows',    notes: "Same business park" },
  // Nina Patel referred by Greg Hoffman
  { id: 'dc-14', org_id: '', from_customer_id: 'demo-14', to_customer_id: 'demo-15', connection_type: 'referral', notes: "Greg told Nina about our work" },
]

// ─── Helper functions ─────────────────────────────────────────────────────────

function getCustomerDisplayName(c: Customer): string {
  return c.company_name || c.company || c.contact_name || c.name || 'Unknown'
}

function getCustomerContactName(c: Customer): string {
  return c.contact_name || c.name || ''
}

function getInitials(c: Customer): string {
  const name = getCustomerDisplayName(c)
  const parts = name.split(/[\s]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function getStatusColor(status?: string): string {
  switch (status) {
    case 'active': return '#22c07a'
    case 'past':   return '#5a6080'
    case 'prospect': return '#f59e0b'
    case 'fleet':  return '#4f7fff'
    default:       return '#9299b5'
  }
}

function getConnectionColor(type: string): string {
  switch (type) {
    case 'referral':   return '#22c07a'
    case 'knows':      return '#9299b5'
    case 'fleet':      return '#4f7fff'
    case 'works_with': return '#8b5cf6'
    case 'family':     return '#f25a5a'
    default:           return '#5a6080'
  }
}

function getConnectionLabel(type: string): string {
  switch (type) {
    case 'referral':   return 'Referred'
    case 'knows':      return 'Knows'
    case 'fleet':      return 'Fleet Group'
    case 'works_with': return 'Works With'
    case 'family':     return 'Family'
    default:           return type
  }
}

function formatCurrency(val: number | undefined | null): string {
  if (val == null) return '$0'
  return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function getRevenueTier(spend: number | undefined | null): string {
  const s = spend || 0
  if (s >= 25000) return 'platinum'
  if (s >= 10000) return 'gold'
  if (s >= 5000)  return 'silver'
  return 'bronze'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NetworkMapClient({ profile, customers: rawCustomers, connections: rawConnections }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const containerRef = useRef<HTMLDivElement>(null)

  // Use demo data when no real customers available
  const isDemo = rawCustomers.length === 0
  const customers = isDemo ? DEMO_CUSTOMERS : rawCustomers
  const connections = isDemo ? DEMO_CONNECTIONS : rawConnections

  // ─── State ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [showAddConnection, setShowAddConnection] = useState(false)
  const [addConnectionForm, setAddConnectionForm] = useState({
    from_customer_id: '',
    to_customer_id: '',
    connection_type: 'referral' as ConnectionType,
    notes: '',
  })
  const [savingConnection, setSavingConnection] = useState(false)
  const [localConnections, setLocalConnections] = useState<Connection[]>(connections)
  const [showLabels, setShowLabels] = useState(true)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({})
  const [containerSize, setContainerSize] = useState({ width: 900, height: 600 })

  // ─── Resize observer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // ─── Filtered customers ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return customers.filter(c => {
      const q = search.toLowerCase()
      const matchesSearch = !q ||
        getCustomerDisplayName(c).toLowerCase().includes(q) ||
        getCustomerContactName(c).toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter
      const matchesTier = tierFilter === 'all' || getRevenueTier(c.lifetime_spend) === tierFilter
      return matchesSearch && matchesStatus && matchesTier
    })
  }, [customers, search, statusFilter, tierFilter])

  // ─── Build adjacency map ───────────────────────────────────────────────────
  const adjacencyMap = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    localConnections.forEach(conn => {
      if (!map[conn.from_customer_id]) map[conn.from_customer_id] = new Set()
      if (!map[conn.to_customer_id]) map[conn.to_customer_id] = new Set()
      map[conn.from_customer_id].add(conn.to_customer_id)
      map[conn.to_customer_id].add(conn.from_customer_id)
    })
    return map
  }, [localConnections])

  // ─── Compute node positions (force-directed-like layout) ────────────────────
  const computedPositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {}
    const filteredIds = new Set(filtered.map(c => c.id))
    const nodes = filtered.slice()
    const n = nodes.length
    if (n === 0) return positions

    const w = containerSize.width
    const h = containerSize.height
    const cx = w / 2
    const cy = h / 2
    const padding = 60

    // Group connected nodes into clusters
    const visited = new Set<string>()
    const clusters: string[][] = []

    function dfs(nodeId: string, cluster: string[]) {
      if (visited.has(nodeId) || !filteredIds.has(nodeId)) return
      visited.add(nodeId)
      cluster.push(nodeId)
      const neighbors = adjacencyMap[nodeId] || new Set()
      neighbors.forEach(nid => {
        if (filteredIds.has(nid)) dfs(nid, cluster)
      })
    }

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const cluster: string[] = []
        dfs(node.id, cluster)
        if (cluster.length > 0) clusters.push(cluster)
      }
    })

    // Sort clusters by size (largest first)
    clusters.sort((a, b) => b.length - a.length)

    // Layout clusters in a circular arrangement
    const totalClusters = clusters.length
    const maxRadius = Math.min(w, h) / 2 - padding - 40

    if (totalClusters === 1 && clusters[0].length <= 20) {
      // Single cluster: arrange in a circle with connected nodes closer
      const cluster = clusters[0]
      const clusterRadius = Math.min(maxRadius, Math.max(120, cluster.length * 22))
      cluster.forEach((id, i) => {
        const angle = (2 * Math.PI * i) / cluster.length - Math.PI / 2
        positions[id] = {
          x: cx + Math.cos(angle) * clusterRadius,
          y: cy + Math.sin(angle) * clusterRadius,
        }
      })
    } else {
      // Multiple clusters: arrange clusters around center
      const clusterAngleStep = (2 * Math.PI) / Math.max(totalClusters, 1)

      clusters.forEach((cluster, ci) => {
        const clusterAngle = clusterAngleStep * ci - Math.PI / 2
        const distFromCenter = totalClusters === 1 ? 0 : maxRadius * 0.55
        const clusterCx = cx + Math.cos(clusterAngle) * distFromCenter
        const clusterCy = cy + Math.sin(clusterAngle) * distFromCenter

        if (cluster.length === 1) {
          positions[cluster[0]] = { x: clusterCx, y: clusterCy }
        } else {
          const subRadius = Math.min(maxRadius * 0.35, Math.max(60, cluster.length * 18))
          cluster.forEach((id, i) => {
            const angle = (2 * Math.PI * i) / cluster.length - Math.PI / 2
            positions[id] = {
              x: clusterCx + Math.cos(angle) * subRadius,
              y: clusterCy + Math.sin(angle) * subRadius,
            }
          })
        }
      })
    }

    // Simple force relaxation passes to reduce overlap
    const nodeIds = Object.keys(positions)
    for (let iter = 0; iter < 50; iter++) {
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const a = positions[nodeIds[i]]
          const b = positions[nodeIds[j]]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const minDist = 70
          if (dist < minDist) {
            const force = (minDist - dist) / 2
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            a.x -= fx
            a.y -= fy
            b.x += fx
            b.y += fy
          }
        }
      }
      // Keep within bounds
      nodeIds.forEach(id => {
        const p = positions[id]
        p.x = Math.max(padding, Math.min(w - padding, p.x))
        p.y = Math.max(padding, Math.min(h - padding, p.y))
      })
    }

    return positions
  }, [filtered, adjacencyMap, containerSize])

  // Merge computed with any user-dragged overrides
  const finalPositions = useMemo(() => {
    const merged: Record<string, { x: number; y: number }> = { ...computedPositions }
    Object.keys(nodePositions).forEach(id => {
      if (computedPositions[id]) {
        merged[id] = nodePositions[id]
      }
    })
    return merged
  }, [computedPositions, nodePositions])

  // ─── Connections for filtered customers ─────────────────────────────────────
  const filteredConnections = useMemo(() => {
    const filteredIds = new Set(filtered.map(c => c.id))
    return localConnections.filter(
      conn => filteredIds.has(conn.from_customer_id) && filteredIds.has(conn.to_customer_id)
    )
  }, [filtered, localConnections])

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const activeCount = customers.filter(c => c.status === 'active').length
    const referralChains = localConnections.filter(c => c.connection_type === 'referral').length
    const fleetGroups = new Set(
      localConnections
        .filter(c => c.connection_type === 'fleet')
        .flatMap(c => [c.from_customer_id, c.to_customer_id])
    ).size
    return {
      total: customers.length,
      active: activeCount,
      referralChains,
      fleetGroups: fleetGroups > 0 ? Math.ceil(fleetGroups / 2) : 0,
    }
  }, [customers, localConnections])

  // ─── Get customer connections for flyout ─────────────────────────────────────
  const getCustomerConnections = useCallback((customerId: string) => {
    return localConnections
      .filter(c => c.from_customer_id === customerId || c.to_customer_id === customerId)
      .map(conn => {
        const otherId = conn.from_customer_id === customerId ? conn.to_customer_id : conn.from_customer_id
        const otherCustomer = customers.find(c => c.id === otherId)
        const isSource = conn.from_customer_id === customerId
        return { ...conn, otherCustomer, isSource }
      })
  }, [localConnections, customers])

  // ─── Referral chain (BFS from selected customer through referral links) ─────
  const getReferralChain = useCallback((customerId: string): { customer: Customer; depth: number }[] => {
    const chain: { customer: Customer; depth: number }[] = []
    const visited = new Set<string>()
    const queue: { id: string; depth: number }[] = [{ id: customerId, depth: 0 }]
    visited.add(customerId)

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!
      const cust = customers.find(c => c.id === id)
      if (cust) chain.push({ customer: cust, depth })

      // Only follow referral connections
      localConnections.forEach(conn => {
        if (conn.connection_type !== 'referral') return
        let nextId: string | null = null
        if (conn.from_customer_id === id && !visited.has(conn.to_customer_id)) nextId = conn.to_customer_id
        if (conn.to_customer_id === id && !visited.has(conn.from_customer_id)) nextId = conn.from_customer_id
        if (nextId) {
          visited.add(nextId)
          queue.push({ id: nextId, depth: depth + 1 })
        }
      })
    }

    return chain
  }, [customers, localConnections])

  // ─── Drag handlers ──────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggedNode(nodeId)
  }, [])

  useEffect(() => {
    if (!draggedNode) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setNodePositions(prev => ({
        ...prev,
        [draggedNode]: {
          x: Math.max(30, Math.min(containerSize.width - 30, x)),
          y: Math.max(30, Math.min(containerSize.height - 30, y)),
        },
      }))
    }

    const handleMouseUp = () => {
      setDraggedNode(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggedNode, containerSize])

  // ─── Save connection ────────────────────────────────────────────────────────
  async function saveConnection() {
    if (!addConnectionForm.from_customer_id || !addConnectionForm.to_customer_id) return
    if (addConnectionForm.from_customer_id === addConnectionForm.to_customer_id) return
    setSavingConnection(true)

    if (!isDemo) {
      const { data, error } = await supabase.from('customer_connections').insert({
        org_id: profile.org_id,
        from_customer_id: addConnectionForm.from_customer_id,
        to_customer_id: addConnectionForm.to_customer_id,
        connection_type: addConnectionForm.connection_type,
        notes: addConnectionForm.notes || null,
      }).select().single()

      if (!error && data) {
        setLocalConnections(prev => [...prev, data as Connection])
      }
    } else {
      // Demo mode: add locally
      const newConn: Connection = {
        id: `local-${Date.now()}`,
        org_id: '',
        from_customer_id: addConnectionForm.from_customer_id,
        to_customer_id: addConnectionForm.to_customer_id,
        connection_type: addConnectionForm.connection_type,
        notes: addConnectionForm.notes || undefined,
      }
      setLocalConnections(prev => [...prev, newConn])
    }

    setShowAddConnection(false)
    setAddConnectionForm({ from_customer_id: '', to_customer_id: '', connection_type: 'referral', notes: '' })
    setSavingConnection(false)
  }

  // ─── Highlighted connections (when a node is hovered or selected) ───────────
  const highlightedNodeIds = useMemo(() => {
    const activeId = hoveredNode || selectedCustomer?.id || null
    if (!activeId) return new Set<string>()
    const ids = new Set<string>([activeId])
    const neighbors = adjacencyMap[activeId]
    if (neighbors) neighbors.forEach(id => ids.add(id))
    return ids
  }, [hoveredNode, selectedCustomer, adjacencyMap])

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: 16 }}>

      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{
            fontSize: 26, fontWeight: 900,
            fontFamily: 'Barlow Condensed, sans-serif',
            color: 'var(--text1)', margin: 0, lineHeight: 1.2,
          }}>
            Customer Network
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', margin: '4px 0 0' }}>
            {isDemo ? 'Demo data' : `${customers.length} customers`}
            {' / '}
            {localConnections.length} connections
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customers..."
              style={{
                padding: '7px 12px 7px 30px', width: 220,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text1)', fontSize: 13,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 8,
              border: '1px solid var(--border)',
              background: showFilters ? 'rgba(79,127,255,0.15)' : 'var(--surface)',
              color: showFilters ? 'var(--accent)' : 'var(--text2)',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            <Filter size={14} /> Filters
          </button>

          {/* Toggle labels */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            title={showLabels ? 'Hide labels' : 'Show labels'}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text2)', fontSize: 13, cursor: 'pointer',
            }}
          >
            {showLabels ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>

          {/* Add Connection */}
          <button
            onClick={() => setShowAddConnection(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 14px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Add Connection
          </button>
        </div>
      </div>

      {/* ─── Filters ─────────────────────────────────────────────────────────── */}
      {showFilters && (
        <div style={{
          display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
          padding: '10px 14px', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 10,
        }}>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Status:
          </span>
          {['all', 'active', 'past', 'prospect', 'fleet'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '4px 10px', borderRadius: 6, border: 'none',
                background: statusFilter === s ? getStatusColor(s === 'all' ? undefined : s) : 'var(--surface2)',
                color: statusFilter === s ? '#fff' : 'var(--text2)',
                fontSize: 12, cursor: 'pointer', fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {s}
            </button>
          ))}

          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 12 }}>
            Tier:
          </span>
          {['all', 'platinum', 'gold', 'silver', 'bronze'].map(t => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              style={{
                padding: '4px 10px', borderRadius: 6, border: 'none',
                background: tierFilter === t ? 'var(--accent)' : 'var(--surface2)',
                color: tierFilter === t ? '#fff' : 'var(--text2)',
                fontSize: 12, cursor: 'pointer', fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* ─── Stats Bar ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Customers', value: stats.total, icon: Users, color: 'var(--text1)' },
          { label: 'Active', value: stats.active, icon: User, color: '#22c07a' },
          { label: 'Referral Chains', value: stats.referralChains, icon: GitBranch, color: '#8b5cf6' },
          { label: 'Fleet Groups', value: stats.fleetGroups, icon: Truck, color: '#4f7fff' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: `${stat.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <stat.icon size={18} style={{ color: stat.color }} />
            </div>
            <div>
              <div style={{
                fontSize: 20, fontWeight: 800,
                fontFamily: 'JetBrains Mono, monospace',
                color: stat.color, lineHeight: 1,
              }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Main Area: Network + Flyout ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', gap: 0, minHeight: 0 }}>

        {/* ─── Network Visualization ─────────────────────────────────────────── */}
        <div
          ref={containerRef}
          style={{
            flex: 1, position: 'relative', overflow: 'hidden',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: selectedCustomer ? '10px 0 0 10px' : 10,
            minHeight: 400,
          }}
        >
          {filtered.length === 0 ? (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)', textAlign: 'center',
            }}>
              <Network size={48} style={{ color: 'var(--text3)', opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 14, color: 'var(--text3)' }}>
                No customers match your filters
              </div>
            </div>
          ) : (
            <>
              {/* SVG Connection Lines */}
              <svg
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '100%', height: '100%', pointerEvents: 'none',
                }}
              >
                {filteredConnections.map(conn => {
                  const fromPos = finalPositions[conn.from_customer_id]
                  const toPos = finalPositions[conn.to_customer_id]
                  if (!fromPos || !toPos) return null

                  const isHighlighted = highlightedNodeIds.size > 0 &&
                    (highlightedNodeIds.has(conn.from_customer_id) && highlightedNodeIds.has(conn.to_customer_id))
                  const opacity = highlightedNodeIds.size === 0 ? 0.5 : isHighlighted ? 0.9 : 0.12
                  const color = getConnectionColor(conn.connection_type)

                  // Calculate midpoint for label
                  const mx = (fromPos.x + toPos.x) / 2
                  const my = (fromPos.y + toPos.y) / 2

                  return (
                    <g key={conn.id}>
                      <line
                        x1={fromPos.x} y1={fromPos.y}
                        x2={toPos.x} y2={toPos.y}
                        stroke={color}
                        strokeWidth={isHighlighted ? 2.5 : 1.5}
                        strokeOpacity={opacity}
                        strokeDasharray={conn.connection_type === 'knows' ? '4,4' : conn.connection_type === 'family' ? '2,3' : 'none'}
                      />
                      {conn.connection_type === 'referral' && isHighlighted && (
                        <>
                          {/* Arrow for referral direction */}
                          <circle cx={toPos.x + (fromPos.x - toPos.x) * 0.18} cy={toPos.y + (fromPos.y - toPos.y) * 0.18} r={3} fill={color} fillOpacity={opacity} />
                        </>
                      )}
                      {showLabels && isHighlighted && (
                        <text
                          x={mx} y={my - 6}
                          textAnchor="middle"
                          fill={color}
                          fontSize={10}
                          fontFamily="JetBrains Mono, monospace"
                          opacity={0.85}
                        >
                          {getConnectionLabel(conn.connection_type)}
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>

              {/* Customer Nodes */}
              {filtered.map(customer => {
                const pos = finalPositions[customer.id]
                if (!pos) return null

                const color = getStatusColor(customer.status)
                const isActive = highlightedNodeIds.has(customer.id)
                const isDimmed = highlightedNodeIds.size > 0 && !isActive
                const isSelected = selectedCustomer?.id === customer.id
                const isHovered = hoveredNode === customer.id
                const nodeSize = 40
                const spend = customer.lifetime_spend || 0
                const sizeBonus = Math.min(8, spend / 5000)
                const finalSize = nodeSize + sizeBonus

                return (
                  <div
                    key={customer.id}
                    onMouseDown={e => handleMouseDown(e, customer.id)}
                    onMouseEnter={() => setHoveredNode(customer.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => {
                      if (!draggedNode) setSelectedCustomer(customer)
                    }}
                    style={{
                      position: 'absolute',
                      left: pos.x - finalSize / 2,
                      top: pos.y - finalSize / 2,
                      width: finalSize,
                      height: finalSize,
                      borderRadius: '50%',
                      background: isDimmed ? 'var(--surface2)' : `${color}20`,
                      border: `2px solid ${isDimmed ? 'var(--border)' : color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: draggedNode ? 'grabbing' : 'pointer',
                      transition: draggedNode === customer.id ? 'none' : 'opacity 0.2s, border-color 0.2s, box-shadow 0.2s',
                      opacity: isDimmed ? 0.35 : 1,
                      boxShadow: isSelected
                        ? `0 0 0 3px ${color}50, 0 0 20px ${color}30`
                        : isHovered
                          ? `0 0 0 2px ${color}40`
                          : 'none',
                      zIndex: isHovered || isSelected ? 10 : 1,
                      userSelect: 'none',
                    }}
                  >
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      fontFamily: 'Barlow Condensed, sans-serif',
                      color: isDimmed ? 'var(--text3)' : color,
                      lineHeight: 1,
                    }}>
                      {getInitials(customer)}
                    </span>

                    {/* Label below node */}
                    {(showLabels || isHovered || isSelected) && !isDimmed && (
                      <div style={{
                        position: 'absolute',
                        top: finalSize + 4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        whiteSpace: 'nowrap',
                        fontSize: 10,
                        fontWeight: 600,
                        color: isHovered || isSelected ? 'var(--text1)' : 'var(--text2)',
                        textAlign: 'center',
                        pointerEvents: 'none',
                        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                        maxWidth: 120,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {getCustomerDisplayName(customer)}
                      </div>
                    )}

                    {/* Hover tooltip with more info */}
                    {isHovered && !isSelected && (
                      <div style={{
                        position: 'absolute',
                        bottom: finalSize + 8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--surface2)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        zIndex: 20,
                        pointerEvents: 'none',
                        minWidth: 140,
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>
                          {getCustomerDisplayName(customer)}
                        </div>
                        {getCustomerContactName(customer) && getCustomerContactName(customer) !== getCustomerDisplayName(customer) && (
                          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 2 }}>
                            {getCustomerContactName(customer)}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: color, fontWeight: 600, textTransform: 'capitalize' }}>
                          {customer.status || 'unknown'}
                        </div>
                        {spend > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                            {formatCurrency(spend)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Legend */}
              <div style={{
                position: 'absolute', bottom: 12, left: 12,
                background: 'rgba(13,15,20,0.9)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 14px',
                display: 'flex', gap: 16, alignItems: 'center',
              }}>
                <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Nodes
                </span>
                {[
                  { label: 'Active', color: '#22c07a' },
                  { label: 'Fleet', color: '#4f7fff' },
                  { label: 'Prospect', color: '#f59e0b' },
                  { label: 'Past', color: '#5a6080' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: `${item.color}30`, border: `2px solid ${item.color}` }} />
                    <span style={{ fontSize: 10, color: 'var(--text2)' }}>{item.label}</span>
                  </div>
                ))}
                <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 8 }}>
                  Lines
                </span>
                {[
                  { label: 'Referral', color: '#22c07a', dash: false },
                  { label: 'Fleet', color: '#4f7fff', dash: false },
                  { label: 'Knows', color: '#9299b5', dash: true },
                  { label: 'Works With', color: '#8b5cf6', dash: false },
                  { label: 'Family', color: '#f25a5a', dash: true },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width={16} height={8}>
                      <line
                        x1={0} y1={4} x2={16} y2={4}
                        stroke={item.color} strokeWidth={2}
                        strokeDasharray={item.dash ? '3,2' : 'none'}
                      />
                    </svg>
                    <span style={{ fontSize: 10, color: 'var(--text2)' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ─── Flyout Panel ──────────────────────────────────────────────────── */}
        {selectedCustomer && (
          <div style={{
            width: 340, borderLeft: 'none',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '0 10px 10px 0',
            overflowY: 'auto', flexShrink: 0,
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 16px 12px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 16, fontWeight: 800,
                  fontFamily: 'Barlow Condensed, sans-serif',
                  color: 'var(--text1)', lineHeight: 1.2,
                }}>
                  {getCustomerDisplayName(selectedCustomer)}
                </div>
                {getCustomerContactName(selectedCustomer) && getCustomerContactName(selectedCustomer) !== getCustomerDisplayName(selectedCustomer) && (
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                    {getCustomerContactName(selectedCustomer)}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                style={{
                  padding: 4, border: 'none', background: 'transparent',
                  color: 'var(--text3)', cursor: 'pointer', borderRadius: 4,
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Status + Spend */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 6,
                  background: `${getStatusColor(selectedCustomer.status)}20`,
                  color: getStatusColor(selectedCustomer.status),
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  {selectedCustomer.status || 'unknown'}
                </span>
                {selectedCustomer.referral_source && (
                  <span style={{
                    padding: '3px 10px', borderRadius: 6,
                    background: 'var(--surface2)',
                    color: 'var(--text2)',
                    fontSize: 11, fontWeight: 600,
                    textTransform: 'capitalize',
                  }}>
                    {selectedCustomer.referral_source.replace('_', ' ')}
                  </span>
                )}
              </div>

              <div style={{
                display: 'flex', gap: 16, alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                    Lifetime Spend
                  </div>
                  <div style={{
                    fontSize: 22, fontWeight: 800,
                    fontFamily: 'JetBrains Mono, monospace',
                    color: '#22c07a',
                  }}>
                    {formatCurrency(selectedCustomer.lifetime_spend)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                    Tier
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 700,
                    color: 'var(--text1)', textTransform: 'capitalize',
                  }}>
                    {getRevenueTier(selectedCustomer.lifetime_spend)}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Contact
              </div>
              {selectedCustomer.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Mail size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedCustomer.email}
                  </span>
                </div>
              )}
              {selectedCustomer.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Phone size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {selectedCustomer.phone}
                  </span>
                </div>
              )}
              {(selectedCustomer.company || selectedCustomer.company_name) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {selectedCustomer.company || selectedCustomer.company_name}
                  </span>
                </div>
              )}
            </div>

            {/* Connections */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Connections ({getCustomerConnections(selectedCustomer.id).length})
              </div>
              {getCustomerConnections(selectedCustomer.id).length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>
                  No connections yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {getCustomerConnections(selectedCustomer.id).map(conn => (
                    <div
                      key={conn.id}
                      onClick={() => {
                        if (conn.otherCustomer) setSelectedCustomer(conn.otherCustomer)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 8px', borderRadius: 6,
                        background: 'var(--surface2)', cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,127,255,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: `${getConnectionColor(conn.connection_type)}20`,
                        border: `1.5px solid ${getConnectionColor(conn.connection_type)}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: getConnectionColor(conn.connection_type) }}>
                          {conn.otherCustomer ? getInitials(conn.otherCustomer) : '?'}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {conn.otherCustomer ? getCustomerDisplayName(conn.otherCustomer) : 'Unknown'}
                        </div>
                        <div style={{ fontSize: 10, color: getConnectionColor(conn.connection_type), fontWeight: 600 }}>
                          {conn.isSource ? '' : ''}{getConnectionLabel(conn.connection_type)}
                          {conn.connection_type === 'referral' && (
                            <span style={{ color: 'var(--text3)', fontWeight: 400, marginLeft: 4 }}>
                              {conn.isSource ? '(referred by you)' : '(referred you)'}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Referral Chain */}
            {(() => {
              const chain = getReferralChain(selectedCustomer.id)
              if (chain.length <= 1) return null
              return (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    Referral Chain
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {chain.map((item, idx) => (
                      <div key={item.customer.id}>
                        <div
                          onClick={() => setSelectedCustomer(item.customer)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '5px 0', cursor: 'pointer',
                            paddingLeft: item.depth * 16,
                          }}
                        >
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: item.customer.id === selectedCustomer.id ? '#22c07a' : 'var(--text3)',
                            flexShrink: 0,
                          }} />
                          <span style={{
                            fontSize: 12,
                            fontWeight: item.customer.id === selectedCustomer.id ? 700 : 400,
                            color: item.customer.id === selectedCustomer.id ? 'var(--text1)' : 'var(--text2)',
                          }}>
                            {getCustomerDisplayName(item.customer)}
                          </span>
                          <span style={{
                            fontSize: 10, color: 'var(--text3)',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}>
                            L{item.depth}
                          </span>
                        </div>
                        {idx < chain.length - 1 && chain[idx + 1].depth > item.depth && (
                          <div style={{
                            paddingLeft: item.depth * 16 + 3,
                            height: 8,
                            borderLeft: '1px solid var(--border)',
                            marginLeft: 0,
                          }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* View Profile Button */}
            <div style={{ padding: '12px 16px' }}>
              <button
                onClick={() => router.push(`/customers/${selectedCustomer.id}`)}
                style={{
                  width: '100%', padding: '10px 16px',
                  borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface2)', color: 'var(--text1)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,127,255,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface2)')}
              >
                <User size={14} /> View Full Profile <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Add Connection Modal ────────────────────────────────────────────── */}
      {showAddConnection && (
        <div
          onClick={() => setShowAddConnection(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 24, width: 440,
              maxHeight: '80vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{
                fontSize: 20, fontWeight: 900,
                fontFamily: 'Barlow Condensed, sans-serif',
                color: 'var(--text1)', margin: 0,
              }}>
                Add Connection
              </h2>
              <button
                onClick={() => setShowAddConnection(false)}
                style={{ padding: 4, border: 'none', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* From Customer */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 5 }}>
                From Customer
              </label>
              <select
                value={addConnectionForm.from_customer_id}
                onChange={e => setAddConnectionForm(prev => ({ ...prev, from_customer_id: e.target.value }))}
                style={{
                  width: '100%', padding: '9px 12px',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text1)', fontSize: 13,
                  outline: 'none', boxSizing: 'border-box',
                }}
              >
                <option value="">Select customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {getCustomerDisplayName(c)} {getCustomerContactName(c) !== getCustomerDisplayName(c) ? `(${getCustomerContactName(c)})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* To Customer */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 5 }}>
                To Customer
              </label>
              <select
                value={addConnectionForm.to_customer_id}
                onChange={e => setAddConnectionForm(prev => ({ ...prev, to_customer_id: e.target.value }))}
                style={{
                  width: '100%', padding: '9px 12px',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text1)', fontSize: 13,
                  outline: 'none', boxSizing: 'border-box',
                }}
              >
                <option value="">Select customer...</option>
                {customers
                  .filter(c => c.id !== addConnectionForm.from_customer_id)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {getCustomerDisplayName(c)} {getCustomerContactName(c) !== getCustomerDisplayName(c) ? `(${getCustomerContactName(c)})` : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* Connection Type */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 5 }}>
                Connection Type
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['referral', 'knows', 'fleet', 'works_with', 'family'] as ConnectionType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setAddConnectionForm(prev => ({ ...prev, connection_type: type }))}
                    style={{
                      padding: '6px 14px', borderRadius: 6,
                      border: addConnectionForm.connection_type === type
                        ? `2px solid ${getConnectionColor(type)}`
                        : '1px solid var(--border)',
                      background: addConnectionForm.connection_type === type
                        ? `${getConnectionColor(type)}15`
                        : 'var(--surface2)',
                      color: addConnectionForm.connection_type === type
                        ? getConnectionColor(type)
                        : 'var(--text2)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {getConnectionLabel(type)}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 5 }}>
                Notes (optional)
              </label>
              <textarea
                value={addConnectionForm.notes}
                onChange={e => setAddConnectionForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="How are these customers connected?"
                rows={3}
                style={{
                  width: '100%', padding: '9px 12px',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text1)', fontSize: 13,
                  outline: 'none', resize: 'vertical',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddConnection(false)}
                style={{
                  padding: '9px 18px', borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface2)', color: 'var(--text2)',
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveConnection}
                disabled={!addConnectionForm.from_customer_id || !addConnectionForm.to_customer_id || savingConnection}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: 'none',
                  background: (!addConnectionForm.from_customer_id || !addConnectionForm.to_customer_id)
                    ? 'var(--surface2)' : 'var(--accent)',
                  color: (!addConnectionForm.from_customer_id || !addConnectionForm.to_customer_id)
                    ? 'var(--text3)' : '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  opacity: savingConnection ? 0.6 : 1,
                }}
              >
                {savingConnection ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                Save Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spin animation for loader */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
