'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Map, Loader2 } from 'lucide-react'
import RouteMapper from '@/components/roi/RouteMapper'

export default function CampaignRouteMapperPage() {
  const params = useParams()
  const campaignId = params.campaignId as string
  const [campaign, setCampaign] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch_data() {
      try {
        const res = await fetch(`/api/roi/campaigns/${campaignId}`)
        const data = await res.json()
        setCampaign(data.campaign)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetch_data()
  }, [campaignId])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href={`/roi/${campaignId}`} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--surface2)', color: 'var(--text2)', textDecoration: 'none',
        }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Map size={20} style={{ color: 'var(--purple)' }} />
            <h1 style={{
              fontSize: 22, fontWeight: 900,
              fontFamily: 'Barlow Condensed, sans-serif',
              color: 'var(--text1)', margin: 0,
            }}>
              Route Mapper
            </h1>
          </div>
          {campaign && (
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>
              {campaign.vehicle_label} · {campaign.industry}
            </p>
          )}
        </div>
      </div>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 24,
      }}>
        <RouteMapper
          campaignId={campaignId}
          height={550}
        />
      </div>
    </div>
  )
}
