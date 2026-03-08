import { createClient } from '@/lib/supabase/server'
import MarineDatabaseClient from './MarineDatabaseClient'

export const metadata = { title: 'Marine Database' }

export default async function MarineDatabasePage() {
  const supabase = createClient()

  const { count } = await supabase
    .from('marine_vessels')
    .select('*', { count: 'exact', head: true })

  const { data: makesData } = await supabase
    .from('marine_vessels')
    .select('make')
    .order('make')

  const uniqueMakes = makesData
    ? [...new Set(makesData.map((m: { make: string }) => m.make))].sort()
    : []

  const { data: classesData } = await supabase
    .from('marine_vessels')
    .select('boat_class')
    .order('boat_class')

  const uniqueClasses = classesData
    ? [...new Set(classesData.map((c: { boat_class: string }) => c.boat_class))].sort()
    : []

  return (
    <MarineDatabaseClient
      totalCount={count || 0}
      makes={uniqueMakes}
      boatClasses={uniqueClasses}
    />
  )
}
