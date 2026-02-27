export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import { TidePredictionsClient } from '@/components/fishing/TidePredictionsClient'

export default async function TidePredictionsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const fourteenDaysOut = new Date()
  fourteenDaysOut.setDate(fourteenDaysOut.getDate() + 14)

  const { data: tides } = await admin
    .from('tide_predictions')
    .select('*')
    .gte('prediction_date', today)
    .lte('prediction_date', fourteenDaysOut.toISOString().split('T')[0])
    .order('prediction_date')
    .order('station_name')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <TidePredictionsClient tides={tides ?? []} today={today} />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
