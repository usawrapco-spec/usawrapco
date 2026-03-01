'use client'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const TripTrackerPanel = dynamic(() => import('@/components/pnw/TripTrackerPanel'), { ssr: false })

export default function TripTrackerPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text1)' }}>
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)'
      }}>
        <Link href="/pnw" style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: 13 }}>
          &larr; Live Map
        </Link>
        <span style={{ color: 'var(--text3)' }}>/</span>
        <span style={{
          fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20,
          fontWeight: 700, letterSpacing: 1, color: 'var(--text1)'
        }}>TRIP TRACKER</span>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px' }}>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28 }}>
          Track your route, log catches, and record your adventure
        </p>
        <TripTrackerPanel />
      </div>
    </div>
  )
}
