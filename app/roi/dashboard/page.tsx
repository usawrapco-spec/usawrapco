'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Plus, TrendingUp, Phone, DollarSign, Award, Loader2, Users } from 'lucide-react'
import ROICampaignCard from '@/components/roi/ROICampaignCard'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'

export default function ROIDashboardPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        router.push('/login')
        return
      }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (cancelled) return
      if (!prof) {
        router.push('/login')
        return
      }
      setProfile(prof as Profile)

      // Fetch campaigns and leads in parallel
      const [campRes, leadsRes] = await Promise.all([
        fetch('/api/roi/campaigns'),
        fetch('/api/roi/leads'),
      ])
      if (cancelled) return

      if (campRes.ok) {
        const campData = await campRes.json()
        setCampaigns(campData.campaigns || [])
      }

      if (leadsRes.ok) {
        const leadsData = await leadsRes.json()
        setLeads(leadsData.leads || [])
      }

      setLoading(false)
    }
    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading || !profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    )
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
  const newLeads = leads.filter(l => l.status === 'new')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile} />
      <main className="flex-1 overflow-y-auto p-4 md:px-5 md:py-4 pb-20 md:pb-4">
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

          {/* Recent Leads */}
          {newLeads.length > 0 && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid rgba(34,208,238,0.3)',
              borderRadius: 14,
              padding: 20,
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Users size={16} style={{ color: 'var(--cyan)' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                  Recent Leads ({newLeads.length} new)
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {newLeads.slice(0, 5).map((lead: any) => (
                  <div key={lead.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: 'var(--surface2)',
                    borderRadius: 8,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
                        {lead.name || 'Unknown'} {lead.company ? `- ${lead.company}` : ''}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {lead.industry} {lead.primary_city ? `| ${lead.primary_city}` : ''} | {lead.num_vehicles || 1} vehicle{(lead.num_vehicles || 1) > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {lead.tracking_code && (
                        <span style={{
                          fontSize: 11,
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 700,
                          color: 'var(--accent)',
                          background: 'rgba(79,127,255,0.1)',
                          padding: '2px 8px',
                          borderRadius: 4,
                        }}>
                          {lead.tracking_code}
                        </span>
                      )}
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--cyan)',
                        background: 'rgba(34,211,238,0.1)',
                        padding: '2px 8px',
                        borderRadius: 10,
                        textTransform: 'uppercase',
                      }}>
                        {lead.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
            marginBottom: 24,
          }}>
            {[
              { label: 'Active Wraps', value: activeCampaigns.length.toString(), icon: TrendingUp, color: 'var(--accent)' },
              { label: 'Total Calls', value: totalCalls.toLocaleString(), icon: Phone, color: 'var(--green)' },
              { label: 'Revenue Attributed', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'var(--amber)' },
              { label: 'Best Performer', value: bestCampaign?.vehicle_label || '\u2014', icon: Award, color: 'var(--purple)', small: true },
            ].map((stat: any) => (
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
          {campaigns.length === 0 ? (
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 16,
            }}>
              {campaigns.map(campaign => (
                <ROICampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </div>
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
