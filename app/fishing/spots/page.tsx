export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import { FishingSpotsClient } from '@/components/fishing/FishingSpotsClient'

export default async function FishingSpotsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const [spotsRes, waypointsRes, routesRes] = await Promise.all([
    admin.from('fishing_spots').select('*').order('avg_rating', { ascending: false }).limit(100),
    admin.from('user_waypoints').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    admin.from('user_routes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <FishingSpotsClient
          userId={user.id}
          spots={spotsRes.data ?? []}
          waypoints={waypointsRes.data ?? []}
          routes={routesRes.data ?? []}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
