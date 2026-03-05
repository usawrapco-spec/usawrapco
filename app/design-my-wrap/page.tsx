import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

export const metadata: Metadata = {
  title: 'Design Your Wrap | USA Wrap Co',
  description: 'Upload your vehicle photo, sketch your design, and get an AI-generated wrap mockup in minutes — free.',
}

// Disable SSR — Fabric.js requires a browser canvas
const DesignStudio = dynamic(() => import('@/components/customer/DesignStudio'), { ssr: false, loading: () => (
  <div style={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 14 }}>
    Loading Design Studio…
  </div>
) })

export default function DesignMyWrapPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '48px 0 80px' }}>
      {/* Hero header */}
      <div style={{ textAlign: 'center', marginBottom: 48, padding: '0 24px' }}>
        <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: 'rgba(79,127,255,0.15)', color: 'var(--accent)', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          Free AI Design Tool
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, color: 'var(--text1)', margin: '0 0 12px', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.5px' }}>
          Design Your Wrap in Minutes
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text2)', maxWidth: 520, margin: '0 auto' }}>
          Upload a photo of your vehicle, sketch your idea, and our AI generates a professional mockup — print-ready at 300 DPI.
        </p>
      </div>

      <DesignStudio />
    </main>
  )
}
