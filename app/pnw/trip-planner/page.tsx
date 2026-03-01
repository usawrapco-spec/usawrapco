import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'PNW Trip Planner | Puget Sound Multi-Day Routes',
  description: 'Plan your Puget Sound adventure — routes, fuel estimates, anchorages, and waterfront dining for Pacific Northwest boaters.',
}

const TripPlannerTool = dynamic(() => import('@/components/pnw/TripPlannerTool'), { ssr: false })
const WaterfrontDining = dynamic(() => import('@/components/pnw/WaterfrontDining'), { ssr: false })

export default function TripPlannerPage() {
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
        }}>
          TRIP PLANNER
        </span>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28 }}>
          Plan your Puget Sound adventure — routes, fuel estimates, anchorages
        </p>

        <TripPlannerTool />

        <div style={{ marginTop: 48 }}>
          <h2 style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22,
            fontWeight: 700, letterSpacing: 1, color: 'var(--text1)',
            marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10
          }}>
            ANCHORAGES &amp; WATERFRONT
          </h2>
          <WaterfrontDining />
        </div>
      </div>
    </div>
  )
}
