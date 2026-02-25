import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PortalLoyaltyClient from '@/components/portal/PortalLoyaltyClient'

export default async function PortalLoyaltyPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <PortalLoyaltyClient userId={user.id} userEmail={user.email || ''} />
}
