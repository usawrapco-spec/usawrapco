'use client'

import { useState, useMemo } from 'react'
import {
  ArrowRight, DollarSign, FileUp, Mail, MessageSquare,
  CheckCircle2, XCircle, StickyNote, Send, User, Bot,
  Monitor, Clock, Palette, Wrench, ChevronRight,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────────
export interface ActivityEntry {
  id: string
  actor_type: 'user' | 'customer' | 'system' | 'ai'
  actor_name: string
  action: string
  details?: string
  metadata?: Record<string, any>
  created_at: string
}

interface ActivityLogProps {
  activities: ActivityEntry[]
  onAddNote?: (note: string) => void
}

type FilterType = 'all' | 'user' | 'customer' | 'system' | 'ai'

// ─── Demo Data ──────────────────────────────────────────────────────────────────
const DEMO_ACTIVITIES: ActivityEntry[] = [
  {
    id: 'demo-1',
    actor_type: 'user',
    actor_name: 'Kevin',
    action: 'Created estimate QT #1001',
    details: 'Full body wrap, Ford F-150, Matte Black',
    metadata: { type: 'estimate_created', estimate_number: 1001 },
    created_at: '2026-02-21T10:30:00Z',
  },
  {
    id: 'demo-2',
    actor_type: 'user',
    actor_name: 'Kevin',
    action: 'Sent estimate to customer via email',
    details: 'bob@pizza.com',
    metadata: { type: 'email_sent', channel: 'email', to: 'bob@pizza.com' },
    created_at: '2026-02-21T10:45:00Z',
  },
  {
    id: 'demo-3',
    actor_type: 'customer',
    actor_name: 'Bob (Customer)',
    action: 'Viewed estimate',
    details: 'IP: 73.xxx.xxx.xx',
    metadata: { type: 'estimate_viewed' },
    created_at: '2026-02-21T11:00:00Z',
  },
  {
    id: 'demo-4',
    actor_type: 'customer',
    actor_name: 'Bob (Customer)',
    action: 'Accepted estimate and signed contract',
    details: 'Digital signature captured',
    metadata: { type: 'estimate_accepted' },
    created_at: '2026-02-21T11:15:00Z',
  },
  {
    id: 'demo-5',
    actor_type: 'system',
    actor_name: 'Stripe',
    action: 'Payment received: $250.00 design deposit',
    details: 'Stripe charge ch_xxx completed',
    metadata: { type: 'payment', amount: 250 },
    created_at: '2026-02-21T11:16:00Z',
  },
  {
    id: 'demo-6',
    actor_type: 'user',
    actor_name: 'Kevin',
    action: 'Converted estimate to sales order',
    details: 'QT #1001 -> SO #1001',
    metadata: { type: 'stage_change', from: 'Estimate', to: 'Sales Order' },
    created_at: '2026-02-21T11:20:00Z',
  },
  {
    id: 'demo-7',
    actor_type: 'user',
    actor_name: 'Kevin',
    action: 'Advanced to Production stage',
    details: 'All sales intake fields verified',
    metadata: { type: 'stage_change', from: 'Sales', to: 'Production' },
    created_at: '2026-02-21T14:00:00Z',
  },
  {
    id: 'demo-8',
    actor_type: 'system',
    actor_name: 'System',
    action: 'Design file uploaded',
    details: 'logo-v1.ai (4.2 MB)',
    metadata: { type: 'file_upload', file_name: 'logo-v1.ai', size: '4.2 MB' },
    created_at: '2026-02-21T14:05:00Z',
  },
  {
    id: 'demo-9',
    actor_type: 'user',
    actor_name: 'Kevin',
    action: 'Sent proof to customer via SMS',
    details: '+1 (555) 012-3456',
    metadata: { type: 'sms_sent', channel: 'sms' },
    created_at: '2026-02-22T09:00:00Z',
  },
  {
    id: 'demo-10',
    actor_type: 'customer',
    actor_name: 'Bob (Customer)',
    action: 'Requested revision on proof v1',
    details: '"Make logo bigger"',
    metadata: { type: 'proof_revision' },
    created_at: '2026-02-22T09:30:00Z',
  },
  {
    id: 'demo-11',
    actor_type: 'user',
    actor_name: 'Designer',
    action: 'Uploaded proof v2',
    details: 'proof-v2-ford-f150.pdf',
    metadata: { type: 'file_upload', file_name: 'proof-v2-ford-f150.pdf' },
    created_at: '2026-02-22T15:00:00Z',
  },
  {
    id: 'demo-12',
    actor_type: 'user',
    actor_name: 'Kevin',
    action: 'Sent proof v2 to customer',
    details: 'bob@pizza.com',
    metadata: { type: 'email_sent', channel: 'email', to: 'bob@pizza.com' },
    created_at: '2026-02-22T15:05:00Z',
  },
  {
    id: 'demo-13',
    actor_type: 'customer',
    actor_name: 'Bob (Customer)',
    action: 'Approved proof v2',
    details: 'Digital approval with signature',
    metadata: { type: 'proof_approved' },
    created_at: '2026-02-22T16:00:00Z',
  },
  {
    id: 'demo-14',
    actor_type: 'user',
    actor_name: 'Kevin',
    action: 'Advanced to Install stage',
    details: 'Scheduled for Feb 23',
    metadata: { type: 'stage_change', from: 'Production', to: 'Install' },
    created_at: '2026-02-23T08:00:00Z',
  },
  {
    id: 'demo-15',
    actor_type: 'user',
    actor_name: 'Marcus',
    action: 'Finished install',
    details: '6h 0m total install time',
    metadata: { type: 'install_complete', hours: 6 },
    created_at: '2026-02-23T16:00:00Z',
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────────
function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const ts = new Date(dateStr).getTime()
  const diffMs = now - ts
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const DOT_COLORS: Record<string, string> = {
  user: 'var(--accent)',
  customer: 'var(--green)',
  system: 'var(--text3)',
  ai: 'var(--purple)',
}

const FILTER_LABELS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'user', label: 'Team' },
  { key: 'customer', label: 'Customer' },
  { key: 'system', label: 'System' },
  { key: 'ai', label: 'AI' },
]

// ─── Sub-components ─────────────────────────────────────────────────────────────
function ActionIcon({ metadata }: { metadata?: Record<string, any> }) {
  const s: React.CSSProperties = { width: 14, height: 14 }
  const type = metadata?.type || ''
  if (type === 'stage_change') return <ArrowRight style={{ ...s, color: 'var(--cyan)' }} />
  if (type === 'payment') return <DollarSign style={{ ...s, color: 'var(--green)' }} />
  if (type === 'file_upload') return <FileUp style={{ ...s, color: 'var(--amber)' }} />
  if (type === 'email_sent') return <Mail style={{ ...s, color: 'var(--accent)' }} />
  if (type === 'sms_sent') return <Send style={{ ...s, color: 'var(--cyan)' }} />
  if (type === 'proof_approved') return <CheckCircle2 style={{ ...s, color: 'var(--green)' }} />
  if (type === 'proof_revision') return <XCircle style={{ ...s, color: 'var(--red)' }} />
  if (type === 'install_complete') return <Wrench style={{ ...s, color: 'var(--green)' }} />
  if (type === 'estimate_created') return <StickyNote style={{ ...s, color: 'var(--accent)' }} />
  if (type === 'estimate_viewed') return <Monitor style={{ ...s, color: 'var(--text2)' }} />
  if (type === 'estimate_accepted') return <CheckCircle2 style={{ ...s, color: 'var(--green)' }} />
  return <Clock style={{ ...s, color: 'var(--text3)' }} />
}

function StageChangeBadges({ metadata }: { metadata: Record<string, any> }) {
  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.03em',
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
      <span style={{ ...badgeStyle, background: 'rgba(90,96,128,0.2)', color: 'var(--text2)' }}>
        {metadata.from}
      </span>
      <ArrowRight style={{ width: 12, height: 12, color: 'var(--cyan)' }} />
      <span style={{ ...badgeStyle, background: 'rgba(79,127,255,0.15)', color: 'var(--accent)' }}>
        {metadata.to}
      </span>
    </span>
  )
}

function PaymentAmount({ metadata }: { metadata: Record<string, any> }) {
  return (
    <span
      style={{
        color: 'var(--green)',
        fontFamily: "'JetBrains Mono', monospace",
        fontFeatureSettings: '"tnum"',
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      ${metadata.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
    </span>
  )
}

function ProofStatusBadge({ metadata }: { metadata: Record<string, any> }) {
  const isApproved = metadata.type === 'proof_approved'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        background: isApproved ? 'rgba(34,192,122,0.15)' : 'rgba(242,90,90,0.15)',
        color: isApproved ? 'var(--green)' : 'var(--red)',
      }}
    >
      {isApproved ? (
        <CheckCircle2 style={{ width: 11, height: 11 }} />
      ) : (
        <XCircle style={{ width: 11, height: 11 }} />
      )}
      {isApproved ? 'Approved' : 'Revision Requested'}
    </span>
  )
}

function FileUploadBadge({ metadata }: { metadata: Record<string, any> }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        background: 'rgba(245,158,11,0.12)',
        color: 'var(--amber)',
      }}
    >
      <FileUp style={{ width: 11, height: 11 }} />
      {metadata.file_name || 'File'}
      {metadata.size ? ` (${metadata.size})` : ''}
    </span>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function ActivityLog({ activities, onAddNote }: ActivityLogProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [noteText, setNoteText] = useState('')

  const entries = activities
  const isDemo = false

  const filtered = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    if (filter === 'all') return sorted
    return sorted.filter((e) => e.actor_type === filter)
  }, [entries, filter])

  const handleAddNote = () => {
    const trimmed = noteText.trim()
    if (!trimmed || !onAddNote) return
    onAddNote(trimmed)
    setNoteText('')
  }

  // ─── Styles ─────────────────────────────────────────────────────────────
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    width: '100%',
  }

  const headerStyle: React.CSSProperties = {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text2)',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }

  const noteInputWrapperStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
  }

  const noteInputStyle: React.CSSProperties = {
    flex: 1,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '8px 12px',
    color: 'var(--text1)',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
  }

  const noteButtonStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: 6,
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  }

  const filterBarStyle: React.CSSProperties = {
    display: 'flex',
    gap: 6,
    marginBottom: 16,
    flexWrap: 'wrap',
  }

  const timelineContainerStyle: React.CSSProperties = {
    position: 'relative',
    paddingLeft: 24,
  }

  const timelineLineStyle: React.CSSProperties = {
    position: 'absolute',
    left: 7,
    top: 0,
    bottom: 0,
    width: 2,
    background: 'var(--border)',
    borderRadius: 1,
  }

  const demoBarStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 6,
    background: 'rgba(79,127,255,0.08)',
    border: '1px solid rgba(79,127,255,0.2)',
    color: 'var(--text2)',
    fontSize: 12,
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <Clock style={{ width: 14, height: 14 }} />
        Activity Log
      </div>

      {isDemo && (
        <div style={demoBarStyle}>
          <Monitor style={{ width: 13, height: 13, color: 'var(--accent)' }} />
          Demo data shown. Activity will populate as events occur on this job.
        </div>
      )}

      {/* Add Note Input */}
      {onAddNote && (
        <div style={noteInputWrapperStyle}>
          <input
            type="text"
            placeholder="Add an internal note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddNote()
            }}
            style={noteInputStyle}
          />
          <button
            onClick={handleAddNote}
            disabled={!noteText.trim()}
            style={{
              ...noteButtonStyle,
              opacity: noteText.trim() ? 1 : 0.5,
            }}
          >
            <StickyNote style={{ width: 13, height: 13 }} />
            Add Note
          </button>
        </div>
      )}

      {/* Filter Chips */}
      <div style={filterBarStyle}>
        {FILTER_LABELS.map((f) => {
          const isActive = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '5px 14px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid',
                borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                background: isActive ? 'rgba(79,127,255,0.15)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text3)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Timeline */}
      <div style={timelineContainerStyle}>
        <div style={timelineLineStyle} />
        {filtered.length === 0 && (
          <div
            style={{
              padding: '24px 0',
              textAlign: 'center',
              color: 'var(--text3)',
              fontSize: 13,
            }}
          >
            No activity matching this filter.
          </div>
        )}
        {filtered.map((entry, idx) => (
          <ActivityItem key={entry.id} entry={entry} isLast={idx === filtered.length - 1} />
        ))}
      </div>
    </div>
  )
}

// ─── Individual Activity Item ───────────────────────────────────────────────────
function ActivityItem({ entry, isLast }: { entry: ActivityEntry; isLast: boolean }) {
  const meta = entry.metadata || {}
  const dotColor = DOT_COLORS[entry.actor_type] || 'var(--text3)'

  const itemStyle: React.CSSProperties = {
    position: 'relative',
    paddingBottom: isLast ? 0 : 20,
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
  }

  const dotStyle: React.CSSProperties = {
    position: 'absolute',
    left: -21,
    top: 4,
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: dotColor,
    border: '2px solid var(--bg)',
    zIndex: 1,
    flexShrink: 0,
  }

  const iconWrapStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    flexShrink: 0,
  }

  const contentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  }

  const actorStyle: React.CSSProperties = {
    fontWeight: 700,
    color: 'var(--text1)',
    fontSize: 13,
  }

  const actionStyle: React.CSSProperties = {
    color: 'var(--text2)',
    fontSize: 13,
    fontWeight: 400,
  }

  const detailStyle: React.CSSProperties = {
    color: 'var(--text3)',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 1.4,
  }

  const timeStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontFeatureSettings: '"tnum"',
    fontSize: 11,
    color: 'var(--text3)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    marginTop: 1,
  }

  const isOlderThan24h = Date.now() - new Date(entry.created_at).getTime() > 86400000

  return (
    <div style={itemStyle}>
      <div style={dotStyle} />
      <div style={iconWrapStyle}>
        <ActionIcon metadata={entry.metadata} />
      </div>
      <div style={contentStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span style={actorStyle}>{entry.actor_name}</span>
            <span style={actionStyle}>{' '}{entry.action}</span>
          </div>
          <div style={timeStyle}>
            {isOlderThan24h ? formatTimestamp(entry.created_at) : formatRelativeTime(entry.created_at)}
          </div>
        </div>

        {/* Special Renderers */}
        {meta.type === 'stage_change' && meta.from && meta.to && (
          <div style={{ marginTop: 4 }}>
            <StageChangeBadges metadata={meta} />
          </div>
        )}

        {meta.type === 'payment' && meta.amount && (
          <div style={{ marginTop: 4 }}>
            <PaymentAmount metadata={meta} />
          </div>
        )}

        {meta.type === 'file_upload' && (
          <div style={{ marginTop: 4 }}>
            <FileUploadBadge metadata={meta} />
          </div>
        )}

        {(meta.type === 'proof_approved' || meta.type === 'proof_revision') && (
          <div style={{ marginTop: 4 }}>
            <ProofStatusBadge metadata={meta} />
          </div>
        )}

        {/* Generic Details */}
        {entry.details && meta.type !== 'stage_change' && meta.type !== 'payment' && meta.type !== 'file_upload' && (
          <div style={detailStyle}>{entry.details}</div>
        )}
      </div>
    </div>
  )
}
