import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import DeckForgeProjectsClient from '@/components/deckforge/DeckForgeProjectsClient'

export default async function DeckForgePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('id, name, email, role, org_id, avatar_url, xp_total, xp_level')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as unknown as Profile} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <DeckForgeProjectsClient />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
