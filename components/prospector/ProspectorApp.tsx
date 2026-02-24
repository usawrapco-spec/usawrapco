'use client'

import type { Profile } from '@/types'

interface ProspectorAppProps {
  profile: Profile
  initialProspects: any[]
  initialRoutes: any[]
  initialCampaigns: any[]
  team: any[]
}

export default function ProspectorApp({ profile, initialProspects, initialRoutes, initialCampaigns, team }: ProspectorAppProps) {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>
        Prospector
      </h1>
      <div style={{ color: 'var(--text3)', fontSize: 13 }}>
        {initialProspects.length} prospects loaded. Prospector features coming soon.
      </div>
    </div>
  )
}
