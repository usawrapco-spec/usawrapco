import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import FleetHubClient from './FleetHubClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function FleetPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  // Load fleet data
  const [vehiclesRes, tripsRes, customersRes, driversRes] = await Promise.all([
    admin.from('fleet_vehicles').select('*, customer:customer_id(id, name, business_name)').eq('org_id', orgId).order('created_at', { ascending: false }),
    admin.from('fleet_trips').select('*, vehicle:vehicle_id(id, year, make, model), driver:driver_id(id, name)').eq('org_id', orgId).order('created_at', { ascending: false }).limit(200),
    admin.from('customers').select('id, name, business_name').eq('org_id', orgId).order('name').limit(500),
    admin.from('profiles').select('id, name').eq('org_id', orgId).eq('active', true).order('name'),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <FleetHubClient
          profile={profile as Profile}
          initialVehicles={vehiclesRes.data || []}
          initialTrips={tripsRes.data || []}
          customers={customersRes.data || []}
          drivers={driversRes.data || []}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
