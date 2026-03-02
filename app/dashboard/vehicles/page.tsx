import { createClient } from '@/lib/supabase/server'
import VehicleDatabaseClient from './VehicleDatabaseClient'

export const metadata = { title: 'Vehicle Database' }

export default async function VehicleDatabasePage() {
  const supabase = createClient()

  const { count } = await supabase
    .from('vehicle_measurements')
    .select('*', { count: 'exact', head: true })

  const { data: makesData } = await supabase
    .from('vehicle_measurements')
    .select('make')
    .order('make')

  const uniqueMakes = makesData
    ? [...new Set(makesData.map((m: { make: string }) => m.make))].sort()
    : []

  return <VehicleDatabaseClient totalCount={count || 0} makes={uniqueMakes} />
}
