'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  TrendingUp,
  Phone,
  QrCode,
  Briefcase,
  Target,
  Loader2,
  Map,
  Calendar,
  Zap,
} from 'lucide-react'
import LeadOriginMap from '@/components/roi/LeadOriginMap'
import LiveActivityFeed from '@/components/roi/LiveActivityFeed'
import JobLogger from '@/components/roi/JobLogger'
import RouteABComparison from '@/components/roi/RouteABComparison'

export default function CampaignPortalPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.campaignId as string
  const [data, setData] = useState<any>(null)
  const [orgId, setOrgId] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/roi/campaigns/${campaignId}`)
      if (!res.ok) { router.push('/roi/dashboard'); return }
      const result = await res.json()
      setData(result)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (cancelled) return
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
      if (prof?.org_id) setOrgId(prof.org_id)
      fetchData()
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  if (!data?.campaign) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
        Campaign not found
      </div>
    )
  }

  const { campaign, events, routes, stats } = data
  const daysSinceInstall = campaign.install_date
    ? Math.floor((Date.now() - new Date(campaign.install_date).getTime()) / 86400000)
    : null
  const conversionRate = stats.calls > 0 ? ((stats.jobs / stats.calls) * 100).toFixed(1) : '0.0'

  // Break-even
  const investmentAmount = Number(campaign.investment_amount || 0)
  const breakEvenPct = investmentAmount > 0 ? Math.min((stats.totalRevenue / investmentAmount) * 100, 100) : 0
  const monthlyRevRate = daysSinceInstall && daysSinceInstall > 0
    ? (stats.totalRevenue / daysSinceInstall) * 30
    : 0
  const daysToBreakEven = monthlyRevRate > 0
    ? Math.ceil(((investmentAmount - stats.totalRevenue) / monthlyRevRate) * 30)
    : null

  // AI insight
  const insights = [
    stats.calls > 5 && stats.jobs === 0 ? 'Calls coming in but no jobs logged. Make sure to track all wrap-sourced jobs!' : null,
    stats.scans > stats.calls ? 'QR scans are outperforming phone calls. Consider making the QR code more prominent.' : null,
    daysSinceInstall && daysSinceInstall > 30 && stats.calls < 3 ? 'Low call volume. Consider adjusting driving routes to higher-traffic areas.' : null,
    breakEvenPct >= 100 ? 'This wrap has paid for itself! Pure profit from here.' : null,
  ].filter(Boolean)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/roi/dashboard" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--surface2)', color: 'var(--text2)', textDecoration: 'none',
        }}>
          <ArrowLeft size={16} />
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: 22, fontWeight: 900,
            fontFamily: 'Barlow Condensed, sans-serif',
            color: 'var(--text1)', margin: 0,
          }}>
            {campaign.vehicle_label}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>
            {campaign.industry}
            {campaign.install_date && ` · Installed ${new Date(campaign.install_date).toLocaleDateString()}`}
          </p>
        </div>
        <Link href={`/roi/${campaignId}/route-mapper`} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8,
          background: 'var(--surface2)', color: 'var(--text1)',
          fontSize: 13, fontWeight: 600, textDecoration: 'none',
          border: '1px solid var(--border)',
        }}>
          <Map size={14} />
          Route Mapper
        </Link>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {/* Live ROI */}
        <div style={{
          background: 'var(--surface)',
          border: `1px solid ${stats.roi >= 0 ? 'rgba(34,192,122,0.3)' : 'rgba(242,90,90,0.3)'}`,
          borderRadius: 12, padding: '16px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <TrendingUp size={14} style={{ color: stats.roi >= 0 ? 'var(--green)' : 'var(--red)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase' }}>Live ROI</span>
          </div>
          <div style={{
            fontSize: 28, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace',
            color: stats.roi >= 0 ? 'var(--green)' : 'var(--red)',
          }}>
            {stats.roi >= 0 ? '+' : '-'}${Math.abs(stats.roi).toLocaleString()}
          </div>
          {daysSinceInstall !== null && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              Since install · {daysSinceInstall} days
            </div>
          )}
        </div>

        {/* This Month */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>
            This Month
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--green)' }}>
                {stats.calls}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>Calls</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--purple)' }}>
                {stats.scans}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>Scans</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--amber)' }}>
                {stats.jobs}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>Jobs</div>
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Target size={14} style={{ color: 'var(--cyan)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase' }}>Conversion</span>
          </div>
          <div style={{
            fontSize: 28, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)',
          }}>
            {conversionRate}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Jobs / Calls</div>
        </div>

        {/* AI Insight */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: 12, padding: '16px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Zap size={14} style={{ color: 'var(--purple)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase' }}>AI Insight</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.4 }}>
            {insights[0] || 'Collecting data for insights...'}
          </div>
        </div>
      </div>

      {/* Main Content: Map + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 20 }}>
        {/* Lead Origin Map */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 10 }}>
            Lead Origin Map
          </div>
          <LeadOriginMap
            campaignId={campaignId}
            initialEvents={events}
            height={480}
          />
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <LiveActivityFeed
            campaignId={campaignId}
            initialEvents={events.slice(0, 20)}
          />
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Route A/B */}
        <RouteABComparison campaignId={campaignId} routes={routes} />

        {/* Job Logger */}
        <JobLogger campaignId={campaignId} orgId={orgId} onJobLogged={fetchData} />

        {/* Break-Even Progress */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Calendar size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>Break-Even</span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Progress</span>
              <span style={{
                fontSize: 13,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                color: breakEvenPct >= 100 ? 'var(--green)' : 'var(--text1)',
              }}>
                {breakEvenPct.toFixed(0)}%
              </span>
            </div>
            <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${breakEvenPct}%`,
                background: breakEvenPct >= 100
                  ? 'linear-gradient(to right, var(--green), var(--cyan))'
                  : 'var(--accent)',
                borderRadius: 4,
                transition: 'width 0.5s',
              }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Investment</span>
              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)' }}>
                ${investmentAmount.toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Revenue Earned</span>
              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--green)' }}>
                ${stats.totalRevenue.toLocaleString()}
              </span>
            </div>
            {daysToBreakEven !== null && daysToBreakEven > 0 && breakEvenPct < 100 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Projected Break-Even</span>
                <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--amber)' }}>
                  ~{daysToBreakEven} days
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
