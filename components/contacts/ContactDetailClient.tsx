'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Mail, Phone, MessageSquare, Edit2, MoreHorizontal,
  Tag, Plus, DollarSign, Briefcase, TrendingUp, CreditCard,
  StickyNote, FileText, User, MapPin, Building2, Calendar,
  Clock, CheckCircle2, Send, XCircle, ChevronDown, Paperclip,
  ListChecks, FolderOpen, Receipt,
} from 'lucide-react'
import type { Profile } from '@/types'

// ── Types ─────────────────────────────────────────────────────────
export interface ContactDetailClientProps {
  profile: Profile
  contact: any
  activities: any[]
  jobs: any[]
  estimates: any[]
  invoices: any[]
}

// ── Tag colors ────────────────────────────────────────────────────
const TAG_COLORS: Record<string, string> = {
  fleet: '#22d3ee', repeat: '#8b5cf6', vip: '#f59e0b',
  new: '#22c07a', prospect: '#4f7fff', 'follow-up': '#f25a5a',
  commercial: '#22d3ee', residential: '#9299b5',
}
const DEFAULT_TAG_PALETTE = ['#4f7fff', '#22c07a', '#f59e0b', '#8b5cf6', '#22d3ee', '#f25a5a', '#9299b5', '#e8eaed']

function getTagColor(tag: string): string {
  if (TAG_COLORS[tag.toLowerCase()]) return TAG_COLORS[tag.toLowerCase()]
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return DEFAULT_TAG_PALETTE[Math.abs(hash) % DEFAULT_TAG_PALETTE.length]
}

// ── Format helpers ────────────────────────────────────────────────
const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const fmtMoneyDecimal = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

function relativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

// ── Timeline types ────────────────────────────────────────────────
type TimelineActorType = 'team' | 'customer' | 'system'
type TimelineType = 'email' | 'sms' | 'call' | 'note' | 'estimate' | 'job' | 'invoice' | 'payment'

interface TimelineEntry {
  id: string
  type: TimelineType
  actorType: TimelineActorType
  timestamp: Date
  title: string
  description: string
  details?: string
}

// ── Actor dot colors ──────────────────────────────────────────────
const ACTOR_COLORS: Record<TimelineActorType, string> = {
  team: '#4f7fff',
  customer: '#22c07a',
  system: '#5a6080',
}

// ── Timeline icon map ─────────────────────────────────────────────
const TIMELINE_ICONS: Record<TimelineType, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  call: Phone,
  note: StickyNote,
  estimate: FileText,
  job: Briefcase,
  invoice: Receipt,
  payment: CreditCard,
}

// ── Demo timeline for Bob Smith ───────────────────────────────────
const now = new Date()
function hoursAgo(h: number): Date { return new Date(now.getTime() - h * 3600000) }
function daysAgo(d: number): Date { return new Date(now.getTime() - d * 86400000) }

const DEMO_TIMELINE: TimelineEntry[] = [
  {
    id: 't1', type: 'payment', actorType: 'customer', timestamp: hoursAgo(4),
    title: 'Payment received', description: 'Bob Smith paid Invoice INV-1042 via credit card',
    details: 'Amount: $3,200.00 | Method: Visa ending 4829',
  },
  {
    id: 't2', type: 'invoice', actorType: 'system', timestamp: daysAgo(1),
    title: 'Invoice sent', description: 'Invoice INV-1042 sent to bob@bobspizza.com',
    details: 'Amount: $3,200.00 | Due: Feb 28, 2026',
  },
  {
    id: 't3', type: 'job', actorType: 'system', timestamp: daysAgo(2),
    title: 'Job completed', description: 'Fleet Van #3 full wrap installation completed',
    details: 'Install time: 6.5 hrs | QC passed',
  },
  {
    id: 't4', type: 'email', actorType: 'team', timestamp: daysAgo(3),
    title: 'Email sent', description: 'Scheduling confirmation sent for Van #3 install',
    details: 'Subject: Install Confirmation - Feb 19 @ 8:00 AM',
  },
  {
    id: 't5', type: 'call', actorType: 'team', timestamp: daysAgo(5),
    title: 'Call logged', description: 'Discussed install schedule for remaining fleet vehicles',
    details: 'Duration: 12 min | Rep: Jake Martinez',
  },
  {
    id: 't6', type: 'sms', actorType: 'customer', timestamp: daysAgo(7),
    title: 'SMS received', description: 'Bob: "Design looks great, approved for print!"',
  },
  {
    id: 't7', type: 'estimate', actorType: 'system', timestamp: daysAgo(10),
    title: 'Estimate accepted', description: 'Estimate EST-2087 accepted by Bob Smith',
    details: 'Amount: $3,200.00 | 1 full wrap (Sprinter Van)',
  },
  {
    id: 't8', type: 'estimate', actorType: 'team', timestamp: daysAgo(12),
    title: 'Estimate sent', description: 'Estimate EST-2087 sent to bob@bobspizza.com',
    details: 'Amount: $3,200.00 | Fleet Van #3 Full Wrap',
  },
  {
    id: 't9', type: 'note', actorType: 'team', timestamp: daysAgo(14),
    title: 'Note added', description: 'Bob mentioned he wants matching design for 4th van by March',
    details: 'Added by Jake Martinez',
  },
  {
    id: 't10', type: 'job', actorType: 'system', timestamp: daysAgo(30),
    title: 'Job completed', description: 'Fleet Van #2 partial wrap completed and delivered',
    details: 'Install time: 4.2 hrs | Revenue: $2,800',
  },
  {
    id: 't11', type: 'payment', actorType: 'customer', timestamp: daysAgo(32),
    title: 'Payment received', description: 'Bob Smith paid Invoice INV-0998',
    details: 'Amount: $2,800.00 | Method: ACH Transfer',
  },
  {
    id: 't12', type: 'email', actorType: 'team', timestamp: daysAgo(60),
    title: 'Email sent', description: 'Initial fleet wrap proposal sent',
    details: 'Subject: USA Wrap Co - Fleet Branding Proposal for Bob\'s Pizza',
  },
]

// ── Demo data for other tabs ──────────────────────────────────────
interface DemoDeal {
  id: string
  number: string
  title: string
  amount: number
  status: 'draft' | 'sent' | 'accepted' | 'expired' | 'rejected'
  date: string
}

const DEMO_DEALS: DemoDeal[] = [
  { id: 'd1', number: 'EST-2087', title: 'Fleet Van #3 Full Wrap', amount: 3200, status: 'accepted', date: '2026-02-11' },
  { id: 'd2', number: 'EST-2054', title: 'Fleet Van #2 Partial Wrap', amount: 2800, status: 'accepted', date: '2026-01-15' },
  { id: 'd3', number: 'EST-2001', title: 'Delivery Car #1 Full Wrap', amount: 3400, status: 'accepted', date: '2025-11-20' },
]

interface DemoJob {
  id: string
  title: string
  vehicle: string
  status: string
  revenue: number
  date: string
}

const DEMO_JOBS: DemoJob[] = [
  { id: 'j1', title: 'Fleet Van #3 Full Wrap', vehicle: '2024 Mercedes Sprinter', status: 'completed', revenue: 3200, date: '2026-02-19' },
  { id: 'j2', title: 'Fleet Van #2 Partial Wrap', vehicle: '2023 Ford Transit', status: 'completed', revenue: 2800, date: '2026-01-22' },
  { id: 'j3', title: 'Delivery Car #1 Full Wrap', vehicle: '2024 Toyota Camry', status: 'completed', revenue: 3400, date: '2025-12-05' },
]

interface DemoInvoice {
  id: string
  number: string
  amount: number
  paid: number
  status: 'paid' | 'sent' | 'overdue' | 'draft'
  date: string
  dueDate: string
}

const DEMO_INVOICES: DemoInvoice[] = [
  { id: 'i1', number: 'INV-1042', amount: 3200, paid: 3200, status: 'paid', date: '2026-02-19', dueDate: '2026-02-28' },
  { id: 'i2', number: 'INV-0998', amount: 2800, paid: 2800, status: 'paid', date: '2026-01-22', dueDate: '2026-02-05' },
  { id: 'i3', number: 'INV-0945', amount: 3400, paid: 3400, status: 'paid', date: '2025-12-05', dueDate: '2025-12-20' },
]

interface DemoFile {
  id: string
  name: string
  type: string
  size: string
  uploaded: string
  by: string
}

const DEMO_FILES: DemoFile[] = [
  { id: 'f1', name: 'bobs-pizza-fleet-design-v3.ai', type: 'Design', size: '24.3 MB', uploaded: '2026-02-08', by: 'Maria Gonzalez' },
  { id: 'f2', name: 'van3-proof-approved.pdf', type: 'Proof', size: '2.1 MB', uploaded: '2026-02-09', by: 'Maria Gonzalez' },
  { id: 'f3', name: 'van2-install-photos.zip', type: 'Photo', size: '18.7 MB', uploaded: '2026-01-22', by: 'Jake Martinez' },
  { id: 'f4', name: 'fleet-brand-guidelines.pdf', type: 'Reference', size: '5.4 MB', uploaded: '2025-11-15', by: 'Bob Smith' },
]

interface DemoNote {
  id: string
  content: string
  author: string
  date: string
}

const DEMO_NOTES: DemoNote[] = [
  { id: 'n1', content: 'Bob mentioned he wants matching design for 4th van by March. High priority fleet account.', author: 'Jake Martinez', date: '2026-02-07' },
  { id: 'n2', content: 'Prefers Avery Dennison vinyl for all fleet vehicles. Has had issues with 3M adhesion in past.', author: 'Maria Gonzalez', date: '2026-01-10' },
  { id: 'n3', content: 'Bob referred Torres Roofing to us. Send referral bonus check.', author: 'Jake Martinez', date: '2025-12-18' },
]

interface DemoTask {
  id: string
  title: string
  assignee: string
  dueDate: string
  status: 'open' | 'in_progress' | 'done'
  priority: 'high' | 'normal' | 'low'
}

const DEMO_TASKS: DemoTask[] = [
  { id: 'tk1', title: 'Schedule Van #4 design consultation', assignee: 'Jake Martinez', dueDate: '2026-02-25', status: 'open', priority: 'high' },
  { id: 'tk2', title: 'Send referral bonus check', assignee: 'Admin', dueDate: '2026-02-28', status: 'in_progress', priority: 'normal' },
  { id: 'tk3', title: 'Follow up on fleet wrap maintenance', assignee: 'Jake Martinez', dueDate: '2026-03-15', status: 'open', priority: 'low' },
]

// ── Tabs ──────────────────────────────────────────────────────────
type TabKey = 'timeline' | 'deals' | 'jobs' | 'invoices' | 'files' | 'notes' | 'tasks'

const TABS: { key: TabKey; label: string; icon: typeof Mail }[] = [
  { key: 'timeline', label: 'Timeline', icon: Clock },
  { key: 'deals', label: 'Deals', icon: FileText },
  { key: 'jobs', label: 'Jobs', icon: Briefcase },
  { key: 'invoices', label: 'Invoices', icon: Receipt },
  { key: 'files', label: 'Files', icon: FolderOpen },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'tasks', label: 'Tasks', icon: ListChecks },
]

// ── Status colors ─────────────────────────────────────────────────
const DEAL_STATUS_COLORS: Record<string, string> = {
  draft: '#5a6080', sent: '#4f7fff', accepted: '#22c07a',
  expired: '#9299b5', rejected: '#f25a5a',
}
const JOB_STATUS_COLORS: Record<string, string> = {
  completed: '#22c07a', active: '#4f7fff', in_production: '#f59e0b',
  cancelled: '#f25a5a',
}
const INVOICE_STATUS_COLORS: Record<string, string> = {
  paid: '#22c07a', sent: '#4f7fff', overdue: '#f25a5a', draft: '#5a6080',
}
const TASK_STATUS_COLORS: Record<string, string> = {
  open: '#4f7fff', in_progress: '#f59e0b', done: '#22c07a',
}
const TASK_PRIORITY_COLORS: Record<string, string> = {
  high: '#f25a5a', normal: '#4f7fff', low: '#9299b5',
}

// ── Component ─────────────────────────────────────────────────────
export default function ContactDetailClient({
  profile, contact, activities, jobs, estimates, invoices,
}: ContactDetailClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('timeline')
  const [newNote, setNewNote] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [showTagInput, setShowTagInput] = useState(false)
  const [newTagValue, setNewTagValue] = useState('')
  const [expandedTimeline, setExpandedTimeline] = useState<Set<string>>(new Set())
  const [showMore, setShowMore] = useState(false)

  const hasRealData = contact && (jobs.length > 0 || estimates.length > 0)

  // Contact data (uses passed contact or falls back to demo)
  const lifetimeSpend = jobs.reduce((s: number, j: any) => s + (j.revenue || 0), 0)
  const avgGPM = jobs.length > 0 ? jobs.reduce((s: number, j: any) => s + (j.gpm || 0), 0) / jobs.length : 0
  const c = {
    name: contact?.contact_name || contact?.name || 'Bob Smith',
    company: contact?.company_name || "Bob's Pizza",
    email: contact?.email || 'bob@bobspizza.com',
    phone: contact?.phone || '(555) 123-4567',
    address: contact?.address || '1234 Main St, Dallas, TX 75201',
    source: contact?.source || 'Referral',
    salesRep: 'Jake Martinez',
    tags: contact?.tags || ['fleet', 'repeat', 'vip'],
    fleetSize: contact?.fleet_size || 4,
    balance: 0,
    lifetimeSpend: hasRealData ? lifetimeSpend : 9400,
    totalJobs: hasRealData ? jobs.length : 3,
    avgGPM: hasRealData ? Math.round(avgGPM) : 71,
  }

  const initial = c.name.charAt(0).toUpperCase()

  function toggleTimelineExpand(id: string) {
    setExpandedTimeline(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Info card ─────────────────────────────────────────────
  const InfoCard = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div style={{
      flex: '1 1 140px', padding: '16px 18px',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10,
    }}>
      <div style={{
        fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase',
        letterSpacing: '0.05em', fontFamily: 'Barlow Condensed, sans-serif',
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 800, color: color || 'var(--text1)',
        fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* ── Back nav ──────────────────────────────────────────── */}
      <button
        onClick={() => router.push('/contacts')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: 20, background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--text3)', fontSize: 13,
          fontWeight: 600, padding: 0,
        }}
      >
        <ArrowLeft size={14} /> Back to Contacts
      </button>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 20, flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(79,127,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 900, color: 'var(--accent)',
            flexShrink: 0,
          }}>
            {initial}
          </div>
          <div>
            <h1 style={{
              fontSize: 24, fontWeight: 900,
              fontFamily: 'Barlow Condensed, sans-serif',
              color: 'var(--text1)', letterSpacing: '0.02em',
              marginBottom: 4,
            }}>
              {c.name}
              {c.company && (
                <span style={{ color: 'var(--text3)', fontWeight: 500 }}>
                  {' '}&mdash; {c.company}
                </span>
              )}
            </h1>
            {/* Tags row */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {(Array.isArray(c.tags) ? c.tags : []).map((tag: string) => (
                <span key={tag} style={{
                  padding: '3px 10px', borderRadius: 20,
                  fontSize: 11, fontWeight: 700,
                  color: getTagColor(tag),
                  background: `${getTagColor(tag)}18`,
                  border: `1px solid ${getTagColor(tag)}30`,
                  textTransform: 'capitalize',
                }}>
                  {tag}
                </span>
              ))}
              {showTagInput ? (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input
                    value={newTagValue}
                    onChange={e => setNewTagValue(e.target.value)}
                    placeholder="Tag name"
                    autoFocus
                    style={{
                      padding: '3px 8px', borderRadius: 6, width: 100,
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      color: 'var(--text1)', fontSize: 11, outline: 'none',
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newTagValue.trim()) {
                        setNewTagValue('')
                        setShowTagInput(false)
                      }
                      if (e.key === 'Escape') setShowTagInput(false)
                    }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowTagInput(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    padding: '3px 8px', borderRadius: 20,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    color: 'var(--text3)', fontSize: 11, cursor: 'pointer',
                  }}
                >
                  <Plus size={10} /> Add Tag
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '8px 14px', borderRadius: 8,
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <Edit2 size={13} /> Edit
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '8px 14px', borderRadius: 8,
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <Mail size={13} /> Email
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '8px 14px', borderRadius: 8,
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <Phone size={13} /> Call
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '8px 14px', borderRadius: 8,
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <MessageSquare size={13} /> SMS
          </button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMore(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 8,
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text3)', cursor: 'pointer',
              }}
            >
              <MoreHorizontal size={16} />
            </button>
            {showMore && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 4, minWidth: 160, zIndex: 100,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {['Merge Contact', 'Archive', 'Delete'].map(action => (
                  <button
                    key={action}
                    onClick={() => setShowMore(false)}
                    style={{
                      display: 'block', width: '100%', padding: '8px 12px',
                      borderRadius: 7, background: 'none', border: 'none',
                      cursor: 'pointer', color: action === 'Delete' ? 'var(--red)' : 'var(--text2)',
                      fontSize: 13, textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Info Cards Row ────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap',
      }}>
        <InfoCard label="Balance" value={fmtMoneyDecimal(c.balance)} />
        <InfoCard label="Lifetime Spend" value={fmtMoney(c.lifetimeSpend)} color="var(--green)" />
        <InfoCard label="Total Jobs" value={String(c.totalJobs)} />
        <InfoCard label="Avg GPM" value={`${c.avgGPM}%`} />
      </div>

      {/* ── Quick Info Grid ───────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        {/* Contact Info */}
        <div style={{
          padding: '16px 18px', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 10,
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 12,
          }}>
            Contact Info
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Mail size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{c.email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Phone size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <span style={{
                fontSize: 13, color: 'var(--text2)',
                fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums',
              }}>
                {c.phone}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <MapPin size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{c.address}</span>
            </div>
          </div>
        </div>

        {/* Assignments */}
        <div style={{
          padding: '16px 18px', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 10,
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 12,
          }}>
            Assignments
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <User size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>Sales Rep:</span>
              <span style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>{c.salesRep}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Tag size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>Source:</span>
              <span style={{
                padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                color: '#8b5cf6', background: 'rgba(139,92,246,0.1)',
              }}>
                {c.source}
              </span>
            </div>
          </div>
        </div>

        {/* Company */}
        <div style={{
          padding: '16px 18px', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 10,
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 12,
          }}>
            Company
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Building2 size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>{c.company || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <TrendingUp size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>Fleet Size:</span>
              <span style={{
                fontSize: 13, color: 'var(--cyan)', fontWeight: 700,
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                {c.fleetSize} vehicles
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: '1px solid var(--border)',
        marginBottom: 20, overflowX: 'auto',
      }}>
        {TABS.map(tab => {
          const TabIcon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', background: 'none', border: 'none',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                color: isActive ? 'var(--accent)' : 'var(--text3)',
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.15s',
              }}
            >
              <TabIcon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ───────────────────────────────────────── */}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <div>
          {/* Add note input */}
          <div style={{
            display: 'flex', gap: 8, marginBottom: 20,
            padding: '12px 16px', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 10,
          }}>
            <input
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add a note..."
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text1)', fontSize: 13, outline: 'none',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
            <button style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 8,
              background: 'var(--accent)', border: 'none',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <Send size={13} /> Add Note
            </button>
          </div>

          {/* Timeline entries */}
          <div style={{ position: 'relative' }}>
            {/* Vertical line */}
            <div style={{
              position: 'absolute', left: 19, top: 0, bottom: 0,
              width: 2, background: 'var(--border)',
            }} />

            {DEMO_TIMELINE.map(entry => {
              const EntryIcon = TIMELINE_ICONS[entry.type]
              const dotColor = ACTOR_COLORS[entry.actorType]
              const isExpanded = expandedTimeline.has(entry.id)

              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex', gap: 14, marginBottom: 4,
                    position: 'relative', cursor: entry.details ? 'pointer' : 'default',
                  }}
                  onClick={() => entry.details && toggleTimelineExpand(entry.id)}
                >
                  {/* Actor dot + icon */}
                  <div style={{
                    width: 40, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', flexShrink: 0, zIndex: 1,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'var(--bg)',
                      border: `2px solid ${dotColor}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <EntryIcon size={14} style={{ color: dotColor }} />
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{
                    flex: 1, padding: '10px 16px',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, marginBottom: 8,
                  }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', gap: 8, marginBottom: 4,
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                        {entry.title}
                      </span>
                      <span style={{
                        fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}>
                        {relativeTime(entry.timestamp)}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: entry.details && isExpanded ? 8 : 0 }}>
                      {entry.description}
                    </div>
                    {entry.details && isExpanded && (
                      <div style={{
                        fontSize: 12, color: 'var(--text3)', padding: '8px 12px',
                        background: 'var(--surface2)', borderRadius: 6,
                        borderLeft: `3px solid ${dotColor}`,
                      }}>
                        {entry.details}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Deals Tab */}
      {activeTab === 'deals' && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '100px 1fr 120px 100px 120px',
            padding: '10px 16px', borderBottom: '1px solid var(--border)',
            background: 'var(--surface2)',
          }}>
            {['Number', 'Title', 'Amount', 'Status', 'Date'].map(h => (
              <div key={h} style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                fontFamily: 'Barlow Condensed, sans-serif',
              }}>
                {h}
              </div>
            ))}
          </div>
          {(estimates.length > 0 ? estimates : DEMO_DEALS).map((deal: any) => (
            <div key={deal.id} style={{
              display: 'grid', gridTemplateColumns: '100px 1fr 120px 100px 120px',
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
              onClick={() => deal.estimate_number ? router.push(`/estimates/${deal.id}`) : undefined}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                fontSize: 13, fontWeight: 700, color: 'var(--accent)',
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                {deal.number || `EST-${deal.estimate_number || '?'}`}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text1)' }}>{deal.title}</div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: 'var(--green)',
                fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtMoney(deal.amount || deal.total || 0)}
              </div>
              <div>
                <span style={{
                  padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  color: DEAL_STATUS_COLORS[deal.status] || '#5a6080',
                  background: `${DEAL_STATUS_COLORS[deal.status] || '#5a6080'}18`,
                  textTransform: 'capitalize',
                }}>
                  {deal.status}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{deal.date || (deal.created_at ? formatDate(new Date(deal.created_at)) : '')}</div>
            </div>
          ))}
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 110px 110px 120px',
            padding: '10px 16px', borderBottom: '1px solid var(--border)',
            background: 'var(--surface2)',
          }}>
            {['Title', 'Vehicle', 'Status', 'Revenue', 'Date'].map(h => (
              <div key={h} style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                fontFamily: 'Barlow Condensed, sans-serif',
              }}>
                {h}
              </div>
            ))}
          </div>
          {(jobs.length > 0 ? jobs : DEMO_JOBS).map((job: any) => (
            <div key={job.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 110px 110px 120px',
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
              onClick={() => job.pipe_stage ? router.push(`/projects/${job.id}`) : undefined}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>{job.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>{job.vehicle || job.vehicle_desc || ''}</div>
              <div>
                <span style={{
                  padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  color: JOB_STATUS_COLORS[job.status] || '#9299b5',
                  background: `${JOB_STATUS_COLORS[job.status] || '#9299b5'}18`,
                  textTransform: 'capitalize',
                }}>
                  {job.status}
                </span>
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: 'var(--green)',
                fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtMoney(job.revenue || 0)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{job.date || (job.created_at ? formatDate(new Date(job.created_at)) : '')}</div>
            </div>
          ))}
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '100px 110px 110px 100px 120px 120px',
            padding: '10px 16px', borderBottom: '1px solid var(--border)',
            background: 'var(--surface2)',
          }}>
            {['Number', 'Amount', 'Paid', 'Status', 'Date', 'Due Date'].map(h => (
              <div key={h} style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                fontFamily: 'Barlow Condensed, sans-serif',
              }}>
                {h}
              </div>
            ))}
          </div>
          {(invoices.length > 0 ? invoices : DEMO_INVOICES).map((inv: any) => (
            <div key={inv.id} style={{
              display: 'grid', gridTemplateColumns: '100px 110px 110px 100px 120px 120px',
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
              onClick={() => inv.invoice_number ? router.push(`/invoices/${inv.id}`) : undefined}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                fontSize: 13, fontWeight: 700, color: 'var(--accent)',
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                {inv.number || `INV-${inv.invoice_number || '?'}`}
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: 'var(--text1)',
                fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtMoney(inv.amount || inv.total || 0)}
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: 'var(--green)',
                fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtMoney(inv.paid || (inv.total || 0) - (inv.balance_due || 0))}
              </div>
              <div>
                <span style={{
                  padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  color: INVOICE_STATUS_COLORS[inv.status] || '#5a6080',
                  background: `${INVOICE_STATUS_COLORS[inv.status] || '#5a6080'}18`,
                  textTransform: 'capitalize',
                }}>
                  {inv.status}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{inv.date || (inv.created_at ? formatDate(new Date(inv.created_at)) : '')}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{inv.dueDate || (inv.due_date ? formatDate(new Date(inv.due_date)) : '')}</div>
            </div>
          ))}
        </div>
      )}

      {/* Files Tab */}
      {activeTab === 'files' && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 80px 120px 140px',
            padding: '10px 16px', borderBottom: '1px solid var(--border)',
            background: 'var(--surface2)',
          }}>
            {['File Name', 'Type', 'Size', 'Uploaded', 'By'].map(h => (
              <div key={h} style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                fontFamily: 'Barlow Condensed, sans-serif',
              }}>
                {h}
              </div>
            ))}
          </div>
          {DEMO_FILES.map(file => (
            <div key={file.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 80px 120px 140px',
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 13, color: 'var(--text1)',
              }}>
                <Paperclip size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                <span style={{
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {file.name}
                </span>
              </div>
              <div>
                <span style={{
                  padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  color: 'var(--accent)', background: 'rgba(79,127,255,0.1)',
                }}>
                  {file.type}
                </span>
              </div>
              <div style={{
                fontSize: 12, color: 'var(--text3)',
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                {file.size}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{file.uploaded}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{file.by}</div>
            </div>
          ))}
          {/* Upload button */}
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--border)',
            textAlign: 'center',
          }}>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <Plus size={13} /> Upload File
            </button>
          </div>
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div>
          {/* Add note */}
          {!showNoteInput ? (
            <button
              onClick={() => setShowNoteInput(true)}
              style={{
                background: 'transparent', border: 'none', color: 'var(--accent)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0',
                marginBottom: 16, display: 'block',
              }}
            >
              + Write a Note
            </button>
          ) : (
            <div style={{
              display: 'flex', gap: 8, marginBottom: 16,
              padding: '12px 16px', background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 10,
            }}>
              <textarea
                placeholder="Write a note..."
                rows={3}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text1)', fontSize: 13, outline: 'none',
                  resize: 'vertical', fontFamily: 'inherit',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
              <button style={{
                display: 'flex', alignItems: 'flex-start', gap: 5,
                padding: '8px 14px', borderRadius: 8,
                background: 'var(--accent)', border: 'none',
                color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                height: 'fit-content',
              }}>
                <Plus size={13} /> Add
              </button>
            </div>
          )}

          {/* Notes list */}
          {DEMO_NOTES.map(note => (
            <div key={note.id} style={{
              padding: '14px 18px', marginBottom: 8,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 13, color: 'var(--text1)', marginBottom: 8, lineHeight: 1.5 }}>
                {note.content}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 11, color: 'var(--text3)',
              }}>
                <span style={{ fontWeight: 600 }}>{note.author}</span>
                <span>{note.date}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '24px 1fr 140px 110px 80px 80px',
            padding: '10px 16px', borderBottom: '1px solid var(--border)',
            background: 'var(--surface2)',
          }}>
            <div />
            {['Task', 'Assignee', 'Due Date', 'Priority', 'Status'].map(h => (
              <div key={h} style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                fontFamily: 'Barlow Condensed, sans-serif',
              }}>
                {h}
              </div>
            ))}
          </div>
          {DEMO_TASKS.map(task => (
            <div key={task.id} style={{
              display: 'grid', gridTemplateColumns: '24px 1fr 140px 110px 80px 80px',
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
              cursor: 'pointer', transition: 'background 0.15s',
              alignItems: 'center',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                {task.status === 'done' ? (
                  <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
                ) : (
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '2px solid var(--border)',
                  }} />
                )}
              </div>
              <div style={{
                fontSize: 13, color: 'var(--text1)', fontWeight: 600,
                textDecoration: task.status === 'done' ? 'line-through' : 'none',
                opacity: task.status === 'done' ? 0.5 : 1,
              }}>
                {task.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{task.assignee}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{task.dueDate}</div>
              <div>
                <span style={{
                  padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  color: TASK_PRIORITY_COLORS[task.priority],
                  background: `${TASK_PRIORITY_COLORS[task.priority]}18`,
                  textTransform: 'capitalize',
                }}>
                  {task.priority}
                </span>
              </div>
              <div>
                <span style={{
                  padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  color: TASK_STATUS_COLORS[task.status],
                  background: `${TASK_STATUS_COLORS[task.status]}18`,
                  textTransform: 'capitalize',
                }}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
          {/* Add task button */}
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--border)',
            textAlign: 'center',
          }}>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <Plus size={13} /> Add Task
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
