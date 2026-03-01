import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'PNW Fishing Guide | Puget Sound Species & Regulations',
  description: 'Complete guide to fishing in Puget Sound and South Sound — salmon, halibut, lingcod, crab. Current WDFW regulations.',
}

const FishingGuideContent = dynamic(() => import('@/components/pnw/FishingGuideContent'), { ssr: false })

export default function FishingPage() {
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
          FISHING GUIDE
        </span>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        <FishingGuideContent />
      </div>
    </div>
  )
}
