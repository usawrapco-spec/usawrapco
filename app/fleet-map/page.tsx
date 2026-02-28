import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FleetMapClient from './FleetMapClient'

export const dynamic = 'force-dynamic'

export default async function FleetMapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: vehicles } = await supabase
    .from('fleet_vehicles')
    .select('*, fleet_trips(*), fleet_maintenance(*), fleet_mileage_logs(*)')
    .eq('org_id', 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f')
    .not('name', 'is', null)
    .order('created_at', { ascending: true })

  return <FleetMapClient initialVehicles={vehicles || []} />
}
