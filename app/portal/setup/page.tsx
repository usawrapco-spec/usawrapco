export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PortalSetupClient from '@/components/portal/PortalSetupClient'

export default async function PortalSetupPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/portal/login')

  // Check if user already has a password set by looking at identities
  const hasPassword = user.identities?.some(i => i.provider === 'email' && i.identity_data?.hashed_password)
    || user.app_metadata?.provider === 'email'

  // If password already set, skip setup and go to portal home
  if (hasPassword) {
    // Check if this is a first-time magic link user who needs to set a name
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()

    const hasName = profile?.name && profile.name !== user.email?.split('@')[0]
    if (hasName) {
      redirect('/portal')
    }
  }

  return <PortalSetupClient userId={user.id} userEmail={user.email || ''} />
}
