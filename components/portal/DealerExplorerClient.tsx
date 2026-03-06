'use client'

import dynamic from 'next/dynamic'
import { Navigation } from 'lucide-react'
import type { Profile } from '@/types'

const PNWNavigatorClient = dynamic(
  () => import('@/components/pnw-navigator/PNWNavigatorClient'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: 'calc(100dvh - 140px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg, #0d0f14)', flexDirection: 'column', gap: 12,
      }}>
        <Navigation size={36} color="var(--accent, #4f7fff)" strokeWidth={1.5} style={{ opacity: 0.5 }} />
        <div style={{ fontSize: 13, color: 'var(--text3, #5a6080)' }}>Loading PNW Navigator…</div>
      </div>
    ),
  }
)

export default function DealerExplorerClient({
  dealerId,
  dealerName,
}: {
  dealerId: string
  dealerName: string
}) {
  const profile: Profile = {
    id: dealerId,
    org_id: '',
    role: 'viewer',
    name: dealerName,
    email: '',
    phone: null,
    avatar_url: null,
    permissions: {},
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return (
    <div style={{ height: 'calc(100dvh - 130px)', overflow: 'hidden' }}>
      <PNWNavigatorClient profile={profile} />
    </div>
  )
}
