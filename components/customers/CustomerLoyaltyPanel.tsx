'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, Award, Gift, TrendingUp, Clock, DollarSign, Repeat, Heart, ChevronDown, ChevronUp } from 'lucide-react'

const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

// Loyalty tier definitions
const LOYALTY_TIERS = [
  { key: 'new', label: 'New', color: '#5a6080', minSpend: 0, discount: 0, icon: Star },
  { key: 'bronze', label: 'Bronze', color: '#cd7f32', minSpend: 1000, discount: 3, icon: Award },
  { key: 'silver', label: 'Silver', color: '#c0c0c0', minSpend: 3000, discount: 5, icon: Award },
  { key: 'gold', label: 'Gold', color: '#f59e0b', minSpend: 7500, discount: 8, icon: Gift },
  { key: 'platinum', label: 'Platinum', color: '#8b5cf6', minSpend: 15000, discount: 10, icon: Heart },
]

interface Props {
  customerId: string
  customerName: string
  compact?: boolean
}

interface LoyaltyData {
  totalSpend: number
  jobCount: number
  firstJobDate: string | null
  lastJobDate: string | null
  avgJobValue: number
  referralCount: number
  tier: typeof LOYALTY_TIERS[0]
  nextTier: typeof LOYALTY_TIERS[0] | null
  spendToNext: number
  progressPct: number
}

export default function CustomerLoyaltyPanel({ customerId, customerName, compact = false }: Props) {
  const [data, setData] = useState<LoyaltyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(!compact)
  const supabase = createClient()

  useEffect(() => {
    loadLoyaltyData()
  }, [customerId])

  async function loadLoyaltyData() {
    setLoading(true)
    try {
      // Load all closed/done projects for this customer
      const { data: projects } = await supabase
        .from('projects')
        .select('id, revenue, created_at, pipe_stage')
        .eq('customer_id', customerId)
        .in('pipe_stage', ['sales_close', 'done'])
        .order('created_at', { ascending: true })

      // Load all invoices paid
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total, created_at')
        .eq('customer_id', customerId)
        .eq('status', 'paid')

      // Load referrals
      const { data: referrals } = await supabase
        .from('sales_referrals')
        .select('id')
        .eq('referrer_id', customerId)

      const jobs = projects || []
      const totalSpend = (invoices || []).reduce((s, inv) => s + (inv.total || 0), 0)
        || jobs.reduce((s, j) => s + (j.revenue || 0), 0)
      const jobCount = jobs.length
      const firstJobDate = jobs[0]?.created_at || null
      const lastJobDate = jobs[jobs.length - 1]?.created_at || null
      const avgJobValue = jobCount > 0 ? totalSpend / jobCount : 0
      const referralCount = (referrals || []).length

      // Calculate tier
      let tier = LOYALTY_TIERS[0]
      let nextTier: typeof LOYALTY_TIERS[0] | null = null
      for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
        if (totalSpend >= LOYALTY_TIERS[i].minSpend) {
          tier = LOYALTY_TIERS[i]
          nextTier = i < LOYALTY_TIERS.length - 1 ? LOYALTY_TIERS[i + 1] : null
          break
        }
      }

      const spendToNext = nextTier ? nextTier.minSpend - totalSpend : 0
      const progressPct = nextTier
        ? Math.min(100, ((totalSpend - tier.minSpend) / (nextTier.minSpend - tier.minSpend)) * 100)
        : 100

      setData({ totalSpend, jobCount, firstJobDate, lastJobDate, avgJobValue, referralCount, tier, nextTier, spendToNext, progressPct })
    } catch {
      setData(null)
    }
    setLoading(false)
  }

  if (loading) return <div style={{ padding: 16, color: 'var(--text3)', fontSize: 12 }}>Loading loyalty data...</div>
  if (!data) return null

  const TierIcon = data.tier.icon

  if (compact) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TierIcon size={14} style={{ color: data.tier.color }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: data.tier.color, fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {data.tier.label}
            </span>
            {data.tier.discount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', background: 'rgba(34,192,122,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                {data.tier.discount}% off
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontFamily: monoFont, color: 'var(--text2)', fontWeight: 600 }}>
              {fmt(data.totalSpend)}
            </span>
            {expanded ? <ChevronUp size={14} style={{ color: 'var(--text3)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text3)' }} />}
          </div>
        </div>
        {expanded && renderDetails(data)}
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <TierIcon size={20} style={{ color: data.tier.color }} />
          <div>
            <span style={{ fontSize: 16, fontWeight: 900, color: data.tier.color, fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {data.tier.label} Member
            </span>
            {data.tier.discount > 0 && (
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: 'var(--green)', background: 'rgba(34,192,122,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                {data.tier.discount}% loyalty discount
              </span>
            )}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>{customerName}</div>
      </div>

      {renderDetails(data)}
    </div>
  )
}

function renderDetails(data: LoyaltyData) {
  return (
    <div style={{ padding: '14px 18px' }}>
      {/* Progress to next tier */}
      {data.nextTier && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700 }}>
              Progress to {data.nextTier.label}
            </span>
            <span style={{ fontSize: 11, fontFamily: monoFont, color: 'var(--text2)' }}>
              {fmt(data.spendToNext)} to go
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: `${data.progressPct}%`, height: '100%',
              background: data.nextTier.color, borderRadius: 3,
              transition: 'width 0.5s',
            }} />
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <StatCard icon={DollarSign} label="Total Spend" value={fmt(data.totalSpend)} color="var(--green)" />
        <StatCard icon={Repeat} label="Jobs" value={String(data.jobCount)} color="var(--accent)" />
        <StatCard icon={TrendingUp} label="Avg Job Value" value={fmt(data.avgJobValue)} color="var(--amber)" />
        <StatCard icon={Gift} label="Referrals" value={String(data.referralCount)} color="var(--purple)" />
      </div>

      {/* Member since */}
      {data.firstJobDate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 11, color: 'var(--text3)' }}>
          <Clock size={11} />
          Member since {new Date(data.firstJobDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          {data.lastJobDate && ` · Last job ${new Date(data.lastJobDate).toLocaleDateString()}`}
        </div>
      )}

      {/* Tier benefits */}
      {data.tier.discount > 0 && (
        <div style={{
          marginTop: 12, padding: '10px 14px', background: 'var(--bg)',
          border: '1px solid var(--border)', borderRadius: 8,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Tier Benefits
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>
              {data.tier.discount}% loyalty discount on all services
            </div>
            {data.tier.key === 'gold' && (
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Priority scheduling</div>
            )}
            {data.tier.key === 'platinum' && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Priority scheduling</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Free design consultation</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>Extended warranty</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Icon size={12} style={{ color }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
    </div>
  )
}
