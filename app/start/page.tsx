export const dynamic = 'force-dynamic'
import { Suspense } from 'react'
import WrapFunnelClient from '@/components/intake/WrapFunnelClient'

export const metadata = {
  title: 'Get Your Free Instant Wrap Mockup | USA Wrap Co',
  description: 'See your vehicle wrap before you buy. Pick your vehicle, enter your brand info, and our AI creates a custom mockup in under 2 minutes — free.',
}

export default function StartPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0c12' }} />}>
      <WrapFunnelClient />
    </Suspense>
  )
}
