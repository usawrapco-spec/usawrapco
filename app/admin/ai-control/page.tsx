import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AIControlClient from '@/components/admin/AIControlClient'

export default async function AIControlPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, org:org_id(name)')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_owner) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, color: 'var(--red)' }}>Access Denied</h1>
        <p style={{ color: 'var(--text3)' }}>AI Control Center is owner-only.</p>
      </div>
    )
  }

  return <AIControlClient profile={profile} />
}
