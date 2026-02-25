import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PortalClient from '@/components/portal/PortalClient'

export default async function PortalPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/portal/login')

  // Fetch profile name for welcome header
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  return (
    <PortalClient
      userId={user.id}
      userEmail={user.email || ''}
      userName={profile?.name || ''}
    />
  )
}
