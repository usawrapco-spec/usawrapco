import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

export const viewport: Viewport = {
  themeColor: '#22d3ee',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'PNW Navigator | Puget Sound Boating, Fishing & Marine App',
  description: 'The complete Pacific Northwest marine companion — live maps, AI concierge, fishing guides, tide charts, VHF radio, weather, and tourism for Puget Sound boaters.',
  manifest: '/pnw-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PNW Navigator',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
}

export default function PNWLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: '#0d0f14', color: '#e8eaed' }}>
      {children}
    </div>
  )
}
