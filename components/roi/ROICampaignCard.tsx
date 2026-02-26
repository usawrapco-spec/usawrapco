'use client'

import Link from 'next/link'
import { Phone, QrCode, Briefcase, Calendar, ChevronRight, Sparkles } from 'lucide-react'

interface CampaignCardProps {
  campaign: {
    id: string
    vehicle_label: string
    industry: string
    install_date?: string
    investment_amount?: number
    status: string
    ai_insight?: string | null
    stats: {
      calls: number
      scans: number
      jobs: number
      revenue: number
    }
  }
}

export default function ROICampaignCard({ campaign }: CampaignCardProps) {
  const { stats } = campaign
  const roi = stats.revenue - Number(campaign.investment_amount || 0)
  const breakEvenPct = campaign.investment_amount
    ? Math.min((stats.revenue / Number(campaign.investment_amount)) * 100, 100)
    : 0

  return (
    <Link
      href={`/roi/${campaign.id}`}
      style={{
        display: 'block',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 20,
        textDecoration: 'none',
        transition: 'border-color 0.15s, transform 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>
            {campaign.vehicle_label}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {campaign.industry}
            {campaign.install_date && (
              <span style={{ marginLeft: 6 }}>
                <Calendar size={10} style={{ display: 'inline', marginRight: 3 }} />
                Installed {new Date(campaign.install_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div style={{
          padding: '3px 8px',
          borderRadius: 6,
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          background: campaign.status === 'active' ? 'rgba(34,192,122,0.1)' : 'rgba(245,158,11,0.1)',
          color: campaign.status === 'active' ? 'var(--green)' : 'var(--amber)',
        }}>
          {campaign.status}
        </div>
      </div>

      {/* ROI Number */}
      <div style={{
        fontSize: 32,
        fontWeight: 900,
        fontFamily: 'JetBrains Mono, monospace',
        color: roi >= 0 ? 'var(--green)' : 'var(--red)',
        lineHeight: 1,
        marginBottom: 12,
      }}>
        {roi >= 0 ? '+' : '-'}${Math.abs(roi).toLocaleString()}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Phone size={13} style={{ color: 'var(--green)' }} />
          <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)', fontWeight: 600 }}>
            {stats.calls}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>calls</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <QrCode size={13} style={{ color: 'var(--purple)' }} />
          <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)', fontWeight: 600 }}>
            {stats.scans}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>scans</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Briefcase size={13} style={{ color: 'var(--amber)' }} />
          <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)', fontWeight: 600 }}>
            {stats.jobs}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>jobs</span>
        </div>
      </div>

      {/* Break-even progress */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Break-even progress</span>
          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: breakEvenPct >= 100 ? 'var(--green)' : 'var(--text2)' }}>
            {breakEvenPct.toFixed(0)}%
          </span>
        </div>
        <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${breakEvenPct}%`,
            background: breakEvenPct >= 100 ? 'var(--green)' : 'var(--accent)',
            borderRadius: 2,
            transition: 'width 0.5s',
          }} />
        </div>
      </div>

      {/* AI Insight Badge */}
      {campaign.ai_insight && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(139,92,246,0.12)', borderRadius: 8,
          padding: '6px 10px', marginTop: 8,
        }}>
          <Sparkles size={12} style={{ color: 'var(--purple)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'var(--purple)', lineHeight: 1.4 }}>
            {campaign.ai_insight}
          </span>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
          View Portal
        </span>
        <ChevronRight size={14} style={{ color: 'var(--accent)' }} />
      </div>
    </Link>
  )
}
