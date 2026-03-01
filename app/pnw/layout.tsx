import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'PNW Navigator | Gig Harbor Boating & Fishing',
  description: 'Puget Sound navigation, fishing guides, tide charts, marine weather, and Gig Harbor tourism for Pacific Northwest boaters.',
}

export default function PNWLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text1)' }}>
      {children}
    </div>
  )
}
