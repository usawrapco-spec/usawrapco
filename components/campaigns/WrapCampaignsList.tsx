'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Phone, QrCode, DollarSign, Plus, ExternalLink } from 'lucide-react'

interface WrapCampaignsListProps {
  campaigns: any[]
}

export default function WrapCampaignsList({ campaigns }: WrapCampaignsListProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (campaigns.length === 0) {
    return (
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '60px 24px',
        textAlign: 'center',
      }}>
        <TrendingUp size={40} style={{ color: 'var(--text3)', marginBottom: 12 }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>
          No wrap campaigns yet
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
          Create a wrap campaign from the ROI Engine to start tracking wrap performance
        </div>
        <Link
          href="/roi/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 20px',
            borderRadius: 10,
            background: 'var(--green)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          <Plus size={16} />
          New Campaign
        </Link>
      </div>
    )
  }

  const statusColor: Record<string, string> = {
    active: 'var(--green)',
    paused: 'var(--amber)',
    completed: 'var(--accent)',
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Active Wraps', value: campaigns.filter(c => c.status === 'active').length, color: 'var(--green)' },
          { label: 'Total Revenue', value: `$${campaigns.reduce((s, c) => s + Number(c.total_revenue || 0), 0).toLocaleString()}`, color: 'var(--amber)' },
          { label: 'Total Calls', value: campaigns.reduce((s, c) => s + (c.total_calls || 0), 0), color: 'var(--cyan)' },
          { label: 'Total Scans', value: campaigns.reduce((s, c) => s + (c.total_scans || 0), 0), color: 'var(--purple)' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: stat.color }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', fontFamily: 'Barlow Condensed, sans-serif' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 60px',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--text3)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          <span>Vehicle / Customer</span>
          <span>Tracking Code</span>
          <span>Scans</span>
          <span>Calls</span>
          <span>Jobs</span>
          <span>Revenue</span>
          <span />
        </div>

        {/* Rows */}
        {campaigns.map(c => {
          const revenue = Number(c.total_revenue || 0)
          const investment = Number(c.investment_amount || 0)
          const roi = investment > 0 ? ((revenue - investment) / investment * 100).toFixed(0) : '\u2014'

          return (
            <div key={c.id}>
              <div
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 60px',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: expanded === c.id ? 'rgba(79,127,255,0.04)' : 'transparent',
                  transition: 'background 0.15s',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                    {c.vehicle_label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {c.industry}
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 8,
                      color: statusColor[c.status] || 'var(--text3)',
                      background: `${statusColor[c.status] || 'var(--text3)'}15`,
                      textTransform: 'uppercase',
                    }}>
                      {c.status}
                    </span>
                  </div>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                  {c.qr_slug || '\u2014'}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--purple)' }}>
                  {c.total_scans || 0}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--green)' }}>
                  {c.total_calls || 0}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--amber)' }}>
                  {c.total_jobs || 0}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                  ${revenue.toLocaleString()}
                </div>
                <Link
                  href={`/roi/${c.id}`}
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: 'var(--surface2)',
                    color: 'var(--text2)',
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={12} />
                </Link>
              </div>

              {/* Expanded Detail */}
              {expanded === c.id && (
                <div style={{
                  padding: '16px 20px',
                  background: 'var(--surface2)',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>
                        Investment
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)' }}>
                        ${investment.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>
                        ROI
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: Number(roi) > 0 ? 'var(--green)' : 'var(--text1)' }}>
                        {investment > 0 ? `${roi}%` : '\u2014'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>
                        Install Date
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text1)' }}>
                        {c.install_date ? new Date(c.install_date).toLocaleDateString() : 'Not installed'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>
                        Avg LTV
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text1)' }}>
                        ${Number(c.avg_ltv || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Link
                      href={`/roi/${c.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: 'var(--accent)',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      <TrendingUp size={12} />
                      View Full Dashboard
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* New Campaign Link */}
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Link
          href="/roi/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 20px',
            borderRadius: 8,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text2)',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <Plus size={14} />
          New Wrap Campaign
        </Link>
      </div>
    </div>
  )
}
