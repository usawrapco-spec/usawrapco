'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DollarSign, TrendingUp, Hammer, Palette, Star, Clock } from 'lucide-react'
import type { Profile, Project } from '@/types'
import { calculateCommission } from '@/lib/commission'

interface Props {
  profile: Profile
  projects: Project[]
}

const fM = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

const now = new Date()
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

function inMonth(dateStr: string) {
  return new Date(dateStr) >= startOfMonth
}

export default function RoleEarningsPanel({ profile, projects }: Props) {
  const supabase = createClient()
  const role = profile.role

  // ── Sales Agent ──────────────────────────────────────────────────────────────
  if (role === 'sales_agent') {
    const myProjects = projects.filter(p => p.agent_id === profile.id)
    const closedThisMonth = myProjects.filter(p =>
      (p.status === 'closed' || p.pipe_stage === 'done') && inMonth(p.updated_at)
    )
    const commissionThisMonth = closedThisMonth.reduce((s, p) => s + (p.commission || 0), 0)

    const pendingProjects = myProjects.filter(p =>
      !['closed', 'cancelled'].includes(p.status) && p.pipe_stage !== 'done'
    )
    const pendingCommission = pendingProjects.reduce((s, p) => {
      const est = calculateCommission({
        totalSale: p.revenue || 0,
        materialCost: 0, installLaborCost: 0, designFee: 0, additionalFees: 0,
        source: (p.form_data as Record<string, string>)?.source as 'inbound' | 'outbound' || 'inbound',
      })
      return s + est.agentCommission
    }, 0)

    const ytdCommission = myProjects
      .filter(p => p.status === 'closed' || p.pipe_stage === 'done')
      .reduce((s, p) => s + (p.commission || 0), 0)

    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(34,192,122,0.1) 0%, rgba(79,127,255,0.1) 100%)',
        border: '1px solid rgba(34,192,122,0.3)',
        borderRadius: 14, padding: '16px 20px',
        display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 20, alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(34,192,122,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={20} style={{ color: '#22c07a' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#22c07a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Earnings</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Sales Agent</div>
          </div>
        </div>
        {[
          { label: 'This Month', val: fM(commissionThisMonth), color: '#22c07a', sub: `${closedThisMonth.length} deals closed` },
          { label: 'YTD Commission', val: fM(ytdCommission), color: 'var(--accent)', sub: `${myProjects.filter(p => p.status === 'closed').length} total deals` },
          { label: 'Pending', val: fM(pendingCommission), color: 'var(--amber)', sub: `${pendingProjects.length} active jobs` },
        ].map(({ label, val, color, sub }) => (
          <div key={label}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color }}>{val}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>
    )
  }

  // ── Production Manager ───────────────────────────────────────────────────────
  if (role === 'production') {
    const closedThisMonth = projects.filter(p =>
      (p.status === 'closed' || p.pipe_stage === 'done') && inMonth(p.updated_at)
    )
    const productionBonusMonth = closedThisMonth.reduce((s, p) => {
      const profit = p.profit || 0
      const designFee = (p.fin_data as Record<string, number>)?.design_fee || 0
      return s + Math.max(0, (profit - designFee) * 0.05)
    }, 0)

    const ytdBonus = projects
      .filter(p => p.status === 'closed' || p.pipe_stage === 'done')
      .reduce((s, p) => {
        const profit = p.profit || 0
        const designFee = (p.fin_data as Record<string, number>)?.design_fee || 0
        return s + Math.max(0, (profit - designFee) * 0.05)
      }, 0)

    const inProd = projects.filter(p =>
      p.status === 'in_production' || p.pipe_stage === 'production'
    ).length

    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(34,192,122,0.1) 0%, rgba(34,211,238,0.08) 100%)',
        border: '1px solid rgba(34,192,122,0.3)',
        borderRadius: 14, padding: '16px 20px',
        display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 20, alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(34,192,122,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={20} style={{ color: '#22c07a' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#22c07a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Production Bonus</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Production Manager</div>
          </div>
        </div>
        {[
          { label: 'This Month', val: fM(productionBonusMonth), color: '#22c07a', sub: `${closedThisMonth.length} jobs completed` },
          { label: 'YTD Bonus', val: fM(ytdBonus), color: 'var(--accent)', sub: '5% of (profit - design)' },
          { label: 'In Production', val: inProd.toString(), color: 'var(--cyan)', sub: 'jobs in queue' },
        ].map(({ label, val, color, sub }) => (
          <div key={label}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color }}>{val}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>
    )
  }

  // ── Installer ────────────────────────────────────────────────────────────────
  if (role === 'installer') {
    return <InstallerEarningsPanel profile={profile} supabase={supabase} />
  }

  // ── Designer ─────────────────────────────────────────────────────────────────
  if (role === 'designer') {
    return <DesignerStatsPanel profile={profile} supabase={supabase} />
  }

  // Owner/admin: no personal earnings panel needed (they see org financials)
  return null
}

// ── Installer sub-panel (needs Supabase query) ────────────────────────────────
function InstallerEarningsPanel({ profile, supabase }: { profile: Profile; supabase: ReturnType<typeof createClient> }) {
  const [data, setData] = useState<{ payMonth: number; ytdPay: number; jobsMonth: number; openBids: number } | null>(null)

  useEffect(() => {
    async function load() {
      const [bidsRes, openRes] = await Promise.all([
        supabase.from('installer_bids').select('bid_amount, status, updated_at').eq('installer_id', profile.id).eq('status', 'accepted'),
        supabase.from('installer_bids').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ])
      const bids = bidsRes.data || []
      const payMonth = bids.filter(b => inMonth(b.updated_at)).reduce((s, b) => s + (b.bid_amount || 0), 0)
      const ytdPay = bids.reduce((s, b) => s + (b.bid_amount || 0), 0)
      const jobsMonth = bids.filter(b => inMonth(b.updated_at)).length
      setData({ payMonth, ytdPay, jobsMonth, openBids: openRes.count || 0 })
    }
    load()
  }, [profile.id])

  if (!data) return null

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(79,127,255,0.08) 100%)',
      border: '1px solid rgba(245,158,11,0.3)',
      borderRadius: 14, padding: '16px 20px',
      display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 20, alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Hammer size={20} style={{ color: '#f59e0b' }} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Pay</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>Installer</div>
        </div>
      </div>
      {[
        { label: 'This Month', val: fM(data.payMonth), color: '#f59e0b', sub: `${data.jobsMonth} jobs accepted` },
        { label: 'YTD Pay', val: fM(data.ytdPay), color: 'var(--accent)', sub: 'all accepted bids' },
        { label: 'Open Bids', val: data.openBids.toString(), color: 'var(--cyan)', sub: 'available now' },
      ].map(({ label, val, color, sub }) => (
        <div key={label}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color }}>{val}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>
        </div>
      ))}
    </div>
  )
}

// ── Designer sub-panel (needs Supabase query) ─────────────────────────────────
function DesignerStatsPanel({ profile, supabase }: { profile: Profile; supabase: ReturnType<typeof createClient> }) {
  const [data, setData] = useState<{ active: number; inReview: number; done: number; avgRevisions: number } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: designs } = await supabase
        .from('design_projects')
        .select('status, revision_number')
        .eq('assigned_to', profile.id)

      if (!designs) { setData({ active: 0, inReview: 0, done: 0, avgRevisions: 0 }); return }

      const active = designs.filter(d => d.status === 'active' || d.status === 'in_progress').length
      const inReview = designs.filter(d => d.status === 'in_review' || d.status === 'review').length
      const done = designs.filter(d => d.status === 'approved' || d.status === 'done').length
      const avgRevisions = designs.length > 0
        ? designs.reduce((s, d) => s + (d.revision_number || 1), 0) / designs.length
        : 0

      setData({ active, inReview, done, avgRevisions })
    }
    load()
  }, [profile.id])

  if (!data) return null

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(79,127,255,0.08) 100%)',
      border: '1px solid rgba(139,92,246,0.3)',
      borderRadius: 14, padding: '16px 20px',
      display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 20, alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Palette size={20} style={{ color: '#8b5cf6' }} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Designs</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>Designer</div>
        </div>
      </div>
      {[
        { label: 'Active', val: data.active.toString(), color: 'var(--accent)', sub: 'in progress' },
        { label: 'In Review', val: data.inReview.toString(), color: 'var(--amber)', sub: 'awaiting approval' },
        { label: 'Avg Revisions', val: data.avgRevisions.toFixed(1), color: data.avgRevisions <= 1.5 ? '#22c07a' : '#f25a5a', sub: `${data.done} completed` },
      ].map(({ label, val, color, sub }) => (
        <div key={label}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color }}>{val}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>
        </div>
      ))}
    </div>
  )
}
