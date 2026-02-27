'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Plus, Upload, ChevronDown, X, Check,
  Users, Mail, Phone, Building2, Tag, Filter,
  Trash2, Download, MoreHorizontal, Flame, Clock,
  Truck, Star, AlertCircle, ListFilter,
} from 'lucide-react'
import type { Profile } from '@/types'

// ── Types ─────────────────────────────────────────────────────────
interface Contact {
  id: string
  name: string
  email: string
  phone: string
  company: string
  tags: string[]
  source: string
  status: 'active' | 'inactive'
  lastContact: Date
  lifetimeSpend: number
  jobCount: number
  fleetSize: number
  hasEstimate: boolean
  estimateAccepted: boolean
  flaggedForFollowUp: boolean
}

export interface ContactsClientProps {
  profile: Profile
  initialContacts: any[]
}

// ── Tag palette ───────────────────────────────────────────────────
const TAG_COLORS: Record<string, string> = {
  fleet: '#22d3ee',
  repeat: '#8b5cf6',
  vip: '#f59e0b',
  new: '#22c07a',
  prospect: '#4f7fff',
  'follow-up': '#f25a5a',
  commercial: '#22d3ee',
  residential: '#9299b5',
}
const DEFAULT_TAG_PALETTE = ['#4f7fff', '#22c07a', '#f59e0b', '#8b5cf6', '#22d3ee', '#f25a5a', '#9299b5', '#e8eaed']

function getTagColor(tag: string): string {
  if (TAG_COLORS[tag.toLowerCase()]) return TAG_COLORS[tag.toLowerCase()]
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return DEFAULT_TAG_PALETTE[Math.abs(hash) % DEFAULT_TAG_PALETTE.length]
}

// ── Source badge colors ───────────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
  Referral: '#8b5cf6',
  Website: '#4f7fff',
  'Cold Call': '#22d3ee',
  Event: '#f59e0b',
  Social: '#22c07a',
  Other: '#9299b5',
}

// ── Relative time ─────────────────────────────────────────────────
function relativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (weeks < 5) return `${weeks}w ago`
  return `${months}mo ago`
}

// ── Format money ──────────────────────────────────────────────────
const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

// ── Smart list definitions ────────────────────────────────────────
interface SmartList {
  key: string
  label: string
  icon: typeof Flame
  color: string
  filter: (c: Contact) => boolean
}

const SMART_LISTS: SmartList[] = [
  {
    key: 'all',
    label: 'All Contacts',
    icon: Users,
    color: '#4f7fff',
    filter: () => true,
  },
  {
    key: 'hot_leads',
    label: 'Hot Leads',
    icon: Flame,
    color: '#f25a5a',
    filter: (c) => {
      const daysAgo = (new Date().getTime() - c.lastContact.getTime()) / 86400000
      return daysAgo <= 7 && !c.hasEstimate
    },
  },
  {
    key: 'stale',
    label: 'Stale Prospects',
    icon: Clock,
    color: '#9299b5',
    filter: (c) => {
      const daysAgo = (new Date().getTime() - c.lastContact.getTime()) / 86400000
      return daysAgo >= 30
    },
  },
  {
    key: 'fleet',
    label: 'Fleet Customers',
    icon: Truck,
    color: '#22d3ee',
    filter: (c) => c.tags.includes('fleet'),
  },
  {
    key: 'ready_close',
    label: 'Ready to Close',
    icon: Star,
    color: '#f59e0b',
    filter: (c) => c.hasEstimate && !c.estimateAccepted,
  },
  {
    key: 'repeat',
    label: 'Repeat Customers',
    icon: Users,
    color: '#8b5cf6',
    filter: (c) => c.jobCount >= 2,
  },
  {
    key: 'follow_up',
    label: 'Needs Follow-Up',
    icon: AlertCircle,
    color: '#f25a5a',
    filter: (c) => c.flaggedForFollowUp,
  },
]

// ── Demo data ─────────────────────────────────────────────────────
const now = new Date()
function daysAgo(d: number): Date { return new Date(now.getTime() - d * 86400000) }

const DEMO_CONTACTS: Contact[] = [
  {
    id: 'c1', name: 'Bob Smith', email: 'bob@bobspizza.com', phone: '(555) 123-4567',
    company: "Bob's Pizza", tags: ['fleet', 'repeat', 'vip'], source: 'Referral',
    status: 'active', lastContact: daysAgo(2), lifetimeSpend: 9400, jobCount: 3,
    fleetSize: 4, hasEstimate: true, estimateAccepted: true, flaggedForFollowUp: false,
  },
  {
    id: 'c2', name: 'Alice Park', email: 'alice@parkdental.com', phone: '(555) 234-5678',
    company: 'Park Dental', tags: ['new'], source: 'Website',
    status: 'active', lastContact: daysAgo(7), lifetimeSpend: 2100, jobCount: 1,
    fleetSize: 0, hasEstimate: true, estimateAccepted: true, flaggedForFollowUp: false,
  },
  {
    id: 'c3', name: 'Jake Torres', email: 'jake@torresroofing.com', phone: '(555) 345-6789',
    company: 'Torres Roofing', tags: ['fleet'], source: 'Cold Call',
    status: 'active', lastContact: daysAgo(3), lifetimeSpend: 6800, jobCount: 2,
    fleetSize: 6, hasEstimate: true, estimateAccepted: true, flaggedForFollowUp: false,
  },
  {
    id: 'c4', name: 'Sarah Chen', email: 'sarah.chen@gmail.com', phone: '(555) 456-7890',
    company: '', tags: ['prospect'], source: 'Website',
    status: 'active', lastContact: daysAgo(14), lifetimeSpend: 0, jobCount: 0,
    fleetSize: 0, hasEstimate: false, estimateAccepted: false, flaggedForFollowUp: true,
  },
  {
    id: 'c5', name: 'Mike Johnson', email: 'mike@quickmove.com', phone: '(555) 567-8901',
    company: 'Quick Move LLC', tags: ['fleet', 'new'], source: 'Referral',
    status: 'active', lastContact: daysAgo(5), lifetimeSpend: 3200, jobCount: 1,
    fleetSize: 3, hasEstimate: true, estimateAccepted: true, flaggedForFollowUp: false,
  },
  {
    id: 'c6', name: 'Lisa Wang', email: 'lisa@wangrealty.com', phone: '(555) 678-9012',
    company: 'Wang Realty', tags: ['new'], source: 'Event',
    status: 'active', lastContact: daysAgo(30), lifetimeSpend: 0, jobCount: 0,
    fleetSize: 0, hasEstimate: false, estimateAccepted: false, flaggedForFollowUp: true,
  },
  {
    id: 'c7', name: 'Marcus Green', email: 'marcus@greenlandscaping.com', phone: '(555) 789-0123',
    company: 'Green Landscaping', tags: ['repeat'], source: 'Referral',
    status: 'active', lastContact: daysAgo(7), lifetimeSpend: 4500, jobCount: 2,
    fleetSize: 0, hasEstimate: false, estimateAccepted: false, flaggedForFollowUp: false,
  },
  {
    id: 'c8', name: 'David Kim', email: 'david@kimscatering.com', phone: '(555) 890-1234',
    company: "Kim's Catering", tags: ['prospect'], source: 'Social',
    status: 'active', lastContact: daysAgo(21), lifetimeSpend: 0, jobCount: 0,
    fleetSize: 0, hasEstimate: false, estimateAccepted: false, flaggedForFollowUp: false,
  },
]

// ── Map DB customers to Contact shape ────────────────────────────
function mapDbToContact(c: any): Contact {
  const meta = c.metadata || {}
  return {
    id: c.id,
    name: c.name || c.company_name || 'Unknown',
    email: c.email || '',
    phone: c.phone || '',
    company: c.company_name || c.company || '',
    tags: Array.isArray(meta.tags) ? meta.tags : (Array.isArray(c.tags) ? c.tags : []),
    source: c.referral_source || c.lead_source || 'Other',
    status: meta.status === 'inactive' ? 'inactive' : 'active',
    lastContact: c.updated_at ? new Date(c.updated_at) : new Date(c.created_at || Date.now()),
    lifetimeSpend: Number(c.lifetime_spend) || 0,
    jobCount: Number(meta.total_jobs) || 0,
    fleetSize: Number(c.fleet_size) || 0,
    hasEstimate: !!meta.has_estimate,
    estimateAccepted: !!meta.estimate_accepted,
    flaggedForFollowUp: !!meta.flagged_for_follow_up,
  }
}

// ── Component ─────────────────────────────────────────────────────
export default function ContactsClient({ profile, initialContacts }: ContactsClientProps) {
  const router = useRouter()

  // Use real data from DB, fall back to demo data if DB is empty
  const liveContacts = initialContacts && initialContacts.length > 0
    ? initialContacts.map(mapDbToContact)
    : DEMO_CONTACTS
  const [contacts, setContacts] = useState<Contact[]>(liveContacts)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'name' | 'lastContact' | 'lifetimeSpend'>('name')
  const [activeSmartList, setActiveSmartList] = useState('all')

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkTag, setShowBulkTag] = useState(false)
  const [bulkTagInput, setBulkTagInput] = useState('')

  // Dropdowns
  const [showSmartLists, setShowSmartLists] = useState(false)
  const [showTagFilter, setShowTagFilter] = useState(false)

  // All unique tags
  const allTags = useMemo(() => {
    const s = new Set<string>()
    contacts.forEach(c => c.tags.forEach(t => s.add(t)))
    return Array.from(s).sort()
  }, [contacts])

  // Apply auto-tags
  const contactsWithAutoTags = useMemo(() => {
    return contacts.map(c => {
      const autoTags = [...c.tags]
      if (c.fleetSize > 1 && !autoTags.includes('fleet')) autoTags.push('fleet')
      if (c.jobCount > 1 && !autoTags.includes('repeat')) autoTags.push('repeat')
      if (c.lifetimeSpend > 10000 && !autoTags.includes('vip')) autoTags.push('vip')
      return { ...c, tags: autoTags }
    })
  }, [contacts])

  // Filtered + sorted
  const filtered = useMemo(() => {
    const smartFilter = SMART_LISTS.find(sl => sl.key === activeSmartList)?.filter || (() => true)
    let result = contactsWithAutoTags.filter(smartFilter)

    // Search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.company.toLowerCase().includes(q)
      )
    }

    // Status
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter)
    }

    // Source
    if (sourceFilter !== 'all') {
      result = result.filter(c => c.source === sourceFilter)
    }

    // Tags
    if (selectedTags.length > 0) {
      result = result.filter(c => selectedTags.every(t => c.tags.includes(t)))
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'lastContact') return b.lastContact.getTime() - a.lastContact.getTime()
      return b.lifetimeSpend - a.lifetimeSpend
    })

    return result
  }, [contactsWithAutoTags, search, statusFilter, sourceFilter, selectedTags, sortBy, activeSmartList])

  // Toggle selection
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)))
    }
  }

  // Active smart list info
  const activeList = SMART_LISTS.find(sl => sl.key === activeSmartList) || SMART_LISTS[0]
  const ActiveListIcon = activeList.icon

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 20, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{
            fontSize: 26, fontWeight: 900,
            fontFamily: 'Barlow Condensed, sans-serif',
            color: 'var(--text1)', letterSpacing: '0.05em',
            textTransform: 'uppercase', marginBottom: 4,
          }}>
            CONTACTS
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            {filtered.length} of {contacts.length} contacts
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Smart Lists dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSmartLists(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text2)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ListFilter size={14} style={{ color: activeList.color }} />
              {activeList.label}
              <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </button>
            {showSmartLists && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 4, minWidth: 220, zIndex: 100,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {SMART_LISTS.map(sl => {
                  const SlIcon = sl.icon
                  const count = contactsWithAutoTags.filter(sl.filter).length
                  return (
                    <button
                      key={sl.key}
                      onClick={() => { setActiveSmartList(sl.key); setShowSmartLists(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderRadius: 7, width: '100%',
                        background: activeSmartList === sl.key ? 'var(--surface2)' : 'none',
                        border: 'none', cursor: 'pointer',
                        color: 'var(--text2)', fontSize: 13, fontWeight: 500,
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => { if (activeSmartList !== sl.key) e.currentTarget.style.background = 'var(--surface2)' }}
                      onMouseLeave={e => { if (activeSmartList !== sl.key) e.currentTarget.style.background = 'none' }}
                    >
                      <SlIcon size={14} style={{ color: sl.color, flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{sl.label}</span>
                      <span style={{
                        fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                        color: 'var(--text3)', fontVariantNumeric: 'tabular-nums',
                      }}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => router.push('/contacts/new')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Add Contact
          </button>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text2)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Upload size={14} /> Import CSV
          </button>
        </div>
      </div>

      {/* ── Search & Filters Row ────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 360 }}>
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text3)',
            pointerEvents: 'none',
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, phone, company..."
            style={{
              width: '100%', padding: '8px 12px 8px 32px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text1)', fontSize: 13,
              outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          style={{
            padding: '8px 12px', borderRadius: 8,
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text2)', fontSize: 13, outline: 'none',
            cursor: 'pointer', appearance: 'auto',
          }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Tag filter */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowTagFilter(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 8,
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: selectedTags.length > 0 ? 'var(--accent)' : 'var(--text2)',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            <Tag size={13} />
            Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
            <ChevronDown size={12} style={{ opacity: 0.6 }} />
          </button>
          {showTagFilter && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 4, minWidth: 180, zIndex: 100,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {allTags.map(tag => {
                const active = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedTags(prev =>
                        active ? prev.filter(t => t !== tag) : [...prev, tag]
                      )
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 12px', borderRadius: 6, width: '100%',
                      background: active ? 'var(--surface2)' : 'none',
                      border: 'none', cursor: 'pointer',
                      color: 'var(--text2)', fontSize: 13,
                      textAlign: 'left',
                    }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: getTagColor(tag), flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, textTransform: 'capitalize' }}>{tag}</span>
                    {active && <Check size={12} style={{ color: 'var(--accent)' }} />}
                  </button>
                )
              })}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  style={{
                    display: 'block', width: '100%', padding: '6px 12px',
                    borderRadius: 6, background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--red)', fontSize: 12,
                    fontWeight: 600, textAlign: 'center', marginTop: 2,
                  }}
                >
                  Clear All
                </button>
              )}
            </div>
          )}
        </div>

        {/* Source filter */}
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 8,
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text2)', fontSize: 13, outline: 'none',
            cursor: 'pointer', appearance: 'auto',
          }}
        >
          <option value="all">All Sources</option>
          <option value="Referral">Referral</option>
          <option value="Website">Website</option>
          <option value="Cold Call">Cold Call</option>
          <option value="Event">Event</option>
          <option value="Social">Social</option>
          <option value="Other">Other</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          style={{
            padding: '8px 12px', borderRadius: 8,
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text2)', fontSize: 13, outline: 'none',
            cursor: 'pointer', appearance: 'auto',
          }}
        >
          <option value="name">Sort: Name</option>
          <option value="lastContact">Sort: Last Contact</option>
          <option value="lifetimeSpend">Sort: Lifetime Spend</option>
        </select>
      </div>

      {/* ── Bulk Actions Bar ────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 16px', marginBottom: 12, borderRadius: 10,
          background: 'rgba(79,127,255,0.08)', border: '1px solid rgba(79,127,255,0.2)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
            {selectedIds.size} selected
          </span>
          <div style={{ flex: 1 }} />

          {/* Bulk Tag */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowBulkTag(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 6,
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text2)', fontSize: 12, cursor: 'pointer',
              }}
            >
              <Tag size={12} /> Tag
            </button>
            {showBulkTag && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: 8, minWidth: 180, zIndex: 100,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  <input
                    value={bulkTagInput}
                    onChange={e => setBulkTagInput(e.target.value)}
                    placeholder="Enter tag..."
                    style={{
                      flex: 1, padding: '5px 8px', borderRadius: 6,
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      color: 'var(--text1)', fontSize: 12, outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => { setBulkTagInput(''); setShowBulkTag(false) }}
                    style={{
                      padding: '5px 8px', borderRadius: 6,
                      background: 'var(--accent)', border: 'none',
                      color: '#fff', fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    Apply
                  </button>
                </div>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => { setShowBulkTag(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 8px', borderRadius: 5, width: '100%',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text2)', fontSize: 12, textAlign: 'left',
                      textTransform: 'capitalize',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: getTagColor(tag),
                    }} />
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 6,
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text2)', fontSize: 12, cursor: 'pointer',
            }}
          >
            <Download size={12} /> Export
          </button>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 6,
              background: 'var(--surface)', border: '1px solid rgba(242,90,90,0.3)',
              color: 'var(--red)', fontSize: 12, cursor: 'pointer',
            }}
          >
            <Trash2 size={12} /> Delete
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text3)', padding: 4,
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Contact Table ───────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr 1fr 140px 140px 120px 120px 120px',
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={selectedIds.size === filtered.length && filtered.length > 0}
              onChange={toggleSelectAll}
              style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
          </div>
          {['Name', 'Email', 'Phone', 'Tags', 'Source', 'Last Contact', 'Lifetime Spend'].map(h => (
            <div key={h} style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* Table Rows */}
        {filtered.length === 0 ? (
          <div style={{
            padding: '40px 16px', textAlign: 'center',
            color: 'var(--text3)', fontSize: 14,
          }}>
            No contacts match your filters
          </div>
        ) : (
          filtered.map(contact => {
            const initial = contact.name.charAt(0).toUpperCase()
            const isSelected = selectedIds.has(contact.id)

            return (
              <div
                key={contact.id}
                onClick={() => router.push(`/contacts/${contact.id}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 1fr 140px 140px 120px 120px 120px',
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', transition: 'background 0.15s',
                  background: isSelected ? 'rgba(79,127,255,0.05)' : 'transparent',
                  alignItems: 'center',
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--surface2)'
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent'
                }}
              >
                {/* Checkbox */}
                <div onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(contact.id)}
                    style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                  />
                </div>

                {/* Name + Avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(79,127,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: 'var(--accent)',
                    flexShrink: 0,
                  }}>
                    {initial}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--text1)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {contact.name}
                    </div>
                    {contact.company && (
                      <div style={{
                        fontSize: 11, color: 'var(--text3)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {contact.company}
                      </div>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div style={{
                  fontSize: 13, color: 'var(--text2)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {contact.email}
                </div>

                {/* Phone */}
                <div style={{
                  fontSize: 13, color: 'var(--text2)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {contact.phone}
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {contact.tags.slice(0, 3).map(tag => (
                    <span key={tag} style={{
                      padding: '2px 7px', borderRadius: 20,
                      fontSize: 10, fontWeight: 700,
                      color: getTagColor(tag),
                      background: `${getTagColor(tag)}18`,
                      border: `1px solid ${getTagColor(tag)}30`,
                      textTransform: 'capitalize', whiteSpace: 'nowrap',
                    }}>
                      {tag}
                    </span>
                  ))}
                  {contact.tags.length > 3 && (
                    <span style={{
                      fontSize: 10, color: 'var(--text3)', fontWeight: 600,
                    }}>
                      +{contact.tags.length - 3}
                    </span>
                  )}
                </div>

                {/* Source */}
                <div>
                  <span style={{
                    padding: '3px 8px', borderRadius: 6,
                    fontSize: 11, fontWeight: 600,
                    color: SOURCE_COLORS[contact.source] || '#9299b5',
                    background: `${SOURCE_COLORS[contact.source] || '#9299b5'}15`,
                  }}>
                    {contact.source}
                  </span>
                </div>

                {/* Last Contact */}
                <div style={{
                  fontSize: 12, color: 'var(--text3)',
                }}>
                  {relativeTime(contact.lastContact)}
                </div>

                {/* Lifetime Spend */}
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: contact.lifetimeSpend > 0 ? 'var(--green)' : 'var(--text3)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmtMoney(contact.lifetimeSpend)}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Footer Stats ────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 20, marginTop: 16, padding: '12px 16px',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{
            fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase',
            letterSpacing: '0.05em', fontFamily: 'Barlow Condensed, sans-serif',
            marginBottom: 2,
          }}>
            Total Contacts
          </div>
          <div style={{
            fontSize: 18, fontWeight: 800, color: 'var(--text1)',
            fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums',
          }}>
            {contacts.length}
          </div>
        </div>
        <div>
          <div style={{
            fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase',
            letterSpacing: '0.05em', fontFamily: 'Barlow Condensed, sans-serif',
            marginBottom: 2,
          }}>
            Total Lifetime
          </div>
          <div style={{
            fontSize: 18, fontWeight: 800, color: 'var(--green)',
            fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums',
          }}>
            {fmtMoney(contacts.reduce((s, c) => s + c.lifetimeSpend, 0))}
          </div>
        </div>
        <div>
          <div style={{
            fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase',
            letterSpacing: '0.05em', fontFamily: 'Barlow Condensed, sans-serif',
            marginBottom: 2,
          }}>
            Fleet Accounts
          </div>
          <div style={{
            fontSize: 18, fontWeight: 800, color: 'var(--cyan)',
            fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums',
          }}>
            {contacts.filter(c => c.fleetSize > 1).length}
          </div>
        </div>
        <div>
          <div style={{
            fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase',
            letterSpacing: '0.05em', fontFamily: 'Barlow Condensed, sans-serif',
            marginBottom: 2,
          }}>
            Avg Spend
          </div>
          <div style={{
            fontSize: 18, fontWeight: 800, color: 'var(--accent)',
            fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums',
          }}>
            {fmtMoney(
              contacts.filter(c => c.lifetimeSpend > 0).length > 0
                ? contacts.reduce((s, c) => s + c.lifetimeSpend, 0) / contacts.filter(c => c.lifetimeSpend > 0).length
                : 0
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
