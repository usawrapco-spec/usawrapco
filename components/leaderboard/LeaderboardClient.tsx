'use client'

import { useState, useMemo, useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Trophy, Zap, Flame, Crown,
  Medal, DollarSign, Wrench,
  Layers, Waves, Glasses, Shield, Anchor,
  Award, BarChart2, Paintbrush, Printer, Users,
  ChevronDown, ChevronUp, Lock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { xpToLevel, xpForNextLevel } from '@/lib/commission'

// ─── XP Action Labels ─────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  daily_login:                    'Daily login',
  deal_won:                       'Job closed',
  job_comment:                    'Job comment',
  photo_upload:                   'Photo uploaded',
  media_upload:                   'Media uploaded',
  customer_created:               'Customer created',
  estimate_sent:                  'Estimate sent',
  design_proof_uploaded:          'Design proof sent',
  invoice_fully_paid:             'Invoice paid in full',
  invoice_paid:                   'Invoice payment',
  clock_in:                       'Clock in',
  streak_bonus_5day:              '5-day streak bonus',
  create_lead:                    'Lead created',
  intake_submitted:               'Intake submitted',
  install_completed:              'Install completed',
  job_fully_completed:            'Job completed',
  design_approved_no_revisions:   'Design approved (1st pass)',
  design_approved_with_revisions: 'Design approved',
  installer_bid:                  'Installer bid',
  maintenance_logged:             'Maintenance logged',
  send_onboarding_link:           'Onboarding link sent',
  customer_signoff:               'Customer sign-off',
  print_job_completed:            'Print job completed',
  production_brief_completed:     'Production brief',
  log_expense:                    'Expense logged',
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Member {
  id: string
  name: string
  email: string
  role: string
  xp: number
  level: number
  current_streak: number
  longest_streak: number
  monthly_xp: number
  weekly_xp: number
  badges: string[]
  last_active_date: string
}

interface ProjectRow {
  id: string
  title: string
  revenue: number
  profit: number
  gpm?: number
  agent_id: string
  installer_id?: string | null
  pipe_stage: string
  updated_at: string
  created_at?: string
  service_division?: string
  fin_data?: Record<string, number> | null
}

interface ShopRecord {
  id: string
  record_type: string
  record_category: string
  division: string
  record_holder_name: string
  record_value: number
  record_label: string
  set_at: string
  previous_record_value: number
  previous_holder_name: string
}

interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  profiles?: { name: string }
  badges?: { name: string; icon: string; rarity: string }
}

interface BadgeDef {
  id: string
  name: string
  description: string | null
  icon: string | null
  category: string | null
  rarity: string
  xp_value: number
}

interface XPHistoryRow {
  amount: number
  reason: string
  created_at: string
  metadata?: Record<string, unknown> | null
}

interface Props {
  currentProfile: Profile
  members: Member[]
  projects: ProjectRow[]
  shopRecords?: ShopRecord[]
  recentBadges?: UserBadge[]
  allBadges?: BadgeDef[]
  myXPHistory?: XPHistoryRow[]
  xpBreakdown?: Record<string, Record<string, number>>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIVISIONS = [
  { id: 'all',     label: 'All Divisions', icon: Layers,   color: '#9299b5' },
  { id: 'wraps',   label: 'Wraps',         icon: Layers,   color: '#4f7fff' },
  { id: 'decking', label: 'Decking',       icon: Waves,    color: '#22d3ee' },
  { id: 'tinting', label: 'Tinting',       icon: Glasses,  color: '#22c07a' },
  { id: 'ppf',     label: 'PPF',           icon: Shield,   color: '#8b5cf6' },
  { id: 'marine',  label: 'Marine',        icon: Anchor,   color: '#f59e0b' },
]

const DEPT_TABS = [
  { id: 'sales',      label: 'Sales',      icon: DollarSign, color: '#22c07a' },
  { id: 'install',    label: 'Install',    icon: Wrench,     color: '#22d3ee' },
  { id: 'production', label: 'Production', icon: Printer,    color: '#f59e0b' },
  { id: 'design',     label: 'Design',     icon: Paintbrush, color: '#8b5cf6' },
  { id: 'xp',         label: 'XP Board',   icon: Zap,        color: '#4f7fff' },
]

const RECORD_TYPE_LABELS: Record<string, { label: string; Icon: LucideIcon }> = {
  highest_single_job_revenue: { label: 'Biggest Job',      Icon: DollarSign },
  highest_single_job_gpm:     { label: 'Best GPM',         Icon: BarChart2  },
  most_jobs_in_month:         { label: 'Most Jobs/Month',  Icon: Trophy     },
  most_revenue_in_month:      { label: 'Best Month',       Icon: Flame      },
  fastest_install:            { label: 'Fastest Install',  Icon: Zap        },
  biggest_fleet_deal:         { label: 'Biggest Fleet',    Icon: Award      },
  most_installs_in_week:      { label: 'Most Installs/Wk', Icon: Users      },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fM = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)
const fPct = (n: number) => `${(n || 0).toFixed(1)}%`

function getPeriodCutoff(period: string): Date | null {
  const now = new Date()
  if (period === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  if (period === 'month') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  if (period === 'quarter') return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  return null
}

function rankIcon(i: number) {
  if (i === 0) return <Crown size={18} style={{ color: '#f59e0b' }} />
  if (i === 1) return <Medal size={18} style={{ color: '#9299b5' }} />
  if (i === 2) return <Medal size={18} style={{ color: '#cd7f32' }} />
  return (
    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', width: 20, textAlign: 'center' }}>
      #{i + 1}
    </span>
  )
}

function Avatar({ name, email, size = 38, idx = 99 }: { name?: string; email?: string; size?: number; idx?: number }) {
  const initial = (name || email || '?').charAt(0).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: idx < 3 ? 'linear-gradient(135deg, var(--accent), #7c3aed)' : 'rgba(79,127,255,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800,
      color: idx < 3 ? '#fff' : 'var(--accent)',
    }}>
      {initial}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
      <Trophy size={32} style={{ opacity: 0.25, margin: '0 auto 10px', display: 'block' }} />
      <div style={{ fontSize: 13 }}>{label}</div>
    </div>
  )
}

function getRelativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Rarity color helper ──────────────────────────────────────────────────────

function rarityColor(rarity: string) {
  if (rarity === 'legendary') return '#f59e0b'
  if (rarity === 'rare')      return '#8b5cf6'
  return '#22c07a'
}

// ─── Badge Grid ───────────────────────────────────────────────────────────────

function BadgeGrid({ allBadges, earnedIds }: { allBadges: BadgeDef[]; earnedIds: string[] }) {
  const earned = new Set(earnedIds)
  if (!allBadges.length) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
      {allBadges.map(badge => {
        const isEarned = earned.has(badge.id)
        const rc = rarityColor(badge.rarity)
        return (
          <div
            key={badge.id}
            title={badge.description || badge.name}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: isEarned ? `${rc}14` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isEarned ? `${rc}44` : 'rgba(255,255,255,0.06)'}`,
              opacity: isEarned ? 1 : 0.45,
              transition: 'opacity 0.2s',
              cursor: 'default',
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>
              {badge.icon || <Lock size={16} />}
            </div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: isEarned ? rc : 'var(--text3)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {badge.name}
            </div>
            {!isEarned && (
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, lineHeight: 1.3 }}>
                <Lock size={9} style={{ display: 'inline', marginRight: 2 }} />
                {badge.description || 'Locked'}
              </div>
            )}
            {isEarned && (
              <div style={{ fontSize: 9, fontWeight: 700, color: rc, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>
                {badge.rarity}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── XP History ───────────────────────────────────────────────────────────────

function XPHistory({ rows }: { rows: XPHistoryRow[] }) {
  if (!rows.length) {
    return <div style={{ color: 'var(--text3)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No XP activity yet</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map((row, i) => {
        const label = ACTION_LABELS[row.reason] || row.reason.replace(/_/g, ' ')
        const d = new Date(row.created_at)
        const ago = (() => {
          const diff = Date.now() - d.getTime()
          const h = Math.floor(diff / 3600000)
          if (h < 1) return 'Just now'
          if (h < 24) return `${h}h ago`
          const days = Math.floor(h / 24)
          if (days < 7) return `${days}d ago`
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        })()
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 10px', borderRadius: 8,
            background: 'var(--surface2)',
          }}>
            <Zap size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 12, color: 'var(--text2)' }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>
              +{row.amount}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text3)', minWidth: 52, textAlign: 'right' }}>{ago}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── My Stats Panel ───────────────────────────────────────────────────────────

function MyStatsPanel({
  member,
  allBadges,
  myXPHistory,
}: {
  member: Member
  allBadges: BadgeDef[]
  myXPHistory: XPHistoryRow[]
}) {
  const [tab, setTab] = useState<'badges' | 'history'>('badges')
  const earnedIds: string[] = member.badges || []
  const earnedCount = earnedIds.filter(id => allBadges.some(b => b.id === id)).length
  const totalBadges = allBadges.length

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20, marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Award size={16} style={{ color: '#8b5cf6' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', flex: 1 }}>My Stats</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['badges', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: tab === t ? 'rgba(79,127,255,0.15)' : 'transparent',
              border: tab === t ? '1px solid var(--accent)' : '1px solid var(--border)',
              color: tab === t ? 'var(--accent)' : 'var(--text3)',
              textTransform: 'capitalize',
            }}>
              {t === 'badges' ? `Badges (${earnedCount}/${totalBadges})` : 'XP History'}
            </button>
          ))}
        </div>
      </div>
      {tab === 'badges'  && <BadgeGrid allBadges={allBadges} earnedIds={earnedIds} />}
      {tab === 'history' && <XPHistory rows={myXPHistory} />}
    </div>
  )
}

// ─── Sales Leaderboard ────────────────────────────────────────────────────────

function SalesLeaderboard({ members, projects, currentId }: {
  members: Member[]
  projects: ProjectRow[]
  currentId: string
}) {
  const byAgent = useMemo(() => {
    const map: Record<string, { totalGP: number; totalRev: number; jobs: number; gpms: number[] }> = {}
    projects.forEach(p => {
      if (!p.agent_id) return
      if (!map[p.agent_id]) map[p.agent_id] = { totalGP: 0, totalRev: 0, jobs: 0, gpms: [] }
      map[p.agent_id].totalGP += p.profit || 0
      map[p.agent_id].totalRev += p.revenue || 0
      map[p.agent_id].jobs++
      if (p.gpm) map[p.agent_id].gpms.push(p.gpm)
    })
    return map
  }, [projects])

  const ranked = useMemo(() =>
    members
      .map(m => ({ ...m, ...(byAgent[m.id] || { totalGP: 0, totalRev: 0, jobs: 0, gpms: [] }) }))
      .filter(m => m.totalGP > 0)
      .sort((a, b) => b.totalGP - a.totalGP),
    [members, byAgent]
  )

  const topGPMId = useMemo(() => {
    if (!ranked.length) return null
    return ranked.slice().sort((a, b) => {
      const avgA = a.gpms.length ? a.gpms.reduce((x: number, y: number) => x + y, 0) / a.gpms.length : 0
      const avgB = b.gpms.length ? b.gpms.reduce((x: number, y: number) => x + y, 0) / b.gpms.length : 0
      return avgB - avgA
    })[0]?.id
  }, [ranked])

  if (!ranked.length) return <EmptyState label="No sales data for this period" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ranked.map((m, i) => {
        const avgGPM = m.gpms.length ? m.gpms.reduce((a: number, b: number) => a + b, 0) / m.gpms.length : 0
        const isTopGPM = topGPMId === m.id && avgGPM > 0
        const valueColor = i === 0 ? '#f59e0b' : i === 1 ? '#9299b5' : i === 2 ? '#cd7f32' : 'var(--text1)'
        return (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
            background: m.id === currentId ? 'rgba(79,127,255,0.07)' : 'var(--surface2)',
            border: `1px solid ${m.id === currentId ? 'rgba(79,127,255,0.35)' : 'var(--border)'}`,
            borderRadius: 12,
          }}>
            <div style={{ width: 24, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>{rankIcon(i)}</div>
            <Avatar name={m.name} email={m.email} idx={i} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{m.name || m.email}</span>
                {m.id === currentId && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)' }}>YOU</span>}
                {isTopGPM && <span style={{ fontSize: 10, fontWeight: 700, color: '#22c07a', background: 'rgba(34,192,122,0.12)', padding: '1px 6px', borderRadius: 4 }}>BEST GPM</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                {m.jobs} job{m.jobs !== 1 ? 's' : ''} · {fPct(avgGPM)} avg GPM
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: valueColor }}>
                {fM(m.totalGP)} GP
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fM(m.totalRev)} rev</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Install Leaderboard ──────────────────────────────────────────────────────

function InstallLeaderboard({ members, projects, currentId }: {
  members: Member[]
  projects: ProjectRow[]
  currentId: string
}) {
  const byInstaller = useMemo(() => {
    const map: Record<string, { jobs: number; hrs: number }> = {}
    projects.forEach(p => {
      if (!p.installer_id) return
      if (!map[p.installer_id]) map[p.installer_id] = { jobs: 0, hrs: 0 }
      map[p.installer_id].jobs++
      const fin = p.fin_data || {}
      map[p.installer_id].hrs += (fin.laborHrs || fin.hours || 0)
    })
    return map
  }, [projects])

  const ranked = useMemo(() =>
    members
      .map(m => ({ ...m, ...(byInstaller[m.id] || { jobs: 0, hrs: 0 }) }))
      .filter(m => m.jobs > 0)
      .sort((a, b) => b.jobs - a.jobs),
    [members, byInstaller]
  )

  if (!ranked.length) return <EmptyState label="No install data for this period" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ranked.map((m, i) => {
        const valueColor = i === 0 ? '#f59e0b' : i === 1 ? '#9299b5' : i === 2 ? '#cd7f32' : 'var(--text1)'
        return (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
            background: m.id === currentId ? 'rgba(34,211,238,0.07)' : 'var(--surface2)',
            border: `1px solid ${m.id === currentId ? 'rgba(34,211,238,0.35)' : 'var(--border)'}`,
            borderRadius: 12,
          }}>
            <div style={{ width: 24, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>{rankIcon(i)}</div>
            <Avatar name={m.name} email={m.email} idx={i} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{m.name || m.email}</span>
                {m.id === currentId && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--cyan)' }}>YOU</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                {m.hrs > 0 ? `${Math.round(m.hrs)}h on record` : 'Install specialist'}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: valueColor }}>
                {m.jobs} jobs
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── XP Leaderboard ───────────────────────────────────────────────────────────

function XPBreakdownTooltip({ breakdown }: { breakdown: Record<string, number> }) {
  const sorted = Object.entries(breakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
  if (!sorted.length) return null
  return (
    <div style={{
      position: 'absolute', right: 0, top: '110%', zIndex: 50,
      background: '#1a1d27', border: '1px solid rgba(79,127,255,0.3)',
      borderRadius: 10, padding: '10px 14px', minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        XP Breakdown
      </div>
      {sorted.map(([action, amt]) => (
        <div key={action} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>{ACTION_LABELS[action] || action.replace(/_/g, ' ')}</span>
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>+{amt}</span>
        </div>
      ))}
    </div>
  )
}

function XPLeaderboard({ members, period, currentId, xpBreakdown = {} }: {
  members: Member[]
  period: string
  currentId: string
  xpBreakdown?: Record<string, Record<string, number>>
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const ranked = useMemo(() =>
    [...members].sort((a, b) => {
      const aVal = period === 'week' ? (a.weekly_xp || 0) : period === 'month' ? (a.monthly_xp || a.xp || 0) : (a.xp || 0)
      const bVal = period === 'week' ? (b.weekly_xp || 0) : period === 'month' ? (b.monthly_xp || b.xp || 0) : (b.xp || 0)
      return bVal - aVal
    }),
    [members, period]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ranked.map((m, i) => {
        const xpVal = period === 'week' ? (m.weekly_xp || 0) : period === 'month' ? (m.monthly_xp || m.xp || 0) : (m.xp || 0)
        const lvl = xpToLevel(m.xp || 0)
        const valueColor = i === 0 ? '#f59e0b' : i === 1 ? '#9299b5' : i === 2 ? '#cd7f32' : 'var(--accent)'
        const userBreakdown = xpBreakdown[m.id] || {}
        const hasBreakdown = Object.keys(userBreakdown).length > 0
        return (
          <div
            key={m.id}
            onMouseEnter={() => hasBreakdown && setHoveredId(m.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              position: 'relative',
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
              background: m.id === currentId ? 'rgba(79,127,255,0.07)' : 'var(--surface2)',
              border: `1px solid ${m.id === currentId ? 'rgba(79,127,255,0.35)' : 'var(--border)'}`,
              borderRadius: 12, cursor: hasBreakdown ? 'pointer' : 'default',
            }}
          >
            <div style={{ width: 24, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>{rankIcon(i)}</div>
            <Avatar name={m.name} email={m.email} idx={i} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{m.name || m.email}</span>
                {m.id === currentId && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)' }}>YOU</span>}
                {(m.current_streak || 0) > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, color: '#f59e0b' }}>
                    {m.current_streak}<Flame size={10} style={{ color: '#f59e0b' }} />
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                Level {lvl} · {(m.badges || []).length} badge{(m.badges || []).length !== 1 ? 's' : ''}
                {hasBreakdown && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>hover for breakdown</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: valueColor }}>
                {xpVal.toLocaleString()} XP
              </div>
            </div>
            {hoveredId === m.id && hasBreakdown && (
              <XPBreakdownTooltip breakdown={userBreakdown} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Shop Records ─────────────────────────────────────────────────────────────

const PLACEHOLDER_RECORDS: { Icon: LucideIcon; label: string }[] = [
  { Icon: DollarSign, label: 'Biggest Job' },
  { Icon: BarChart2,  label: 'Best GPM' },
  { Icon: Zap,        label: 'Fastest Install' },
  { Icon: Award,      label: 'Biggest Fleet' },
  { Icon: Trophy,     label: 'Most Jobs/Mo' },
]

function ShopRecordsPanel({ records }: { records: ShopRecord[] }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Trophy size={16} style={{ color: '#f59e0b' }} /> Shop Records
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {records.length === 0
          ? PLACEHOLDER_RECORDS.map(r => (
              <div key={r.label} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <r.Icon size={18} style={{ color: '#f59e0b', flexShrink: 0, width: 28 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)' }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>No record yet</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text3)' }}>—</div>
              </div>
            ))
          : records.map(r => {
              const meta = RECORD_TYPE_LABELS[r.record_type] || { label: r.record_type, Icon: Award }
              const RecordIcon = meta.Icon
              return (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <RecordIcon size={18} style={{ color: '#f59e0b', flexShrink: 0, width: 28 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)' }}>{meta.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {r.record_holder_name} · {new Date(r.set_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                    {r.previous_record_value > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                        Prev: {r.previous_holder_name}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: '#f59e0b', flexShrink: 0 }}>
                    {r.record_label || fM(r.record_value)}
                  </div>
                </div>
              )
            })
        }
      </div>
    </div>
  )
}

// ─── Division Breakdown ───────────────────────────────────────────────────────

function DivisionBreakdown({ projects }: { projects: ProjectRow[] }) {
  const divData = useMemo(() => {
    const map: Record<string, { rev: number; gpms: number[]; jobs: number; profit: number }> = {}
    projects.forEach(p => {
      const div = p.service_division || 'wraps'
      if (!map[div]) map[div] = { rev: 0, gpms: [], jobs: 0, profit: 0 }
      map[div].rev += p.revenue || 0
      map[div].profit += p.profit || 0
      map[div].jobs++
      if (p.gpm) map[div].gpms.push(p.gpm)
    })
    return map
  }, [projects])

  const totalRev = Object.values(divData).reduce((s, d) => s + d.rev, 0)
  const divList = DIVISIONS.filter(d => d.id !== 'all')
    .map(d => ({
      ...d,
      rev: divData[d.id]?.rev || 0,
      gpm: divData[d.id]?.gpms.length
        ? divData[d.id].gpms.reduce((a, b) => a + b, 0) / divData[d.id].gpms.length
        : 0,
      jobs: divData[d.id]?.jobs || 0,
    }))
    .filter(d => d.jobs > 0)
    .sort((a, b) => b.rev - a.rev)

  if (!divList.length) return null

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20, marginTop: 20,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <BarChart2 size={16} style={{ color: 'var(--accent)' }} /> Division Breakdown
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {divList.map(d => {
          const Icon = d.icon
          const pct = totalRev > 0 ? (d.rev / totalRev) * 100 : 0
          return (
            <div key={d.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <Icon size={13} style={{ color: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.04em', flex: 1 }}>
                  {d.label}
                </span>
                <span style={{ fontSize: 13, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: d.color }}>
                  {fM(d.rev)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 80, textAlign: 'right' }}>
                  {fPct(d.gpm)} GPM · {d.jobs}j
                </span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: d.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Recent Achievements ──────────────────────────────────────────────────────

function RecentAchievements({ badges }: { badges: UserBadge[] }) {
  if (!badges.length) return null
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20, marginTop: 20,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Award size={16} style={{ color: '#8b5cf6' }} /> Recent Achievements
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {badges.slice(0, 10).map(ub => {
          const ago = getRelativeTime(ub.earned_at)
          const badgeIcon = ub.badges?.icon || '🏅'
          const badgeName = ub.badges?.name || ub.badge_id
          const personName = (ub as any).profiles?.name || 'Someone'
          const rarity = ub.badges?.rarity || 'common'
          const rarityColor = rarity === 'legendary' ? '#f59e0b' : rarity === 'rare' ? '#8b5cf6' : '#22c07a'
          return (
            <div key={ub.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 12px', borderRadius: 10,
              background: rarity === 'legendary' ? 'rgba(245,158,11,0.06)' : 'var(--surface2)',
              border: `1px solid ${rarity === 'legendary' ? 'rgba(245,158,11,0.2)' : 'var(--border)'}`,
            }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{badgeIcon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
                  <span style={{ fontWeight: 700 }}>{personName}</span> earned &ldquo;{badgeName}&rdquo;
                  {rarity === 'legendary' && (
                    <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: rarityColor, background: `${rarityColor}22`, padding: '1px 6px', borderRadius: 4 }}>
                      LEGENDARY
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{ago}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LeaderboardClient({
  currentProfile, members, projects, shopRecords = [], recentBadges = [],
  allBadges = [], myXPHistory = [], xpBreakdown = {},
}: Props) {
  const [dept, setDept] = useState('sales')
  const [period, setPeriod] = useState('month')
  const [division, setDivision] = useState('all')
  const [showMyStats, setShowMyStats] = useState(false)
  const [liveBadges, setLiveBadges] = useState<UserBadge[]>(recentBadges)
  const supabase = createClient()

  useEffect(() => {
    const ch = supabase.channel('badges-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_badges' }, async (payload) => {
        const { data } = await supabase
          .from('user_badges')
          .select('*, profiles:user_id(name), badges:badge_id(name, icon, rarity)')
          .eq('id', (payload.new as any).id)
          .single()
        if (data) setLiveBadges(prev => [data as UserBadge, ...prev].slice(0, 20))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const filteredProjects = useMemo(() => {
    const cutoff = getPeriodCutoff(period)
    return projects.filter(p => {
      if (cutoff && new Date(p.updated_at) < cutoff) return false
      if (division !== 'all' && (p.service_division || 'wraps') !== division) return false
      return true
    })
  }, [projects, period, division])

  const myMember = members.find(m => m.id === currentProfile.id)
  const myXP = myMember?.xp || 0
  const myLevel = xpToLevel(myXP)
  const { progress } = xpForNextLevel(myXP)
  const myXPRank = [...members].sort((a, b) => (b.xp || 0) - (a.xp || 0)).findIndex(m => m.id === currentProfile.id) + 1

  const PERIOD_LABELS: Record<string, string> = {
    week: 'This Week', month: 'This Month', quarter: 'This Quarter', alltime: 'All Time',
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 32, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
          color: 'var(--text1)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Trophy size={28} style={{ color: '#f59e0b' }} /> Shop Leaderboard
        </h1>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {['week', 'month', 'quarter', 'alltime'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              border: period === p ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: period === p ? 'rgba(79,127,255,0.14)' : 'transparent',
              color: period === p ? 'var(--accent)' : 'var(--text3)',
              cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
          <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
          {DIVISIONS.map(d => {
            const Icon = d.icon
            return (
              <button key={d.id} onClick={() => setDivision(d.id)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                border: division === d.id ? `1px solid ${d.color}` : '1px solid var(--border)',
                background: division === d.id ? `${d.color}22` : 'transparent',
                color: division === d.id ? d.color : 'var(--text3)',
                cursor: 'pointer',
              }}>
                <Icon size={11} />
                {d.id === 'all' ? 'All' : d.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* My profile bar */}
      {myMember && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(79,127,255,0.1) 0%, rgba(139,92,246,0.1) 100%)',
          border: '1px solid rgba(79,127,255,0.25)',
          borderRadius: 14, padding: '16px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <Avatar name={myMember.name} email={myMember.email} size={44} idx={0} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
              {myMember.name} <span style={{ color: 'var(--accent)', fontSize: 12 }}>· You</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Rank #{myXPRank} · Level {myLevel}</div>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>
              <span>Level {myLevel}</span>
              <span>{myXP.toLocaleString()} XP</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--accent), #7c3aed)', borderRadius: 3, transition: 'width 0.5s' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>
                {(myMember.monthly_xp || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>Monthly XP</div>
            </div>
            {(myMember.current_streak || 0) > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 18, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: '#f59e0b' }}>
                  {myMember.current_streak}<Flame size={14} style={{ color: '#f59e0b' }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>Day Streak</div>
              </div>
            )}
            <button onClick={() => setShowMyStats(s => !s)} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: showMyStats ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)',
              border: showMyStats ? '1px solid #8b5cf6' : '1px solid var(--border)',
              color: showMyStats ? '#8b5cf6' : 'var(--text3)',
            }}>
              My Stats
              {showMyStats ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>
      )}

      {/* My Stats panel */}
      {showMyStats && myMember && (
        <MyStatsPanel
          member={myMember}
          allBadges={allBadges}
          myXPHistory={myXPHistory}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* Left: Department tabs */}
        <div>
          <div style={{ display: 'flex', gap: 0, marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
            {DEPT_TABS.map(tab => {
              const Icon = tab.icon
              const active = dept === tab.id
              return (
                <button key={tab.id} onClick={() => setDept(tab.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 16px', cursor: 'pointer',
                  borderRadius: '8px 8px 0 0',
                  background: active ? 'var(--surface)' : 'transparent',
                  border: active ? '1px solid var(--border)' : '1px solid transparent',
                  borderBottom: active ? '1px solid var(--surface)' : '1px solid transparent',
                  marginBottom: active ? '-1px' : 0,
                  color: active ? tab.color : 'var(--text3)',
                  fontSize: 13, fontWeight: active ? 700 : 400,
                }}>
                  <Icon size={14} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '0 12px 12px 12px', padding: 16,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              {PERIOD_LABELS[period]} · {division !== 'all' ? division.toUpperCase() : 'All Divisions'} · {filteredProjects.length} jobs
            </div>

            {dept === 'sales'      && <SalesLeaderboard   members={members} projects={filteredProjects} currentId={currentProfile.id} />}
            {dept === 'install'    && <InstallLeaderboard  members={members} projects={filteredProjects} currentId={currentProfile.id} />}
            {dept === 'production' && <EmptyState label="Production metrics — coming soon (printer throughput, reprint rate, on-time rate)" />}
            {dept === 'design'     && <EmptyState label="Design metrics — coming soon (proof approval rate, avg revisions, customer satisfaction)" />}
            {dept === 'xp'         && <XPLeaderboard members={members} period={period} currentId={currentProfile.id} xpBreakdown={xpBreakdown} />}
          </div>

          <DivisionBreakdown projects={projects} />
          <RecentAchievements badges={liveBadges} />
        </div>

        {/* Right: Shop Records + Team summary */}
        <div style={{ position: 'sticky', top: 16 }}>
          <ShopRecordsPanel records={shopRecords} />

          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 20, marginTop: 16,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={16} style={{ color: 'var(--accent)' }} /> Team Overview
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Members', value: members.length, color: 'var(--accent)' },
                { label: 'Jobs (period)', value: filteredProjects.length, color: 'var(--cyan)' },
                {
                  label: 'Revenue',
                  value: fM(filteredProjects.reduce((s, p) => s + (p.revenue || 0), 0)),
                  color: '#22c07a',
                },
                {
                  label: 'Avg GPM',
                  value: (() => {
                    const gpms = filteredProjects.filter(p => p.gpm).map(p => p.gpm!)
                    return gpms.length ? fPct(gpms.reduce((a, b) => a + b, 0) / gpms.length) : '—'
                  })(),
                  color: '#f59e0b',
                },
              ].map(stat => (
                <div key={stat.label} style={{
                  background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: stat.color }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
