'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { isAdminRole } from '@/types'
import {
  Plus, Upload, ChevronDown, Phone, Mail, User, Building2,
  X, Search, Flame, TrendingUp, DollarSign, Clock, ArrowRight,
  Pencil, Trash2, Calendar, MessageSquare, PhoneCall, MailIcon,
  StickyNote, CheckCircle2, AlertCircle, LayoutGrid, List,
  UserPlus, Target,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────
type ProspectStatus = 'hot' | 'warm' | 'cold' | 'dead'
type ProspectSource = 'Cold Call' | 'Door Knock' | 'Referral' | 'Event' | 'Social Media' | 'Website' | 'Other'

interface Activity {
  id: string
  type: 'call' | 'email' | 'note'
  description: string
  date: string
}

interface Prospect {
  id: string
  name: string
  company: string
  phone: string
  email: string
  status: ProspectStatus
  source: ProspectSource
  fleet_size: string
  estimated_revenue: number
  notes: string
  agent_id: string
  agent_name: string
  last_contact: string
  follow_up_date: string | null
  activities: Activity[]
  created_at: string
}

interface ProspectsClientProps {
  profile: Profile
  initialProspects: any[]
}

// ── Demo Data ────────────────────────────────────────────────
const DEMO_PROSPECTS: Prospect[] = [
  {
    id: '1', name: 'John Davis', company: 'Fleet Co', phone: '(555) 100-0001',
    email: 'john@fleetco.com', status: 'hot', source: 'Cold Call',
    fleet_size: '5 trucks', estimated_revenue: 15000, notes: 'Very interested in full fleet wrap.',
    agent_id: 'kevin-1', agent_name: 'Kevin', last_contact: '2026-02-21',
    follow_up_date: '2026-02-22', created_at: '2026-02-10',
    activities: [
      { id: 'a1', type: 'call', description: 'Initial cold call. Very receptive, wants quote.', date: '2026-02-18' },
      { id: 'a2', type: 'call', description: 'Follow-up call. Discussed fleet pricing.', date: '2026-02-21' },
    ],
  },
  {
    id: '2', name: 'Dave Miller', company: "Dave's Auto Body", phone: '(555) 100-0002',
    email: 'dave@davesauto.com', status: 'warm', source: 'Referral',
    fleet_size: '2 vans', estimated_revenue: 6000, notes: 'Referred by Bob. Needs van wraps for shop.',
    agent_id: 'kevin-1', agent_name: 'Kevin', last_contact: '2026-02-19',
    follow_up_date: '2026-02-24', created_at: '2026-02-08',
    activities: [
      { id: 'a3', type: 'email', description: 'Sent intro email with portfolio.', date: '2026-02-15' },
      { id: 'a4', type: 'call', description: 'Phone call discussing options and budget.', date: '2026-02-19' },
    ],
  },
  {
    id: '3', name: 'Lisa Chen', company: 'Summit Plumbing', phone: '(555) 100-0003',
    email: 'lisa@summitplumb.com', status: 'hot', source: 'Door Knock',
    fleet_size: '3 trucks', estimated_revenue: 9000, notes: 'Door knock. Wants trucks wrapped ASAP for spring season.',
    agent_id: 'cage-1', agent_name: 'Cage', last_contact: '2026-02-20',
    follow_up_date: '2026-02-21', created_at: '2026-02-12',
    activities: [
      { id: 'a5', type: 'note', description: 'Met at their shop. Very interested, budget approved.', date: '2026-02-20' },
    ],
  },
  {
    id: '4', name: 'Marco Reyes', company: 'Bay Area Eats', phone: '(555) 100-0004',
    email: 'marco@bayareaeats.com', status: 'warm', source: 'Event',
    fleet_size: '4 food trucks', estimated_revenue: 12000, notes: 'Met at food truck festival. Needs full rebrand.',
    agent_id: 'kevin-1', agent_name: 'Kevin', last_contact: '2026-02-17',
    follow_up_date: '2026-02-25', created_at: '2026-02-05',
    activities: [
      { id: 'a6', type: 'note', description: 'Collected card at Bay Area Food Fest booth.', date: '2026-02-14' },
      { id: 'a7', type: 'email', description: 'Sent follow-up email with examples.', date: '2026-02-17' },
    ],
  },
  {
    id: '5', name: 'Tom Brooks', company: 'Random LLC', phone: '(555) 100-0005',
    email: 'tom@randomllc.com', status: 'cold', source: 'Cold Call',
    fleet_size: '1 truck', estimated_revenue: 3000, notes: 'Might be interested later this year.',
    agent_id: 'cage-1', agent_name: 'Cage', last_contact: '2026-02-10',
    follow_up_date: null, created_at: '2026-02-03',
    activities: [
      { id: 'a8', type: 'call', description: 'Cold call. Said maybe Q3.', date: '2026-02-10' },
    ],
  },
  {
    id: '6', name: 'Pete Sanchez', company: "Pete's Painting", phone: '(555) 100-0006',
    email: 'pete@petespainting.com', status: 'cold', source: 'Social Media',
    fleet_size: '2 vans', estimated_revenue: 5000, notes: 'Found on Instagram. Sent DM.',
    agent_id: 'kevin-1', agent_name: 'Kevin', last_contact: '2026-02-12',
    follow_up_date: null, created_at: '2026-02-06',
    activities: [
      { id: 'a9', type: 'email', description: 'DM on Instagram. Showed some interest.', date: '2026-02-12' },
    ],
  },
  {
    id: '7', name: 'Unknown Contact', company: 'No Answer Inc', phone: '(555) 100-0007',
    email: '', status: 'dead', source: 'Cold Call',
    fleet_size: 'unknown', estimated_revenue: 0, notes: 'No answer after 5 attempts. Dead lead.',
    agent_id: 'cage-1', agent_name: 'Cage', last_contact: '2026-02-05',
    follow_up_date: null, created_at: '2026-01-28',
    activities: [
      { id: 'a10', type: 'call', description: 'Call 5 - no answer. Marking dead.', date: '2026-02-05' },
    ],
  },
  {
    id: '8', name: 'Sarah Kim', company: 'Lost Lead Corp', phone: '(555) 100-0008',
    email: 'sarah@lostlead.com', status: 'dead', source: 'Website',
    fleet_size: '1 car', estimated_revenue: 2000, notes: 'Filled out website form but ghosted.',
    agent_id: 'kevin-1', agent_name: 'Kevin', last_contact: '2026-02-03',
    follow_up_date: null, created_at: '2026-01-25',
    activities: [
      { id: 'a11', type: 'email', description: 'Replied to web form. No response back.', date: '2026-01-30' },
      { id: 'a12', type: 'call', description: 'Voicemail. No callback.', date: '2026-02-03' },
    ],
  },
  {
    id: '9', name: 'Angela Torres', company: 'Metro Cleaning', phone: '(555) 100-0009',
    email: 'angela@metrocleaning.com', status: 'warm', source: 'Referral',
    fleet_size: '6 vans', estimated_revenue: 18000, notes: 'Big fleet. Referral from Summit Plumbing.',
    agent_id: 'cage-1', agent_name: 'Cage', last_contact: '2026-02-18',
    follow_up_date: '2026-02-23', created_at: '2026-02-11',
    activities: [
      { id: 'a13', type: 'call', description: 'Intro call. Very interested in 6-van wrap package.', date: '2026-02-15' },
      { id: 'a14', type: 'email', description: 'Sent fleet pricing sheet.', date: '2026-02-18' },
    ],
  },
  {
    id: '10', name: 'Rosa Diaz', company: 'City Flowers', phone: '(555) 100-0010',
    email: 'rosa@cityflowers.com', status: 'hot', source: 'Door Knock',
    fleet_size: '2 trucks', estimated_revenue: 6000, notes: 'Walked in. Wants delivery trucks wrapped with floral brand.',
    agent_id: 'cage-1', agent_name: 'Cage', last_contact: '2026-02-21',
    follow_up_date: '2026-02-22', created_at: '2026-02-14',
    activities: [
      { id: 'a15', type: 'note', description: 'Walk-in visit. Loved our portfolio.', date: '2026-02-20' },
      { id: 'a16', type: 'call', description: 'Confirmed budget. Ready to move forward.', date: '2026-02-21' },
    ],
  },
]

const STATUS_CONFIG: Record<ProspectStatus, { label: string; color: string; border: string }> = {
  hot:  { label: 'Hot',  color: '#4f7fff', border: '#4f7fff' },
  warm: { label: 'Warm', color: '#f59e0b', border: '#f59e0b' },
  cold: { label: 'Cold', color: '#5a6080', border: '#5a6080' },
  dead: { label: 'Dead', color: '#f25a5a', border: '#f25a5a' },
}

const SOURCE_OPTIONS: ProspectSource[] = ['Cold Call', 'Door Knock', 'Referral', 'Event', 'Social Media', 'Website', 'Other']
const STATUS_OPTIONS: ProspectStatus[] = ['hot', 'warm', 'cold']
const AGENTS = ['Kevin', 'Cage']

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US')
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffMs = today.getTime() - target.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

function mapDbToProspect(row: any): Prospect {
  return {
    id: row.id,
    name: row.name || '',
    company: row.company || '',
    phone: row.phone || '',
    email: row.email || '',
    status: row.status || 'warm',
    source: row.source || 'other',
    fleet_size: row.fleet_size != null ? String(row.fleet_size) : '',
    estimated_revenue: Number(row.estimated_revenue) || 0,
    notes: row.notes || '',
    agent_id: row.assigned_to || '',
    agent_name: row.assignee?.name || '',
    last_contact: row.last_contact ? new Date(row.last_contact).toISOString().split('T')[0] : '',
    follow_up_date: row.follow_up_date || null,
    activities: [],
    created_at: row.created_at || '',
  }
}

// ── Main Component ───────────────────────────────────────────
export default function ProspectsClient({ profile, initialProspects }: ProspectsClientProps) {
  const supabase = createClient()
  const [prospects, setProspects] = useState<Prospect[]>(() => {
    if (initialProspects && initialProspects.length > 0) return initialProspects.map(mapDbToProspect)
    return DEMO_PROSPECTS
  })

  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [search, setSearch] = useState('')
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [convertId, setConvertId] = useState<string | null>(null)
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null)
  const [agentDropdown, setAgentDropdown] = useState(false)
  const agentRef = useRef<HTMLDivElement>(null)

  const isAdmin = isAdminRole(profile.role)

  // Close agent dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (agentRef.current && !agentRef.current.contains(e.target as Node)) {
        setAgentDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Filter logic
  const filtered = prospects.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      p.company.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.email.toLowerCase().includes(q)

    const matchAgent = agentFilter === 'all' || p.agent_name === agentFilter

    // Non-admin sales agents only see their own
    if (!isAdmin && profile.role === 'sales_agent') {
      return matchSearch && p.agent_name === (profile.name?.split(' ')[0] || profile.name)
    }

    return matchSearch && matchAgent
  })

  // Metrics
  const today = '2026-02-21'
  const weekStart = '2026-02-16'
  const contactedThisWeek = filtered.filter(p => p.last_contact >= weekStart).length
  const converted = filtered.filter(p => p.status !== 'dead')
  const conversionRate = filtered.length > 0
    ? Math.round((converted.length / filtered.length) * 100)
    : 0
  const totalRevenue = filtered
    .filter(p => p.status !== 'dead')
    .reduce((sum, p) => sum + p.estimated_revenue, 0)
  const followUpsDue = filtered.filter(p => p.follow_up_date && p.follow_up_date <= today).length

  // Group by status for kanban
  const columns: ProspectStatus[] = ['hot', 'warm', 'cold', 'dead']
  const grouped: Record<ProspectStatus, Prospect[]> = { hot: [], warm: [], cold: [], dead: [] }
  filtered.forEach(p => grouped[p.status].push(p))

  // Detail prospect
  const detailProspect = detailId ? prospects.find(p => p.id === detailId) : null
  const convertProspect = convertId ? prospects.find(p => p.id === convertId) : null

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <h1 style={{
              fontSize: 26, fontWeight: 900,
              fontFamily: 'Barlow Condensed, sans-serif',
              color: 'var(--text1)', letterSpacing: '0.05em',
              textTransform: 'uppercase', lineHeight: 1, marginBottom: 4,
            }}>
              PROSPECTING CENTER
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>
              My Prospects — {profile.name || profile.email}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Agent Filter (admin only) */}
            {isAdmin && (
              <div ref={agentRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setAgentDropdown(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8,
                    background: 'transparent',
                    border: '1px solid var(--border)', color: 'var(--text2)',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  <User size={14} />
                  {agentFilter === 'all' ? 'All Agents' : agentFilter}
                  <ChevronDown size={12} style={{ opacity: 0.6 }} />
                </button>
                {agentDropdown && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 4,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: 4, minWidth: 160, zIndex: 100,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}>
                    <button
                      onClick={() => { setAgentFilter('all'); setAgentDropdown(false) }}
                      style={{
                        display: 'block', width: '100%', padding: '8px 12px',
                        borderRadius: 6, border: 'none', cursor: 'pointer',
                        background: agentFilter === 'all' ? 'rgba(79,127,255,0.1)' : 'none',
                        color: agentFilter === 'all' ? 'var(--accent)' : 'var(--text2)',
                        fontSize: 13, textAlign: 'left', fontWeight: 500,
                      }}
                    >
                      All Agents
                    </button>
                    {AGENTS.map(a => (
                      <button
                        key={a}
                        onClick={() => { setAgentFilter(a); setAgentDropdown(false) }}
                        style={{
                          display: 'block', width: '100%', padding: '8px 12px',
                          borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: agentFilter === a ? 'rgba(79,127,255,0.1)' : 'none',
                          color: agentFilter === a ? 'var(--accent)' : 'var(--text2)',
                          fontSize: 13, textAlign: 'left', fontWeight: 500,
                        }}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Import */}
            <button
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                background: 'transparent',
                border: '1px solid var(--border)', color: 'var(--text2)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <Upload size={14} /> Import
            </button>

            {/* Add Prospect */}
            <button
              onClick={() => setShowAdd(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Plus size={14} /> Add Prospect
            </button>
          </div>
        </div>
      </div>

      {/* ── Metrics Row ─────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        <MetricCard
          label="Contacted This Week"
          value={String(contactedThisWeek)}
          icon={<PhoneCall size={16} style={{ color: 'var(--accent)' }} />}
          color="var(--accent)"
        />
        <MetricCard
          label="Conversion Rate"
          value={`${conversionRate}%`}
          icon={<TrendingUp size={16} style={{ color: 'var(--green)' }} />}
          color="var(--green)"
        />
        <MetricCard
          label="Revenue from Conversions"
          value={formatCurrency(totalRevenue)}
          icon={<DollarSign size={16} style={{ color: 'var(--cyan)' }} />}
          color="var(--cyan)"
        />
        <MetricCard
          label="Follow-Ups Due Today"
          value={String(followUpsDue)}
          icon={<Clock size={16} style={{ color: followUpsDue > 0 ? 'var(--amber)' : 'var(--text3)' }} />}
          color={followUpsDue > 0 ? 'var(--amber)' : 'var(--text3)'}
        />
      </div>

      {/* ── Search + View Toggle ────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 360 }}>
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text3)', pointerEvents: 'none',
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search prospects..."
            style={{
              width: '100%', padding: '8px 12px 8px 32px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text1)', fontSize: 13,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setView('kanban')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 8,
              border: '1px solid var(--border)', cursor: 'pointer',
              background: view === 'kanban' ? 'rgba(79,127,255,0.15)' : 'transparent',
              color: view === 'kanban' ? 'var(--accent)' : 'var(--text3)',
            }}
            title="Kanban view"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setView('list')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 8,
              border: '1px solid var(--border)', cursor: 'pointer',
              background: view === 'list' ? 'rgba(79,127,255,0.15)' : 'transparent',
              color: view === 'list' ? 'var(--accent)' : 'var(--text3)',
            }}
            title="List view"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* ── Kanban View ─────────────────────────────────────── */}
      {view === 'kanban' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          minHeight: 400,
        }}>
          {columns.map(status => (
            <div key={status} style={{
              background: 'var(--surface)',
              borderRadius: 12,
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>
              {/* Column Header */}
              <div style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: STATUS_CONFIG[status].color,
                  }} />
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    fontFamily: 'Barlow Condensed, sans-serif',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: 'var(--text1)',
                  }}>
                    {STATUS_CONFIG[status].label}
                  </span>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                  fontFamily: 'JetBrains Mono, monospace',
                  background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4,
                }}>
                  {grouped[status].length}
                </span>
              </div>

              {/* Cards */}
              <div style={{
                padding: 8, display: 'flex', flexDirection: 'column',
                gap: 8, flex: 1, overflowY: 'auto',
              }}>
                {grouped[status].length === 0 && (
                  <div style={{
                    padding: 20, textAlign: 'center',
                    color: 'var(--text3)', fontSize: 12,
                  }}>
                    No prospects
                  </div>
                )}
                {grouped[status].map(p => (
                  <ProspectCard
                    key={p.id}
                    prospect={p}
                    onDetail={() => setDetailId(p.id)}
                    onConvert={() => setConvertId(p.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── List View ───────────────────────────────────────── */}
      {view === 'list' && (
        <div style={{
          background: 'var(--surface)', borderRadius: 12,
          border: '1px solid var(--border)', overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse', fontSize: 13,
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Company', 'Phone', 'Status', 'Source', 'Est. Revenue', 'Last Contact', 'Agent', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                      fontFamily: 'Barlow Condensed, sans-serif',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} style={{
                    borderBottom: '1px solid var(--border)',
                    opacity: p.status === 'dead' ? 0.6 : 1,
                  }}>
                    <td style={{ padding: '10px 14px', color: 'var(--text1)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                      {p.company}
                    </td>
                    <td style={{
                      padding: '10px 14px', color: 'var(--text2)',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                      whiteSpace: 'nowrap',
                    }}>
                      {p.phone}
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        color: STATUS_CONFIG[p.status].color,
                        background: STATUS_CONFIG[p.status].color + '18',
                        border: `1px solid ${STATUS_CONFIG[p.status].color}30`,
                      }}>
                        {STATUS_CONFIG[p.status].label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text3)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {p.source}
                    </td>
                    <td style={{
                      padding: '10px 14px', color: 'var(--green)',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                      fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                    }}>
                      {formatCurrency(p.estimated_revenue)}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text3)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatDate(p.last_contact)}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text2)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {p.agent_name}
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {p.status !== 'dead' && (
                          <button
                            onClick={() => setConvertId(p.id)}
                            style={{
                              padding: '4px 10px', borderRadius: 6, border: 'none',
                              background: 'var(--green)', color: '#fff',
                              fontSize: 11, fontWeight: 600, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            Convert <ArrowRight size={10} />
                          </button>
                        )}
                        <button
                          onClick={() => setDetailId(p.id)}
                          style={{
                            padding: '4px 10px', borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: 'transparent', color: 'var(--text2)',
                            fontSize: 11, fontWeight: 500, cursor: 'pointer',
                          }}
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{
                      padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13,
                    }}>
                      No prospects found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add Prospect Modal ──────────────────────────────── */}
      {showAdd && (
        <AddProspectModal
          onClose={() => setShowAdd(false)}
          onAdd={(p) => { setProspects(prev => [p, ...prev]); setShowAdd(false) }}
          isAdmin={isAdmin}
          currentAgent={profile.name?.split(' ')[0] || profile.name || 'Agent'}
          orgId={profile.org_id || ORG_ID}
          userId={profile.id}
        />
      )}

      {/* ── Prospect Detail Modal ───────────────────────────── */}
      {detailProspect && (
        <DetailModal
          prospect={detailProspect}
          onClose={() => setDetailId(null)}
          onConvert={() => { setDetailId(null); setConvertId(detailProspect.id) }}
          onDelete={(id) => {
            setProspects(prev => prev.filter(p => p.id !== id))
            setDetailId(null)
          }}
          onUpdate={(updated) => {
            setProspects(prev => prev.map(p => p.id === updated.id ? updated : p))
          }}
        />
      )}

      {/* ── Convert Confirmation Modal ──────────────────────── */}
      {convertProspect && !convertSuccess && (
        <ConvertModal
          prospect={convertProspect}
          onClose={() => setConvertId(null)}
          onConfirm={() => {
            setConvertSuccess(convertProspect.company)
            setConvertId(null)
          }}
        />
      )}

      {/* ── Convert Success Modal ───────────────────────────── */}
      {convertSuccess && (
        <SuccessModal
          companyName={convertSuccess}
          onClose={() => setConvertSuccess(null)}
        />
      )}
    </div>
  )
}

// ── Metric Card ──────────────────────────────────────────────
function MetricCard({ label, value, icon, color }: {
  label: string; value: string; icon: React.ReactNode; color: string
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12, padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: color + '15', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{
          fontSize: 22, fontWeight: 800,
          fontFamily: 'JetBrains Mono, monospace',
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--text1)', lineHeight: 1,
        }}>
          {value}
        </div>
        <div style={{
          fontSize: 11, color: 'var(--text3)', marginTop: 2,
          fontFamily: 'Barlow Condensed, sans-serif',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {label}
        </div>
      </div>
    </div>
  )
}

// ── Prospect Card (Kanban) ───────────────────────────────────
function ProspectCard({ prospect: p, onDetail, onConvert }: {
  prospect: Prospect; onDetail: () => void; onConvert: () => void
}) {
  const cfg = STATUS_CONFIG[p.status]

  return (
    <div style={{
      background: 'var(--surface2)',
      borderRadius: 10,
      borderLeft: `3px solid ${cfg.border}`,
      padding: '12px 14px',
      opacity: p.status === 'dead' ? 0.6 : 1,
      transition: 'transform 0.15s, box-shadow 0.15s',
      cursor: 'default',
    }}>
      {/* Top row: avatar + company */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: cfg.color + '20',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: cfg.color, flexShrink: 0,
        }}>
          {p.company.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: 'var(--text1)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {p.company}
          </div>
        </div>
      </div>

      {/* Contact name */}
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
        {p.name}
      </div>

      {/* Fleet + revenue */}
      <div style={{
        fontSize: 11, color: 'var(--text3)', marginBottom: 6,
        display: 'flex', gap: 6, alignItems: 'center',
      }}>
        <span>{p.fleet_size}</span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{
          color: 'var(--green)',
          fontFamily: 'JetBrains Mono, monospace',
          fontVariantNumeric: 'tabular-nums',
        }}>
          ~{formatCurrency(p.estimated_revenue)} est
        </span>
      </div>

      {/* Source */}
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>
        Source: {p.source}
      </div>

      {/* Last contact */}
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
        {p.last_contact === '2026-02-21' ? 'Called today' : `Last contact: ${formatDate(p.last_contact)}`}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        {p.status !== 'dead' && (
          <button
            onClick={onConvert}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '5px 8px', borderRadius: 6, border: 'none',
              background: 'var(--green)', color: '#fff',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Convert <ArrowRight size={10} />
          </button>
        )}
        <button
          onClick={onDetail}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '5px 8px', borderRadius: 6,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text2)', fontSize: 11, fontWeight: 500, cursor: 'pointer',
          }}
        >
          Details
        </button>
      </div>
    </div>
  )
}

// ── Add Prospect Modal ───────────────────────────────────────
function AddProspectModal({ onClose, onAdd, isAdmin, currentAgent, orgId, userId }: {
  onClose: () => void
  onAdd: (p: Prospect) => void
  isAdmin: boolean
  currentAgent: string
  orgId: string
  userId: string
}) {
  const supabase = createClient()
  const [form, setForm] = useState({
    name: '', company: '', phone: '', email: '',
    source: 'Cold Call' as ProspectSource,
    status: 'warm' as ProspectStatus,
    fleet_size: '', estimated_revenue: '',
    notes: '', agent_name: currentAgent,
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!form.name.trim() || !form.company.trim()) return
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]

    const dbInsert = {
      org_id: orgId,
      name: form.name,
      company: form.company,
      phone: form.phone,
      email: form.email,
      status: form.status,
      source: form.source,
      fleet_size: Number(form.fleet_size) || null,
      estimated_revenue: Number(form.estimated_revenue) || 0,
      notes: form.notes,
      assigned_to: userId,
      last_contact: today,
    }

    const { data, error } = await supabase.from('prospects').insert(dbInsert).select('*, assignee:assigned_to(id, name)').single()
    setSaving(false)
    if (error || !data) {
      // fallback to local-only
      const newProspect: Prospect = {
        id: 'local-' + Date.now(), name: form.name, company: form.company,
        phone: form.phone, email: form.email, status: form.status, source: form.source,
        fleet_size: form.fleet_size, estimated_revenue: Number(form.estimated_revenue) || 0,
        notes: form.notes, agent_id: userId, agent_name: form.agent_name,
        last_contact: today, follow_up_date: null, activities: [], created_at: today,
      }
      onAdd(newProspect)
      return
    }
    onAdd(mapDbToProspect(data))
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--surface)', borderRadius: 16,
        border: '1px solid var(--border)',
        width: '100%', maxWidth: 520, maxHeight: '90vh',
        overflowY: 'auto', padding: 0,
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{
            fontSize: 18, fontWeight: 800,
            fontFamily: 'Barlow Condensed, sans-serif',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            color: 'var(--text1)',
          }}>
            Add Prospect
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text3)', padding: 4,
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Name" value={form.name}
              onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Contact name" />
            <FormField label="Company" value={form.company}
              onChange={v => setForm(f => ({ ...f, company: v }))} placeholder="Company name" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Phone" value={form.phone}
              onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="(555) 000-0000" />
            <FormField label="Email" value={form.email}
              onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="email@company.com" />
          </div>

          {/* Source */}
          <div>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)',
              marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}>
              Source
            </label>
            <select
              value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value as ProspectSource }))}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text1)', fontSize: 13, outline: 'none',
              }}
            >
              {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)',
              marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}>
              Status
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setForm(f => ({ ...f, status: s }))}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                    border: form.status === s ? `1px solid ${STATUS_CONFIG[s].color}` : '1px solid var(--border)',
                    background: form.status === s ? STATUS_CONFIG[s].color + '20' : 'var(--surface2)',
                    color: form.status === s ? STATUS_CONFIG[s].color : 'var(--text2)',
                    fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                  }}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Fleet Size" value={form.fleet_size}
              onChange={v => setForm(f => ({ ...f, fleet_size: v }))} placeholder="e.g., 5 trucks" />
            <FormField label="Estimated Revenue" value={form.estimated_revenue}
              onChange={v => setForm(f => ({ ...f, estimated_revenue: v }))} placeholder="e.g., 15000" />
          </div>

          {/* Notes */}
          <div>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)',
              marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}>
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Add notes..."
              rows={3}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text1)', fontSize: 13, outline: 'none',
                resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Agent (admin only) */}
          {isAdmin && (
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em',
                fontFamily: 'Barlow Condensed, sans-serif',
              }}>
                Assigned Agent
              </label>
              <select
                value={form.agent_name}
                onChange={e => setForm(f => ({ ...f, agent_name: e.target.value }))}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text1)', fontSize: 13, outline: 'none',
                }}
              >
                {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '14px 20px', borderTop: '1px solid var(--border)',
        }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text2)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} style={{
            padding: '8px 20px', borderRadius: 8,
            border: 'none', background: 'var(--accent)',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'Saving...' : 'Add Prospect'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Detail Modal ─────────────────────────────────────────────
function DetailModal({ prospect, onClose, onConvert, onDelete, onUpdate }: {
  prospect: Prospect
  onClose: () => void
  onConvert: () => void
  onDelete: (id: string) => void
  onUpdate: (p: Prospect) => void
}) {
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [followUp, setFollowUp] = useState(prospect.follow_up_date || '')
  const [editForm, setEditForm] = useState({ ...prospect })
  const cfg = STATUS_CONFIG[prospect.status]

  async function handleSaveEdit() {
    const updated: Prospect = {
      ...editForm,
      estimated_revenue: Number(editForm.estimated_revenue) || 0,
      follow_up_date: followUp || null,
    }
    // Persist to DB if real ID
    if (!prospect.id.startsWith('local-')) {
      await supabase.from('prospects').update({
        name: updated.name, company: updated.company, phone: updated.phone,
        email: updated.email, status: updated.status, source: updated.source,
        fleet_size: updated.fleet_size, estimated_revenue: updated.estimated_revenue,
        notes: updated.notes, follow_up_date: updated.follow_up_date,
      }).eq('id', prospect.id)
    }
    onUpdate(updated)
    setEditing(false)
  }

  async function handleSaveFollowUp() {
    const updated: Prospect = { ...prospect, follow_up_date: followUp || null }
    if (!prospect.id.startsWith('local-')) {
      await supabase.from('prospects').update({ follow_up_date: updated.follow_up_date }).eq('id', prospect.id)
    }
    onUpdate(updated)
  }

  async function handleDelete() {
    if (!prospect.id.startsWith('local-')) {
      await supabase.from('prospects').delete().eq('id', prospect.id)
    }
    onDelete(prospect.id)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--surface)', borderRadius: 16,
        border: '1px solid var(--border)',
        width: '100%', maxWidth: 600, maxHeight: '90vh',
        overflowY: 'auto', boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: cfg.color + '20',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, color: cfg.color,
            }}>
              {prospect.company.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{
                fontSize: 18, fontWeight: 800,
                fontFamily: 'Barlow Condensed, sans-serif',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                color: 'var(--text1)', lineHeight: 1,
              }}>
                {prospect.company}
              </h2>
              <span style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                color: cfg.color, letterSpacing: '0.03em',
              }}>
                {cfg.label} Prospect
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text3)', padding: 4,
          }}>
            <X size={18} />
          </button>
        </div>

        {!editing ? (
          <>
            {/* Contact Info */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
              }}>
                <InfoRow icon={<User size={13} />} label="Contact" value={prospect.name} />
                <InfoRow icon={<Building2 size={13} />} label="Company" value={prospect.company} />
                <InfoRow icon={<Phone size={13} />} label="Phone" value={prospect.phone} />
                <InfoRow icon={<Mail size={13} />} label="Email" value={prospect.email || 'N/A'} />
                <InfoRow icon={<Target size={13} />} label="Source" value={prospect.source} />
                <InfoRow icon={<User size={13} />} label="Agent" value={prospect.agent_name} />
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12,
              }}>
                <div style={{
                  background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2, textTransform: 'uppercase', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em' }}>Fleet Size</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>{prospect.fleet_size}</div>
                </div>
                <div style={{
                  background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2, textTransform: 'uppercase', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em' }}>Est. Revenue</div>
                  <div style={{
                    fontSize: 15, fontWeight: 700, color: 'var(--green)',
                    fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {formatCurrency(prospect.estimated_revenue)}
                  </div>
                </div>
              </div>
              {prospect.notes && (
                <div style={{
                  marginTop: 12, padding: '10px 14px',
                  background: 'var(--surface2)', borderRadius: 10,
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em' }}>Notes</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{prospect.notes}</div>
                </div>
              )}
            </div>

            {/* Follow-up date picker */}
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <Calendar size={14} style={{ color: 'var(--amber)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <label style={{
                  fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase',
                  fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em',
                }}>
                  Follow-Up Date
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <input
                    type="date"
                    value={followUp}
                    onChange={e => setFollowUp(e.target.value)}
                    style={{
                      padding: '6px 10px', borderRadius: 6,
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      color: 'var(--text1)', fontSize: 12, outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleSaveFollowUp}
                    style={{
                      padding: '6px 12px', borderRadius: 6, border: 'none',
                      background: 'var(--accent)', color: '#fff',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>

            {/* Activity Log */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{
                fontSize: 13, fontWeight: 800,
                fontFamily: 'Barlow Condensed, sans-serif',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                color: 'var(--text1)', marginBottom: 12,
              }}>
                Activity Log
              </h3>
              {prospect.activities.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>No activity yet</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...prospect.activities].reverse().map(a => (
                  <div key={a.id} style={{
                    display: 'flex', gap: 10, padding: '8px 12px',
                    background: 'var(--surface2)', borderRadius: 8,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: a.type === 'call' ? 'rgba(79,127,255,0.15)' :
                                  a.type === 'email' ? 'rgba(34,208,238,0.15)' :
                                  'rgba(139,92,246,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {a.type === 'call' && <PhoneCall size={12} style={{ color: 'var(--accent)' }} />}
                      {a.type === 'email' && <MailIcon size={12} style={{ color: 'var(--cyan)' }} />}
                      {a.type === 'note' && <StickyNote size={12} style={{ color: 'var(--purple)' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: 'var(--text1)', lineHeight: 1.4 }}>
                        {a.description}
                      </div>
                      <div style={{
                        fontSize: 10, color: 'var(--text3)', marginTop: 2,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}>
                        {formatDate(a.date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Edit Form */
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Name" value={editForm.name}
                onChange={v => setEditForm(f => ({ ...f, name: v }))} />
              <FormField label="Company" value={editForm.company}
                onChange={v => setEditForm(f => ({ ...f, company: v }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Phone" value={editForm.phone}
                onChange={v => setEditForm(f => ({ ...f, phone: v }))} />
              <FormField label="Email" value={editForm.email}
                onChange={v => setEditForm(f => ({ ...f, email: v }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Fleet Size" value={editForm.fleet_size}
                onChange={v => setEditForm(f => ({ ...f, fleet_size: v }))} />
              <FormField label="Est. Revenue" value={String(editForm.estimated_revenue)}
                onChange={v => setEditForm(f => ({ ...f, estimated_revenue: Number(v) || 0 }))} />
            </div>
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em',
                fontFamily: 'Barlow Condensed, sans-serif',
              }}>
                Status
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['hot', 'warm', 'cold', 'dead'] as ProspectStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setEditForm(f => ({ ...f, status: s }))}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                      border: editForm.status === s ? `1px solid ${STATUS_CONFIG[s].color}` : '1px solid var(--border)',
                      background: editForm.status === s ? STATUS_CONFIG[s].color + '20' : 'var(--surface2)',
                      color: editForm.status === s ? STATUS_CONFIG[s].color : 'var(--text2)',
                      fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                    }}
                  >
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em',
                fontFamily: 'Barlow Condensed, sans-serif',
              }}>
                Notes
              </label>
              <textarea
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text1)', fontSize: 13, outline: 'none',
                  resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setEditing(false)} style={{
                padding: '8px 14px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text2)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button onClick={handleSaveEdit} style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', borderTop: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {!editing && (
              <button onClick={() => setEditing(true)} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '8px 14px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text2)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>
                <Pencil size={12} /> Edit
              </button>
            )}
            <button onClick={handleDelete} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid rgba(242,90,90,0.3)', background: 'rgba(242,90,90,0.08)',
              color: 'var(--red)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}>
              <Trash2 size={12} /> Delete
            </button>
          </div>
          {prospect.status !== 'dead' && !editing && (
            <button onClick={onConvert} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: 'var(--green)', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              <UserPlus size={14} /> Convert to Customer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Convert Confirmation Modal ───────────────────────────────
function ConvertModal({ prospect, onClose, onConfirm }: {
  prospect: Prospect; onClose: () => void; onConfirm: () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--surface)', borderRadius: 16,
        border: '1px solid var(--border)',
        width: '100%', maxWidth: 440, padding: 0,
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }}>
        <div style={{ padding: '24px 24px 20px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(34,192,122,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <UserPlus size={22} style={{ color: 'var(--green)' }} />
          </div>
          <h3 style={{
            fontSize: 18, fontWeight: 800,
            fontFamily: 'Barlow Condensed, sans-serif',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            color: 'var(--text1)', marginBottom: 8,
          }}>
            Convert to Customer
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.5 }}>
            Convert <strong style={{ color: 'var(--text1)' }}>{prospect.name}</strong> ({prospect.company}) to a Customer?
            This will create a Customer record and a draft Estimate.
          </p>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '14px 24px', borderTop: '1px solid var(--border)',
        }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text2)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none',
            background: 'var(--green)', color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            Convert
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Success Modal ────────────────────────────────────────────
function SuccessModal({ companyName, onClose }: {
  companyName: string; onClose: () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--surface)', borderRadius: 16,
        border: '1px solid var(--border)',
        width: '100%', maxWidth: 440, padding: 0,
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }}>
        <div style={{ padding: '24px 24px 20px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(34,192,122,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <CheckCircle2 size={28} style={{ color: 'var(--green)' }} />
          </div>
          <h3 style={{
            fontSize: 20, fontWeight: 800,
            fontFamily: 'Barlow Condensed, sans-serif',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            color: 'var(--text1)', marginBottom: 8,
          }}>
            Conversion Complete
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 16 }}>
            <strong style={{ color: 'var(--text1)' }}>{companyName}</strong> has been converted to a Customer.
            A draft Estimate has been created.
          </p>
          <div style={{
            display: 'flex', gap: 10, justifyContent: 'center',
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px', borderRadius: 8,
                border: '1px solid var(--accent)', background: 'rgba(79,127,255,0.1)',
                color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              View Customer
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px', borderRadius: 8,
                border: '1px solid var(--green)', background: 'rgba(34,192,122,0.1)',
                color: 'var(--green)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              View Estimate
            </button>
          </div>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'center',
          padding: '14px 24px', borderTop: '1px solid var(--border)',
        }}>
          <button onClick={onClose} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none',
            background: 'var(--surface2)', color: 'var(--text2)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Shared: Info Row ─────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ color: 'var(--text3)', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{
          fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase',
          fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em',
        }}>
          {label}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  )
}

// ── Shared: Form Field ───────────────────────────────────────
function FormField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)',
        marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em',
        fontFamily: 'Barlow Condensed, sans-serif',
      }}>
        {label}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 8,
          background: 'var(--surface2)', border: '1px solid var(--border)',
          color: 'var(--text1)', fontSize: 13, outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
