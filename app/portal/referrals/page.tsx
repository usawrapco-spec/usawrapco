import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PortalReferralsClient from '@/components/portal/PortalReferralsClient'

export default async function PortalReferralsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <PortalReferralsClient userId={user.id} userEmail={user.email || ''} />
}
