'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Plus, TrendingUp, Phone, QrCode, DollarSign, Award, Loader2 } from 'lucide-react'
import ROICampaignCard from '@/components/roi/ROICampaignCard'

export default function ROIPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/roi/campaigns')
      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } catch (err) {
      console.error('Failed to fetch campaigns:', err)
    } finally {
      setLoading(false)
    }
  }

  // Aggregate stats
  const totalCalls = campaigns.reduce((s, c) => s + (c.stats?.calls || 0), 0)
  const totalScans = campaigns.reduce((s, c) => s + (c.stats?.scans || 0), 0)
  const totalRevenue = campaigns.reduce((s, c) => s + (c.stats?.revenue || 0), 0)
  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const bestCampaign = campaigns.reduce((best: any, c: any) => {
    const roi = (c.stats?.revenue || 0) - Number(c.investment_amount || 0)
    const bestRoi = best ? ((best.stats?.revenue || 0) - Number(best.investment_amount || 0)) : -Infinity
    return roi > bestRoi ? c : best
  }, null)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={24} style={{ color: 'var(--green)' }} />
            <h1 style={{
              fontSize: 28,
              fontWeight: 900,
              fontFamily: 'Barlow Condensed, sans-serif',
              color: 'var(--text1)',
              margin: 0,
            }}>
              ROI Engine
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
            Track every wrap, every dollar
          </p>
        </div>
        <Link
          href="/roi/new"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 20px',
            borderRadius: 10,
            background: 'var(--green)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          New Campaign
        </Link>
      </div>

      {/* Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 14,
        marginBottom: 24,
      }}>
        {[
          {
            label: 'Active Wraps',
            value: activeCampaigns.length.toString(),
            icon: TrendingUp,
            color: 'var(--accent)',
          },
          {
            label: 'Total Calls',
            value: totalCalls.toLocaleString(),
            icon: Phone,
            color: 'var(--green)',
          },
          {
            label: 'Revenue Attributed',
            value: `$${totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: 'var(--amber)',
          },
          {
            label: 'Best Performer',
            value: bestCampaign?.vehicle_label || '—',
            icon: Award,
            color: 'var(--purple)',
            small: true,
          },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <stat.icon size={14} style={{ color: stat.color }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {stat.label}
              </span>
            </div>
            <div style={{
              fontSize: stat.small ? 16 : 24,
              fontWeight: 800,
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--text1)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Campaign Grid */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      ) : campaigns.length === 0 ? (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '60px 24px',
          textAlign: 'center',
        }}>
          <TrendingUp size={40} style={{ color: 'var(--text3)', marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>
            No campaigns yet
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
            Create your first wrap campaign to start tracking ROI
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
            Create Campaign
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340, 1fr))',
          gap: 16,
        }}>
          {campaigns.map(campaign => (
            <ROICampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  )
}
