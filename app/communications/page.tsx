import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import CommunicationsClient from '@/components/communications/CommunicationsClient'
import type { Profile } from '@/types'

export default async function CommunicationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', background: 'var(--bg)', overflow: 'hidden',
    }}>
      <TopNav profile={profile as Profile} />
      <CommunicationsClient profile={profile as Profile} />
      <MobileNav />
    </div>
  )
}
