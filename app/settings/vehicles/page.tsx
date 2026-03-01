export const dynamic = 'force-dynamic'
import { ORG_ID } from '@/lib/org'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import VehicleDatabaseClient from '@/components/settings/VehicleDatabaseClient'
import type { Profile } from '@/types'

export default async function VehicleDatabasePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  // Get total count
  const { count: totalCount } = await admin
    .from('vehicle_database')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)

  // Fetch all vehicles in batches of 1000
  const allVehicles: Record<string, unknown>[] = []
  const batchSize = 1000
  let offset = 0
  while (true) {
    const { data: batch } = await admin
      .from('vehicle_database')
      .select('*')
      .eq('org_id', orgId)
      .order('make', { ascending: true })
      .range(offset, offset + batchSize - 1)
    if (!batch || batch.length === 0) break
    allVehicles.push(...batch)
    if (batch.length < batchSize) break
    offset += batchSize
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <VehicleDatabaseClient
          profile={profile as Profile}
          initialVehicles={allVehicles as any[]}
          totalCount={totalCount ?? allVehicles.length}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
