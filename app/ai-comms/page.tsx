import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AICommsHubClient from '@/components/ai-comms/AICommsHubClient'
import { TopNav } from '@/components/layout/TopNav'
import type { Profile } from '@/types'

export default async function AICommsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <AICommsHubClient profile={profile as Profile} />
      </main>
    </div>
  )
}
