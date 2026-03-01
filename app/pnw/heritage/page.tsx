import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Gig Harbor Heritage | History of the Harbor',
  description: 'From the Puyallup People to Galloping Gertie — the story of Gig Harbor and the Pacific Northwest.',
}

const HeritageContent = dynamic(() => import('@/components/pnw/HeritageContent'), { ssr: false })

export default function HeritagePage() {
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
          HERITAGE &amp; HISTORY
        </span>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28 }}>
          From the Puyallup People to Galloping Gertie — the story of Gig Harbor
        </p>

        <HeritageContent />

        <div style={{
          marginTop: 40, padding: 20, background: 'var(--surface)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10
        }}>
          <h3 style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16,
            fontWeight: 700, letterSpacing: 1, color: 'var(--text1)', marginBottom: 8
          }}>
            HARBOR HISTORY MUSEUM
          </h3>
          <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
            Visit the Harbor History Museum at 4218 Harborview Dr, Gig Harbor for artifacts, photos, and exhibits
            spanning thousands of years of human history in the South Sound.
          </p>
          <a
            href="https://www.harborhistorymuseum.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--accent)', fontSize: 13, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6
            }}
          >
            harborhistorymuseum.org &rarr;
          </a>
        </div>
      </div>
    </div>
  )
}
