import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import FleetMaintenanceClient from '@/components/fleet/FleetMaintenanceClient'
import { ORG_ID } from '@/lib/org'

export default async function MaintenancePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID
  const isAdmin = profile.role === 'owner' || profile.role === 'admin'

  const [vehiclesRes, recordsRes] = await Promise.all([
    admin
      .from('company_vehicles')
      .select('id,make,model,year,plate,current_mileage')
      .eq('org_id', orgId)
      .eq('active', true)
      .order('make'),
    admin
      .from('vehicle_maintenance')
      .select('*, vehicle:vehicle_id(id,make,model,year,plate,current_mileage)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <FleetMaintenanceClient
          isAdmin={isAdmin}
          initialVehicles={vehiclesRes.data || []}
          initialRecords={recordsRes.data || []}
        />
      </main>
      <div className="md:hidden"><MobileNav /></div>
    </div>
  )
}
