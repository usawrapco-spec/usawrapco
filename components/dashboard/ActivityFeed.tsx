'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, CheckCircle, Wrench, FileText, Plus, Activity } from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'comment' | 'signoff' | 'bid' | 'project_update' | 'new_project'
  message: string
  actor?: string
  projectRef?: string
  projectId?: string
  ts: string
}

interface ActivityFeedProps {
  orgId: string
}

export default function ActivityFeed({ orgId }: ActivityFeedProps) {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [comments, approvals, recentProjects] = await Promise.all([
        supabase
          .from('job_comments')
          .select('id, message, channel, created_at, project_id, profiles:user_id(full_name)')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('stage_approvals')
          .select('id, stage, created_at, project_id, signer_name, projects:project_id(title)')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('projects')
          .select('id, title, pipe_stage, created_at, updated_at')
          .eq('org_id', orgId)
          .order('updated_at', { ascending: false })
          .limit(6),
      ])

      const feed: ActivityItem[] = []

      // Comments
      if (comments.data) {
        comments.data.forEach((c: any) => {
          const name = c.profiles?.full_name || 'Someone'
          const chan = c.channel === 'client' ? 'client' : c.channel === 'installer' ? 'installer' : 'team'
          feed.push({
            id: `comment-${c.id}`,
            type: 'comment',
            message: `${name} sent a ${chan} message`,
            actor: name,
            projectId: c.project_id,
            ts: c.created_at,
          })
        })
      }

      // Stage approvals
      if (approvals.data) {
        approvals.data.forEach((a: any) => {
          const stage = STAGE_LABELS[a.stage] || a.stage
          const proj = (a.projects as any)?.title || 'a project'
          feed.push({
            id: `approval-${a.id}`,
            type: 'signoff',
            message: `${a.signer_name || 'Someone'} signed off ${stage} on ${proj}`,
            actor: a.signer_name,
            projectId: a.project_id,
            ts: a.created_at,
          })
        })
      }

      // Recent project updates (new projects only)
      if (recentProjects.data) {
        recentProjects.data.forEach((p: any) => {
          const isNew = Math.abs(new Date(p.created_at).getTime() - new Date(p.updated_at).getTime()) < 60000
          feed.push({
            id: `project-${p.id}`,
            type: isNew ? 'new_project' : 'project_update',
            message: isNew ? `New project created: ${p.title || 'Untitled'}` : `${p.title || 'Project'} moved to ${STAGE_LABELS[p.pipe_stage] || p.pipe_stage}`,
            projectId: p.id,
            ts: p.updated_at,
          })
        })
      }

      // Sort by time, deduplicate, take top 12
      const sorted = feed
        .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
        .slice(0, 12)

      setItems(sorted)
      setLoading(false)
    }

    load()

    // Realtime: refresh on any comment
    const channel = supabase
      .channel('activity-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'job_comments', filter: `org_id=eq.${orgId}` }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stage_approvals', filter: `org_id=eq.${orgId}` }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orgId])

  if (loading) return (
    <div className="card">
      <div className="section-label mb-3 flex items-center gap-2"><Activity size={13} /> Activity Feed</div>
      <div className="text-sm text-text3 text-center py-4">Loading activity...</div>
    </div>
  )

  if (items.length === 0) return (
    <div className="card">
      <div className="section-label mb-3 flex items-center gap-2"><Activity size={13} /> Activity Feed</div>
      <div className="text-sm text-text3 text-center py-4">No recent activity.</div>
    </div>
  )

  return (
    <div className="card">
      <div className="section-label mb-3 flex items-center gap-2"><Activity size={13} /> Activity Feed</div>
      <div className="flex flex-col gap-0 max-h-72 overflow-y-auto">
        {items.map((item, i) => (
          <div key={item.id} className="flex gap-3 py-2.5 border-b border-border/50 last:border-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${TYPE_STYLES[item.type].bg}`}>
              <ItemIcon type={item.type} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-text2 leading-snug">{item.message}</div>
              <div className="text-[10px] text-text3 mt-0.5">{formatRelative(item.ts)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const STAGE_LABELS: Record<string, string> = {
  sales_in: 'Sales Intake',
  production: 'Production',
  install: 'Install',
  prod_review: 'QC Review',
  sales_close: 'Sales Close',
}

const TYPE_STYLES: Record<string, { bg: string }> = {
  comment:        { bg: 'bg-purple/20' },
  signoff:        { bg: 'bg-green/20' },
  bid:            { bg: 'bg-cyan/20' },
  project_update: { bg: 'bg-accent/20' },
  new_project:    { bg: 'bg-amber/20' },
}

function ItemIcon({ type }: { type: string }) {
  const cls = 'w-3.5 h-3.5'
  switch (type) {
    case 'comment':        return <MessageSquare className={cls} style={{ color: 'var(--purple)' }} />
    case 'signoff':        return <CheckCircle className={cls} style={{ color: 'var(--green)' }} />
    case 'bid':            return <Wrench className={cls} style={{ color: 'var(--cyan)' }} />
    case 'new_project':    return <Plus className={cls} style={{ color: 'var(--amber)' }} />
    case 'project_update': return <FileText className={cls} style={{ color: 'var(--accent)' }} />
    default:               return <Activity className={cls} style={{ color: 'var(--text3)' }} />
  }
}

function formatRelative(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}d ago`
}
