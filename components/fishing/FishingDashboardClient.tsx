'use client'

import Link from 'next/link'
import { Anchor, Fish, MapPin, FileText, BookOpen, Waves, Navigation, Radio, Star } from 'lucide-react'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
  recentCatches: any[]
  topSpots: any[]
  tidePredictions: any[]
  recentReports: any[]
  stats: { totalCatches: number; uniqueSpecies: number; personalBests: number }
}

const NAV_CARDS = [
  { href: '/fishing/catch-log', label: 'Catch Log', icon: Fish, color: 'var(--green)', desc: 'Record & track your catches' },
  { href: '/fishing/spots', label: 'Fishing Spots', icon: MapPin, color: 'var(--accent)', desc: 'Spots, waypoints & routes' },
  { href: '/fishing/reports', label: 'Reports', icon: FileText, color: 'var(--amber)', desc: 'Fishing condition reports' },
  { href: '/fishing/regulations', label: 'Regulations', icon: BookOpen, color: 'var(--red)', desc: 'Limits, sizes & seasons' },
  { href: '/fishing/tides', label: 'Tides', icon: Waves, color: 'var(--cyan)', desc: 'Tide predictions by station' },
  { href: '/fishing/marinas', label: 'Marinas', icon: Navigation, color: 'var(--purple)', desc: 'Fuel, moorage & launch ramps' },
  { href: '/fishing/boating', label: 'Boating Zones', icon: Anchor, color: 'var(--amber)', desc: 'Zones, speed limits & regs' },
  { href: '/fishing/vhf', label: 'VHF Channels', icon: Radio, color: 'var(--green)', desc: 'Marine radio quick reference' },
]

export function FishingDashboardClient({ recentCatches, topSpots, tidePredictions, recentReports, stats }: Props) {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Anchor size={28} color="var(--cyan)" />
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 800, color: 'var(--text1)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
            Marine &amp; Fishing
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, margin: 0 }}>Your fishing hub — catches, spots, tides &amp; more</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Catches (30d)', value: stats.totalCatches, color: 'var(--green)' },
          { label: 'Species (30d)', value: stats.uniqueSpecies, color: 'var(--cyan)' },
          { label: 'Personal Bests', value: stats.personalBests, color: 'var(--amber)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Navigation cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 32 }}>
        {NAV_CARDS.map(card => {
          const Icon = card.icon
          return (
            <Link key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--surface2)',
                borderRadius: 10,
                padding: '16px 18px',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = card.color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--surface2)')}
              >
                <Icon size={22} color={card.color} style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 14 }}>{card.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{card.desc}</div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {/* Recent catches */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Fish size={16} color="var(--green)" />
              <span style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 14 }}>Recent Catches</span>
            </div>
            <Link href="/fishing/catch-log" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View all</Link>
          </div>
          {recentCatches.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>No catches logged yet. <Link href="/fishing/catch-log" style={{ color: 'var(--accent)' }}>Add your first!</Link></p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentCatches.slice(0, 5).map((c: any) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--surface2)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 13 }}>{c.species_name || 'Unknown'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>{c.catch_date} {c.location_name ? `• ${c.location_name}` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {c.weight_lbs && <div style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>{c.weight_lbs} lbs</div>}
                    {c.is_personal_best && <Star size={12} color="var(--amber)" fill="var(--amber)" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top spots */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={16} color="var(--accent)" />
              <span style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 14 }}>Top Spots</span>
            </div>
            <Link href="/fishing/spots" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View all</Link>
          </div>
          {topSpots.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>No spots found in database.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topSpots.slice(0, 5).map((s: any) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--surface2)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 13 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>{s.region} • {s.water_type}</div>
                  </div>
                  {s.avg_rating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Star size={12} color="var(--amber)" fill="var(--amber)" />
                      <span style={{ fontSize: 12, color: 'var(--amber)', fontFamily: 'JetBrains Mono, monospace' }}>{Number(s.avg_rating).toFixed(1)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's tides */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Waves size={16} color="var(--cyan)" />
              <span style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 14 }}>Upcoming Tides</span>
            </div>
            <Link href="/fishing/tides" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View all</Link>
          </div>
          {tidePredictions.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>No tide data available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tidePredictions.map((t: any) => (
                <div key={t.id} style={{ padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 13 }}>{t.station_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>{t.prediction_date}</div>
                  {Array.isArray(t.predictions) && t.predictions.slice(0, 2).map((p: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: p.type === 'H' ? 'var(--cyan)' : 'var(--text2)' }}>{p.type === 'H' ? 'High' : 'Low'} {p.time}</span>
                      <span style={{ color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{p.height} ft</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
