import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import AIControlClient from '@/components/admin/AIControlClient'
import type { Profile } from '@/types'

export default async function AIControlPage() {
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

  if (profile.role !== 'owner' && profile.role !== 'admin') {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, color: 'var(--red)' }}>Access Denied</h1>
        <p style={{ color: 'var(--text3)' }}>AI Control Center is owner/admin only.</p>
      </div>
    )
  }

  return <AIControlClient profile={profile as Profile} />
}
