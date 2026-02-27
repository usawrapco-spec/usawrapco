export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import { FishingDashboardClient } from '@/components/fishing/FishingDashboardClient'

export default async function FishingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const today = new Date().toISOString().split('T')[0]

  const [catchRes, spotsRes, tidesRes, reportsRes] = await Promise.all([
    admin.from('catch_log').select('*').eq('user_id', user.id)
      .gte('catch_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('catch_date', { ascending: false }).limit(10),
    admin.from('fishing_spots').select('id, name, region, water_type, avg_rating')
      .order('avg_rating', { ascending: false }).limit(6),
    admin.from('tide_predictions').select('*')
      .gte('prediction_date', today).order('prediction_date').limit(3),
    admin.from('fishing_reports').select('*')
      .order('created_at', { ascending: false }).limit(5),
  ])

  const totalCatches = catchRes.data?.length ?? 0
  const uniqueSpecies = new Set(catchRes.data?.map((c: { species_name: string | null }) => c.species_name).filter(Boolean)).size
  const personalBests = catchRes.data?.filter((c: { is_personal_best: boolean | null }) => c.is_personal_best).length ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <FishingDashboardClient
          profile={profile as Profile}
          recentCatches={catchRes.data ?? []}
          topSpots={spotsRes.data ?? []}
          tidePredictions={tidesRes.data ?? []}
          recentReports={reportsRes.data ?? []}
          stats={{ totalCatches, uniqueSpecies, personalBests }}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
