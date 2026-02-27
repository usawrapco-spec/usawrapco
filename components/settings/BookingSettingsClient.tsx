'use client'

import type { Profile } from '@/types'

interface Props {
  profile: Profile
  initialSettings: Record<string, unknown> | null
  orgId: string
}

export default function BookingSettingsClient({ profile: _profile }: Props) {
  return (
    <div style={{ maxWidth: 640, padding: '24px 0' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Barlow Condensed,sans-serif', marginBottom: 4 }}>
        Booking Settings
      </h1>
      <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24 }}>
        Configure your online booking and appointment settings.
      </p>
      <div style={{ padding: 32, borderRadius: 12, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', color: 'var(--text3)' }}>
        Booking configuration coming soon.
      </div>
    </div>
  )
}
