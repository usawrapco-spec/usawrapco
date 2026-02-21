import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PortalClient from '@/components/portal/PortalClient'

export default async function PortalPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <PortalClient userId={user.id} userEmail={user.email || ''} />
}
