import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VehicleCheckinClient from '@/components/checkin/VehicleCheckinClient'

export default async function VehicleCheckinPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, role, org_id')
    .eq('id', user.id)
    .single()

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, vehicle_desc, customer_id')
    .eq('id', params.id)
    .single()

  return <VehicleCheckinClient
    profile={profile || { id: user.id, name: 'User', role: 'installer', org_id: '' }}
    job={project}
    jobId={params.id}
  />
}
