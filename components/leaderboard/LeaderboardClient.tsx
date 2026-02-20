'use client'

import { useState } from 'react'
import {
  Trophy, Zap, TrendingUp, Star, Flame, Crown,
  Medal, DollarSign, Target, Palette, Wand2, FileText,
  Sunrise, Activity,
} from 'lucide-react'
import type { Profile } from '@/types'
import { xpToLevel, xpForNextLevel } from '@/lib/commission'
import { ROLE_COLORS } from '@/lib/permissions'

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

interface Project {
  id: string
  title: string
  revenue: number
  profit: number
  agent_id: string
  pipe_stage: string
  updated_at: string
}

interface Props {
  currentProfile: Profile
  members: Member[]
  projects: Project[]
}

type Board = 'xp' | 'revenue' | 'streak'

interface BadgeInfo {
  icon: React.ReactNode
  label: string
}

function BadgeIcon({ badge }: { badge: string }) {
  const size = 14
  const map: Record<string, BadgeInfo> = {
    hot_streak:      { icon: <Flame size={size} style={{ color: '#f59e0b' }} />,   label: 'Hot Streak' },
    closer:          { icon: <DollarSign size={size} style={{ color: '#22c07a' }} />, label: 'Closer' },
    sharpshooter:    { icon: <Target size={size} style={{ color: '#4f7fff' }} />,   label: 'Sharpshooter' },
    pixel_perfect:   { icon: <Palette size={size} style={{ color: '#22d3ee' }} />,  label: 'Pixel Perfect' },
    speed_demon:     { icon: <Zap size={size} style={{ color: '#f59e0b' }} />,      label: 'Speed Demon' },
    top_dog:         { icon: <Crown size={size} style={{ color: '#f59e0b' }} />,    label: 'Top Dog' },
    material_wizard: { icon: <Wand2 size={size} style={{ color: '#8b5cf6' }} />,   label: 'Material Wizard' },
    perfect_brief:   { icon: <FileText size={size} style={{ color: '#4f7fff' }} />, label: 'Perfect Brief' },
    early_bird:      { icon: <Sunrise size={size} style={{ color: '#22d3ee' }} />,  label: 'Early Bird' },
    marathon:        { icon: <Activity size={size} style={{ color: '#22c07a' }} />, label: 'Marathon' },
  }
  const info = map[badge]
  if (!info) return null
  return (
    <span
      title={info.label}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 24, height: 24, borderRadius: 6,
        background: 'var(--surface2)', border: '1px solid var(--border)',
      }}
    >
      {info.icon}
    </span>
  )
}

const fM = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

export default function LeaderboardClient({ currentProfile, members, projects }: Props) {
  const [board, setBoard] = useState<Board>('xp')

  // Build revenue board from projects
  const revenueByAgent: Record<string, number> = {}
  projects.forEach(p => {
    if (p.agent_id && (p.pipe_stage === 'done' || p.pipe_stage === 'sales_close')) {
      revenueByAgent[p.agent_id] = (revenueByAgent[p.agent_id] || 0) + (p.revenue || 0)
    }
  })

  const xpBoard      = [...members].sort((a, b) => (b.monthly_xp || b.xp || 0) - (a.monthly_xp || a.xp || 0))
  const revenueBoard = [...members].sort((a, b) => (revenueByAgent[b.id] || 0) - (revenueByAgent[a.id] || 0))
  const streakBoard  = [...members].sort((a, b) => (b.current_streak || 0) - (a.current_streak || 0))

  const boardData = board === 'xp' ? xpBoard : board === 'revenue' ? revenueBoard : streakBoard

  const getValue = (m: Member) => {
    if (board === 'xp') return `${(m.monthly_xp || m.xp || 0).toLocaleString()} XP`
    if (board === 'revenue') return fM(revenueByAgent[m.id] || 0)
    return `${m.current_streak || 0} days`
  }

  const rankIcon = (i: number) => {
    if (i === 0) return <Crown size={18} style={{ color: '#f59e0b' }} />
    if (i === 1) return <Medal size={18} style={{ color: '#9299b5' }} />
    if (i === 2) return <Medal size={18} style={{ color: '#cd7f32' }} />
    return <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', width: 20, textAlign: 'center' }}>#{i + 1}</span>
  }

  const isMe      = (m: Member) => m.id === currentProfile.id
  const myMember  = members.find(m => m.id === currentProfile.id)
  const myRank    = xpBoard.findIndex(m => m.id === currentProfile.id) + 1
  const myXP      = myMember?.xp || 0
  const myLevel   = xpToLevel(myXP)
  const { progress } = xpForNextLevel(myXP)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', marginBottom: 4 }}>
          Leaderboard
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>Monthly competition · {members.length} team members</p>
      </div>

      {/* My stats */}
      {myMember && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(79,127,255,0.12) 0%, rgba(139,92,246,0.12) 100%)',
          border: '1px solid rgba(79,127,255,0.3)',
          borderRadius: 14, padding: '18px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 900, color: '#fff',
            }}>
              {(myMember.name || myMember.email || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                {myMember.name || myMember.email} <span style={{ color: 'var(--accent)' }}>· You</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Rank #{myRank} · Level {myLevel}</div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 5 }}>
              <span>Level {myLevel}</span>
              <span>{myXP.toLocaleString()} XP</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--accent), #7c3aed)', borderRadius: 4, transition: 'width 0.5s' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>{(myMember.monthly_xp || 0).toLocaleString()}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>Monthly XP</div>
            </div>
            {myMember.current_streak > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 20, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: '#f59e0b' }}>
                  {myMember.current_streak} <Flame size={16} style={{ color: '#f59e0b' }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>Day Streak</div>
              </div>
            )}
          </div>

          {/* Badges */}
          {(myMember.badges || []).length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(myMember.badges || []).map((b: string) => (
                <BadgeIcon key={b} badge={b} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Board selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([
          { key: 'xp' as Board, label: 'XP This Month', icon: Zap },
          { key: 'revenue' as Board, label: 'Revenue Closed', icon: TrendingUp },
          { key: 'streak' as Board, label: 'Login Streaks', icon: Flame },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setBoard(key)}
            style={{
              padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
              background: board === key ? 'var(--accent)' : 'var(--surface)',
              border: board === key ? 'none' : '1px solid var(--border)',
              color: board === key ? '#fff' : 'var(--text3)',
              fontSize: 12, fontWeight: board === key ? 700 : 400,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Leaderboard rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {boardData.map((m, i) => {
          const val       = getValue(m)
          const roleColor = ROLE_COLORS[m.role] || '#5a6080'
          const initial   = (m.name || m.email || '?').charAt(0).toUpperCase()
          const me        = isMe(m)

          return (
            <div
              key={m.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px',
                background: me ? 'rgba(79,127,255,0.06)' : 'var(--surface)',
                border: `1px solid ${me ? 'rgba(79,127,255,0.3)' : 'var(--border)'}`,
                borderRadius: 12,
              }}
            >
              {/* Rank */}
              <div style={{ width: 24, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                {rankIcon(i)}
              </div>

              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: i < 3 ? 'linear-gradient(135deg, var(--accent), #7c3aed)' : 'rgba(79,127,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 800,
                color: i < 3 ? '#fff' : 'var(--accent)',
                flexShrink: 0,
              }}>
                {initial}
              </div>

              {/* Name + role */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.name || m.email}
                  </span>
                  {me && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)' }}>YOU</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: roleColor, textTransform: 'capitalize' }}>
                    {m.role.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    · Lv.{xpToLevel(m.xp || 0)}
                  </span>
                  {m.current_streak > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, color: '#f59e0b' }}>
                      · {m.current_streak}<Flame size={10} style={{ color: '#f59e0b' }} />
                    </span>
                  )}
                </div>
              </div>

              {/* Badges (top 3) */}
              <div style={{ display: 'flex', gap: 4 }}>
                {(m.badges || []).slice(0, 3).map((b: string) => (
                  <BadgeIcon key={b} badge={b} />
                ))}
              </div>

              {/* Value */}
              <div style={{
                fontSize: 16, fontWeight: 900,
                fontFamily: 'JetBrains Mono, monospace',
                color: i === 0 ? '#f59e0b' : i === 1 ? '#9299b5' : i === 2 ? '#cd7f32' : 'var(--text1)',
                flexShrink: 0,
              }}>
                {val}
              </div>
            </div>
          )
        })}
      </div>

      {members.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
          <Trophy size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
          <div style={{ fontSize: 13 }}>No team members yet. Invite your team to get started.</div>
        </div>
      )}
    </div>
  )
}
