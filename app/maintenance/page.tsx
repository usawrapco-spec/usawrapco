import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MaintenanceClient from '@/components/maintenance/MaintenanceClient'

export default async function MaintenancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('id, name, role').eq('id', user.id).single()

  return <MaintenanceClient profile={profile} />
}
