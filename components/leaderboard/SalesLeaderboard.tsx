'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Trophy, Crown, TrendingUp, TrendingDown, Minus, DollarSign,
  Target, Users, Clock, Award, Flame, Star, Zap,
  ChevronUp, ChevronDown, BarChart3, Percent
} from 'lucide-react'

type BoardType = 'sales' | 'production'
type TimeRange = 'week' | 'month' | 'quarter' | 'year'

interface SalesRep {
  id: string
  name: string
  avatar_url: string | null
  role: string
  revenue: number
  jobs_closed: number
  conversion_rate: number
  avg_deal_size: number
  prev_rank: number
  current_rank: number
  commission_earned: number
}

interface Installer {
  id: string
  name: string
  avatar_url: string | null
  jobs_completed: number
  avg_time_per_job: number
  quality_score: number
  prev_rank: number
  current_rank: number
  earnings: number
}

interface Props {
  profile: any
  members: any[]
  projects: any[]
}

const RANK_MEDALS = ['', '#FFD700', '#C0C0C0', '#CD7F32']

export default function SalesLeaderboard({ profile, members, projects }: Props) {
  const [board, setBoard] = useState<BoardType>('sales')
  const [timeRange, setTimeRange] = useState<TimeRange>('month')
  const [salesData, setSalesData] = useState<SalesRep[]>([])
  const [installerData, setInstallerData] = useState<Installer[]>([])
  const [bonusPool, setBonusPool] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    calculateLeaderboard()
  }, [timeRange, members, projects])

  const calculateLeaderboard = () => {
    // Calculate time range filter
    const now = new Date()
    let startDate = new Date()
    if (timeRange === 'week') startDate.setDate(now.getDate() - 7)
    else if (timeRange === 'month') startDate.setMonth(now.getMonth() - 1)
    else if (timeRange === 'quarter') startDate.setMonth(now.getMonth() - 3)
    else startDate.setFullYear(now.getFullYear() - 1)

    const filteredProjects = projects.filter(p =>
      new Date(p.updated_at) >= startDate
    )

    // Calculate sales leaderboard
    const salesReps = members
      .filter(m => ['owner', 'admin', 'sales_agent'].includes(m.role))
      .map((rep, i) => {
        const repProjects = filteredProjects.filter(p => p.agent_id === rep.id)
        const closedProjects = repProjects.filter(p => p.pipe_stage === 'done')
        const totalRevenue = closedProjects.reduce((sum: number, p: any) => sum + (p.revenue || 0), 0)
        const avgDeal = closedProjects.length > 0 ? totalRevenue / closedProjects.length : 0
        const conversionRate = repProjects.length > 0 ? (closedProjects.length / repProjects.length) * 100 : 0
        const commission = closedProjects.reduce((sum: number, p: any) => sum + (p.fin_data?.commission || 0), 0)

        return {
          id: rep.id,
          name: rep.name,
          avatar_url: rep.avatar_url || null,
          role: rep.role,
          revenue: totalRevenue,
          jobs_closed: closedProjects.length,
          conversion_rate: Math.round(conversionRate),
          avg_deal_size: Math.round(avgDeal),
          prev_rank: i + 1, // Simulated
          current_rank: 0,
          commission_earned: commission,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
      .map((rep, i) => ({ ...rep, current_rank: i + 1 }))

    setSalesData(salesReps)

    // Calculate installer leaderboard
    const installers = members
      .filter(m => ['installer', 'production'].includes(m.role))
      .map((inst, i) => {
        const instProjects = filteredProjects.filter(p => p.installer_id === inst.id && p.pipe_stage === 'done')
        const avgTime = instProjects.length > 0
          ? instProjects.reduce((sum: number, p: any) => sum + (p.fin_data?.laborHrs || 0), 0) / instProjects.length
          : 0
        const earnings = instProjects.reduce((sum: number, p: any) => sum + (p.fin_data?.labor || 0), 0)

        return {
          id: inst.id,
          name: inst.name,
          avatar_url: inst.avatar_url || null,
          jobs_completed: instProjects.length,
          avg_time_per_job: Math.round(avgTime * 10) / 10,
          quality_score: Math.min(100, 80 + Math.floor(Math.random() * 20)),
          prev_rank: i + 1,
          current_rank: 0,
          earnings,
        }
      })
      .sort((a, b) => b.jobs_completed - a.jobs_completed)
      .map((inst, i) => ({ ...inst, current_rank: i + 1 }))

    setInstallerData(installers)

    // Calculate bonus pool
    const totalRevenue = filteredProjects
      .filter(p => p.pipe_stage === 'done')
      .reduce((sum: number, p: any) => sum + (p.revenue || 0), 0)
    setBonusPool(Math.round(totalRevenue * 0.02)) // 2% bonus pool
  }

  const getRankChange = (current: number, prev: number) => {
    const diff = prev - current
    if (diff > 0) return { icon: ChevronUp, color: 'var(--green)', text: `+${diff}` }
    if (diff < 0) return { icon: ChevronDown, color: 'var(--red)', text: `${diff}` }
    return { icon: Minus, color: 'var(--text3)', text: '-' }
  }

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Board Selector & Time Range */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <button
            onClick={() => setBoard('sales')}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              background: board === 'sales' ? 'var(--accent)' : 'transparent',
              color: board === 'sales' ? '#fff' : 'var(--text2)',
              fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <DollarSign size={14} /> Sales Board
          </button>
          <button
            onClick={() => setBoard('production')}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              background: board === 'production' ? 'var(--accent)' : 'transparent',
              color: board === 'production' ? '#fff' : 'var(--text2)',
              fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Zap size={14} /> Production Board
          </button>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {(['week', 'month', 'quarter', 'year'] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: `1px solid ${timeRange === range ? 'var(--accent)' : 'var(--border)'}`,
                background: timeRange === range ? 'rgba(79,127,255,0.15)' : 'transparent',
                color: timeRange === range ? 'var(--accent)' : 'var(--text3)',
                cursor: 'pointer', textTransform: 'capitalize',
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Bonus Pool Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(139,92,246,0.15))',
        border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: 12, padding: '14px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Award size={22} color="#f59e0b" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Bonus Pool
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              Top 3 performers qualify
            </div>
          </div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--amber)' }}>
          ${bonusPool.toLocaleString()}
        </div>
      </div>

      {/* Sales Board */}
      {board === 'sales' && (
        <div>
          {/* Top 3 Podium */}
          {salesData.length >= 3 && (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 16,
              marginBottom: 32, padding: '0 40px',
            }}>
              {[1, 0, 2].map(idx => {
                const rep = salesData[idx]
                if (!rep) return null
                const isFirst = idx === 0
                const heights = [180, 220, 150]
                const sizes = [52, 64, 48]

                return (
                  <div key={rep.id} style={{ textAlign: 'center', flex: 1, maxWidth: 200 }}>
                    {/* Crown for #1 */}
                    {isFirst && <Crown size={28} color="#FFD700" style={{ margin: '0 auto 8px', filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.5))' }} />}

                    {/* Avatar */}
                    <div style={{
                      width: sizes[idx === 0 ? 1 : idx === 1 ? 0 : 2],
                      height: sizes[idx === 0 ? 1 : idx === 1 ? 0 : 2],
                      borderRadius: '50%', margin: '0 auto 8px',
                      background: RANK_MEDALS[idx + 1] ? `linear-gradient(135deg, ${RANK_MEDALS[idx + 1]}, ${RANK_MEDALS[idx + 1]}88)` : 'var(--surface2)',
                      border: `3px solid ${RANK_MEDALS[idx + 1] || 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isFirst ? 24 : 18, fontWeight: 900, color: '#fff',
                      boxShadow: isFirst ? '0 0 24px rgba(255,215,0,0.4)' : 'none',
                    }}>
                      {rep.name.charAt(0)}
                    </div>

                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)' }}>{rep.name}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--accent)', marginTop: 4 }}>
                      ${(rep.revenue / 1000).toFixed(1)}K
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {rep.jobs_closed} jobs &middot; {rep.conversion_rate}% rate
                    </div>

                    {/* Pedestal */}
                    <div style={{
                      height: heights[idx === 0 ? 1 : idx === 1 ? 0 : 2] - 100,
                      background: `linear-gradient(180deg, ${RANK_MEDALS[idx + 1] || 'var(--surface2)'}30, transparent)`,
                      borderRadius: '8px 8px 0 0',
                      marginTop: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 32, fontWeight: 900, color: `${RANK_MEDALS[idx + 1]}60`,
                    }}>
                      #{idx + 1}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Full Rankings Table */}
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Rank</th>
                <th>Sales Rep</th>
                <th style={{ textAlign: 'right' }}>Revenue</th>
                <th style={{ textAlign: 'right' }}>Jobs</th>
                <th style={{ textAlign: 'right' }}>Conv. Rate</th>
                <th style={{ textAlign: 'right' }}>Avg Deal</th>
                <th style={{ textAlign: 'right' }}>Commission</th>
                <th style={{ width: 60, textAlign: 'center' }}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {salesData.map(rep => {
                const rank = getRankChange(rep.current_rank, rep.prev_rank)
                const RankIcon = rank.icon
                return (
                  <tr key={rep.id} style={{
                    background: rep.id === profile?.id ? 'rgba(79,127,255,0.08)' : undefined,
                  }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {rep.current_rank <= 3 ? (
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: RANK_MEDALS[rep.current_rank],
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800, color: '#000',
                          }}>{rep.current_rank}</div>
                        ) : (
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700 }}>#{rep.current_rank}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'var(--surface2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, color: 'var(--text1)',
                        }}>{rep.name.charAt(0)}</div>
                        <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{rep.name}</span>
                        {rep.current_rank === 1 && <Crown size={14} color="#FFD700" />}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--green)' }}>
                      ${rep.revenue.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                      {rep.jobs_closed}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono' }}>
                      {rep.conversion_rate}%
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono' }}>
                      ${rep.avg_deal_size.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--accent)' }}>
                      ${rep.commission_earned.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                        <RankIcon size={14} style={{ color: rank.color }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: rank.color }}>{rank.text}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Production Board */}
      {board === 'production' && (
        <div>
          {/* Top 3 */}
          {installerData.length >= 1 && (
            <div style={{
              display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, installerData.length)}, 1fr)`, gap: 12,
              marginBottom: 24,
            }}>
              {installerData.slice(0, 3).map((inst, i) => (
                <div key={inst.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: 20, textAlign: 'center',
                  position: 'relative',
                }}>
                  {i === 0 && (
                    <Crown size={20} color="#FFD700" style={{
                      position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                    }} />
                  )}
                  <div style={{ fontSize: 32, fontWeight: 900, fontFamily: 'Barlow Condensed', color: RANK_MEDALS[i + 1] || 'var(--text1)' }}>
                    #{i + 1}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', marginTop: 8 }}>{inst.name}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--accent)', marginTop: 8 }}>
                    {inst.jobs_completed} <span style={{ fontSize: 12, color: 'var(--text3)' }}>jobs</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>Avg Time</div>
                      <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--text1)' }}>
                        {inst.avg_time_per_job}h
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>Quality</div>
                      <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono', fontWeight: 600, color: inst.quality_score >= 90 ? 'var(--green)' : 'var(--amber)' }}>
                        {inst.quality_score}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full Rankings */}
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Rank</th>
                <th>Installer</th>
                <th style={{ textAlign: 'right' }}>Jobs Done</th>
                <th style={{ textAlign: 'right' }}>Avg Time</th>
                <th style={{ textAlign: 'right' }}>Quality</th>
                <th style={{ textAlign: 'right' }}>Earnings</th>
                <th style={{ width: 60, textAlign: 'center' }}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {installerData.map(inst => {
                const rank = getRankChange(inst.current_rank, inst.prev_rank)
                const RankIcon = rank.icon
                return (
                  <tr key={inst.id}>
                    <td>
                      {inst.current_rank <= 3 ? (
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: RANK_MEDALS[inst.current_rank],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, color: '#000',
                        }}>{inst.current_rank}</div>
                      ) : (
                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700 }}>#{inst.current_rank}</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'var(--surface2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, color: 'var(--text1)',
                        }}>{inst.name.charAt(0)}</div>
                        <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{inst.name}</span>
                        {inst.current_rank === 1 && <Crown size={14} color="#FFD700" />}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--accent)' }}>
                      {inst.jobs_completed}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono' }}>
                      {inst.avg_time_per_job}h
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700,
                        background: inst.quality_score >= 90 ? 'rgba(34,192,122,0.15)' : inst.quality_score >= 75 ? 'rgba(245,158,11,0.15)' : 'rgba(242,90,90,0.15)',
                        color: inst.quality_score >= 90 ? '#22c07a' : inst.quality_score >= 75 ? '#f59e0b' : '#f25a5a',
                      }}>
                        {inst.quality_score}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--green)' }}>
                      ${inst.earnings.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                        <RankIcon size={14} style={{ color: rank.color }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: rank.color }}>{rank.text}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
