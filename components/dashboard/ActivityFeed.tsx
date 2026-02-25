'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  MessageSquare, CheckCircle, FileText, Plus,
  Activity, DollarSign, Hammer, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

type EventType = 'comment' | 'signoff' | 'new_project' | 'stage_change' | 'estimate' | 'bid'
type FilterTab  = 'all' | 'messages' | 'signoffs' | 'moves'

interface ActivityItem {
  id: string
  type: EventType
  message: string
  sub?: string
  actor?: string
  href?: string
  ts: string
}

interface Props {
  orgId: string
}

// ── Config ────────────────────────────────────────────────────────────────────
const TYPE_CFG: Record<EventType, { color: string; bg: string }> = {
  comment:      { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  signoff:      { color: '#22c07a', bg: 'rgba(34,192,122,0.12)' },
  new_project:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  stage_change: { color: '#4f7fff', bg: 'rgba(79,127,255,0.12)' },
  estimate:     { color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
  bid:          { color: '#f25a5a', bg: 'rgba(242,90,90,0.12)' },
}

const STAGE_LABELS: Record<string, string> = {
  sales_in: 'Sales', production: 'Production', install: 'Install',
  prod_review: 'QC Review', sales_close: 'Sales Close', done: 'Done',
}

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'messages', label: 'Messages' },
  { key: 'signoffs', label: 'Sign-offs' },
  { key: 'moves',    label: 'Moves' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name?: string) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function relTime(ts: string) {
  const ms = Date.now() - new Date(ts).getTime()
  const m  = Math.floor(ms / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? 'yesterday' : `${d}d ago`
}

function EventIcon({ type, color }: { type: EventType; color: string }) {
  const s = { color, width: 13, height: 13 }
  switch (type) {
    case 'comment':      return <MessageSquare style={s} />
    case 'signoff':      return <CheckCircle style={s} />
    case 'new_project':  return <Plus style={s} />
    case 'stage_change': return <FileText style={s} />
    case 'estimate':     return <DollarSign style={s} />
    case 'bid':          return <Hammer style={s} />
    default:             return <Activity style={s} />
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ActivityFeed({ orgId }: Props) {
  const [items,     setItems]     = useState<ActivityItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState<FilterTab>('all')
  const [flashIds,  setFlashIds]  = useState<Set<string>>(new Set())
  const [liveCount, setLiveCount] = useState(0)
  const prevIds = useRef<Set<string>>(new Set())
  const supabase = createClient()

  const load = useCallback(async () => {
    const [comments, approvals, projects, estimates] = await Promise.all([
      supabase
        .from('job_comments')
        .select('id, message, channel, created_at, project_id, profiles:user_id(name)')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10),

      supabase
        .from('stage_approvals')
        .select('id, stage, created_at, project_id, signer_name, projects:project_id(title)')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(8),

      supabase
        .from('projects')
        .select('id, title, pipe_stage, created_at, updated_at, profiles:agent_id(name)')
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(12),

      supabase
        .from('estimates')
        .select('id, title, status, created_at, updated_at, customers:customer_id(name)')
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(6),
    ])

    const feed: ActivityItem[] = []

    // Comments
    comments.data?.forEach((c: any) => {
      const name = c.profiles?.name || 'Someone'
      const chan  = c.channel === 'client'    ? 'from client'
                  : c.channel === 'installer' ? 'from installer'
                  : 'to team'
      feed.push({
        id:      `comment-${c.id}`,
        type:    'comment',
        message: `${name} sent a message ${chan}`,
        actor:   name,
        href:    c.project_id ? `/projects/${c.project_id}` : undefined,
        ts:      c.created_at,
      })
    })

    // Stage sign-offs
    approvals.data?.forEach((a: any) => {
      const stage = STAGE_LABELS[a.stage] || a.stage
      const proj  = (a.projects as any)?.title || 'a project'
      feed.push({
        id:      `approval-${a.id}`,
        type:    'signoff',
        message: `${a.signer_name || 'Someone'} signed off ${stage}`,
        sub:     proj,
        actor:   a.signer_name,
        href:    a.project_id ? `/projects/${a.project_id}` : undefined,
        ts:      a.created_at,
      })
    })

    // Projects — new vs stage move
    projects.data?.forEach((p: any) => {
      const age = Math.abs(
        new Date(p.created_at).getTime() - new Date(p.updated_at).getTime()
      )
      if (age < 120000) {
        // Created within 2 min of last update → new
        const agent = (p.profiles as any)?.name
        feed.push({
          id:      `proj-new-${p.id}`,
          type:    'new_project',
          message: `New job created: ${p.title || 'Untitled'}`,
          sub:     agent ? `by ${agent}` : undefined,
          actor:   agent,
          href:    `/projects/${p.id}`,
          ts:      p.created_at,
        })
      } else if (p.pipe_stage) {
        feed.push({
          id:      `proj-stage-${p.id}`,
          type:    'stage_change',
          message: `${p.title || 'Job'} moved to ${STAGE_LABELS[p.pipe_stage] || p.pipe_stage}`,
          href:    `/projects/${p.id}`,
          ts:      p.updated_at,
        })
      }
    })

    // Estimates
    estimates.data?.forEach((e: any) => {
      const cust = (e.customers as any)?.name || 'customer'
      if (e.status === 'sent') {
        feed.push({
          id:      `est-sent-${e.id}`,
          type:    'estimate',
          message: `Estimate sent to ${cust}`,
          sub:     e.title || undefined,
          href:    `/estimates/${e.id}`,
          ts:      e.updated_at,
        })
      } else {
        const age = Math.abs(
          new Date(e.created_at).getTime() - new Date(e.updated_at).getTime()
        )
        if (age < 120000) {
          feed.push({
            id:      `est-new-${e.id}`,
            type:    'estimate',
            message: `New estimate created for ${cust}`,
            sub:     e.title || undefined,
            href:    `/estimates/${e.id}`,
            ts:      e.created_at,
          })
        }
      }
    })

    // Dedup → sort → top 20
    const seen = new Set<string>()
    const sorted = feed
      .filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true })
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .slice(0, 20)

    // Flash items that are brand-new (not in previous fetch)
    const newIds = sorted.map(i => i.id).filter(id => !prevIds.current.has(id))
    if (newIds.length > 0 && prevIds.current.size > 0) {
      setFlashIds(new Set(newIds))
      setLiveCount(c => c + newIds.length)
      setTimeout(() => setFlashIds(new Set()), 2500)
    }
    prevIds.current = new Set(sorted.map(i => i.id))

    setItems(sorted)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  useEffect(() => {
    load()
    const ch = supabase
      .channel('activity-feed-v2')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'job_comments',    filter: `org_id=eq.${orgId}` }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stage_approvals', filter: `org_id=eq.${orgId}` }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects',        filter: `org_id=eq.${orgId}` }, () => load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects',        filter: `org_id=eq.${orgId}` }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'estimates',       filter: `org_id=eq.${orgId}` }, () => load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'estimates',       filter: `org_id=eq.${orgId}` }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [orgId, load])

  const filtered = items.filter(item => {
    if (filter === 'all')      return true
    if (filter === 'messages') return item.type === 'comment'
    if (filter === 'signoffs') return item.type === 'signoff'
    if (filter === 'moves')    return item.type === 'stage_change' || item.type === 'new_project'
    return true
  })

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      borderRadius: 16,
      padding: '20px 24px',
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={14} style={{ color: 'var(--accent)' }} />
          <span style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 14, fontWeight: 800,
            color: 'var(--text1)',
            textTransform: 'uppercase', letterSpacing: '0.03em',
          }}>
            Team Activity
          </span>
          {/* Live pulse */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#22c07a',
              animation: 'act-pulse 2s infinite',
            }} />
            <span style={{ fontSize: 10, color: '#22c07a', fontWeight: 700, letterSpacing: '0.05em' }}>
              LIVE
            </span>
          </div>
        </div>

        {liveCount > 0 && (
          <button
            onClick={() => setLiveCount(0)}
            style={{
              fontSize: 10, color: 'var(--accent)',
              fontFamily: 'JetBrains Mono, monospace',
              padding: '2px 8px', borderRadius: 10,
              background: 'rgba(79,127,255,0.1)',
              border: 'none', cursor: 'pointer',
            }}
          >
            +{liveCount} new
          </button>
        )}
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '4px 11px', borderRadius: 20,
              background: filter === tab.key ? 'var(--accent)' : 'var(--surface2)',
              border: filter === tab.key ? 'none' : '1px solid var(--card-border)',
              color: filter === tab.key ? '#fff' : 'var(--text3)',
              fontSize: 11, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Feed ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text3)', fontSize: 13 }}>
          Loading activity...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text3)', fontSize: 13 }}>
          No activity yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 460, overflowY: 'auto' }}>
          {filtered.map(item => {
            const cfg     = TYPE_CFG[item.type]
            const isNew   = flashIds.has(item.id)
            const content = (
              <div
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 11,
                  padding: '10px 6px',
                  borderBottom: '1px solid var(--card-border)',
                  borderRadius: isNew ? 8 : 0,
                  background: isNew ? `${cfg.color}08` : 'transparent',
                  transition: 'background 0.6s ease',
                }}
              >
                {/* Avatar circle */}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: cfg.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800,
                  color: cfg.color,
                  border: isNew ? `1.5px solid ${cfg.color}50` : '1.5px solid transparent',
                  transition: 'border-color 0.6s',
                }}>
                  {item.actor
                    ? <span>{initials(item.actor)}</span>
                    : <EventIcon type={item.type} color={cfg.color} />
                  }
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12.5, color: 'var(--text1)',
                    lineHeight: 1.4, fontWeight: 500,
                  }}>
                    {item.message}
                  </div>
                  {item.sub && (
                    <div style={{
                      fontSize: 11, color: 'var(--text3)', marginTop: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item.sub}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
                    {relTime(item.ts)}
                  </div>
                </div>

                {/* Arrow for clickable items */}
                {item.href && (
                  <ArrowRight size={12} style={{ color: 'var(--text3)', flexShrink: 0, marginTop: 6 }} />
                )}
              </div>
            )

            return item.href ? (
              <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
                {content}
              </Link>
            ) : (
              <div key={item.id}>{content}</div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes act-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(34,192,122,0.5); }
          70%  { box-shadow: 0 0 0 7px rgba(34,192,122,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,192,122,0); }
        }
      `}</style>
    </div>
  )
}
