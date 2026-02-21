'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Profile, Project } from '@/types'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  DollarSign, TrendingUp, Calendar, Clock, Hammer,
  Package, Palette, Trophy, ChevronRight, Printer,
  AlertTriangle, Award, Star, Target,
} from 'lucide-react'

interface Props {
  profile: Profile
  projects: Project[]
}

const fM = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

const now = new Date()
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: color || 'var(--text1)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function SectionCard({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 900, color: 'var(--text1)', letterSpacing: '0.01em' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

// ── Sales Agent Dashboard ─────────────────────────────────────────
function SalesDashboard({ profile, projects }: Props) {
  const myProjects = projects.filter(p => p.agent_id === profile.id)
  const closedThisMonth = myProjects.filter(p =>
    p.status === 'closed' && new Date(p.updated_at || '') >= monthStart
  )
  const activeProjects = myProjects.filter(p =>
    ['active', 'in_production', 'install_scheduled', 'installed', 'qc', 'closing'].includes(p.status)
  )
  const estimatesOpen = myProjects.filter(p => p.status === 'estimate')

  const commRate = 0.075 // default inbound
  const earnedThisMonth = closedThisMonth.reduce((s, p) => s + ((p.profit || 0) * commRate), 0)
  const pendingComm     = activeProjects.reduce((s, p) => s + ((p.profit || 0) * commRate), 0)

  // Pipeline by stage
  const stageCounts: Record<string, { count: number; value: number }> = {}
  const stages = ['sales_in', 'production', 'install', 'prod_review', 'sales_close']
  stages.forEach(s => { stageCounts[s] = { count: 0, value: 0 } })
  myProjects.forEach(p => {
    const stg = p.pipe_stage || 'sales_in'
    if (stageCounts[stg]) {
      stageCounts[stg].count++
      stageCounts[stg].value += p.revenue || 0
    }
  })

  const stageLabels: Record<string, string> = {
    sales_in: 'Sales', production: 'Production', install: 'Install',
    prod_review: 'QC', sales_close: 'Closing',
  }

  // Rank: compare against all agents' closed revenue
  const agentRevMap: Record<string, number> = {}
  projects.filter(p => p.status === 'closed' && new Date(p.updated_at || '') >= monthStart).forEach(p => {
    if (p.agent_id) agentRevMap[p.agent_id] = (agentRevMap[p.agent_id] || 0) + (p.revenue || 0)
  })
  const sorted = Object.values(agentRevMap).sort((a, b) => b - a)
  const myRevenue = agentRevMap[profile.id] || 0
  const rank = sorted.findIndex(r => r === myRevenue) + 1
  const totalAgents = sorted.length

  // Follow-ups: estimates older than 3 days
  const followUps = estimatesOpen.filter(p => {
    const age = (now.getTime() - new Date(p.updated_at || p.created_at).getTime()) / 86400000
    return age >= 3
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
      {/* Earnings strip */}
      <SectionCard title="Your Earnings" icon={DollarSign} color="#22c07a">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <StatCard label="This Month" value={fM(earnedThisMonth)} sub="commission earned" color="#22c07a" />
          <StatCard label="Pending" value={fM(pendingComm)} sub="from active jobs" color="#f59e0b" />
          <StatCard label="Jobs Closed" value={closedThisMonth.length.toString()} sub="this month" color="#4f7fff" />
          <StatCard label="Open Estimates" value={estimatesOpen.length.toString()} sub="awaiting decisions" color="#22d3ee" />
        </div>
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Pipeline */}
        <SectionCard title="Your Pipeline" icon={TrendingUp} color="#4f7fff">
          {stages.map(stg => {
            const { count, value } = stageCounts[stg]
            return (
              <div key={stg} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{stageLabels[stg]}</span>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)' }}>{count} jobs</span>
                  {value > 0 && <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#22c07a' }}>{fM(value)}</span>}
                </div>
              </div>
            )
          })}
          <Link href="/projects" style={{ display: 'block', marginTop: 10, fontSize: 12, color: 'var(--accent)', textDecoration: 'none', textAlign: 'center' }}>
            View all my jobs →
          </Link>
        </SectionCard>

        {/* Rank + Follow-ups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionCard title="Your Rank" icon={Trophy} color="#f59e0b">
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 42, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: rank === 1 ? '#f59e0b' : rank === 2 ? '#9299b5' : rank === 3 ? '#cd7f32' : 'var(--text2)', lineHeight: 1 }}>
                #{rank}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                of {totalAgents} agents this month
              </div>
              <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#22c07a', marginTop: 6 }}>
                {fM(myRevenue)} revenue closed
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Follow-Ups Due" icon={AlertTriangle} color="#f25a5a">
            {followUps.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '8px 0' }}>All caught up!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {followUps.slice(0, 4).map(p => (
                  <Link key={p.id} href={`/projects/${p.id}`} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 8px', borderRadius: 7, background: 'var(--surface2)',
                    textDecoration: 'none',
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
                      {(p as any).customer?.name || p.title || 'Job'}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--red)' }}>
                      {Math.floor((now.getTime() - new Date(p.updated_at || p.created_at).getTime()) / 86400000)}d
                    </span>
                  </Link>
                ))}
                {followUps.length > 4 && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
                    +{followUps.length - 4} more
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

// ── Production Dashboard ─────────────────────────────────────────
function ProductionDashboard({ profile, projects }: Props) {
  const [inventory, setInventory] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('vinyl_inventory').select('*').then(({ data }) => {
      if (data) setInventory(data)
    })
  }, [])

  const productionJobs = projects.filter(p =>
    p.pipe_stage === 'production' || p.status === 'in_production'
  )
  const installJobs = projects.filter(p =>
    p.pipe_stage === 'install' || p.status === 'install_scheduled'
  )
  const needingBrief = projects.filter(p =>
    p.status === 'active' && !((p.actuals as any)?.productionBriefSent)
  )

  // Production bonus calc: 5% × (profit − design fee)
  const closedThisMonth = projects.filter(p =>
    p.status === 'closed' && new Date(p.updated_at || '') >= monthStart
  )
  const prodBonus = closedThisMonth.reduce((s, p) => {
    const designFee = (p.form_data as any)?.designFee || 150
    return s + Math.max(0, ((p.profit || 0) - designFee) * 0.05)
  }, 0)

  const lowInventory = inventory.filter(i => (i.rolls_remaining || 0) <= 2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
      {/* Production bonus */}
      <SectionCard title="Production Bonus" icon={DollarSign} color="#22c07a">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <StatCard label="This Month Bonus" value={fM(prodBonus)} sub="5% × (profit − design)" color="#22c07a" />
          <StatCard label="In Production" value={productionJobs.length.toString()} sub="jobs printing/prepping" color="#4f7fff" />
          <StatCard label="Install Queue" value={installJobs.length.toString()} sub="jobs scheduled" color="#22d3ee" />
          <StatCard label="Needs Brief" value={needingBrief.length.toString()} sub="approved, no brief yet" color="#f59e0b" />
        </div>
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Print queue */}
        <SectionCard title="Print Queue" icon={Printer} color="#4f7fff">
          {productionJobs.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '8px 0' }}>No jobs in production</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {productionJobs.slice(0, 5).map(p => (
                <Link key={p.id} href={`/projects/${p.id}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 10px', borderRadius: 7, background: 'var(--surface2)',
                  textDecoration: 'none',
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>{p.title || 'Job'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{p.vehicle_desc || '—'}</div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text3)' }} />
                </Link>
              ))}
              {productionJobs.length > 5 && (
                <Link href="/production" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', textAlign: 'center', marginTop: 4 }}>
                  +{productionJobs.length - 5} more →
                </Link>
              )}
            </div>
          )}
        </SectionCard>

        {/* Material alerts */}
        <SectionCard title="Material Alerts" icon={Package} color="#f59e0b">
          {lowInventory.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '8px 0' }}>All materials stocked</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lowInventory.map((item: any) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.2)' }}>
                  <AlertTriangle size={13} style={{ color: 'var(--red)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>{item.sku || item.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--red)' }}>{item.rolls_remaining ?? 0} roll(s) remaining</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {needingBrief.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Jobs Needing Brief
              </div>
              {needingBrief.slice(0, 3).map(p => (
                <Link key={p.id} href={`/projects/${p.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, color: 'var(--accent)', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}>
                  <span>{p.title}</span>
                  <span style={{ color: 'var(--text3)' }}>{p.vehicle_desc || '—'}</span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

// ── Designer Dashboard ────────────────────────────────────────────
function DesignerDashboard({ profile, projects }: Props) {
  const [designProjects, setDesignProjects] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('design_projects')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setDesignProjects(data) })
  }, [profile.org_id])

  const myDesigns    = designProjects.filter(d => d.designer_id === profile.id || !d.designer_id)
  const activeDesigns = myDesigns.filter(d => d.status === 'active' || d.status === 'in_progress')
  const inReview     = myDesigns.filter(d => d.status === 'review' || d.status === 'pending_approval')
  const doneDesigns  = myDesigns.filter(d => d.status === 'done' || d.status === 'approved')

  const xp       = profile.xp || 0
  const level    = Math.floor(Math.sqrt(xp / 50)) + 1
  const xpToNext = (level * level * 50) - xp

  const BADGE_COLORS: Record<string, string> = { '#22c07a': 'Speed Demon', '#4f7fff': 'First Try', '#f59e0b': 'Perfectionist', '#8b5cf6': 'Veteran' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
      {/* Design stats */}
      <SectionCard title="Your Designs" icon={Palette} color="#8b5cf6">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <StatCard label="Active" value={activeDesigns.length.toString()} sub="in progress" color="#4f7fff" />
          <StatCard label="In Review" value={inReview.length.toString()} sub="awaiting approval" color="#f59e0b" />
          <StatCard label="Completed" value={doneDesigns.length.toString()} sub="this month" color="#22c07a" />
          <StatCard label="Level" value={level.toString()} sub={`${xp} XP · ${xpToNext} to next`} color="#8b5cf6" />
        </div>
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Active design cards */}
        <SectionCard title="Assigned To You" icon={Target} color="#4f7fff">
          {activeDesigns.length === 0 && inReview.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '8px 0' }}>No active designs</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...activeDesigns, ...inReview].slice(0, 5).map(d => (
                <Link key={d.id} href="/design" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: 8, background: 'var(--surface2)',
                  textDecoration: 'none',
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>{d.title || d.name || 'Design'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{d.status}</div>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                    background: d.status === 'review' ? 'rgba(245,158,11,0.15)' : 'rgba(79,127,255,0.15)',
                    color: d.status === 'review' ? 'var(--amber)' : 'var(--accent)',
                  }}>
                    {d.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
          <Link href="/design" style={{ display: 'block', marginTop: 10, fontSize: 12, color: 'var(--accent)', textDecoration: 'none', textAlign: 'center' }}>
            Open Design Studio →
          </Link>
        </SectionCard>

        {/* XP + badges */}
        <SectionCard title="Achievements" icon={Award} color="#f59e0b">
          {/* XP bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>Level {level}</span>
              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>{xp} XP</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3, background: 'var(--accent)',
                width: `${Math.min(100, ((xp % (level * level * 50)) / (level * level * 50)) * 100)}%`,
                transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{xpToNext} XP to Level {level + 1}</div>
          </div>
          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(BADGE_COLORS).map(([color, label]) => (
              <div key={label} style={{ padding: '4px 10px', borderRadius: 20, background: `${color}18`, border: `1px solid ${color}44`, fontSize: 10, fontWeight: 700, color }}>
                {label}
              </div>
            ))}
          </div>
          <Link href="/leaderboard" style={{ display: 'block', marginTop: 12, fontSize: 11, color: 'var(--accent)', textDecoration: 'none', textAlign: 'center' }}>
            View Leaderboard →
          </Link>
        </SectionCard>
      </div>
    </div>
  )
}

// ── Installer Dashboard ───────────────────────────────────────────
function InstallerDashboard({ profile, projects }: Props) {
  const [bids, setBids] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('installer_bids').select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => { if (data) setBids(data) })
  }, [])

  const myInstalls = projects.filter(p =>
    p.installer_id === profile.id || (p as any).installer?.id === profile.id
  )
  const upcoming = myInstalls.filter(p => {
    if (!p.install_date) return false
    const d = new Date(p.install_date)
    return d >= now
  }).sort((a, b) => new Date(a.install_date!).getTime() - new Date(b.install_date!).getTime())

  const completedThisMonth = myInstalls.filter(p =>
    p.status === 'closed' && new Date(p.updated_at || '') >= monthStart
  )

  const earnedThisMonth = completedThisMonth.reduce((s, p) => {
    return s + ((p.form_data as any)?.selectedVehicle?.pay || 0)
  }, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
      {/* Pay strip */}
      <SectionCard title="Your Pay" icon={DollarSign} color="#22c07a">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <StatCard label="This Month" value={fM(earnedThisMonth)} sub="install pay" color="#22c07a" />
          <StatCard label="Jobs Done" value={completedThisMonth.length.toString()} sub="this month" color="#4f7fff" />
          <StatCard label="Upcoming" value={upcoming.length.toString()} sub="scheduled installs" color="#22d3ee" />
        </div>
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Open bids */}
        <SectionCard title="Open Bids" icon={Hammer} color="#f59e0b">
          {bids.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '8px 0' }}>No open bids right now</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {bids.slice(0, 4).map(bid => (
                <div key={bid.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: 'var(--surface2)' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>{bid.title || 'Install Job'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{bid.vehicle_type || '—'}</div>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#22c07a' }}>
                    {fM(bid.budget || 0)}
                  </span>
                </div>
              ))}
              <Link href="/installer-portal" style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--accent)', textDecoration: 'none', textAlign: 'center' }}>
                View & Bid →
              </Link>
            </div>
          )}
        </SectionCard>

        {/* Scheduled installs */}
        <SectionCard title="Your Schedule" icon={Calendar} color="#22d3ee">
          {upcoming.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '8px 0' }}>No upcoming installs</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {upcoming.slice(0, 4).map(p => (
                <Link key={p.id} href={`/projects/${p.id}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: 8, background: 'var(--surface2)',
                  textDecoration: 'none',
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>{p.title || 'Install'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{p.vehicle_desc || '—'}</div>
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan)', whiteSpace: 'nowrap' }}>
                    {p.install_date ? new Date(p.install_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

// ── Main Role Dashboard ────────────────────────────────────────────
export default function RoleDashboard({ profile, projects }: Props) {
  const role = profile.role

  if (role === 'sales_agent' || role === 'sales') {
    return <SalesDashboard profile={profile} projects={projects} />
  }
  if (role === 'production') {
    return <ProductionDashboard profile={profile} projects={projects} />
  }
  if (role === 'designer') {
    return <DesignerDashboard profile={profile} projects={projects} />
  }
  if (role === 'installer') {
    return <InstallerDashboard profile={profile} projects={projects} />
  }

  // Default: no extra panel (admin/owner see full DashboardClient)
  return null
}
